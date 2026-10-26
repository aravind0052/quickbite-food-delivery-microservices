import { Request, Response } from 'express';
import pool from '../db.js';

/**
 * Add a new menu item to a restaurant
 * POST /restaurants/:id/menu
 */
export async function createMenuItem(req: Request, res: Response): Promise<void> {
  try {
    const restaurantId = parseInt(req.params.id, 10);
    if (isNaN(restaurantId)) {
      res.status(400).json({ success: false, message: 'Invalid restaurant ID.' });
      return;
    }

    // Verify restaurant exists
    const [restaurantRows]: any = await pool.query('SELECT id FROM restaurants WHERE id = ? LIMIT 1;', [restaurantId]);
    if (restaurantRows.length === 0) {
      res.status(404).json({ success: false, message: 'Restaurant not found.' });
      return;
    }

    const { name, description, category, price, image_url, is_veg, is_available } = req.body;

    if (!name || !category || price === undefined) {
      res.status(400).json({
        success: false,
        message: 'Name, category, and price are required fields.',
      });
      return;
    }

    const parsedPrice = parseFloat(String(price));
    if (isNaN(parsedPrice) || parsedPrice <= 0) {
      res.status(400).json({ success: false, message: 'Price must be a valid positive number.' });
      return;
    }

    const [result]: any = await pool.query(
      `INSERT INTO menu_items (restaurant_id, name, description, category, price, image_url, is_veg, is_available)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?);`,
      [
        restaurantId,
        String(name).trim(),
        description ? String(description).trim() : null,
        String(category).trim(),
        parsedPrice,
        image_url ? String(image_url).trim() : null,
        is_veg !== undefined ? (Number(is_veg) === 1 ? 1 : 0) : 1,
        is_available !== undefined ? (Number(is_available) === 1 ? 1 : 0) : 1,
      ]
    );

    const [newItem]: any = await pool.query('SELECT * FROM menu_items WHERE id = ?;', [result.insertId]);

    res.status(201).json({
      success: true,
      message: 'Menu item created successfully.',
      data: newItem[0],
    });
  } catch (error: any) {
    console.error('[Restaurant Service] createMenuItem error:', error.message || error);
    res.status(500).json({ success: false, message: 'Internal server error creating menu item.' });
  }
}

/**
 * Update an existing menu item
 * PUT /menu-items/:id
 */
export async function updateMenuItem(req: Request, res: Response): Promise<void> {
  try {
    const id = parseInt(req.params.id, 10);
    if (isNaN(id)) {
      res.status(400).json({ success: false, message: 'Invalid menu item ID.' });
      return;
    }

    const [existing]: any = await pool.query('SELECT * FROM menu_items WHERE id = ? LIMIT 1;', [id]);
    if (existing.length === 0) {
      res.status(404).json({ success: false, message: 'Menu item not found.' });
      return;
    }

    const current = existing[0];
    const { name, description, category, price, image_url, is_veg, is_available } = req.body;

    await pool.query(
      `UPDATE menu_items SET
        name = ?,
        description = ?,
        category = ?,
        price = ?,
        image_url = ?,
        is_veg = ?,
        is_available = ?
       WHERE id = ?;`,
      [
        name !== undefined ? String(name).trim() : current.name,
        description !== undefined ? String(description).trim() : current.description,
        category !== undefined ? String(category).trim() : current.category,
        price !== undefined ? parseFloat(String(price)) : current.price,
        image_url !== undefined ? String(image_url).trim() : current.image_url,
        is_veg !== undefined ? (Number(is_veg) === 1 ? 1 : 0) : current.is_veg,
        is_available !== undefined ? (Number(is_available) === 1 ? 1 : 0) : current.is_available,
        id,
      ]
    );

    const [updated]: any = await pool.query('SELECT * FROM menu_items WHERE id = ? LIMIT 1;', [id]);

    res.json({
      success: true,
      message: 'Menu item updated successfully.',
      data: updated[0],
    });
  } catch (error: any) {
    console.error('[Restaurant Service] updateMenuItem error:', error.message || error);
    res.status(500).json({ success: false, message: 'Internal server error updating menu item.' });
  }
}

/**
 * Delete a menu item
 * DELETE /menu-items/:id
 */
export async function deleteMenuItem(req: Request, res: Response): Promise<void> {
  try {
    const id = parseInt(req.params.id, 10);
    if (isNaN(id)) {
      res.status(400).json({ success: false, message: 'Invalid menu item ID.' });
      return;
    }

    const [existing]: any = await pool.query('SELECT id FROM menu_items WHERE id = ? LIMIT 1;', [id]);
    if (existing.length === 0) {
      res.status(404).json({ success: false, message: 'Menu item not found.' });
      return;
    }

    await pool.query('DELETE FROM menu_items WHERE id = ?;', [id]);

    res.json({
      success: true,
      message: 'Menu item deleted successfully.',
    });
  } catch (error: any) {
    console.error('[Restaurant Service] deleteMenuItem error:', error.message || error);
    res.status(500).json({ success: false, message: 'Internal server error deleting menu item.' });
  }
}
