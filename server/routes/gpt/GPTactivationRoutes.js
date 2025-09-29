const express = require('express');
const router = express.Router();
// Adjust path to controller based on new location
const GPTactivationController = require('../../controllers/GPTactivationController.js');

router.post('/verify-gpt', GPTactivationController.checkGPTActivation);

module.exports = router;