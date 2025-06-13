// server/controllers/newsController.js

const { fetchTopCryptoNews } = require('../utils/apiClients');

/**
 * GET /api/news/top
 * Returns the latest N crypto‐related news articles from NewsAPI.org.
 * Protected route → req.user.id is assumed to exist
 */
exports.getTopNews = async (req, res) => {
  try {
    const keyword = 'cryptocurrency'; 
    const pageSize = 8;  // number of articles to fetch
    const articles = await fetchTopCryptoNews(keyword, pageSize);

    return res.status(200).json({ articles });
  } catch (err) {
    console.error(' getTopNews error:', err);
    if (err.message === 'NewsFetchError') {
      return res.status(502).json({ error: 'Failed to fetch news from upstream.' });
    }
    return res.status(500).json({ error: 'Server error while fetching news.' });
  }
};
