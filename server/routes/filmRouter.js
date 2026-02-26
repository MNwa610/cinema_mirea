const express = require('express');
const router = express.Router();
const filmController = require('../controllers/FilmController');
const { authMiddleware } = require('../middleware/authMiddleware');

router.post('/create', filmController.createFilm);
router.get('/external/random', filmController.getExternalRandomFilms);
router.get('/external/:kinopoiskId/facts', filmController.getExternalFilmFacts);
router.get('/external/:kinopoiskId/reviews', filmController.getExternalFilmReviews);
router.get('/external/:kinopoiskId', filmController.getExternalFilm);

router.get('/:filmId/cinemas', filmController.getCinemasForFilm);
router.get('/:filmId/locations', filmController.getFilmLocations);

router.get('/:filmId', filmController.getFilm);
router.get('/', filmController.getAllFilms);
router.patch('/:filmId/update', authMiddleware, filmController.updateFilm);
router.delete('/:filmId/delete', authMiddleware, filmController.deleteFilm);

module.exports = router;