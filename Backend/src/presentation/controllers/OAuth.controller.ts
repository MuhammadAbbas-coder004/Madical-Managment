import type { NextFunction, Request, Response } from 'express';
import mongoose from 'mongoose';
import { randomUUID } from 'crypto';
import { JwtService } from '../../infrastructure/auth/JwtService';
import {
  buildAuthorizationUrl,
  createOAuthTransaction,
  findOrCreateOAuthUser,
  oauthTransactionMaxAgeSeconds,
  parseAndVerifyOAuthState,
  verifyAuthorizationCode,
  verifyOAuthState,
  type OAuthProvider,
} from '../../infrastructure/auth/OAuthService';
import { env } from '../../infrastructure/config/env';
import { DoctorModel } from '../../infrastructure/database/schemas/Doctor.schema';
import { PatientModel } from '../../infrastructure/database/schemas/Patient.schema';

const providerCookieName = (provider: OAuthProvider) => `oauth_${provider}`;
const allowedClientOrigins = (): Set<string> => {
  const clientUrl = new URL(env.CLIENT_URL);
  const origins = new Set([clientUrl.origin]);
  if (env.isDevelopment && ['localhost', '127.0.0.1'].includes(clientUrl.hostname)) {
    const loopbackAlias = new URL(clientUrl);
    loopbackAlias.hostname = clientUrl.hostname === 'localhost' ? '127.0.0.1' : 'localhost';
    origins.add(loopbackAlias.origin);
  }
  return origins;
};

const defaultClientOrigin = () => new URL(env.CLIENT_URL).origin;

const providerRedirectUriForRequest = (
  provider: OAuthProvider,
  req: Request
): string | undefined => {
  if (provider !== 'google' || !env.isDevelopment) return undefined;
  const configuredRedirect = new URL(env.GOOGLE_REDIRECT_URI);
  const loopbackHosts = ['localhost', '127.0.0.1'];
  if (loopbackHosts.includes(configuredRedirect.hostname) && loopbackHosts.includes(req.hostname)) {
    configuredRedirect.hostname = req.hostname;
    return configuredRedirect.toString();
  }
  return undefined;
};

const clientOriginForRequest = (req: Request): string => {
  const requestOrigin = req.get('origin');
  const referer = req.get('referer');
  try {
    const origin = requestOrigin || (referer ? new URL(referer).origin : undefined);
    return origin && allowedClientOrigins().has(origin) ? origin : defaultClientOrigin();
  } catch {
    return defaultClientOrigin();
  }
};

const providerFailureUrl = (
  provider: OAuthProvider,
  reason: string,
  clientOrigin = defaultClientOrigin()
) =>
  `${clientOrigin}/auth/callback?provider=${provider}&status=error&reason=${encodeURIComponent(reason)}`;
const providerSuccessUrl = (provider: OAuthProvider, clientOrigin = defaultClientOrigin()) =>
  `${clientOrigin}/auth/callback?provider=${provider}&status=success`;

const cookieOptions = (provider: OAuthProvider) => ({
  httpOnly: true,
  secure: env.isProduction,
  sameSite: 'lax' as const,
  path: `/api/auth/${provider}`,
  maxAge: oauthTransactionMaxAgeSeconds * 1000,
});

const clearTransactionCookie = (res: Response, provider: OAuthProvider) => {
  res.clearCookie(providerCookieName(provider), {
    httpOnly: true,
    secure: env.isProduction,
    sameSite: 'lax',
    path: `/api/auth/${provider}`,
  });
};

