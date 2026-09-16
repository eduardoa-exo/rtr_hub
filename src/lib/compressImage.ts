export type CompressImageOptions = {
  /** Longest edge in pixels. Default 1920. */
  maxEdge?: number;
  /** JPEG/WebP quality 0–1. Default 0.8. */
  quality?: number;
  /** Prefer WebP when supported. Default true. */
  preferWebp?: boolean;
};

export type CompressedImage = {
  file: File;
  width: number;
  height: number;
  originalBytes: number;
  compressedBytes: number;
};

function supportsWebp(): boolean {
  try {
    const canvas = document.createElement("canvas");
    canvas.width = 1;
    canvas.height = 1;
    return canvas.toDataURL("image/webp").startsWith("data:image/webp");
  } catch {
    return false;
  }
}

function loadImage(file: File): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(file);
    const img = new Image();
    img.onload = () => {
      URL.revokeObjectURL(url);
      resolve(img);
    };
    img.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new Error("Não foi possível ler a imagem."));
    };
    img.src = url;
  });
}

function canvasToBlob(
  canvas: HTMLCanvasElement,
  type: string,
  quality: number
): Promise<Blob> {
  return new Promise((resolve, reject) => {
    canvas.toBlob(
      (blob) => {
        if (!blob) reject(new Error("Falha ao comprimir a imagem."));
        else resolve(blob);
      },
      type,
      quality
    );
  });
}

/**
 * Resize + compress an image in the browser before Storage upload.
 * Cuts egress by serving smaller files from the CDN.
 */
export async function compressImage(
  file: File,
  options: CompressImageOptions = {}
): Promise<CompressedImage> {
  const maxEdge = options.maxEdge ?? 1920;
  const quality = options.quality ?? 0.8;
  const preferWebp = options.preferWebp ?? true;

  if (!file.type.startsWith("image/") || file.type === "image/svg+xml") {
    return {
      file,
      width: 0,
      height: 0,
      originalBytes: file.size,
      compressedBytes: file.size,
    };
  }

  const img = await loadImage(file);
  const scale = Math.min(1, maxEdge / Math.max(img.width, img.height));
  const width = Math.max(1, Math.round(img.width * scale));
  const height = Math.max(1, Math.round(img.height * scale));

  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("Canvas não disponível.");

  ctx.drawImage(img, 0, 0, width, height);

  const useWebp = preferWebp && supportsWebp();
  const mime = useWebp ? "image/webp" : "image/jpeg";
  const ext = useWebp ? "webp" : "jpg";
  const blob = await canvasToBlob(canvas, mime, quality);

  // Keep original if compression somehow grew the file (rare for photos).
  if (blob.size >= file.size && scale === 1) {
    return {
      file,
      width: img.width,
      height: img.height,
      originalBytes: file.size,
      compressedBytes: file.size,
    };
  }

  const baseName = file.name.replace(/\.[^.]+$/, "") || "image";
  const compressed = new File([blob], `${baseName}.${ext}`, {
    type: mime,
    lastModified: Date.now(),
  });

  return {
    file: compressed,
    width,
    height,
    originalBytes: file.size,
    compressedBytes: compressed.size,
  };
}
