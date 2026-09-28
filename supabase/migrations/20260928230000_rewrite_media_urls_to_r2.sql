-- Rewrite Supabase Storage URLs → Cloudflare R2 public URLs.
-- Apply ONLY after scripts/migrate-supabase-storage-to-r2.mjs has copied
-- every object (same key layout as src/lib/mediaUrl.ts).
--
-- R2_PUBLIC_BASE must match:
--   workers/r2-presign/wrangler.toml → R2_PUBLIC_BASE
--   frontend env → VITE_R2_PUBLIC_BASE

CREATE OR REPLACE FUNCTION public._rtr_storage_url_to_r2(raw text, r2_base text)
RETURNS text
LANGUAGE plpgsql
IMMUTABLE
AS $$
DECLARE
  path text;
BEGIN
  IF raw IS NULL OR raw = '' THEN
    RETURN raw;
  END IF;

  -- Already on R2
  IF position('r2.dev' in raw) > 0 OR position(r2_base in raw) > 0 THEN
    RETURN raw;
  END IF;

  -- Not a Supabase Storage URL
  IF position('/storage/v1/object/' in raw) = 0 THEN
    RETURN raw;
  END IF;

  path := regexp_replace(
    raw,
    '^https?://[^/]+/storage/v1/object/(public|sign|authenticated)/',
    '',
    'i'
  );
  path := regexp_replace(path, '\?.*$', '');
  path := replace(path, 'ChampionshipLogos/', 'championship-logos/');
  -- URL-decode common space encoding left in path segments
  path := replace(path, '%20', ' ');
  path := trim(both '/' from path);

  RETURN r2_base || '/' || path;
END;
$$;

DO $$
DECLARE
  r2_base text := 'https://pub-f0a47a1e0660483ca04c343f23495c08.r2.dev';
BEGIN
  UPDATE public.images
  SET
    url = public._rtr_storage_url_to_r2(url, r2_base),
    storage_path = CASE
      WHEN storage_path LIKE 'ChampionshipLogos/%'
        THEN 'championship-logos/' || substring(storage_path from length('ChampionshipLogos/') + 1)
      ELSE storage_path
    END
  WHERE url ILIKE '%/storage/v1/object/%'
     OR storage_path LIKE 'ChampionshipLogos/%';

  UPDATE public.drivers
  SET image_url = public._rtr_storage_url_to_r2(image_url, r2_base)
  WHERE image_url ILIKE '%/storage/v1/object/%';

  UPDATE public.championship_standings
  SET car_logo_url = public._rtr_storage_url_to_r2(car_logo_url, r2_base)
  WHERE car_logo_url ILIKE '%/storage/v1/object/%';

  UPDATE public.scoreboard_live_grid
  SET car_logo_url = public._rtr_storage_url_to_r2(car_logo_url, r2_base)
  WHERE car_logo_url ILIKE '%/storage/v1/object/%';

  UPDATE public.team_achievements
  SET image_url = public._rtr_storage_url_to_r2(image_url, r2_base)
  WHERE image_url ILIKE '%/storage/v1/object/%';
END $$;

DROP FUNCTION public._rtr_storage_url_to_r2(text, text);

-- Optional hard cut (run manually after verifying R2 in production):
-- UPDATE storage.buckets SET public = false
--   WHERE id IN ('track-weather', 'track-images', 'ChampionshipLogos');
