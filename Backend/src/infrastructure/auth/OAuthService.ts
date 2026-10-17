import { createHash, createHmac, randomBytes, timingSafeEqual } from 'crypto';
import { OAuth2Client } from 'google-auth-library';
import {
  createRemoteJWKSet,
  importPKCS8,
  jwtVerify,
  SignJWT,
  type JWTVerifyGetKey,
} from 'jose';
import { env } from '../config/env';
import { UserModel, type IUserDocument } from '../database/schemas/User.schema';

export type OAuthProvider = 'google' | 'apple';

export interface OAuthIdentity {
  provider: OAuthProvider;
  subject: string;
  email: string;
  displayName: string;
}

export interface OAuthTransaction {
  state: string;
  nonce: string;
}

export interface OAuthStatePayload {
  nonce: string;
  clientOrigin?: string;
  role?: 'patient' | 'doctor';
  exp: number;
  salt: string;
}

interface ProviderClaims {
  sub?: unknown;
  email?: unknown;
  email_verified?: unknown;
  name?: unknown;
  given_name?: unknown;
  nonce?: unknown;
  exp?: unknown;
  iat?: unknown;
  iss?: unknown;
  aud?: unknown;
}

interface TokenResponse {
  id_token?: unknown;
  error?: unknown;
}

const GOOGLE_JWKS = createRemoteJWKSet(
  new URL('https://www.googleapis.com/oauth2/v3/certs')
);
const APPLE_JWKS = createRemoteJWKSet(
  new URL('https://appleid.apple.com/auth/keys')
);
const OAUTH_TRANSACTION_MAX_AGE_SECONDS = 10 * 60;

const providerConfig = (provider: OAuthProvider) => {
  if (provider === 'google') {
    if (!env.GOOGLE_CLIENT_ID || !env.GOOGLE_CLIENT_SECRET) {
      throw new Error('google_not_configured');
    }
    return {
      clientId: env.GOOGLE_CLIENT_ID,
      clientSecret: env.GOOGLE_CLIENT_SECRET,
      redirectUri: env.GOOGLE_REDIRECT_URI,
    };
  }
  if (!env.APPLE_CLIENT_ID || !env.APPLE_TEAM_ID || !env.APPLE_KEY_ID || !env.APPLE_PRIVATE_KEY) {
    throw new Error('apple_not_configured');
  }
  return {
    clientId: env.APPLE_CLIENT_ID,
    redirectUri: env.APPLE_REDIRECT_URI,
  };
};

export const signOAuthState = (payload: OAuthStatePayload): string => {
  const json = JSON.stringify(payload);
  const data = Buffer.from(json).toString('base64url');
  const signature = createHmac('sha256', env.JWT_SECRET).update(data).digest('base64url');
  return `${data}.${signature}`;
};

export const parseAndVerifyOAuthState = (stateString: string | undefined): OAuthStatePayload | null => {
  if (!stateString || typeof stateString !== 'string') return null;
  const parts = stateString.split('.');
  if (parts.length !== 2) return null;
  const [data, signature] = parts;
  const expectedSig = createHmac('sha256', env.JWT_SECRET).update(data).digest('base64url');
  const expectedBytes = Buffer.from(expectedSig);
  const receivedBytes = Buffer.from(signature);
  if (expectedBytes.length !== receivedBytes.length || !timingSafeEqual(expectedBytes, receivedBytes)) {
    return null;
  }
  try {
    const payload = JSON.parse(Buffer.from(data, 'base64url').toString('utf8')) as OAuthStatePayload;
    if (typeof payload.nonce !== 'string' || typeof payload.exp !== 'number') return null;
    if (payload.exp < Date.now()) return null;
    return payload;
  } catch {
    return null;
  }
};

export const createOAuthTransaction = (
  clientOrigin?: string,
  role?: 'patient' | 'doctor'
): OAuthTransaction => {
  const nonce = randomBytes(32).toString('base64url');
  if (!clientOrigin && !role) {
    return {
      state: randomBytes(32).toString('base64url'),
      nonce,
    };
  }
  const exp = Date.now() + OAUTH_TRANSACTION_MAX_AGE_SECONDS * 1000;
  const salt = randomBytes(16).toString('base64url');
  const state = signOAuthState({ nonce, clientOrigin, role, exp, salt });
  return {
    state,
    nonce,
  };
};


export const verifyOAuthState = (expected: string | undefined, received: string | undefined): boolean => {
  if (!expected || !received) return false;
  const expectedBytes = Buffer.from(expected);
  const receivedBytes = Buffer.from(received);
  return expectedBytes.length === receivedBytes.length && timingSafeEqual(expectedBytes, receivedBytes);
};

