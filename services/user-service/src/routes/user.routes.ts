import { Router } from 'express';
import { requireAuthContext } from '../middleware/authContext.middleware.js';
import {
  getProfile,
  updateProfile,
  getAllUsers,
  getUserById,
} from '../controllers/user.controller.js';
import {
  getUserAddresses,
  addAddress,
  updateAddress,
  deleteAddress,
} from '../controllers/address.controller.js';

const router = Router();

// Profile endpoints
router.get('/me', requireAuthContext, getProfile);
router.put('/me', requireAuthContext, updateProfile);

// Address endpoints (supports both /addresses and /me/addresses)
router.get('/addresses', requireAuthContext, getUserAddresses);
router.post('/addresses', requireAuthContext, addAddress);
router.put('/addresses/:id', requireAuthContext, updateAddress);
router.delete('/addresses/:id', requireAuthContext, deleteAddress);

router.get('/me/addresses', requireAuthContext, getUserAddresses);
router.post('/me/addresses', requireAuthContext, addAddress);
router.put('/me/addresses/:id', requireAuthContext, updateAddress);
router.delete('/me/addresses/:id', requireAuthContext, deleteAddress);

// Admin / General user lookup endpoints
router.get('/', getAllUsers);
router.get('/:id', getUserById);

export default router;
