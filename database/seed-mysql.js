const { getPool } = require('../config/database');

async function seedDatabase() {
  const pool = getPool();
  const connection = await pool.getConnection();

  try {
    // Check if hotels already exist
    const [hotels] = await connection.query('SELECT COUNT(*) as count FROM hotels');
    
    if (hotels[0].count > 0) {
      console.log('✅ Database already seeded');
      return;
    }

    console.log('📦 Seeding database with Konar Mess and food items...');

    await connection.beginTransaction();

    // Insert single restaurant - Konar Mess
    await connection.query(
      'INSERT INTO hotels (name, location, type, rating) VALUES (?, ?, ?, ?)',
      ['Konar Mess', 'Madurai', 'both', 4.5]
    );

    // Insert food items
    const foodData = [
      // Breakfast items
      ['Plain Dosa', 'South Indian', 40, 'breakfast', 'veg', 'images/food/plain-dosa.jpg', 'Crispy rice crepe served with chutney and sambar'],
      ['Ghee Dosa', 'South Indian', 80, 'breakfast', 'veg', 'images/food/ghee-dosa.jpg', 'Crispy dosa with generous ghee topping'],
      ['Ven Pongal', 'South Indian', 60, 'breakfast', 'veg', 'images/food/ven-pongal.jpg', 'Rice and lentil comfort food with pepper'],
      ['Medu Vada', 'South Indian', 50, 'breakfast', 'veg', 'images/food/medu-vada.jpg', 'Crispy fried lentil donuts'],
      ['Idiyappam', 'South Indian', 45, 'breakfast', 'veg', 'images/food/idiyappam.jpg', 'String hoppers with coconut milk'],
      ['Uthappam', 'South Indian', 70, 'breakfast', 'veg', 'images/food/uthappam.jpg', 'Thick pancake with vegetable toppings'],
      ['Rava Dosa', 'South Indian', 65, 'breakfast', 'veg', 'images/food/rava-dosa.jpg', 'Crispy semolina crepe'],
      ['Kuzhi Paniyaram', 'South Indian', 55, 'breakfast', 'veg', 'images/food/kuzhi-paniyaram.jpg', 'Savory rice dumplings'],
      ['Chapati', 'North Indian', 50, 'breakfast', 'veg', 'images/food/chapati.jpg', 'Soft wheat flatbread with curry'],
      ['Bread Omelette', 'Continental', 60, 'breakfast', 'non-veg', 'images/food/bread-omelette.jpg', 'Fluffy omelette with bread'],
      
      // Lunch items
      ['Sambar Sadham', 'South Indian', 120, 'lunch', 'veg', 'images/food/sambar-sadham.jpg', 'Rice with lentil vegetable stew'],
      ['Rasam Sadham', 'South Indian', 110, 'lunch', 'veg', 'images/food/rasam-sadham.jpg', 'Rice with tangy tamarind soup'],
      ['Avial', 'South Indian', 90, 'lunch', 'veg', 'images/food/avial.jpg', 'Mixed vegetables in coconut gravy'],
      ['Chicken Gravy', 'Non-Veg', 160, 'lunch', 'non-veg', 'images/food/chicken-gravy.jpg', 'Spicy chicken curry'],
      ['Mutton Gravy', 'Non-Veg', 220, 'lunch', 'non-veg', 'images/food/mutton-gravy.jpg', 'Tender mutton in aromatic gravy'],
      ['Chicken Pepper Fry', 'Non-Veg', 180, 'lunch', 'non-veg', 'images/food/chicken-pepper-fry.jpg', 'Spicy pepper chicken'],
      
      // Evening snacks
      ['Bajji', 'Snacks', 45, 'evening', 'veg', 'images/food/bajji.jpg', 'Crispy fried fritters'],
      ['Bonda', 'Snacks', 40, 'evening', 'veg', 'images/food/bonda.jpg', 'Potato dumplings'],
      ['Samosa', 'Snacks', 35, 'evening', 'veg', 'images/food/samosa.jpg', 'Crispy pastry with potato filling'],
      ['Onion Vada', 'Snacks', 45, 'evening', 'veg', 'images/food/onion-vada.jpg', 'Crispy onion fritters'],
      ['Egg Bajji', 'Snacks', 50, 'evening', 'non-veg', 'images/food/egg-bajji.jpg', 'Egg coated fritters'],
      ['Filter Coffee', 'Beverage', 30, 'evening', 'beverage', 'images/food/filter-coffee.jpg', 'Traditional South Indian coffee'],
      
      // Dinner items
      ['Parotta', 'Bread', 70, 'dinner', 'veg', 'images/food/parotta.jpg', 'Flaky layered flatbread'],
      ['Bun Parotta', 'Bread', 80, 'dinner', 'veg', 'images/food/bun-parotta.jpg', 'Soft bun-style parotta'],
      ['Chilli Parotta', 'Fusion', 95, 'dinner', 'veg', 'images/food/chilli-parotta.jpg', 'Spicy stir-fried parotta'],
      ['Kothu Parotta', 'Fusion', 90, 'dinner', 'non-veg', 'images/food/kothu-parotta.jpg', 'Chopped parotta with egg and spices'],
      ['Egg Kothu Parotta', 'Fusion', 100, 'dinner', 'non-veg', 'images/food/egg-kothu-parotta.jpg', 'Egg kothu parotta'],
      ['Chicken Kothu Parotta', 'Fusion', 130, 'dinner', 'non-veg', 'images/food/chicken-kothu-parotta.jpg', 'Chicken kothu parotta'],
      ['Chicken 65', 'Appetizer', 150, 'dinner', 'non-veg', 'images/food/chicken-65.jpg', 'Spicy fried chicken']
    ];

    for (const food of foodData) {
      await connection.query(
        'INSERT INTO food_items (name, category, price, time_slot, type, image_url, description) VALUES (?, ?, ?, ?, ?, ?, ?)',
        food
      );
    }

    // Map all food items to Konar Mess
    const [hotel] = await connection.query('SELECT id FROM hotels LIMIT 1');
    const [allFoods] = await connection.query('SELECT id FROM food_items');

    for (const food of allFoods) {
      await connection.query(
        'INSERT IGNORE INTO hotel_food (hotel_id, food_id) VALUES (?, ?)',
        [hotel[0].id, food.id]
      );
    }

    await connection.commit();
    console.log('✅ Database seeded successfully');
  } catch (error) {
    await connection.rollback();
    console.error('❌ Error seeding database:', error);
    throw error;
  } finally {
    connection.release();
  }
}

module.exports = { seedDatabase };
