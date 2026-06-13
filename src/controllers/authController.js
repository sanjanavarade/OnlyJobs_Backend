const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const User = require('../models/User');
const pool = require('../config/db');

const BCRYPT_ROUNDS = 12;

function signToken(user) {
  return jwt.sign(
    { sub: user.user_id, role: user.role, email: user.email },
    process.env.JWT_SECRET,
    { expiresIn: '24h' }
  );
}

async function login(req, res, next) {
  const { email, password } = req.body;
  try {
    const user = await User.findByEmail(email);
    if (!user) return res.status(401).json({ error: 'Invalid email or password.' });

    const match = await bcrypt.compare(password, user.password_hash);
    if (!match) return res.status(401).json({ error: 'Invalid email or password.' });

    const token = signToken(user);
    const { password_hash, ...safeUser } = user;
    res.json({ token, user: safeUser });
  } catch (err) {
    next(err);
  }
}

async function register(req, res, next) {
  const { email, password, name, role } = req.body;
  try {
    const existing = await User.findByEmail(email);
    if (existing) return res.status(409).json({ error: 'Email already registered.' });

    const password_hash = await bcrypt.hash(password, BCRYPT_ROUNDS);
    const user = await User.create({ email, name, password_hash, role });

    // Create role-specific profile row
    if (role === 'job_seeker') {
      await pool.query('INSERT INTO job_seekers (user_id) VALUES ($1) ON CONFLICT DO NOTHING', [user.user_id]);
    } else if (role === 'recruiter') {
      await pool.query('INSERT INTO recruiters (user_id) VALUES ($1) ON CONFLICT DO NOTHING', [user.user_id]);
    }

    const token = signToken(user);
    res.status(201).json({ token, user });
  } catch (err) {
    next(err);
  }
}

module.exports = { login, register };
