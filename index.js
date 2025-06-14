// 1️⃣ Load env first
require('dotenv').config();

const express  = require('express');
const http     = require('http');
const mongoose = require('mongoose');
const cors     = require('cors');
const { Server } = require('socket.io');       

// routes & utils
const authRoutes = require('./routes/authRoutes');
const coinRoutes = require('./routes/coinRoutes');
const newsRoutes = require('./routes/newsRoutes');
const { fetchTopCoins } = require('./utils/apiClients');

const PORT = process.env.PORT || 5000;

const app = express();
app.use(express.json());
const allowedOrigins = [
  'https://6003cem-web-api-client-production.up.railway.app'
];

app.use(cors({
  origin: function(origin, callback) {
    if (!origin || allowedOrigins.includes(origin)) {
      callback(null, true);
    } else {
      callback(new Error('Not allowed by CORS'));
    }
  },
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  credentials: true,
}));


app.use('/api/auth',  authRoutes);
app.use('/api/coins', coinRoutes);
app.use('/api/news',  newsRoutes);
app.use((req, res) => res.status(404).json({ error: 'Route not found' }));

// Create HTTP server _after_ app exists
const server = http.createServer(app);

// Attach .io to same HTTP server
const io = new Server(server, {
  cors: {
    origin: 'https://6003cem-web-api-client-production.up.railway.app',
    methods: ['GET', 'POST'],
    credentials: true
  }
});



io.on('connection', (socket) => {
  console.log('Client connected');
  const iv = setInterval(async () => {
    try {
      const top = await fetchTopCoins(10);
      socket.emit('topCoins', top);
    } catch (e) {
      console.error('Socket fetch error:', e);
    }
  }, 10000);

  socket.on('disconnect', () => {
    clearInterval(iv);
    console.log('Client disconnected');
  });
});

// Connect to MongoDB 
mongoose.connect(process.env.MONGODB_URI, {
  useNewUrlParser:    true,
  useUnifiedTopology: true
})
.then(() => {
  console.log('MongoDB connected');
  server.listen(PORT, () => {
    console.log(`HTTP + WebSocket server listening on ${PORT}`);
  });
})
.catch(err => {
  console.error('MongoDB connection error:', err);
});
