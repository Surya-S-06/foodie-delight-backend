# Foodie Delight - Backend API

Express.js REST API for the Foodie Delight food ordering platform.

## Tech Stack

- **Runtime:** Node.js
- **Framework:** Express.js v4.18.2
- **Database:** MySQL 2 v3.16.2
- **Authentication:** bcrypt + express-session
- **Middleware:** CORS, body-parser, dotenv

## Prerequisites

- Node.js (v14 or higher)
- MySQL Server (v8.0 or higher)
- npm or yarn

## Installation

### 1. Install Dependencies
```bash
cd backend
npm install
```

### 2. Configure MySQL Database

Create a MySQL database:
```sql
CREATE DATABASE foodie_delight;
```

### 3. Configure Environment Variables

Create a `.env` file in the backend directory:
```env
DB_HOST=localhost
DB_USER=root
DB_PASSWORD=your_mysql_password
DB_NAME=foodie_delight
```

Or use the setup script:
```bash
node setup-mysql.js
```

### 4. Start the Server

```bash
# Development mode (with auto-restart)
npm run dev

# Production mode
npm start
```

The API server will start on `http://localhost:3000`

## Database Auto-Setup

The application automatically:
- Creates all required tables
- Seeds default admin account
- Loads Madurai hotel data

**Default Admin Credentials:**
- Username: `admin`
- Password: `admin123`

## API Endpoints

### Authentication
- `POST /api/auth/signup` - User registration
- `POST /api/auth/login` - User login
- `POST /api/auth/logout` - User logout
- `GET /api/auth/check` - Check auth status

### Food & Hotels
- `GET /api/hotels` - Get all hotels
- `GET /api/food` - Get all food items
- `GET /api/food/:id` - Get food details
- `GET /api/food/time-slot/:slot` - Get foods by time slot

### Cart
- `GET /api/cart` - Get user cart
- `POST /api/cart/add` - Add item to cart
- `PUT /api/cart/update` - Update cart item
- `DELETE /api/cart/remove/:id` - Remove from cart
- `DELETE /api/cart/clear` - Clear cart

### Orders
- `POST /api/orders` - Create order
- `GET /api/orders` - Get user orders
- `GET /api/orders/:id` - Get order details

### Admin
- `POST /api/admin/login` - Admin login
- `GET /api/admin/users` - Get all users
- `GET /api/admin/orders` - Get all orders
- `PUT /api/admin/orders/:id/status` - Update order status
- `POST /api/admin/food` - Add food item
- `PUT /api/admin/food/:id` - Update food item
- `DELETE /api/admin/food/:id` - Delete food item
- `PUT /api/admin/food/:id/availability` - Toggle availability

## Project Structure

```
backend/
├── config/
│   └── database.js          # MySQL connection & setup
├── middleware/
│   └── auth.js              # Authentication middleware
├── routes/
│   ├── auth.js              # User authentication
│   ├── food.js              # Food items API
│   ├── hotels.js            # Hotels API
│   ├── cart.js              # Shopping cart
│   ├── orders.js            # Order management
│   ├── bills.js             # Billing system
│   └── admin.js             # Admin operations
├── database/
│   └── seed-mysql.js        # MySQL seeding script
├── server.js                # Express server
├── package.json             # Dependencies
└── .env                     # Environment config
```

## Database Schema

### Tables
- **users** - Customer accounts
- **admins** - Admin accounts
- **hotels** - Restaurant information
- **food_items** - Menu items with time slots
- **hotel_food** - Hotel-food mapping
- **orders** - Order records
- **order_items** - Order line items
- **bills** - Billing information
- **restaurant_status** - System status

## Features

- ⏰ **Time-based Availability** - Auto-updates food availability every minute
- 🔐 **Secure Authentication** - bcrypt password hashing + session management
- 🛡️ **CORS Enabled** - Configured for frontend on port 8080
- 📊 **Auto-seeding** - Automatic database setup and data seeding
- 🔄 **Real-time Updates** - Background job for availability updates

### Time Slots
- **Breakfast:** 6:00 AM - 11:30 AM
- **Lunch:** 12:00 PM - 3:30 PM
- **Evening:** 4:00 PM - 7:00 PM
- **Dinner:** 7:00 PM - 11:00 PM
- **Beverages:** Available 24/7

## Deployment

### Deploy to Railway (Recommended)

**Quick Deploy:**

1. Push code to GitHub
2. Create Railway project
3. Add MySQL database
4. Configure environment variables
5. Deploy!

**📖 Complete guide:** [RAILWAY_DEPLOYMENT_GUIDE.md](./RAILWAY_DEPLOYMENT_GUIDE.md)  
**✅ Quick checklist:** [RAILWAY_CHECKLIST.md](./RAILWAY_CHECKLIST.md)

### Deploy to Other Platforms

This backend can also be deployed to:
- **Heroku** - Add ClearDB MySQL addon
- **Render** - Add PostgreSQL or MySQL
- **DigitalOcean App Platform** - Add managed database
- **AWS Elastic Beanstalk** - Configure RDS MySQL

## Development

### Run in Development Mode
```bash
npm run dev
```
Uses nodemon for auto-restart on file changes.

### Database Reset
To reset the database:
```sql
DROP DATABASE foodie_delight;
CREATE DATABASE foodie_delight;
```
Then restart the server to auto-seed.

## Troubleshooting

### MySQL Connection Issues
- Verify MySQL is running
- Check credentials in `.env`
- Ensure database exists
- Use `node test-mysql-connection.js` to test

### Port Already in Use
Change the port in `server.js`:
```javascript
const PORT = process.env.PORT || 3001;
```

### CORS Issues
Update the origin in `server.js`:
```javascript
app.use(cors({
  origin: 'http://localhost:YOUR_FRONTEND_PORT',
  credentials: true
}));
```

### Railway Deployment Issues
See [RAILWAY_DEPLOYMENT_GUIDE.md](./RAILWAY_DEPLOYMENT_GUIDE.md) for detailed troubleshooting.
