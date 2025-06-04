import bcrypt from 'bcryptjs';
import jwt, { JsonWebTokenError, TokenExpiredError } from 'jsonwebtoken';
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
  const testJwtSecret = 'test-secret-key';

  beforeEach(() => {
    // Clear all mocks before each test
    (bcrypt.hash as jest.Mock).mockClear();
    (bcrypt.compare as jest.Mock).mockClear();
    (jwt.sign as jest.Mock).mockClear();
    (jwt.verify as jest.Mock).mockClear();
  });

  describe('hashPassword', () => {
    it('should hash a password using bcrypt', async () => {
      (bcrypt.hash as jest.Mock).mockResolvedValue(mockHash);
      const result = await hashPassword(mockPassword);
      expect(bcrypt.hash).toHaveBeenCalledWith(mockPassword, 10);
      expect(result).toBe(mockHash);
    });

    it('should propagate error if bcrypt.hash throws', async () => {
      const errorMessage = 'bcrypt hash error';
      (bcrypt.hash as jest.Mock).mockRejectedValue(new Error(errorMessage));
      await expect(hashPassword(mockPassword)).rejects.toThrow(errorMessage);
    });
  });

  describe('comparePassword', () => {
    it('should return true if password and hash match', async () => {
      (bcrypt.compare as jest.Mock).mockResolvedValue(true);
      const result = await comparePassword(mockPassword, mockHash);
      expect(bcrypt.compare).toHaveBeenCalledWith(mockPassword, mockHash);
      expect(result).toBe(true);
    });

    it('should return false if password and hash do not match', async () => {
      (bcrypt.compare as jest.Mock).mockResolvedValue(false);
      const result = await comparePassword(mockPassword, mockHash);
      expect(bcrypt.compare).toHaveBeenCalledWith(mockPassword, mockHash);
      expect(result).toBe(false);
    });

    it('should propagate error if bcrypt.compare throws', async () => {
      const errorMessage = 'bcrypt compare error';
      (bcrypt.compare as jest.Mock).mockRejectedValue(new Error(errorMessage));
      await expect(comparePassword(mockPassword, mockHash)).rejects.toThrow(errorMessage);
    });
  });

  describe('generateToken', () => {
    let originalProcessEnv: NodeJS.ProcessEnv;

    beforeAll(() => {
      originalProcessEnv = process.env;
      process.env = { ...originalProcessEnv, JWT_SECRET: testJwtSecret };
    });

    afterAll(() => {
      process.env = originalProcessEnv;
    });

    it('should generate a JWT token using configured secret', () => {
      (jwt.sign as jest.Mock).mockReturnValue(mockToken);
      const result = generateToken(mockUser);
      expect(jwt.sign).toHaveBeenCalledWith(
        { id: mockUser.id, email: mockUser.email },
        testJwtSecret, // Uses the explicitly set JWT_SECRET
        { expiresIn: '1h' }
      );
      expect(result).toBe(mockToken);
    });

    it('should handle jwt.sign throwing an error (e.g. invalid secret or options)', () => {
      const signError = new Error('JWT sign error');
      (jwt.sign as jest.Mock).mockImplementation(() => {
        throw signError;
      });
      expect(() => generateToken(mockUser)).toThrow(signError);
    });
  });

  describe('verifyToken middleware', () => {
    let mockRequest: Partial<AuthenticatedRequest>;
    let mockResponse: Partial<Response>;
    let mockNextFunction: NextFunction = jest.fn();
    let originalProcessEnv: NodeJS.ProcessEnv;

     beforeAll(() => {
      originalProcessEnv = process.env;
      process.env = { ...originalProcessEnv, JWT_SECRET: testJwtSecret };
    });

    afterAll(() => {
      process.env = originalProcessEnv;
    });

    beforeEach(() => {
      mockRequest = { headers: {} };
      mockResponse = {
        status: jest.fn().mockReturnThis(),
        json: jest.fn(),
      };
      mockNextFunction = jest.fn();
      (jwt.verify as jest.Mock).mockReset(); // Reset verify mock specifically
    });

    it('should call next() and set req.user if token is valid', () => {
      mockRequest.headers = { authorization: `Bearer ${mockToken}` };
      (jwt.verify as jest.Mock).mockReturnValue(mockUser);

      verifyToken(mockRequest as AuthenticatedRequest, mockResponse as Response, mockNextFunction);

      expect(jwt.verify).toHaveBeenCalledWith(mockToken, testJwtSecret);
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
      // This behavior is correct based on `authHeader.startsWith('Bearer ')`
      expect(mockResponse.json).toHaveBeenCalledWith({ message: 'Unauthorized: No token provided' });
      expect(mockNextFunction).not.toHaveBeenCalled();
    });

    it('should return 401 if authorization header uses lowercase "bearer"', () => {
      mockRequest.headers = { authorization: `bearer ${mockToken}` }; // lowercase 'bearer'
      verifyToken(mockRequest as AuthenticatedRequest, mockResponse as Response, mockNextFunction);
      expect(mockResponse.status).toHaveBeenCalledWith(401);
      // This behavior is correct based on `authHeader.startsWith('Bearer ')` (case-sensitive)
      expect(mockResponse.json).toHaveBeenCalledWith({ message: 'Unauthorized: No token provided' });
      expect(mockNextFunction).not.toHaveBeenCalled();
    });

    it('should return 401 for TokenExpiredError', () => {
      mockRequest.headers = { authorization: `Bearer ${mockToken}` };
      (jwt.verify as jest.Mock).mockImplementation(() => {
        throw new TokenExpiredError('Token expired', new Date());
      });

      verifyToken(mockRequest as AuthenticatedRequest, mockResponse as Response, mockNextFunction);
      expect(mockResponse.status).toHaveBeenCalledWith(401);
      expect(mockResponse.json).toHaveBeenCalledWith({ message: 'Unauthorized: Invalid token' });
    });

    it('should return 401 for JsonWebTokenError (e.g., malformed token)', () => {
      mockRequest.headers = { authorization: `Bearer ${mockToken}` };
      (jwt.verify as jest.Mock).mockImplementation(() => {
        throw new JsonWebTokenError('Invalid signature');
      });

      verifyToken(mockRequest as AuthenticatedRequest, mockResponse as Response, mockNextFunction);
      expect(mockResponse.status).toHaveBeenCalledWith(401);
      expect(mockResponse.json).toHaveBeenCalledWith({ message: 'Unauthorized: Invalid token' });
    });

    it('should return 401 for generic errors during jwt.verify', () => {
      mockRequest.headers = { authorization: `Bearer ${mockToken}` };
      (jwt.verify as jest.Mock).mockImplementation(() => {
        throw new Error('Some other verification error');
      });
      verifyToken(mockRequest as AuthenticatedRequest, mockResponse as Response, mockNextFunction);
      expect(mockResponse.status).toHaveBeenCalledWith(401);
      expect(mockResponse.json).toHaveBeenCalledWith({ message: 'Unauthorized: Invalid token' });
    });

    it('should set req.user to an empty object if token payload is empty (and proceed if no error)', () => {
      mockRequest.headers = { authorization: `Bearer ${mockToken}` };
      // Simulate successful verification but with an empty payload
      (jwt.verify as jest.Mock).mockReturnValue({});

      verifyToken(mockRequest as AuthenticatedRequest, mockResponse as Response, mockNextFunction);

      expect(jwt.verify).toHaveBeenCalledWith(mockToken, testJwtSecret);
      // Current behavior: req.user would be what jwt.verify returns.
      // If the service expects id/email, further checks might be needed in the service or route handlers.
      // For verifyToken itself, it correctly assigns what it gets if no error.
      expect(mockRequest.user).toEqual({});
      expect(mockNextFunction).toHaveBeenCalled(); // Proceeds as token was 'valid' from jwt.verify's perspective
      expect(mockResponse.status).not.toHaveBeenCalled();
    });

     it('should set req.user correctly if token payload is missing email (and proceed if no error)', () => {
      mockRequest.headers = { authorization: `Bearer ${mockToken}` };
      (jwt.verify as jest.Mock).mockReturnValue({ id: 'userId1' }); // Payload missing email

      verifyToken(mockRequest as AuthenticatedRequest, mockResponse as Response, mockNextFunction);

      expect(jwt.verify).toHaveBeenCalledWith(mockToken, testJwtSecret);
      expect(mockRequest.user).toEqual({ id: 'userId1' });
      expect(mockNextFunction).toHaveBeenCalled();
    });

    it('should set req.user correctly if token payload is missing id (and proceed if no error)', () => {
      mockRequest.headers = { authorization: `Bearer ${mockToken}` };
      (jwt.verify as jest.Mock).mockReturnValue({ email: 'test@example.com' }); // Payload missing id

      verifyToken(mockRequest as AuthenticatedRequest, mockResponse as Response, mockNextFunction);

      expect(jwt.verify).toHaveBeenCalledWith(mockToken, testJwtSecret);
      expect(mockRequest.user).toEqual({ email: 'test@example.com' });
      expect(mockNextFunction).toHaveBeenCalled();
    });
  });
});
