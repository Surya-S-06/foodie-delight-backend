const express = require('express');
const bodyParser = require('body-parser');
const cors = require('cors');
const session = require('express-session');
const { initializeDatabase } = require('./config/database');
const { attachUser } = require('./middleware/auth');

const app = express();
const PORT = process.env.PORT || 3000;

/* -------------------- CORS (PRODUCTION SAFE) -------------------- */
const allowedOrigins = [
  'http://localhost:8080',
  process.env.FRONTEND_URL // Vercel URL
].filter(Boolean);

app.use(cors({
  origin: function (origin, callback) {
    if (!origin) return callback(null, true);
    if (allowedOrigins.includes(origin)) {
      callback(null, true);
    } else {
      callback(new Error('Not allowed by CORS'));
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

/* -------------------- HEALTH CHECK -------------------- */
app.get('/health', (_req, res) => {
  res.status(200).json({ status: 'ok' });
});

/* -------------------- AUTH MIDDLEWARE -------------------- */
app.use(attachUser);

/* -------------------- START SERVER -------------------- */
app.use('/api/auth', require('./routes/auth'));
app.use('/api/hotels', require('./routes/hotels'));
app.use('/api/food', require('./routes/food'));
app.use('/api/cart', require('./routes/cart'));
app.use('/api/orders', require('./routes/orders'));
app.use('/api/bills', require('./routes/bills'));
app.use('/api/admin', require('./routes/admin'));

// Start server FIRST
app.listen(PORT, '0.0.0.0', () => {
  console.log(`🚀 Server running on port ${PORT}`);
  
  // Initialize DB AFTER server is live
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

process.on('unhandledRejection', (reason) => {
  console.error('⚠️ Unhandled Rejection:', reason);
});

process.on('uncaughtException', (error) => {
  console.error('⚠️ Uncaught Exception:', error);
  process.exit(1);
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
