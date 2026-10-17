import dotenv from 'dotenv';
// Load environment variables from .env file
dotenv.config();

export interface EnvConfig {
  PORT: number;
  NODE_ENV: 'development' | 'production' | 'test';
  isProduction: boolean;
  isDevelopment: boolean;
  CLIENT_URL: string;
  API_BASE_URL: string;
  MONGODB_URI: string;
  REDIS_URL: string;
  JWT_SECRET: string;
  GOOGLE_CLIENT_ID: string;
  GOOGLE_CLIENT_SECRET: string;
  GOOGLE_REDIRECT_URI: string;
  APPLE_CLIENT_ID: string;
  APPLE_TEAM_ID: string;
  APPLE_KEY_ID: string;
  APPLE_PRIVATE_KEY: string;
  APPLE_REDIRECT_URI: string;
  EMAIL_HOST: string;
  EMAIL_PORT: number;
  EMAIL_USER: string;
  EMAIL_PASS: string;
  TWILIO_SID: string;
  TWILIO_AUTH_TOKEN: string;
  TWILIO_PHONE: string;
}

export const validateEnv = (): EnvConfig => {
  const errors: string[] = [];
  const nodeEnv = (process.env.NODE_ENV?.trim() as 'development' | 'production' | 'test') || 'development';

  // 1. PORT validation
  const portStr = process.env.PORT?.trim();
  let parsedPort = 5000;
  if (!portStr) {
    errors.push('PORT is required.');
  } else {
    parsedPort = Number(portStr);
    if (isNaN(parsedPort) || parsedPort <= 0 || parsedPort > 65535) {
      errors.push(`PORT must be a valid port number between 1 and 65535, received: "${portStr}".`);
    }
  }

  // 2. MONGODB_URI validation
  const mongoUri = process.env.MONGODB_URI?.trim();
  if (!mongoUri) {
    errors.push('MONGODB_URI is required.');
  } else if (!mongoUri.startsWith('mongodb://') && !mongoUri.startsWith('mongodb+srv://')) {
    errors.push('MONGODB_URI must start with "mongodb://" or "mongodb+srv://".');
  }

  // 3. REDIS_URL validation
  const redisUrl = process.env.REDIS_URL?.trim();
  if (!redisUrl) {
    errors.push('REDIS_URL is required.');
  }

  // 4. CLIENT_URL validation
  const clientUrl = process.env.CLIENT_URL?.trim();
  if (!clientUrl) {
    errors.push('CLIENT_URL is required.');
  }

  const apiBaseUrl = process.env.API_BASE_URL?.trim() || `http://localhost:${process.env.PORT?.trim() || '5000'}/api`;
  try {
    const parsedApiUrl = new URL(apiBaseUrl);
    if (!['http:', 'https:'].includes(parsedApiUrl.protocol)) {
      errors.push('API_BASE_URL must use HTTP or HTTPS.');
    }
    if (nodeEnv === 'production' && parsedApiUrl.protocol !== 'https:') {
      errors.push('API_BASE_URL must use HTTPS in production.');
    }
  } catch {
    errors.push('API_BASE_URL must be an absolute HTTP or HTTPS URL.');
  }
  if (nodeEnv === 'production' && !process.env.API_BASE_URL?.trim()) {
    errors.push('API_BASE_URL must be explicitly set in production.');
  }

  const googleClientId = process.env.GOOGLE_CLIENT_ID?.trim() || '';
  const googleClientSecret = process.env.GOOGLE_CLIENT_SECRET?.trim() || '';
  const googleRedirectUri =
    process.env.GOOGLE_REDIRECT_URI?.trim() || `${apiBaseUrl.replace(/\/+$/, '')}/auth/google/callback`;
  if (Boolean(googleClientId) !== Boolean(googleClientSecret)) {
    errors.push('GOOGLE_CLIENT_ID and GOOGLE_CLIENT_SECRET must be configured together.');
  }
  try {
    const googleRedirect = new URL(googleRedirectUri);
    if (!['http:', 'https:'].includes(googleRedirect.protocol)) {
      errors.push('GOOGLE_REDIRECT_URI must use HTTP or HTTPS.');
    }
    if (nodeEnv === 'production' && googleRedirect.protocol !== 'https:') {
      errors.push('GOOGLE_REDIRECT_URI must use HTTPS in production.');
    }
  } catch {
    errors.push('GOOGLE_REDIRECT_URI must be an absolute HTTP or HTTPS URL.');
  }

  const appleClientId = process.env.APPLE_CLIENT_ID?.trim() || '';
  const appleTeamId = process.env.APPLE_TEAM_ID?.trim() || '';
  const appleKeyId = process.env.APPLE_KEY_ID?.trim() || '';
  const applePrivateKey = process.env.APPLE_PRIVATE_KEY?.trim() || '';
  const appleRedirectUri =
    process.env.APPLE_REDIRECT_URI?.trim() || `${apiBaseUrl.replace(/\/+$/, '')}/auth/apple/callback`;
  const appleValues = [appleClientId, appleTeamId, appleKeyId, applePrivateKey];
  if (appleValues.some(Boolean) && !appleValues.every(Boolean)) {
    errors.push('APPLE_CLIENT_ID, APPLE_TEAM_ID, APPLE_KEY_ID, and APPLE_PRIVATE_KEY must be configured together.');
  }
  if (applePrivateKey && !applePrivateKey.includes('BEGIN PRIVATE KEY')) {
    errors.push('APPLE_PRIVATE_KEY must be a valid PKCS#8 EC private key.');
  }
  try {
    const appleRedirect = new URL(appleRedirectUri);
    if (appleRedirect.protocol !== 'https:' && appleClientId) {
      errors.push('APPLE_REDIRECT_URI must use HTTPS when Apple Sign in with Apple is enabled.');
    }
  } catch {
    errors.push('APPLE_REDIRECT_URI must be an absolute HTTPS URL.');
  }

  // 5. JWT_SECRET validation (required and at least 32 characters)
  const jwtSecret = process.env.JWT_SECRET?.trim();
  if (!jwtSecret) {
    errors.push('JWT_SECRET is required.');
  } else if (jwtSecret.length < 32) {
    errors.push(
      `JWT_SECRET must be at least 32 characters long for security (received ${jwtSecret.length} characters).`
    );
  }

  if (errors.length > 0) {
    const header = '❌ [Environment Validation Error] Server startup aborted due to configuration errors:';
    const formattedErrors = errors.map((err) => `  - ${err}`).join('\n');
    const fullMessage = `${header}\n${formattedErrors}\nPlease check your .env file or consult .env.example.`;

    console.error(`\n${fullMessage}\n`);
    throw new Error(fullMessage);
  }

  const emailPortStr = process.env.EMAIL_PORT?.trim() || '587';
  const emailPort = Number(emailPortStr) || 587;

  return {
    PORT: parsedPort,
    NODE_ENV: nodeEnv,
    isProduction: nodeEnv === 'production',
    isDevelopment: nodeEnv !== 'production',
    CLIENT_URL: clientUrl!,
    API_BASE_URL: apiBaseUrl.replace(/\/+$/, ''),
    MONGODB_URI: mongoUri!,
    REDIS_URL: redisUrl!,
    JWT_SECRET: jwtSecret!,
    GOOGLE_CLIENT_ID: googleClientId,
    GOOGLE_CLIENT_SECRET: googleClientSecret,
    GOOGLE_REDIRECT_URI: googleRedirectUri,
    APPLE_CLIENT_ID: appleClientId,
    APPLE_TEAM_ID: appleTeamId,
    APPLE_KEY_ID: appleKeyId,
    APPLE_PRIVATE_KEY: applePrivateKey.replace(/\\n/g, '\n'),
    APPLE_REDIRECT_URI: appleRedirectUri,
    EMAIL_HOST: process.env.EMAIL_HOST?.trim() || 'smtp.gmail.com',
    EMAIL_PORT: emailPort,
    EMAIL_USER: process.env.EMAIL_USER?.trim() || '',
    EMAIL_PASS: process.env.EMAIL_PASS?.trim() || '',
    TWILIO_SID: process.env.TWILIO_SID?.trim() || '',
    TWILIO_AUTH_TOKEN: process.env.TWILIO_AUTH_TOKEN?.trim() || '',
    TWILIO_PHONE: process.env.TWILIO_PHONE?.trim() || '',
  };
};

export const env: EnvConfig = validateEnv();
export default env;
