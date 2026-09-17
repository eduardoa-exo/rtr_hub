-- =============================================
-- Scoreboard Live Grid: Additional CHECK Constraints
-- =============================================
-- 
-- Purpose: Add validation constraints to scoreboard_live_grid
-- This is an additive migration following 20260917000003_scoreboard_live_grid.sql
--
-- Changes:
--   1. Ensure sort_order is always >= 1 (positions start at 1)
--   2. Limit car_logo_url length to 500 characters
-- =============================================

-- Add constraint: sort_order must be >= 1
ALTER TABLE public.scoreboard_live_grid
  DROP CONSTRAINT IF EXISTS chk_live_grid_sort_order_min;

ALTER TABLE public.scoreboard_live_grid
  ADD CONSTRAINT chk_live_grid_sort_order_min 
  CHECK (sort_order >= 1);

-- Add constraint: car_logo_url must be NULL or <= 500 characters
ALTER TABLE public.scoreboard_live_grid
  DROP CONSTRAINT IF EXISTS chk_live_grid_car_logo_url_length;

ALTER TABLE public.scoreboard_live_grid
  ADD CONSTRAINT chk_live_grid_car_logo_url_length 
  CHECK (car_logo_url IS NULL OR char_length(car_logo_url) <= 500);
