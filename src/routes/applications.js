const router = require('express').Router();
const { applyToJob, myApplications, checkApplicationStatus } = require('../controllers/applicationController');
const { authenticate, requireRole } = require('../middlewares/auth');
const { strict, standard } = require('../middlewares/rateLimiter');

router.post('/', strict, authenticate, requireRole('job_seeker'), applyToJob);
router.get('/my', standard, authenticate, requireRole('job_seeker'), myApplications);
router.get('/check/:job_id', standard, authenticate, checkApplicationStatus);

module.exports = router;
