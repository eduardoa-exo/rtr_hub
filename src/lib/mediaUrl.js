/**
 * Media URL helpers — Cloudflare R2 is the only media origin.
 * Supabase is Auth + Postgres only; Storage URLs are rewritten or rejected.
 */

const DEFAULT_R2_PUBLIC_BASE =
  "https://pub-f0a47a1e0660483ca04c343f23495c08.r2.dev";

/** Known typo from an older env example (ac vs ca) — never serve this. */
const LEGACY_TYPO_R2_PUBLIC_BASE =
  "https://pub-f0a47a1e0660483ac04c343f23495c08.r2.dev";

/** Old Supabase Storage bucket → R2 key prefix */
export const STORAGE_BUCKET_TO_R2_PREFIX = {
  "track-weather": "track-weather",
  "track-images": "track-images",
  ChampionshipLogos: "championship-logos",
  "championship-logos": "championship-logos",
  drivers: "drivers",
};

const STORAGE_PATH_RE =
  /\/storage\/v1\/object\/(?:public|sign|authenticated)\/([^/]+)\/(.+?)(?:\?|$)/i;

function r2PublicBase() {
  const fromEnv =
    typeof import.meta !== "undefined"
      ? import.meta.env?.VITE_R2_PUBLIC_BASE
      : undefined;
  const base =
    !fromEnv || fromEnv === LEGACY_TYPO_R2_PUBLIC_BASE
      ? DEFAULT_R2_PUBLIC_BASE
      : fromEnv;
  return String(base).replace(/\/$/, "");
}

export function isSupabaseStorageUrl(url) {
  if (!url) return false;
  try {
    const u = new URL(url);
    return (
      u.hostname.endsWith(".supabase.co") &&
      u.pathname.includes("/storage/v1/object/")
    );
  } catch {
    return false;
  }
}

/**
 * Extract `{ bucket, objectPath }` from a Supabase Storage URL.
 * objectPath is URL-decoded and has no leading slash.
 */
export function parseSupabaseStorageUrl(url) {
  if (!isSupabaseStorageUrl(url)) return null;
  try {
    const u = new URL(url);
    const match = u.pathname.match(STORAGE_PATH_RE);
    if (!match) return null;
    const bucket = decodeURIComponent(match[1]);
    const objectPath = decodeURIComponent(match[2]);
    return { bucket, objectPath };
  } catch {
    return null;
  }
}

/** Map a Storage bucket + object path to the R2 object key used after migration. */
export function storagePathToR2Key(bucket, objectPath) {
  const prefix =
    STORAGE_BUCKET_TO_R2_PREFIX[bucket] ??
    bucket.replace(/([a-z])([A-Z])/g, "$1-$2").toLowerCase();
  const clean = objectPath.replace(/^\/+/, "");
  // Avoid doubling prefix if storage_path already includes it
  if (clean.startsWith(`${prefix}/`)) return clean;
  return `${prefix}/${clean}`;
}

function joinR2Url(base, key) {
  const encoded = key
    .split("/")
    .filter(Boolean)
    .map((segment) => encodeURIComponent(segment))
    .join("/");
  return `${base}/${encoded}`;
}

/**
 * Resolve any media reference to a public CDN URL.
 * - Absolute non-Supabase URLs (R2, /images/…) pass through
 * - Supabase Storage URLs rewrite to R2 (same key layout as migrate script)
 * - Bare keys get VITE_R2_PUBLIC_BASE prepended
 */
export function mediaUrl(keyOrUrl) {
  if (!keyOrUrl) return "";

  const value = keyOrUrl.trim();
  if (!value) return "";

  // Site-local static assets
  if (value.startsWith("/") && !value.startsWith("//")) {
    return value;
  }

  if (value.startsWith("http://") || value.startsWith("https://")) {
    const parsed = parseSupabaseStorageUrl(value);
    if (parsed) {
      const key = storagePathToR2Key(parsed.bucket, parsed.objectPath);
      return joinR2Url(r2PublicBase(), key);
    }
    return value;
  }

  const cleanKey = value.startsWith("/") ? value.slice(1) : value;
  return joinR2Url(r2PublicBase(), cleanKey);
}
