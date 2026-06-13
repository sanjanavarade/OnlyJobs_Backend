const pool = require('../config/db');

async function getProfile(req, res, next) {
  try {
    const { rows } = await pool.query(
      `SELECT u.user_id, u.name, u.email, u.role, u.created_at,
              js.phone, js.skills, js.education, js.resume_url
       FROM users u LEFT JOIN job_seekers js ON js.user_id = u.user_id
       WHERE u.user_id = $1`,
      [req.user.user_id]
    );
    res.json(rows[0]);
  } catch (err) { next(err); }
}

async function updateProfile(req, res, next) {
  try {
    const { name, phone, skills, education } = req.body;
    if (name) {
      await pool.query('UPDATE users SET name=$1 WHERE user_id=$2', [name, req.user.user_id]);
    }
    if (req.user.role === 'job_seeker') {
      await pool.query(
        `UPDATE job_seekers SET phone=$1, skills=$2, education=$3 WHERE user_id=$4`,
        [phone, skills, education, req.user.user_id]
      );
    }
    res.json({ message: 'Profile updated.' });
  } catch (err) { next(err); }
}

async function uploadResume(req, res, next) {
  try {
    if (!req.file) return res.status(400).json({ error: 'No file uploaded.' });
    const resumeUrl = `/uploads/${req.file.filename}`;
    await pool.query('UPDATE job_seekers SET resume_url=$1 WHERE user_id=$2', [resumeUrl, req.user.user_id]);
    res.json({ resume_url: resumeUrl });
  } catch (err) { next(err); }
}

module.exports = { getProfile, updateProfile, uploadResume };
