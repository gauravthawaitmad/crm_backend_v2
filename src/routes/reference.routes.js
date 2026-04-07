const { Router } = require('express');
const authMiddleware = require('../middlewares/auth.middleware');
const referenceController = require('../controllers/reference.controller');

const router = Router();

router.use(authMiddleware);

router.get('/states',    referenceController.states);
router.get('/cities',    referenceController.cities);
router.get('/users/co',  referenceController.coUsers);
router.get('/schools',   referenceController.schools);

module.exports = router;
