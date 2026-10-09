/**
 * Cloudflare Worker: R2 Presigned Upload URLs
 *
 * Issues short-lived presigned PUT URLs for authenticated uploads to R2.
 * Verifies Supabase JWT before issuing URLs.
 */

import { AwsClient } from "aws4fetch";
import * as jose from "jose";

const ALLOWED_CONTENT_TYPES = [
  "image/jpeg",
  "image/jpg",
  "image/png",
  "image/webp",
  "image/avif",
  "image/gif",
];

const MAX_FILE_SIZE_BYTES = 10 * 1024 * 1024; // 10MB

const TYPE_PREFIX_MAP = {
  weather: "track-weather/",
  map: "track-images/",
  championship: "championship-logos/",
  driver: "drivers/",
  trophy: "trophies/",
};

/**
 * Verify Supabase JWT.
 * Prefers JWKS (ES256/RS256 signing keys). Falls back to legacy HS256 JWT secret.
 */
async function verifySupabaseJWT(token, env) {
  try {
    const supabaseUrl = (env.SUPABASE_URL || "").replace(/\/$/, "");
    if (supabaseUrl) {
      try {
        const JWKS = jose.createRemoteJWKSet(
          new URL(`${supabaseUrl}/auth/v1/.well-known/jwks.json`),
        );
        await jose.jwtVerify(token, JWKS, {
          issuer: `${supabaseUrl}/auth/v1`,
        });
        return true;
      } catch (jwksErr) {
        console.error(
          "JWKS JWT verification failed, trying HS256 fallback:",
          jwksErr,
        );
      }
    }

    if (!env.SUPABASE_JWT_SECRET) return false;

    const secret = new TextEncoder().encode(env.SUPABASE_JWT_SECRET);
    await jose.jwtVerify(token, secret, {
      algorithms: ["HS256"],
    });
    return true;
  } catch (error) {
    console.error("JWT verification error:", error);
    return false;
  }
}

/**
 * Sanitize filename to prevent path traversal
 */
function sanitizeFileName(fileName) {
  return fileName
    .replace(/[^a-zA-Z0-9._-]/g, "-")
    .replace(/\.{2,}/g, ".")
    .replace(/^\.+|\.+$/g, "")
    .substring(0, 100);
}

/**
 * Generate object key with prefix and timestamp
 */
function generateObjectKey(type, fileName, entityId) {
  const prefix = TYPE_PREFIX_MAP[type];
  if (!prefix) {
    throw new Error("Invalid upload type");
  }

  const timestamp = Date.now();
  const safeName = fileName
    ? sanitizeFileName(fileName)
    : `upload-${timestamp}`;
  const entityPart = entityId ? `${sanitizeFileName(entityId)}/` : "";

  return `${prefix}${entityPart}${timestamp}-${safeName}`;
}

/**
 * Generate presigned PUT URL
 */
async function generatePresignedUrl(env, key, contentType, expiresIn = 120) {
  const endpoint = `https://${env.R2_ACCOUNT_ID}.r2.cloudflarestorage.com`;
  const url = new URL(`/${env.R2_BUCKET}/${key}`, endpoint);
  // MUST include X-Amz-Expires in URL BEFORE signing for SigV4
  url.searchParams.set("X-Amz-Expires", expiresIn.toString());

  const aws = new AwsClient({
    accessKeyId: env.R2_ACCESS_KEY_ID,
    secretAccessKey: env.R2_SECRET_ACCESS_KEY,
    service: "s3",
    region: "auto",
  });

  const signedRequest = await aws.sign(url.toString(), {
    method: "PUT",
    headers: {
      "Content-Type": contentType,
      "Cache-Control": "public, max-age=31536000, immutable",
    },
    aws: {
      signQuery: true,
      datetime: new Date().toISOString().replace(/[:-]|\.\d{3}/g, ""),
      allHeaders: false,
    },
  });

  return signedRequest.url;
}

/**
 * Handle CORS preflight
 */
function handleOptions(request, env) {
  const origin = request.headers.get("Origin");
  const allowedOrigins = env.ALLOWED_ORIGINS.split(",").map((o) => o.trim());

  const corsHeaders = {
    "Access-Control-Allow-Methods": "POST, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type, Authorization",
    "Access-Control-Max-Age": "86400",
  };

  if (origin && allowedOrigins.includes(origin)) {
    corsHeaders["Access-Control-Allow-Origin"] = origin;
    corsHeaders["Access-Control-Allow-Credentials"] = "true";
  }

  return new Response(null, {
    status: 204,
    headers: corsHeaders,
  });
}

/**
 * Add CORS headers to response
 */
