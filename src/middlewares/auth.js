const jwt = require('jsonwebtoken');
const pool = require('../config/db');

async function authenticate(req, res, next) {
  const header = req.headers.authorization;
  if (!header?.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'Authentication required.' });
  }

  const token = header.slice(7);
  let payload;
  try {
    payload = jwt.verify(token, process.env.JWT_SECRET);
  } catch {
    return res.status(401).json({ error: 'Invalid or expired token.' });
  }

  try {
    const { rows } = await pool.query(
      'SELECT user_id, name, email, role FROM users WHERE user_id = $1',
      [payload.sub]
    );
    if (!rows.length) return res.status(401).json({ error: 'User not found.' });
    req.user = rows[0];
    next();
  } catch (err) {
    next(err);
  }
}

function requireRole(...roles) {
  return (req, res, next) => {
    if (!req.user || !roles.includes(req.user.role)) {
      return res.status(403).json({ error: 'Forbidden.' });
    }
    next();
  };
}

module.exports = { authenticate, requireRole };
