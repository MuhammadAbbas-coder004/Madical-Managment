import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { createHash, randomInt } from 'crypto';
import { UserModel } from '../../infrastructure/database/schemas/User.schema';
import { PatientModel } from '../../infrastructure/database/schemas/Patient.schema';
import { DoctorModel } from '../../infrastructure/database/schemas/Doctor.schema';
import { PasswordResetOtpModel } from '../../infrastructure/database/schemas/PasswordResetOtp.schema';
import { PasswordHasher } from '../../infrastructure/auth/PasswordHasher';
import { JwtService } from '../../infrastructure/auth/JwtService';
import { TokenBlacklistService } from '../../infrastructure/auth/TokenBlacklistService';
import { RegisterDTO, LoginDTO } from '../../application/auth';
import { EmailService } from '../../infrastructure/notifications/EmailService';
import { env } from '../../infrastructure/config/env';
import { AppError } from '../../domain/errors/AppError';

export class AuthController {
  public register = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const { username, email, password }: RegisterDTO = req.body;

      if (!username || !email || !password) {
        throw new AppError(400, 'Username, email, and password are required');
      }

      // --- Check username uniqueness ---
      const userByUsername = await UserModel.findOne({ username: username.trim() });
      if (userByUsername) {
        throw new AppError(409, 'Username is already taken');
      }

      // --- Check email uniqueness ---
      const userByEmail = await UserModel.findOne({ email: email.toLowerCase().trim() });
      if (userByEmail) {
        throw new AppError(409, 'An account already exists with this email');
      }

      // Hash password and save new user
      const hashedPassword = await PasswordHasher.hashPassword(password);
      const newUser = new UserModel({
        username: username.trim(),
        email: email.toLowerCase().trim(),
        password: hashedPassword,
        role: 'patient',
      });

      await newUser.save();

