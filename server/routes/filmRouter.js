const express = require('express');
const router = express.Router();
const filmController = require('../controllers/FilmController');
const authMiddleware = require('../middleware/authMiddleware');

router.post('/create', filmController.createFilm);
router.get('/:filmId', filmController.getFilm);
router.get('/', filmController.getAllFilms);
router.patch('/:filmId/update', authMiddleware, filmController.updateFilm);
router.delete('/:filmId/delete', authMiddleware, filmController.deleteFilm);

module.exports = router;