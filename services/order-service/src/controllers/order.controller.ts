import { Request, Response } from 'express';
import pool from '../db.js';

const VALID_ORDER_STATUSES = ['PLACED', 'CONFIRMED', 'PREPARING', 'OUT_FOR_DELIVERY', 'DELIVERED', 'CANCELLED'];
const VALID_PAYMENT_STATUSES = ['PENDING', 'PAID', 'FAILED', 'COD'];

/**
 * Place a new order
 * POST /orders
 */
export async function createOrder(req: Request, res: Response): Promise<void> {
  const userId = req.user?.userId;
  if (!userId) {
    res.status(401).json({ success: false, message: 'Unauthorized: User authentication required.' });
    return;
  }

  const { restaurant_id, delivery_address_id, items, payment_status } = req.body;

  // 1. Basic validation
  if (!restaurant_id || !delivery_address_id || !items || !Array.isArray(items) || items.length === 0) {
    res.status(400).json({
      success: false,
      message: 'restaurant_id, delivery_address_id, and a non-empty items array are required.',
    });
    return;
  }

  const restaurantId = parseInt(String(restaurant_id), 10);
  const deliveryAddressId = parseInt(String(delivery_address_id), 10);

  if (isNaN(restaurantId) || isNaN(deliveryAddressId)) {
    res.status(400).json({ success: false, message: 'Invalid restaurant or address ID format.' });
    return;
  }

  // 2. Validate payment status
  const finalPaymentStatus = payment_status ? String(payment_status).toUpperCase() : 'PAID';
  if (!VALID_PAYMENT_STATUSES.includes(finalPaymentStatus)) {
    res.status(400).json({
      success: false,
      message: `Invalid payment status. Allowed values: ${VALID_PAYMENT_STATUSES.join(', ')}`,
    });
    return;
  }

  const conn = await pool.getConnection();

  try {
    // 3. Verify delivery address belongs to this authenticated user
    const [addressRows]: any = await conn.query(
      'SELECT id, address_line, area, city, pincode FROM addresses WHERE id = ? AND user_id = ? LIMIT 1;',
      [deliveryAddressId, userId]
    );

    if (addressRows.length === 0) {
      res.status(400).json({
        success: false,
        message: 'Delivery address does not exist or does not belong to the authenticated user.',
      });
      return;
    }

    // 4. Verify restaurant exists
    const [restaurantRows]: any = await conn.query(
      'SELECT id, name, is_open FROM restaurants WHERE id = ? LIMIT 1;',
      [restaurantId]
    );

    if (restaurantRows.length === 0) {
      res.status(404).json({ success: false, message: 'Restaurant not found.' });
      return;
    }

    if (restaurantRows[0].is_open === 0) {
      res.status(400).json({ success: false, message: 'Restaurant is currently closed and not accepting orders.' });
      return;
    }

    // 5. Calculate prices strictly on backend (Zero trust on frontend total)
    let calculatedTotal = 0;
    const validatedItems: Array<{
      menu_item_id: number;
      name: string;
      price: number;
      quantity: number;
      subtotal: number;
    }> = [];

    for (const item of items) {
      const menuItemId = parseInt(String(item.menu_item_id), 10);
      const quantity = parseInt(String(item.quantity), 10);

      if (isNaN(menuItemId) || isNaN(quantity) || quantity <= 0) {
        res.status(400).json({
          success: false,
          message: `Invalid menu_item_id or quantity for item: ${JSON.stringify(item)}`,
        });
        return;
      }

      // Fetch official price directly from database
      const [menuItemRows]: any = await conn.query(
        'SELECT id, name, price, is_available FROM menu_items WHERE id = ? AND restaurant_id = ? LIMIT 1;',
        [menuItemId, restaurantId]
      );

      if (menuItemRows.length === 0) {
        res.status(400).json({
          success: false,
          message: `Menu item with ID ${menuItemId} does not belong to restaurant ${restaurantId}.`,
        });
        return;
      }

      const dbItem = menuItemRows[0];
      if (dbItem.is_available === 0) {
        res.status(400).json({
          success: false,
          message: `Item "${dbItem.name}" is currently unavailable.`,
        });
        return;
      }

      const itemPrice = parseFloat(dbItem.price);
      const subtotal = Number((itemPrice * quantity).toFixed(2));
      calculatedTotal += subtotal;

      validatedItems.push({
        menu_item_id: dbItem.id,
        name: dbItem.name,
        price: itemPrice,
        quantity,
        subtotal,
      });
    }

    const finalTotalAmount = Number(calculatedTotal.toFixed(2));

    // 6. Begin transaction & insert order + items
    await conn.beginTransaction();

    const [orderInsert]: any = await conn.query(
      `INSERT INTO orders (user_id, restaurant_id, total_amount, delivery_address_id, status, payment_status)
       VALUES (?, ?, ?, ?, 'PLACED', ?);`,
      [userId, restaurantId, finalTotalAmount, deliveryAddressId, finalPaymentStatus]
    );

    const orderId = orderInsert.insertId;

    for (const item of validatedItems) {
      await conn.query(
        `INSERT INTO order_items (order_id, menu_item_id, quantity, price, subtotal)
         VALUES (?, ?, ?, ?, ?);`,
        [orderId, item.menu_item_id, item.quantity, item.price, item.subtotal]
      );
    }

    await conn.commit();

    // 7. Return complete order representation
    const [fullOrderRows]: any = await conn.query(
      `SELECT o.*, r.name as restaurant_name, r.image_url as restaurant_image,
              a.address_line, a.area, a.city, a.pincode
       FROM orders o
       JOIN restaurants r ON o.restaurant_id = r.id
       JOIN addresses a ON o.delivery_address_id = a.id
       WHERE o.id = ?;`,
      [orderId]
    );

    res.status(201).json({
      success: true,
      message: 'Order placed successfully.',
      data: {
        ...fullOrderRows[0],
        id: orderId,
        orderId,
        items: validatedItems,
      },
    });
  } catch (error: any) {
    await conn.rollback();
    console.error('[Order Service] createOrder error:', error.message || error);
    res.status(500).json({ success: false, message: 'Internal server error creating order.' });
  } finally {
    conn.release();
  }
}

