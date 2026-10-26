import { Request, Response } from 'express';
import pool from '../db.js';

/**
 * Get all restaurants with optional filtering and sorting
 * GET /restaurants
 */
export async function getRestaurants(req: Request, res: Response): Promise<void> {
  try {
    const { city, area, cuisine, is_open, sortBy, limit, offset } = req.query;

    let sql = 'SELECT * FROM restaurants WHERE 1=1';
    const params: any[] = [];

    if (city) {
      sql += ' AND LOWER(city) = LOWER(?)';
      params.push(String(city).trim());
    }

    if (area) {
      sql += ' AND LOWER(area) = LOWER(?)';
      params.push(String(area).trim());
    }

    if (cuisine) {
      sql += ' AND LOWER(cuisine) LIKE LOWER(?)';
      params.push(`%${String(cuisine).trim()}%`);
    }

    if (is_open !== undefined) {
      sql += ' AND is_open = ?';
      params.push(Number(is_open) === 1 ? 1 : 0);
    }

    // Sorting
    switch (sortBy) {
      case 'rating_desc':
        sql += ' ORDER BY rating DESC';
        break;
      case 'rating_asc':
        sql += ' ORDER BY rating ASC';
        break;
      case 'price_asc':
        sql += ' ORDER BY price_for_two ASC';
        break;
      case 'price_desc':
        sql += ' ORDER BY price_for_two DESC';
        break;
      case 'name_asc':
        sql += ' ORDER BY name ASC';
        break;
      default:
        sql += ' ORDER BY rating DESC, id ASC';
        break;
    }

    if (limit) {
      const parsedLimit = parseInt(String(limit), 10);
      const parsedOffset = offset ? parseInt(String(offset), 10) : 0;
      if (!isNaN(parsedLimit) && parsedLimit > 0) {
        sql += ` LIMIT ${parsedLimit} OFFSET ${isNaN(parsedOffset) ? 0 : parsedOffset}`;
      }
    }

    const [rows]: any = await pool.query(sql, params);

    res.json({
      success: true,
      count: rows.length,
      data: rows,
    });
  } catch (error: any) {
    console.error('[Restaurant Service] getRestaurants error:', error.message || error);
    res.status(500).json({ success: false, message: 'Internal server error fetching restaurants.' });
  }
}

/**
 * Get single restaurant by ID
 * GET /restaurants/:id
 */
export async function getRestaurantById(req: Request, res: Response): Promise<void> {
  try {
    const id = parseInt(req.params.id, 10);
    if (isNaN(id)) {
      res.status(400).json({ success: false, message: 'Invalid restaurant ID.' });
      return;
    }

    const [rows]: any = await pool.query('SELECT * FROM restaurants WHERE id = ? LIMIT 1;', [id]);

    if (rows.length === 0) {
      res.status(404).json({ success: false, message: 'Restaurant not found.' });
      return;
    }

    res.json({
      success: true,
      data: rows[0],
    });
  } catch (error: any) {
    console.error('[Restaurant Service] getRestaurantById error:', error.message || error);
    res.status(500).json({ success: false, message: 'Internal server error fetching restaurant.' });
  }
}

/**
 * Get menu items for a specific restaurant
 * GET /restaurants/:id/menu
 */
export async function getRestaurantMenu(req: Request, res: Response): Promise<void> {
  try {
    const restaurantId = parseInt(req.params.id, 10);
    if (isNaN(restaurantId)) {
      res.status(400).json({ success: false, message: 'Invalid restaurant ID.' });
      return;
    }

    const { category, is_veg } = req.query;

    // Check if restaurant exists
    const [restaurantRows]: any = await pool.query('SELECT id, name FROM restaurants WHERE id = ? LIMIT 1;', [restaurantId]);
    if (restaurantRows.length === 0) {
      res.status(404).json({ success: false, message: 'Restaurant not found.' });
      return;
    }

    let sql = 'SELECT * FROM menu_items WHERE restaurant_id = ?';
    const params: any[] = [restaurantId];

    if (category) {
      sql += ' AND LOWER(category) = LOWER(?)';
      params.push(String(category).trim());
    }

    if (is_veg !== undefined) {
      sql += ' AND is_veg = ?';
      params.push(Number(is_veg) === 1 ? 1 : 0);
    }

    sql += ' ORDER BY category ASC, price ASC;';

    const [items]: any = await pool.query(sql, params);

    res.json({
      success: true,
      restaurant: restaurantRows[0],
      count: items.length,
      data: items,
    });
  } catch (error: any) {
    console.error('[Restaurant Service] getRestaurantMenu error:', error.message || error);
    res.status(500).json({ success: false, message: 'Internal server error fetching menu.' });
  }
}

