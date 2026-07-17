// Anonymous identity: opaque bearer tokens (hash-only at rest) and short
// human save codes. Being replaced by Google sign-in (better-auth) — see
// ROADMAP decision 5.

// Unambiguous alphabet: no 0/O, 1/I/L, or vowels that spell words.
const CODE_ALPHABET = "23456789CDFGHJKMNPQRTVWXYZ";
export const CODE_LENGTH = 6;

export function generateToken(): string {
  const bytes = new Uint8Array(32);
  crypto.getRandomValues(bytes);
  return base64url(bytes);
}

export async function hashToken(token: string): Promise<string> {
  const digest = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(token));
  return [...new Uint8Array(digest)].map((b) => b.toString(16).padStart(2, "0")).join("");
}

export function generateSaveCode(): string {
  const bytes = new Uint8Array(CODE_LENGTH);
  crypto.getRandomValues(bytes);
  return [...bytes].map((b) => CODE_ALPHABET[b % CODE_ALPHABET.length]).join("");
}

export function normalizeSaveCode(raw: string): string | null {
  const code = raw.trim().toUpperCase();
  if (code.length !== CODE_LENGTH) return null;
  for (const ch of code) if (!CODE_ALPHABET.includes(ch)) return null;
  return code;
}

export function bearerToken(request: Request): string | null {
  const header = request.headers.get("authorization");
  if (!header?.startsWith("Bearer ")) return null;
  const token = header.slice("Bearer ".length).trim();
  return token.length > 0 ? token : null;
}

function base64url(bytes: Uint8Array): string {
  let binary = "";
  for (const b of bytes) binary += String.fromCharCode(b);
  return btoa(binary).replaceAll("+", "-").replaceAll("/", "_").replaceAll("=", "");
}
