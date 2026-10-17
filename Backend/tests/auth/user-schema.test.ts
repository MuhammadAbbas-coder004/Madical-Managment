import { describe, expect, it } from 'vitest';
import { UserModel, userSchema } from '../../src/infrastructure/database/schemas/User.schema';
import { registerSchema } from '../../src/presentation/schemas';

describe('MongoDB user account schema', () => {
  it('normalizes email and assigns password auth and unavailable face-enrollment defaults', async () => {
    const user = new UserModel({
      username: 'Sample Patient',
      email: '  SAMPLE@Example.com ',
      password: '$2b$10$hashed-password',
    });

    expect(user.email).toBe('sample@example.com');
    expect(user.authProvider).toBe('password');
    expect(user.faceEnrollmentStatus).toBe('unavailable');
    expect(user.role).toBe('patient');
    await expect(user.validate()).resolves.toBeUndefined();
  });

  it('validates and trims registration input on the server', () => {
    expect(
      registerSchema.parse({
        username: '  Sample Patient  ',
        email: '  SAMPLE@Example.com ',
        password: 'securePassword123',
      })
    ).toEqual({
      username: 'Sample Patient',
      email: 'SAMPLE@Example.com',
      password: 'securePassword123',
    });

    expect(
      registerSchema.safeParse({
        username: 'x'.repeat(81),
        email: 'sample@example.com',
        password: 'securePassword123',
      }).success
    ).toBe(false);
  });

  it('uses unique indexes for account identifiers, not password hashes', () => {
    const indexes = userSchema.indexes();
    const uniqueSingleFieldIndexes = indexes
      .filter(([spec, options]) => options.unique && Object.keys(spec).length === 1)
      .map(([spec]) => Object.keys(spec)[0]);

    expect(uniqueSingleFieldIndexes).toContain('email');
    expect(uniqueSingleFieldIndexes).toContain('username');
    expect(uniqueSingleFieldIndexes).not.toContain('password');
  });

  it('uniquely maps verified provider subjects and timestamps user records', () => {
    const providerIdentityIndex = userSchema.indexes().find(
      ([spec, options]) =>
        'authProvider' in spec &&
        'providerSubject' in spec &&
        options.unique === true
    );

    expect(providerIdentityIndex?.[1].partialFilterExpression).toEqual({
      providerSubject: { $type: 'string' },
    });
    expect(userSchema.options.timestamps).toBe(true);
    expect(userSchema.path('lastLoginAt')).toBeDefined();
  });

  it('does not return password hashes in ordinary user queries', () => {
    expect(userSchema.path('password').options.select).toBe(false);
  });

  it('supports provider accounts without creating a password credential', async () => {
    const user = new UserModel({
      username: 'Google Patient',
      email: 'google@example.com',
      authProvider: 'google',
      providerSubject: 'google-subject-123',
    });

    await expect(user.validate()).resolves.toBeUndefined();
    expect(user.password).toBeUndefined();
  });

  it('persists phone number, full name, status, and verification flags correctly', async () => {
    const user = new UserModel({
      username: 'Sarah Connor',
      fullName: 'Sarah Connor',
      email: 'sarah@example.com',
      phoneNumber: '+14155552671',
      phone: '+14155552671',
      password: '$2b$10$hashed-password-12345',
      role: 'patient',
    });

    await expect(user.validate()).resolves.toBeUndefined();
    expect(user.phoneNumber).toBe('+14155552671');
    expect(user.phone).toBe('+14155552671');
    expect(user.fullName).toBe('Sarah Connor');
    expect(user.status).toBe('active');
    expect(user.isEmailVerified).toBe(false);
    expect(user.isPhoneVerified).toBe(false);
  });
});
