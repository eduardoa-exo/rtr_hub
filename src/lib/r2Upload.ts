/**
 * R2 Upload Utilities
 * 
 * Client-side helpers for uploading media to Cloudflare R2 via presigned URLs.
 * Uses Supabase JWT for authentication to the presign worker.
 */

export type MediaUploadType = 'weather' | 'map' | 'championship';

interface UploadMediaOptions {
  file: File;
  type: MediaUploadType;
  authToken: string;
  entityId?: string;
}

interface PresignResponse {
  uploadUrl: string;
  publicUrl: string;
  key: string;
  headers: {
    'Content-Type': string;
    'Cache-Control': string;
  };
}

/**
 * Upload a file to R2 using the presign worker.
 * 
 * @param options Upload options including file, type, auth token, and optional entity ID
 * @returns Object containing the public URL and R2 key
 * @throws Error if upload fails
 */
export async function uploadMedia(options: UploadMediaOptions): Promise<{ publicUrl: string; key: string }> {
  const { file, type, authToken, entityId } = options;

  const presignUrl = import.meta.env.VITE_R2_PRESIGN_URL;
  if (!presignUrl) {
    throw new Error('VITE_R2_PRESIGN_URL não configurado');
  }

  // Request presigned URL from worker
  const presignResponse = await fetch(`${presignUrl}/presign`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${authToken}`,
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
    const error = await presignResponse.json().catch(() => ({ error: 'Erro ao obter URL de upload' }));
    throw new Error(error.error || 'Erro ao obter URL de upload');
  }

  const { uploadUrl, publicUrl, key, headers }: PresignResponse = await presignResponse.json();

  // Upload file to R2 using presigned URL
  const uploadResponse = await fetch(uploadUrl, {
    method: 'PUT',
    headers: {
      'Content-Type': headers['Content-Type'],
      'Cache-Control': headers['Cache-Control'],
    },
    body: file,
  });

  if (!uploadResponse.ok) {
    throw new Error('Erro ao fazer upload do ficheiro para R2');
  }

  return { publicUrl, key };
}

/**
 * Convert an R2 key or URL to a public CDN URL.
 * If the input is already a full URL, returns it as-is.
 * If it's a key, prepends the R2 public base URL.
 * 
 * @param keyOrUrl R2 object key (e.g., "track-weather/123.jpg") or full URL
 * @returns Public CDN URL
 */
export function mediaUrl(keyOrUrl: string): string {
  if (!keyOrUrl) return '';
  
  // If already a full URL, return as-is
  if (keyOrUrl.startsWith('http://') || keyOrUrl.startsWith('https://')) {
    return keyOrUrl;
  }

  // Otherwise, it's a key - prepend public base
  const publicBase = import.meta.env.VITE_R2_PUBLIC_BASE;
  if (!publicBase) {
    console.warn('VITE_R2_PUBLIC_BASE não configurado, retornando key como está');
    return keyOrUrl;
  }

  // Remove leading slash if present
  const cleanKey = keyOrUrl.startsWith('/') ? keyOrUrl.substring(1) : keyOrUrl;
  
  return `${publicBase}/${cleanKey}`;
}