      res.status(201).json({
        success: true,
        message: 'User registered successfully',
        user: {
          id: newUser._id.toString(),
          username: newUser.username,
          email: newUser.email,
          role: newUser.role,
          authProvider: newUser.authProvider,
          createdAt: newUser.createdAt,
          faceEnrollmentStatus: newUser.faceEnrollmentStatus,
        },
      });
    } catch (error) {
      if (
        typeof error === 'object' &&
        error !== null &&
        'code' in error &&
        error.code === 11000
      ) {
        const duplicateKey =
          ('keyPattern' in error && typeof error.keyPattern === 'object' && error.keyPattern !== null
            ? error.keyPattern
            : 'keyValue' in error && typeof error.keyValue === 'object' && error.keyValue !== null
              ? error.keyValue
              : {}) as Record<string, unknown>;
        next(
          new AppError(
            409,
            'email' in duplicateKey
              ? 'An account already exists with this email'
              : 'username' in duplicateKey
                ? 'Username is already taken'
                : 'An account already exists with this email or username'
          )
        );
        return;
      }
      next(error);
    }
  };

  public login = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const { username, email, password }: LoginDTO = req.body;

      if ((!username && !email) || !password) {
        throw new AppError(400, 'Username or email, and password are required');
      }

      // Find user by either username or email
      const queryConditions: Array<{ email?: string; username?: string }> = [];
      if (email) {
        queryConditions.push({ email: email.toLowerCase().trim() });
      }
      if (username) {
        queryConditions.push({ username: username.trim() });
      }

      const user = await UserModel.findOne({ $or: queryConditions }).select('+password');
      if (!user) {
        throw new AppError(401, 'Invalid credentials');
      }

      // Compare password
      const isPasswordValid = await PasswordHasher.comparePassword(password, user.password);
      if (!isPasswordValid) {
        throw new AppError(401, 'Invalid credentials');
      }

      // Resolve linked profile ID
      let linkedId = user.linkedId;
      if (!linkedId && user.role === 'patient') {
        const patient = await PatientModel.findOne({ email: user.email });
        linkedId = patient?.patientId;
      } else if (!linkedId && user.role === 'doctor') {
        const doctor = await DoctorModel.findOne({ email: user.email });
        linkedId = doctor?.doctorId;
      }
      if (linkedId && linkedId !== user.linkedId) {
        user.linkedId = linkedId;
      }
      user.lastLoginAt = new Date();
      await user.save();

      // Generate JWT with userId, role, and linkedId
      const token = JwtService.generateToken(user._id.toString(), user.role, linkedId);

      // Set HTTP-only cookie
      const isProduction = env.isProduction;
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
          id: user._id.toString(),
          username: user.username,
          email: user.email,
          role: user.role,
          ...(user.role === 'patient' && linkedId ? { patientId: linkedId } : {}),
          ...(user.role === 'doctor' && linkedId ? { doctorId: linkedId } : {}),
        },
      });
    } catch (error) {
      next(error);
    }
  };

  public logout = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
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

      const isProduction = env.isProduction;
      res.clearCookie('token', {
        httpOnly: true,
        secure: isProduction,
        sameSite: isProduction ? 'strict' : 'lax',
      });

      res.status(200).json({
        success: true,
        message: 'Logged out successfully',
      });
    } catch (error) {
      next(error);
    }
  };

  public forgotPassword = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const email = typeof req.body.email === 'string' ? req.body.email.toLowerCase().trim() : '';
      if (!email) {
        throw new AppError(400, 'Email is required');
      }

      const user = await UserModel.findOne({ email });
      if (user) {
        const otp = randomInt(0, 1_000_000).toString().padStart(6, '0');
        const otpHash = createHash('sha256').update(otp).digest('hex');
        const expiresAt = new Date(Date.now() + 10 * 60 * 1000);

        await PasswordResetOtpModel.findOneAndUpdate(
          { email },
          { otpHash, expiresAt },
          { upsert: true, new: true, setDefaultsOnInsert: true }
        );

        try {
          await EmailService.sendEmail(
            email,
            'Password reset code',
            `Your password reset code is ${otp}. It expires in 10 minutes.`
          );
        } catch (error) {
          await PasswordResetOtpModel.deleteOne({ email, otpHash });
          throw error;
        }
      }

      res.status(200).json({
        success: true,
        message: 'If an account exists for that email, a reset code has been sent.',
      });
    } catch (error) {
      next(error);
    }
  };

  public verifyResetOtp = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const email = typeof req.body.email === 'string' ? req.body.email.toLowerCase().trim() : '';
      const otp = typeof req.body.otp === 'string' ? req.body.otp.trim() : '';
      if (!email || !/^\d{6}$/.test(otp)) {
        throw new AppError(400, 'A valid email and 6-digit OTP are required');
      }

      const otpHash = createHash('sha256').update(otp).digest('hex');
      const resetOtp = await PasswordResetOtpModel.findOne({
        email,
        otpHash,
        expiresAt: { $gt: new Date() },
      });
      if (!resetOtp) {
        throw new AppError(400, 'Invalid or expired OTP');
      }

      res.status(200).json({ success: true, message: 'OTP verified successfully' });
    } catch (error) {
      next(error);
    }
  };

  public resetPassword = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const email = typeof req.body.email === 'string' ? req.body.email.toLowerCase().trim() : '';
      const otp = typeof req.body.otp === 'string' ? req.body.otp.trim() : '';
      const newPassword = typeof req.body.newPassword === 'string' ? req.body.newPassword : '';
      if (!email || !/^\d{6}$/.test(otp) || newPassword.length < 6) {
        throw new AppError(400, 'A valid email, 6-digit OTP, and password of at least 6 characters are required');
      }

      const otpHash = createHash('sha256').update(otp).digest('hex');
      const resetOtp = await PasswordResetOtpModel.findOne({
        email,
        otpHash,
        expiresAt: { $gt: new Date() },
      });
      if (!resetOtp) {
        throw new AppError(400, 'Invalid or expired OTP');
      }

      const hashedPassword = await PasswordHasher.hashPassword(newPassword);
      const user = await UserModel.findOneAndUpdate({ email }, { password: hashedPassword });
      if (!user) {
        throw new AppError(400, 'Invalid or expired OTP');
      }

      await PasswordResetOtpModel.deleteOne({ _id: resetOtp._id });
      res.status(200).json({ success: true, message: 'Password reset successfully' });
    } catch (error) {
      next(error);
    }
  };
}
