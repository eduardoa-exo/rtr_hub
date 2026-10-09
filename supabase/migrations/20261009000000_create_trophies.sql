-- Create trophies table (Vitrine de Troféus)
CREATE TABLE IF NOT EXISTS public.trophies (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  title TEXT NOT NULL,
  description TEXT,
  competition TEXT,
  position TEXT NOT NULL,
  date DATE,
  image_url TEXT,
  race_id UUID REFERENCES public.races(id) ON DELETE SET NULL,
  order_index INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.trophies ENABLE ROW LEVEL SECURITY;

-- Public read
CREATE POLICY "Anyone can view trophies"
  ON public.trophies FOR SELECT
  USING (true);

-- Admin-only write policies
CREATE POLICY "Only admins can insert trophies"
  ON public.trophies FOR INSERT
  TO authenticated
  WITH CHECK (public.is_admin());

CREATE POLICY "Only admins can update trophies"
  ON public.trophies FOR UPDATE
  TO authenticated
  USING (public.is_admin());

CREATE POLICY "Only admins can delete trophies"
  ON public.trophies FOR DELETE
  TO authenticated
  USING (public.is_admin());
