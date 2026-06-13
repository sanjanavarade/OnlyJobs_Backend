const Application = require('../models/Application');
const pool = require('../config/db');

async function applyToJob(req, res, next) {
  try {
    const { job_id, cover_note } = req.body;
    if (!job_id) return res.status(400).json({ error: 'job_id is required.' });

    // Verify the job exists and is approved
    const { rows: jobRows } = await pool.query('SELECT approved FROM jobs WHERE job_id = $1', [job_id]);
    if (!jobRows.length) return res.status(404).json({ error: 'Job not found.' });
    if (!jobRows[0].approved) return res.status(400).json({ error: 'This job is not open for applications.' });

    const { rows } = await pool.query('SELECT seeker_id FROM job_seekers WHERE user_id=$1', [req.user.user_id]);
    if (!rows.length) return res.status(400).json({ error: 'Complete your seeker profile first.' });

    const app = await Application.create(job_id, rows[0].seeker_id, cover_note);
    res.status(201).json(app);
  } catch (err) {
    if (err.code === '23505') return res.status(409).json({ error: 'Already applied to this job.' });
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

module.exports = { applyToJob, myApplications };
