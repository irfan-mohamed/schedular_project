// routes/auth.js
const express = require('express');
const router = express.Router();
const { loginHandler } = require('../controllers/authController');

router.post('/signin', loginHandler);

module.exports = router;
