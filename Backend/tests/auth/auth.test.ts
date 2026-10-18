import { describe, it, expect, vi } from 'vitest';
import type { Request, Response } from 'express';
import { PasswordHasher } from '../../src/infrastructure/auth/PasswordHasher';
import { JwtService } from '../../src/infrastructure/auth/JwtService';
import { AuthController } from '../../src/presentation/controllers/Auth.controller';

describe('Auth Business Logic & Utilities', () => {
  it('reports face verification as unavailable without requiring an image or claiming HSM is required', async () => {
    const status = vi.fn().mockReturnThis();
    const json = vi.fn();
    const response = {
      status,
      json,
    } as unknown as Response;

    await new AuthController().faceVerify(
      { body: {} } as Request,
      response,
      vi.fn()
    );

    expect(status).toHaveBeenCalledWith(503);
    expect(json).toHaveBeenCalledWith({
      success: false,
      verified: false,
      configured: false,
      message: expect.stringContaining('no server-side biometric verification service is configured'),
    });
    expect(JSON.stringify(json.mock.calls)).not.toContain('HSM');
  });

  describe('PasswordHasher', () => {
    const samplePassword = 'MedicalSecurePassword123!';

    it('should hash plaintext passwords into secure bcrypt hashes', async () => {
      const hash = await PasswordHasher.hashPassword(samplePassword);

      expect(hash).toBeDefined();
      expect(typeof hash).toBe('string');
      expect(hash).not.toBe(samplePassword);
      // Standard bcrypt prefix
      expect(hash.startsWith('$2')).toBe(true);
    });

    it('should produce distinct hashes for identical passwords due to salting', async () => {
      const hash1 = await PasswordHasher.hashPassword(samplePassword);
      const hash2 = await PasswordHasher.hashPassword(samplePassword);

      expect(hash1).not.toBe(hash2);
    });

    it('should verify correct password successfully', async () => {
      const hash = await PasswordHasher.hashPassword(samplePassword);
      const isMatch = await PasswordHasher.comparePassword(samplePassword, hash);

      expect(isMatch).toBe(true);
    });

    it('should reject incorrect password', async () => {
      const hash = await PasswordHasher.hashPassword(samplePassword);
      const isMatch = await PasswordHasher.comparePassword('WrongPassword999!', hash);

      expect(isMatch).toBe(false);
    });
  });

  describe('JwtService', () => {
    const userId = 'user-uuid-1234';
    const role = 'doctor';
    const linkedId = 'doctor-uuid-5678';

    it('should generate and verify JWT with complete payload', () => {
      const token = JwtService.generateToken(userId, role, linkedId);

      expect(typeof token).toBe('string');
      expect(token.split('.')).toHaveLength(3); // Header.Payload.Signature

      const decoded = JwtService.verifyToken(token);
      expect(decoded.userId).toBe(userId);
      expect(decoded.role).toBe(role);
      expect(decoded.linkedId).toBe(linkedId);
    });

    it('should generate and verify JWT without optional linkedId', () => {
      const token = JwtService.generateToken(userId, 'admin');

      const decoded = JwtService.verifyToken(token);
      expect(decoded.userId).toBe(userId);
      expect(decoded.role).toBe('admin');
      expect(decoded.linkedId).toBeUndefined();
    });

    it('should throw an error when verifying an invalid or tampered token', () => {
      const invalidToken = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.tampered.signature';

      expect(() => {
        JwtService.verifyToken(invalidToken);
      }).toThrow();
    });
  });
});
