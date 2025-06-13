// server/routes/coinRoutes.js

const express = require('express');
const router  = express.Router();

const authMiddleware = require('../middleware/authMiddleware');
const {
  createCoin,
  getCoins,
  updateCoin,
  deleteCoin
} = require('../controllers/coinController');

const {
  fetchCoinData,
  fetchTopCoins,
  fetchCryptoNews  
  
} = require('../utils/apiClients');

/**
 PUBLIC ENDPOINT: Top Coins (no auth required)
 GET /api/coins/top?limit=10
*/
router.get('/top', async (req, res) => {
  const limit = parseInt(req.query.limit) || 10;
  try {
    const topList = await fetchTopCoins(limit);
    return res.status(200).json({ coins: topList });
  } catch (err) {
    console.error('TopCoins error:', err.message);
    return res.status(500).json({ error: 'Failed to fetch top coins.' });
  }
});

// PUBLIC: price for a single coin
router.get('/search-price/:coinId', async (req, res) => {
  const coinId = req.params.coinId;
  if (!coinId) {
    return res.status(400).json({ error: 'coinId is required.' });
  }
  try {
    const data = await fetchCoinData(coinId);
    return res.status(200).json({ coinId, ...data });
  } catch (err) {
    console.error('SearchPrice error:', err.message);
    if (err.message === 'CoinDataFetchError') {
      return res.status(404).json({ error: `Coin data not found for "${coinId}"` });
    }
    return res.status(500).json({ error: 'Failed to fetch coin data.' });
  }
});

// PUBLIC: top headline for a symbol
router.get('/search-news/:symbol', async (req, res) => {
  const symbol = req.params.symbol.trim().toUpperCase();
  if (!symbol) {
    return res.status(400).json({ error: 'symbol is required.' });
  }
  try {
    const results = await fetchCryptoNews(symbol, 1);
    const top = results.length > 0 ? results[0] : null;
    return res.json({ headline: top });
  } catch (err) {
    console.error('FetchNews error:', err.message);
    return res.status(500).json({ error: 'Failed to fetch news.' });
  }
});


// PROTECTED ENDPOINTS (require valid JWT in Authorization header)
router.use(authMiddleware);

// Create a new saved coin
// POST /api/coins
router.post('/', createCoin);

// Get all saved coins for this user (with optional filter/sort)
// GET /api/coins
router.get('/', getCoins);

// Update (e.g. refresh) a saved coin
// PUT /api/coins/:id?refresh=true
router.put('/:id', updateCoin);

// Delete a saved coin
// DELETE /api/coins/:id
router.delete('/:id', deleteCoin);

module.exports = router;