/**
 * Search restaurants and dishes
 * GET /restaurants/search?q=
 */
export async function searchRestaurants(req: Request, res: Response): Promise<void> {
  try {
    const q = req.query.q ? String(req.query.q).trim() : '';

    if (!q) {
      // Return top restaurants if no query
      const [top]: any = await pool.query('SELECT * FROM restaurants ORDER BY rating DESC LIMIT 10;');
      res.json({ success: true, count: top.length, data: top });
      return;
    }

    const searchPattern = `%${q}%`;

    // Match restaurants by name, cuisine, area, or menu item names
    const sql = `
      SELECT DISTINCT r.* 
      FROM restaurants r
      LEFT JOIN menu_items m ON r.id = m.restaurant_id
      WHERE LOWER(r.name) LIKE LOWER(?)
         OR LOWER(r.cuisine) LIKE LOWER(?)
         OR LOWER(r.area) LIKE LOWER(?)
         OR LOWER(r.city) LIKE LOWER(?)
         OR LOWER(m.name) LIKE LOWER(?)
         OR LOWER(m.category) LIKE LOWER(?)
      ORDER BY r.rating DESC;
    `;

    const [rows]: any = await pool.query(sql, [
      searchPattern,
      searchPattern,
      searchPattern,
      searchPattern,
      searchPattern,
      searchPattern,
    ]);

    res.json({
      success: true,
      query: q,
      count: rows.length,
      data: rows,
    });
  } catch (error: any) {
    console.error('[Restaurant Service] searchRestaurants error:', error.message || error);
    res.status(500).json({ success: false, message: 'Internal server error searching restaurants.' });
  }
}

/**
 * Filter restaurants with multiple criteria
 * GET /restaurants/filter
 */
export async function filterRestaurants(req: Request, res: Response): Promise<void> {
  try {
    const { cuisine, minRating, maxPrice, isVeg, city, isOpen } = req.query;

    let sql = `
      SELECT DISTINCT r.* 
      FROM restaurants r
      LEFT JOIN menu_items m ON r.id = m.restaurant_id
      WHERE 1=1
    `;
    const params: any[] = [];

    if (cuisine) {
      sql += ' AND LOWER(r.cuisine) LIKE LOWER(?)';
      params.push(`%${String(cuisine).trim()}%`);
    }

    if (minRating) {
      const parsedRating = parseFloat(String(minRating));
      if (!isNaN(parsedRating)) {
        sql += ' AND r.rating >= ?';
        params.push(parsedRating);
      }
    }

    if (maxPrice) {
      const parsedPrice = parseFloat(String(maxPrice));
      if (!isNaN(parsedPrice)) {
        sql += ' AND r.price_for_two <= ?';
        params.push(parsedPrice);
      }
    }

    if (city) {
      sql += ' AND LOWER(r.city) = LOWER(?)';
      params.push(String(city).trim());
    }

    if (isOpen !== undefined) {
      sql += ' AND r.is_open = ?';
      params.push(Number(isOpen) === 1 ? 1 : 0);
    }

    if (isVeg !== undefined && (isVeg === 'true' || isVeg === '1')) {
      // Return restaurants that offer pure veg or have vegetarian items
      sql += ' AND m.is_veg = 1';
    }

    sql += ' ORDER BY r.rating DESC;';

    const [rows]: any = await pool.query(sql, params);

    res.json({
      success: true,
      count: rows.length,
      data: rows,
    });
  } catch (error: any) {
    console.error('[Restaurant Service] filterRestaurants error:', error.message || error);
    res.status(500).json({ success: false, message: 'Internal server error filtering restaurants.' });
  }
}

/**
 * Create a new restaurant (Admin / Owner)
 * POST /restaurants
 */
