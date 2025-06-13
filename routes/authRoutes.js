// server/routes/authRoutes.js
const express = require('express');
const router = express.Router();
const { register, login, forgotPassword, resetPassword, verifyResetToken } = require('../controllers/authController');

router.post('/register', register);
router.post('/login', login);
router.post('/forgot-password',forgotPassword);
router.post('/reset-password',  resetPassword);
router.get( '/verify-reset-token', verifyResetToken);

module.exports = router;
