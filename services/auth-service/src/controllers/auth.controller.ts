import { Request, Response } from 'express';
import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import pool from '../db.js';

const JWT_SECRET = process.env.JWT_SECRET || 'quickbite_super_secret_jwt_key_2026_academic';
const JWT_EXPIRES_IN = process.env.JWT_EXPIRES_IN || '7d';

/**
 * Register a new user
 * POST /auth/register
 */
export async function register(req: Request, res: Response): Promise<void> {
  try {
    const { name, email, phone, password, role } = req.body;

    // Validate required fields
    if (!name || !email || !password || !phone) {
      res.status(400).json({
        success: false,
        message: 'Name, email, phone, and password are required fields.',
      });
      return;
    }

    // Email format validation
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      res.status(400).json({
        success: false,
        message: 'Invalid email address format.',
      });
      return;
    }

    // Password length validation
    if (typeof password !== 'string' || password.length < 6) {
      res.status(400).json({
        success: false,
        message: 'Password must be at least 6 characters long.',
      });
      return;
    }

    // Role validation: Do not allow arbitrary users to create ADMIN accounts
    let userRole = 'CUSTOMER';
    if (role) {
      const normalizedRole = String(role).toUpperCase();
      if (normalizedRole === 'ADMIN') {
        res.status(400).json({
          success: false,
          message: 'Registering an ADMIN account through the public registration API is not permitted.',
        });
        return;
      }
      if (normalizedRole === 'RESTAURANT_OWNER' || normalizedRole === 'CUSTOMER') {
        userRole = normalizedRole;
      } else {
        res.status(400).json({
          success: false,
          message: 'Invalid role. Permitted roles are CUSTOMER or RESTAURANT_OWNER.',
        });
        return;
      }
    }

    // Check if user already exists
    const [existingUsers]: any = await pool.query(
      'SELECT id FROM users WHERE email = ? LIMIT 1;',
      [email.toLowerCase().trim()]
    );

    if (existingUsers.length > 0) {
      res.status(409).json({
        success: false,
        message: 'An account with this email address already exists.',
      });
      return;
    }

    // Hash password
    const saltRounds = 10;
    const passwordHash = await bcrypt.hash(password, saltRounds);

    // Insert user into database
    const [insertResult]: any = await pool.query(
      `INSERT INTO users (name, email, password_hash, phone, role)
       VALUES (?, ?, ?, ?, ?);`,
      [name.trim(), email.toLowerCase().trim(), passwordHash, phone.trim(), userRole]
    );

    const newUserId = insertResult.insertId;

    // Generate JWT token
    const token = jwt.sign(
      {
        userId: newUserId,
        email: email.toLowerCase().trim(),
        role: userRole,
      },
      JWT_SECRET,
      { expiresIn: JWT_EXPIRES_IN as any }
    );

    res.status(201).json({
      success: true,
      token,
      user: {
        id: newUserId,
        name: name.trim(),
        email: email.toLowerCase().trim(),
        phone: phone.trim(),
        role: userRole,
      },
    });
  } catch (error: any) {
    console.error('[Auth Service] Registration error:', error.message || error);
    res.status(500).json({
      success: false,
      message: 'Internal server error during registration.',
    });
  }
}

/**
 * Login an existing user
 * POST /auth/login
 */
export async function login(req: Request, res: Response): Promise<void> {
  try {
    const { email, password } = req.body;

    if (!email || !password || typeof email !== 'string' || typeof password !== 'string') {
      res.status(400).json({
        success: false,
        message: 'Email and password are required.',
      });
      return;
    }

    // Query user by email (case-insensitive and trimmed)
    const [rows]: any = await pool.query(
      'SELECT id, name, email, password_hash, phone, role FROM users WHERE LOWER(TRIM(email)) = ? LIMIT 1;',
      [email.toLowerCase().trim()]
    );

    if (rows.length === 0) {
      res.status(401).json({
        success: false,
        message: 'Invalid email or password.',
      });
      return;
    }

    const user = rows[0];

    // Verify password with bcrypt
    const passwordMatch = await bcrypt.compare(password, user.password_hash);
    if (!passwordMatch) {
      res.status(401).json({
        success: false,
        message: 'Invalid email or password.',
      });
      return;
    }

    // Generate JWT token
    const token = jwt.sign(
      {
        userId: user.id,
        email: user.email,
        role: user.role,
      },
      JWT_SECRET,
      { expiresIn: JWT_EXPIRES_IN as any }
    );

    res.status(200).json({
      success: true,
      token,
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        phone: user.phone,
        role: user.role,
      },
    });
  } catch (error: any) {
    console.error('[Auth Service] Login error:', error.message || error);
    res.status(500).json({
      success: false,
      message: 'Internal server error during authentication.',
    });
  }
}
