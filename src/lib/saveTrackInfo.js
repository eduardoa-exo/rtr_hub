import { supabase } from "@/integrations/supabase/client";
import { uploadRaceImage } from "./uploadRaceImage";

export async function saveTrackInfo(raceId, weatherFile, mapFile) {
  if (!weatherFile && !mapFile) return;

  const weatherImg = weatherFile
    ? await uploadRaceImage(raceId, weatherFile, "weather")
    : null;
  const mapImg = mapFile ? await uploadRaceImage(raceId, mapFile, "map") : null;

  const { data: existing } = await supabase
    .from("track_info")
    .select("id")
    .eq("race_id", raceId)
    .maybeSingle();

  const fields = {
    ...(weatherImg ? { weather_image_id: weatherImg.id } : {}),
    ...(mapImg ? { track_map_id: mapImg.id } : {}),
  };

  if (existing) {
    await supabase.from("track_info").update(fields).eq("id", existing.id);
  } else {
    await supabase.from("track_info").insert({ race_id: raceId, ...fields });
  }
}
