const router = require('express').Router();
const { applyToJob, myApplications } = require('../controllers/applicationController');
const { authenticate, requireRole } = require('../middlewares/auth');
const { strict, standard } = require('../middlewares/rateLimiter');

router.post('/', strict, authenticate, requireRole('job_seeker'), applyToJob);
router.get('/my', standard, authenticate, requireRole('job_seeker'), myApplications);

module.exports = router;
