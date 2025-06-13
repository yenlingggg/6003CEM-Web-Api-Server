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

const PORT = process.env.REACT_APP_API_BASE_URL;

const app = express();
app.use(express.json());
app.use(cors({
  origin: 'https://6003-cem-web-api-client.vercel.app/',
  methods: ['GET', 'POST'],
  credentials: true,
}));

app.use('/api/auth',  authRoutes);
app.use('/api/coins', coinRoutes);
app.use('/api/news',  newsRoutes);
app.use((req, res) => res.status(404).json({ error: 'Route not found' }));

// Create HTTP server _after_ app exists
const server = http.createServer(app);

// Attach .io to same HTTP server
const io = new Server(server, { cors: { origin: '*' } });

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
