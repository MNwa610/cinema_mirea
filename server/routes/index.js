const express = require('express');
const router = express.Router();

const userRouter = require('./userRouter');
const cinemaRouter = require('./cinemaRouter');
const filmRouter = require('./filmRouter');
const routingRouter = require('./routingRouter');

router.use('/user', userRouter);
router.use('/cinema', cinemaRouter);
router.use('/film', filmRouter);
router.use('/routing', routingRouter);

module.exports = router;