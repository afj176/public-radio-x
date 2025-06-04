import { Router, Request, Response } from 'express';
import { User, users } from '../models/userModel';
import { hashPassword, comparePassword, generateToken } from '../auth/authService';
import { v4 as uuidv4 } from 'uuid'; // For generating user IDs

const router = Router();

// POST /api/auth/register
router.post('/register', async (req: Request, res: Response) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({ error: 'Email and password are required' });
    }

    // Check if user already exists
    const existingUser = users.find((user) => user.email === email);
    if (existingUser) {
      return res.status(409).json({ error: 'User already exists with this email' });
    }

    const passwordHash = await hashPassword(password);
    const newUser: User = {
      id: uuidv4(),
      email,
      passwordHash,
    };

    users.push(newUser); // Save new user (in-memory)

    const token = generateToken({ id: newUser.id, email: newUser.email });
    res.status(201).json({ token, userId: newUser.id, email: newUser.email });
  } catch (error) {
    console.error('Registration error:', error);
    res.status(500).json({ error: 'Internal server error during registration' });
  }
});

// POST /api/auth/login
router.post('/login', async (req: Request, res: Response) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({ error: 'Email and password are required' });
    }

    const user = users.find((u) => u.email === email);
    if (!user) {
      return res.status(401).json({ error: 'Invalid credentials: User not found' });
    }

    const isPasswordValid = await comparePassword(password, user.passwordHash);
    if (!isPasswordValid) {
      return res.status(401).json({ error: 'Invalid credentials: Password incorrect' });
    }

    const token = generateToken({ id: user.id, email: user.email });
    res.status(200).json({ token, userId: user.id, email: user.email });
  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({ error: 'Internal server error during login' });
  }
});

export default router;
