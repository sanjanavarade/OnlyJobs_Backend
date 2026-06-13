const router = require('express').Router();
const { getProfile, updateProfile, uploadResume } = require('../controllers/userController');
const { authenticate, requireRole } = require('../middlewares/auth');
const { standard, strict } = require('../middlewares/rateLimiter');
const upload = require('../utils/fileUpload');

router.get('/profile',  standard, authenticate, getProfile);
router.put('/profile',  strict,   authenticate, updateProfile);
router.post('/resume',  strict,   authenticate, requireRole('job_seeker'), upload.single('resume'), uploadResume);

module.exports = router;
