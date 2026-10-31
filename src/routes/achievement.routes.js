const express = require('express');
const router = express.Router();
const achievementController = require('../controllers/achievement.controller');
const authenticateToken = require('../middlewares/auth.middleware');

router.use(authenticateToken);

router.get('/', achievementController.listAchievements);
router.post('/unlock', achievementController.unlockAchievement);

module.exports = router;

