-- =============================================
-- Scoreboard Live v2: Add CHECK Constraints
-- =============================================
--
-- Purpose: Add security limits to race_points_scale and scoreboard_live_config
-- to prevent unreasonable values.
--
-- Constraints:
--   - race_points_scale.points: <= 1000 (keeping >= 0)
--   - scoreboard_live_config.focus_car_number: <= 16 characters
--   - scoreboard_live_config.rival_car_numbers: <= 32 array elements
-- =============================================

-- =============================================
-- Alter: race_points_scale
-- =============================================

ALTER TABLE public.race_points_scale
  DROP CONSTRAINT IF EXISTS race_points_scale_points_check,
  ADD CONSTRAINT race_points_scale_points_check CHECK (points >= 0 AND points <= 1000);

-- =============================================
-- Alter: scoreboard_live_config
-- =============================================

ALTER TABLE public.scoreboard_live_config
  DROP CONSTRAINT IF EXISTS scoreboard_live_config_focus_car_number_check,
  ADD CONSTRAINT scoreboard_live_config_focus_car_number_check
    CHECK (focus_car_number IS NULL OR char_length(focus_car_number) <= 16),
  DROP CONSTRAINT IF EXISTS scoreboard_live_config_rival_car_numbers_check,
  ADD CONSTRAINT scoreboard_live_config_rival_car_numbers_check
    CHECK (cardinality(rival_car_numbers) <= 32);
