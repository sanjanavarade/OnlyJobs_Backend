const router = require('express').Router();
const { submitReferral, listReferrals, verifyReferral } = require('../controllers/referralController');
const { authenticate, requireRole } = require('../middlewares/auth');
const { standard, strict } = require('../middlewares/rateLimiter');

router.post('/',           strict,   authenticate, requireRole('recruiter'), submitReferral);
router.get('/',            standard, authenticate, requireRole('recruiter'), listReferrals);
router.get('/:id/verify',  standard, authenticate, requireRole('recruiter'), verifyReferral);

module.exports = router;
