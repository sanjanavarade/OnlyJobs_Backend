const pool = require('../config/db');

const Job = {
  // Optional filters are applied as parameterized ILIKE / equality predicates —
  // user input is always a bound value ($n), never concatenated into SQL.
  findAll: (approvedOnly = true, { search, location, jobType } = {}) => {
    const params = [approvedOnly];
    const where = [`($1 = FALSE OR j.approved = TRUE)`];

    if (search) {
      params.push(`%${search}%`);
      const p = `$${params.length}`;
      where.push(`(j.title ILIKE ${p} OR c.company_name ILIKE ${p} OR j.description ILIKE ${p})`);
    }
    if (location) {
      params.push(`%${location}%`);
      where.push(`j.location ILIKE $${params.length}`);
    }
    if (jobType) {
      params.push(jobType);
      where.push(`j.job_type = $${params.length}`);
    }

    return pool.query(
      `SELECT j.*, c.company_name FROM jobs j
       JOIN companies c ON c.company_id = j.company_id
       WHERE ${where.join(' AND ')}
       ORDER BY j.created_at DESC`,
      params
    ).then(r => r.rows);
  },

  findById: (jobId) =>
    pool.query(
      `SELECT j.*, c.company_name FROM jobs j
       JOIN companies c ON c.company_id = j.company_id
       WHERE j.job_id = $1`,
      [jobId]
    ).then(r => r.rows[0]),

  create: (data) =>
    pool.query(
      // approved = TRUE: no admin moderation — jobs go live immediately.
      `INSERT INTO jobs (company_id, posted_by, title, description, salary, location, job_type, skills, approved)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8, TRUE) RETURNING *`,
      [data.company_id, data.posted_by, data.title, data.description, data.salary, data.location, data.job_type, data.skills]
    ).then(r => r.rows[0]),

  approve: (jobId) =>
    pool.query('UPDATE jobs SET approved = TRUE WHERE job_id = $1 RETURNING *', [jobId]).then(r => r.rows[0]),

  delete: (jobId) =>
    pool.query('DELETE FROM jobs WHERE job_id = $1', [jobId]),
};

module.exports = Job;
