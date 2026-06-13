const express = require('express');
const helmet = require('helmet');
const cors = require('cors');
const morgan = require('morgan');
const path = require('path');
const logger = require('./utils/logger');
const errorHandler = require('./middlewares/errorHandler');

const app = express();

const allowedOrigins = (process.env.ALLOWED_ORIGINS || 'http://localhost:3000').split(',').map(o => o.trim());
const isDev = (process.env.NODE_ENV || 'development') !== 'production';

app.use(cors({
  origin: (origin, cb) => {
    if (!origin) return cb(null, true); // curl / Postman / server-to-server
    if (allowedOrigins.includes(origin)) return cb(null, true);
    if (isDev && /^http:\/\/localhost:\d+$/.test(origin)) return cb(null, true);
    cb(new Error('CORS: origin not allowed'));
  },
  credentials: true,
}));
app.use(helmet());
app.use(morgan('dev', { stream: { write: (msg) => logger.http(msg.trim()) } }));
app.use(express.json({ limit: '1mb' }));

// Serve uploaded resumes (no directory listing)
app.use('/uploads', express.static(path.join(__dirname, 'uploads'), { index: false }));

// Routes
app.use('/api/auth',        require('./routes/auth'));
app.use('/api/users',       require('./routes/users'));
app.use('/api/jobs',        require('./routes/jobs'));
app.use('/api/applications',require('./routes/applications'));
app.use('/api/recruiter',   require('./routes/recruiter'));
app.use('/api/companies',   require('./routes/companies'));
app.use('/api/referrals',   require('./routes/referrals'));
app.use('/api/blockchain',  require('./routes/blockchain'));

app.get('/health', (_req, res) => res.json({ status: 'ok' }));

app.use(errorHandler);

module.exports = app;
