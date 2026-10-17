# Google and Apple authentication setup

The Express API owns OAuth state, code exchange, identity-token verification, MongoDB account persistence, and the HTTP-only Medivanta session cookie. The React app only redirects to the API and requests the authenticated session after the provider callback.

## Local development

Set these values in the server-only `Backend/.env` file. Never put provider secrets, Apple keys, the MongoDB URI, or the JWT secret in `frontend/.env` or a `VITE_*` variable.

```dotenv
CLIENT_URL=http://localhost:5173
API_BASE_URL=http://localhost:5000/api
MONGODB_URI=mongodb+srv://<db-user>:<encoded-password>@<cluster-host>/<database>?retryWrites=true&w=majority
REDIS_URL=redis://:<password>@<redis-host>:<port>
JWT_SECRET=<random-secret-at-least-32-characters>

GOOGLE_CLIENT_ID=<web-oauth-client-id>
GOOGLE_CLIENT_SECRET=<web-oauth-client-secret>
GOOGLE_REDIRECT_URI=http://localhost:5000/api/auth/google/callback

APPLE_CLIENT_ID=<apple-services-id>
APPLE_TEAM_ID=<apple-team-id>
APPLE_KEY_ID=<apple-sign-in-key-id>
APPLE_PRIVATE_KEY=<pkcs8-p8-key-with-newlines-escaped-as-\n>
APPLE_REDIRECT_URI=https://<public-development-api-host>/api/auth/apple/callback
```

`GOOGLE_REDIRECT_URI` and `APPLE_REDIRECT_URI` default to `<API_BASE_URL>/auth/<provider>/callback`. Set explicit values when the externally registered redirect differs from the API URL. Apple web return URLs require a publicly reachable HTTPS domain; use a configured HTTPS development host/tunnel instead of the default localhost URL.

## Google Cloud Console

1. Create a **Web application** OAuth client and configure the consent screen.
2. Add `http://localhost:5173` to Authorized JavaScript origins for local development.
3. Add the exact `GOOGLE_REDIRECT_URI` above to Authorized redirect URIs. For local development on both loopback names, also register `http://127.0.0.1:5000/api/auth/google/callback`; the API uses the matching loopback hostname for authorization-code exchange. Production must use the deployed HTTPS API callback URL.
4. Copy the client ID and secret to the server environment. Never expose the secret to the browser.
5. The API requests `openid email profile`, validates Google’s signed ID token, issuer, audience, expiry, issued-at age, verified email, subject, and nonce, then stores/reuses the MongoDB identity.

## Apple Developer

1. Enable **Sign in with Apple** on the associated primary App ID.
2. Create a **Services ID** and set it as `APPLE_CLIENT_ID`.
3. Associate the Services ID with the primary App ID. Add the site domain and exact HTTPS `APPLE_REDIRECT_URI` to its web authentication configuration.
4. Create a Sign in with Apple key and provide its Team ID, Key ID, and `.p8` private key as server-only `APPLE_TEAM_ID`, `APPLE_KEY_ID`, and `APPLE_PRIVATE_KEY`. Keep the private key secret and rotate it if exposed.
5. Apple return URLs are registered exactly and must be HTTPS for a web deployment. The app uses `form_post`; browsers may omit the `SameSite=Lax` transaction cookie on this cross-site POST, so the API also validates its expiring HMAC-signed `state`.
6. The API creates the short-lived ES256 client-secret JWT, exchanges the one-use authorization code, and validates Apple’s signed identity token, issuer, audience, expiry, issued-at age, subject, nonce, and verified email when present. A returning Apple subject can sign in if Apple omits the email claim after the first authorization; first-time account creation requires a verified email.
7. For local frontend testing, expose the API through the same public HTTPS host used by `APPLE_REDIRECT_URI`; set both server-side `API_BASE_URL` and frontend `VITE_API_URL` to that API URL. The browser must start OAuth on that host so the state and session cookies are returned to the same API.

## MongoDB and session requirements

- `MONGODB_URI` must point to a reachable MongoDB deployment with an account permitted to read/write the application database. Allow the API host in Atlas Network Access and confirm outbound DNS/TLS connectivity.
- `JWT_SECRET` must be unique and at least 32 characters. Provider sign-in sets the same HTTP-only `token` cookie used by password sign-in; `GET /api/auth/session` returns the database user after validating it.
- `REDIS_URL` is used by the existing token blacklist/logout integration. Provider accounts are not created if MongoDB is unavailable or the database write fails.
- User identities are unique by normalized email and by `(authProvider, providerSubject)`. An email already used by a different login method is not silently linked; authenticate with the existing method first.

## Callback outcomes and local verification

The API redirects to `/auth/callback` with a status code after validating OAuth state. The React callback then fetches the account from the API session endpoint; it does not accept user details from callback query parameters. Provider errors, cancellation, state mismatch, duplicate/conflicting email, and database failure do not create an authenticated frontend session.

Use a test Google account and a provisioned Apple account after the external settings, reachable MongoDB, and API process are configured. The automated tests validate OAuth state/claims and backend behavior with generated test keys; they do not replace provider-dashboard or live database integration tests.

## Face authentication availability

This repository does not currently include a server-side biometric verification or enrollment service. The `BIOMETRIC_PROVIDER` variable alone cannot enable face authentication, and the backend will never treat a client-side face match as proof of identity. The existing UI may request camera access after the user explicitly starts a preview, but the video and a temporary captured frame stay in the browser and are not sent to or stored by the server. No face enrollment or login succeeds without a real configured service. Use email/password login instead.

No HSM attestation requirement is implemented or configured by this application. If biometric support is added later, integrate a real server-side verifier with explicit security, consent, retention, and deployment requirements before enabling capture or enrollment.
