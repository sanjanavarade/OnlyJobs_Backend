const pool = require('../config/db');

const Interview = {
  create: (applicationId, interviewDate, meetingLink, notes) =>
    pool.query(
      'INSERT INTO interviews (application_id, interview_date, meeting_link, notes) VALUES ($1,$2,$3,$4) RETURNING *',
      [applicationId, interviewDate, meetingLink, notes]
    ).then(r => r.rows[0]),

  findByApplication: (applicationId) =>
    pool.query('SELECT * FROM interviews WHERE application_id = $1', [applicationId]).then(r => r.rows),

  updateStatus: (interviewId, status) =>
    pool.query('UPDATE interviews SET status=$1 WHERE interview_id=$2 RETURNING *', [status, interviewId]).then(r => r.rows[0]),
};

module.exports = Interview;
