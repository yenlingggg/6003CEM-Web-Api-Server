// server/models/Coin.js
const mongoose = require('mongoose');

const CoinSchema = new mongoose.Schema({
  user: {
    type:     mongoose.Schema.Types.ObjectId,
    ref:      'User',
    required: true
  },
  coinId: {         
    type:     String,
    required: true
  },
  symbol: {         
   type:     String,
  required: true
},
  name: {           
    type:     String,
    required: true
  },
  price: {          
    type:     Number,
    required: true
  },
  marketCap: {      
    type:     Number,
    required: true
  },
  change24h: {      
    type:     Number,
    required: true
  },

  notes: {
   type: String,
   default: ''
 },
  
  createdAt: {
    type:    Date,
    default: Date.now
  }
  
});

// Ensure a user cannot save the same symbol twice
CoinSchema.index({ user: 1, coinId: 1 }, { unique: true });

module.exports = mongoose.model('Coin', CoinSchema);
