const Film = require('../models/Film');

exports.createFilm = async (req, res) => {
    try {
        const newFilm = await Film.create(req.body);
        res.status(201).json({ message: 'Фильм успешно создан', film: newFilm });
    } catch (error) {
        res.status(500).json({ message: 'Ошибка при создании фильма', error });
    }
};

exports.getFilm = async (req, res) => {
    try {
        const film = await Film.findByPk(req.params.filmId);
        if (!film) {
            return res.status(404).json({ message: 'Фильм не найден' });
        }
        res.json(film);
    } catch (error) {
        res.status(500).json({ message: 'Ошибка при получении фильма', error });
    }
};

exports.getAllFilms = async (req, res) => {
    try {
        const films = await Film.findAll();
        res.json(films);
    } catch (error) {
        res.status(500).json({ message: 'Ошибка при получении фильмов', error });
    }
};

exports.updateFilm = async (req, res) => {
    try {
        const film = await Film.findByPk(req.params.filmId);
        if (!film) {
            return res.status(404).json({ message: 'Фильм не найден' });
        }
        await film.update(req.body);
        res.json({ message: 'Фильм успешно обновлен', film });
    } catch (error) {
        res.status(500).json({ message: 'Ошибка при обновлении фильма', error });
    }
};

exports.deleteFilm = async (req, res) => {
    try {
        const film = await Film.findByPk(req.params.filmId);
        if (!film) {
            return res.status(404).json({ message: 'Фильм не найден' });
        }
        await film.destroy();
        res.json({ message: 'Фильм успешно удален' });
    } catch (error) {
        res.status(500).json({ message: 'Ошибка при удалении фильма', error });
    }
};

