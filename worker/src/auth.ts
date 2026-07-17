// better-auth instance: Google sign-in only, cookie sessions, D1 storage.
// Built per-request because the D1 binding lives on the fetch handler's env.
// If user.additionalFields changes here, regenerate the migration DDL with
// worker/scripts/generate-auth-schema.mjs.

import { betterAuth } from "better-auth";

export type Auth = ReturnType<typeof buildAuth>;

export function buildAuth(env: Env) {
  return betterAuth({
    database: env.DB,
    baseURL: env.BETTER_AUTH_URL,
    secret: env.BETTER_AUTH_SECRET,
    trustedOrigins: [env.BETTER_AUTH_URL],
    socialProviders: {
      google: {
        clientId: env.GOOGLE_CLIENT_ID,
        clientSecret: env.GOOGLE_CLIENT_SECRET,
      },
    },
    // No passwords in production — Google is the only way in. Development
    // (ENVIRONMENT=development, .dev.vars) enables email/password so coding
    // agents can sign in locally without a Google account; see docs/local-testing.md.
    emailAndPassword: { enabled: env.ENVIRONMENT === "development" },
    session: {
      expiresIn: 60 * 60 * 24 * 30, // 30 days
      updateAge: 60 * 60 * 24, // sliding: refresh expiry at most daily
      cookieCache: { enabled: false }, // D1 lookup each time; simple and revocable
    },
    user: {
      additionalFields: {
        // In-game display name, chosen by the player. NULL until first set.
        // Never client-writable through better-auth's own update endpoints —
        // PUT /api/profile/name enforces ^[A-Za-z0-9]{1,10}$.
        playerName: { type: "string", required: false, input: false },
      },
    },
    advanced: {
      useSecureCookies: true,
    },
  });
}
