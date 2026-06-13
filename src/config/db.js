const { Pool } = require('pg');
const logger = require('../utils/logger');

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: true },
  max: 10,
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 5000,
});

pool.on('connect', () => logger.info('PostgreSQL client connected'));
pool.on('error', (err) => {
  logger.error(`PostgreSQL pool error: ${err.message}`);
});

module.exports = pool;
