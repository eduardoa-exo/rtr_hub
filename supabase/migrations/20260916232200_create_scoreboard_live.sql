-- =============================================
-- Scoreboard Live Feature
-- =============================================
-- 
-- Purpose: Public page to display what-if championship scenarios for the last race.
-- Admins can enable/disable the feature and edit scenario lines.
--
-- Tables:
--   - scoreboard_live_config: Singleton config (enabled flag, title, intro text)
--   - scoreboard_live_lines: Individual scenario lines with conditions and results
--
-- RLS: Anonymous users see enabled content; admins see and edit everything.
-- =============================================

-- =============================================
-- Table: scoreboard_live_config (singleton)
-- =============================================

CREATE TABLE IF NOT EXISTS public.scoreboard_live_config (
  id INT PRIMARY KEY CHECK (id = 1),
  enabled BOOLEAN NOT NULL DEFAULT false,
  title TEXT NOT NULL DEFAULT 'Scoreboard Live' CHECK (char_length(title) <= 80),
  intro TEXT CHECK (intro IS NULL OR char_length(intro) <= 500),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Seed the singleton row
INSERT INTO public.scoreboard_live_config (id) VALUES (1)
ON CONFLICT (id) DO NOTHING;

-- =============================================
-- Table: scoreboard_live_lines
-- =============================================

CREATE TABLE IF NOT EXISTS public.scoreboard_live_lines (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  sort_order INT NOT NULL DEFAULT 0,
  condition_label TEXT NOT NULL CHECK (char_length(condition_label) BETWEEN 1 AND 200),
  result_label TEXT NOT NULL CHECK (char_length(result_label) BETWEEN 1 AND 80),
  result_variant TEXT NOT NULL DEFAULT 'neutral' CHECK (result_variant IN ('win', 'lose', 'neutral')),
  visible BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- =============================================
-- Trigger: Update updated_at on changes
-- =============================================

CREATE OR REPLACE FUNCTION public.update_scoreboard_live_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_scoreboard_live_config_updated_at
  BEFORE UPDATE ON public.scoreboard_live_config
  FOR EACH ROW
  EXECUTE FUNCTION public.update_scoreboard_live_updated_at();

CREATE TRIGGER update_scoreboard_live_lines_updated_at
  BEFORE UPDATE ON public.scoreboard_live_lines
  FOR EACH ROW
  EXECUTE FUNCTION public.update_scoreboard_live_updated_at();

-- =============================================
-- RLS: Enable row-level security
-- =============================================

ALTER TABLE public.scoreboard_live_config ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.scoreboard_live_lines ENABLE ROW LEVEL SECURITY;

-- =============================================
-- RLS Policies: scoreboard_live_config
-- =============================================

-- SELECT: Anonymous/authenticated see config if enabled=true OR user is admin
CREATE POLICY "Public can view enabled scoreboard config"
  ON public.scoreboard_live_config
  FOR SELECT
  TO anon, authenticated
  USING (enabled = true OR public.is_admin());

-- INSERT: Only admins can insert (though singleton should already exist)
CREATE POLICY "Only admins can insert scoreboard config"
  ON public.scoreboard_live_config
  FOR INSERT
  TO authenticated
  WITH CHECK (public.is_admin());

-- UPDATE: Only admins can update
CREATE POLICY "Only admins can update scoreboard config"
  ON public.scoreboard_live_config
  FOR UPDATE
  TO authenticated
  USING (public.is_admin())
  WITH CHECK (public.is_admin());

-- DELETE: Only admins can delete (though this shouldn't be used for singleton)
CREATE POLICY "Only admins can delete scoreboard config"
  ON public.scoreboard_live_config
  FOR DELETE
  TO authenticated
  USING (public.is_admin());

-- =============================================
-- RLS Policies: scoreboard_live_lines
-- =============================================

-- SELECT: Anonymous/authenticated see visible lines if feature is enabled OR user is admin
CREATE POLICY "Public can view visible scoreboard lines when enabled"
  ON public.scoreboard_live_lines
  FOR SELECT
  TO anon, authenticated
  USING (
    (visible = true AND EXISTS (
      SELECT 1 FROM public.scoreboard_live_config c 
      WHERE c.id = 1 AND c.enabled = true
    ))
    OR public.is_admin()
  );

-- INSERT: Only admins can insert
CREATE POLICY "Only admins can insert scoreboard lines"
  ON public.scoreboard_live_lines
  FOR INSERT
  TO authenticated
  WITH CHECK (public.is_admin());

-- UPDATE: Only admins can update
CREATE POLICY "Only admins can update scoreboard lines"
  ON public.scoreboard_live_lines
  FOR UPDATE
  TO authenticated
  USING (public.is_admin())
  WITH CHECK (public.is_admin());

-- DELETE: Only admins can delete
CREATE POLICY "Only admins can delete scoreboard lines"
  ON public.scoreboard_live_lines
  FOR DELETE
  TO authenticated
  USING (public.is_admin());

-- =============================================
-- Grants: Ensure anon/authenticated can query
-- =============================================

-- These grants allow the RLS policies to work properly
GRANT SELECT ON public.scoreboard_live_config TO anon, authenticated;
GRANT SELECT ON public.scoreboard_live_lines TO anon, authenticated;

-- Admin operations are controlled by RLS policies above
GRANT INSERT, UPDATE, DELETE ON public.scoreboard_live_config TO authenticated;
GRANT INSERT, UPDATE, DELETE ON public.scoreboard_live_lines TO authenticated;
