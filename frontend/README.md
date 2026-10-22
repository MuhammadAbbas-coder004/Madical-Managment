# React + TypeScript + Vite

This template provides a minimal setup to get React working in Vite with HMR and some Oxlint rules.

Currently, two official plugins are available:

- [@vitejs/plugin-react](https://github.com/vitejs/vite-plugin-react/blob/main/packages/plugin-react) uses [Oxc](https://oxc.rs)
- [@vitejs/plugin-react-swc](https://github.com/vitejs/vite/blob/main/packages/plugin-react-swc) uses [SWC](https://swc.rs/)

## React Compiler

The React Compiler is not enabled on this template because of its impact on build and development performances. To add it, see [this documentation](https://react.dev/learn/react-compiler/installation).

## Expanding the Oxlint configuration

If you are developing a production application, we recommend enabling type-aware lint rules by installing `oxlint-tsgolint` and editing `.oxlintrc.json`:

```json
{
  "$schema": "./node_modules/oxlint/configuration_schema.json",
  "plugins": ["react", "typescript", "oxc"],
  "options": {
    "typeAware": true
  },
  "rules": {
    "react/rules-of-hooks": "error",
    "react/only-export-components": ["warn", { "allowConstantExport": true }]
  }
}
```

See the [Oxlint rules documentation](https://oxc.rs/docs/guide/usage/linter/rules) for details on configuring lint rules.

## Deploying to Vercel

Vercel builds the frontend from the repository root using `vercel.json`. The backend
is a separate service and must be deployed to a public HTTPS URL; a browser cannot
reach a backend running at `localhost` on a developer's machine.

In the Vercel project's **Settings → Environment Variables**, set
`VITE_API_URL` to the public API base URL, including `/api` (for example,
`https://api.example.com/api`). Apply it to the Production environment and
redeploy, since Vite embeds this value when building the frontend.

Configure the backend deployment with:

- `NODE_ENV=production`
- `CLIENT_URL` set to the exact Vercel frontend origin, such as
  `https://your-project.vercel.app` (no path)
- `API_BASE_URL` set to the public API base URL, including `/api`
- The backend's required database, Redis, and JWT environment variables, set
  securely in the backend host

Do not set the production `VITE_API_URL` to `localhost`: that address refers to
the visitor's own device, not the deployed backend. The backend must be reachable
over HTTPS and allow the Vercel frontend origin for credentialed CORS requests.
Production auth cookies currently use `SameSite=Strict`, so serve the frontend
and API under the same site (for example, `app.example.com` and `api.example.com`)
or proxy API requests through the frontend origin. Unrelated domains can prevent
the browser from sending the session cookie even when the API is reachable.
