import { supabase } from "@/integrations/supabase/client";
import { uploadMedia } from "./r2Upload";

export async function uploadRaceImage(raceId: string, file: File, type: "weather" | "map") {
  const { data: { session } } = await supabase.auth.getSession();
  if (!session) throw new Error("Não autenticado");

  const { publicUrl, key } = await uploadMedia({
    file,
    type,
    authToken: session.access_token,
    entityId: raceId,
  });

  const { data: imageData, error: imageError } = await supabase
    .from("images")
    .insert({
      storage_path: key,
      url: publicUrl,
      filename: file.name,
      mime_type: file.type,
      size_bytes: file.size,
      description: type === "weather" ? "Weather forecast" : "Track map",
      category: type === "weather" ? "weather" : "track-map",
    })
    .select()
    .single();
  if (imageError) throw imageError;
  return imageData;
}
