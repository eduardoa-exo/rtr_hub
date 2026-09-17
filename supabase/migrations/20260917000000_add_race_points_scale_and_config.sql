-- =============================================
-- Scoreboard Live v2: Race Points Scale + Config
-- =============================================
--
-- Purpose: Add race points scale table for championship calculations
-- and extend scoreboard_live_config with class/focus/rival settings.
--
-- Tables:
--   - race_points_scale: Points awarded per position for each class
--   - scoreboard_live_config: Extended with championship_class, focus_car_number, rival_car_numbers
--
-- RLS: Public read for points scale (FE calc); admin-only writes
-- =============================================

-- =============================================
-- Table: race_points_scale
-- =============================================

CREATE TABLE IF NOT EXISTS public.race_points_scale (
  class TEXT NOT NULL CHECK (class IN ('LMP2', 'GT3 PRO')),
  position INT NOT NULL CHECK (position >= 1 AND position <= 30),
  points INT NOT NULL CHECK (points >= 0 AND points <= 1000),
  PRIMARY KEY (class, position)
);

-- Seed LMP2 points scale
-- Note: Positions > 30 should use the position=30 value (10 points)
INSERT INTO public.race_points_scale (class, position, points) VALUES
  ('LMP2', 1, 350),
  ('LMP2', 2, 320),
  ('LMP2', 3, 300),
  ('LMP2', 4, 280),
  ('LMP2', 5, 260),
  ('LMP2', 6, 250),
  ('LMP2', 7, 240),
  ('LMP2', 8, 230),
  ('LMP2', 9, 220),
  ('LMP2', 10, 210),
  ('LMP2', 11, 200),
  ('LMP2', 12, 190),
  ('LMP2', 13, 180),
  ('LMP2', 14, 170),
  ('LMP2', 15, 160),
  ('LMP2', 16, 150),
  ('LMP2', 17, 140),
  ('LMP2', 18, 130),
  ('LMP2', 19, 120),
  ('LMP2', 20, 110),
  ('LMP2', 21, 100),
  ('LMP2', 22, 90),
  ('LMP2', 23, 80),
  ('LMP2', 24, 70),
  ('LMP2', 25, 60),
  ('LMP2', 26, 50),
  ('LMP2', 27, 40),
  ('LMP2', 28, 30),
  ('LMP2', 29, 20),
  ('LMP2', 30, 10);

-- Seed GT3 PRO points scale (same grid as LMP2)
-- Note: Positions > 30 should use the position=30 value (10 points)
INSERT INTO public.race_points_scale (class, position, points) VALUES
  ('GT3 PRO', 1, 350),
  ('GT3 PRO', 2, 320),
  ('GT3 PRO', 3, 300),
  ('GT3 PRO', 4, 280),
  ('GT3 PRO', 5, 260),
  ('GT3 PRO', 6, 250),
  ('GT3 PRO', 7, 240),
  ('GT3 PRO', 8, 230),
  ('GT3 PRO', 9, 220),
  ('GT3 PRO', 10, 210),
  ('GT3 PRO', 11, 200),
  ('GT3 PRO', 12, 190),
  ('GT3 PRO', 13, 180),
  ('GT3 PRO', 14, 170),
  ('GT3 PRO', 15, 160),
  ('GT3 PRO', 16, 150),
  ('GT3 PRO', 17, 140),
  ('GT3 PRO', 18, 130),
  ('GT3 PRO', 19, 120),
  ('GT3 PRO', 20, 110),
  ('GT3 PRO', 21, 100),
  ('GT3 PRO', 22, 90),
  ('GT3 PRO', 23, 80),
  ('GT3 PRO', 24, 70),
  ('GT3 PRO', 25, 60),
  ('GT3 PRO', 26, 50),
  ('GT3 PRO', 27, 40),
  ('GT3 PRO', 28, 30),
  ('GT3 PRO', 29, 20),
  ('GT3 PRO', 30, 10);

-- =============================================
-- Alter: scoreboard_live_config
-- =============================================

ALTER TABLE public.scoreboard_live_config
  ADD COLUMN championship_class TEXT NOT NULL DEFAULT 'BOTH' CHECK (championship_class IN ('LMP2', 'GT3 PRO', 'BOTH')),
  ADD COLUMN focus_car_number TEXT CHECK (focus_car_number IS NULL OR char_length(focus_car_number) <= 16),
  ADD COLUMN rival_car_numbers TEXT[] NOT NULL DEFAULT '{}' CHECK (cardinality(rival_car_numbers) <= 32);

-- =============================================
-- RLS: Enable row-level security on race_points_scale
-- =============================================

ALTER TABLE public.race_points_scale ENABLE ROW LEVEL SECURITY;

-- =============================================
-- RLS Policies: race_points_scale
-- =============================================

-- SELECT: Public read access (anon + authenticated)
CREATE POLICY "Public can view race points scale"
  ON public.race_points_scale
  FOR SELECT
  TO anon, authenticated
  USING (true);

-- INSERT: Only admins can insert
CREATE POLICY "Only admins can insert race points scale"
  ON public.race_points_scale
  FOR INSERT
  TO authenticated
  WITH CHECK (public.is_admin());

-- UPDATE: Only admins can update
CREATE POLICY "Only admins can update race points scale"
  ON public.race_points_scale
  FOR UPDATE
  TO authenticated
  USING (public.is_admin())
  WITH CHECK (public.is_admin());

-- DELETE: Only admins can delete
CREATE POLICY "Only admins can delete race points scale"
  ON public.race_points_scale
  FOR DELETE
  TO authenticated
  USING (public.is_admin());

-- =============================================
-- Grants: Ensure anon/authenticated can query
-- =============================================

GRANT SELECT ON public.race_points_scale TO anon, authenticated;
GRANT INSERT, UPDATE, DELETE ON public.race_points_scale TO authenticated;
