import { redisClient } from '../config/redis';

export class TokenBlacklistService {
  public static async blacklistToken(token: string, expiryInSeconds: number): Promise<void> {
    if (expiryInSeconds <= 0) return;
    try {
      await redisClient.set(`blacklist:${token}`, 'blacklisted', 'EX', Math.floor(expiryInSeconds));
    } catch (error: any) {
      console.warn('⚠️ [TokenBlacklistService] Could not blacklist token in Redis:', error.message || error);
    }
  }

  public static async isTokenBlacklisted(token: string): Promise<boolean> {
    try {
      const result = await redisClient.exists(`blacklist:${token}`);
      return result === 1;
    } catch (error: any) {
      console.warn('⚠️ [TokenBlacklistService] Could not check blacklist in Redis, failing open:', error.message || error);
      return false;
    }
  }
}