export const getGoogleOAuthClient = (redirectUri?: string): OAuth2Client => {
  if (!env.GOOGLE_CLIENT_ID || !env.GOOGLE_CLIENT_SECRET) {
    throw new Error('google_not_configured');
  }
  return new OAuth2Client({
    clientId: env.GOOGLE_CLIENT_ID,
    clientSecret: env.GOOGLE_CLIENT_SECRET,
    redirectUri: redirectUri || env.GOOGLE_REDIRECT_URI,
  });
};

export const oauthTransactionMaxAgeSeconds = OAUTH_TRANSACTION_MAX_AGE_SECONDS;

export const buildAuthorizationUrl = (
  provider: OAuthProvider,
  transaction: OAuthTransaction,
  redirectUri?: string
): string => {
  if (provider === 'google') {
    const client = getGoogleOAuthClient(redirectUri);
    return client.generateAuthUrl({
      access_type: 'offline',
      scope: ['openid', 'email', 'profile'],
      state: transaction.state,
      nonce: transaction.nonce,
      prompt: 'select_account',
      include_granted_scopes: true,
    });
  }

  const config = providerConfig(provider);
  const endpoint = 'https://appleid.apple.com/auth/authorize';
  const url = new URL(endpoint);
  url.searchParams.set('client_id', config.clientId);
  url.searchParams.set('redirect_uri', redirectUri || config.redirectUri);
  url.searchParams.set('response_type', 'code');
  url.searchParams.set('response_mode', 'form_post');
  url.searchParams.set('scope', 'openid email name');
  url.searchParams.set('state', transaction.state);
  url.searchParams.set('nonce', transaction.nonce);
  return url.toString();
};


const appleClientSecret = async (): Promise<string> => {
  const privateKey = await importPKCS8(env.APPLE_PRIVATE_KEY, 'ES256');
  return new SignJWT({})
    .setProtectedHeader({ alg: 'ES256', kid: env.APPLE_KEY_ID, typ: 'JWT' })
    .setIssuer(env.APPLE_TEAM_ID)
    .setSubject(env.APPLE_CLIENT_ID)
    .setAudience('https://appleid.apple.com')
    .setIssuedAt()
    .setExpirationTime('5m')
    .sign(privateKey);
};

const exchangeAuthorizationCode = async (
  provider: OAuthProvider,
  code: string,
  redirectUri?: string
): Promise<string> => {
  if (provider === 'google') {
    const client = getGoogleOAuthClient(redirectUri);
    try {
      const { tokens } = await client.getToken(code);
      if (!tokens.id_token) {
        throw new Error('google_identity_token_missing');
      }
      return tokens.id_token;
    } catch (error: unknown) {
      if (error instanceof Error && error.message === 'google_identity_token_missing') {
        throw error;
      }
      console.error('Google authorization code exchange failed:', error);
      throw new Error('google_code_exchange_failed');
    }
  }

  const config = providerConfig(provider);
  const form = new URLSearchParams({
    grant_type: 'authorization_code',
    code,
    client_id: config.clientId,
    redirect_uri: redirectUri || config.redirectUri,
    client_secret: await appleClientSecret(),
  });

  const endpoint = 'https://appleid.apple.com/auth/token';
  const response = await fetch(endpoint, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: form,
    signal: AbortSignal.timeout(10_000),
  });

  if (!response.ok) {
    throw new Error(`${provider}_code_exchange_failed`);
  }
  const tokenResponse = (await response.json()) as TokenResponse;
  if (typeof tokenResponse.id_token !== 'string' || !tokenResponse.id_token) {
    throw new Error(`${provider}_identity_token_missing`);
  }
  return tokenResponse.id_token;
};

export const verifyProviderIdentityToken = async (
  provider: OAuthProvider,
  identityToken: string,
  expectedNonce: string,
  clientId: string,
  getKey?: JWTVerifyGetKey
): Promise<OAuthIdentity> => {
  let claims: ProviderClaims;

  if (provider === 'google' && !getKey) {
    const client = new OAuth2Client({ clientId });
    try {
      const ticket = await client.verifyIdToken({
        idToken: identityToken,
        audience: clientId,
      });
      const payload = ticket.getPayload();
      if (!payload) {
        throw new Error('google_identity_claims_invalid');
      }
      claims = payload as ProviderClaims;
    } catch (error) {
      if (error instanceof Error && error.message === 'google_identity_claims_invalid') {
        throw error;
      }
      throw new Error('google_identity_claims_invalid');
    }
  } else {
    const issuer =
      provider === 'google'
        ? ['https://accounts.google.com', 'accounts.google.com']
        : 'https://appleid.apple.com';
    const keyResolver = getKey || (provider === 'google' ? GOOGLE_JWKS : APPLE_JWKS);
    const { payload } = await jwtVerify(identityToken, keyResolver, {
      issuer,
      audience: clientId,
      algorithms: ['RS256'],
      maxTokenAge: '10m',
      clockTolerance: '2m',
    });
    claims = payload as ProviderClaims;
  }

  if (
    typeof claims.sub !== 'string' ||
    !claims.sub ||
    typeof claims.exp !== 'number' ||
    claims.exp <= Math.floor(Date.now() / 1000) ||
    typeof claims.iat !== 'number' ||
    typeof claims.nonce !== 'string' ||
    !verifyOAuthState(expectedNonce, claims.nonce)
  ) {
    throw new Error(`${provider}_identity_claims_invalid`);
  }

  const email = typeof claims.email === 'string' ? claims.email.trim().toLowerCase() : '';
  if (
    (provider === 'google' && !email) ||
    (email && claims.email_verified !== true && claims.email_verified !== 'true')
  ) {
    throw new Error(`${provider}_identity_claims_invalid`);
  }
  const displayName =
    (typeof claims.name === 'string' && claims.name.trim()) ||
    (typeof claims.given_name === 'string' && claims.given_name.trim()) ||
    email.split('@')[0];

  return { provider, subject: claims.sub, email, displayName };
};

