import { Request, Response } from 'express';
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

export class AuthController {
  public register = async (req: Request, res: Response): Promise<void> => {
    try {
      const { username, email, password }: RegisterDTO = req.body;

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
        role: 'patient',
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
        await user.save();
      }

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
          id: user._id.toString(),
          username: user.username,
          email: user.email,
          role: user.role,
          ...(user.role === 'patient' && linkedId ? { patientId: linkedId } : {}),
          ...(user.role === 'doctor' && linkedId ? { doctorId: linkedId } : {}),
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

  public forgotPassword = async (req: Request, res: Response): Promise<void> => {
    try {
      const email = typeof req.body.email === 'string' ? req.body.email.toLowerCase().trim() : '';
      if (!email) {
        res.status(400).json({ success: false, message: 'Email is required' });
        return;
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
    } catch (error: unknown) {
      res.status(500).json({
        success: false,
        message: error instanceof Error ? error.message : 'Failed to send password reset code',
      });
    }
  };

  public verifyResetOtp = async (req: Request, res: Response): Promise<void> => {
    try {
      const email = typeof req.body.email === 'string' ? req.body.email.toLowerCase().trim() : '';
      const otp = typeof req.body.otp === 'string' ? req.body.otp.trim() : '';
      if (!email || !/^\d{6}$/.test(otp)) {
        res.status(400).json({ success: false, message: 'A valid email and 6-digit OTP are required' });
        return;
      }

      const otpHash = createHash('sha256').update(otp).digest('hex');
      const resetOtp = await PasswordResetOtpModel.findOne({
        email,
        otpHash,
        expiresAt: { $gt: new Date() },
      });
      if (!resetOtp) {
        res.status(400).json({ success: false, message: 'Invalid or expired OTP' });
        return;
      }

      res.status(200).json({ success: true, message: 'OTP verified successfully' });
    } catch (error: unknown) {
      res.status(500).json({
        success: false,
        message: error instanceof Error ? error.message : 'Failed to verify OTP',
      });
    }
  };

  public resetPassword = async (req: Request, res: Response): Promise<void> => {
    try {
      const email = typeof req.body.email === 'string' ? req.body.email.toLowerCase().trim() : '';
      const otp = typeof req.body.otp === 'string' ? req.body.otp.trim() : '';
      const newPassword = typeof req.body.newPassword === 'string' ? req.body.newPassword : '';
      if (!email || !/^\d{6}$/.test(otp) || newPassword.length < 6) {
        res.status(400).json({
          success: false,
          message: 'A valid email, 6-digit OTP, and password of at least 6 characters are required',
        });
        return;
      }

      const otpHash = createHash('sha256').update(otp).digest('hex');
      const resetOtp = await PasswordResetOtpModel.findOne({
        email,
        otpHash,
        expiresAt: { $gt: new Date() },
      });
      if (!resetOtp) {
        res.status(400).json({ success: false, message: 'Invalid or expired OTP' });
        return;
      }

      const hashedPassword = await PasswordHasher.hashPassword(newPassword);
      const user = await UserModel.findOneAndUpdate({ email }, { password: hashedPassword });
      if (!user) {
        res.status(400).json({ success: false, message: 'Invalid or expired OTP' });
        return;
      }

      await PasswordResetOtpModel.deleteOne({ _id: resetOtp._id });
      res.status(200).json({ success: true, message: 'Password reset successfully' });
    } catch (error: unknown) {
      res.status(500).json({
        success: false,
        message: error instanceof Error ? error.message : 'Failed to reset password',
      });
    }
  };
}
