// server/routes/newsRoutes.js

const express = require('express');
const router = express.Router();

const authMiddleware = require('../middleware/authMiddleware');
const { getTopNews } = require('../controllers/newsController');

// Protected route: only logged‐in users can see “/api/news/top”
router.use(authMiddleware);

// GET /api/news/top
router.get('/top', getTopNews);

module.exports = router;
