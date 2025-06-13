// server/controllers/coinController.js

const Coin = require('../models/Coin');
const News = require('../models/News');
const { fetchCoinData, fetchCryptoNews } = require('../utils/apiClients');

/**
 * POST /api/coins
 * Body: { coinId }  coinId should be something like "btc-bitcoin"
 * Protected route → req.user.id must exist
 */
exports.createCoin = async (req, res) => {
  const userId = req.user.id;
  const { coinId } = req.body;

  // 1) Validate input
  if (!coinId) {
    return res.status(400).json({ error: 'coinId is required.' });
  }

  try {
    // 2) Fetch price & market data from CoinPaprika
    //    fetchCoinData will throw “CoinDataFetchError” if the CoinPaprika API call fails.
    const data = await fetchCoinData(coinId);
    //    data = { name, symbol, price, marketCap, change24h }

    // 3) Fetch top news for this coin’s symbol using NewsAPI.org
    //    If no articles are found, we store “null” instead.
    const newsArray = await fetchCryptoNews(data.symbol, 1);
    const topHeadline = Array.isArray(newsArray) && newsArray.length > 0 ? newsArray[0] : null;

    // 4) Build and save the new Coin document
    const newCoin = new Coin({
      user:      userId,
      coinId:    coinId,
      symbol:     data.symbol,
      name:      data.name,
      price:     data.price,
      marketCap: data.marketCap,
      change24h: data.change24h,
      headline:  topHeadline
    });
    await newCoin.save();
    if (topHeadline) {
    await News.create({
    user:       userId,
    coin:       newCoin._id,
    title:      topHeadline.title,
    description: topHeadline.description,
    url:        topHeadline.url,
    imageUrl:   topHeadline.imageUrl,
    publishedAt: topHeadline.publishedAt   
  });
  }
    // 5) Return the saved document
    return res.status(201).json(newCoin);
  } catch (err) {
    // Log the error in detail for debugging
    console.error(' CreateCoin caught exception! err.message =', err.message);
    console.error(' Full error object =', err);

    // Handle duplicate‐key (user already saved that coin)
    if (err.code === 11000) {
      return res.status(409).json({ error: 'Coin already saved.' });
    }

    // If fetchCoinData threw CoinDataFetchError:
    if (err.message === 'CoinDataFetchError') {
      return res.status(404).json({ error: `Coin data not found for "${coinId}".` });
    }

    // If fetchCryptoNews threw NewsFetchError:
    if (err.message === 'NewsFetchError') {
      return res.status(502).json({ error: 'Failed to fetch news data.' });
    }

    // Fallback for any other server error
    return res.status(500).json({ error: 'Server error while saving coin.' });
  }
};

/**
 * GET /api/coins
 * Query params (optional): filter, sortBy
 * Protected route → req.user.id must exist
 */
exports.getCoins = async (req, res) => {
  const userId = req.user.id;
  const { filter, sortBy } = req.query;

  // Build search and sort objects
  const search = { user: userId };
  if (filter) {
    search.name = { $regex: filter, $options: 'i' };
  }
  let sortObj = {};
  if (sortBy === 'price') sortObj.price = 1;
  else if (sortBy === 'change24h') sortObj.change24h = -1;

  try {
    const coins = await Coin.find(search).sort(sortObj).lean();

    // Attach latest news headline for each coin
    const coinsWithNews = await Promise.all(coins.map(async (coin) => {
      const news = await News.findOne({ user: userId, coin: coin._id })
        .sort({ createdAt: -1 })
        .lean();
      return { ...coin, headline: news || null };
    }));

    return res.status(200).json(coinsWithNews);
  } catch (err) {
    console.error('GetCoins error:', err);
    return res.status(500).json({ error: 'Server error while fetching coins.' });
  }
};

/**
 * PUT /api/coins/:id?refresh=true
 * Protected route → req.user.id must exist
 */
exports.updateCoin = async (req, res) => {
  const userId      = req.user.id;
  const coinIdParam = req.params.id;
  const { refresh } = req.query;
  const { notes }   = req.body;

  try {

    const coin = await Coin.findOne({ _id: coinIdParam, user: userId });
    if (!coin) {
      return res.status(404).json({ error: 'Coin not found.' });
    }

    if (typeof notes === 'string') {
      coin.notes = notes;

      if (!coin.symbol && coin.coinId) {
        coin.symbol = coin.coinId.split('-')[0].toUpperCase();
      }
      await coin.save();

      const latestNews = await News
        .findOne({ user: userId, coin: coin._id })
        .sort({ createdAt: -1 })
        .lean();

      return res.status(200).json({
        ...coin.toObject(),
        headline: latestNews || null
      });
    }

    if (refresh === 'true') {
      const data = await fetchCoinData(coin.coinId);
      if (!data || !data.symbol) throw new Error('CoinDataFetchError');

      coin.symbol    = data.symbol;
      coin.name      = data.name;
      coin.price     = data.price;
      coin.marketCap = data.marketCap;
      coin.change24h = data.change24h;

      const newsArray   = await fetchCryptoNews(data.symbol, 1);
      const topHeadline = Array.isArray(newsArray) && newsArray.length > 0
        ? newsArray[0]
        : null;

      await News.deleteMany({ user: userId, coin: coin._id });
      if (topHeadline) {
        await News.create({
          user:        userId,
          coin:        coin._id,
          title:       topHeadline.title,
          description: topHeadline.description,
          url:         topHeadline.url,
          imageUrl:    topHeadline.imageUrl,
          publishedAt: topHeadline.publishedAt
        });
      }
    }
    await coin.save();

    const latestNews = await News
      .findOne({ user: userId, coin: coin._id })
      .sort({ createdAt: -1 })
      .lean();

    return res.status(200).json({
      ...coin.toObject(),
      headline: latestNews || null
    });

  } catch (err) {
    console.error('UpdateCoin error:', err);

    if (err.message === 'CoinDataFetchError') {
      return res
        .status(404)
        .json({ error: `Coin data not found for "${req.params.id}".` });
    }
    if (err.message === 'NewsFetchError') {
      return res
        .status(502)
        .json({ error: 'Failed to fetch news data.' });
    }

    return res
      .status(500)
      .json({ error: 'Server error while updating coin.' });
  }
};

/**
 * DELETE /api/coins/:id
 * Protected route → req.user.id must exist
 */
exports.deleteCoin = async (req, res) => {
  const userId = req.user.id;
  const coinIdParam = req.params.id;

  try {
    const coin = await Coin.findOneAndDelete({ _id: coinIdParam, user: userId });
    if (!coin) {
      return res.status(404).json({ error: 'Coin not found.' });
    }
    // Remove associated news
    await News.deleteMany({ user: userId, coin: coin._id });
    return res.status(204).send();
  } catch (err) {
    console.error('DeleteCoin error:', err);
    return res.status(500).json({ error: 'Server error while deleting coin.' });
  }
};
