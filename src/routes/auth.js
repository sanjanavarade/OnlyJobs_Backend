const router = require('express').Router();
const { body, validationResult } = require('express-validator');
const { login, register, me, logout } = require('../controllers/authController');
const { authenticate } = require('../middlewares/auth');
const { strict, standard } = require('../middlewares/rateLimiter');

const validate = (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) return res.status(400).json({ error: 'Invalid input.' });
  next();
};

const loginRules = [
  body('email').isEmail().normalizeEmail(),
  body('password').isLength({ min: 8 }),
];

const registerRules = [
  body('email').isEmail().normalizeEmail(),
  body('password').isLength({ min: 8 }),
  body('name').trim().isLength({ min: 1, max: 255 }),
  body('role').isIn(['job_seeker', 'recruiter']),
];

router.post('/login',    strict, loginRules,    validate, login);
router.post('/register', strict, registerRules, validate, register);
router.get('/me',        standard, authenticate, me);
router.post('/logout',   standard, logout);

module.exports = router;
