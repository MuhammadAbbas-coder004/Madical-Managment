import jwt from 'jsonwebtoken';

export interface JwtPayload {
  userId: string;
  role: string;
}

export class JwtService {
  private static getSecret(): string {
    return process.env.JWT_SECRET || 'default_secret_key';
  }

  public static generateToken(userId: string, role: string): string {
    const payload: JwtPayload = { userId, role };
    return jwt.sign(payload, this.getSecret(), { expiresIn: '1d' });
  }

  public static verifyToken(token: string): JwtPayload {
    return jwt.verify(token, this.getSecret()) as JwtPayload;
  }
}
