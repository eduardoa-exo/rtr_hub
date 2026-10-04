import { supabase } from "@/integrations/supabase/client";
import { compressImage } from "@/lib/compressImage";
import { uploadMedia } from "./r2Upload";

export async function uploadRaceImage(raceId, file, type) {
  const {
    data: { session },
  } = await supabase.auth.getSession();
  if (!session) throw new Error("Não autenticado");

  const { file: compressed } = await compressImage(file, {
    maxEdge: type === "map" ? 1600 : 1920,
    quality: 0.8,
  });

  const { publicUrl, key } = await uploadMedia({
    file: compressed,
    type,
    authToken: session.access_token,
    entityId: raceId,
  });

  const { data: imageData, error: imageError } = await supabase
    .from("images")
    .insert({
      storage_path: key,
      url: publicUrl,
      filename: compressed.name,
      mime_type: compressed.type,
      size_bytes: compressed.size,
      description: type === "weather" ? "Weather forecast" : "Track map",
      category: type === "weather" ? "weather" : "track-map",
    })
    .select()
    .single();
  if (imageError) throw imageError;
  return imageData;
}
