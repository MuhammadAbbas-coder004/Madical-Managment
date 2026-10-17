import { Router } from 'express';
import { AuthController } from '../controllers/Auth.controller';
import { OAuthController } from '../controllers/OAuth.controller';
import { authMiddleware } from '../middlewares/auth.middleware';
import {
  loginRateLimiter,
  oauthRateLimiter,
  passwordResetRateLimiter,
  registerRateLimiter,
} from '../middlewares/rateLimit.middleware';
import { validate } from '../middlewares/validate.middleware';
import {
  registerSchema,
  loginSchema,
  forgotPasswordSchema,
  verifyResetOtpSchema,
  resetPasswordSchema,
} from '../schemas';

const authRouter = Router();
const authController = new AuthController();
const oauthController = new OAuthController();

// Registration endpoint
authRouter.post('/register', registerRateLimiter, validate(registerSchema), authController.register);

// Strict rate limit: 5 attempts per 15 minutes per IP
authRouter.post('/login', loginRateLimiter, validate(loginSchema), authController.login);
authRouter.post('/face-verify', authController.faceVerify);
authRouter.post('/logout', authController.logout);
authRouter.get('/session', authMiddleware, authController.providerSession);

authRouter.get('/providers', oauthController.getProviders);
authRouter.get('/google', oauthRateLimiter, oauthController.start('google'));
authRouter.get('/google/callback', oauthController.callback('google'));
authRouter.get('/apple', oauthRateLimiter, oauthController.start('apple'));
authRouter.get('/apple/callback', oauthController.callback('apple'));
authRouter.post('/apple/callback', oauthController.callback('apple'));


// Strict rate limit: 5 attempts per 15 minutes per IP for OTP and password recovery
authRouter.post('/forgot-password', passwordResetRateLimiter, validate(forgotPasswordSchema), authController.forgotPassword);
authRouter.post('/verify-reset-otp', passwordResetRateLimiter, validate(verifyResetOtpSchema), authController.verifyResetOtp);
authRouter.post('/reset-password', passwordResetRateLimiter, validate(resetPasswordSchema), authController.resetPassword);

export default authRouter;
