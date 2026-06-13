const router = require('express').Router();
const { approveJob, verifyRecruiter, listRecruiters, getReports, getPendingJobs } = require('../controllers/adminController');
const { authenticate, requireRole } = require('../middlewares/auth');
const { strict, standard } = require('../middlewares/rateLimiter');

router.get('/reports',              standard, authenticate, requireRole('admin'), getReports);
router.get('/jobs/pending',         standard, authenticate, requireRole('admin'), getPendingJobs);
router.get('/recruiters',           standard, authenticate, requireRole('admin'), listRecruiters);
router.put('/jobs/:id/approve',     strict,   authenticate, requireRole('admin'), approveJob);
router.put('/recruiters/:id/verify',strict,   authenticate, requireRole('admin'), verifyRecruiter);

module.exports = router;
