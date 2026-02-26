const express = require('express')
const router = express.Router()
const routingController = require('../controllers/RoutingController')

router.get('/route', routingController.getRoute)

module.exports = router