const transactionFromCookie = (
  value: unknown
): { state: string; nonce: string; clientOrigin?: string; role?: 'patient' | 'doctor' } | null => {
  if (typeof value !== 'string') return null;
  try {
    const decoded = JSON.parse(Buffer.from(value, 'base64url').toString('utf8')) as {
      state?: unknown;
      nonce?: unknown;
      clientOrigin?: unknown;
      role?: unknown;
    };
    if (typeof decoded.state !== 'string' || typeof decoded.nonce !== 'string') return null;
    const clientOrigin =
      typeof decoded.clientOrigin === 'string' && allowedClientOrigins().has(decoded.clientOrigin)
        ? decoded.clientOrigin
        : undefined;
    const role = decoded.role === 'doctor' ? 'doctor' : decoded.role === 'patient' ? 'patient' : undefined;
    return { state: decoded.state, nonce: decoded.nonce, clientOrigin, role };
  } catch {
    return null;
  }
};

export class OAuthController {
  public getProviders = (_req: Request, res: Response): void => {
    res.status(200).json({
      success: true,
      providers: {
        google: Boolean(env.GOOGLE_CLIENT_ID && env.GOOGLE_CLIENT_SECRET),
        apple: Boolean(env.APPLE_CLIENT_ID && env.APPLE_TEAM_ID && env.APPLE_KEY_ID && env.APPLE_PRIVATE_KEY),
      },
    });
  };

  public start = (provider: OAuthProvider) => (req: Request, res: Response): void => {
    const clientOrigin = clientOriginForRequest(req);
    try {
      const preferredRole = req.query?.role === 'doctor' ? 'doctor' : 'patient';
      const redirectUri = providerRedirectUriForRequest(provider, req);
      const transaction = { ...createOAuthTransaction(clientOrigin, preferredRole), clientOrigin, role: preferredRole };
      const authorizationUrl = buildAuthorizationUrl(provider, transaction, redirectUri);
      res.cookie(
        providerCookieName(provider),
        Buffer.from(JSON.stringify(transaction)).toString('base64url'),
        cookieOptions(provider)
      );
      res.redirect(302, authorizationUrl);
    } catch (error) {
      const reason = error instanceof Error && error.message === `${provider}_not_configured`
        ? 'not_configured'
        : 'provider_error';
      res.redirect(302, providerFailureUrl(provider, reason, clientOrigin));
    }
  };

