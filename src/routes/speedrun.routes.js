const express = require('express');
const router = express.Router();
const speedrunController = require('../controllers/speedrun.controller');
const authenticateToken = require('../middlewares/auth.middleware');

// Leaderboard público
router.get('/leaderboard', speedrunController.getLeaderboard);

// Endpoints protegidos para registrar marcas y consultar siluetas fantasma
router.post('/record', authenticateToken, speedrunController.saveRecord);
router.get('/ghost/:levelNumber', authenticateToken, speedrunController.getGhostRecord);

module.exports = router;

