import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import {
  hashPassword,
  comparePassword,
  generateToken,
  verifyToken,
  AuthenticatedRequest,
} from '../auth/authService'; // Adjust path as necessary
import { Response, NextFunction } from 'express';
import { User } from '../models/userModel';

// Mock bcrypt and jsonwebtoken
jest.mock('bcryptjs');
jest.mock('jsonwebtoken');

describe('Auth Service', () => {
  const mockPassword = 'password123';
  const mockHash = 'hashedPassword123';
  const mockUser: Pick<User, 'id' | 'email'> = { id: 'userId1', email: 'test@example.com' };
  const mockToken = 'mockToken123';

  // Clear all mocks before each test if not using jest.config.js clearMocks
  // beforeEach(() => {
  //   jest.clearAllMocks();
  // });

  describe('hashPassword', () => {
    it('should hash a password using bcrypt', async () => {
      (bcrypt.hash as jest.Mock).mockResolvedValue(mockHash);
      const result = await hashPassword(mockPassword);
      expect(bcrypt.hash).toHaveBeenCalledWith(mockPassword, 10);
      expect(result).toBe(mockHash);
    });
  });

  describe('comparePassword', () => {
    it('should compare a password and hash using bcrypt', async () => {
      (bcrypt.compare as jest.Mock).mockResolvedValue(true);
      const result = await comparePassword(mockPassword, mockHash);
      expect(bcrypt.compare).toHaveBeenCalledWith(mockPassword, mockHash);
      expect(result).toBe(true);
    });
  });

  describe('generateToken', () => {
    it('should generate a JWT token', () => {
      (jwt.sign as jest.Mock).mockReturnValue(mockToken);
      const result = generateToken(mockUser);
      expect(jwt.sign).toHaveBeenCalledWith(
        { id: mockUser.id, email: mockUser.email },
        process.env.JWT_SECRET || 'your-default-secret-key', // Ensure this matches your service
        { expiresIn: '1h' }
      );
      expect(result).toBe(mockToken);
    });
  });

  describe('verifyToken middleware', () => {
    let mockRequest: Partial<AuthenticatedRequest>;
    let mockResponse: Partial<Response>;
    let mockNextFunction: NextFunction = jest.fn();

    beforeEach(() => {
      mockRequest = {
        headers: {},
      };
      mockResponse = {
        status: jest.fn().mockReturnThis(), // Allows chaining .json()
        json: jest.fn(),
      };
      mockNextFunction = jest.fn(); // Reset next function mock for each test
    });

    it('should call next() if token is valid', () => {
      mockRequest.headers = { authorization: `Bearer ${mockToken}` };
      (jwt.verify as jest.Mock).mockReturnValue(mockUser); // Mock successful verification

      verifyToken(mockRequest as AuthenticatedRequest, mockResponse as Response, mockNextFunction);

      expect(jwt.verify).toHaveBeenCalledWith(mockToken, process.env.JWT_SECRET || 'your-default-secret-key');
      expect(mockRequest.user).toEqual(mockUser);
      expect(mockNextFunction).toHaveBeenCalled();
      expect(mockResponse.status).not.toHaveBeenCalled();
    });

    it('should return 401 if no token is provided', () => {
      verifyToken(mockRequest as AuthenticatedRequest, mockResponse as Response, mockNextFunction);
      expect(mockResponse.status).toHaveBeenCalledWith(401);
      expect(mockResponse.json).toHaveBeenCalledWith({ message: 'Unauthorized: No token provided' });
      expect(mockNextFunction).not.toHaveBeenCalled();
    });

    it('should return 401 if token is malformed (no Bearer prefix)', () => {
      mockRequest.headers = { authorization: mockToken }; // No "Bearer "
      verifyToken(mockRequest as AuthenticatedRequest, mockResponse as Response, mockNextFunction);
      expect(mockResponse.status).toHaveBeenCalledWith(401);
      expect(mockResponse.json).toHaveBeenCalledWith({ message: 'Unauthorized: No token provided' }); // Or a more specific message if you change the logic
      expect(mockNextFunction).not.toHaveBeenCalled();
    });

    it('should return 401 if token is invalid or expired', () => {
      mockRequest.headers = { authorization: `Bearer ${mockToken}` };
      (jwt.verify as jest.Mock).mockImplementation(() => {
        throw new Error('Token verification failed');
      });

      verifyToken(mockRequest as AuthenticatedRequest, mockResponse as Response, mockNextFunction);

      expect(jwt.verify).toHaveBeenCalledWith(mockToken, process.env.JWT_SECRET || 'your-default-secret-key');
      expect(mockResponse.status).toHaveBeenCalledWith(401);
      expect(mockResponse.json).toHaveBeenCalledWith({ message: 'Unauthorized: Invalid token' });
      expect(mockNextFunction).not.toHaveBeenCalled();
    });
  });
});
