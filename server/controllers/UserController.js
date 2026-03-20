const {User} = require('../models/models');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');

exports.registerUser = async (req, res) => {
    try {
        const { username, email, password, address } = req.body;
        
        if (!username || !email || !password) {
            return res.status(400).json({ message: 'Имя пользователя, email и пароль обязательны' });
        }

        const hashedPassword = await bcrypt.hash(password, 10);
        const userData = { username, email, password: hashedPassword };
        
        // Если адрес указан при регистрации, добавляем его
        if (address) {
            userData.address = address;
        }
        
        const newUser = await User.create(userData);
        res.status(201).json({ message: 'Успешная регистрация пользователя', user: newUser });
    } catch (error) {
        console.error('Registration error:', error);

        if (error.name === 'SequelizeUniqueConstraintError') {
            return res.status(400).json({
                message: 'Пользователь с таким email или именем уже существует'
            });
        }

        res.status(500).json({ message: 'Ошибка при регистрации пользователя' });
    }
};

exports.loginUser = async (req, res) => {
    try {
        const { email, password } = req.body;
        const user = await User.findOne({ where: { email } });
        if (!user || !(await bcrypt.compare(password, user.password))) {
            return res.status(401).json({ message: 'Неверные учетные данные' });
        }
        const token = jwt.sign({ id: user.id }, process.env.JWT_SECRET, { expiresIn: '24h' });
        res.json({ token });
    } catch (error) {
        res.status(500).json({ message: 'Ошибка при входе в систему', error });
    }
};

exports.checkUserProfile = async (req, res) => {
    try {
        const user = await User.findByPk(req.user.id);
        if (!user) {
            return res.status(404).json({ message: 'Пользователь не найден' });
        }
        res.json(user);
    } catch (error) {
        res.status(500).json({ message: 'Ошибка при получении профиля пользователя', error });
    }
};

exports.getUserProfile = async (req, res) => {
    try {
        const user = await User.findByPk(req.user.id);
        if (!user) {
            return res.status(404).json({ message: 'Пользователь не найден' });
        }
        res.json(user);
    } catch (error) {
        res.status(500).json({ message: 'Ошибка при получении профиля пользователя', error });
    }
};

exports.updateUserProfile = async (req, res) => {
    try {
        const user = await User.findByPk(req.user.id);
        if (!user) {
            return res.status(404).json({ message: 'Пользователь не найден' });
        }

        const {
            username,
            address,
            latitude,
            longitude,
            avatarUrl,
            currentPassword,
            newPassword
        } = req.body;

        if (username) {
            user.username = username;
        }
        if (address !== undefined) {
            user.address = address;
        }
        if (latitude !== undefined) {
            user.latitude = latitude;
        }
        if (longitude !== undefined) {
            user.longitude = longitude;
        }
        if (avatarUrl !== undefined) {
            user.avatarUrl = avatarUrl;
        }

        if (newPassword) {
            if (!currentPassword) {
                return res.status(400).json({ message: 'Укажите текущий пароль для изменения пароля' });
            }
            const isMatch = await bcrypt.compare(currentPassword, user.password);
            if (!isMatch) {
                return res.status(400).json({ message: 'Текущий пароль указан неверно' });
            }
            const hashedPassword = await bcrypt.hash(newPassword, 10);
            user.password = hashedPassword;
        }

        await user.save();
        res.json({ message: 'Профиль пользователя успешно обновлен', user });
    } catch (error) {
        res.status(500).json({ message: 'Ошибка при обновлении профиля пользователя', error });
    }
};

// ===== Просмотренные фильмы пользователя =====
const { Film, UserFilmRelationship } = require('../models/models');

exports.addWatchedFilm = async (req, res) => {
    try {
        const userId = req.user.id;
        const externalId = req.params.filmId;
        const externalIdNum = Number(externalId);

        // Фильм уже синхронизируется с базой при запросе /api/film/external/:id
        // (см. FilmController.getExternalFilm), поэтому здесь просто ищем его по kinopoiskId.
        const film = await Film.findOne({
            where: {
                kinopoiskId: externalIdNum || externalId
            }
        });

        if (!film) {
            return res.status(404).json({ message: 'Фильм не найден в базе. Откройте страницу фильма и попробуйте еще раз.' });
        }

        await UserFilmRelationship.findOrCreate({
            where: {
                user_id: userId,
                film_id: film.id,
                userId: userId,
                filmId: film.id
            }
        });

        res.json({ message: 'Фильм отмечен как просмотренный' });
    } catch (error) {
        console.error('addWatchedFilm error:', error);
        res.status(500).json({ message: 'Ошибка при отметке фильма как просмотренного', error });
    }
};

exports.getWatchedFilms = async (req, res) => {
    try {
        const userId = req.user.id;

        const relations = await UserFilmRelationship.findAll({
            where: { user_id: userId }
        });

        const filmIds = relations
            .map(rel => rel.film_id)
            .filter(Boolean);

        if (!filmIds.length) {
            return res.json([]);
        }

        const films = await Film.findAll({
            where: { id: filmIds }
        });

        res.json(films);
    } catch (error) {
        console.error('getWatchedFilms error:', error);
        res.status(500).json({ message: 'Ошибка при получении просмотренных фильмов', error });
    }
};

exports.removeWatchedFilm = async (req, res) => {
    try {
        const userId = req.user.id;
        const externalId = req.params.filmId;
        const externalIdNum = Number(externalId);

        const film = await Film.findOne({
            where: {
                kinopoiskId: externalIdNum || externalId
            }
        });

        if (!film) {
            return res.status(404).json({ message: 'Фильм не найден в базе' });
        }

        await UserFilmRelationship.destroy({
            where: {
                user_id: userId,
                film_id: film.id
            }
        });

        res.json({ message: 'Фильм удален из просмотренных' });
    } catch (error) {
        console.error('removeWatchedFilm error:', error);
        res.status(500).json({ message: 'Ошибка при удалении фильма из просмотренных', error });
    }
};

exports.deleteUser = async (req, res) => {
    try {
        const user = await User.findByPk(req.user.id);
        if (!user) {
            return res.status(404).json({ message: 'Пользователь не найден' });
        }
        await user.destroy();
        res.json({ message: 'Пользователь удален успешно' });
    } catch (error) {
        res.status(500).json({ message: 'Ошибка при удалении пользователя', error });
    }
};

exports.getAllUsers = async (req, res) => {
    try {
        const users = await User.findAll();
        res.json(users);
    } catch (error) {
        res.status(500).json({ message: 'Ошибка при получении пользователей', error });
    }
};