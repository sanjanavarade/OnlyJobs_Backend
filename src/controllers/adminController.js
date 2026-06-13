const Job = require('../models/Job');
const pool = require('../config/db');

async function approveJob(req, res, next) {
  try {
    const job = await Job.approve(req.params.id);
    if (!job) return res.status(404).json({ error: 'Job not found.' });
    res.json(job);
  } catch (err) { next(err); }
}

async function verifyRecruiter(req, res, next) {
  try {
    const { rows } = await pool.query(
      'UPDATE recruiters SET verified=TRUE WHERE user_id=$1 RETURNING recruiter_id',
      [req.params.id]
    );
    if (!rows.length) return res.status(404).json({ error: 'Recruiter not found.' });
    res.json({ message: 'Recruiter verified.' });
  } catch (err) { next(err); }
}

async function listRecruiters(req, res, next) {
  try {
    const { rows } = await pool.query(
      `SELECT r.recruiter_id, r.verified, u.user_id, u.name, u.email, u.created_at,
              c.company_name
       FROM recruiters r
       JOIN users u ON u.user_id = r.user_id
       LEFT JOIN companies c ON c.company_id = r.company_id
       ORDER BY u.created_at DESC`
    );
    res.json(rows);
  } catch (err) { next(err); }
}

async function getReports(req, res, next) {
  try {
    const [users, jobs, apps] = await Promise.all([
      pool.query('SELECT role, COUNT(*) FROM users GROUP BY role'),
      pool.query('SELECT COUNT(*) FROM jobs'),
      pool.query('SELECT status, COUNT(*) FROM applications GROUP BY status'),
    ]);
    res.json({
      users: users.rows,
      total_jobs: jobs.rows[0].count,
      applications: apps.rows,
    });
  } catch (err) { next(err); }
}

async function getPendingJobs(req, res, next) {
  try {
    const { rows } = await pool.query(
      `SELECT j.*, c.company_name FROM jobs j
       JOIN companies c ON c.company_id = j.company_id
       WHERE j.approved = FALSE
       ORDER BY j.created_at DESC`
    );
    res.json(rows);
  } catch (err) { next(err); }
}

module.exports = { approveJob, verifyRecruiter, listRecruiters, getReports, getPendingJobs };
