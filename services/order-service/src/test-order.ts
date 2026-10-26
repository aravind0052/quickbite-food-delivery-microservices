process.env.NODE_ENV = 'test';
import app from './index.js';
import { pool } from './db.js';
import http from 'http';

const PORT = 3096;
let server: http.Server;

async function runTests() {
  console.log('[Order Service Test] Starting integration tests...');
  server = app.listen(PORT);

  const baseUrl = `http://localhost:${PORT}`;

  try {
    // 1. Health Check
    console.log('\n--- 1. Testing GET /health ---');
    const healthRes = await fetch(`${baseUrl}/health`);
    const healthData: any = await healthRes.json();
    console.log('Health response:', healthData);
    if (healthRes.status !== 200 || healthData.status !== 'UP' || healthData.database !== 'CONNECTED') {
      throw new Error(`Health check failed: ${JSON.stringify(healthData)}`);
    }
    console.log('✔ Health check passed');

    // 2. POST /orders without headers
    console.log('\n--- 2. Testing POST /orders without auth headers (Should be 401) ---');
    const noAuthRes = await fetch(`${baseUrl}/orders`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        restaurant_id: 1,
        delivery_address_id: 1,
        items: [{ menu_item_id: 1, quantity: 1 }],
      }),
    });
    const noAuthData: any = await noAuthRes.json();
    console.log('No auth status:', noAuthRes.status, noAuthData);
    if (noAuthRes.status !== 401 || noAuthData.success !== false) {
      throw new Error('Unauthenticated order placement must be rejected with 401!');
    }
    console.log('✔ Missing gateway context properly rejected with 401');

    // 3. POST /orders with mismatched delivery address (User 6 using User 7's address)
    console.log('\n--- 3. Testing POST /orders with unowned delivery address (Should be 400) ---');
    const wrongAddrRes = await fetch(`${baseUrl}/orders`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-user-id': '6', // Customer 01
        'x-user-email': 'customer01@quickbite.demo',
        'x-user-role': 'CUSTOMER',
      },
      body: JSON.stringify({
        restaurant_id: 1,
        delivery_address_id: 3, // Belongs to Customer 02 (User 7)
        items: [{ menu_item_id: 1, quantity: 1 }],
      }),
    });
    const wrongAddrData: any = await wrongAddrRes.json();
    console.log('Wrong address status:', wrongAddrRes.status, wrongAddrData);
    if (wrongAddrRes.status !== 400 || wrongAddrData.success !== false) {
      throw new Error('Using another user address must be rejected with 400!');
    }
    console.log('✔ Address ownership validation passed (Blocked unowned address)');

    // 4. POST /orders with valid payload and FORGED frontend total
    // Item 1 (Special Biryani) is 349.00. Quantity 2 = 698.00.
    // Client sends fake total_amount = 5.00
    console.log('\n--- 4. Testing POST /orders (Server-side price calculation & Zero-trust test) ---');
    const orderRes = await fetch(`${baseUrl}/orders`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-user-id': '6', // Customer 01
        'x-user-email': 'customer01@quickbite.demo',
        'x-user-role': 'CUSTOMER',
      },
      body: JSON.stringify({
        restaurant_id: 1,
        delivery_address_id: 1, // Valid address belonging to Customer 01
        total_amount: 5.00, // MALICIOUS / FORGED CLIENT TOTAL
        payment_status: 'PAID',
        items: [
          { menu_item_id: 1, quantity: 2 }, // Biryani 349 * 2 = 698
          { menu_item_id: 5, quantity: 1 }, // Chicken 65 269 * 1 = 269
        ],
      }),
    });
    const orderData: any = await orderRes.json();
    console.log('Order create status:', orderRes.status);
    console.log('Order created data:', {
      orderId: orderData.data?.id,
      total_amount: orderData.data?.total_amount,
      status: orderData.data?.status,
    });
    if (orderRes.status !== 201 || !orderData.success || !orderData.data?.id) {
      throw new Error(`Failed to place order! ${JSON.stringify(orderData)}`);
    }

    // Expected total = 698 + 269 = 967.00
    const calculatedTotal = parseFloat(orderData.data.total_amount);
    if (calculatedTotal !== 967.00) {
      throw new Error(`Server-side calculation failed! Expected 967.00, got ${calculatedTotal}`);
    }
    console.log(`✔ Zero-trust price validation verified! (Server correctly computed ₹967.00 ignoring client's fake ₹5.00)`);
    const createdOrderId = orderData.data.id;

    // 5. GET /orders/my-orders
    console.log('\n--- 5. Testing GET /orders/my-orders ---');
    const myOrdersRes = await fetch(`${baseUrl}/orders/my-orders`, {
      headers: {
        'x-user-id': '6',
        'x-user-email': 'customer01@quickbite.demo',
        'x-user-role': 'CUSTOMER',
      },
    });
    const myOrdersData: any = await myOrdersRes.json();
    console.log(`My orders count: ${myOrdersData.count}`);
    if (myOrdersRes.status !== 200 || !myOrdersData.success || myOrdersData.count === 0) {
      throw new Error('Failed to fetch my orders!');
    }
    console.log('✔ Customer order history retrieved successfully');

    // 6. GET /orders/:id (Order tracking & details)
    console.log('\n--- 6. Testing GET /orders/:id ---');
    const trackRes = await fetch(`${baseUrl}/orders/${createdOrderId}`, {
      headers: {
        'x-user-id': '6',
        'x-user-email': 'customer01@quickbite.demo',
        'x-user-role': 'CUSTOMER',
      },
    });
    const trackData: any = await trackRes.json();
    console.log('Order details:', {
      id: trackData.data?.id,
      restaurant: trackData.data?.restaurant_name,
      itemsCount: trackData.data?.items?.length,
      status: trackData.data?.status,
    });
    if (trackRes.status !== 200 || !trackData.success || trackData.data?.items?.length !== 2) {
      throw new Error('Failed to track order details!');
    }
    console.log('✔ Order tracking details fetched successfully');

    // 7. GET /orders/:id as UNAUTHORIZED USER (Cross-user eavesdropping test)
    console.log('\n--- 7. Testing GET /orders/:id as another customer (Should be 403) ---');
    const unauthorizedRes = await fetch(`${baseUrl}/orders/${createdOrderId}`, {
      headers: {
        'x-user-id': '7', // Customer 02
        'x-user-email': 'customer02@quickbite.demo',
        'x-user-role': 'CUSTOMER',
      },
    });
    const unauthorizedData: any = await unauthorizedRes.json();
    console.log('Unauthorized view status:', unauthorizedRes.status, unauthorizedData);
    if (unauthorizedRes.status !== 403 || unauthorizedData.success !== false) {
      throw new Error('Viewing another customer order must be blocked with 403 Forbidden!');
    }
    console.log('✔ Cross-user order security verified (403 Forbidden)');

    // 8. PUT /orders/:id/status (Valid update)
    console.log('\n--- 8. Testing PUT /orders/:id/status (Update to CONFIRMED) ---');
    const updateStatusRes = await fetch(`${baseUrl}/orders/${createdOrderId}/status`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        'x-user-id': '1', // Admin
        'x-user-email': 'admin@quickbite.demo',
        'x-user-role': 'ADMIN',
      },
      body: JSON.stringify({ status: 'CONFIRMED' }),
    });
    const updateStatusData: any = await updateStatusRes.json();
    console.log('Status update result:', updateStatusRes.status, updateStatusData.data?.status);
    if (updateStatusRes.status !== 200 || updateStatusData.data?.status !== 'CONFIRMED') {
      throw new Error('Failed to update order status!');
    }
    console.log('✔ Order status updated to CONFIRMED');

    // 9. PUT /orders/:id/status (Invalid status)
    console.log('\n--- 9. Testing PUT /orders/:id/status (Invalid status string) ---');
    const invalidStatusRes = await fetch(`${baseUrl}/orders/${createdOrderId}/status`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        'x-user-id': '1',
        'x-user-email': 'admin@quickbite.demo',
        'x-user-role': 'ADMIN',
      },
      body: JSON.stringify({ status: 'INVALID_STATUS_STRING' }),
    });
    const invalidStatusData: any = await invalidStatusRes.json();
    console.log('Invalid status result:', invalidStatusRes.status, invalidStatusData);
    if (invalidStatusRes.status !== 400 || invalidStatusData.success !== false) {
      throw new Error('Invalid order status should return 400 Bad Request!');
    }
    console.log('✔ Invalid status value rejected with 400 Bad Request');

    // 10. GET /orders (Admin all orders)
    console.log('\n--- 10. Testing GET /orders (All orders) ---');
    const allOrdersRes = await fetch(`${baseUrl}/orders`, {
      headers: {
        'x-user-id': '1',
        'x-user-email': 'admin@quickbite.demo',
        'x-user-role': 'ADMIN',
      },
    });
    const allOrdersData: any = await allOrdersRes.json();
    console.log(`Total orders in system: ${allOrdersData.count}`);
    if (allOrdersRes.status !== 200 || !allOrdersData.success || allOrdersData.count < 35) {
      throw new Error('Failed to list system orders!');
    }
    console.log('✔ All orders listing passed');

    console.log('\n========================================');
    console.log('ALL ORDER SERVICE TESTS PASSED SUCCESSFULLY!');
    console.log('========================================');
  } catch (error) {
    console.error('[Order Service Test ERROR]:', error);
    process.exitCode = 1;
  } finally {
    server.close();
    await pool.end();
    process.exit(process.exitCode || 0);
  }
}

runTests();
