import { Router } from 'express';
import {
  getRestaurants,
  getRestaurantById,
  getRestaurantMenu,
  searchRestaurants,
  filterRestaurants,
  createRestaurant,
  updateRestaurant,
  deleteRestaurant,
} from '../controllers/restaurant.controller.js';
import { createMenuItem } from '../controllers/menu.controller.js';

const router = Router();

// Specialized routes placed before /:id parameterized route
router.get('/search', searchRestaurants);
router.get('/filter', filterRestaurants);

// Main restaurant routes
router.get('/', getRestaurants);
router.get('/:id', getRestaurantById);
router.get('/:id/menu', getRestaurantMenu);
router.post('/', createRestaurant);
router.put('/:id', updateRestaurant);
router.delete('/:id', deleteRestaurant);

// Add menu item to restaurant
router.post('/:id/menu', createMenuItem);

export default router;
