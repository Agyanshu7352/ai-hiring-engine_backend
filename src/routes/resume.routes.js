const express = require('express');
const router = express.Router();
const resumeController = require('../controllers/resume.controller');
const { upload, handleMulterError } = require('../middleware/upload');
// const { auth } = require('../middleware/auth'); // Uncomment for auth

router.post('/parse-resume', upload.single('resume'), handleMulterError, resumeController.parseResume);
router.get('/resumes', resumeController.getResumes);
router.get('/resumes/:id', resumeController.getResumeById);
router.put('/resumes/:id', resumeController.updateResume);
router.delete('/resumes/:id', resumeController.deleteResume);

module.exports = router