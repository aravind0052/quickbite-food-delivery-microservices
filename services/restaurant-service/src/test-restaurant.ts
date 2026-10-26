process.env.NODE_ENV = 'test';
import app from './index.js';
import { pool } from './db.js';
import http from 'http';

const PORT = 3097;
let server: http.Server;

async function runTests() {
  console.log('[Restaurant Service Test] Starting integration tests...');
  server = app.listen(PORT);

  const baseUrl = `http://localhost:${PORT}`;

  try {
    // 1. Health check
    console.log('\n--- 1. Testing GET /health ---');
    const healthRes = await fetch(`${baseUrl}/health`);
    const healthData: any = await healthRes.json();
    console.log('Health response:', healthData);
    if (healthRes.status !== 200 || healthData.status !== 'UP' || healthData.database !== 'CONNECTED') {
      throw new Error(`Health check failed: ${JSON.stringify(healthData)}`);
    }
    console.log('✔ Health check passed');

    // 2. GET /restaurants
    console.log('\n--- 2. Testing GET /restaurants ---');
    const listRes = await fetch(`${baseUrl}/restaurants`);
    const listData: any = await listRes.json();
    console.log(`Restaurants fetched: ${listData.count} items`);
    if (listRes.status !== 200 || !listData.success || listData.count < 15) {
      throw new Error(`Expected at least 15 restaurants, got ${listData.count}`);
    }
    console.log('✔ Restaurant listing passed (>= 15 restaurants)');

    // 3. GET /restaurants/:id
    console.log('\n--- 3. Testing GET /restaurants/1 ---');
    const detailRes = await fetch(`${baseUrl}/restaurants/1`);
    const detailData: any = await detailRes.json();
    console.log('Restaurant details:', detailData.data?.name);
    if (detailRes.status !== 200 || !detailData.success || !detailData.data) {
      throw new Error('Failed to fetch restaurant details!');
    }
    console.log('✔ Restaurant details fetched successfully');

    // 4. GET /restaurants/:id/menu
    console.log('\n--- 4. Testing GET /restaurants/1/menu ---');
    const menuRes = await fetch(`${baseUrl}/restaurants/1/menu`);
    const menuData: any = await menuRes.json();
    console.log(`Menu items fetched for restaurant 1: ${menuData.count}`);
    if (menuRes.status !== 200 || !menuData.success || menuData.count < 10) {
      throw new Error(`Expected at least 10 menu items, got ${menuData.count}`);
    }
    console.log('✔ Restaurant menu fetched successfully');

    // 5. GET /restaurants/search?q=Biryani
    console.log('\n--- 5. Testing GET /restaurants/search?q=Biryani ---');
    const searchRes = await fetch(`${baseUrl}/restaurants/search?q=Biryani`);
    const searchData: any = await searchRes.json();
    console.log(`Search for 'Biryani' matched ${searchData.count} restaurants`);
    if (searchRes.status !== 200 || !searchData.success || searchData.count === 0) {
      throw new Error('Search failed to return any restaurants for Biryani!');
    }
    console.log('✔ Search endpoint passed');

    // 6. GET /restaurants/filter?cuisine=South+Indian&minRating=4.5
    console.log('\n--- 6. Testing GET /restaurants/filter?cuisine=South&minRating=4.5 ---');
    const filterRes = await fetch(`${baseUrl}/restaurants/filter?cuisine=South&minRating=4.5`);
    const filterData: any = await filterRes.json();
    console.log(`Filtered restaurants count: ${filterData.count}`);
    if (filterRes.status !== 200 || !filterData.success) {
      throw new Error('Filter request failed!');
    }
    console.log('✔ Filter endpoint passed');

    // 7. POST /restaurants (Create a test restaurant)
    console.log('\n--- 7. Testing POST /restaurants ---');
    const createRes = await fetch(`${baseUrl}/restaurants`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name: 'Auto Test Bistro',
        description: 'Temporary restaurant for automated test verification.',
        cuisine: 'Fusion, Continental',
        address: '999 Innovation Street',
        area: 'Madhapur',
        city: 'Hyderabad',
        rating: 4.2,
        delivery_time: '20-30 min',
        price_for_two: 500.0,
        is_open: 1,
      }),
    });
    const createData: any = await createRes.json();
    console.log('Create restaurant status:', createRes.status, createData.data?.id);
    if (createRes.status !== 201 || !createData.success || !createData.data?.id) {
      throw new Error('Failed to create restaurant!');
    }
    const createdRestId = createData.data.id;
    console.log(`✔ Created test restaurant with ID ${createdRestId}`);

    // 8. PUT /restaurants/:id (Update restaurant)
    console.log('\n--- 8. Testing PUT /restaurants/:id ---');
    const updateRes = await fetch(`${baseUrl}/restaurants/${createdRestId}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        rating: 4.8,
        delivery_time: '15-25 min',
      }),
    });
    const updateData: any = await updateRes.json();
    console.log('Update restaurant status:', updateRes.status, updateData.data?.rating);
    if (updateRes.status !== 200 || !updateData.success || Number(updateData.data?.rating) !== 4.8) {
      throw new Error('Failed to update restaurant!');
    }
    console.log('✔ Updated test restaurant successfully');

    // 9. POST /restaurants/:id/menu (Create a menu item)
    console.log('\n--- 9. Testing POST /restaurants/:id/menu ---');
    const createMenuRes = await fetch(`${baseUrl}/restaurants/${createdRestId}/menu`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name: 'Truffle Mushroom Pasta',
        description: 'Handmade fettuccine in creamy white wine truffle sauce.',
        category: 'Pasta',
        price: 349.0,
        is_veg: 1,
        is_available: 1,
      }),
    });
    const createMenuData: any = await createMenuRes.json();
    console.log('Create menu item status:', createMenuRes.status, createMenuData.data?.id);
    if (createMenuRes.status !== 201 || !createMenuData.success || !createMenuData.data?.id) {
      throw new Error('Failed to create menu item!');
    }
    const createdItemId = createMenuData.data.id;
    console.log(`✔ Created menu item with ID ${createdItemId}`);

    // 10. PUT /menu-items/:id (Update menu item)
    console.log('\n--- 10. Testing PUT /menu-items/:id ---');
    const updateMenuRes = await fetch(`${baseUrl}/menu-items/${createdItemId}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        price: 399.0,
        description: 'Updated gourmet truffle sauce recipe.',
      }),
    });
    const updateMenuData: any = await updateMenuRes.json();
    console.log('Update menu item status:', updateMenuRes.status, updateMenuData.data?.price);
    if (updateMenuRes.status !== 200 || !updateMenuData.success || Number(updateMenuData.data?.price) !== 399.0) {
      throw new Error('Failed to update menu item!');
    }
    console.log('✔ Updated menu item successfully');

    // 11. DELETE /menu-items/:id (Delete menu item)
    console.log('\n--- 11. Testing DELETE /menu-items/:id ---');
    const deleteMenuRes = await fetch(`${baseUrl}/menu-items/${createdItemId}`, {
      method: 'DELETE',
    });
    const deleteMenuData: any = await deleteMenuRes.json();
    console.log('Delete menu item status:', deleteMenuRes.status, deleteMenuData);
    if (deleteMenuRes.status !== 200 || !deleteMenuData.success) {
      throw new Error('Failed to delete menu item!');
    }
    console.log('✔ Deleted menu item successfully');

    // 12. DELETE /restaurants/:id (Delete test restaurant)
    console.log('\n--- 12. Testing DELETE /restaurants/:id ---');
    const deleteRestRes = await fetch(`${baseUrl}/restaurants/${createdRestId}`, {
      method: 'DELETE',
    });
    const deleteRestData: any = await deleteRestRes.json();
    console.log('Delete restaurant status:', deleteRestRes.status, deleteRestData);
    if (deleteRestRes.status !== 200 || !deleteRestData.success) {
      throw new Error('Failed to delete restaurant!');
    }
    console.log('✔ Deleted test restaurant successfully');

    console.log('\n========================================');
    console.log('ALL RESTAURANT SERVICE TESTS PASSED SUCCESSFULLY!');
    console.log('========================================');
  } catch (error) {
    console.error('[Restaurant Service Test ERROR]:', error);
    process.exitCode = 1;
  } finally {
    server.close();
    await pool.end();
    process.exit(process.exitCode || 0);
  }
}

runTests();
