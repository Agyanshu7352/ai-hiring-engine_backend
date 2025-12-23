const express = require('express');
const router = express.Router();
const matchController = require('../controllers/match.controller');
// const { auth } = require('../middleware/auth'); // Uncomment for auth

router.post('/match', matchController.matchCandidates);
router.get('/matches', matchController.getMatches);
router.get('/matches/:id', matchController.getMatchById);
router.put('/matches/:id', matchController.updateMatch);
router.delete('/matches/:id', matchController.deleteMatch);

module.exports = router;