export async function createRestaurant(req: Request, res: Response): Promise<void> {
  try {
    const {
      name,
      description,
      cuisine,
      address,
      area,
      city,
      rating,
      delivery_time,
      price_for_two,
      image_url,
      is_open,
    } = req.body;

    if (!name || !cuisine || !address || !area || !city) {
      res.status(400).json({
        success: false,
        message: 'Name, cuisine, address, area, and city are required fields.',
      });
      return;
    }

    const [result]: any = await pool.query(
      `INSERT INTO restaurants (name, description, cuisine, address, area, city, rating, delivery_time, price_for_two, image_url, is_open)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?);`,
      [
        String(name).trim(),
        description ? String(description).trim() : null,
        String(cuisine).trim(),
        String(address).trim(),
        String(area).trim(),
        String(city).trim(),
        rating ? parseFloat(String(rating)) : 4.0,
        delivery_time ? String(delivery_time).trim() : '30-40 min',
        price_for_two ? parseFloat(String(price_for_two)) : 400.0,
        image_url ? String(image_url).trim() : null,
        is_open !== undefined ? (Number(is_open) === 1 ? 1 : 0) : 1,
      ]
    );

    const [newRest]: any = await pool.query('SELECT * FROM restaurants WHERE id = ?;', [result.insertId]);

    res.status(201).json({
      success: true,
      message: 'Restaurant created successfully.',
      data: newRest[0],
    });
  } catch (error: any) {
    console.error('[Restaurant Service] createRestaurant error:', error.message || error);
    res.status(500).json({ success: false, message: 'Internal server error creating restaurant.' });
  }
}

/**
 * Update an existing restaurant (Admin / Owner)
 * PUT /restaurants/:id
 */
export async function updateRestaurant(req: Request, res: Response): Promise<void> {
  try {
    const id = parseInt(req.params.id, 10);
    if (isNaN(id)) {
      res.status(400).json({ success: false, message: 'Invalid restaurant ID.' });
      return;
    }

    const [existing]: any = await pool.query('SELECT * FROM restaurants WHERE id = ? LIMIT 1;', [id]);
    if (existing.length === 0) {
      res.status(404).json({ success: false, message: 'Restaurant not found.' });
      return;
    }

    const current = existing[0];
    const {
      name,
      description,
      cuisine,
      address,
      area,
      city,
      rating,
      delivery_time,
      price_for_two,
      image_url,
      is_open,
    } = req.body;

    await pool.query(
      `UPDATE restaurants SET
        name = ?,
        description = ?,
        cuisine = ?,
        address = ?,
        area = ?,
        city = ?,
        rating = ?,
        delivery_time = ?,
        price_for_two = ?,
        image_url = ?,
        is_open = ?
       WHERE id = ?;`,
      [
        name !== undefined ? String(name).trim() : current.name,
        description !== undefined ? String(description).trim() : current.description,
        cuisine !== undefined ? String(cuisine).trim() : current.cuisine,
        address !== undefined ? String(address).trim() : current.address,
        area !== undefined ? String(area).trim() : current.area,
        city !== undefined ? String(city).trim() : current.city,
        rating !== undefined ? parseFloat(String(rating)) : current.rating,
        delivery_time !== undefined ? String(delivery_time).trim() : current.delivery_time,
        price_for_two !== undefined ? parseFloat(String(price_for_two)) : current.price_for_two,
        image_url !== undefined ? String(image_url).trim() : current.image_url,
        is_open !== undefined ? (Number(is_open) === 1 ? 1 : 0) : current.is_open,
        id,
      ]
    );

    const [updated]: any = await pool.query('SELECT * FROM restaurants WHERE id = ? LIMIT 1;', [id]);

    res.json({
      success: true,
      message: 'Restaurant updated successfully.',
      data: updated[0],
    });
  } catch (error: any) {
    console.error('[Restaurant Service] updateRestaurant error:', error.message || error);
    res.status(500).json({ success: false, message: 'Internal server error updating restaurant.' });
  }
}

/**
 * Delete a restaurant (Admin)
 * DELETE /restaurants/:id
 */
export async function deleteRestaurant(req: Request, res: Response): Promise<void> {
  try {
    const id = parseInt(req.params.id, 10);
    if (isNaN(id)) {
      res.status(400).json({ success: false, message: 'Invalid restaurant ID.' });
      return;
    }

    const [existing]: any = await pool.query('SELECT id FROM restaurants WHERE id = ? LIMIT 1;', [id]);
    if (existing.length === 0) {
      res.status(404).json({ success: false, message: 'Restaurant not found.' });
      return;
    }

    await pool.query('DELETE FROM restaurants WHERE id = ?;', [id]);

    res.json({
      success: true,
      message: 'Restaurant and related menu items deleted successfully.',
    });
  } catch (error: any) {
    console.error('[Restaurant Service] deleteRestaurant error:', error.message || error);
    res.status(500).json({ success: false, message: 'Internal server error deleting restaurant.' });
  }
}
