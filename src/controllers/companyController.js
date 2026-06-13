const pool = require('../config/db');

async function createCompany(req, res, next) {
  try {
    const { company_name, website, description } = req.body;
    if (!company_name?.trim()) {
      return res.status(400).json({ error: 'company_name is required.' });
    }
    const { rows } = await pool.query(
      `INSERT INTO companies (company_name, website, description)
       VALUES ($1, $2, $3) RETURNING *`,
      [company_name.trim(), website || null, description || null]
    );
    // Link new company to this recruiter's profile
    await pool.query(
      'UPDATE recruiters SET company_id=$1 WHERE user_id=$2',
      [rows[0].company_id, req.user.user_id]
    );
    res.status(201).json(rows[0]);
  } catch (err) { next(err); }
}

async function listCompanies(req, res, next) {
  try {
    const { rows } = await pool.query('SELECT * FROM companies ORDER BY created_at DESC');
    res.json(rows);
  } catch (err) { next(err); }
}

module.exports = { createCompany, listCompanies };
