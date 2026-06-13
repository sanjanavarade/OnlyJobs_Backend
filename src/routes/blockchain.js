const router = require('express').Router();
const { storeHiringRecord, verifyHiringRecord } = require('../controllers/blockchainController');
const { authenticate, requireRole } = require('../middlewares/auth');
const { blockchain } = require('../middlewares/rateLimiter');

router.post('/store', blockchain, authenticate, requireRole('recruiter'), storeHiringRecord);
router.get('/verify/:applicationId', authenticate, verifyHiringRecord);

module.exports = router;
