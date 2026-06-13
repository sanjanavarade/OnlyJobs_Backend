const router = require('express').Router();
const { listJobs, getJob, createJob, deleteJob } = require('../controllers/jobController');
const { authenticate, requireRole } = require('../middlewares/auth');
const { standard, strict } = require('../middlewares/rateLimiter');

router.get('/', standard, listJobs);
router.get('/:id', standard, getJob);
router.post('/', strict, authenticate, requireRole('recruiter'), createJob);
router.delete('/:id', strict, authenticate, requireRole('recruiter'), deleteJob);

module.exports = router;
