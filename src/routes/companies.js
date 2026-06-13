const router = require('express').Router();
const { createCompany, listCompanies } = require('../controllers/companyController');
const { authenticate, requireRole } = require('../middlewares/auth');
const { standard, strict } = require('../middlewares/rateLimiter');

router.get('/',  standard, authenticate, listCompanies);
router.post('/', strict,   authenticate, requireRole('recruiter'), createCompany);

module.exports = router;
