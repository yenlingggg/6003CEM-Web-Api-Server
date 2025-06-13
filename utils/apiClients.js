// server/utils/apiClients.js

const axios = require('axios');
require('dotenv').config();

// fetch details price for single coin
async function fetchCoinData(coinId) {
  const url = `https://api.coinpaprika.com/v1/tickers/${coinId}`;
  try {
    const resp = await axios.get(url);
    const data = resp.data.quotes.USD;
    return {
      name:      resp.data.name,
      symbol:    resp.data.symbol,
      price:     data.price,
      marketCap: data.market_cap,
      change24h: data.percent_change_24h
    };
  } catch (err) {
    console.error('fetchCoinData error:', err.message);
    throw new Error('CoinDataFetchError');
  }
}

// fetch top 10 cryptocurrencies display in the home.jsx
async function fetchTopCoins(limit = 10) {
  const url = `https://api.coinpaprika.com/v1/tickers`;

  try {
    const resp = await axios.get(url, {
      params: { limit }   
    });
    
    return resp.data.map((coin) => {
      const usdQuote = coin.quotes?.USD || {};

      return {
        id:        coin.id,                     
        name:      coin.name,                   
        symbol:    coin.symbol,                 
        rank:      coin.rank,                   
        price:     usdQuote.price,              
        change24h: usdQuote.percent_change_24h, 
        marketCap: usdQuote.market_cap          
      };
    });
  } catch (err) {
    console.error('fetchTopCoins error:', err.message);
    throw new Error('TopCoinsFetchError');
  }
}
/**
 * Fetch top news for a coin

async function fetchCoinNews(coinSymbol) {
  const url = `https://cryptopanic.com/api/developer/v2/posts/`;
  try {
    const resp = await axios.get(url, {
      params: {
        auth_token: process.env.CRYPTOPANIC_API_KEY,
        public:     true,
        currencies: coinSymbol,
        kind:       'news',
        sort:       'published_at',
        region:     'en',
        limit:      1
      }
    });
    const posts = resp.data.results;
    if (posts && posts.length > 0) {
      const p = posts[0];
      return {
        title:        p.title,
        description:  p.description,
        url:          p.url,
        image:        p.image,
        published_at: p.published_at
      };
    }
    return null;
  } catch (err) {
    console.error('fetchCoinNews error:', err.message);
    throw new Error('NewsFetchError');
  }
}
 */
/**
 * NEW: Fetch the top N coins (in rank order) from CoinPaprika.
 * Returns an array of objects like:
 *   [
 *     {
 *       id: "btc-bitcoin",
 *       name: "Bitcoin",
 *       symbol: "BTC",
 *       rank: 1,
 *       price: 104744.93,
 *       change24h: -0.98
 *     },
 *     {...}
 *   ]
 */

// fetch crypto news display in the related news (home.jsx)
async function fetchCryptoNews(keyword, pageSize = 3) {
  try {
    const resp = await axios.get('https://newsapi.org/v2/everything', {
      params: {
        qInTitle:keyword,
        language: 'en',
        sortBy: 'publishedAt',
        pageSize,
        domains:  'coindesk.com, u.today,cryptonews.com', // domains filter
        apiKey: process.env.NEWSAPI_KEY
      }
    });

    if (resp.data.status !== 'ok' || !Array.isArray(resp.data.articles)) {
      return [];
    }
    return resp.data.articles.map((a) => ({
      title:       a.title || 'No title',
      description: a.description || '',
      url:         a.url || '#',
      imageUrl:    a.urlToImage || '',   
      publishedAt: a.publishedAt || null
    }));
  } catch (err) {
    console.error('fetchCryptoNews error:', err.response?.data || err.message);
    throw new Error('NewsFetchError');
  }
}

async function fetchTopCryptoNews(keyword, pageSize = 3) {
  try {
    const resp = await axios.get('https://newsapi.org/v2/everything', {
      params: {
        q:keyword,
        language: 'en',
        sortBy: 'publishedAt',
        pageSize,
        domains:  'coindesk.com, u.today,cryptonews.com', // domains filter
        apiKey: process.env.NEWSAPI_KEY
      }
    });

    if (resp.data.status !== 'ok' || !Array.isArray(resp.data.articles)) {
      return [];
    }
    return resp.data.articles.map((a) => ({
      title:       a.title || 'No title',
      description: a.description || '',
      url:         a.url || '#',
      imageUrl:    a.urlToImage || '',   
      publishedAt: a.publishedAt || null
    }));
  } catch (err) {
    console.error('fetchCryptoNews error:', err.response?.data || err.message);
    throw new Error('NewsFetchError');
  }
}

module.exports = {
  fetchCoinData,
  fetchTopCoins,
  fetchCryptoNews,
  fetchTopCryptoNews,       
};