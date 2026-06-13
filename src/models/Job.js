const pool = require('../config/db');

const Job = {
  findAll: (approvedOnly = true) =>
    pool.query(
      `SELECT j.*, c.company_name FROM jobs j
       JOIN companies c ON c.company_id = j.company_id
       WHERE ($1 = FALSE OR j.approved = TRUE)
       ORDER BY j.created_at DESC`,
      [approvedOnly]
    ).then(r => r.rows),

  findById: (jobId) =>
    pool.query(
      `SELECT j.*, c.company_name FROM jobs j
       JOIN companies c ON c.company_id = j.company_id
       WHERE j.job_id = $1`,
      [jobId]
    ).then(r => r.rows[0]),

  create: (data) =>
    pool.query(
      `INSERT INTO jobs (company_id, posted_by, title, description, salary, location, job_type, skills)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8) RETURNING *`,
      [data.company_id, data.posted_by, data.title, data.description, data.salary, data.location, data.job_type, data.skills]
    ).then(r => r.rows[0]),

  approve: (jobId) =>
    pool.query('UPDATE jobs SET approved = TRUE WHERE job_id = $1 RETURNING *', [jobId]).then(r => r.rows[0]),

  delete: (jobId) =>
    pool.query('DELETE FROM jobs WHERE job_id = $1', [jobId]),
};

module.exports = Job;
