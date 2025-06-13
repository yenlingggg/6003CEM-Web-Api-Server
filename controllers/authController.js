// server/controllers/authController.js
const User = require('../models/User');
const jwt = require('jsonwebtoken');
const nodemailer = require('nodemailer');
const crypto = require('crypto');

// Configure email transporter
const transporter = nodemailer.createTransport({
  host:    process.env.SMTP_HOST,
  port:    parseInt(process.env.SMTP_PORT, 10),
  secure:  process.env.SMTP_SECURE === 'true', // true for 465, false for other ports
  auth: {
    user: process.env.SMTP_USER,
    pass: process.env.SMTP_PASS
  }
});

function generateToken(user) {
  return jwt.sign({ id: user._id, username: user.username, email: user.email }, process.env.JWT_SECRET, { expiresIn: '1h' });
}

// User registration
exports.register = async (req, res) => {
  const { username, email, password } = req.body;
  if (!username || !email || !password)
    return res.status(400).json({ error: 'All fields are required' });

  // Password validation
  if (password.length < 8) {
    return res.status(400).json({ error: 'Password must be at least 8 characters long' });
  }

  try {
    if (await User.findOne({ email }))
      return res.status(409).json({ error: 'Email already in use' });
    if (await User.findOne({ username }))
      return res.status(409).json({ error: 'Username already taken' });

    const user = new User({ username, email, password });
    await user.save();
    const token = generateToken(user);
    res.status(201).json({ token, user: { id: user._id, username: user.username } });
  } catch (err) {
    console.error('Register error:', err);
    res.status(500).json({ error: 'Server error during registration' });
  }
};

// User login
exports.login = async (req, res) => {
  const { email, password } = req.body;
  if (!email || !password)
    return res.status(400).json({ error: 'Email and password are required' });

  try {
    const user = await User.findOne({ email });
    if (!user) return res.status(401).json({ error: 'Invalid credentials' });

    const isMatch = await user.comparePassword(password);
    if (!isMatch) return res.status(401).json({ error: 'Invalid credentials' });

    const token = generateToken(user);
    res.json({ token, user: { id: user._id, username: user.username } });
  } catch (err) {
    console.error('Login error:', err);
    res.status(500).json({ error: 'Server error during login' });
  }
};

// Forgot password: generate & email one-time token
exports.forgotPassword = async (req, res) => {
  const { email } = req.body;
  if (!email) return res.status(400).json({ error: 'Email is required' });

  try {
    const user = await User.findOne({ email });
    if (!user) {
      return res.status(404).json({ error: 'Email not found' });
    }

    const rawToken = crypto.randomBytes(32).toString('hex');
    const hashedToken = crypto.createHash('sha256').update(rawToken).digest('hex');

    user.resetPasswordToken = hashedToken;
    user.resetPasswordExpires = Date.now() + 3600000; // 1 hour
    await user.save();

    const resetUrl = `${process.env.FRONTEND_URL}/reset-password?token=${rawToken}`;
    await transporter.sendMail({
      from:    process.env.EMAIL_FROM,
      to:      user.email,
      subject: 'Your password reset link',
      html:    `<p>Hi ${user.username || ''},</p>
               <p>You requested a password reset. Click <a href="${resetUrl}">here</a> to set a new password.</p>
               <p>If you didn't request this, you can ignore this email.</p>`
    });

    return res.status(200).json({ message: 'Please check your email for the reset link' });
  } catch (err) {
    console.error('ForgotPassword error:', err);
    return res.status(500).json({ error: 'Server error initiating password reset' });
  }
};

// Reset password: consume one-time token
exports.resetPassword = async (req, res) => {
  const { token: rawToken, password } = req.body;
  if (!rawToken || !password) {
    return res.status(400).json({ error: 'Token and new password are required' });
  }

  // Password validation
  if (password.length < 8) {
    return res.status(400).json({ error: 'Password must be at least 8 characters long' });
  }

  try {
    const hashedToken = crypto.createHash('sha256').update(rawToken).digest('hex');
    const user = await User.findOne({
      resetPasswordToken:   hashedToken,
      resetPasswordExpires: { $gt: Date.now() }
    });
    if (!user) {
      return res.status(400).json({ error: 'Invalid or expired token' });
    }

    user.password = password;
    user.resetPasswordToken = undefined;
    user.resetPasswordExpires = undefined;
    await user.save();

    return res.json({ message: 'Password has been reset successfully.' });
  } catch (err) {
    console.error('ResetPassword error:', err);
    return res.status(500).json({ error: 'Server error while resetting password' });
  }
};

// Verify reset token without consuming it
exports.verifyResetToken = async (req, res) => {
  const { token: rawToken } = req.query;
  if (!rawToken) {
    return res.status(400).json({ valid: false, error: 'Token missing' });
  }
  try {
    const hashedToken = crypto.createHash('sha256').update(rawToken).digest('hex');
    const user = await User.findOne({
      resetPasswordToken:   hashedToken,
      resetPasswordExpires: { $gt: Date.now() }
    });
    if (!user) {
      return res.status(400).json({ valid: false, error: 'Token expired or invalid' });
    }
    return res.json({ valid: true });
  } catch (err) {
    console.error('VerifyResetToken error:', err);
    return res.status(500).json({ valid: false, error: 'Server error verifying token' });
  }
};
