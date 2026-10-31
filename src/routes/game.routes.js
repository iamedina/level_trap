const express = require('express');
const router = express.Router();
const gameController = require('../controllers/game.controller');
const authenticateToken = require('../middlewares/auth.middleware');

router.use(authenticateToken);

router.get('/progress', gameController.getProgress);
router.get('/levels', gameController.getAllLevels);
router.get('/levels/:levelNumber', gameController.getLevel);
router.post('/death', gameController.registerDeath);
router.post('/complete', gameController.completeLevel);

module.exports = router;

