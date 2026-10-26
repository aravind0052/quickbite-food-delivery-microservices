import { Router } from 'express';
import { updateMenuItem, deleteMenuItem } from '../controllers/menu.controller.js';

const router = Router();

router.put('/:id', updateMenuItem);
router.delete('/:id', deleteMenuItem);

export default router;
