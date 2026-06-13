const pool = require('../config/db');

const Company = {
  create: (name, website, description) =>
    pool.query(
      'INSERT INTO companies (company_name, website, description) VALUES ($1,$2,$3) RETURNING *',
      [name, website, description]
    ).then(r => r.rows[0]),

  findById: (companyId) =>
    pool.query('SELECT * FROM companies WHERE company_id = $1', [companyId]).then(r => r.rows[0]),

  verify: (companyId) =>
    pool.query('UPDATE companies SET verified=TRUE WHERE company_id=$1 RETURNING *', [companyId]).then(r => r.rows[0]),

  findAll: () =>
    pool.query('SELECT * FROM companies ORDER BY company_name').then(r => r.rows),
};

module.exports = Company;
