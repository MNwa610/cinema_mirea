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
        await user.update(req.body);
        res.json({ message: 'Профиль пользователя успешно обновлен', user });
    } catch (error) {
        res.status(500).json({ message: 'Ошибка при обновлении профиля пользователя', error });
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