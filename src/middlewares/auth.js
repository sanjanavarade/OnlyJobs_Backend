const jwt = require('jsonwebtoken');
const pool = require('../config/db');

// Accept the JWT from either the Authorization header (same-session requests)
// or the httpOnly `token` cookie (set on login → survives page reload).
function getToken(req) {
  const header = req.headers.authorization;
  if (header?.startsWith('Bearer ')) return header.slice(7);

  const rawCookie = req.headers.cookie;
  if (rawCookie) {
    const entry = rawCookie.split(';').map(c => c.trim()).find(c => c.startsWith('token='));
    if (entry) return decodeURIComponent(entry.slice('token='.length));
  }
  return null;
}

async function authenticate(req, res, next) {
  const token = getToken(req);
  if (!token) {
    return res.status(401).json({ error: 'Authentication required.' });
  }

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
