import { Request, Response } from 'express';
import pool from '../db.js';

/**
 * Get all addresses for current user
 * GET /users/me/addresses
 */
export async function getUserAddresses(req: Request, res: Response): Promise<void> {
  try {
    const userId = req.user?.userId;
    if (!userId) {
      res.status(401).json({ success: false, message: 'Unauthorized' });
      return;
    }

    const [rows]: any = await pool.query(
      `SELECT id, user_id, address_line, area, city, state, pincode, created_at
       FROM addresses
       WHERE user_id = ?
       ORDER BY id DESC;`,
      [userId]
    );

    res.json({
      success: true,
      data: rows,
    });
  } catch (error: any) {
    console.error('[User Service] getUserAddresses error:', error.message || error);
    res.status(500).json({ success: false, message: 'Internal server error fetching addresses.' });
  }
}

/**
 * Add a new address for current user
 * POST /users/me/addresses
 */
export async function addAddress(req: Request, res: Response): Promise<void> {
  try {
    const userId = req.user?.userId;
    if (!userId) {
      res.status(401).json({ success: false, message: 'Unauthorized' });
      return;
    }

    const { address_line, area, city, state, pincode } = req.body;
    const resolvedLine = address_line || req.body.address;
    const resolvedState = state || 'Telangana';

    if (!resolvedLine || !area || !city || !pincode) {
      res.status(400).json({
        success: false,
        message: 'address_line, area, city, and pincode are all required.',
      });
      return;
    }

    const [result]: any = await pool.query(
      `INSERT INTO addresses (user_id, address_line, area, city, state, pincode)
       VALUES (?, ?, ?, ?, ?, ?);`,
      [userId, String(resolvedLine).trim(), String(area).trim(), String(city).trim(), String(resolvedState).trim(), String(pincode).trim()]
    );

    const [newAddressRows]: any = await pool.query(
      'SELECT id, user_id, address_line, area, city, state, pincode, created_at FROM addresses WHERE id = ?;',
      [result.insertId]
    );

    res.status(201).json({
      success: true,
      message: 'Address added successfully.',
      data: newAddressRows[0],
    });
  } catch (error: any) {
    console.error('[User Service] addAddress error:', error.message || error);
    res.status(500).json({ success: false, message: 'Internal server error adding address.' });
  }
}

/**
 * Update an existing address
 * PUT /users/me/addresses/:id
 */
export async function updateAddress(req: Request, res: Response): Promise<void> {
  try {
    const userId = req.user?.userId;
    if (!userId) {
      res.status(401).json({ success: false, message: 'Unauthorized' });
      return;
    }

    const addressId = parseInt(req.params.id, 10);
    if (isNaN(addressId)) {
      res.status(400).json({ success: false, message: 'Invalid address ID.' });
      return;
    }

    // Verify address exists and belongs to this user
    const [existing]: any = await pool.query(
      'SELECT id, user_id, address_line, area, city, state, pincode FROM addresses WHERE id = ?;',
      [addressId]
    );

    if (existing.length === 0) {
      res.status(404).json({ success: false, message: 'Address not found.' });
      return;
    }

    if (existing[0].user_id !== userId) {
      res.status(403).json({ success: false, message: 'Forbidden: You cannot modify an address belonging to another user.' });
      return;
    }

    const current = existing[0];
    const { address_line, area, city, state, pincode } = req.body;

    const updatedLine = address_line !== undefined ? String(address_line).trim() : current.address_line;
    const updatedArea = area !== undefined ? String(area).trim() : current.area;
    const updatedCity = city !== undefined ? String(city).trim() : current.city;
    const updatedState = state !== undefined ? String(state).trim() : current.state;
    const updatedPincode = pincode !== undefined ? String(pincode).trim() : current.pincode;

    await pool.query(
      `UPDATE addresses 
       SET address_line = ?, area = ?, city = ?, state = ?, pincode = ?
       WHERE id = ? AND user_id = ?;`,
      [updatedLine, updatedArea, updatedCity, updatedState, updatedPincode, addressId, userId]
    );

    const [updatedRows]: any = await pool.query(
      'SELECT id, user_id, address_line, area, city, state, pincode, created_at FROM addresses WHERE id = ?;',
      [addressId]
    );

    res.json({
      success: true,
      message: 'Address updated successfully.',
      data: updatedRows[0],
    });
  } catch (error: any) {
    console.error('[User Service] updateAddress error:', error.message || error);
    res.status(500).json({ success: false, message: 'Internal server error updating address.' });
  }
}

/**
 * Delete an address
 * DELETE /users/me/addresses/:id
 */
export async function deleteAddress(req: Request, res: Response): Promise<void> {
  try {
    const userId = req.user?.userId;
    if (!userId) {
      res.status(401).json({ success: false, message: 'Unauthorized' });
      return;
    }

    const addressId = parseInt(req.params.id, 10);
    if (isNaN(addressId)) {
      res.status(400).json({ success: false, message: 'Invalid address ID.' });
      return;
    }

    // Verify address exists and belongs to this user
    const [existing]: any = await pool.query(
      'SELECT id, user_id FROM addresses WHERE id = ?;',
      [addressId]
    );

    if (existing.length === 0) {
      res.status(404).json({ success: false, message: 'Address not found.' });
      return;
    }

    if (existing[0].user_id !== userId) {
      res.status(403).json({ success: false, message: 'Forbidden: You cannot delete an address belonging to another user.' });
      return;
    }

    await pool.query('DELETE FROM addresses WHERE id = ? AND user_id = ?;', [addressId, userId]);

    res.json({
      success: true,
      message: 'Address deleted successfully.',
    });
  } catch (error: any) {
    console.error('[User Service] deleteAddress error:', error.message || error);
    res.status(500).json({ success: false, message: 'Internal server error deleting address.' });
  }
}
