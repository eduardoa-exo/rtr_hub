-- =============================================
-- Security Fix: Championship Standings Admin-Only Writes
-- =============================================
--
-- Purpose: Ensure championship_standings table write operations are strictly admin-only.
-- Scoreboard Live v2 reads this table publicly for championship scenarios,
-- so writes MUST be admin-only via public.is_admin().
--
-- Issue: The existing UPDATE policy (from 20260213165239_add_admin_whitelist.sql)
-- only has USING clause but is missing WITH CHECK clause.
--
-- Fix: Drop and recreate UPDATE policy with both USING and WITH CHECK.
-- =============================================

-- =============================================
-- Championship Standings: Fix UPDATE Policy
-- =============================================

-- Drop the existing UPDATE policy that's missing WITH CHECK
DROP POLICY IF EXISTS "Only admins can update championship standings" ON public.championship_standings;

-- Recreate UPDATE policy with both USING and WITH CHECK
-- USING: determines which existing rows can be selected for update
-- WITH CHECK: ensures the updated row still satisfies the policy
CREATE POLICY "Only admins can update championship standings" 
  ON public.championship_standings 
  FOR UPDATE 
  TO authenticated 
  USING (public.is_admin())
  WITH CHECK (public.is_admin());

-- =============================================
-- Verification Comments
-- =============================================

-- Expected policies on championship_standings after this migration:
--   SELECT: "Public read access to championship standings" - USING (true) - ✓ Public read for Scoreboard Live
--   INSERT: "Only admins can insert championship standings" - WITH CHECK (public.is_admin()) - ✓ Admin-only
--   UPDATE: "Only admins can update championship standings" - USING + WITH CHECK (public.is_admin()) - ✓ Admin-only (fixed)
--   DELETE: "Only admins can delete championship standings" - USING (public.is_admin()) - ✓ Admin-only
