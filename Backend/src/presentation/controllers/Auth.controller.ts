import { Request, Response } from 'express';
import jwt from 'jsonwebtoken';
import { UserModel } from '../../infrastructure/database/schemas/User.schema';
import { PasswordHasher } from '../../infrastructure/auth/PasswordHasher';
import { JwtService } from '../../infrastructure/auth/JwtService';
import { TokenBlacklistService } from '../../infrastructure/auth/TokenBlacklistService';
import { RegisterDTO, LoginDTO } from '../../application/auth';

export class AuthController {
  public register = async (req: Request, res: Response): Promise<void> => {
    try {
      const { username, email, password, role }: RegisterDTO = req.body;

      if (!username || !email || !password) {
        res.status(400).json({
          success: false,
          message: 'Username, email, and password are required',
        });
        return;
      }

      // --- Check username uniqueness ---
      const userByUsername = await UserModel.findOne({ username: username.trim() });
      if (userByUsername) {
        res.status(400).json({
          success: false,
          message: 'Username is already taken',
        });
        return;
      }

      // --- Check email uniqueness ---
      const userByEmail = await UserModel.findOne({ email: email.toLowerCase().trim() });
      if (userByEmail) {
        res.status(400).json({
          success: false,
          message: 'An account already exists with this email',
        });
        return;
      }

      // --- Check password uniqueness ---
      // NOTE: bcrypt generates a unique salt per hash, so two users with the
      // same plaintext password will produce different stored hashes. The
      // MongoDB unique index on the password field only guards against exact
      // hash collisions (effectively impossible). To detect duplicate
      // plaintext passwords we must compare against every stored hash, which
      // is O(n) and will slow down registrations as the user base grows.
      // Consider removing this check or enforcing it only in high-security
      // contexts (e.g. admin accounts).
      const allUsers = await UserModel.find({}, { password: 1 });
      for (const existingUser of allUsers) {
        const isSamePassword = await PasswordHasher.comparePassword(
          password,
          existingUser.password
        );
        if (isSamePassword) {
          res.status(400).json({
            success: false,
            message: 'This password is already in use. Please choose a different password.',
          });
          return;
        }
      }

      // Hash password and save new user
      const hashedPassword = await PasswordHasher.hashPassword(password);
      const newUser = new UserModel({
        username: username.trim(),
        email: email.toLowerCase().trim(),
        password: hashedPassword,
        role: role || 'patient',
      });

      await newUser.save();

      res.status(201).json({
        success: true,
        message: 'User registered successfully',
        user: {
          id: newUser._id,
          username: newUser.username,
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
      const { username, email, password }: LoginDTO = req.body;

      if ((!username && !email) || !password) {
        res.status(400).json({
          success: false,
          message: 'Username or email, and password are required',
        });
        return;
      }

      // Find user by either username or email
      const queryConditions: Array<{ email?: string; username?: string }> = [];
      if (email) {
        queryConditions.push({ email: email.toLowerCase().trim() });
      }
      if (username) {
        queryConditions.push({ username: username.trim() });
      }

      const user = await UserModel.findOne({ $or: queryConditions });
      if (!user) {
        res.status(401).json({ success: false, message: 'Invalid credentials' });
        return;
      }

      // Compare password
      const isPasswordValid = await PasswordHasher.comparePassword(password, user.password);
      if (!isPasswordValid) {
        res.status(401).json({ success: false, message: 'Invalid credentials' });
        return;
      }

      // Generate JWT
      const token = JwtService.generateToken(user._id.toString(), user.role);

      // Set HTTP-only cookie
      const isProduction = process.env.NODE_ENV === 'production';
      res.cookie('token', token, {
        httpOnly: true,
        secure: isProduction,
        sameSite: isProduction ? 'strict' : 'lax',
        maxAge: 24 * 60 * 60 * 1000, // 1 day
      });

      res.status(200).json({
        success: true,
        message: 'Login successful',
        user: {
          id: user._id,
          username: user.username,
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
      const token =
        req.cookies?.token ||
        (req.headers.authorization?.startsWith('Bearer ')
          ? req.headers.authorization.split(' ')[1]
          : undefined);

      if (token) {
        const decoded = jwt.decode(token) as { exp?: number } | null;

        let expiryInSeconds = 86400; // 1 day fallback
        if (decoded && decoded.exp) {
          const currentTime = Math.floor(Date.now() / 1000);
          expiryInSeconds = decoded.exp - currentTime;
        }

        if (expiryInSeconds > 0) {
          await TokenBlacklistService.blacklistToken(token, expiryInSeconds);
        }
      }

      const isProduction = process.env.NODE_ENV === 'production';
      res.clearCookie('token', {
        httpOnly: true,
        secure: isProduction,
        sameSite: isProduction ? 'strict' : 'lax',
      });

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
