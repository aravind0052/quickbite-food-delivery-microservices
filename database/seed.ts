import fs from 'fs';
import path from 'path';
import mysql from 'mysql2/promise';
import bcrypt from 'bcrypt';
import dotenv from 'dotenv';

// Load .env from root directory
dotenv.config({ path: path.resolve(process.cwd(), '.env') });

const dbConfig = {
  host: process.env.DB_HOST || 'localhost',
  port: parseInt(process.env.DB_PORT || '3306', 10),
  user: process.env.DB_USER || 'root',
  password: process.env.DB_PASSWORD || '',
  database: 'quickbite_db',
  multipleStatements: true,
};

async function seedDatabase() {
  console.log('[QuickBite Seeder] Starting database seeding process...');

  const connection = await mysql.createConnection(dbConfig);

  try {
    // Generate bcrypt hash for standard development demo password
    const DEMO_PASSWORD = 'QuickBite@123';
    const saltRounds = 10;
    const passwordHash = await bcrypt.hash(DEMO_PASSWORD, saltRounds);
    console.log('[QuickBite Seeder] Bcrypt password hash generated for demo accounts.');

    await connection.beginTransaction();

    // ------------------------------------------------------------
    // 1. SEED USERS (22 Users: 1 Admin, 4 Owners, 17 Customers)
    // ------------------------------------------------------------
    const usersData = [
      // Admin
      { name: 'Aarav Sharma', email: 'admin@quickbite.demo', phone: '+91 98765 43210', role: 'ADMIN' },
      // Restaurant Owners
      { name: 'Vikram Reddy', email: 'owner01@quickbite.demo', phone: '+91 98765 11101', role: 'RESTAURANT_OWNER' },
      { name: 'Priya Nair', email: 'owner02@quickbite.demo', phone: '+91 98765 11102', role: 'RESTAURANT_OWNER' },
      { name: 'Rohan Mukherjee', email: 'owner03@quickbite.demo', phone: '+91 98765 11103', role: 'RESTAURANT_OWNER' },
      { name: 'Ananya Iyer', email: 'owner04@quickbite.demo', phone: '+91 98765 11104', role: 'RESTAURANT_OWNER' },
      // Customers
      { name: 'Kavya Patel', email: 'customer01@quickbite.demo', phone: '+91 98765 22001', role: 'CUSTOMER' },
      { name: 'Siddharth Rao', email: 'customer02@quickbite.demo', phone: '+91 98765 22002', role: 'CUSTOMER' },
      { name: 'Sneha Kulkarni', email: 'customer03@quickbite.demo', phone: '+91 98765 22003', role: 'CUSTOMER' },
      { name: 'Aditya Verma', email: 'customer04@quickbite.demo', phone: '+91 98765 22004', role: 'CUSTOMER' },
      { name: 'Meera Menon', email: 'customer05@quickbite.demo', phone: '+91 98765 22005', role: 'CUSTOMER' },
      { name: 'Rahul Kapoor', email: 'customer06@quickbite.demo', phone: '+91 98765 22006', role: 'CUSTOMER' },
      { name: 'Divya Sundaram', email: 'customer07@quickbite.demo', phone: '+91 98765 22007', role: 'CUSTOMER' },
      { name: 'Arjun Nambiar', email: 'customer08@quickbite.demo', phone: '+91 98765 22008', role: 'CUSTOMER' },
      { name: 'Pooja Hegde', email: 'customer09@quickbite.demo', phone: '+91 98765 22009', role: 'CUSTOMER' },
      { name: 'Manish Joshi', email: 'customer10@quickbite.demo', phone: '+91 98765 22010', role: 'CUSTOMER' },
      { name: 'Ritu Singhania', email: 'customer11@quickbite.demo', phone: '+91 98765 22011', role: 'CUSTOMER' },
      { name: 'Gautam Sen', email: 'customer12@quickbite.demo', phone: '+91 98765 22012', role: 'CUSTOMER' },
      { name: 'Tanvi Deshmukh', email: 'customer13@quickbite.demo', phone: '+91 98765 22013', role: 'CUSTOMER' },
      { name: 'Nikhil Chawla', email: 'customer14@quickbite.demo', phone: '+91 98765 22014', role: 'CUSTOMER' },
      { name: 'Isha Bhatt', email: 'customer15@quickbite.demo', phone: '+91 98765 22015', role: 'CUSTOMER' },
      { name: 'Varun Pillai', email: 'customer16@quickbite.demo', phone: '+91 98765 22016', role: 'CUSTOMER' },
      { name: 'Swati Agarwal', email: 'customer17@quickbite.demo', phone: '+91 98765 22017', role: 'CUSTOMER' },
    ];

    const userMap: { [email: string]: number } = {};

    for (const u of usersData) {
      await connection.query(
        `INSERT INTO users (name, email, password_hash, phone, role) 
         VALUES (?, ?, ?, ?, ?)
         ON DUPLICATE KEY UPDATE name=VALUES(name), phone=VALUES(phone), role=VALUES(role), password_hash=VALUES(password_hash);`,
        [u.name, u.email, passwordHash, u.phone, u.role]
      );
      const [[userRow]]: any = await connection.query('SELECT id FROM users WHERE email = ?', [u.email]);
      userMap[u.email] = userRow.id;
    }
    console.log(`[QuickBite Seeder] Inserted/verified ${usersData.length} users.`);

    // ------------------------------------------------------------
    // 2. SEED ADDRESSES (34 Addresses for Customers)
    // ------------------------------------------------------------
    const addressesData = [
      { email: 'customer01@quickbite.demo', line: 'Flat 402, Sunshine Heights, Cyber Towers Road', area: 'Madhapur', city: 'Hyderabad', state: 'Telangana', pincode: '500081' },
      { email: 'customer01@quickbite.demo', line: 'Plot 18, Block B, Tech Mahindra Enclave', area: 'Hitec City', city: 'Hyderabad', state: 'Telangana', pincode: '500081' },
      { email: 'customer02@quickbite.demo', line: 'Villa 12, Green Meadows, Botanical Garden Road', area: 'Kondapur', city: 'Hyderabad', state: 'Telangana', pincode: '500084' },
      { email: 'customer02@quickbite.demo', line: 'Tower 3, Apt 8B, DLF Cybercity', area: 'Gachibowli', city: 'Hyderabad', state: 'Telangana', pincode: '500032' },
      { email: 'customer03@quickbite.demo', line: 'Flat 105, Rainbow Vistas, Moosapet Road', area: 'Kukatpally', city: 'Hyderabad', state: 'Telangana', pincode: '500072' },
      { email: 'customer03@quickbite.demo', line: 'House 55, Road No 10, Banjara Hills', area: 'Banjara Hills', city: 'Hyderabad', state: 'Telangana', pincode: '500034' },
      { email: 'customer04@quickbite.demo', line: 'Apt 204, Palm Grove, 100ft Road', area: 'Indiranagar', city: 'Bengaluru', state: 'Karnataka', pincode: '560038' },
      { email: 'customer04@quickbite.demo', line: 'Suite 15, Embassy GolfLinks Tech Park', area: 'Domlur', city: 'Bengaluru', state: 'Karnataka', pincode: '560071' },
      { email: 'customer05@quickbite.demo', line: '4th Cross, 5th Block, Near Jyoti Nivas College', area: 'Koramangala', city: 'Bengaluru', state: 'Karnataka', pincode: '560095' },
      { email: 'customer05@quickbite.demo', line: 'Villa 7, Prestige Palms, Whitefield Main Road', area: 'Whitefield', city: 'Bengaluru', state: 'Karnataka', pincode: '560066' },
      { email: 'customer06@quickbite.demo', line: 'No 45, Usman Road, Near Panagal Park', area: 'T. Nagar', city: 'Chennai', state: 'Tamil Nadu', pincode: '600017' },
      { email: 'customer06@quickbite.demo', line: 'Flat 3A, Sea Breeze Apts, 2nd Avenue', area: 'Besant Nagar', city: 'Chennai', state: 'Tamil Nadu', pincode: '600090' },
      { email: 'customer07@quickbite.demo', line: 'Block 2, Shanthi Colony', area: 'Anna Nagar', city: 'Chennai', state: 'Tamil Nadu', pincode: '600040' },
      { email: 'customer07@quickbite.demo', line: 'Plot 88, Velachery Main Road', area: 'Velachery', city: 'Chennai', state: 'Tamil Nadu', pincode: '600042' },
      { email: 'customer08@quickbite.demo', line: 'Flat 701, Sea View Residency, Bandstand', area: 'Bandra West', city: 'Mumbai', state: 'Maharashtra', pincode: '400050' },
      { email: 'customer08@quickbite.demo', line: 'Office 402, Solitaire Corporate Park', area: 'Andheri East', city: 'Mumbai', state: 'Maharashtra', pincode: '400093' },
      { email: 'customer09@quickbite.demo', line: 'B-12, Lokhandwala Complex', area: 'Andheri West', city: 'Mumbai', state: 'Maharashtra', pincode: '400053' },
      { email: 'customer09@quickbite.demo', line: 'Apt 502, Shivaji Park Seaface', area: 'Dadar West', city: 'Mumbai', state: 'Maharashtra', pincode: '400028' },
      { email: 'customer10@quickbite.demo', line: 'House 34, Block C, Inner Circle', area: 'Connaught Place', city: 'Delhi', state: 'Delhi', pincode: '110001' },
      { email: 'customer10@quickbite.demo', line: 'Flat 12B, Sector 12 Pocket 4', area: 'Dwarka', city: 'Delhi', state: 'Delhi', pincode: '110078' },
      { email: 'customer11@quickbite.demo', line: 'House 88, Defence Colony Flyover Lane', area: 'Defence Colony', city: 'Delhi', state: 'Delhi', pincode: '110024' },
      { email: 'customer11@quickbite.demo', line: 'C-45, Hauz Khas Enclave', area: 'Hauz Khas', city: 'Delhi', state: 'Delhi', pincode: '110016' },
      { email: 'customer12@quickbite.demo', line: 'Apt 301, Lake View, Miyapur Main Road', area: 'Miyapur', city: 'Hyderabad', state: 'Telangana', pincode: '500049' },
      { email: 'customer12@quickbite.demo', line: 'Villa 22, Financial District Phase 1', area: 'Nanakramguda', city: 'Hyderabad', state: 'Telangana', pincode: '500032' },
      { email: 'customer13@quickbite.demo', line: 'Flat 202, 17th Main Road, Sector 4', area: 'HSR Layout', city: 'Bengaluru', state: 'Karnataka', pincode: '560102' },
      { email: 'customer13@quickbite.demo', line: 'No 14, Bannerghatta Main Road', area: 'JP Nagar', city: 'Bengaluru', state: 'Karnataka', pincode: '560078' },
      { email: 'customer14@quickbite.demo', line: 'Flat 11, Green Acres, Juhu Tara Road', area: 'Juhu', city: 'Mumbai', state: 'Maharashtra', pincode: '400049' },
      { email: 'customer14@quickbite.demo', line: 'Tower 4, Apt 1802, Hiranandani Gardens', area: 'Powai', city: 'Mumbai', state: 'Maharashtra', pincode: '400076' },
      { email: 'customer15@quickbite.demo', line: 'House 19, Sector 23', area: 'Gurugram', city: 'Delhi NCR', state: 'Haryana', pincode: '122017' },
      { email: 'customer15@quickbite.demo', line: 'Flat 804, Golf Course Extension', area: 'Gurugram', city: 'Delhi NCR', state: 'Haryana', pincode: '122002' },
      { email: 'customer16@quickbite.demo', line: 'No 77, Chamiers Road', area: 'Alwarpet', city: 'Chennai', state: 'Tamil Nadu', pincode: '600018' },
      { email: 'customer16@quickbite.demo', line: 'Tower B, Olympia Opaline', area: 'Navalur', city: 'Chennai', state: 'Tamil Nadu', pincode: '600130' },
      { email: 'customer17@quickbite.demo', line: 'Flat 503, Silicon Valley Apts', area: 'Madhapur', city: 'Hyderabad', state: 'Telangana', pincode: '500081' },
      { email: 'customer17@quickbite.demo', line: 'Plot 31, Jubilee Enclave', area: 'Hitec City', city: 'Hyderabad', state: 'Telangana', pincode: '500081' },
    ];

    const customerAddressMap: { [userId: number]: number[] } = {};

    for (const a of addressesData) {
      const userId = userMap[a.email];
      if (!userId) continue;

      // Check if address already exists for user
      const [[existing]]: any = await connection.query(
        `SELECT id FROM addresses WHERE user_id = ? AND address_line = ? LIMIT 1;`,
        [userId, a.line]
      );

      let addressId: number;
      if (existing) {
        addressId = existing.id;
      } else {
        const [res]: any = await connection.query(
          `INSERT INTO addresses (user_id, address_line, area, city, state, pincode) VALUES (?, ?, ?, ?, ?, ?);`,
          [userId, a.line, a.area, a.city, a.state, a.pincode]
        );
        addressId = res.insertId;
      }

      if (!customerAddressMap[userId]) {
        customerAddressMap[userId] = [];
      }
      customerAddressMap[userId].push(addressId);
    }
    console.log(`[QuickBite Seeder] Inserted/verified ${addressesData.length} addresses.`);

    // ------------------------------------------------------------
    // 3. SEED RESTAURANTS (16 Fictional Restaurants)
    // ------------------------------------------------------------
    const restaurantsData = [
      {
        name: 'Deccan Spice House',
        description: 'Authentic Hyderabadi Dum Biryani, royal aromatic kebabs, and rich Mughlai gravies slow-cooked to perfection.',
        cuisine: 'Biryani, Mughlai',
        address: 'Plot 42, Hitec City Main Road, Opposite Cyber Towers',
        area: 'Madhapur',
        city: 'Hyderabad',
        rating: 4.8,
        delivery_time: '25-35 min',
        price_for_two: 650.00,
        image_url: 'https://images.unsplash.com/photo-1563379091339-03b21ab4a4f8?w=800&auto=format&fit=crop&q=80',
        is_open: 1
      },
      {
        name: 'Charminar Bites',
        description: 'Iconic Old City street delicacies including spicy pathar ka gosht, fragrant sheermal, and charcoal grilled kebabs.',
        cuisine: 'Mughlai, Kebabs, Street Food',
        address: 'Near Mecca Masjid, Charminar Road',
        area: 'Old City',
        city: 'Hyderabad',
        rating: 4.6,
        delivery_time: '30-40 min',
        price_for_two: 500.00,
        image_url: 'https://images.unsplash.com/photo-1603894584373-5ac82b2ae398?w=800&auto=format&fit=crop&q=80',
        is_open: 1
      },
      {
        name: 'Pearl City Kitchen',
        description: 'Classic Telugu delicacies, flavorful bagara rice, spicy gongura chicken, and crispy starters.',
        cuisine: 'South Indian, Biryani',
        address: 'Survey 64, Gachibowli Stadium Road',
        area: 'Gachibowli',
        city: 'Hyderabad',
        rating: 4.5,
        delivery_time: '20-30 min',
        price_for_two: 550.00,
        image_url: 'https://images.unsplash.com/photo-1589302168068-964664d93dc0?w=800&auto=format&fit=crop&q=80',
        is_open: 1
      },
      {
        name: 'Biryani Junction',
        description: 'The destination for hearty biryani pots, spicy Andhra curries, and tantalizing starters for celebrations.',
        cuisine: 'Biryani, Andhra',
        address: 'Main Road, Near Botanical Gardens',
        area: 'Kondapur',
        city: 'Hyderabad',
        rating: 4.7,
        delivery_time: '25-35 min',
        price_for_two: 600.00,
        image_url: 'https://images.unsplash.com/photo-1633945274405-b6c8069047b0?w=800&auto=format&fit=crop&q=80',
        is_open: 1
      },
      {
        name: 'Garden City Dosa',
        description: 'Pure vegetarian South Indian tiffins featuring crispy Ghee Podi Roast Dosa, soft Idlis, and heritage Filter Coffee.',
        cuisine: 'South Indian, Pure Veg',
        address: '100ft Road, Near CMH Road Metro',
        area: 'Indiranagar',
        city: 'Bengaluru',
        rating: 4.9,
        delivery_time: '20-30 min',
        price_for_two: 350.00,
        image_url: 'https://images.unsplash.com/photo-1668236543090-82eba5ee5976?w=800&auto=format&fit=crop&q=80',
        is_open: 1
      },
      {
        name: 'Chennai Tiffin House',
        description: 'Traditional Tamil Nadu tiffin classics with fragrant coconut chutneys, spicy sambar, and authentic filter kaapi.',
        cuisine: 'South Indian, Breakfast',
        address: 'Usman Road, T. Nagar Commercial Hub',
        area: 'T. Nagar',
        city: 'Chennai',
        rating: 4.7,
        delivery_time: '25-35 min',
        price_for_two: 300.00,
        image_url: 'https://images.unsplash.com/photo-1589301760014-d929f3979dbc?w=800&auto=format&fit=crop&q=80',
        is_open: 1
      },
      {
        name: 'Mumbai Street Kitchen',
        description: 'Legendary Mumbai street food: buttery Pav Bhaji, crunchy Bhelpuri, spicy Vada Pav, and refreshing Kulfi.',
        cuisine: 'Street Food, Chaat, Fast Food',
        address: 'Hill Road, Near Bandra Station',
        area: 'Bandra West',
        city: 'Mumbai',
        rating: 4.6,
        delivery_time: '20-30 min',
        price_for_two: 400.00,
        image_url: 'https://images.unsplash.com/photo-1606491956689-2ea866880c84?w=800&auto=format&fit=crop&q=80',
        is_open: 1
      },
      {
        name: 'Capital Tandoor',
        description: 'Sumptuous North Indian tandoori platters, creamy Dal Makhani, Paneer Tikka, and rich clay-oven roasted naans.',
        cuisine: 'North Indian, Mughlai, Tandoor',
        address: 'Radial Road 4, Connaught Place Block B',
        area: 'Connaught Place',
        city: 'Delhi',
        rating: 4.8,
        delivery_time: '35-45 min',
        price_for_two: 800.00,
        image_url: 'https://images.unsplash.com/photo-1517244683847-7456b63c5969?w=800&auto=format&fit=crop&q=80',
        is_open: 1
      },
      {
        name: 'Coastal Curry House',
        description: 'Fresh coastal Mangalorean fish curries, spicy Kundapur chicken, Neer Dosa, and sol kadhi beverages.',
        cuisine: 'Seafood, Coastal, Mangalorean',
        address: '80 Feet Road, 4th Block',
        area: 'Koramangala',
        city: 'Bengaluru',
        rating: 4.6,
        delivery_time: '30-40 min',
        price_for_two: 750.00,
        image_url: 'https://images.unsplash.com/photo-1626777552726-4a6b54c97e46?w=800&auto=format&fit=crop&q=80',
        is_open: 1
      },
      {
        name: 'Royal Thali Kitchen',
        description: 'Opulent pure vegetarian Rajasthani and Gujarati thali platters featuring Dal Baati Churma, Ker Sangri, and sweets.',
        cuisine: 'North Indian, Thali, Pure Veg',
        address: 'Link Road, Near Infinity Mall',
        area: 'Andheri West',
        city: 'Mumbai',
        rating: 4.7,
        delivery_time: '35-45 min',
        price_for_two: 700.00,
        image_url: 'https://images.unsplash.com/photo-1610057099443-fde8c4d50f91?w=800&auto=format&fit=crop&q=80',
        is_open: 1
      },
      {
        name: 'Andhra Spice Corner',
        description: 'Fiery Andhra chili chicken, Nellore fish curry, Gongura mutton, and traditional spice-packed curries.',
        cuisine: 'Andhra, South Indian',
        address: 'KPHB Colony Phase 3, Temple Road',
        area: 'Kukatpally',
        city: 'Hyderabad',
        rating: 4.5,
        delivery_time: '25-35 min',
        price_for_two: 500.00,
        image_url: 'https://images.unsplash.com/photo-1546833999-b9f581a1996d?w=800&auto=format&fit=crop&q=80',
        is_open: 1
      },
      {
        name: 'Punjabi Zaika',
        description: 'Authentic highway dhaba flavours: Rich Butter Chicken, Amritsari Kulcha, creamy Lassi, and Pindi Chole.',
        cuisine: 'North Indian, Punjabi',
        address: 'Sector 10 Main Market, Dwarka',
        area: 'Dwarka',
        city: 'Delhi',
        rating: 4.6,
        delivery_time: '30-40 min',
        price_for_two: 600.00,
        image_url: 'https://images.unsplash.com/photo-1588166524941-3bf61a9c41db?w=800&auto=format&fit=crop&q=80',
        is_open: 1
      },
      {
        name: 'Hyderabad Grill House',
        description: 'Juicy Arabian shawarmas, Turkish kebabs, grilled BBQ platters, and garlic toum sauces.',
        cuisine: 'Arabian, Grills, Barbecue',
        address: 'Road No 12, Banjara Hills Main Road',
        area: 'Banjara Hills',
        city: 'Hyderabad',
        rating: 4.5,
        delivery_time: '25-35 min',
        price_for_two: 550.00,
        image_url: 'https://images.unsplash.com/photo-1555939594-58d7cb561ad1?w=800&auto=format&fit=crop&q=80',
        is_open: 1
      },
      {
        name: 'Wok and Roll Kitchen',
        description: 'Pan-Asian sizzling stir fries, Hakka noodles, crispy Dim Sums, and spicy Manchurian bowls.',
        cuisine: 'Chinese, Pan-Asian',
        address: 'ITPL Main Road, Prestige Shantiniketan',
        area: 'Whitefield',
        city: 'Bengaluru',
        rating: 4.4,
        delivery_time: '30-40 min',
        price_for_two: 650.00,
        image_url: 'https://images.unsplash.com/photo-1541696432-82c6da8ce7bf?w=800&auto=format&fit=crop&q=80',
        is_open: 1
      },
      {
        name: 'Sweet Cravings Bakery',
        description: 'Artisan handcrafted cakes, Belgian chocolate pastries, freshly baked brownies, and signature cookies.',
        cuisine: 'Bakery, Desserts, Beverages',
        address: '27th Main, Sector 1, HSR Layout',
        area: 'HSR Layout',
        city: 'Bengaluru',
        rating: 4.9,
        delivery_time: '20-30 min',
        price_for_two: 450.00,
        image_url: 'https://images.unsplash.com/photo-1578985545062-69928b1d9587?w=800&auto=format&fit=crop&q=80',
        is_open: 1
      },
      {
        name: 'Chai & Samosa Junction',
        description: 'Steaming ginger adrak chai, crispy samosas, kachori with tangy chutneys, and evening street refreshments.',
        cuisine: 'Snacks, Beverages, Street Food',
        address: 'Near Plaza Cinema, Ranade Road',
        area: 'Dadar West',
        city: 'Mumbai',
        rating: 4.5,
        delivery_time: '15-25 min',
        price_for_two: 250.00,
        image_url: 'https://images.unsplash.com/photo-1561047029-3000c68339ca?w=800&auto=format&fit=crop&q=80',
        is_open: 0 // Closed demo state
      }
    ];

    const restaurantMap: { [name: string]: number } = {};

    for (const r of restaurantsData) {
      await connection.query(
        `INSERT INTO restaurants (name, description, cuisine, address, area, city, rating, delivery_time, price_for_two, image_url, is_open)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
         ON DUPLICATE KEY UPDATE description=VALUES(description), rating=VALUES(rating), price_for_two=VALUES(price_for_two), image_url=VALUES(image_url), is_open=VALUES(is_open);`,
        [r.name, r.description, r.cuisine, r.address, r.area, r.city, r.rating, r.delivery_time, r.price_for_two, r.image_url, r.is_open]
      );
      const [[restRow]]: any = await connection.query('SELECT id FROM restaurants WHERE name = ? LIMIT 1', [r.name]);
      restaurantMap[r.name] = restRow.id;
    }
    console.log(`[QuickBite Seeder] Inserted/verified ${restaurantsData.length} restaurants.`);

    // ------------------------------------------------------------
    // 4. SEED MENU ITEMS (11-13 items per restaurant = ~190 items)
    // ------------------------------------------------------------
    const menuTemplate = [
      // 1. Deccan Spice House
      {
        restaurant: 'Deccan Spice House',
        items: [
          { name: 'Special Hyderabadi Chicken Dum Biryani', desc: 'Long grain basmati rice, tender chicken pieces marinated in yogurt and spices, slow-cooked in dum sealed pot.', cat: 'Biryani', price: 349.00, veg: 0, img: 'https://images.unsplash.com/photo-1563379091339-03b21ab4a4f8?w=800&auto=format&fit=crop&q=80' },
          { name: 'Royal Hyderabadi Mutton Biryani', desc: 'Succulent cuts of fresh tender mutton layered with fragrant saffron rice and caramelized onions.', cat: 'Biryani', price: 449.00, veg: 0, img: 'https://images.unsplash.com/photo-1633945274405-b6c8069047b0?w=800&auto=format&fit=crop&q=80' },
          { name: 'Paneer Makhani Biryani', desc: 'Charcoal grilled cottage cheese cubes cooked with aromatic basmati rice and rich whole spices.', cat: 'Biryani', price: 299.00, veg: 1, img: 'https://images.unsplash.com/photo-1589302168068-964664d93dc0?w=800&auto=format&fit=crop&q=80' },
          { name: 'Mirchi Ka Salan', desc: 'Traditional spicy green chilli and peanut-sesame curry served as the quintessential biryani accompaniment.', cat: 'Gravy', price: 129.00, veg: 1, img: 'https://images.unsplash.com/photo-1546833999-b9f581a1996d?w=800&auto=format&fit=crop&q=80' },
          { name: 'Chicken 65', desc: 'Crispy fried boneless chicken bites tossed with fresh curry leaves, mustard seeds, and Andhra red chillies.', cat: 'Starters', price: 269.00, veg: 0, img: 'https://images.unsplash.com/photo-1626777552726-4a6b54c97e46?w=800&auto=format&fit=crop&q=80' },
          { name: 'Apollo Fish', desc: 'Deep-fried boneless fish fillets tossed with green chillies, garlic, and special Deccan spice blend.', cat: 'Starters', price: 329.00, veg: 0, img: 'https://images.unsplash.com/photo-1534422298391-e4f8c172dddb?w=800&auto=format&fit=crop&q=80' },
          { name: 'Double Ka Meetha', desc: 'Traditional Hyderabadi fried bread pudding infused with saffron milk, cardamom, and toasted dry fruits.', cat: 'Desserts', price: 149.00, veg: 1, img: 'https://images.unsplash.com/photo-1551024709-8f23befc6f87?w=800&auto=format&fit=crop&q=80' },
          { name: 'Khubani Ka Meetha with Cream', desc: 'Sweet stewed dried apricot compote served with fresh cream, royal Hyderabadi dessert.', cat: 'Desserts', price: 179.00, veg: 1, img: 'https://images.unsplash.com/photo-1578985545062-69928b1d9587?w=800&auto=format&fit=crop&q=80' },
          { name: 'Irani Chai Flask', desc: 'Rich, thick, slow-brewed milk tea made with condensed milk and aromatic tea leaves.', cat: 'Beverages', price: 99.00, veg: 1, img: 'https://images.unsplash.com/photo-1561047029-3000c68339ca?w=800&auto=format&fit=crop&q=80' },
          { name: 'Sweet Fresh Lime Soda', desc: 'Fresh lime juice with sparkling soda water and sugar syrup.', cat: 'Beverages', price: 79.00, veg: 1, img: 'https://images.unsplash.com/photo-1513558161293-cdaf765ed2fd?w=800&auto=format&fit=crop&q=80' },
          { name: 'Garlic Butter Naan', desc: 'Soft leavened tandoor bread brushed with melted butter and fresh minced garlic.', cat: 'Breads', price: 65.00, veg: 1, img: 'https://images.unsplash.com/photo-1517244683847-7456b63c5969?w=800&auto=format&fit=crop&q=80' },
        ]
      },
      // 2. Charminar Bites
      {
        restaurant: 'Charminar Bites',
        items: [
          { name: 'Tandoori Murgh Full', desc: 'Whole chicken marinated overnight in Kashmiri chili paste and hung yogurt, roasted in clay oven.', cat: 'Kebabs', price: 429.00, veg: 0, img: 'https://images.unsplash.com/photo-1603894584373-5ac82b2ae398?w=800&auto=format&fit=crop&q=80' },
          { name: 'Mutton Seekh Kebab', desc: 'Minced spiced mutton skewers chargrilled over hot coals with mint chutney and onion rings.', cat: 'Kebabs', price: 349.00, veg: 0, img: 'https://images.unsplash.com/photo-1555939594-58d7cb561ad1?w=800&auto=format&fit=crop&q=80' },
          { name: 'Chicken Malai Tikka', desc: 'Melt-in-mouth chicken chunks marinated in cream, cheese, and crushed green cardamom.', cat: 'Kebabs', price: 319.00, veg: 0, img: 'https://images.unsplash.com/photo-1599488615731-7e5c2823ff28?w=800&auto=format&fit=crop&q=80' },
          { name: 'Paneer Tikka Angara', desc: 'Cottage cheese cubes with bell peppers and onions chargrilled to a smoky spicy perfection.', cat: 'Kebabs', price: 279.00, veg: 1, img: 'https://images.unsplash.com/photo-1567188040759-fb8a883dc6d8?w=800&auto=format&fit=crop&q=80' },
          { name: 'Rumali Roti (2 pcs)', desc: 'Ultra-thin, soft handkerchief bread cooked over an inverted tawa.', cat: 'Breads', price: 60.00, veg: 1, img: 'https://images.unsplash.com/photo-1517244683847-7456b63c5969?w=800&auto=format&fit=crop&q=80' },
          { name: 'Mughlai Chicken Korma', desc: 'Rich chicken curry cooked in an aromatic gravy of fried onions, cashews, and yogurt.', cat: 'Main Course', price: 339.00, veg: 0, img: 'https://images.unsplash.com/photo-1588166524941-3bf61a9c41db?w=800&auto=format&fit=crop&q=80' },
          { name: 'Dal Bukhara', desc: 'Black lentils slow cooked overnight with fresh tomatoes, cream, and organic white butter.', cat: 'Main Course', price: 269.00, veg: 1, img: 'https://images.unsplash.com/photo-1546833999-b9f581a1996d?w=800&auto=format&fit=crop&q=80' },
          { name: 'Shahi Tukda', desc: 'Crispy fried bread slices soaked in saffron rabri and garnished with slivered pistachios.', cat: 'Desserts', price: 139.00, veg: 1, img: 'https://images.unsplash.com/photo-1551024709-8f23befc6f87?w=800&auto=format&fit=crop&q=80' },
          { name: 'Gulab Jamun (2 pcs)', desc: 'Classic golden milk-solid dumplings soaked in warm rosewater and cardamom syrup.', cat: 'Desserts', price: 99.00, veg: 1, img: 'https://images.unsplash.com/photo-1578985545062-69928b1d9587?w=800&auto=format&fit=crop&q=80' },
          { name: 'Rooh Afza Sharbat', desc: 'Chilled rose syrup drink with lemon juice, mint, and basil seeds.', cat: 'Beverages', price: 79.00, veg: 1, img: 'https://images.unsplash.com/photo-1513558161293-cdaf765ed2fd?w=800&auto=format&fit=crop&q=80' },
          { name: 'Mint Chutney Salad Platter', desc: 'Fresh cucumber, tomato, and onion salad served with spicy mint yogurt dip.', cat: 'Accompaniments', price: 59.00, veg: 1, img: 'https://images.unsplash.com/photo-1540420773420-3366772f4999?w=800&auto=format&fit=crop&q=80' },
        ]
      },
      // 3. Garden City Dosa
      {
        restaurant: 'Garden City Dosa',
        items: [
          { name: 'Classic Benne Masala Dosa', desc: 'Crispy golden Bengaluru style butter dosa stuffed with spiced potato mash and spicy red chutney.', cat: 'Dosa', price: 135.00, veg: 1, img: 'https://images.unsplash.com/photo-1668236543090-82eba5ee5976?w=800&auto=format&fit=crop&q=80' },
          { name: 'Ghee Podi Roast Dosa', desc: 'Crisp roasted crepe smeared generously with desi ghee and homemade gunpowder spice blend.', cat: 'Dosa', price: 145.00, veg: 1, img: 'https://images.unsplash.com/photo-1589301760014-d929f3979dbc?w=800&auto=format&fit=crop&q=80' },
          { name: 'Open Butter Dosa with Podi', desc: 'Thick soft spongy dosa topped with a dollop of fresh churned white butter and podi.', cat: 'Dosa', price: 140.00, veg: 1, img: 'https://images.unsplash.com/photo-1668236543090-82eba5ee5976?w=800&auto=format&fit=crop&q=80' },
          { name: 'Steamed Button Idli (14 pcs)', desc: 'Mini fluffy steamed rice and lentil cakes immersed in piping hot homemade vegetable sambar.', cat: 'Tiffins', price: 95.00, veg: 1, img: 'https://images.unsplash.com/photo-1589301760014-d929f3979dbc?w=800&auto=format&fit=crop&q=80' },
          { name: 'Crispy Medu Vada (2 pcs)', desc: 'Golden crispy lentil doughnuts with crunchy exterior and soft fluffy interior, served with chutneys.', cat: 'Tiffins', price: 85.00, veg: 1, img: 'https://images.unsplash.com/photo-1626777552726-4a6b54c97e46?w=800&auto=format&fit=crop&q=80' },
          { name: 'Khara Bath (Upma)', desc: 'Traditional spiced semolina upma cooked with ghee, mixed garden veggies, and mustard tempering.', cat: 'Tiffins', price: 75.00, veg: 1, img: 'https://images.unsplash.com/photo-1546833999-b9f581a1996d?w=800&auto=format&fit=crop&q=80' },
          { name: 'Kesari Bath (Sweet)', desc: 'Classic saffron semolina sweet pudding loaded with roasted cashews and golden raisins in pure ghee.', cat: 'Desserts', price: 80.00, veg: 1, img: 'https://images.unsplash.com/photo-1551024709-8f23befc6f87?w=800&auto=format&fit=crop&q=80' },
          { name: 'South Indian Filter Kaapi', desc: 'Strong aromatic chicory-blended filter coffee frothed in traditional brass dabarah and tumbler.', cat: 'Beverages', price: 55.00, veg: 1, img: 'https://images.unsplash.com/photo-1514432324607-a09d9b4aefdd?w=800&auto=format&fit=crop&q=80' },
          { name: 'Badam Milk (Hot)', desc: 'Warm sweetened milk infused with crushed almonds, cardamom, and saffron strands.', cat: 'Beverages', price: 75.00, veg: 1, img: 'https://images.unsplash.com/photo-1513558161293-cdaf765ed2fd?w=800&auto=format&fit=crop&q=80' },
          { name: 'Curd Rice with Pomegranate', desc: 'Soothing tempered yogurt rice topped with mustard seeds, curry leaves, and ruby pomegranate seeds.', cat: 'Rice', price: 110.00, veg: 1, img: 'https://images.unsplash.com/photo-1589302168068-964664d93dc0?w=800&auto=format&fit=crop&q=80' },
          { name: 'Bisi Bele Bath with Boondi', desc: 'Spicy rice, lentils, and vegetable mash cooked with tamarind and special spice powder, served with boondi.', cat: 'Rice', price: 125.00, veg: 1, img: 'https://images.unsplash.com/photo-1546833999-b9f581a1996d?w=800&auto=format&fit=crop&q=80' },
        ]
      },
      // 4. Chennai Tiffin House
      {
        restaurant: 'Chennai Tiffin House',
        items: [
          { name: 'Ghee Onion Rava Dosa', desc: 'Crispy lacy semolina crepe studded with finely chopped onions, crushed black pepper, and cumin.', cat: 'Dosa', price: 140.00, veg: 1, img: 'https://images.unsplash.com/photo-1668236543090-82eba5ee5976?w=800&auto=format&fit=crop&q=80' },
          { name: 'Madras Masala Dosa', desc: 'Thin and crispy rice crepe stuffed with traditional spiced potato subzi and spicy red garlic chutney.', cat: 'Dosa', price: 120.00, veg: 1, img: 'https://images.unsplash.com/photo-1589301760014-d929f3979dbc?w=800&auto=format&fit=crop&q=80' },
          { name: 'Thattu Idli with Ghee Podi', desc: 'Large plate-sized soft spongy idli coated with fiery karam podi and hot melted ghee.', cat: 'Tiffins', price: 110.00, veg: 1, img: 'https://images.unsplash.com/photo-1589301760014-d929f3979dbc?w=800&auto=format&fit=crop&q=80' },
          { name: 'Sambar Vada (2 pcs)', desc: 'Golden crispy medu vadas submerged in aromatic drumstick and shallot Madras sambar.', cat: 'Tiffins', price: 95.00, veg: 1, img: 'https://images.unsplash.com/photo-1626777552726-4a6b54c97e46?w=800&auto=format&fit=crop&q=80' },
          { name: 'Poori Masala (3 pcs)', desc: 'Puffy deep-fried whole wheat pooris served with tempered South Indian yellow potato curry.', cat: 'Tiffins', price: 115.00, veg: 1, img: 'https://images.unsplash.com/photo-1546833999-b9f581a1996d?w=800&auto=format&fit=crop&q=80' },
          { name: 'Ven Pongal with Ghee Cashews', desc: 'Wholesome rice and yellow moong dal cooked with whole black pepper, cumin, ginger, and ghee cashews.', cat: 'Tiffins', price: 105.00, veg: 1, img: 'https://images.unsplash.com/photo-1589302168068-964664d93dc0?w=800&auto=format&fit=crop&q=80' },
          { name: 'Classic Filter Coffee', desc: 'Authentic Chennai degree coffee served piping hot with frothy crema.', cat: 'Beverages', price: 50.00, veg: 1, img: 'https://images.unsplash.com/photo-1514432324607-a09d9b4aefdd?w=800&auto=format&fit=crop&q=80' },
          { name: 'Masala Buttermilk (Neer Mor)', desc: 'Chilled spiced churned yogurt drink seasoned with ginger, green chillies, curry leaves, and asafoetida.', cat: 'Beverages', price: 45.00, veg: 1, img: 'https://images.unsplash.com/photo-1513558161293-cdaf765ed2fd?w=800&auto=format&fit=crop&q=80' },
          { name: 'Tirunelveli Halwa', desc: 'Famous glistening wheat halwa prepared in pure ghee with cashew nuts.', cat: 'Desserts', price: 120.00, veg: 1, img: 'https://images.unsplash.com/photo-1551024709-8f23befc6f87?w=800&auto=format&fit=crop&q=80' },
          { name: 'Lemon Rice with Papad', desc: 'Tangy turmeric lemon rice tempered with peanuts, curry leaves, and crunchy papad.', cat: 'Rice', price: 100.00, veg: 1, img: 'https://images.unsplash.com/photo-1589302168068-964664d93dc0?w=800&auto=format&fit=crop&q=80' },
          { name: 'Appam with Coconut Milk (2 pcs)', desc: 'Soft bowl-shaped fermented rice pancakes with spongy center, served with sweetened coconut milk.', cat: 'Tiffins', price: 110.00, veg: 1, img: 'https://images.unsplash.com/photo-1668236543090-82eba5ee5976?w=800&auto=format&fit=crop&q=80' },
        ]
      },
      // 5. Mumbai Street Kitchen
      {
        restaurant: 'Mumbai Street Kitchen',
        items: [
          { name: 'Special Amul Pav Bhaji', desc: 'Spicy mashed mixed vegetable curry loaded with generous slabs of Amul butter, served with 2 buttery pavs.', cat: 'Street Food', price: 169.00, veg: 1, img: 'https://images.unsplash.com/photo-1606491956689-2ea866880c84?w=800&auto=format&fit=crop&q=80' },
          { name: 'Cheese Pav Bhaji', desc: 'Our signature bhaji topped with a thick snowfall of grated processed cheese, served with 2 pavs.', cat: 'Street Food', price: 199.00, veg: 1, img: 'https://images.unsplash.com/photo-1606491956689-2ea866880c84?w=800&auto=format&fit=crop&q=80' },
          { name: 'Mumbai Vada Pav (2 pcs)', desc: 'Spicy batata vada tucked inside soft pav smeared with dry garlic-peanut chutney and green chilli.', cat: 'Street Food', price: 79.00, veg: 1, img: 'https://images.unsplash.com/photo-1546833999-b9f581a1996d?w=800&auto=format&fit=crop&q=80' },
          { name: 'Misal Pav with Farsan', desc: 'Fiery sprouted moth bean curry topped with crunchy farsan, chopped onions, lemon, and 2 pavs.', cat: 'Street Food', price: 139.00, veg: 1, img: 'https://images.unsplash.com/photo-1606491956689-2ea866880c84?w=800&auto=format&fit=crop&q=80' },
          { name: 'Sev Puri (6 pcs)', desc: 'Crispy flat papdis topped with potatoes, onions, trio of chutneys, and abundant nylon sev.', cat: 'Chaat', price: 99.00, veg: 1, img: 'https://images.unsplash.com/photo-1626777552726-4a6b54c97e46?w=800&auto=format&fit=crop&q=80' },
          { name: 'Dahi Batata Puri (6 pcs)', desc: 'Puffed puris filled with potatoes, sweetened curd, tamarind-date chutney, and sprinkled spices.', cat: 'Chaat', price: 119.00, veg: 1, img: 'https://images.unsplash.com/photo-1606491956689-2ea866880c84?w=800&auto=format&fit=crop&q=80' },
          { name: 'Bombay Masala Toast Sandwich', desc: 'Toasted triple-layer sandwich with spiced potato filling, beetroot, cucumber, cheese, and mint chutney.', cat: 'Sandwiches', price: 129.00, veg: 1, img: 'https://images.unsplash.com/photo-1509722747041-616f39b57569?w=800&auto=format&fit=crop&q=80' },
          { name: 'Pani Puri Family Pack (24 pcs)', desc: 'Crisp puris with spicy mint water, sweet chutney, ragda, and boondi for the ultimate street experience.', cat: 'Chaat', price: 169.00, veg: 1, img: 'https://images.unsplash.com/photo-1626777552726-4a6b54c97e46?w=800&auto=format&fit=crop&q=80' },
          { name: 'Malai Kulfi on a Stick', desc: 'Slow cooked thickened milk popsicle infused with cardamom, saffron, and crushed almonds.', cat: 'Desserts', price: 69.00, veg: 1, img: 'https://images.unsplash.com/photo-1551024709-8f23befc6f87?w=800&auto=format&fit=crop&q=80' },
          { name: 'Cutting Chai (Flask)', desc: 'Hot, strong cutting tea infused with fresh ginger and crushed green cardamom pods.', cat: 'Beverages', price: 79.00, veg: 1, img: 'https://images.unsplash.com/photo-1561047029-3000c68339ca?w=800&auto=format&fit=crop&q=80' },
          { name: 'Fresh Sugarcane Juice with Ginger', desc: 'Freshly crushed sugarcane juice with hints of ginger, mint, and black salt.', cat: 'Beverages', price: 69.00, veg: 1, img: 'https://images.unsplash.com/photo-1513558161293-cdaf765ed2fd?w=800&auto=format&fit=crop&q=80' },
        ]
      },
      // 6. Capital Tandoor
      {
        restaurant: 'Capital Tandoor',
        items: [
          { name: 'Butter Chicken Classic', desc: 'Tender tandoori chicken simmered in a velvety tomato, butter, and cashew gravy infused with kasoori methi.', cat: 'Main Course', price: 389.00, veg: 0, img: 'https://images.unsplash.com/photo-1588166524941-3bf61a9c41db?w=800&auto=format&fit=crop&q=80' },
          { name: 'Paneer Butter Masala', desc: 'Fresh cottage cheese cubes cooked in rich aromatic tomato-cream gravy with exotic Indian spices.', cat: 'Main Course', price: 319.00, veg: 1, img: 'https://images.unsplash.com/photo-1567188040759-fb8a883dc6d8?w=800&auto=format&fit=crop&q=80' },
          { name: 'Dal Makhani Slow Cooked', desc: 'Whole black lentils and kidney beans simmered overnight with butter, cream, and subtle spices.', cat: 'Main Course', price: 289.00, veg: 1, img: 'https://images.unsplash.com/photo-1546833999-b9f581a1996d?w=800&auto=format&fit=crop&q=80' },
          { name: 'Kadhai Chicken', desc: 'Boneless chicken cooked with bell peppers, onions, and freshly ground whole coriander and red chillies.', cat: 'Main Course', price: 369.00, veg: 0, img: 'https://images.unsplash.com/photo-1603894584373-5ac82b2ae398?w=800&auto=format&fit=crop&q=80' },
          { name: 'Tandoori Murgh Tikka', desc: 'Juicy chicken morsels chargrilled in clay tandoor with aromatic tandoori masala and lemon butter.', cat: 'Starters', price: 329.00, veg: 0, img: 'https://images.unsplash.com/photo-1599488615731-7e5c2823ff28?w=800&auto=format&fit=crop&q=80' },
          { name: 'Dahi Ke Kebab (6 pcs)', desc: 'Delicate hung yogurt patties stuffed with green chillies and coriander, crisp on the outside and soft inside.', cat: 'Starters', price: 279.00, veg: 1, img: 'https://images.unsplash.com/photo-1626777552726-4a6b54c97e46?w=800&auto=format&fit=crop&q=80' },
          { name: 'Butter Naan', desc: 'Soft and fluffy leavened bread baked in tandoor and brushed with creamy dairy butter.', cat: 'Breads', price: 55.00, veg: 1, img: 'https://images.unsplash.com/photo-1517244683847-7456b63c5969?w=800&auto=format&fit=crop&q=80' },
          { name: 'Tandoori Roti (Butter)', desc: 'Whole wheat round flatbread cooked in tandoor with fresh butter glaze.', cat: 'Breads', price: 35.00, veg: 1, img: 'https://images.unsplash.com/photo-1517244683847-7456b63c5969?w=800&auto=format&fit=crop&q=80' },
          { name: 'Jeera Rice', desc: 'Aromatic basmati rice cooked with cumin seeds and whole fragrant spices.', cat: 'Rice', price: 159.00, veg: 1, img: 'https://images.unsplash.com/photo-1589302168068-964664d93dc0?w=800&auto=format&fit=crop&q=80' },
          { name: 'Rasmalai (2 pcs)', desc: 'Soft spongy cottage cheese patties soaked in chilled thick saffron-cardamom flavoured milk.', cat: 'Desserts', price: 129.00, veg: 1, img: 'https://images.unsplash.com/photo-1551024709-8f23befc6f87?w=800&auto=format&fit=crop&q=80' },
          { name: 'Sweet Mango Lassi', desc: 'Thick creamy churned yogurt blended with Alphonso mango pulp and cardamom.', cat: 'Beverages', price: 99.00, veg: 1, img: 'https://images.unsplash.com/photo-1513558161293-cdaf765ed2fd?w=800&auto=format&fit=crop&q=80' },
        ]
      },
      // 7. Coastal Curry House
      {
        restaurant: 'Coastal Curry House',
        items: [
          { name: 'Mangalorean Fish Curry', desc: 'Fresh Kingfish simmered in a tangy coconut, Byadgi chili, and kokum gravy.', cat: 'Seafood', price: 429.00, veg: 0, img: 'https://images.unsplash.com/photo-1534422298391-e4f8c172dddb?w=800&auto=format&fit=crop&q=80' },
          { name: 'Prawns Ghee Roast', desc: 'Succulent fresh prawns tossed in authentic Kundapur ghee-roasted spice paste and curry leaves.', cat: 'Seafood', price: 469.00, veg: 0, img: 'https://images.unsplash.com/photo-1555939594-58d7cb561ad1?w=800&auto=format&fit=crop&q=80' },
          { name: 'Kori Rotti with Chicken Gravy', desc: 'Crispy wafer-thin rice rotis served with fiery, coconut-rich coastal chicken curry.', cat: 'Main Course', price: 349.00, veg: 0, img: 'https://images.unsplash.com/photo-1626777552726-4a6b54c97e46?w=800&auto=format&fit=crop&q=80' },
          { name: 'Neer Dosa (3 pcs)', desc: 'Delicate, feather-light, lacy water dosas served with coconut chutney and tomato curry.', cat: 'Breads', price: 95.00, veg: 1, img: 'https://images.unsplash.com/photo-1668236543090-82eba5ee5976?w=800&auto=format&fit=crop&q=80' },
          { name: 'Anjal / Surmai Tawa Fry', desc: 'Seer fish steak shallow fried with spicy homemade red masala crust.', cat: 'Seafood', price: 499.00, veg: 0, img: 'https://images.unsplash.com/photo-1534422298391-e4f8c172dddb?w=800&auto=format&fit=crop&q=80' },
          { name: 'Paneer Ghee Roast', desc: 'Cottage cheese cubes tossed in spicy aromatic ghee roast gravy with curry leaves.', cat: 'Starters', price: 299.00, veg: 1, img: 'https://images.unsplash.com/photo-1567188040759-fb8a883dc6d8?w=800&auto=format&fit=crop&q=80' },
          { name: 'Squid Sukka (Calamari)', desc: 'Tender squid pieces pan-fried with dry roasted grated coconut and coastal spices.', cat: 'Seafood', price: 379.00, veg: 0, img: 'https://images.unsplash.com/photo-1555939594-58d7cb561ad1?w=800&auto=format&fit=crop&q=80' },
          { name: 'Steamed Red Rice (Boiled)', desc: 'Traditional coastal boiled red rice, ideal for seafood gravies.', cat: 'Rice', price: 89.00, veg: 1, img: 'https://images.unsplash.com/photo-1589302168068-964664d93dc0?w=800&auto=format&fit=crop&q=80' },
          { name: 'Sol Kadhi', desc: 'Refreshing pink digestive beverage made with kokum extract, coconut milk, garlic, and fresh green chillies.', cat: 'Beverages', price: 69.00, veg: 1, img: 'https://images.unsplash.com/photo-1513558161293-cdaf765ed2fd?w=800&auto=format&fit=crop&q=80' },
          { name: 'Tender Coconut Payasam', desc: 'Chilled pudding made of tender coconut pulp and water cooked in milk and cardamom.', cat: 'Desserts', price: 139.00, veg: 1, img: 'https://images.unsplash.com/photo-1551024709-8f23befc6f87?w=800&auto=format&fit=crop&q=80' },
          { name: 'Crab Curry Coastal Style', desc: 'Fresh mud crab simmered in roasted coriander, peppercorn, and coconut milk curry.', cat: 'Seafood', price: 549.00, veg: 0, img: 'https://images.unsplash.com/photo-1534422298391-e4f8c172dddb?w=800&auto=format&fit=crop&q=80' },
        ]
      },
      // 8. Royal Thali Kitchen
      {
        restaurant: 'Royal Thali Kitchen',
        items: [
          { name: 'Maharaja Rajasthani Thali', desc: 'Grand platter with Dal Baati Churma, Gatte ki Subzi, Ker Sangri, Kadhi, 4 Phulkas, Pulao, Sweet, and Chaas.', cat: 'Thali', price: 399.00, veg: 1, img: 'https://images.unsplash.com/photo-1610057099443-fde8c4d50f91?w=800&auto=format&fit=crop&q=80' },
          { name: 'Special Gujarati Thali', desc: 'Delightful platter with Gujarati Kadhi, Sev Tameta, Undhiyu, Ringna No Oro, 4 Rotlis, Rice, Shrikhand, and Farsan.', cat: 'Thali', price: 349.00, veg: 1, img: 'https://images.unsplash.com/photo-1610057099443-fde8c4d50f91?w=800&auto=format&fit=crop&q=80' },
          { name: 'Dal Baati Churma (Single Platter)', desc: '3 golden baked wheat baatis crushed with desi ghee, served with spicy panchmel dal and sweet churma.', cat: 'Main Course', price: 239.00, veg: 1, img: 'https://images.unsplash.com/photo-1546833999-b9f581a1996d?w=800&auto=format&fit=crop&q=80' },
          { name: 'Kadhi Pakoda with Steamed Rice', desc: 'Tangy gram-flour and curd soup with soft fenugreek pakodas, served with fragrant steamed rice.', cat: 'Main Course', price: 189.00, veg: 1, img: 'https://images.unsplash.com/photo-1589302168068-964664d93dc0?w=800&auto=format&fit=crop&q=80' },
          { name: 'Gatte Ki Subzi', desc: 'Steamed gram flour dumplings cooked in a flavorful spiced curd gravy.', cat: 'Main Course', price: 199.00, veg: 1, img: 'https://images.unsplash.com/photo-1546833999-b9f581a1996d?w=800&auto=format&fit=crop&q=80' },
          { name: 'Khaman Dhokla (4 pcs)', desc: 'Soft and spongy steamed gram flour snack tempered with mustard seeds, sesame, and green chillies.', cat: 'Farsan', price: 89.00, veg: 1, img: 'https://images.unsplash.com/photo-1626777552726-4a6b54c97e46?w=800&auto=format&fit=crop&q=80' },
          { name: 'Khandvi (6 pcs)', desc: 'Tightly rolled gram flour sheets tempered with mustard, grated coconut, and fresh coriander.', cat: 'Farsan', price: 99.00, veg: 1, img: 'https://images.unsplash.com/photo-1606491956689-2ea866880c84?w=800&auto=format&fit=crop&q=80' },
          { name: 'Kesar Pista Shrikhand', desc: 'Thick strained sweetened yogurt flavoured with saffron, green cardamom, and toasted pistachios.', cat: 'Desserts', price: 119.00, veg: 1, img: 'https://images.unsplash.com/photo-1551024709-8f23befc6f87?w=800&auto=format&fit=crop&q=80' },
          { name: 'Moong Dal Halwa', desc: 'Rich golden sweet made from ground yellow lentils, pure desi ghee, milk, and dry fruits.', cat: 'Desserts', price: 149.00, veg: 1, img: 'https://images.unsplash.com/photo-1578985545062-69928b1d9587?w=800&auto=format&fit=crop&q=80' },
          { name: 'Masala Chaas (Spiced Buttermilk)', desc: 'Traditional salted churned buttermilk infused with roasted cumin, mint, and rock salt.', cat: 'Beverages', price: 55.00, veg: 1, img: 'https://images.unsplash.com/photo-1513558161293-cdaf765ed2fd?w=800&auto=format&fit=crop&q=80' },
          { name: 'Phulka Roti (Set of 4)', desc: 'Puffy whole wheat homestyle rotis brushed with pure cow ghee.', cat: 'Breads', price: 50.00, veg: 1, img: 'https://images.unsplash.com/photo-1517244683847-7456b63c5969?w=800&auto=format&fit=crop&q=80' },
        ]
      },
      // 9. Andhra Spice Corner
      {
        restaurant: 'Andhra Spice Corner',
        items: [
          { name: 'Andhra Chili Chicken', desc: 'Spicy, tangy green-chili marinated chicken morsels pan-fried with curry leaves and onions.', cat: 'Starters', price: 279.00, veg: 0, img: 'https://images.unsplash.com/photo-1546833999-b9f581a1996d?w=800&auto=format&fit=crop&q=80' },
          { name: 'Gongura Mutton Curry', desc: 'Tender mutton cooked in tangy sorrel leaf paste with fiery Guntur red chillies.', cat: 'Main Course', price: 389.00, veg: 0, img: 'https://images.unsplash.com/photo-1633945274405-b6c8069047b0?w=800&auto=format&fit=crop&q=80' },
          { name: 'Nellore Chapala Pulusu (Fish Curry)', desc: 'Traditional tangy fish curry made with raw mango, tamarind, and fresh fish steaks.', cat: 'Main Course', price: 349.00, veg: 0, img: 'https://images.unsplash.com/photo-1534422298391-e4f8c172dddb?w=800&auto=format&fit=crop&q=80' },
          { name: 'Andhra Veg Meals Box', desc: 'Steamed rice, Pappu (dal), Sambar, Rasam, Veg Fry, Chutney, Curd, and Podi with Ghee.', cat: 'Meals', price: 189.00, veg: 1, img: 'https://images.unsplash.com/photo-1589302168068-964664d93dc0?w=800&auto=format&fit=crop&q=80' },
          { name: 'Kandi Podi & Ghee Rice', desc: 'Steamed sona masoori rice served with fragrant roasted lentil gunpowder and hot desi ghee.', cat: 'Rice', price: 139.00, veg: 1, img: 'https://images.unsplash.com/photo-1589302168068-964664d93dc0?w=800&auto=format&fit=crop&q=80' },
          { name: 'Ulava Charu with Cream', desc: 'Traditional dark and thick horse-gram soup served with fresh dairy cream.', cat: 'Soups', price: 119.00, veg: 1, img: 'https://images.unsplash.com/photo-1546833999-b9f581a1996d?w=800&auto=format&fit=crop&q=80' },
          { name: 'Crispy Bhendi Fry (Okra)', desc: 'Thinly sliced crispy fried okra tossed with roasted peanuts, curry leaves, and dry coconut.', cat: 'Starters', price: 149.00, veg: 1, img: 'https://images.unsplash.com/photo-1626777552726-4a6b54c97e46?w=800&auto=format&fit=crop&q=80' },
          { name: 'Chicken 555', desc: 'Crispy chicken strips coated with spicy chili paste, garlic, and cashew nuts.', cat: 'Starters', price: 289.00, veg: 0, img: 'https://images.unsplash.com/photo-1603894584373-5ac82b2ae398?w=800&auto=format&fit=crop&q=80' },
          { name: 'Tomato Pappu', desc: 'Andhra style comfort toor dal cooked with ripe tomatoes, green chillies, and garlic tadka.', cat: 'Main Course', price: 159.00, veg: 1, img: 'https://images.unsplash.com/photo-1546833999-b9f581a1996d?w=800&auto=format&fit=crop&q=80' },
          { name: 'Sunnundalu (2 pcs)', desc: 'Traditional sweet laddu made from roasted urad dal, jaggery, and pure cow ghee.', cat: 'Desserts', price: 89.00, veg: 1, img: 'https://images.unsplash.com/photo-1551024709-8f23befc6f87?w=800&auto=format&fit=crop&q=80' },
          { name: 'Nannari Sharbat', desc: 'Cooling herbal sarasaparilla root syrup drink with basil seeds and fresh lime juice.', cat: 'Beverages', price: 65.00, veg: 1, img: 'https://images.unsplash.com/photo-1513558161293-cdaf765ed2fd?w=800&auto=format&fit=crop&q=80' },
        ]
      },
      // 10. Punjabi Zaika
      {
        restaurant: 'Punjabi Zaika',
        items: [
          { name: 'Amritsari Kulcha with Chole', desc: 'Flaky layered potato and onion stuffed tandoori kulcha served with spicy pindi chole and tangy chutney.', cat: 'Main Course', price: 199.00, veg: 1, img: 'https://images.unsplash.com/photo-1588166524941-3bf61a9c41db?w=800&auto=format&fit=crop&q=80' },
          { name: 'Dhaba Style Butter Chicken', desc: 'Robust and spicy rustic butter chicken cooked in dhaba style gravy with green chillies and ginger juliennes.', cat: 'Main Course', price: 369.00, veg: 0, img: 'https://images.unsplash.com/photo-1588166524941-3bf61a9c41db?w=800&auto=format&fit=crop&q=80' },
          { name: 'Sarson Ka Saag with Makki Roti', desc: 'Seasonal mustard greens cooked with spices and makki flour, served with 2 makki rotis and white butter.', cat: 'Main Course', price: 279.00, veg: 1, img: 'https://images.unsplash.com/photo-1546833999-b9f581a1996d?w=800&auto=format&fit=crop&q=80' },
          { name: 'Amritsari Fish Fry', desc: 'Fresh fish fillets coated in carom seed (ajwain) and gram flour batter, deep fried till golden.', cat: 'Starters', price: 349.00, veg: 0, img: 'https://images.unsplash.com/photo-1534422298391-e4f8c172dddb?w=800&auto=format&fit=crop&q=80' },
          { name: 'Paneer Bhurji', desc: 'Scrambled fresh cottage cheese cooked with chopped onions, tomatoes, green chillies, and butter.', cat: 'Main Course', price: 269.00, veg: 1, img: 'https://images.unsplash.com/photo-1567188040759-fb8a883dc6d8?w=800&auto=format&fit=crop&q=80' },
          { name: 'Pindi Chole Masala', desc: 'Dark, spicy chickpeas slow-cooked with tea leaves, anardana (pomegranate seed), and dried spices.', cat: 'Main Course', price: 219.00, veg: 1, img: 'https://images.unsplash.com/photo-1546833999-b9f581a1996d?w=800&auto=format&fit=crop&q=80' },
          { name: 'Laccha Paratha', desc: 'Multi-layered whole wheat crispy bread cooked on hot tawa with pure ghee.', cat: 'Breads', price: 55.00, veg: 1, img: 'https://images.unsplash.com/photo-1517244683847-7456b63c5969?w=800&auto=format&fit=crop&q=80' },
          { name: 'Garlic Kulcha', desc: 'Soft leavened refined flour bread stuffed with minced garlic and cilantro, baked in tandoor.', cat: 'Breads', price: 65.00, veg: 1, img: 'https://images.unsplash.com/photo-1517244683847-7456b63c5969?w=800&auto=format&fit=crop&q=80' },
          { name: 'Patiala Lassi (Giant Glass)', desc: 'Thick, sweet churned yogurt drink served in a large kulhad with thick layer of malai.', cat: 'Beverages', price: 95.00, veg: 1, img: 'https://images.unsplash.com/photo-1513558161293-cdaf765ed2fd?w=800&auto=format&fit=crop&q=80' },
          { name: 'Gajar Ka Halwa', desc: 'Winter red carrot dessert slow simmered with milk, khoya, pure ghee, and roasted cashews.', cat: 'Desserts', price: 149.00, veg: 1, img: 'https://images.unsplash.com/photo-1551024709-8f23befc6f87?w=800&auto=format&fit=crop&q=80' },
          { name: 'Tandoori Chicken Wings (6 pcs)', desc: 'Spicy chicken wings roasted crisp in clay oven with mint chutney.', cat: 'Starters', price: 249.00, veg: 0, img: 'https://images.unsplash.com/photo-1603894584373-5ac82b2ae398?w=800&auto=format&fit=crop&q=80' },
        ]
      },
      // 11. Wok and Roll Kitchen
      {
        restaurant: 'Wok and Roll Kitchen',
        items: [
          { name: 'Veg Hakka Noodles', desc: 'Wok-tossed noodles with shredded cabbage, bell peppers, carrots, spring onions, and light soy sauce.', cat: 'Noodles', price: 189.00, veg: 1, img: 'https://images.unsplash.com/photo-1541696432-82c6da8ce7bf?w=800&auto=format&fit=crop&q=80' },
          { name: 'Chicken Schezwan Fried Rice', desc: 'Fragrant jasmine rice tossed in fiery homemade Schezwan sauce with scrambled egg and chicken shreds.', cat: 'Rice', price: 239.00, veg: 0, img: 'https://images.unsplash.com/photo-1541696432-82c6da8ce7bf?w=800&auto=format&fit=crop&q=80' },
          { name: 'Chili Paneer Dry', desc: 'Crisp batter-coated paneer tossed with capsicum, onions, soy sauce, and slit green chillies.', cat: 'Starters', price: 249.00, veg: 1, img: 'https://images.unsplash.com/photo-1567188040759-fb8a883dc6d8?w=800&auto=format&fit=crop&q=80' },
          { name: 'Crispy Honey Chili Potatoes', desc: 'Fried potato fingers glazed in honey, toasted sesame seeds, garlic, and mild chili sauce.', cat: 'Starters', price: 179.00, veg: 1, img: 'https://images.unsplash.com/photo-1541696432-82c6da8ce7bf?w=800&auto=format&fit=crop&q=80' },
          { name: 'Chicken Manchurian Gravy', desc: 'Golden chicken dumplings cooked in spicy coriander, garlic, and dark soy broth.', cat: 'Main Course', price: 279.00, veg: 0, img: 'https://images.unsplash.com/photo-1541696432-82c6da8ce7bf?w=800&auto=format&fit=crop&q=80' },
          { name: 'Steamed Chicken Dim Sum (6 pcs)', desc: 'Delicate translucent steamed dumplings packed with juicy minced chicken and scallions.', cat: 'Dim Sum', price: 229.00, veg: 0, img: 'https://images.unsplash.com/photo-1541696432-82c6da8ce7bf?w=800&auto=format&fit=crop&q=80' },
          { name: 'Veg Spring Rolls (4 pcs)', desc: 'Golden fried crispy rolls stuffed with spiced glass noodles and seasoned vegetables.', cat: 'Starters', price: 169.00, veg: 1, img: 'https://images.unsplash.com/photo-1541696432-82c6da8ce7bf?w=800&auto=format&fit=crop&q=80' },
          { name: 'Hot and Sour Chicken Soup', desc: 'Classic thick soup loaded with shredded chicken, mushrooms, bamboo shoots, and cracked pepper.', cat: 'Soups', price: 149.00, veg: 0, img: 'https://images.unsplash.com/photo-1541696432-82c6da8ce7bf?w=800&auto=format&fit=crop&q=80' },
          { name: 'Manchow Soup (Veg)', desc: 'Spicy soy garlic soup garnished with plenty of crispy fried noodles and cilantro.', cat: 'Soups', price: 129.00, veg: 1, img: 'https://images.unsplash.com/photo-1541696432-82c6da8ce7bf?w=800&auto=format&fit=crop&q=80' },
          { name: 'Fried Ice Cream with Chocolate', desc: 'Vanilla ice cream ball enveloped in crispy warm crust, drizzled with Belgian chocolate syrup.', cat: 'Desserts', price: 169.00, veg: 1, img: 'https://images.unsplash.com/photo-1551024709-8f23befc6f87?w=800&auto=format&fit=crop&q=80' },
          { name: 'Iced Lemon Tea', desc: 'Chilled brewed black tea flavored with fresh lemon juice and mint sprigs.', cat: 'Beverages', price: 89.00, veg: 1, img: 'https://images.unsplash.com/photo-1513558161293-cdaf765ed2fd?w=800&auto=format&fit=crop&q=80' },
        ]
      },
      // 12. Sweet Cravings Bakery
      {
        restaurant: 'Sweet Cravings Bakery',
        items: [
          { name: 'Belgian Chocolate Truffle Pastry', desc: 'Decadent moist chocolate sponge layered with smooth dark Belgian chocolate ganache.', cat: 'Pastries', price: 149.00, veg: 1, img: 'https://images.unsplash.com/photo-1578985545062-69928b1d9587?w=800&auto=format&fit=crop&q=80' },
          { name: 'New York Baked Cheesecake', desc: 'Classic dense creamy cheesecake on a buttery graham cracker crust, topped with berry compote.', cat: 'Pastries', price: 189.00, veg: 1, img: 'https://images.unsplash.com/photo-1533134242443-d4fd215305ad?w=800&auto=format&fit=crop&q=80' },
          { name: 'Red Velvet Pastry with Cream Cheese', desc: 'Vibrant crimson sponge layered with silky tangy cream cheese frosting.', cat: 'Pastries', price: 159.00, veg: 1, img: 'https://images.unsplash.com/photo-1578985545062-69928b1d9587?w=800&auto=format&fit=crop&q=80' },
          { name: 'Warm Walnut Brownie', desc: 'Fudgy rich chocolate brownie loaded with toasted walnuts, served warm.', cat: 'Brownies', price: 119.00, veg: 1, img: 'https://images.unsplash.com/photo-1606313564200-e75d5e30476c?w=800&auto=format&fit=crop&q=80' },
          { name: 'Assorted Macaron Box (4 pcs)', desc: 'Delicate French almond meringue cookies in pistachio, raspberry, chocolate, and caramel flavors.', cat: 'Desserts', price: 249.00, veg: 1, img: 'https://images.unsplash.com/photo-1569864358642-9d1684040f43?w=800&auto=format&fit=crop&q=80' },
          { name: 'Tiramisu Cup', desc: 'Espresso-soaked ladyfingers layered with whipped mascarpone cream and dusted with cocoa.', cat: 'Desserts', price: 179.00, veg: 1, img: 'https://images.unsplash.com/photo-1571877227200-a0d98ea607e9?w=800&auto=format&fit=crop&q=80' },
          { name: 'Blueberry Muffin', desc: 'Moist golden muffin bursting with plump blueberries and topped with sugar streusel.', cat: 'Bakery', price: 89.00, veg: 1, img: 'https://images.unsplash.com/photo-1586985289688-ca3cf47d3e6e?w=800&auto=format&fit=crop&q=80' },
          { name: 'Choco Chip Cookie (Pack of 2)', desc: 'Crispy on the edges, chewy in the center cookies studded with semi-sweet chocolate morsels.', cat: 'Bakery', price: 79.00, veg: 1, img: 'https://images.unsplash.com/photo-1499636136210-6f4ee915583e?w=800&auto=format&fit=crop&q=80' },
          { name: 'Cold Brew Coffee', desc: 'Smooth, 18-hour steeped cold brew coffee served over ice.', cat: 'Beverages', price: 129.00, veg: 1, img: 'https://images.unsplash.com/photo-1517701550927-30cf4ba1dba5?w=800&auto=format&fit=crop&q=80' },
          { name: 'Belgian Hot Chocolate', desc: 'Thick, creamy warm melted dark chocolate drink topped with mini marshmallows.', cat: 'Beverages', price: 149.00, veg: 1, img: 'https://images.unsplash.com/photo-1542990253-0d0f5be5f0ed?w=800&auto=format&fit=crop&q=80' },
          { name: 'Fresh Butter Croissant', desc: 'Flaky, buttery, multi-layered French croissant baked fresh daily.', cat: 'Bakery', price: 99.00, veg: 1, img: 'https://images.unsplash.com/photo-1555507036-ab1f4038808a?w=800&auto=format&fit=crop&q=80' },
        ]
      },
      // 13. Hyderabad Grill House
      {
        restaurant: 'Hyderabad Grill House',
        items: [
          { name: 'Classic Chicken Shawarma Roll', desc: 'Slow-roasted marinated chicken carved from the vertical spit, rolled in pita with garlic toum and pickles.', cat: 'Shawarma', price: 149.00, veg: 0, img: 'https://images.unsplash.com/photo-1555939594-58d7cb561ad1?w=800&auto=format&fit=crop&q=80' },
          { name: 'Jumbo Meat-Only Shawarma', desc: 'Extra portion of succulent roasted chicken, double toum, wrapped in fluffy rumali bread without veggies.', cat: 'Shawarma', price: 199.00, veg: 0, img: 'https://images.unsplash.com/photo-1555939594-58d7cb561ad1?w=800&auto=format&fit=crop&q=80' },
          { name: 'Grilled BBQ Chicken Quarter', desc: 'Charcoal grilled chicken quarter glazed with smoky barbecue sauce and served with fries.', cat: 'Grills', price: 219.00, veg: 0, img: 'https://images.unsplash.com/photo-1555939594-58d7cb561ad1?w=800&auto=format&fit=crop&q=80' },
          { name: 'Falafel Plate with Hummus', desc: 'Crispy chickpea falafel patties served with creamy tahini hummus and warm pita bread.', cat: 'Platters', price: 179.00, veg: 1, img: 'https://images.unsplash.com/photo-1540420773420-3366772f4999?w=800&auto=format&fit=crop&q=80' },
          { name: 'Mixed Grill Platter', desc: 'Combination of chicken seekh, malai tikka, mutton kebab, and grilled wings with garlic dip.', cat: 'Platters', price: 499.00, veg: 0, img: 'https://images.unsplash.com/photo-1555939594-58d7cb561ad1?w=800&auto=format&fit=crop&q=80' },
          { name: 'Spicy Peri Peri French Fries', desc: 'Crispy salted potato fries tossed in fiery African peri peri spice blend.', cat: 'Sides', price: 99.00, veg: 1, img: 'https://images.unsplash.com/photo-1576107232684-1279f3908594?w=800&auto=format&fit=crop&q=80' },
          { name: 'Al Faham Chicken (Half)', desc: 'Arabian spiced charcoal grilled half chicken served with kuboos and garlic dip.', cat: 'Grills', price: 279.00, veg: 0, img: 'https://images.unsplash.com/photo-1555939594-58d7cb561ad1?w=800&auto=format&fit=crop&q=80' },
          { name: 'Garlic Toum Dip Extra', desc: 'Fluffy authentic Lebanese garlic and olive oil emulsion.', cat: 'Sides', price: 39.00, veg: 1, img: 'https://images.unsplash.com/photo-1540420773420-3366772f4999?w=800&auto=format&fit=crop&q=80' },
          { name: 'Baklava (2 pcs)', desc: 'Layers of crisp filo pastry filled with chopped nuts and sweetened with fragrant syrup.', cat: 'Desserts', price: 139.00, veg: 1, img: 'https://images.unsplash.com/photo-1551024709-8f23befc6f87?w=800&auto=format&fit=crop&q=80' },
          { name: 'Mint Lemonade Chiller', desc: 'Blended fresh mint leaves, lime juice, and crushed ice.', cat: 'Beverages', price: 79.00, veg: 1, img: 'https://images.unsplash.com/photo-1513558161293-cdaf765ed2fd?w=800&auto=format&fit=crop&q=80' },
          { name: 'Kuboos Bread (2 pcs)', desc: 'Traditional round Arabian flatbread baked in high heat oven.', cat: 'Breads', price: 30.00, veg: 1, img: 'https://images.unsplash.com/photo-1517244683847-7456b63c5969?w=800&auto=format&fit=crop&q=80' },
        ]
      },
      // 14. Pearl City Kitchen
      {
        restaurant: 'Pearl City Kitchen',
        items: [
          { name: 'Bagara Rice with Dalcha', desc: 'Hyderabadi style seasoned tempered rice served with slow-cooked lentil and mutton/bottle gourd gravy.', cat: 'Rice', price: 219.00, veg: 0, img: 'https://images.unsplash.com/photo-1589302168068-964664d93dc0?w=800&auto=format&fit=crop&q=80' },
          { name: 'Natukodi Pulusu (Country Chicken)', desc: 'Rustic Rayalaseema country chicken curry with crushed black pepper and poppy seeds.', cat: 'Main Course', price: 359.00, veg: 0, img: 'https://images.unsplash.com/photo-1546833999-b9f581a1996d?w=800&auto=format&fit=crop&q=80' },
          { name: 'Ragi Mudde with Chicken Curry', desc: 'Wholesome finger millet balls served with fiery spicy chicken gravy.', cat: 'Main Course', price: 249.00, veg: 0, img: 'https://images.unsplash.com/photo-1589302168068-964664d93dc0?w=800&auto=format&fit=crop&q=80' },
          { name: 'Gongura Royyalu (Prawns)', desc: 'Fresh prawns cooked in tangy gongura sorrel paste with green chillies and garlic.', cat: 'Seafood', price: 399.00, veg: 0, img: 'https://images.unsplash.com/photo-1555939594-58d7cb561ad1?w=800&auto=format&fit=crop&q=80' },
          { name: 'Paneer 65', desc: 'Crispy cottage cheese cubes tossed with curry leaves, crushed garlic, and red chili sauce.', cat: 'Starters', price: 239.00, veg: 1, img: 'https://images.unsplash.com/photo-1567188040759-fb8a883dc6d8?w=800&auto=format&fit=crop&q=80' },
          { name: 'Royyala Vepudu (Prawns Fry)', desc: 'Dry spicy pan-fried prawns tossed with onions, green chillies, and roasted coriander powder.', cat: 'Starters', price: 379.00, veg: 0, img: 'https://images.unsplash.com/photo-1555939594-58d7cb561ad1?w=800&auto=format&fit=crop&q=80' },
          { name: 'Gutti Vankaya Kura (Stuffed Brinjal)', desc: 'Small eggplants stuffed with roasted peanut, sesame, and coconut masala cooked in thick gravy.', cat: 'Main Course', price: 199.00, veg: 1, img: 'https://images.unsplash.com/photo-1546833999-b9f581a1996d?w=800&auto=format&fit=crop&q=80' },
          { name: 'Sambar Rice with Ghee', desc: 'Homestyle comfort rice cooked together with lentils and vegetables, topped with hot ghee.', cat: 'Rice', price: 129.00, veg: 1, img: 'https://images.unsplash.com/photo-1589302168068-964664d93dc0?w=800&auto=format&fit=crop&q=80' },
          { name: 'Junnu (Colostrum Pudding)', desc: 'Traditional steamed milk delicacy infused with black pepper and cardamom.', cat: 'Desserts', price: 99.00, veg: 1, img: 'https://images.unsplash.com/photo-1551024709-8f23befc6f87?w=800&auto=format&fit=crop&q=80' },
          { name: 'Majjiga (Spiced Buttermilk)', desc: 'Chilled spiced buttermilk with crushed ginger and coriander leaves.', cat: 'Beverages', price: 40.00, veg: 1, img: 'https://images.unsplash.com/photo-1513558161293-cdaf765ed2fd?w=800&auto=format&fit=crop&q=80' },
          { name: 'Jowar Roti (2 pcs)', desc: 'Healthy gluten-free sorghum flatbread patted by hand and roasted on iron skillet.', cat: 'Breads', price: 50.00, veg: 1, img: 'https://images.unsplash.com/photo-1517244683847-7456b63c5969?w=800&auto=format&fit=crop&q=80' },
        ]
      },
      // 15. Biryani Junction
      {
        restaurant: 'Biryani Junction',
        items: [
          { name: 'Boneless Chicken Biryani', desc: 'Tender boneless chicken pieces layered with saffron dum rice, served with salan and raita.', cat: 'Biryani', price: 369.00, veg: 0, img: 'https://images.unsplash.com/photo-1563379091339-03b21ab4a4f8?w=800&auto=format&fit=crop&q=80' },
          { name: 'Ulavacharu Chicken Biryani', desc: 'Signature biryani cooked with horse gram reduction for an unforgettable tangy and earthy flavour.', cat: 'Biryani', price: 389.00, veg: 0, img: 'https://images.unsplash.com/photo-1633945274405-b6c8069047b0?w=800&auto=format&fit=crop&q=80' },
          { name: 'Veg Dum Biryani Family Pack', desc: 'Generous pot of garden vegetables and paneer dum biryani with 2 salan and 2 raita.', cat: 'Biryani', price: 549.00, veg: 1, img: 'https://images.unsplash.com/photo-1589302168068-964664d93dc0?w=800&auto=format&fit=crop&q=80' },
          { name: 'Kaju Paneer Biryani', desc: 'Roasted whole cashew nuts and soft paneer cubes layered in fragrant long grain basmati rice.', cat: 'Biryani', price: 329.00, veg: 1, img: 'https://images.unsplash.com/photo-1589302168068-964664d93dc0?w=800&auto=format&fit=crop&q=80' },
          { name: 'Chicken Majestic', desc: 'Thin strips of chicken breast tossed in green chili, curd, and mint marinade, dry pan-fried.', cat: 'Starters', price: 279.00, veg: 0, img: 'https://images.unsplash.com/photo-1626777552726-4a6b54c97e46?w=800&auto=format&fit=crop&q=80' },
          { name: 'Dragon Chicken', desc: 'Crispy fried chicken strips tossed in spicy red chili paste with cashew nuts and capsicum.', cat: 'Starters', price: 289.00, veg: 0, img: 'https://images.unsplash.com/photo-1603894584373-5ac82b2ae398?w=800&auto=format&fit=crop&q=80' },
          { name: 'Crispy Corn Pepper Salt', desc: 'Golden batter fried sweet corn kernels tossed with cracked black pepper, garlic, and spring onions.', cat: 'Starters', price: 189.00, veg: 1, img: 'https://images.unsplash.com/photo-1546833999-b9f581a1996d?w=800&auto=format&fit=crop&q=80' },
          { name: 'Onion Raita Extra Bowl', desc: 'Whisked fresh curd with crunchy diced onions, green chillies, and roasted cumin.', cat: 'Sides', price: 49.00, veg: 1, img: 'https://images.unsplash.com/photo-1540420773420-3366772f4999?w=800&auto=format&fit=crop&q=80' },
          { name: 'Matka Phirni', desc: 'Creamy ground rice pudding slow-simmered in milk with saffron, set in traditional clay pot.', cat: 'Desserts', price: 119.00, veg: 1, img: 'https://images.unsplash.com/photo-1551024709-8f23befc6f87?w=800&auto=format&fit=crop&q=80' },
          { name: 'Thums Up (750ml)', desc: 'The iconic thunderous Indian cola bottle.', cat: 'Beverages', price: 50.00, veg: 1, img: 'https://images.unsplash.com/photo-1513558161293-cdaf765ed2fd?w=800&auto=format&fit=crop&q=80' },
          { name: 'Kebab Platter Combo', desc: 'Tandoori chicken, chicken tikka, and reshmi kebab served with mint sauce and onion salad.', cat: 'Starters', price: 449.00, veg: 0, img: 'https://images.unsplash.com/photo-1555939594-58d7cb561ad1?w=800&auto=format&fit=crop&q=80' },
        ]
      },
      // 16. Chai & Samosa Junction
      {
        restaurant: 'Chai & Samosa Junction',
        items: [
          { name: 'Punjabi Aloo Samosa (2 pcs)', desc: 'Crispy pastry pyramids stuffed with spiced potatoes, green peas, and whole coriander seeds.', cat: 'Snacks', price: 50.00, veg: 1, img: 'https://images.unsplash.com/photo-1561047029-3000c68339ca?w=800&auto=format&fit=crop&q=80' },
          { name: 'Cheese Corn Samosa (2 pcs)', desc: 'Golden triangles filled with molten mozzarella, sweet corn, and herbs.', cat: 'Snacks', price: 70.00, veg: 1, img: 'https://images.unsplash.com/photo-1561047029-3000c68339ca?w=800&auto=format&fit=crop&q=80' },
          { name: 'Pyaaz Kachori with Chutney', desc: 'Flaky deep-fried Rajasthani pastry stuffed with spicy onion filling and tamarind chutney.', cat: 'Snacks', price: 45.00, veg: 1, img: 'https://images.unsplash.com/photo-1561047029-3000c68339ca?w=800&auto=format&fit=crop&q=80' },
          { name: 'Bread Pakoda with Paneer', desc: 'Batter fried sandwich stuffed with spiced potato and thick slice of cottage cheese.', cat: 'Snacks', price: 60.00, veg: 1, img: 'https://images.unsplash.com/photo-1561047029-3000c68339ca?w=800&auto=format&fit=crop&q=80' },
          { name: 'Special Masala Chai Flask (500ml)', desc: 'Brewed with crushed ginger, cardamom, cinnamon, and cloves, serves 4.', cat: 'Beverages', price: 120.00, veg: 1, img: 'https://images.unsplash.com/photo-1561047029-3000c68339ca?w=800&auto=format&fit=crop&q=80' },
          { name: 'Elaichi Chai Flask (500ml)', desc: 'Fragrant green cardamom infused milk tea, serves 4.', cat: 'Beverages', price: 110.00, veg: 1, img: 'https://images.unsplash.com/photo-1561047029-3000c68339ca?w=800&auto=format&fit=crop&q=80' },
          { name: 'Bun Maska with Jam', desc: 'Soft warm bun smeared generously with Amul butter and mixed fruit jam.', cat: 'Snacks', price: 55.00, veg: 1, img: 'https://images.unsplash.com/photo-1509722747041-616f39b57569?w=800&auto=format&fit=crop&q=80' },
          { name: 'Kanda Bhaji (Onion Pakoda)', desc: 'Crispy fried shredded onion fritters seasoned with carom seeds and green chillies.', cat: 'Snacks', price: 70.00, veg: 1, img: 'https://images.unsplash.com/photo-1561047029-3000c68339ca?w=800&auto=format&fit=crop&q=80' },
          { name: 'Jalebi (100g)', desc: 'Crispy fried fermented flour spirals soaked in fragrant saffron sugar syrup.', cat: 'Desserts', price: 60.00, veg: 1, img: 'https://images.unsplash.com/photo-1551024709-8f23befc6f87?w=800&auto=format&fit=crop&q=80' },
          { name: 'Sweet Lassi Kulhad', desc: 'Chilled sweet churned yogurt served in earthy clay cup.', cat: 'Beverages', price: 65.00, veg: 1, img: 'https://images.unsplash.com/photo-1513558161293-cdaf765ed2fd?w=800&auto=format&fit=crop&q=80' },
          { name: 'Samosa Chaat Platter', desc: 'Crushed samosas topped with spicy chole, sweetened yogurt, chutneys, and sev.', cat: 'Chaat', price: 95.00, veg: 1, img: 'https://images.unsplash.com/photo-1626777552726-4a6b54c97e46?w=800&auto=format&fit=crop&q=80' },
        ]
      }
    ];

    let totalMenuItems = 0;
    const menuItemsByRestaurant: { [restId: number]: Array<{ id: number; name: string; price: number }> } = {};

    for (const group of menuTemplate) {
      const restId = restaurantMap[group.restaurant];
      if (!restId) continue;
      menuItemsByRestaurant[restId] = [];

      for (const item of group.items) {
        const [[existingItem]]: any = await connection.query(
          `SELECT id FROM menu_items WHERE restaurant_id = ? AND name = ? LIMIT 1;`,
          [restId, item.name]
        );

        let menuItemId: number;
        if (existingItem) {
          menuItemId = existingItem.id;
          await connection.query(
            `UPDATE menu_items SET description=?, category=?, price=?, image_url=?, is_veg=? WHERE id=?;`,
            [item.desc, item.cat, item.price, item.img, item.veg, menuItemId]
          );
        } else {
          const [res]: any = await connection.query(
            `INSERT INTO menu_items (restaurant_id, name, description, category, price, image_url, is_veg, is_available)
             VALUES (?, ?, ?, ?, ?, ?, ?, 1);`,
            [restId, item.name, item.desc, item.cat, item.price, item.img, item.veg]
          );
          menuItemId = res.insertId;
        }

        menuItemsByRestaurant[restId].push({ id: menuItemId, name: item.name, price: item.price });
        totalMenuItems++;
      }
    }
    console.log(`[QuickBite Seeder] Inserted/verified ${totalMenuItems} menu items across ${restaurantsData.length} restaurants.`);

    // ------------------------------------------------------------
    // 5. SEED ORDERS & ORDER ITEMS (35 Orders with realistic status, items & math)
    // ------------------------------------------------------------
    // Clear existing demo orders to ensure repeatable pristine state without duplicates
    await connection.query('DELETE FROM order_items;');
    await connection.query('DELETE FROM orders;');

    const customerEmails = usersData.filter(u => u.role === 'CUSTOMER').map(u => u.email);
    const restaurantNames = restaurantsData.filter(r => r.is_open === 1).map(r => r.name);

    const orderStatuses: Array<'PLACED' | 'CONFIRMED' | 'PREPARING' | 'OUT_FOR_DELIVERY' | 'DELIVERED' | 'CANCELLED'> = [
      'PLACED', 'PLACED', 'PLACED', 'PLACED', 'PLACED',
      'CONFIRMED', 'CONFIRMED', 'CONFIRMED', 'CONFIRMED', 'CONFIRMED',
      'PREPARING', 'PREPARING', 'PREPARING', 'PREPARING', 'PREPARING', 'PREPARING',
      'OUT_FOR_DELIVERY', 'OUT_FOR_DELIVERY', 'OUT_FOR_DELIVERY', 'OUT_FOR_DELIVERY', 'OUT_FOR_DELIVERY', 'OUT_FOR_DELIVERY',
      'DELIVERED', 'DELIVERED', 'DELIVERED', 'DELIVERED', 'DELIVERED', 'DELIVERED', 'DELIVERED', 'DELIVERED', 'DELIVERED', 'DELIVERED',
      'CANCELLED', 'CANCELLED', 'CANCELLED'
    ];

    const paymentStatuses: Array<'PENDING' | 'PAID' | 'COD' | 'FAILED'> = [
      'PAID', 'PAID', 'COD', 'PAID', 'COD',
      'PAID', 'COD', 'PAID', 'PAID', 'COD',
      'PAID', 'PAID', 'COD', 'PAID', 'PAID', 'COD',
      'PAID', 'COD', 'PAID', 'COD', 'PAID', 'PAID',
      'PAID', 'PAID', 'COD', 'PAID', 'PAID', 'PAID', 'COD', 'PAID', 'PAID', 'PAID',
      'FAILED', 'PENDING', 'FAILED'
    ];

    let orderCount = 0;
    let orderItemCount = 0;

    for (let i = 0; i < orderStatuses.length; i++) {
      const customerEmail = customerEmails[i % customerEmails.length];
      const userId = userMap[customerEmail];
      const userAddresses = customerAddressMap[userId];
      const deliveryAddressId = userAddresses[i % userAddresses.length];

      const restName = restaurantNames[i % restaurantNames.length];
      const restId = restaurantMap[restName];
      const availableItems = menuItemsByRestaurant[restId];

      if (!availableItems || availableItems.length === 0) continue;

      // Select 1 to 3 distinct menu items from this restaurant
      const numItems = (i % 3) + 1;
      const selectedItems: Array<{ id: number; price: number; quantity: number }> = [];

      for (let j = 0; j < numItems; j++) {
        const itemIdx = (i + j) % availableItems.length;
        const item = availableItems[itemIdx];
        const quantity = (j === 0 && i % 2 === 0) ? 2 : 1;
        selectedItems.push({ id: item.id, price: item.price, quantity });
      }

      // Calculate exact total_amount = sum(price * quantity)
      const totalAmount = selectedItems.reduce((acc, curr) => acc + (curr.price * curr.quantity), 0);

      const status = orderStatuses[i];
      const paymentStatus = paymentStatuses[i];

      // Realistic past timestamps
      // DELIVERED: 1-5 days ago, IN PROGRESS: 10-45 mins ago, PLACED: 2-10 mins ago
      let minutesAgo = 10;
      if (status === 'DELIVERED' || status === 'CANCELLED') {
        minutesAgo = 60 * 24 * ((i % 5) + 1); // 1-5 days ago
      } else if (status === 'OUT_FOR_DELIVERY') {
        minutesAgo = 25;
      } else if (status === 'PREPARING') {
        minutesAgo = 15;
      } else if (status === 'CONFIRMED') {
        minutesAgo = 8;
      } else {
        minutesAgo = 3;
      }

      const [orderRes]: any = await connection.query(
        `INSERT INTO orders (user_id, restaurant_id, total_amount, delivery_address_id, status, payment_status, created_at, updated_at)
         VALUES (?, ?, ?, ?, ?, ?, DATE_SUB(NOW(), INTERVAL ? MINUTE), DATE_SUB(NOW(), INTERVAL ? MINUTE));`,
        [userId, restId, totalAmount, deliveryAddressId, status, paymentStatus, minutesAgo, Math.max(0, minutesAgo - 5)]
      );

      const orderId = orderRes.insertId;
      orderCount++;

      for (const item of selectedItems) {
        const subtotal = item.price * item.quantity;
        await connection.query(
          `INSERT INTO order_items (order_id, menu_item_id, quantity, price, subtotal)
           VALUES (?, ?, ?, ?, ?);`,
          [orderId, item.id, item.quantity, item.price, subtotal]
        );
        orderItemCount++;
      }
    }

    console.log(`[QuickBite Seeder] Inserted ${orderCount} orders and ${orderItemCount} order items.`);

    await connection.commit();
    console.log('[QuickBite Seeder] Transaction successfully committed.');

    // ------------------------------------------------------------
    // 6. GENERATE STANDALONE database/seed.sql FILE
    // ------------------------------------------------------------
    console.log('[QuickBite Seeder] Exporting database/seed.sql for standalone execution...');

    let sqlDump = `-- ============================================================\n`;
    sqlDump += `-- QUICKBITE SYNTHETIC DEMONSTRATION SEED DATA\n`;
    sqlDump += `-- Database: quickbite_db\n`;
    sqlDump += `-- Generated: ${new Date().toISOString()}\n`;
    sqlDump += `-- Default Demo Password for All Accounts: ${DEMO_PASSWORD}\n`;
    sqlDump += `-- ============================================================\n\n`;
    sqlDump += `USE quickbite_db;\n\n`;
    sqlDump += `SET FOREIGN_KEY_CHECKS = 0;\n\n`;

    // Dump users
    sqlDump += `-- ------------------------------------------------------------\n-- USERS (${usersData.length} records)\n-- ------------------------------------------------------------\n`;
    sqlDump += `INSERT INTO users (name, email, password_hash, phone, role) VALUES\n`;
    sqlDump += usersData.map(u => 
      `  (${mysql.escape(u.name)}, ${mysql.escape(u.email)}, ${mysql.escape(passwordHash)}, ${mysql.escape(u.phone)}, ${mysql.escape(u.role)})`
    ).join(',\n') + `\nON DUPLICATE KEY UPDATE name=VALUES(name), phone=VALUES(phone), role=VALUES(role), password_hash=VALUES(password_hash);\n\n`;

    // Dump restaurants
    sqlDump += `-- ------------------------------------------------------------\n-- RESTAURANTS (${restaurantsData.length} records)\n-- ------------------------------------------------------------\n`;
    sqlDump += `INSERT INTO restaurants (name, description, cuisine, address, area, city, rating, delivery_time, price_for_two, image_url, is_open) VALUES\n`;
    sqlDump += restaurantsData.map(r => 
      `  (${mysql.escape(r.name)}, ${mysql.escape(r.description)}, ${mysql.escape(r.cuisine)}, ${mysql.escape(r.address)}, ${mysql.escape(r.area)}, ${mysql.escape(r.city)}, ${r.rating}, ${mysql.escape(r.delivery_time)}, ${r.price_for_two}, ${mysql.escape(r.image_url)}, ${r.is_open})`
    ).join(',\n') + `\nON DUPLICATE KEY UPDATE description=VALUES(description), rating=VALUES(rating);\n\n`;

    // Dump menu_items from database query
    const [savedMenuItems]: any = await connection.query('SELECT * FROM menu_items ORDER BY id;');
    sqlDump += `-- ------------------------------------------------------------\n-- MENU ITEMS (${savedMenuItems.length} records)\n-- ------------------------------------------------------------\n`;
    sqlDump += `INSERT INTO menu_items (restaurant_id, name, description, category, price, image_url, is_veg, is_available) VALUES\n`;
    sqlDump += savedMenuItems.map((m: any) => 
      `  (${m.restaurant_id}, ${mysql.escape(m.name)}, ${mysql.escape(m.description)}, ${mysql.escape(m.category)}, ${m.price}, ${mysql.escape(m.image_url)}, ${m.is_veg}, ${m.is_available})`
    ).join(',\n') + `;\n\n`;

    // Dump addresses from database query
    const [savedAddresses]: any = await connection.query('SELECT * FROM addresses ORDER BY id;');
    sqlDump += `-- ------------------------------------------------------------\n-- ADDRESSES (${savedAddresses.length} records)\n-- ------------------------------------------------------------\n`;
    sqlDump += `INSERT INTO addresses (user_id, address_line, area, city, state, pincode) VALUES\n`;
    sqlDump += savedAddresses.map((a: any) => 
      `  (${a.user_id}, ${mysql.escape(a.address_line)}, ${mysql.escape(a.area)}, ${mysql.escape(a.city)}, ${mysql.escape(a.state)}, ${mysql.escape(a.pincode)})`
    ).join(',\n') + `;\n\n`;

    // Dump orders from database query
    const [savedOrders]: any = await connection.query('SELECT * FROM orders ORDER BY id;');
    sqlDump += `-- ------------------------------------------------------------\n-- ORDERS (${savedOrders.length} records)\n-- ------------------------------------------------------------\n`;
    sqlDump += `INSERT INTO orders (id, user_id, restaurant_id, total_amount, delivery_address_id, status, payment_status, created_at, updated_at) VALUES\n`;
    sqlDump += savedOrders.map((o: any) => 
      `  (${o.id}, ${o.user_id}, ${o.restaurant_id}, ${o.total_amount}, ${o.delivery_address_id}, ${mysql.escape(o.status)}, ${mysql.escape(o.payment_status)}, ${mysql.escape(o.created_at)}, ${mysql.escape(o.updated_at)})`
    ).join(',\n') + `;\n\n`;

    // Dump order_items from database query
    const [savedOrderItems]: any = await connection.query('SELECT * FROM order_items ORDER BY id;');
    sqlDump += `-- ------------------------------------------------------------\n-- ORDER ITEMS (${savedOrderItems.length} records)\n-- ------------------------------------------------------------\n`;
    sqlDump += `INSERT INTO order_items (order_id, menu_item_id, quantity, price, subtotal) VALUES\n`;
    sqlDump += savedOrderItems.map((oi: any) => 
      `  (${oi.order_id}, ${oi.menu_item_id}, ${oi.quantity}, ${oi.price}, ${oi.subtotal})`
    ).join(',\n') + `;\n\n`;

    sqlDump += `SET FOREIGN_KEY_CHECKS = 1;\n`;

    fs.writeFileSync(path.resolve(process.cwd(), 'database', 'seed.sql'), sqlDump, 'utf8');
    console.log('[QuickBite Seeder] database/seed.sql generated successfully.');

  } catch (error: any) {
    await connection.rollback();
    console.error('[QuickBite Seeder ERROR]:', error.message || error);
    process.exit(1);
  } finally {
    await connection.end();
  }
}

seedDatabase();
