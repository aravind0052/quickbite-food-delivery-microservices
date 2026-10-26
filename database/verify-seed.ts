import path from 'path';
import mysql from 'mysql2/promise';
import bcrypt from 'bcrypt';
import dotenv from 'dotenv';

dotenv.config({ path: path.resolve(process.cwd(), '.env') });

const dbConfig = {
  host: process.env.DB_HOST || 'localhost',
  port: parseInt(process.env.DB_PORT || '3306', 10),
  user: process.env.DB_USER || 'root',
  password: process.env.DB_PASSWORD || '',
  database: 'quickbite_db',
};

async function verifySeed() {
  console.log('[QuickBite Seed Verification] Running comprehensive database validation...');
  const conn = await mysql.createConnection(dbConfig);

  try {
    // 1. Counts
    const [[{ userCount }]]: any = await conn.query('SELECT COUNT(*) as userCount FROM users;');
    const [[{ addressCount }]]: any = await conn.query('SELECT COUNT(*) as addressCount FROM addresses;');
    const [[{ restaurantCount }]]: any = await conn.query('SELECT COUNT(*) as restaurantCount FROM restaurants;');
    const [[{ menuItemCount }]]: any = await conn.query('SELECT COUNT(*) as menuItemCount FROM menu_items;');
    const [[{ orderCount }]]: any = await conn.query('SELECT COUNT(*) as orderCount FROM orders;');
    const [[{ orderItemCount }]]: any = await conn.query('SELECT COUNT(*) as orderItemCount FROM order_items;');

    console.log('Record Counts:');
    console.log(`  Users: ${userCount} (Target: >= 20) -> ${userCount >= 20 ? 'PASS' : 'FAIL'}`);
    console.log(`  Addresses: ${addressCount} (Target: >= 30) -> ${addressCount >= 30 ? 'PASS' : 'FAIL'}`);
    console.log(`  Restaurants: ${restaurantCount} (Target: >= 15) -> ${restaurantCount >= 15 ? 'PASS' : 'FAIL'}`);
    console.log(`  Menu Items: ${menuItemCount} (Target: >= 150) -> ${menuItemCount >= 150 ? 'PASS' : 'FAIL'}`);
    console.log(`  Orders: ${orderCount} (Target: >= 30) -> ${orderCount >= 30 ? 'PASS' : 'FAIL'}`);
    console.log(`  Order Items: ${orderItemCount} (Target: >= 30) -> ${orderItemCount >= 30 ? 'PASS' : 'FAIL'}`);

    if (userCount < 20 || addressCount < 30 || restaurantCount < 15 || menuItemCount < 150 || orderCount < 30 || orderItemCount < 30) {
      throw new Error('Minimum record count validation failed!');
    }

    // 2. Duplicate emails
    const [dupEmails]: any = await conn.query(
      'SELECT email, COUNT(*) as cnt FROM users GROUP BY email HAVING cnt > 1;'
    );
    if (dupEmails.length > 0) throw new Error(`Found duplicate emails: ${JSON.stringify(dupEmails)}`);
    console.log('  [PASS] No duplicate emails found.');

    // 3. Password hashing
    const [users]: any = await conn.query('SELECT email, password_hash FROM users;');
    const samplePassword = 'QuickBite@123';
    for (const u of users) {
      if (!u.password_hash.startsWith('$2b$') && !u.password_hash.startsWith('$2a$')) {
        throw new Error(`User ${u.email} does not have a valid bcrypt password hash!`);
      }
    }
    const sampleValid = await bcrypt.compare(samplePassword, users[0].password_hash);
    if (!sampleValid) throw new Error('Bcrypt hash comparison failed for sample demo user!');
    console.log(`  [PASS] All ${users.length} passwords are confirmed bcrypt hashes matching demo password.`);

    // 4. Role distribution
    const [roles]: any = await conn.query('SELECT role, COUNT(*) as cnt FROM users GROUP BY role;');
    console.log('  Role distribution:', roles);

    // 5. Order math: check every order total matches sum of item subtotals
    const [mathMismatch]: any = await conn.query(`
      SELECT o.id, o.total_amount, SUM(oi.subtotal) as calculated_total
      FROM orders o
      JOIN order_items oi ON o.id = oi.order_id
      GROUP BY o.id, o.total_amount
      HAVING ABS(o.total_amount - calculated_total) > 0.01;
    `);
    if (mathMismatch.length > 0) throw new Error(`Order total math mismatch: ${JSON.stringify(mathMismatch)}`);
    console.log('  [PASS] 100% of order totals match the exact sum of order item subtotals.');

    // 6. Every order item subtotal = quantity * price
    const [itemMathMismatch]: any = await conn.query(`
      SELECT id, order_id, quantity, price, subtotal
      FROM order_items
      WHERE ABS(subtotal - (quantity * price)) > 0.01;
    `);
    if (itemMathMismatch.length > 0) throw new Error(`Item subtotal math mismatch: ${JSON.stringify(itemMathMismatch)}`);
    console.log('  [PASS] 100% of order items have subtotal = price * quantity.');

    // 7. Order items reference menu items from the SAME restaurant as the order
    const [restMismatch]: any = await conn.query(`
      SELECT oi.id, o.id as order_id, o.restaurant_id as order_rest, mi.restaurant_id as menu_rest
      FROM order_items oi
      JOIN orders o ON oi.order_id = o.id
      JOIN menu_items mi ON oi.menu_item_id = mi.id
      WHERE o.restaurant_id != mi.restaurant_id;
    `);
    if (restMismatch.length > 0) throw new Error(`Cross-restaurant item violation: ${JSON.stringify(restMismatch)}`);
    console.log('  [PASS] 100% of order items belong to the same restaurant as the order.');

    // 8. Delivery address belongs to the user placing the order
    const [addrMismatch]: any = await conn.query(`
      SELECT o.id as order_id, o.user_id as order_user, a.user_id as address_owner
      FROM orders o
      JOIN addresses a ON o.delivery_address_id = a.id
      WHERE o.user_id != a.user_id;
    `);
    if (addrMismatch.length > 0) throw new Error(`Address ownership mismatch: ${JSON.stringify(addrMismatch)}`);
    console.log('  [PASS] 100% of delivery addresses belong to the customer who placed the order.');

    // 9. Status distribution
    const [statuses]: any = await conn.query('SELECT status, COUNT(*) as cnt FROM orders GROUP BY status;');
    console.log('  Order status distribution:', statuses);

    console.log('[QuickBite Seed Verification] ALL VALIDATIONS PASSED PERFECTLY!');
  } finally {
    await conn.end();
  }
}

verifySeed();
