import { Request, Response } from 'express';
import pool from '../db.js';

/**
 * Get current authenticated user profile
 * GET /users/me
 */
export async function getProfile(req: Request, res: Response): Promise<void> {
  try {
    const userId = req.user?.userId;
    if (!userId) {
      res.status(401).json({ success: false, message: 'Unauthorized' });
      return;
    }

    const [rows]: any = await pool.query(
      `SELECT id, name, email, phone, role, created_at, updated_at
       FROM users
       WHERE id = ? LIMIT 1;`,
      [userId]
    );

    if (rows.length === 0) {
      res.status(404).json({ success: false, message: 'User not found.' });
      return;
    }

    res.json({
      success: true,
      data: rows[0],
    });
  } catch (error: any) {
    console.error('[User Service] getProfile error:', error.message || error);
    res.status(500).json({ success: false, message: 'Internal server error fetching profile.' });
  }
}

/**
 * Update current authenticated user profile
 * PUT /users/me
 */
export async function updateProfile(req: Request, res: Response): Promise<void> {
  try {
    const userId = req.user?.userId;
    if (!userId) {
      res.status(401).json({ success: false, message: 'Unauthorized' });
      return;
    }

    const { name, phone } = req.body;

    if (!name && !phone) {
      res.status(400).json({ success: false, message: 'At least one field (name or phone) must be provided.' });
      return;
    }

    // Check if user exists
    const [existing]: any = await pool.query('SELECT id, name, phone FROM users WHERE id = ? LIMIT 1;', [userId]);
    if (existing.length === 0) {
      res.status(404).json({ success: false, message: 'User not found.' });
      return;
    }

    const current = existing[0];
    const updatedName = name !== undefined ? String(name).trim() : current.name;
    const updatedPhone = phone !== undefined ? String(phone).trim() : current.phone;

    if (name !== undefined && updatedName.length === 0) {
      res.status(400).json({ success: false, message: 'Name cannot be empty.' });
      return;
    }

    await pool.query(
      'UPDATE users SET name = ?, phone = ? WHERE id = ?;',
      [updatedName, updatedPhone, userId]
    );

    const [updatedRows]: any = await pool.query(
      `SELECT id, name, email, phone, role, created_at, updated_at
       FROM users WHERE id = ? LIMIT 1;`,
      [userId]
    );

    res.json({
      success: true,
      message: 'Profile updated successfully.',
      data: updatedRows[0],
    });
  } catch (error: any) {
    console.error('[User Service] updateProfile error:', error.message || error);
    res.status(500).json({ success: false, message: 'Internal server error updating profile.' });
  }
}

/**
 * Get all users (Admin view)
 * GET /users
 */
export async function getAllUsers(_req: Request, res: Response): Promise<void> {
  try {
    const [rows]: any = await pool.query(
      `SELECT id, name, email, phone, role, created_at, updated_at
       FROM users
       ORDER BY id ASC;`
    );

    res.json({
      success: true,
      data: rows,
    });
  } catch (error: any) {
    console.error('[User Service] getAllUsers error:', error.message || error);
    res.status(500).json({ success: false, message: 'Internal server error fetching users.' });
  }
}

/**
 * Get user by ID
 * GET /users/:id
 */
export async function getUserById(req: Request, res: Response): Promise<void> {
  try {
    const targetId = parseInt(req.params.id, 10);
    if (isNaN(targetId)) {
      res.status(400).json({ success: false, message: 'Invalid user ID parameter.' });
      return;
    }

    const [rows]: any = await pool.query(
      `SELECT id, name, email, phone, role, created_at, updated_at
       FROM users
       WHERE id = ? LIMIT 1;`,
      [targetId]
    );

    if (rows.length === 0) {
      res.status(404).json({ success: false, message: 'User not found.' });
      return;
    }

    res.json({
      success: true,
      data: rows[0],
    });
  } catch (error: any) {
    console.error('[User Service] getUserById error:', error.message || error);
    res.status(500).json({ success: false, message: 'Internal server error fetching user.' });
  }
}