/**
 * Get orders of the currently authenticated user
 * GET /orders/my-orders
 */
export async function getMyOrders(req: Request, res: Response): Promise<void> {
  try {
    const userId = req.user?.userId;
    if (!userId) {
      res.status(401).json({ success: false, message: 'Unauthorized' });
      return;
    }

    const [orders]: any = await pool.query(
      `SELECT o.*, r.name as restaurant_name, r.image_url as restaurant_image,
              a.address_line, a.area, a.city, a.pincode,
              (SELECT COUNT(*) FROM order_items WHERE order_id = o.id) as item_count
       FROM orders o
       JOIN restaurants r ON o.restaurant_id = r.id
       JOIN addresses a ON o.delivery_address_id = a.id
       WHERE o.user_id = ?
       ORDER BY o.created_at DESC;`,
      [userId]
    );

    res.json({
      success: true,
      count: orders.length,
      data: orders,
    });
  } catch (error: any) {
    console.error('[Order Service] getMyOrders error:', error.message || error);
    res.status(500).json({ success: false, message: 'Internal server error fetching my orders.' });
  }
}

/**
 * Get detailed order by ID
 * GET /orders/:id
 */
export async function getOrderById(req: Request, res: Response): Promise<void> {
  try {
    const userId = req.user?.userId;
    const userRole = req.user?.role;
    const orderId = parseInt(req.params.id, 10);

    if (isNaN(orderId)) {
      res.status(400).json({ success: false, message: 'Invalid order ID.' });
      return;
    }

    const [orderRows]: any = await pool.query(
      `SELECT o.*, 
              r.name as restaurant_name, r.image_url as restaurant_image, r.address as restaurant_address,
              a.address_line, a.area, a.city, a.state, a.pincode,
              u.name as customer_name, u.email as customer_email, u.phone as customer_phone
       FROM orders o
       JOIN restaurants r ON o.restaurant_id = r.id
       JOIN addresses a ON o.delivery_address_id = a.id
       JOIN users u ON o.user_id = u.id
       WHERE o.id = ? LIMIT 1;`,
      [orderId]
    );

    if (orderRows.length === 0) {
      res.status(404).json({ success: false, message: 'Order not found.' });
      return;
    }

    const order = orderRows[0];

    // Authorization: User must be either the owner of the order or an ADMIN
    if (userRole !== 'ADMIN' && order.user_id !== userId) {
      res.status(403).json({
        success: false,
        message: 'Forbidden: You do not have permission to view this order.',
      });
      return;
    }

    // Fetch order items with menu item details
    const [items]: any = await pool.query(
      `SELECT oi.id, oi.menu_item_id, oi.quantity, oi.price, oi.subtotal,
              mi.name, mi.image_url, mi.is_veg, mi.category
       FROM order_items oi
       JOIN menu_items mi ON oi.menu_item_id = mi.id
       WHERE oi.order_id = ?
       ORDER BY oi.id ASC;`,
      [orderId]
    );

    res.json({
      success: true,
      data: {
        ...order,
        items,
      },
    });
  } catch (error: any) {
    console.error('[Order Service] getOrderById error:', error.message || error);
    res.status(500).json({ success: false, message: 'Internal server error fetching order.' });
  }
}

