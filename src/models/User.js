const pool = require('../config/db');

const User = {
  findByEmail: (email) =>
    pool.query('SELECT * FROM users WHERE email = $1', [email]).then(r => r.rows[0] ?? null),

  findById: (userId) =>
    pool.query('SELECT user_id, name, email, role, created_at FROM users WHERE user_id = $1', [userId]).then(r => r.rows[0] ?? null),

  create: ({ name, email, password_hash, role }) =>
    pool.query(
      'INSERT INTO users (name, email, password_hash, role) VALUES ($1,$2,$3,$4) RETURNING user_id, name, email, role, created_at',
      [name, email, password_hash, role]
    ).then(r => r.rows[0]),
};

module.exports = User;
