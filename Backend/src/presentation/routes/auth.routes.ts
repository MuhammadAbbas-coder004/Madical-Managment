import { Router } from 'express';
import { AuthController } from '../controllers/Auth.controller';

const authRouter = Router();
const authController = new AuthController();

authRouter.post('/register', authController.register);
authRouter.post('/login', authController.login);
authRouter.post('/logout', authController.logout);
authRouter.post('/forgot-password', authController.forgotPassword);
authRouter.post('/verify-reset-otp', authController.verifyResetOtp);
authRouter.post('/reset-password', authController.resetPassword);

export default authRouter;
