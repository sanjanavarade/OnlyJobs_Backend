const pool = require('../config/db');

const Application = {
  create: (jobId, seekerId, coverNote) =>
    pool.query(
      'INSERT INTO applications (job_id, seeker_id, cover_note) VALUES ($1,$2,$3) RETURNING *',
      [jobId, seekerId, coverNote]
    ).then(r => r.rows[0]),

  findBySeeker: (seekerId) =>
    pool.query(
      `SELECT a.*, j.title, j.location, c.company_name
       FROM applications a
       JOIN jobs j ON j.job_id = a.job_id
       JOIN companies c ON c.company_id = j.company_id
       WHERE a.seeker_id = $1 ORDER BY a.applied_at DESC`,
      [seekerId]
    ).then(r => r.rows),

  findByJob: (jobId) =>
    pool.query(
      `SELECT a.*, u.name, u.email, js.resume_url
       FROM applications a
       JOIN job_seekers js ON js.seeker_id = a.seeker_id
       JOIN users u ON u.user_id = js.user_id
       WHERE a.job_id = $1 ORDER BY a.applied_at DESC`,
      [jobId]
    ).then(r => r.rows),

  updateStatus: (applicationId, status) =>
    pool.query(
      'UPDATE applications SET status=$1, updated_at=NOW() WHERE application_id=$2 RETURNING *',
      [status, applicationId]
    ).then(r => r.rows[0]),

  findById: (applicationId) =>
    pool.query('SELECT * FROM applications WHERE application_id = $1', [applicationId]).then(r => r.rows[0]),
};

module.exports = Application;
