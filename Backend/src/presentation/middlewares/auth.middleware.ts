import { Request, Response, NextFunction } from 'express';
import { JwtService, JwtPayload } from '../../infrastructure/auth/JwtService';
import { TokenBlacklistService } from '../../infrastructure/auth/TokenBlacklistService';

export interface AuthenticatedRequest extends Request {
  user?: JwtPayload;
}

export const authMiddleware = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const token = req.cookies?.token;

    if (!token) {
      res.status(401).json({ success: false, message: 'Unauthorized' });
      return;
    }

    // Check if token is blacklisted in Redis
    const isBlacklisted = await TokenBlacklistService.isTokenBlacklisted(token);
    if (isBlacklisted) {
      res.status(401).json({ success: false, message: 'Token is invalid' });
      return;
    }

    // Verify token
    try {
      const decoded = JwtService.verifyToken(token);
      req.user = decoded;
      next();
    } catch (err) {
      res.status(401).json({ success: false, message: 'Unauthorized' });
    }
  } catch (error) {
    res.status(500).json({ success: false, message: 'Authentication error' });
  }
};
