import { useQuery } from "@tanstack/react-query";
import { LANDING_IMAGES, type LandingImage } from "@/data/landingImages";
import { queryKeys } from "./queryKeys";

/** Landing heroes are static assets — no Supabase Storage / cached egress. */
export function useLandingImages() {
  return useQuery({
    queryKey: queryKeys.images.landing(),
    queryFn: async (): Promise<LandingImage[]> => LANDING_IMAGES,
    staleTime: Infinity,
  });
}
