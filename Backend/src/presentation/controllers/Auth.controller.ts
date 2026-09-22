import { Request, Response } from 'express';
import jwt from 'jsonwebtoken';
import { UserModel } from '../../infrastructure/database/schemas/User.schema';
import { PasswordHasher } from '../../infrastructure/auth/PasswordHasher';
import { JwtService } from '../../infrastructure/auth/JwtService';
import { TokenBlacklistService } from '../../infrastructure/auth/TokenBlacklistService';

export class AuthController {
  public register = async (req: Request, res: Response): Promise<void> => {
    try {
      const { email, password, role } = req.body;

      if (!email || !password) {
        res.status(400).json({ success: false, message: 'Email and password are required' });
        return;
      }

      // Check if user already exists
      const existingUser = await UserModel.findOne({ email: email.toLowerCase() });
      if (existingUser) {
        res.status(400).json({ success: false, message: 'User already exists with this email' });
        return;
      }

      // Hash password and save new user
      const hashedPassword = await PasswordHasher.hashPassword(password);
      const newUser = new UserModel({
        email: email.toLowerCase(),
        password: hashedPassword,
        role: role || 'patient',
      });

      await newUser.save();

      res.status(201).json({
        success: true,
        message: 'User registered successfully',
        user: {
          id: newUser._id,
          email: newUser.email,
          role: newUser.role,
        },
      });
    } catch (error: any) {
      res.status(500).json({
        success: false,
        message: error.message || 'Error registering user',
      });
    }
  };

  public login = async (req: Request, res: Response): Promise<void> => {
    try {
      const { email, password } = req.body;

      if (!email || !password) {
        res.status(400).json({ success: false, message: 'Email and password are required' });
        return;
      }

      // Find user by email
      const user = await UserModel.findOne({ email: email.toLowerCase() });
      if (!user) {
        res.status(401).json({ success: false, message: 'Invalid email or password' });
        return;
      }

      // Compare password
      const isPasswordValid = await PasswordHasher.comparePassword(password, user.password);
      if (!isPasswordValid) {
        res.status(401).json({ success: false, message: 'Invalid email or password' });
        return;
      }

      // Generate JWT
      const token = JwtService.generateToken(user._id.toString(), user.role);

      res.status(200).json({
        success: true,
        message: 'Login successful',
        token,
        user: {
          id: user._id,
          email: user.email,
          role: user.role,
        },
      });
    } catch (error: any) {
      res.status(500).json({
        success: false,
        message: error.message || 'Error logging in',
      });
    }
  };

  public logout = async (req: Request, res: Response): Promise<void> => {
    try {
      const authHeader = req.headers.authorization;
      if (!authHeader || !authHeader.startsWith('Bearer ')) {
        res.status(400).json({ success: false, message: 'Authorization token is required' });
        return;
      }

      const token = authHeader.split(' ')[1];
      const decoded = jwt.decode(token) as { exp?: number } | null;

      let expiryInSeconds = 86400; // 1 day fallback
      if (decoded && decoded.exp) {
        const currentTime = Math.floor(Date.now() / 1000);
        expiryInSeconds = decoded.exp - currentTime;
      }

      if (expiryInSeconds > 0) {
        await TokenBlacklistService.blacklistToken(token, expiryInSeconds);
      }

      res.status(200).json({
        success: true,
        message: 'Logged out successfully',
      });
    } catch (error: any) {
      res.status(500).json({
        success: false,
        message: error.message || 'Error logging out',
      });
    }
  };
}
