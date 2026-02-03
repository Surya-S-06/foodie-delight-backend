require('dotenv').config();
const mysql = require('mysql2/promise');

async function resetDatabase() {
  try {
    console.log('🔄 Connecting to database...');
    
    const pool = mysql.createPool({
      host: process.env.MYSQLHOST || process.env.DB_HOST,
      port: process.env.MYSQLPORT || process.env.DB_PORT || 3306,
      user: process.env.MYSQLUSER || process.env.DB_USER,
      password: process.env.MYSQL_ROOT_PASSWORD || process.env.MYSQLPASSWORD || process.env.DB_PASSWORD,
      database: process.env.MYSQL_DATABASE || process.env.DB_NAME,
      ssl: { rejectUnauthorized: false }
    });

    const connection = await pool.getConnection();
    console.log('✅ Connected to database');

    console.log('🗑️  Clearing existing data...');
    await connection.query('DELETE FROM hotel_food');
    await connection.query('DELETE FROM order_items');
    await connection.query('DELETE FROM bills');
    await connection.query('DELETE FROM orders');
    await connection.query('DELETE FROM food_items');
    await connection.query('DELETE FROM hotels');
    await connection.query('DELETE FROM users');
    console.log('✅ Data cleared');

    connection.release();
    await pool.end();

    console.log('✅ Database reset complete! Restart the server to reseed.');
    process.exit(0);
  } catch (error) {
    console.error('❌ Error:', error.message);
    process.exit(1);
  }
}

resetDatabase();
