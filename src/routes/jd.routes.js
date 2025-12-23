const express = require('express');
const router = express.Router();
const jdController = require('../controllers/jd.controller');
// const { auth } = require('../middleware/auth'); // Uncomment for auth

router.post('/parse-jd', jdController.parseJD);
router.get('/job-descriptions', jdController.getJDs);
router.get('/job-descriptions/:id', jdController.getJDById);
router.put('/job-descriptions/:id', jdController.updateJD);
router.delete('/job-descriptions/:id', jdController.deleteJD);

module.exports = router;
