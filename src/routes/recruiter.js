const router = require('express').Router();
const { getApplicants, getMyApplicants, updateStatus, scheduleInterview } = require('../controllers/recruiterController');
const { authenticate, requireRole } = require('../middlewares/auth');
const { standard, strict } = require('../middlewares/rateLimiter');

router.get('/applicants',              standard, authenticate, requireRole('recruiter'), getMyApplicants);
router.get('/jobs/:jobId/applicants',  standard, authenticate, requireRole('recruiter'), getApplicants);
router.put('/applications/:id/status', strict,   authenticate, requireRole('recruiter'), updateStatus);
router.post('/interviews',             strict,   authenticate, requireRole('recruiter'), scheduleInterview);

module.exports = router;
