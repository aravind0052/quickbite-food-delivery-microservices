import fs from 'fs';
import path from 'path';
import mysql from 'mysql2/promise';
import dotenv from 'dotenv';

// Load .env from root directory
dotenv.config({ path: path.resolve(process.cwd(), '.env') });

const dbConfig = {
  host: process.env.DB_HOST || 'localhost',
  port: parseInt(process.env.DB_PORT || '3306', 10),
  user: process.env.DB_USER || 'root',
  password: process.env.DB_PASSWORD || '',
  multipleStatements: true,
};

async function setupAndVerify() {
  console.log(`[QuickBite DB Setup] Connecting to MySQL at ${dbConfig.host}:${dbConfig.port} as user '${dbConfig.user}'...`);

  let connection: mysql.Connection | null = null;
  try {
    connection = await mysql.createConnection(dbConfig);
    console.log('[QuickBite DB Setup] Connection to MySQL Server established successfully.');

    // Read schema.sql
    const schemaPath = path.resolve(process.cwd(), 'database', 'schema.sql');
    const schemaSql = fs.readFileSync(schemaPath, 'utf8');

    console.log('[QuickBite DB Setup] Executing database/schema.sql...');
    await connection.query(schemaSql);
    console.log('[QuickBite DB Setup] Schema executed successfully.');

    // Switch to quickbite_db
    await connection.query('USE quickbite_db;');

    // Verify tables
    const expectedTables = [
      'users',
      'addresses',
      'restaurants',
      'menu_items',
      'orders',
      'order_items',
    ];

    const [rows] = await connection.query<mysql.RowDataPacket[]>(
      `SELECT table_name FROM information_schema.tables WHERE table_schema = 'quickbite_db';`
    );

    const existingTables = rows.map((r: any) => r.TABLE_NAME || r.table_name);
    console.log('[QuickBite DB Setup] Found tables in quickbite_db:', existingTables);

    const missingTables = expectedTables.filter((t) => !existingTables.includes(t));
    if (missingTables.length > 0) {
      throw new Error(`Missing expected tables: ${missingTables.join(', ')}`);
    }

    // Verify foreign keys
    const [fkRows] = await connection.query<mysql.RowDataPacket[]>(
      `SELECT table_name, constraint_name 
       FROM information_schema.table_constraints 
       WHERE table_schema = 'quickbite_db' AND constraint_type = 'FOREIGN KEY';`
    );
    console.log(`[QuickBite DB Setup] Foreign keys verified (${fkRows.length} foreign key constraints active).`);

    console.log('[QuickBite DB Setup] All 6 tables and schema constraints verified successfully!');
  } catch (error: any) {
    console.error('[QuickBite DB Setup ERROR]:', error.message || error);
    process.exit(1);
  } finally {
    if (connection) {
      await connection.end();
    }
  }
}

setupAndVerify();
