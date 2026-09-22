import { redisClient } from '../config/redis';

export class TokenBlacklistService {
  public static async blacklistToken(token: string, expiryInSeconds: number): Promise<void> {
    if (expiryInSeconds <= 0) return;
    await redisClient.set(`blacklist:${token}`, 'blacklisted', 'EX', Math.floor(expiryInSeconds));
  }

  public static async isTokenBlacklisted(token: string): Promise<boolean> {
    const result = await redisClient.exists(`blacklist:${token}`);
    return result === 1;
  }
}