function addCorsHeaders(response, request, env) {
  const origin = request.headers.get("Origin");
  const allowedOrigins = env.ALLOWED_ORIGINS.split(",").map((o) => o.trim());

  const headers = new Headers(response.headers);

  if (origin && allowedOrigins.includes(origin)) {
    headers.set("Access-Control-Allow-Origin", origin);
    headers.set("Access-Control-Allow-Credentials", "true");
  }

  return new Response(response.body, {
    status: response.status,
    statusText: response.statusText,
    headers,
  });
}

/**
 * Handle presign request
 */
async function handlePresign(request, env) {
  try {
    // Verify authentication
    const authHeader = request.headers.get("Authorization");
    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      return new Response(
        JSON.stringify({ error: "Unauthorized: Missing or invalid token" }),
        {
          status: 401,
          headers: { "Content-Type": "application/json" },
        },
      );
    }

    const token = authHeader.substring(7);
    const isValid = await verifySupabaseJWT(token, env);
    if (!isValid) {
      return new Response(
        JSON.stringify({ error: "Unauthorized: Invalid JWT" }),
        {
          status: 401,
          headers: { "Content-Type": "application/json" },
        },
      );
    }

    // Parse request body
    const body = await request.json();

    // Validate type
    if (!TYPE_PREFIX_MAP[body.type]) {
      return new Response(
        JSON.stringify({
          error:
            'Bad Request: Invalid type. Must be "weather", "map", "championship", "driver", or "trophy"',
        }),
        {
          status: 400,
          headers: { "Content-Type": "application/json" },
        },
      );
    }

    // Validate content type
    if (!ALLOWED_CONTENT_TYPES.includes(body.contentType)) {
      return new Response(
        JSON.stringify({
          error: `Bad Request: Invalid content type. Allowed: ${ALLOWED_CONTENT_TYPES.join(", ")}`,
        }),
        {
          status: 400,
          headers: { "Content-Type": "application/json" },
        },
      );
    }

    // Validate size (required)
    if (!body.sizeBytes || typeof body.sizeBytes !== "number") {
      return new Response(
        JSON.stringify({
          error: "Bad Request: sizeBytes is required",
        }),
        {
          status: 400,
          headers: { "Content-Type": "application/json" },
        },
      );
    }

    if (!Number.isFinite(body.sizeBytes) || body.sizeBytes <= 0) {
      return new Response(
        JSON.stringify({
          error: "Bad Request: sizeBytes must be a positive number",
        }),
        {
          status: 400,
          headers: { "Content-Type": "application/json" },
        },
      );
    }

    if (body.sizeBytes > MAX_FILE_SIZE_BYTES) {
      return new Response(
        JSON.stringify({
          error: `Bad Request: File too large. Max ${MAX_FILE_SIZE_BYTES / 1024 / 1024}MB`,
        }),
        {
          status: 400,
          headers: { "Content-Type": "application/json" },
        },
      );
    }

    // Generate object key
    const key = generateObjectKey(body.type, body.fileName, body.entityId);

    // Generate presigned URL
    const uploadUrl = await generatePresignedUrl(env, key, body.contentType);

    // Build response
    const publicUrl = `${env.R2_PUBLIC_BASE}/${key}`;
    const responseData = {
      uploadUrl,
      publicUrl,
      key,
      headers: {
        "Content-Type": body.contentType,
        "Cache-Control": "public, max-age=31536000, immutable",
      },
    };

    return new Response(JSON.stringify(responseData), {
      status: 200,
      headers: { "Content-Type": "application/json" },
    });
  } catch (error) {
    // Log internally without exposing secrets or JWT
    console.error(
      "Presign error:",
      error instanceof Error ? error.message : "Unknown error",
    );
    // Return generic error to client (never leak error details)
    return new Response(
      JSON.stringify({
        error: "internal_error",
      }),
      {
        status: 500,
        headers: { "Content-Type": "application/json" },
      },
    );
  }
}

/**
 * Main worker handler
 */
export default {
  async fetch(request, env) {
    const url = new URL(request.url);

    // Handle CORS preflight
    if (request.method === "OPTIONS") {
      return handleOptions(request, env);
    }

    // Handle presign endpoint
    if (url.pathname === "/presign" && request.method === "POST") {
      const response = await handlePresign(request, env);
      return addCorsHeaders(response, request, env);
    }

    // Health check
    if (url.pathname === "/health" && request.method === "GET") {
      return new Response(JSON.stringify({ status: "ok" }), {
        status: 200,
        headers: { "Content-Type": "application/json" },
      });
    }

    // Not found
    return new Response(JSON.stringify({ error: "Not Found" }), {
      status: 404,
      headers: { "Content-Type": "application/json" },
    });
  },
};
