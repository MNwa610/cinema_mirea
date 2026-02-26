const { Cinema } = require('../models/models');
const { Op } = require('sequelize');
const { STATIC_CINEMAS } = require('../data/staticCinemas');

exports.createCinema = async (req, res) => {
    try {
        const newCinema = await Cinema.create(req.body);
        res.status(201).json({ message: 'Кинотеатр успешно создан', cinema: newCinema });
    } catch (error) {
        res.status(500).json({ message: 'Ошибка при создании кинотеатра', error });
    }
};

exports.getCinema = async (req, res) => {
    try {
        const cinema = await Cinema.findByPk(req.params.cinemaId);
        if (!cinema) {
            return res.status(404).json({ message: 'Кинотеатр не найден' });
        }
        res.json(cinema);
    } catch (error) {
        res.status(500).json({ message: 'Ошибка при получении кинотеатра', error });
    }
};

exports.getAllCinemas = async (req, res) => {
    try {
        const onlyMoscow = String(req.query.city || '').toLowerCase() === 'moscow';

        const where = onlyMoscow
            ? {
                address: {
                    [Op.iLike]: '%москва%'
                }
            }
            : undefined;

        let cinemas = [];
        try {
            cinemas = await Cinema.findAll({ where });
        } catch (dbError) {
            console.error('DB error when loading cinemas, fallback to static:', dbError);
        }

        if (!cinemas || cinemas.length === 0) {
            return res.json(STATIC_CINEMAS);
        }

        res.json(cinemas);
    } catch (error) {
        res.status(500).json({ message: 'Ошибка при получении кинотеатров', error });
    }
};

exports.updateCinema = async (req, res) => {
    try {
        const cinema = await Cinema.findByPk(req.params.cinemaId);
        if (!cinema) {
            return res.status(404).json({ message: 'Кинотеатр не найден' });
        }
        await cinema.update(req.body);
        res.json({ message: 'Кинотеатр успешно обновлен', cinema });
    } catch (error) {
        res.status(500).json({ message: 'Ошибка при обновлении кинотеатра', error });
    }
};

exports.deleteCinema = async (req, res) => {
    try {
        const cinema = await Cinema.findByPk(req.params.cinemaId);
        if (!cinema) {
            return res.status(404).json({ message: 'Кинотеатр не найден' });
        }
        await cinema.destroy();
        res.json({ message: 'Кинотеатр успешно удален' });
    } catch (error) {
        res.status(500).json({ message: 'Ошибка при удалении кинотеатра', error });
    }
};