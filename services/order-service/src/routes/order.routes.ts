import { Router } from 'express';
import { requireAuthContext } from '../middleware/authContext.middleware.js';
import {
  createOrder,
  getMyOrders,
  getOrderById,
  getAllOrders,
  updateOrderStatus,
} from '../controllers/order.controller.js';

const router = Router();

// Place order
router.post('/', requireAuthContext, createOrder);

// Customer's order history (must be before /:id)
router.get('/my-orders', requireAuthContext, getMyOrders);

// All orders (Admin / General view)
router.get('/all', requireAuthContext, getAllOrders);
router.get('/', requireAuthContext, getAllOrders);

// Order tracking & details by ID
router.get('/:id', requireAuthContext, getOrderById);

// Update status (support both PUT and PATCH)
router.put('/:id/status', requireAuthContext, updateOrderStatus);
router.patch('/:id/status', requireAuthContext, updateOrderStatus);

export default router;
