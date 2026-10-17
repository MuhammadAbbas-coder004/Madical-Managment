import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { createHash, randomInt, randomUUID } from 'crypto';
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
import { AuthenticatedRequest } from '../middlewares/auth.middleware';

export class AuthController {
  public register = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const { username, fullName, email, phoneNumber, phone, password, role = 'patient', specialty, licenseNumber }: RegisterDTO = req.body;

      if (!username || !email || !password) {
        throw new AppError(400, 'Username, email, and password are required');
      }

      if (role === 'doctor') {
        if (!specialty || specialty.trim().length < 2) {
          throw new AppError(400, 'Medical specialty is required for doctor registration');
        }
        if (!licenseNumber || licenseNumber.trim().length < 3) {
          throw new AppError(400, 'Medical license / registration number is required for doctor registration');
        }
      }

      // --- Check username uniqueness ---
      const userByUsername = await UserModel.findOne({ username: username.trim() });
      if (userByUsername) {
        throw new AppError(409, 'Username is already taken');
      }

      // --- Check email uniqueness ---
      const normalizedEmail = email.toLowerCase().trim();
      const userByEmail = await UserModel.findOne({ email: normalizedEmail });
      if (userByEmail) {
        throw new AppError(409, 'An account with this email already exists.');
      }

      const userPhone = (phoneNumber || phone || '').trim();
      let linkedId: string | undefined;

      if (role === 'doctor') {
        const existingDoctor = await DoctorModel.findOne({ email: normalizedEmail });
        if (existingDoctor) {
          linkedId = existingDoctor.doctorId;
        } else {
          const nameParts = (fullName || username).trim().split(/\s+/);
          const firstName = nameParts[0] || 'Doctor';
          const lastName = nameParts.slice(1).join(' ') || 'User';
          const newDoctorId = randomUUID();
          await DoctorModel.create({
            doctorId: newDoctorId,
            firstName,
            lastName,
            email: normalizedEmail,
            phone: userPhone || 'Not provided',
            specialization: specialty?.trim() || 'General Medicine',
          });
          linkedId = newDoctorId;
        }
      } else {
        // Automatically find or create a linked patient record
        const existingPatient = await PatientModel.findOne({ email: normalizedEmail });
        if (existingPatient) {
          linkedId = existingPatient.patientId;
        } else {
          const nameParts = (fullName || username).trim().split(/\s+/);
          const firstName = nameParts[0] || 'Patient';
          const lastName = nameParts.slice(1).join(' ') || 'User';
          const newPatientId = randomUUID();
          await PatientModel.create({
            patientId: newPatientId,
            firstName,
            lastName,
            email: normalizedEmail,
            phone: userPhone || 'Not provided',
            dateOfBirth: new Date('2000-01-01'),
          });
          linkedId = newPatientId;
        }
      }

      // Hash password and save new user
      const hashedPassword = await PasswordHasher.hashPassword(password);
      const finalFullName = (fullName || username).trim();
      const newUser = new UserModel({
        username: username.trim(),
        fullName: finalFullName,
        email: normalizedEmail,
        phoneNumber: userPhone || undefined,
        phone: userPhone || undefined,
        password: hashedPassword,
        role: role === 'doctor' ? 'doctor' : 'patient',
        status: 'active',
        isEmailVerified: false,
        isPhoneVerified: false,
        doctorVerificationStatus: role === 'doctor' ? 'pending' : 'not_applicable',
        specialty: role === 'doctor' ? specialty?.trim() : undefined,
        licenseNumber: role === 'doctor' ? licenseNumber?.trim() : undefined,
        linkedId,
      });

      await newUser.save();

      res.status(201).json({
        success: true,
        message: role === 'doctor'
          ? 'Doctor account registered successfully. Verification is pending credential review.'
          : 'User registered successfully',
        user: {
          id: newUser._id.toString(),
          username: newUser.username,
          fullName: newUser.fullName,
          name: newUser.fullName || newUser.username,
          email: newUser.email,
          phoneNumber: newUser.phoneNumber,
          phone: newUser.phone,
          role: newUser.role,
          status: newUser.status,
          doctorVerificationStatus: newUser.doctorVerificationStatus,
          specialty: newUser.specialty,
          licenseNumber: newUser.licenseNumber,
          ...(newUser.role === 'doctor' ? { doctorId: linkedId } : { patientId: linkedId }),
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
              ? 'An account with this email already exists.'
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
      const isPasswordValid =
        user.authProvider === 'password' &&
        typeof user.password === 'string' &&
        await PasswordHasher.comparePassword(password, user.password);
      if (!isPasswordValid) {
        throw new AppError(401, 'Invalid credentials');
      }

      // Resolve linked profile ID
      let linkedId = user.linkedId;
      if (!linkedId && user.role === 'patient') {
        let patient = await PatientModel.findOne({ email: user.email });
        if (!patient) {
          const nameParts = (user.username || 'Patient User').trim().split(/\s+/);
          const firstName = nameParts[0] || 'Patient';
          const lastName = nameParts.slice(1).join(' ') || 'User';
          const newPatientId = randomUUID();
          patient = await PatientModel.create({
            patientId: newPatientId,
            firstName,
            lastName,
            email: user.email,
            phone: 'Not provided',
            dateOfBirth: new Date('2000-01-01'),
          });
        }
        linkedId = patient.patientId;
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
          fullName: user.fullName,
          name: user.fullName || user.username,
          email: user.email,
          phoneNumber: user.phoneNumber,
          phone: user.phone,
          role: user.role,
          status: user.status,
          doctorVerificationStatus: user.doctorVerificationStatus,
          specialty: user.specialty,
          licenseNumber: user.licenseNumber,
          authProvider: user.authProvider,
          faceEnrollmentStatus: user.faceEnrollmentStatus,
          ...(user.role === 'patient' && linkedId ? { patientId: linkedId } : {}),
          ...(user.role === 'doctor' && linkedId ? { doctorId: linkedId } : {}),
        },
      });
    } catch (error) {
      next(error);
    }
  };

  public providerSession = async (
    req: AuthenticatedRequest,
    res: Response,
    next: NextFunction
  ): Promise<void> => {
    try {
      if (!req.user?.userId) {
        throw new AppError(401, 'Unauthorized');
      }
      const user = await UserModel.findById(req.user.userId);
      if (!user) {
        throw new AppError(401, 'Unauthorized');
      }
      res.status(200).json({
        success: true,
        user: {
          id: user._id.toString(),
          username: user.username,
          fullName: user.fullName,
          name: user.fullName || user.username,
          email: user.email,
          phoneNumber: user.phoneNumber,
          phone: user.phone,
          role: user.role,
          status: user.status,
          doctorVerificationStatus: user.doctorVerificationStatus,
          specialty: user.specialty,
          licenseNumber: user.licenseNumber,
          authProvider: user.authProvider,
          faceEnrollmentStatus: user.faceEnrollmentStatus,
          ...(user.role === 'patient' && user.linkedId ? { patientId: user.linkedId } : {}),
          ...(user.role === 'doctor' && user.linkedId ? { doctorId: user.linkedId } : {}),
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

  public faceVerify = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      res.status(503).json({
        success: false,
        verified: false,
        configured: false,
        message: 'Face verification is unavailable because no server-side biometric verification service is configured. Please sign in with your email and password.',
      });
    } catch (error) {
      next(error);
    }
  };
}