export const verifyAuthorizationCode = async (
  provider: OAuthProvider,
  code: string,
  nonce: string,
  redirectUri?: string
): Promise<OAuthIdentity> => {
  const { clientId } = providerConfig(provider);
  const identityToken = await exchangeAuthorizationCode(provider, code, redirectUri);
  return verifyProviderIdentityToken(provider, identityToken, nonce, clientId);
};

const safeUsernameBase = (name: string, email: string): string => {
  const normalizedName = name
    .normalize('NFKD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-zA-Z0-9_]+/g, '_')
    .replace(/^_+|_+$/g, '')
    .slice(0, 72);
  return normalizedName || email.split('@')[0].replace(/[^a-zA-Z0-9_]/g, '_').slice(0, 72) || 'patient';
};

const findAvailableUsername = async (base: string): Promise<string> => {
  let candidate = base;
  for (let suffix = 1; await UserModel.exists({ username: candidate }); suffix += 1) {
    candidate = `${base.slice(0, 72)}_${suffix}`;
  }
  return candidate;
};

export const findOrCreateOAuthUser = async (
  identity: OAuthIdentity,
  preferredRole?: 'patient' | 'doctor'
): Promise<{ user: IUserDocument; created: boolean }> => {
  const identityKey = { authProvider: identity.provider, providerSubject: identity.subject };
  const existingIdentity = await UserModel.findOne(identityKey);
  if (existingIdentity) {
    if (identity.displayName && !existingIdentity.fullName) {
      existingIdentity.fullName = identity.displayName;
    }
    existingIdentity.isEmailVerified = true;
    if (identity.email && existingIdentity.email !== identity.email) {
      const emailOwner = await UserModel.findOne({ email: identity.email });
      if (emailOwner && !emailOwner._id.equals(existingIdentity._id)) {
        throw new Error('oauth_account_conflict');
      }
      existingIdentity.email = identity.email;
    }
    existingIdentity.lastLoginAt = new Date();
    await existingIdentity.save();
    return { user: existingIdentity, created: false };
  }

  if (!identity.email) {
    throw new Error('oauth_email_unavailable');
  }

  const emailOwner = await UserModel.findOne({ email: identity.email });
  if (emailOwner) {
    throw new Error('oauth_account_conflict');
  }

  const role = preferredRole === 'doctor' ? 'doctor' : 'patient';
  const username = await findAvailableUsername(safeUsernameBase(identity.displayName, identity.email));
  const user = new UserModel({
    username,
    fullName: identity.displayName || username,
    email: identity.email,
    authProvider: identity.provider,
    providerSubject: identity.subject,
    status: 'active',
    isEmailVerified: true,
    isPhoneVerified: false,
    faceEnrollmentStatus: 'unavailable',
    role,
    ...(role === 'doctor' ? { doctorVerificationStatus: 'pending' } : {}),
    lastLoginAt: new Date(),
  });

  try {
    await user.save();
    return { user, created: true };
  } catch (error) {
    if (
      typeof error === 'object' &&
      error !== null &&
      'code' in error &&
      error.code === 11000
    ) {
      const racedIdentity = await UserModel.findOne(identityKey);
      if (racedIdentity) {
        racedIdentity.lastLoginAt = new Date();
        await racedIdentity.save();
        return { user: racedIdentity, created: false };
      }
      throw new Error('oauth_account_conflict');
    }
    throw error;
  }
};

export const createApplicationSessionToken = (
  user: IUserDocument,
  linkedId?: string
): string => JwtService.generateToken(user._id.toString(), user.role, linkedId);

import { JwtService } from './JwtService';
