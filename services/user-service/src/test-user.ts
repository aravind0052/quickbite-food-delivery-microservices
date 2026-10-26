process.env.NODE_ENV = 'test';
import app from './index.js';
import { pool } from './db.js';
import http from 'http';

const PORT = 3098;
let server: http.Server;

async function runTests() {
  console.log('[User Service Test] Starting integration tests...');
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

    // 2. GET /users/me without gateway context
    console.log('\n--- 2. Testing GET /users/me without headers (Should be 401) ---');
    const noAuthRes = await fetch(`${baseUrl}/users/me`);
    const noAuthData: any = await noAuthRes.json();
    console.log('No auth status:', noAuthRes.status, noAuthData);
    if (noAuthRes.status !== 401 || noAuthData.success !== false) {
      throw new Error('Unauthenticated request must return 401 Unauthorized!');
    }
    console.log('✔ Missing gateway context properly rejected with 401');

    // 3. GET /users/me with gateway context for Customer 01 (userId: 6)
    console.log('\n--- 3. Testing GET /users/me with gateway headers ---');
    const profileRes = await fetch(`${baseUrl}/users/me`, {
      headers: {
        'x-user-id': '6',
        'x-user-email': 'customer01@quickbite.demo',
        'x-user-role': 'CUSTOMER',
      },
    });
    const profileData: any = await profileRes.json();
    console.log('Profile status:', profileRes.status, profileData);
    if (profileRes.status !== 200 || !profileData.success || !profileData.data) {
      throw new Error('Failed to retrieve user profile!');
    }
    if (profileData.data.password_hash) {
      throw new Error('SECURITY VIOLATION: password_hash was exposed in profile response!');
    }
    console.log('✔ Profile retrieved successfully and password_hash correctly excluded');

    // 4. PUT /users/me (Update profile)
    console.log('\n--- 4. Testing PUT /users/me (Update phone) ---');
    const updateRes = await fetch(`${baseUrl}/users/me`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        'x-user-id': '6',
        'x-user-email': 'customer01@quickbite.demo',
        'x-user-role': 'CUSTOMER',
      },
      body: JSON.stringify({
        phone: '+91 98765 22001',
      }),
    });
    const updateData: any = await updateRes.json();
    console.log('Update profile status:', updateRes.status, updateData);
    if (updateRes.status !== 200 || !updateData.success) {
      throw new Error('Failed to update profile!');
    }
    console.log('✔ Profile updated successfully');

    // 5. GET /users/me/addresses
    console.log('\n--- 5. Testing GET /users/me/addresses ---');
    const addrRes = await fetch(`${baseUrl}/users/me/addresses`, {
      headers: {
        'x-user-id': '6',
        'x-user-email': 'customer01@quickbite.demo',
        'x-user-role': 'CUSTOMER',
      },
    });
    const addrData: any = await addrRes.json();
    console.log(`Addresses fetched for user 6: ${addrData.data?.length} records`);
    if (addrRes.status !== 200 || !addrData.success || !Array.isArray(addrData.data)) {
      throw new Error('Failed to fetch addresses!');
    }
    console.log('✔ Addresses retrieved successfully');

    // 6. POST /users/me/addresses (Create new address)
    console.log('\n--- 6. Testing POST /users/me/addresses ---');
    const newAddrRes = await fetch(`${baseUrl}/users/me/addresses`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-user-id': '6',
        'x-user-email': 'customer01@quickbite.demo',
        'x-user-role': 'CUSTOMER',
      },
      body: JSON.stringify({
        address_line: 'Unit 999, Inorbit IT Tech Park',
        area: 'Madhapur',
        city: 'Hyderabad',
        state: 'Telangana',
        pincode: '500081',
      }),
    });
    const newAddrData: any = await newAddrRes.json();
    console.log('Create address status:', newAddrRes.status, newAddrData);
    if (newAddrRes.status !== 201 || !newAddrData.success || !newAddrData.data?.id) {
      throw new Error('Failed to create new address!');
    }
    const createdAddressId = newAddrData.data.id;
    console.log(`✔ New address created with ID ${createdAddressId}`);

    // 7. PUT /users/me/addresses/:id (Update address)
    console.log('\n--- 7. Testing PUT /users/me/addresses/:id ---');
    const updateAddrRes = await fetch(`${baseUrl}/users/me/addresses/${createdAddressId}`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        'x-user-id': '6',
        'x-user-email': 'customer01@quickbite.demo',
        'x-user-role': 'CUSTOMER',
      },
      body: JSON.stringify({
        address_line: 'Unit 999, Inorbit IT Tech Park - Updated Floor 4',
        area: 'Madhapur',
        city: 'Hyderabad',
        state: 'Telangana',
        pincode: '500081',
      }),
    });
    const updateAddrData: any = await updateAddrRes.json();
    console.log('Update address status:', updateAddrRes.status, updateAddrData);
    if (updateAddrRes.status !== 200 || !updateAddrData.success) {
      throw new Error('Failed to update address!');
    }
    console.log('✔ Address updated successfully');

    // 8. PUT /users/me/addresses/:id as ANOTHER USER (Should be 403 Forbidden)
    console.log('\n--- 8. Testing unauthorized address update (Should be 403) ---');
    const crossUserRes = await fetch(`${baseUrl}/users/me/addresses/${createdAddressId}`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        'x-user-id': '7', // Different user
        'x-user-email': 'customer02@quickbite.demo',
        'x-user-role': 'CUSTOMER',
      },
      body: JSON.stringify({
        address_line: 'Hacker modifying another user address',
        area: 'Hacker',
        city: 'City',
        state: 'State',
        pincode: '000000',
      }),
    });
    const crossUserData: any = await crossUserRes.json();
    console.log('Cross-user update status:', crossUserRes.status, crossUserData);
    if (crossUserRes.status !== 403 || crossUserData.success !== false) {
      throw new Error('Cross-user address modification must be forbidden (403)!');
    }
    console.log('✔ Cross-user address tampering blocked with 403 Forbidden');

    // 9. DELETE /users/me/addresses/:id (Delete address)
    console.log('\n--- 9. Testing DELETE /users/me/addresses/:id ---');
    const deleteRes = await fetch(`${baseUrl}/users/me/addresses/${createdAddressId}`, {
      method: 'DELETE',
      headers: {
        'x-user-id': '6',
        'x-user-email': 'customer01@quickbite.demo',
        'x-user-role': 'CUSTOMER',
      },
    });
    const deleteData: any = await deleteRes.json();
    console.log('Delete address status:', deleteRes.status, deleteData);
    if (deleteRes.status !== 200 || !deleteData.success) {
      throw new Error('Failed to delete address!');
    }
    console.log('✔ Address deleted successfully');

    // 10. DELETE /users/me/addresses/:id (Non-existent, should be 404)
    console.log('\n--- 10. Testing DELETE non-existent address (Should be 404) ---');
    const deleteNonExistent = await fetch(`${baseUrl}/users/me/addresses/${createdAddressId}`, {
      method: 'DELETE',
      headers: {
        'x-user-id': '6',
        'x-user-email': 'customer01@quickbite.demo',
        'x-user-role': 'CUSTOMER',
      },
    });
    const deleteNonExistentData: any = await deleteNonExistent.json();
    console.log('Delete non-existent status:', deleteNonExistent.status, deleteNonExistentData);
    if (deleteNonExistent.status !== 404) {
      throw new Error('Deleting non-existent address should return 404!');
    }
    console.log('✔ Deleting non-existent address returned 404');

    // 11. GET /users (List all users)
    console.log('\n--- 11. Testing GET /users (List all users) ---');
    const allUsersRes = await fetch(`${baseUrl}/users`);
    const allUsersData: any = await allUsersRes.json();
    console.log(`Total users listed: ${allUsersData.data?.length}`);
    if (allUsersRes.status !== 200 || !allUsersData.success || !Array.isArray(allUsersData.data)) {
      throw new Error('Failed to list users!');
    }
    console.log('✔ User listing succeeded');

    console.log('\n========================================');
    console.log('ALL USER SERVICE TESTS PASSED SUCCESSFULLY!');
    console.log('========================================');
  } catch (error) {
    console.error('[User Service Test ERROR]:', error);
    process.exitCode = 1;
  } finally {
    server.close();
    await pool.end();
    process.exit(process.exitCode || 0);
  }
}

runTests();
