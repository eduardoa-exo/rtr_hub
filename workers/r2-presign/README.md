# R2 Presigned Upload URLs Worker

Cloudflare Worker that issues short-lived presigned PUT URLs for authenticated R2 uploads. Part of the Storage migration from Supabase to Cloudflare R2 while retaining Supabase Auth + Postgres.

## Overview

This Worker:
- **Authenticates** requests using Supabase JWT tokens
- **Validates** upload type, content type, and file size
- **Generates** presigned PUT URLs with 60-120 second expiration
- **Returns** upload URL + public URL for storing in the database
- **Enforces** security: no long-lived keys exposed to clients

## Architecture

```
Frontend → POST /presign (with Supabase JWT)
         ← { uploadUrl, publicUrl, key, headers }
Frontend → PUT uploadUrl (with file data)
         → Store publicUrl in database (images.url)
```

## Configuration

### Environment Variables (wrangler.toml)

**Public vars (safe to commit):**
- `R2_ACCOUNT_ID`: `1b19ccb374ddcd2fc94563d710beac2a`
- `R2_BUCKET`: `rtr-hub-media`
- `R2_PUBLIC_BASE`: `https://pub-f0a47a1e0660483ac04c343f23495c08.r2.dev`
- `ALLOWED_ORIGINS`: Comma-separated CORS origins (e.g., `http://localhost:5173,https://app.example.com`)

**Secrets (NEVER commit):**
- `R2_ACCESS_KEY_ID`: R2 S3 API access key
- `R2_SECRET_ACCESS_KEY`: R2 S3 API secret key
- `SUPABASE_JWT_SECRET`: Supabase JWT secret for token verification

## Deployment

### Prerequisites

1. Install Wrangler CLI:
   ```bash
   npm install -g wrangler
   ```

2. Authenticate with Cloudflare:
   ```bash
   wrangler login
   ```

### Set Secrets

**IMPORTANT:** Secrets must be set before deployment. NEVER put real credentials in code, logs, or PRs.

```bash
cd workers/r2-presign

# Set R2 credentials
wrangler secret put R2_ACCESS_KEY_ID
# Paste: [R2 Access Key ID from Cloudflare Dashboard]

wrangler secret put R2_SECRET_ACCESS_KEY
# Paste: [R2 Secret Access Key from Cloudflare Dashboard]

# Set Supabase JWT secret
wrangler secret put SUPABASE_JWT_SECRET
# Paste: [JWT Secret from Supabase Dashboard → Settings → API → JWT Secret]
```

### Update ALLOWED_ORIGINS

Edit `wrangler.toml` and update `ALLOWED_ORIGINS` with your production domains:

```toml
ALLOWED_ORIGINS = "https://your-production-app.com,https://staging-app.com"
```

### Deploy

```bash
cd workers/r2-presign
npm install
wrangler deploy
```

The Worker will be deployed to: `https://rtr-hub-r2-presign.<your-subdomain>.workers.dev`

## API Reference

### POST /presign

Issues a presigned PUT URL for uploading a file.

**Authentication:** Required  
**Header:** `Authorization: Bearer <supabase_access_token>`

**Request Body:**
```json
{
  "type": "weather" | "map" | "championship",
  "contentType": "image/jpeg",
  "fileName": "example.jpg",
  "entityId": "race-123",
  "sizeBytes": 1048576
}
```

**Fields:**
- `type` (required): Upload type, maps to R2 prefix:
  - `weather` → `track-weather/`
  - `map` → `track-images/`
  - `championship` → `championship-logos/`
- `contentType` (required): MIME type (must be image/jpeg, image/png, image/webp, image/avif, or image/gif)
- `fileName` (optional): Original filename (will be sanitized)
- `entityId` (optional): Entity ID for namespacing (e.g., raceId, championshipId)
- `sizeBytes` (optional): File size in bytes (max 10MB)

**Response (200 OK):**
```json
{
  "uploadUrl": "https://<account>.r2.cloudflarestorage.com/rtr-hub-media/track-weather/1234567890-example.jpg?X-Amz-...",
  "publicUrl": "https://pub-f0a47a1e0660483ac04c343f23495c08.r2.dev/track-weather/1234567890-example.jpg",
  "key": "track-weather/1234567890-example.jpg",
  "headers": {
    "Content-Type": "image/jpeg",
    "Cache-Control": "public, max-age=31536000, immutable"
  }
}
```

**Usage:**
1. Client calls POST /presign to get `uploadUrl` and `publicUrl`
2. Client PUTs the file to `uploadUrl` with headers from response
3. Client stores `publicUrl` in database (e.g., `images.url`)

