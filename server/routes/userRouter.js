const express = require('express');
const router = express.Router();
const userController = require('../controllers/UserController');
const { authMiddleware } = require('../middleware/authMiddleware');

router.post('/registration', userController.registerUser);
router.post('/login', userController.loginUser);
router.get('/auth', authMiddleware, userController.checkUserProfile);
router.get('/profile', authMiddleware, userController.getUserProfile);
router.patch('/profile/update', authMiddleware, userController.updateUserProfile);
router.delete('/profile/delete', authMiddleware, userController.deleteUser);
router.get('/users', authMiddleware, userController.getAllUsers);

module.exports = router;