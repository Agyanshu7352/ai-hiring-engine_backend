const express = require('express');
const router = express.Router();
const dashboardController = require('../controllers/dashboard.controller');
// const { auth } = require('../middleware/auth'); // Uncomment for auth

router.get('/dashboard', dashboardController.getDashboard);
router.get('/dashboard/job/:id', dashboardController.getJobAnalytics);

module.exports = router;
