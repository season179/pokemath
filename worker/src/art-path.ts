// Keep the public /art/vN/... URL aligned with the versioned R2 key
// art/vN/.... The Worker route receives the full pathname, so only the
// leading slash is removed.
export function artKeyFromPath(pathname: string): string | null {
  if (!pathname.startsWith("/art/")) return null;

  let key: string;
  try {
    key = decodeURIComponent(pathname.slice(1));
  } catch {
    return null;
  }

  if (!key.startsWith("art/") || key.includes("..")) return null;
  return key;
}

export function artContentType(key: string): string | null {
  if (/^art\/creatures\/[a-z0-9-]+\/[a-f0-9]{64}\/asset2?\.bin$/.test(key)) {
    return "image/png";
  }
  return null;
}
