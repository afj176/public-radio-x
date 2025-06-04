import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { Request, Response, NextFunction } from 'express';
import { User } from '../models/userModel';

const JWT_SECRET = process.env.JWT_SECRET || 'your-default-secret-key'; // Use environment variable
const SALT_ROUNDS = 10;

export const hashPassword = async (password: string): Promise<string> => {
  return bcrypt.hash(password, SALT_ROUNDS);
};

export const comparePassword = async (password: string, hash: string): Promise<boolean> => {
  return bcrypt.compare(password, hash);
};

export const generateToken = (user: Pick<User, 'id' | 'email'>): string => {
  return jwt.sign({ id: user.id, email: user.email }, JWT_SECRET, {
    expiresIn: '1h', // Token expires in 1 hour
  });
};

export interface AuthenticatedRequest extends Request {
  user?: Pick<User, 'id' | 'email'>; // Add user property to request
}

export const verifyToken = (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  const authHeader = req.headers.authorization;

  if (authHeader && authHeader.startsWith('Bearer ')) {
    const token = authHeader.substring(7); // Remove 'Bearer ' prefix
    try {
      const decoded = jwt.verify(token, JWT_SECRET) as Pick<User, 'id' | 'email'>;
      req.user = decoded; // Add decoded user info to the request object
      next();
    } catch (error) {
      console.error('JWT verification error:', error);
      return res.status(401).json({ message: 'Unauthorized: Invalid token' });
    }
  } else {
    return res.status(401).json({ message: 'Unauthorized: No token provided' });
  }
};