**Errors:**
- `401 Unauthorized`: Missing or invalid JWT
- `400 Bad Request`: Invalid type, content type, or size
- `500 Internal Server Error`: Server error (check logs)

### GET /health

Health check endpoint.

**Response (200 OK):**
```json
{
  "status": "ok"
}
```

## Security Features

✅ **JWT Verification**: All requests must include valid Supabase JWT  
✅ **Content-Type Allowlist**: Only image MIME types allowed  
✅ **File Size Limit**: 10MB max  
✅ **Path Sanitization**: Prevents directory traversal  
✅ **Prefix Enforcement**: Keys locked to allowed prefixes  
✅ **Short-lived URLs**: 60-120 second expiration  
✅ **CORS**: Explicit origin allowlist (no wildcards with credentials)  
✅ **No Secret Logging**: Secrets never logged or exposed

## Object Key Format

Keys follow this pattern:
```
{prefix}{entityId?}/{timestamp}-{sanitized-filename}
```

Examples:
- `track-weather/1705123456789-rain-data.jpg`
- `track-images/race-123/1705123456790-track-map.png`
- `championship-logos/1705123456791-logo.webp`

## Frontend Integration Example

```typescript
import { supabase } from './supabaseClient';

async function uploadImage(file: File, type: 'weather' | 'map' | 'championship', entityId?: string) {
  // Get Supabase session token
  const { data: { session } } = await supabase.auth.getSession();
  if (!session) throw new Error('Not authenticated');

  // Request presigned URL
  const presignResponse = await fetch('https://rtr-hub-r2-presign.YOUR_SUBDOMAIN.workers.dev/presign', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${session.access_token}`,
    },
    body: JSON.stringify({
      type,
      contentType: file.type,
      fileName: file.name,
      entityId,
      sizeBytes: file.size,
    }),
  });

  if (!presignResponse.ok) {
    throw new Error('Failed to get presigned URL');
  }

  const { uploadUrl, publicUrl, headers } = await presignResponse.json();

  // Upload file to R2
  const uploadResponse = await fetch(uploadUrl, {
    method: 'PUT',
    headers: {
      'Content-Type': headers['Content-Type'],
      'Cache-Control': headers['Cache-Control'],
    },
    body: file,
  });

  if (!uploadResponse.ok) {
    throw new Error('Failed to upload file');
  }

  // Store publicUrl in database
  const { error } = await supabase
    .from('images')
    .insert({ url: publicUrl, type, entity_id: entityId });

  if (error) throw error;

  return publicUrl;
}
```

## Local Development

```bash
cd workers/r2-presign
npm install

# Set local secrets (one-time setup)
wrangler secret put R2_ACCESS_KEY_ID --env local
wrangler secret put R2_SECRET_ACCESS_KEY --env local
wrangler secret put SUPABASE_JWT_SECRET --env local

# Start dev server
npm run dev
# Worker available at http://localhost:8787
```

## Testing

```bash
npm test
```

Tests include:
- Key generation and sanitization
- Type-to-prefix mapping
- JWT verification logic (unit tests)

## Monitoring

Monitor the Worker in Cloudflare Dashboard:
1. Go to Workers & Pages
2. Select `rtr-hub-r2-presign`
3. View real-time logs, metrics, and errors

## Troubleshooting

### "Unauthorized: Invalid JWT"
- Verify `SUPABASE_JWT_SECRET` is set correctly
- Check token is not expired (`exp` claim)
- Ensure Bearer token format: `Authorization: Bearer <token>`

### "Invalid content type"
- Only image MIME types are allowed
- Check `file.type` in frontend matches allowlist

### CORS errors
- Update `ALLOWED_ORIGINS` in `wrangler.toml`
- Redeploy after changing origins
- Check browser dev console for specific CORS error

### "Failed to upload file" (PUT to uploadUrl)
- Presigned URLs expire in 60-120 seconds
- Ensure `Content-Type` header matches what was presigned
- Check R2 bucket permissions

## Support

For issues or questions:
1. Check Cloudflare Worker logs (Dashboard → Workers → Logs)
2. Verify all secrets are set: `wrangler secret list`
3. Test locally with `wrangler dev`
4. Review Cloudflare R2 documentation: https://developers.cloudflare.com/r2/

## Migration Notes

This Worker is part of Step 3 in the Storage migration plan:
- **Step 1**: ✅ Provision R2 bucket
- **Step 2**: ✅ Set up public read access
- **Step 3**: 🔄 This Worker (presigned upload URLs)
- **Step 4**: Update frontend to use Worker + R2
- **Step 5**: Migrate existing Supabase Storage objects
- **Step 6**: Deprecate Supabase Storage

**No changes to Supabase Auth or Postgres** — this only migrates Storage.
