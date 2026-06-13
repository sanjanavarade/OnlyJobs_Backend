const Application = require('../models/Application');
const pool = require('../config/db');

async function applyToJob(req, res, next) {
  try {
    const { job_id, cover_note } = req.body;
    if (!job_id) return res.status(400).json({ error: 'job_id is required.' });

    // Verify the job exists and is approved
    const { rows: jobRows } = await pool.query('SELECT company_id, approved FROM jobs WHERE job_id = $1', [job_id]);
    if (!jobRows.length) return res.status(404).json({ error: 'Job not found.' });
    if (!jobRows[0].approved) return res.status(400).json({ error: 'This job is not open for applications.' });

    const company_id = jobRows[0].company_id;

    const { rows } = await pool.query('SELECT seeker_id FROM job_seekers WHERE user_id=$1', [req.user.user_id]);
    if (!rows.length) return res.status(400).json({ error: 'Complete your seeker profile first.' });

    const seeker_id = rows[0].seeker_id;

    // Check if user already applied to this specific job
    const { rows: duplicateJob } = await pool.query(
      'SELECT application_id FROM applications WHERE job_id = $1 AND seeker_id = $2',
      [job_id, seeker_id]
    );
    if (duplicateJob.length) {
      return res.status(409).json({ error: 'You have already applied to this job.' });
    }

    // Check if user already applied to ANY job from this company
    const { rows: duplicateCompany } = await pool.query(
      `SELECT a.application_id FROM applications a
       JOIN jobs j ON a.job_id = j.job_id
       WHERE j.company_id = $1 AND a.seeker_id = $2`,
      [company_id, seeker_id]
    );
    if (duplicateCompany.length) {
      return res.status(409).json({ error: 'You have already applied to a job at this company. Only one application per company is allowed.' });
    }

    const app = await Application.create(job_id, seeker_id, cover_note);
    res.status(201).json(app);
  } catch (err) {
    if (err.code === '23505') return res.status(409).json({ error: 'Duplicate application detected.' });
    next(err);
  }
}

async function myApplications(req, res, next) {
  try {
    const { rows } = await pool.query('SELECT seeker_id FROM job_seekers WHERE user_id=$1', [req.user.user_id]);
    if (!rows.length) return res.json([]);
    const apps = await Application.findBySeeker(rows[0].seeker_id);
    res.json(apps);
  } catch (err) { next(err); }
}

async function checkApplicationStatus(req, res, next) {
  try {
    const { job_id } = req.params;
    if (!job_id) return res.status(400).json({ error: 'job_id is required.' });

    // Get seeker_id for the authenticated user
    const { rows } = await pool.query('SELECT seeker_id FROM job_seekers WHERE user_id=$1', [req.user.user_id]);
    
    if (!rows.length) {
      // User is not a job seeker (probably a recruiter)
      return res.json({ hasApplied: false, reason: 'not_a_job_seeker' });
    }

    const seeker_id = rows[0].seeker_id;

    // Check if this user has applied to this job
    const { rows: appRows } = await pool.query(
      'SELECT application_id, status FROM applications WHERE job_id=$1 AND seeker_id=$2',
      [job_id, seeker_id]
    );

    if (appRows.length > 0) {
      return res.json({ hasApplied: true, status: appRows[0].status });
    }

    // Check if user has already applied to ANY job from this company
    const { rows: companyRows } = await pool.query(
      `SELECT company_id FROM jobs WHERE job_id = $1`,
      [job_id]
    );

    if (companyRows.length > 0) {
      const company_id = companyRows[0].company_id;
      const { rows: companyAppRows } = await pool.query(
        `SELECT a.application_id FROM applications a
         JOIN jobs j ON a.job_id = j.job_id
         WHERE j.company_id = $1 AND a.seeker_id = $2`,
        [company_id, seeker_id]
      );

      if (companyAppRows.length > 0) {
        return res.json({ 
          hasApplied: false, 
          hasAppliedToCompany: true,
          reason: 'Only one application per company is allowed.'
        });
      }
    }

    return res.json({ hasApplied: false });
  } catch (err) { next(err); }
}

module.exports = { applyToJob, myApplications, checkApplicationStatus };
