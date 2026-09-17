-- =============================================
-- Scoreboard Live LIVE MODE
-- =============================================
-- 
-- Purpose: Live race grid display (separate from v2 scenario calculations).
-- Admins can drag/reorder the live grid to simulate finishing positions.
-- Public gets read-only access when the session is enabled.
--
-- Key Design:
--   - This is SEPARATE from the existing scoreboard_live_config/lines (v2 scenarios).
--   - Points are computed on the frontend from race_points_scale using sort_order as finishing position.
--   - championship_standings remains untouched (source of truth).
--
-- Tables:
--   - scoreboard_live_session: Singleton config (enabled flag, which class(es) to display)
--   - scoreboard_live_grid: Live grid rows with car info and sort_order (1 = P1)
--
-- RLS: Public sees grid only when session.enabled=true; admins see/edit everything.
-- =============================================

-- =============================================
-- Table: scoreboard_live_session (singleton)
-- =============================================

CREATE TABLE IF NOT EXISTS public.scoreboard_live_session (
  id INT PRIMARY KEY CHECK (id = 1),
  enabled BOOLEAN NOT NULL DEFAULT false,
  championship_class TEXT NOT NULL DEFAULT 'BOTH' CHECK (championship_class IN ('LMP2', 'GT3 PRO', 'BOTH')),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Seed the singleton row
INSERT INTO public.scoreboard_live_session (id) VALUES (1)
ON CONFLICT (id) DO NOTHING;

-- =============================================
-- Table: scoreboard_live_grid
-- =============================================

CREATE TABLE IF NOT EXISTS public.scoreboard_live_grid (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  class TEXT NOT NULL CHECK (class IN ('LMP2', 'GT3 PRO')),
  car_number TEXT NOT NULL CHECK (char_length(car_number) BETWEEN 1 AND 16),
  sort_order INT NOT NULL,
  team_name TEXT CHECK (team_name IS NULL OR char_length(team_name) <= 80),
  country_code TEXT CHECK (country_code IS NULL OR char_length(country_code) <= 4),
  car_logo_url TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  
  -- Constraints: Each class has unique car numbers and unique positions
  CONSTRAINT uq_live_grid_class_car UNIQUE (class, car_number),
  CONSTRAINT uq_live_grid_class_order UNIQUE (class, sort_order)
);

-- Create indexes for better query performance
CREATE INDEX IF NOT EXISTS idx_live_grid_class ON public.scoreboard_live_grid(class);
CREATE INDEX IF NOT EXISTS idx_live_grid_class_order ON public.scoreboard_live_grid(class, sort_order);

-- =============================================
-- Seed: Populate grid from championship_standings
-- =============================================

-- For LMP2 class
INSERT INTO public.scoreboard_live_grid (class, car_number, sort_order, team_name, country_code, car_logo_url)
SELECT 
  cs.class,
  cs.car_number,
  ROW_NUMBER() OVER (ORDER BY cs.rank) as sort_order,
  cs.team_name,
  cs.country_code,
  cs.car_logo_url
FROM public.championship_standings cs
WHERE cs.class = 'LMP2'
ORDER BY cs.rank;

-- For GT3 PRO class
INSERT INTO public.scoreboard_live_grid (class, car_number, sort_order, team_name, country_code, car_logo_url)
SELECT 
  cs.class,
  cs.car_number,
  ROW_NUMBER() OVER (ORDER BY cs.rank) as sort_order,
  cs.team_name,
  cs.country_code,
  cs.car_logo_url
FROM public.championship_standings cs
WHERE cs.class = 'GT3 PRO'
ORDER BY cs.rank;

-- =============================================
-- Triggers: Update updated_at on changes
-- =============================================

-- Reuse the existing trigger function from scoreboard_live
CREATE TRIGGER update_scoreboard_live_session_updated_at
  BEFORE UPDATE ON public.scoreboard_live_session
  FOR EACH ROW
  EXECUTE FUNCTION public.update_scoreboard_live_updated_at();

CREATE TRIGGER update_scoreboard_live_grid_updated_at
  BEFORE UPDATE ON public.scoreboard_live_grid
  FOR EACH ROW
  EXECUTE FUNCTION public.update_scoreboard_live_updated_at();

-- =============================================
-- RLS: Enable row-level security
-- =============================================

ALTER TABLE public.scoreboard_live_session ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.scoreboard_live_grid ENABLE ROW LEVEL SECURITY;

-- =============================================
-- RLS Policies: scoreboard_live_session
-- =============================================

-- SELECT: Anonymous/authenticated see session if enabled=true OR user is admin
CREATE POLICY "Public can view enabled live session"
  ON public.scoreboard_live_session
  FOR SELECT
  TO anon, authenticated
  USING (enabled = true OR public.is_admin());

-- INSERT: Only admins can insert (though singleton should already exist)
CREATE POLICY "Only admins can insert live session"
  ON public.scoreboard_live_session
  FOR INSERT
  TO authenticated
  WITH CHECK (public.is_admin());

-- UPDATE: Only admins can update
CREATE POLICY "Only admins can update live session"
  ON public.scoreboard_live_session
  FOR UPDATE
  TO authenticated
  USING (public.is_admin())
  WITH CHECK (public.is_admin());

-- DELETE: Only admins can delete (though this shouldn't be used for singleton)
CREATE POLICY "Only admins can delete live session"
  ON public.scoreboard_live_session
  FOR DELETE
  TO authenticated
  USING (public.is_admin());

-- =============================================
-- RLS Policies: scoreboard_live_grid
-- =============================================

-- SELECT: Anonymous/authenticated see grid if session is enabled OR user is admin
CREATE POLICY "Public can view live grid when enabled"
  ON public.scoreboard_live_grid
  FOR SELECT
  TO anon, authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.scoreboard_live_session s 
      WHERE s.id = 1 AND s.enabled = true
    )
    OR public.is_admin()
  );

-- INSERT: Only admins can insert
CREATE POLICY "Only admins can insert live grid rows"
  ON public.scoreboard_live_grid
  FOR INSERT
  TO authenticated
  WITH CHECK (public.is_admin());

-- UPDATE: Only admins can update
CREATE POLICY "Only admins can update live grid rows"
  ON public.scoreboard_live_grid
  FOR UPDATE
  TO authenticated
  USING (public.is_admin())
  WITH CHECK (public.is_admin());

-- DELETE: Only admins can delete
CREATE POLICY "Only admins can delete live grid rows"
  ON public.scoreboard_live_grid
  FOR DELETE
  TO authenticated
  USING (public.is_admin());

-- =============================================
-- Grants: Ensure anon/authenticated can query
-- =============================================

-- These grants allow the RLS policies to work properly
GRANT SELECT ON public.scoreboard_live_session TO anon, authenticated;
GRANT SELECT ON public.scoreboard_live_grid TO anon, authenticated;

-- Admin operations are controlled by RLS policies above
GRANT INSERT, UPDATE, DELETE ON public.scoreboard_live_session TO authenticated;
GRANT INSERT, UPDATE, DELETE ON public.scoreboard_live_grid TO authenticated;
