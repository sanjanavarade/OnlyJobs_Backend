const Application = require('../models/Application');
const Interview = require('../models/Interview');
const Notification = require('../models/Notification');
const pool = require('../config/db');

async function getApplicants(req, res, next) {
  try {
    const apps = await Application.findByJob(req.params.jobId);
    res.json(apps);
  } catch (err) { next(err); }
}

async function getMyApplicants(req, res, next) {
  try {
    const { rows } = await pool.query(
      `SELECT a.application_id, a.status, a.applied_at, a.cover_note,
              u.name, u.email, js.resume_url, j.title, j.job_id
       FROM applications a
       JOIN job_seekers js ON js.seeker_id = a.seeker_id
       JOIN users u ON u.user_id = js.user_id
       JOIN jobs j ON j.job_id = a.job_id
       WHERE j.posted_by = $1
       ORDER BY a.applied_at DESC`,
      [req.user.user_id]
    );
    res.json(rows);
  } catch (err) { next(err); }
}

async function updateStatus(req, res, next) {
  try {
    const { status } = req.body;
    const allowed = ['shortlisted', 'rejected', 'hired'];
    if (!allowed.includes(status)) return res.status(400).json({ error: 'Invalid status.' });

    // Verify the recruiter owns the job for this application
    const { rows: ownerRows } = await pool.query(
      `SELECT a.application_id FROM applications a
       JOIN jobs j ON j.job_id = a.job_id
       WHERE a.application_id = $1 AND j.posted_by = $2`,
      [req.params.id, req.user.user_id]
    );
    if (!ownerRows.length) return res.status(403).json({ error: 'Forbidden.' });

    const app = await Application.updateStatus(req.params.id, status);
    if (!app) return res.status(404).json({ error: 'Application not found.' });

    const { rows } = await pool.query(
      `SELECT u.user_id FROM users u JOIN job_seekers js ON js.user_id=u.user_id WHERE js.seeker_id=$1`,
      [app.seeker_id]
    );
    if (rows.length) {
      await Notification.create(rows[0].user_id, 'Application Update', `Your application status changed to: ${status}`);
    }

    res.json(app);
  } catch (err) { next(err); }
}

async function scheduleInterview(req, res, next) {
  try {
    const { application_id, interview_date, meeting_link, notes } = req.body;
    if (!application_id || !interview_date) {
      return res.status(400).json({ error: 'application_id and interview_date are required.' });
    }

    // Verify the recruiter owns the job for this application
    const { rows } = await pool.query(
      `SELECT a.application_id FROM applications a
       JOIN jobs j ON j.job_id = a.job_id
       WHERE a.application_id = $1 AND j.posted_by = $2`,
      [application_id, req.user.user_id]
    );
    if (!rows.length) return res.status(403).json({ error: 'Forbidden.' });

    const interview = await Interview.create(application_id, interview_date, meeting_link, notes);
    await Application.updateStatus(application_id, 'interview');
    res.status(201).json(interview);
  } catch (err) { next(err); }
}

// The logged-in recruiter's own company (or nulls if not set up yet).
async function getMe(req, res, next) {
  try {
    const { rows } = await pool.query(
      `SELECT r.company_id, r.verified, c.company_name, c.website
       FROM recruiters r LEFT JOIN companies c ON c.company_id = r.company_id
       WHERE r.user_id = $1`,
      [req.user.user_id]
    );
    res.json(rows[0] ?? null);
  } catch (err) { next(err); }
}

// Jobs this recruiter has posted, including unapproved ones (with approval state).
async function getMyJobs(req, res, next) {
  try {
    const { rows } = await pool.query(
      `SELECT j.job_id, j.title, j.salary, j.location, j.job_type, j.skills, j.approved, j.created_at,
              c.company_name
       FROM jobs j LEFT JOIN companies c ON c.company_id = j.company_id
       WHERE j.posted_by = $1
       ORDER BY j.created_at DESC`,
      [req.user.user_id]
    );
    res.json(rows);
  } catch (err) { next(err); }
}

module.exports = { getApplicants, getMyApplicants, updateStatus, scheduleInterview, getMe, getMyJobs };
