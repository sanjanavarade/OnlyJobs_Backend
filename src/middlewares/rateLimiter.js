const rateLimit = require('express-rate-limit');

const message = { error: 'Too many requests. Please try again later.' };

// Tight limit for write / user-registration endpoints
const strict = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 min
  max: 20,
  standardHeaders: true,
  legacyHeaders: false,
  message,
});

// Relaxed limit for general read routes
const standard = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 200,
  standardHeaders: true,
  legacyHeaders: false,
  message,
});

// Very tight limit for anything that writes blockchain records
const blockchain = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 hour
  max: 10,
  standardHeaders: true,
  legacyHeaders: false,
  message,
});

module.exports = { strict, standard, blockchain };
