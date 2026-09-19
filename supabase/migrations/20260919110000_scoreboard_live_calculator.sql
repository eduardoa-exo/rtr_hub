-- =============================================
-- Scoreboard Live Calculator
-- =============================================
-- Adds participates + grid_version, admin RPCs for reorder/reset/participates.
-- Realtime signal is session.grid_version (clients never subscribe to grid rows).
-- Never mutates championship_standings.
-- =============================================

-- Session: version bump signal for cheap Realtime
ALTER TABLE public.scoreboard_live_session
  ADD COLUMN IF NOT EXISTS grid_version INT NOT NULL DEFAULT 0;

-- Grid: participation toggle (DNS/DNF → 0 race points)
ALTER TABLE public.scoreboard_live_grid
  ADD COLUMN IF NOT EXISTS participates BOOLEAN NOT NULL DEFAULT true;

-- =============================================
-- Helper: bump session grid_version once
-- =============================================
CREATE OR REPLACE FUNCTION public.bump_scoreboard_live_grid_version()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  UPDATE public.scoreboard_live_session
  SET grid_version = grid_version + 1,
      updated_at = now()
  WHERE id = 1;
END;
$$;

REVOKE ALL ON FUNCTION public.bump_scoreboard_live_grid_version() FROM PUBLIC, anon, authenticated;

-- =============================================
-- RPC: reorder_scoreboard_live_grid
-- =============================================
CREATE OR REPLACE FUNCTION public.reorder_scoreboard_live_grid(
  p_class text,
  p_ordered_car_numbers text[]
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_car text;
  v_idx int;
  v_count int;
BEGIN
  IF NOT public.is_admin() THEN
    RAISE EXCEPTION 'not authorized' USING ERRCODE = '42501';
  END IF;

  IF p_class IS NULL OR p_class NOT IN ('LMP2', 'GT3 PRO') THEN
    RAISE EXCEPTION 'invalid class';
  END IF;

  IF p_ordered_car_numbers IS NULL OR array_length(p_ordered_car_numbers, 1) IS NULL THEN
    RAISE EXCEPTION 'ordered car numbers required';
  END IF;

  SELECT COUNT(*) INTO v_count
  FROM public.scoreboard_live_grid
  WHERE class = p_class;

  IF v_count <> array_length(p_ordered_car_numbers, 1) THEN
    RAISE EXCEPTION 'ordered list length must match grid size';
  END IF;

  -- Ensure every car exists and no duplicates
  IF (
    SELECT COUNT(DISTINCT c) FROM unnest(p_ordered_car_numbers) AS c
  ) <> array_length(p_ordered_car_numbers, 1) THEN
    RAISE EXCEPTION 'duplicate car numbers in ordered list';
  END IF;

  IF EXISTS (
    SELECT 1
    FROM unnest(p_ordered_car_numbers) AS c(car_number)
    WHERE NOT EXISTS (
      SELECT 1 FROM public.scoreboard_live_grid g
      WHERE g.class = p_class AND g.car_number = c.car_number
    )
  ) THEN
    RAISE EXCEPTION 'unknown car number in ordered list';
  END IF;

  -- Two-phase rewrite to satisfy UNIQUE (class, sort_order)
  UPDATE public.scoreboard_live_grid
  SET sort_order = -sort_order
  WHERE class = p_class;

  v_idx := 0;
  FOREACH v_car IN ARRAY p_ordered_car_numbers
  LOOP
    v_idx := v_idx + 1;
    UPDATE public.scoreboard_live_grid
    SET sort_order = v_idx,
        updated_at = now()
    WHERE class = p_class AND car_number = v_car;
  END LOOP;

  PERFORM public.bump_scoreboard_live_grid_version();
END;
$$;

REVOKE ALL ON FUNCTION public.reorder_scoreboard_live_grid(text, text[]) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.reorder_scoreboard_live_grid(text, text[]) TO authenticated;

-- =============================================
-- RPC: reset_scoreboard_live_grid
-- =============================================
CREATE OR REPLACE FUNCTION public.reset_scoreboard_live_grid(p_class text)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NOT public.is_admin() THEN
    RAISE EXCEPTION 'not authorized' USING ERRCODE = '42501';
  END IF;

  IF p_class IS NULL OR p_class NOT IN ('LMP2', 'GT3 PRO') THEN
    RAISE EXCEPTION 'invalid class';
  END IF;

  -- Clear class grid (two-step unique-safe)
  DELETE FROM public.scoreboard_live_grid WHERE class = p_class;

  INSERT INTO public.scoreboard_live_grid (
    class, car_number, sort_order, team_name, country_code, car_logo_url, participates
  )
  SELECT
    cs.class,
    cs.car_number,
    ROW_NUMBER() OVER (ORDER BY cs.rank)::int AS sort_order,
    cs.team_name,
    cs.country_code,
    cs.car_logo_url,
    true
  FROM public.championship_standings cs
  WHERE cs.class = p_class
  ORDER BY cs.rank;

  PERFORM public.bump_scoreboard_live_grid_version();
END;
$$;

REVOKE ALL ON FUNCTION public.reset_scoreboard_live_grid(text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.reset_scoreboard_live_grid(text) TO authenticated;

-- =============================================
-- RPC: set_scoreboard_live_participates
-- =============================================
CREATE OR REPLACE FUNCTION public.set_scoreboard_live_participates(
  p_id uuid,
  p_participates boolean
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_updated int;
BEGIN
  IF NOT public.is_admin() THEN
    RAISE EXCEPTION 'not authorized' USING ERRCODE = '42501';
  END IF;

  IF p_id IS NULL OR p_participates IS NULL THEN
    RAISE EXCEPTION 'id and participates required';
  END IF;

  UPDATE public.scoreboard_live_grid
  SET participates = p_participates,
      updated_at = now()
  WHERE id = p_id;

  GET DIAGNOSTICS v_updated = ROW_COUNT;
  IF v_updated = 0 THEN
    RAISE EXCEPTION 'grid row not found';
  END IF;

  PERFORM public.bump_scoreboard_live_grid_version();
END;
$$;

REVOKE ALL ON FUNCTION public.set_scoreboard_live_participates(uuid, boolean) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.set_scoreboard_live_participates(uuid, boolean) TO authenticated;

-- =============================================
-- Harden grants: anon must have zero write/execute
-- =============================================
REVOKE INSERT, UPDATE, DELETE ON public.scoreboard_live_session FROM anon;
REVOKE INSERT, UPDATE, DELETE ON public.scoreboard_live_grid FROM anon;
-- authenticated writes remain RLS-gated by is_admin()
