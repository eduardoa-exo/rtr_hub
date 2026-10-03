/**
 * R2 Upload Utilities
 *
 * Client-side helpers for uploading media to Cloudflare R2 via presigned URLs.
 * Uses Supabase JWT for authentication to the presign worker.
 * Display URLs: prefer `mediaUrl()` from `./mediaUrl` (rewrites legacy Storage links).
 */

export type MediaUploadType = "weather" | "map" | "championship" | "driver";

export { mediaUrl, isSupabaseStorageUrl } from "./mediaUrl";

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
    "Content-Type": string;
    "Cache-Control": string;
  };
}

/**
 * Upload a file to R2 using the presign worker.
 */
export async function uploadMedia(
  options: UploadMediaOptions
): Promise<{ publicUrl: string; key: string }> {
  const { file, type, authToken, entityId } = options;

  const presignUrl = import.meta.env.VITE_R2_PRESIGN_URL;
  if (!presignUrl) {
    throw new Error("VITE_R2_PRESIGN_URL não configurado");
  }

  const presignResponse = await fetch(`${presignUrl}/presign`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${authToken}`,
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
    const error = await presignResponse
      .json()
      .catch(() => ({ error: "Erro ao obter URL de upload" }));
    throw new Error(error.error || "Erro ao obter URL de upload");
  }

  const { uploadUrl, publicUrl, key, headers }: PresignResponse =
    await presignResponse.json();

  const uploadResponse = await fetch(uploadUrl, {
    method: "PUT",
    headers: {
      "Content-Type": headers["Content-Type"],
      "Cache-Control": headers["Cache-Control"],
    },
    body: file,
  });

  if (!uploadResponse.ok) {
    throw new Error("Erro ao fazer upload do ficheiro para R2");
  }

  return { publicUrl, key };
}
