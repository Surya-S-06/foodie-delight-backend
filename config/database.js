require('dotenv').config();
const mysql = require('mysql2/promise');

const isProduction = process.env.NODE_ENV === 'production';

// Support DATABASE_URL (Render) or individual variables
let dbConfig;

if (process.env.DATABASE_URL) {
  // Use DATABASE_URL if provided (Render deployment)
  dbConfig = process.env.DATABASE_URL;
  console.log('🔍 Using DATABASE_URL for connection');
} else {
  // Use individual environment variables (local development)
  dbConfig = {
    host: process.env.DB_HOST,
    port: process.env.DB_PORT || 3306,
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_NAME,
    waitForConnections: true,
    connectionLimit: 10,
    queueLimit: 0,
    connectTimeout: 60000,
    ssl: isProduction ? { rejectUnauthorized: false } : undefined
  };
  
  console.log('🔍 MySQL Config:', {
    host: dbConfig.host,
    port: dbConfig.port,
    user: dbConfig.user,
    database: dbConfig.database,
    ssl: !!dbConfig.ssl
  });
}

let pool;

async function initializeDatabase() {
  try {
    pool = mysql.createPool(dbConfig);
    
    const connection = await pool.getConnection();
    console.log('✅ MySQL connected');
    connection.release();

    await createTables();
    await seedDefaultData();

    return pool;
  } catch (error) {
    console.error('❌ Database error:', error.message);
    if (isProduction) {
      process.exit(1);
    }
    throw error;
  }
}

async function createTables() {
  const connection = await pool.getConnection();
  
  try {
    await connection.query(`
      CREATE TABLE IF NOT EXISTS users (
        id INT PRIMARY KEY AUTO_INCREMENT,
        name VARCHAR(255) NOT NULL,
        email VARCHAR(255) UNIQUE NOT NULL,
        phone VARCHAR(20) NOT NULL,
        password_hash VARCHAR(255) NOT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);

    await connection.query(`
      CREATE TABLE IF NOT EXISTS admins (
        id INT PRIMARY KEY AUTO_INCREMENT,
        username VARCHAR(100) UNIQUE NOT NULL,
        password_hash VARCHAR(255) NOT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);

    await connection.query(`
      CREATE TABLE IF NOT EXISTS hotels (
        id INT PRIMARY KEY AUTO_INCREMENT,
        name VARCHAR(255) NOT NULL,
        location VARCHAR(255) NOT NULL,
        type ENUM('veg', 'non-veg', 'both', 'snacks') NOT NULL,
        rating DECIMAL(2,1) DEFAULT 4.5,
        image_url TEXT,
        is_active BOOLEAN DEFAULT TRUE,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);

    await connection.query(`
      CREATE TABLE IF NOT EXISTS food_items (
        id INT PRIMARY KEY AUTO_INCREMENT,
        name VARCHAR(255) NOT NULL,
        category VARCHAR(100) NOT NULL,
        price DECIMAL(10,2) NOT NULL,
        time_slot ENUM('breakfast', 'lunch', 'evening', 'dinner', 'beverage') NOT NULL,
        type ENUM('veg', 'non-veg', 'beverage') NOT NULL,
        image_url TEXT,
        description TEXT,
        recipe_details TEXT,
        api_meal_id VARCHAR(100),
        is_available BOOLEAN DEFAULT TRUE,
        manual_override BOOLEAN DEFAULT FALSE,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);

    await connection.query(`
      CREATE TABLE IF NOT EXISTS hotel_food (
        id INT PRIMARY KEY AUTO_INCREMENT,
        hotel_id INT NOT NULL,
        food_id INT NOT NULL,
        FOREIGN KEY (hotel_id) REFERENCES hotels(id) ON DELETE CASCADE,
        FOREIGN KEY (food_id) REFERENCES food_items(id) ON DELETE CASCADE,
        UNIQUE KEY unique_hotel_food (hotel_id, food_id)
      )
    `);

    await connection.query(`
      CREATE TABLE IF NOT EXISTS orders (
        id INT PRIMARY KEY AUTO_INCREMENT,
        user_id INT NOT NULL,
        total_amount DECIMAL(10,2) NOT NULL,
        status ENUM('Order Confirmed', 'Preparing', 'Out for Delivery', 'Delivered', 'Cancelled') DEFAULT 'Order Confirmed',
        payment_method VARCHAR(50) DEFAULT 'Cash on Delivery',
        payment_status ENUM('Pending', 'Paid', 'Failed') DEFAULT 'Pending',
        delivery_address TEXT,
        notes TEXT,
        coupon_code VARCHAR(50),
        discount_amount DECIMAL(10,2) DEFAULT 0,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
      )
    `);

    await connection.query(`
      CREATE TABLE IF NOT EXISTS order_items (
        id INT PRIMARY KEY AUTO_INCREMENT,
        order_id INT NOT NULL,
        item_name VARCHAR(255) NOT NULL,
        price DECIMAL(10,2) NOT NULL,
        quantity INT NOT NULL,
        hotel_id INT,
        food_id INT,
        FOREIGN KEY (order_id) REFERENCES orders(id) ON DELETE CASCADE,
        FOREIGN KEY (hotel_id) REFERENCES hotels(id) ON DELETE SET NULL,
        FOREIGN KEY (food_id) REFERENCES food_items(id) ON DELETE SET NULL
      )
    `);

    await connection.query(`
      CREATE TABLE IF NOT EXISTS bills (
        id INT PRIMARY KEY AUTO_INCREMENT,
        order_id INT NOT NULL UNIQUE,
        bill_number VARCHAR(50) UNIQUE NOT NULL,
        total_amount DECIMAL(10,2) NOT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (order_id) REFERENCES orders(id) ON DELETE CASCADE
      )
    `);

    await connection.query(`
      CREATE TABLE IF NOT EXISTS restaurant_status (
        id INT PRIMARY KEY AUTO_INCREMENT,
        is_open BOOLEAN DEFAULT TRUE,
        current_serving_time ENUM('breakfast', 'lunch', 'evening', 'dinner') DEFAULT 'breakfast',
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
      )
    `);

    console.log('✅ Tables created');
  } catch (error) {
    console.error('❌ Table creation error:', error.message);
    throw error;
  } finally {
    connection.release();
  }
}

async function seedDefaultData() {
  const connection = await pool.getConnection();
  
  try {
    const [admins] = await connection.query('SELECT COUNT(*) as count FROM admins');
    
    if (admins[0].count === 0) {
      const bcrypt = require('bcrypt');
      const hashedPassword = await bcrypt.hash('admin123', 10);
      
      await connection.query(
        'INSERT INTO admins (username, password_hash) VALUES (?, ?)',
        ['admin', hashedPassword]
      );
      
      console.log('✅ Admin created');
    }

    const [hotels] = await connection.query('SELECT COUNT(*) as count FROM hotels');
    
    if (hotels[0].count === 0 && !isProduction) {
      const { seedDatabase } = require('../database/seed-mysql');
      await seedDatabase();
    }
  } catch (error) {
    console.error('⚠️ Seeding error:', error.message);
  } finally {
    connection.release();
  }
}

function getPool() {
  if (!pool) {
    throw new Error('Database pool not initialized');
  }
  return pool;
}

module.exports = {
  initializeDatabase,
  getPool
};
