import { useQuery } from "@tanstack/react-query";
import { LANDING_IMAGES } from "@/data/landingImages";
import { queryKeys } from "./queryKeys";

/** Landing heroes are static assets — no Supabase Storage / cached egress. */
export function useLandingImages() {
  return useQuery({
    queryKey: queryKeys.images.landing(),
    queryFn: async () => LANDING_IMAGES,
    staleTime: Infinity,
  });
}
