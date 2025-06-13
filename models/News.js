// server/models/News.js
const mongoose = require('mongoose');

const NewsSchema = new mongoose.Schema({
  user: {
    type:     mongoose.Schema.Types.ObjectId,
    ref:      'User',
    required: true
  },
  coin: {
    type:     mongoose.Schema.Types.ObjectId,
    ref:      'Coin',
    required: true
  },
  title:       { type: String, required: true },
  description: { type: String },
  url:         { type: String, required: true },
  imageUrl:    { type: String },
  publishedAt: { type: Date },
  createdAt:   { type: Date, default: Date.now }
});

module.exports = mongoose.model('News', NewsSchema);
