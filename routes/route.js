const express = require('express');
const authRoutes = require('./auth');
const userRoute = require('./user');
const adminRoute = require('./admin');
const authenticateToken = require('../middlewares/checkLog');
const getUser = require('../middlewares/getUser');
const requireRole = require('../middlewares/checkrole');
const router = express.Router();

router.use("/",authRoutes)
router.use("/user",authenticateToken,getUser,requireRole('user'), userRoute)
router.use("/admin",authenticateToken,getUser,requireRole("admin"),adminRoute)


module.exports = router;