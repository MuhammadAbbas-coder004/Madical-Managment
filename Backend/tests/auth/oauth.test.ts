import { beforeAll, describe, expect, it, vi } from 'vitest';
import { generateKeyPair, SignJWT, type KeyLike } from 'jose';
import type { Request, Response } from 'express';
import * as OAuthService from '../../src/infrastructure/auth/OAuthService';
import {
  createOAuthTransaction,
  verifyOAuthState,
  verifyProviderIdentityToken,
} from '../../src/infrastructure/auth/OAuthService';
import { OAuthController } from '../../src/presentation/controllers/OAuth.controller';
import { env } from '../../src/infrastructure/config/env';

describe('OAuth transaction and identity-token verification', () => {
  let privateKey: KeyLike;
  let publicKey: KeyLike;
  const nonce = 'oauth-test-nonce';
  const now = Math.floor(Date.now() / 1000);

  beforeAll(async () => {
    const pair = await generateKeyPair('RS256');
    privateKey = pair.privateKey;
    publicKey = pair.publicKey;
  });

  const signToken = (
    provider: 'google' | 'apple',
    overrides: Record<string, unknown> = {},
    exp = now + 60
  ) =>
    new SignJWT({
      sub: 'provider-subject-123',
      nonce,
      email: 'person@example.com',
      email_verified: true,
      ...overrides,
    })
      .setProtectedHeader({ alg: 'RS256' })
      .setIssuer(provider === 'google' ? 'https://accounts.google.com' : 'https://appleid.apple.com')
      .setAudience('test-client-id')
      .setIssuedAt(now)
      .setExpirationTime(exp)
      .sign(privateKey);

  const testKeyResolver = async () => publicKey;

  it('creates high-entropy state and nonce values and compares state safely', () => {
    const transaction = createOAuthTransaction();
    expect(transaction.state).toHaveLength(43);
    expect(transaction.nonce).toHaveLength(43);
    expect(verifyOAuthState(transaction.state, transaction.state)).toBe(true);
    expect(verifyOAuthState(transaction.state, 'different-state')).toBe(false);
    expect(verifyOAuthState(undefined, transaction.state)).toBe(false);
  });

  it('verifies a Google signature and returns only trusted identity claims', async () => {
    const token = await signToken('google', { given_name: 'Sample' });
    await expect(
      verifyProviderIdentityToken('google', token, nonce, 'test-client-id', testKeyResolver)
    ).resolves.toEqual({
      provider: 'google',
      subject: 'provider-subject-123',
      email: 'person@example.com',
      displayName: 'Sample',
    });
  });

  it('rejects an identity token with a different audience', async () => {
    const token = await signToken('google');
    await expect(
      verifyProviderIdentityToken('google', token, nonce, 'different-client-id', testKeyResolver)
    ).rejects.toThrow();
  });

  it('rejects a token with an invalid issuer', async () => {
    const token = await new SignJWT({
      sub: 'provider-subject-123',
      nonce,
      email: 'person@example.com',
      email_verified: true,
    })
      .setProtectedHeader({ alg: 'RS256' })
      .setIssuer('https://attacker.example')
      .setAudience('test-client-id')
      .setIssuedAt(now)
      .setExpirationTime(now + 60)
      .sign(privateKey);
    await expect(
      verifyProviderIdentityToken('google', token, nonce, 'test-client-id', testKeyResolver)
    ).rejects.toThrow();
  });

  it('rejects nonce mismatch and unverified Google email claims', async () => {
    const wrongNonce = await signToken('google', { nonce: 'wrong-nonce' });
    const unverifiedEmail = await signToken('google', { email_verified: false });

    await expect(
      verifyProviderIdentityToken('google', wrongNonce, nonce, 'test-client-id', testKeyResolver)
    ).rejects.toThrow('google_identity_claims_invalid');
    await expect(
      verifyProviderIdentityToken('google', unverifiedEmail, nonce, 'test-client-id', testKeyResolver)
    ).rejects.toThrow('google_identity_claims_invalid');
  });

  it('rejects expired tokens and signatures from an untrusted key', async () => {
    const expired = await signToken('google', {}, now - 1);
    const signedByAnotherKey = await new SignJWT({
      sub: 'provider-subject-123',
      nonce,
      email: 'person@example.com',
      email_verified: true,
    })
      .setProtectedHeader({ alg: 'RS256' })
      .setIssuer('https://accounts.google.com')
      .setAudience('test-client-id')
      .setIssuedAt(now)
      .setExpirationTime(now + 60)
      .sign((await generateKeyPair('RS256')).privateKey);

    await expect(
      verifyProviderIdentityToken('google', expired, nonce, 'test-client-id', testKeyResolver)
    ).rejects.toThrow();
    await expect(
      verifyProviderIdentityToken('google', signedByAnotherKey, nonce, 'test-client-id', testKeyResolver)
    ).rejects.toThrow();
  });

  it('allows a verified returning Apple subject when Apple omits its email claim', async () => {
    const token = await signToken('apple', {
      iss: undefined,
      email: undefined,
      email_verified: undefined,
    });
    await expect(
      verifyProviderIdentityToken('apple', token, nonce, 'test-client-id', testKeyResolver)
    ).resolves.toMatchObject({
      provider: 'apple',
      subject: 'provider-subject-123',
      email: '',
    });
  });

  it('reports unconfigured provider credentials without redirecting to an identity provider', () => {
    const controller = new OAuthController();
    const response = {
      cookie: vi.fn(),
      redirect: vi.fn(),
    } as unknown as Response;
    const request = { get: () => undefined } as unknown as Request;

    controller.start('google')(request, response);

    expect(response.cookie).not.toHaveBeenCalled();
    expect(response.redirect).toHaveBeenCalledWith(
      302,
      expect.stringContaining('reason=not_configured')
    );
  });

  it('returns OAuth failures to the same allowed development loopback origin', () => {
    const controller = new OAuthController();
    const response = {
      cookie: vi.fn(),
      redirect: vi.fn(),
    } as unknown as Response;
    const request = {
      get: (name: string) =>
        name.toLowerCase() === 'referer' ? 'http://127.0.0.1:5173/register' : undefined,
    } as unknown as Request;

    controller.start('google')(request, response);

    expect(response.redirect).toHaveBeenCalledWith(
      302,
      expect.stringMatching(/^http:\/\/127\.0\.0\.1:5173\/auth\/callback\?/)
    );
  });

  it('rejects callbacks with invalid state before exchanging codes or setting sessions', async () => {
    const controller = new OAuthController();
    const transaction = { state: 'expected-state', nonce: 'expected-nonce' };
    const response = {
      clearCookie: vi.fn(),
      cookie: vi.fn(),
      redirect: vi.fn(),
    } as unknown as Response;
    const request = {
      cookies: {
        oauth_google: Buffer.from(JSON.stringify(transaction)).toString('base64url'),
      },
      query: { state: 'attacker-state', code: 'untrusted-code' },
    } as unknown as Request;

    await controller.callback('google')(request, response, vi.fn());

    expect(response.clearCookie).toHaveBeenCalled();
    expect(response.cookie).not.toHaveBeenCalled();
    expect(response.redirect).toHaveBeenCalledWith(
      302,
      expect.stringContaining('reason=invalid_callback')
    );
  });

  it('reports provider cancellation without exchanging an authorization code', async () => {
    const controller = new OAuthController();
    const transaction = { state: 'expected-state', nonce: 'expected-nonce' };
    const response = {
      clearCookie: vi.fn(),
      redirect: vi.fn(),
    } as unknown as Response;
    const request = {
      cookies: {
        oauth_google: Buffer.from(JSON.stringify(transaction)).toString('base64url'),
      },
      query: { state: transaction.state, error: 'access_denied' },
    } as unknown as Request;
    const exchange = vi.spyOn(OAuthService, 'verifyAuthorizationCode');

    await controller.callback('google')(request, response, vi.fn());

    expect(exchange).not.toHaveBeenCalled();
    expect(response.redirect).toHaveBeenCalledWith(
      302,
      expect.stringContaining('reason=cancelled')
    );
    exchange.mockRestore();
  });

  it('does not issue a session when MongoDB is unavailable', async () => {
    const controller = new OAuthController();
    const transaction = { state: 'expected-state', nonce: 'expected-nonce' };
    const response = {
      clearCookie: vi.fn(),
      cookie: vi.fn(),
      redirect: vi.fn(),
    } as unknown as Response;
    const request = {
      cookies: {
        oauth_google: Buffer.from(JSON.stringify(transaction)).toString('base64url'),
      },
      query: { state: transaction.state, code: 'valid-shaped-code' },
    } as unknown as Request;
    const identity = {
      provider: 'google' as const,
      subject: 'provider-subject',
      email: 'patient@example.com',
      displayName: 'Patient',
    };
    const verify = vi.spyOn(OAuthService, 'verifyAuthorizationCode').mockResolvedValue(identity);
    const persist = vi
      .spyOn(OAuthService, 'findOrCreateOAuthUser')
      .mockRejectedValue(new Error('ECONNREFUSED'));

    await controller.callback('google')(request, response, vi.fn());

    expect(response.cookie).not.toHaveBeenCalled();
    expect(response.redirect).toHaveBeenCalledWith(
      302,
      expect.stringContaining('reason=database_unavailable')
    );
    verify.mockRestore();
    persist.mockRestore();
  });

  it('signs and verifies HMAC OAuth state tokens, rejecting invalid signatures', () => {
    const payload = {
      nonce: 'test-nonce-123',
      clientOrigin: 'http://localhost:5173',
      role: 'doctor' as const,
      exp: Date.now() + 60000,
      salt: 'test-salt',
    };
    const token = OAuthService.signOAuthState(payload);
    expect(typeof token).toBe('string');

    const verified = OAuthService.parseAndVerifyOAuthState(token);
    expect(verified).not.toBeNull();
    expect(verified?.nonce).toBe('test-nonce-123');
    expect(verified?.role).toBe('doctor');

    // Tampered signature
    const parts = token.split('.');
    const tampered = `${parts[0]}.tamperedsignature`;
    expect(OAuthService.parseAndVerifyOAuthState(tampered)).toBeNull();

    // Expired state
    const expiredToken = OAuthService.signOAuthState({ ...payload, exp: Date.now() - 1000 });
    expect(OAuthService.parseAndVerifyOAuthState(expiredToken)).toBeNull();
  });

  it('generates a Google OAuth authorization URL when credentials are configured', () => {
    const origId = env.GOOGLE_CLIENT_ID;
    const origSecret = env.GOOGLE_CLIENT_SECRET;
    try {
      env.GOOGLE_CLIENT_ID = 'test-client-id.apps.googleusercontent.com';
      env.GOOGLE_CLIENT_SECRET = 'test-client-secret';

      const transaction = { state: 'test-state-abc', nonce: 'test-nonce-xyz' };
      const urlString = OAuthService.buildAuthorizationUrl('google', transaction, 'http://localhost:5000/api/auth/google/callback');
      const url = new URL(urlString);

      expect(url.hostname).toBe('accounts.google.com');
      expect(url.pathname).toBe('/o/oauth2/v2/auth');
      expect(url.searchParams.get('client_id')).toBe('test-client-id.apps.googleusercontent.com');
      expect(url.searchParams.get('redirect_uri')).toBe('http://localhost:5000/api/auth/google/callback');
      expect(url.searchParams.get('response_type')).toBe('code');
      expect(url.searchParams.get('state')).toBe('test-state-abc');
      expect(url.searchParams.get('scope')).toContain('openid');
      expect(url.searchParams.get('scope')).toContain('email');
      expect(url.searchParams.get('scope')).toContain('profile');
    } finally {
      env.GOOGLE_CLIENT_ID = origId;
      env.GOOGLE_CLIENT_SECRET = origSecret;
    }
  });
});


