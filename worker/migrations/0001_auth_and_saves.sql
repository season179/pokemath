-- Google sign-in via better-auth (user/session/account/verification are
-- library-owned; DDL generated from the installed runtime by
-- worker/scripts/generate-auth-schema.mjs — regenerate after upgrading
-- better-auth or changing user.additionalFields in src/auth.ts).
--
-- user.playerName is ours: the in-game display name, ^[A-Za-z0-9]{1,10}$,
-- NULL until the player picks one, changeable anytime.

CREATE TABLE "user" ("id" text not null primary key, "name" text not null, "email" text not null unique, "emailVerified" integer not null, "image" text, "createdAt" date not null, "updatedAt" date not null, "playerName" text);

CREATE TABLE "session" ("id" text not null primary key, "expiresAt" date not null, "token" text not null unique, "createdAt" date not null, "updatedAt" date not null, "ipAddress" text, "userAgent" text, "userId" text not null references "user" ("id") on delete cascade);

CREATE TABLE "account" ("id" text not null primary key, "accountId" text not null, "providerId" text not null, "userId" text not null references "user" ("id") on delete cascade, "accessToken" text, "refreshToken" text, "idToken" text, "accessTokenExpiresAt" date, "refreshTokenExpiresAt" date, "scope" text, "password" text, "createdAt" date not null, "updatedAt" date not null);

CREATE TABLE "verification" ("id" text not null primary key, "identifier" text not null, "value" text not null, "expiresAt" date not null, "createdAt" date not null, "updatedAt" date not null);

CREATE INDEX "session_userId_idx" on "session" ("userId");
CREATE INDEX "account_userId_idx" on "account" ("userId");
CREATE INDEX "verification_identifier_idx" on "verification" ("identifier");

-- Game saves, keyed per signed-in user. Same shape as before: JSON blob,
-- integer-version compare-and-swap for cross-device write safety.
CREATE TABLE saves (
  user_id TEXT PRIMARY KEY REFERENCES "user" ("id") ON DELETE CASCADE,
  payload_json TEXT NOT NULL,          -- SaveState JSON (validated on write)
  version INTEGER NOT NULL DEFAULT 1,  -- optimistic-concurrency counter
  updated_at TEXT NOT NULL             -- server-owned ISO timestamp
);