  public callback = (provider: OAuthProvider) =>
    async (req: Request, res: Response, _next: NextFunction): Promise<void> => {
      const cookieName = providerCookieName(provider);
      const transaction = transactionFromCookie(req.cookies?.[cookieName]);
      clearTransactionCookie(res, provider);

      // Support both GET (query parameters) and POST (form_post body)
      const paramState =
        typeof req.query.state === 'string'
          ? req.query.state
          : typeof req.body?.state === 'string'
            ? req.body.state
            : undefined;
      const paramCode =
        typeof req.query.code === 'string'
          ? req.query.code
          : typeof req.body?.code === 'string'
            ? req.body.code
            : undefined;
      const paramError =
        typeof req.query.error === 'string'
          ? req.query.error
          : typeof req.body?.error === 'string'
            ? req.body.error
            : undefined;
      const paramUser = req.query.user ?? req.body?.user;

      // Verify state via cookie OR cryptographically signed HMAC token
      const signedState = parseAndVerifyOAuthState(paramState);
      const clientOrigin =
        transaction?.clientOrigin || signedState?.clientOrigin || defaultClientOrigin();
      const nonce = transaction?.nonce || signedState?.nonce;

      const isStateValid =
        (transaction && verifyOAuthState(transaction.state, paramState)) ||
        Boolean(signedState);

      if (!isStateValid || !nonce) {
        res.redirect(302, providerFailureUrl(provider, 'invalid_callback', clientOrigin));
        return;
      }

      if (paramError) {
        const reason =
          paramError === 'access_denied' || paramError === 'user_cancelled_authorize'
            ? 'cancelled'
            : 'provider_error';
        res.redirect(302, providerFailureUrl(provider, reason, clientOrigin));
        return;
      }

      if (!paramCode) {
        res.redirect(302, providerFailureUrl(provider, 'invalid_callback', clientOrigin));
        return;
      }

      try {
        const redirectUri = providerRedirectUriForRequest(provider, req);
        const identity = await verifyAuthorizationCode(
          provider,
          paramCode,
          nonce,
          redirectUri
        );
        if (provider === 'apple') {
          identity.displayName = this.appleDisplayName(paramUser) || identity.displayName;
        }
        const preferredRole = transaction?.role || signedState?.role;
        const { user } = await findOrCreateOAuthUser(identity, preferredRole);

        let linkedId = user.linkedId;
        if (!linkedId && user.role === 'patient') {
          let patient = await PatientModel.findOne({ email: user.email });
          if (!patient) {
            const nameParts = (user.username || 'Patient User').trim().split(/\s+/);
            const firstName = nameParts[0] || 'Patient';
            const lastName = nameParts.slice(1).join(' ') || 'User';
            const newPatientId = randomUUID();
            patient = await PatientModel.create({
              patientId: newPatientId,
              firstName,
              lastName,
              email: user.email,
              phone: 'Not provided',
              dateOfBirth: new Date('2000-01-01'),
            });
          }
          linkedId = patient.patientId;
        } else if (!linkedId && user.role === 'doctor') {
          let doctor = await DoctorModel.findOne({ email: user.email });
          if (!doctor) {
            const nameParts = (user.username || 'Doctor User').trim().split(/\s+/);
            const firstName = nameParts[0] || 'Doctor';
            const lastName = nameParts.slice(1).join(' ') || 'User';
            const newDoctorId = randomUUID();
            doctor = await DoctorModel.create({
              doctorId: newDoctorId,
              firstName,
              lastName,
              email: user.email,
              phone: 'Not provided',
              specialization: user.specialty || 'General Medicine',
            });
          }
          linkedId = doctor.doctorId;
        }

        if (linkedId && linkedId !== user.linkedId) {
          user.linkedId = linkedId;
          await user.save();
        }

        const token = JwtService.generateToken(user._id.toString(), user.role, linkedId);
        res.cookie('token', token, {
          httpOnly: true,
          secure: env.isProduction,
          sameSite: env.isProduction ? 'strict' : 'lax',
          maxAge: 24 * 60 * 60 * 1000,
        });
        res.redirect(302, providerSuccessUrl(provider, clientOrigin));
      } catch (error) {
        if (error instanceof Error && error.message === 'oauth_account_conflict') {
          res.redirect(302, providerFailureUrl(provider, 'account_conflict', clientOrigin));
          return;
        }

        if (mongoose.connection.readyState !== 1 || this.isDatabaseConnectionError(error)) {
          res.redirect(302, providerFailureUrl(provider, 'database_unavailable', clientOrigin));
          return;
        }

        const reason =
          error instanceof Error && error.message === `${provider}_not_configured`
            ? 'not_configured'
            : 'provider_error';
        console.error(`OAuth callback failed for ${provider} (${reason}).`);
        res.redirect(302, providerFailureUrl(provider, reason, clientOrigin));
      }
    };

  private isDatabaseConnectionError(error: unknown): boolean {
    if (!(error instanceof Error)) return false;
    return /MongoNetworkError|MongoServerSelectionError|MongoNotConnectedError|ECONNREFUSED|ENOTFOUND|ETIMEDOUT/.test(
      `${error.name} ${error.message}`
    );
  }

  private appleDisplayName(value: unknown): string | null {
    if (typeof value !== 'string' || value.length > 4096) return null;
    try {
      const appleUser = JSON.parse(value) as {
        name?: { firstName?: unknown; lastName?: unknown };
      };
      const parts = [appleUser.name?.firstName, appleUser.name?.lastName]
        .filter((part): part is string => typeof part === 'string')
        .map((part) => part.trim())
        .filter(Boolean);
      return parts.length ? parts.join(' ').slice(0, 80) : null;
    } catch {
      return null;
    }
  }
}