/**
 * Get all orders (Admin / General view)
 * GET /orders
 */
export async function getAllOrders(req: Request, res: Response): Promise<void> {
  try {
    const { status, restaurant_id, limit, offset } = req.query;

    let sql = `
      SELECT o.*, r.name as restaurant_name, u.name as customer_name, u.email as customer_email
      FROM orders o
      JOIN restaurants r ON o.restaurant_id = r.id
      JOIN users u ON o.user_id = u.id
      WHERE 1=1
    `;
    const params: any[] = [];

    if (status) {
      sql += ' AND o.status = ?';
      params.push(String(status).toUpperCase());
    }

    if (restaurant_id) {
      sql += ' AND o.restaurant_id = ?';
      params.push(parseInt(String(restaurant_id), 10));
    }

    sql += ' ORDER BY o.created_at DESC';

    if (limit) {
      const parsedLimit = parseInt(String(limit), 10);
      const parsedOffset = offset ? parseInt(String(offset), 10) : 0;
      if (!isNaN(parsedLimit) && parsedLimit > 0) {
        sql += ` LIMIT ${parsedLimit} OFFSET ${isNaN(parsedOffset) ? 0 : parsedOffset}`;
      }
    }

    const [orders]: any = await pool.query(sql, params);

    res.json({
      success: true,
      count: orders.length,
      data: orders,
    });
  } catch (error: any) {
    console.error('[Order Service] getAllOrders error:', error.message || error);
    res.status(500).json({ success: false, message: 'Internal server error fetching orders.' });
  }
}

/**
 * Update order status
 * PUT /orders/:id/status
 */
export async function updateOrderStatus(req: Request, res: Response): Promise<void> {
  try {
    const orderId = parseInt(req.params.id, 10);
    const { status } = req.body;

    if (isNaN(orderId) || !status) {
      res.status(400).json({ success: false, message: 'Invalid order ID or status field missing.' });
      return;
    }

    const normalizedStatus = String(status).toUpperCase();
    if (!VALID_ORDER_STATUSES.includes(normalizedStatus)) {
      res.status(400).json({
        success: false,
        message: `Invalid status. Permitted values: ${VALID_ORDER_STATUSES.join(', ')}`,
      });
      return;
    }

    const [existing]: any = await pool.query('SELECT id, status FROM orders WHERE id = ? LIMIT 1;', [orderId]);
    if (existing.length === 0) {
      res.status(404).json({ success: false, message: 'Order not found.' });
      return;
    }

    await pool.query('UPDATE orders SET status = ? WHERE id = ?;', [normalizedStatus, orderId]);

    const [updated]: any = await pool.query('SELECT * FROM orders WHERE id = ?;', [orderId]);

    res.json({
      success: true,
      message: `Order status updated to ${normalizedStatus}.`,
      data: updated[0],
    });
  } catch (error: any) {
    console.error('[Order Service] updateOrderStatus error:', error.message || error);
    res.status(500).json({ success: false, message: 'Internal server error updating order status.' });
  }
}
