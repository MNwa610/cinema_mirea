const express = require('express');
const router = express.Router();
const cinemaController = require('../controllers/CinemaController');
const { authMiddleware } = require('../middleware/authMiddleware');

router.post('/create', cinemaController.createCinema);
router.get('/:cinemaId', cinemaController.getCinema);
router.get('/', cinemaController.getAllCinemas);
router.patch('/:cinemaId/update', authMiddleware, cinemaController.updateCinema);
router.delete('/:cinemaId/delete', authMiddleware, cinemaController.deleteCinema);

module.exports = router;