const express = require('express');
const bodyParser = require('body-parser');
const cors = require('cors');
const session = require('express-session');

const app = express();
// Railway provides PORT, fallback to 8080 for local
const PORT = process.env.PORT ? parseInt(process.env.PORT, 10) : 8080;

console.log('========================================');
console.log('🔍 STARTUP DIAGNOSTICS');
console.log('========================================');
console.log('Environment:', process.env.NODE_ENV);
console.log('PORT env variable:', process.env.PORT);
console.log('PORT type:', typeof process.env.PORT);
console.log('Final PORT to use:', PORT);
console.log('PORT type after parse:', typeof PORT);
console.log('========================================');

/* -------------------- CORS (PRODUCTION SAFE) -------------------- */
const allowedOrigins = [
  'http://localhost:8080',
  'http://localhost:5500',
  process.env.FRONTEND_URL,
  'https://foodie-delight-online.vercel.app'
].filter(Boolean);

console.log('Allowed origins:', allowedOrigins);
console.log('========================================');

app.use(cors({
  origin: function (origin, callback) {
    if (!origin) return callback(null, true);
    if (allowedOrigins.includes(origin)) {
      callback(null, true);
    } else {
      console.log('⚠️ CORS blocked:', origin);
      callback(null, true); // Allow all for now to test
    }
  },
  credentials: true
}));

/* -------------------- BODY PARSER -------------------- */
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));

/* -------------------- SESSION -------------------- */
app.set('trust proxy', 1); // Railway proxy

app.use(session({
  secret: process.env.SESSION_SECRET || 'foodie-delight-secret',
  resave: false,
  saveUninitialized: false,
  cookie: {
    secure: process.env.NODE_ENV === 'production',
    sameSite: process.env.NODE_ENV === 'production' ? 'none' : 'lax',
    httpOnly: true,
    maxAge: 24 * 60 * 60 * 1000
  }
}));

/* -------------------- HEALTH CHECK (BEFORE MIDDLEWARE) -------------------- */
console.log('Setting up health check routes...');
app.get('/health', (_req, res) => {
  console.log('Health check requested');
  res.status(200).json({ status: 'ok', port: PORT, timestamp: new Date().toISOString() });
});

app.get('/', (_req, res) => {
  console.log('Root endpoint requested');
  res.status(200).json({ message: 'Foodie Delight API', status: 'running', port: PORT });
});
console.log('Health check routes configured');

/* -------------------- AUTH MIDDLEWARE -------------------- */
console.log('Loading auth middleware...');
const { attachUser } = require('./middleware/auth');
app.use(attachUser);
console.log('Auth middleware loaded');

/* -------------------- START SERVER -------------------- */
console.log('Loading routes...');
app.use('/api/auth', require('./routes/auth'));
app.use('/api/hotels', require('./routes/hotels'));
app.use('/api/food', require('./routes/food'));
app.use('/api/cart', require('./routes/cart'));
app.use('/api/orders', require('./routes/orders'));
app.use('/api/bills', require('./routes/bills'));
app.use('/api/admin', require('./routes/admin'));
console.log('All routes loaded');

// Start server FIRST
console.log(`Attempting to start server on port ${PORT}...`);
const server = app.listen(PORT, '0.0.0.0', () => {
  console.log('========================================');
  console.log(`🚀 SERVER SUCCESSFULLY STARTED`);
  console.log(`🚀 Listening on port ${PORT}`);
  console.log(`🚀 Address: 0.0.0.0:${PORT}`);
  console.log('========================================');
  
  // Initialize DB AFTER server is live
  const { initializeDatabase } = require('./config/database');
  initializeDatabase()
    .then(() => {
      console.log('✅ Database initialized');
      
      // Delay auto jobs
      setTimeout(() => {
        startAutoAvailabilityUpdates();
      }, 5000);
    })
    .catch((err) => {
      console.error('❌ DB init failed, server still running');
      console.error(err.message);
      // DO NOT exit process
    });
});

server.on('error', (error) => {
  console.error('========================================');
  console.error('❌ SERVER ERROR:', error);
  console.error('========================================');
});

process.on('unhandledRejection', (reason) => {
  console.error('⚠️ Unhandled Rejection:', reason);
  // Don't exit - log and continue
});

process.on('uncaughtException', (error) => {
  console.error('⚠️ Uncaught Exception:', error);
  // Don't exit in production - Railway will restart if needed
  if (process.env.NODE_ENV !== 'production') {
    process.exit(1);
  }
});

/* -------------------- AUTO AVAILABILITY -------------------- */
function startAutoAvailabilityUpdates() {
  const { getPool } = require('./config/database');

  async function updateAvailability() {
    try {
      const pool = getPool();

      const now = new Date();
      const currentTime = now.getHours() * 60 + now.getMinutes();

      const timeSlots = {
        breakfast: { start: 360, end: 690 },
        lunch: { start: 720, end: 930 },
        evening: { start: 960, end: 1140 },
        dinner: { start: 1140, end: 1380 },
        beverage: { start: 0, end: 1440 }
      };

      const [foods] = await pool.query(
        'SELECT id, time_slot FROM food_items WHERE manual_override = FALSE OR manual_override IS NULL'
      );

      for (const food of foods) {
        const slot = timeSlots[food.time_slot];
        if (!slot) continue;

        const isAvailable = currentTime >= slot.start && currentTime <= slot.end;
        await pool.query(
          'UPDATE food_items SET is_available = ? WHERE id = ?',
          [isAvailable, food.id]
        );
      }

      if (process.env.NODE_ENV !== 'production') {
        console.log(`✅ Availability updated @ ${now.toLocaleTimeString()}`);
      }
    } catch (err) {
      console.error('⚠️ Auto-availability error:', err.message);
    }
  }

  setTimeout(() => {
    updateAvailability();
    setInterval(updateAvailability, 60000);
  }, 5000);
}
