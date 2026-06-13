const logger = require('../utils/logger');

// Centralised error handler — must be registered last in Express middleware chain
function errorHandler(err, req, res, next) { // eslint-disable-line no-unused-vars
  const status = err.status || err.statusCode || 500;

  logger.error({
    message: err.message,
    stack: err.stack,
    method: req.method,
    path: req.path,
    status,
  });

  // Never leak internals to clients
  const clientMessage =
    status < 500 && err.expose !== false
      ? err.message
      : 'An unexpected error occurred. Please try again later.';

  res.status(status).json({ error: clientMessage });
}

module.exports = errorHandler;
