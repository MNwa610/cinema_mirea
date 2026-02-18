const express = require('express');
const router = express.Router();

const userRouter = require('./userRouter');
const cinemaRouter = require('./cinemaRouter');
const filmRouter = require('./filmRouter');

router.use('/user', userRouter);
router.use('/cinema', cinemaRouter);
router.use('/film', filmRouter);

module.exports = router;