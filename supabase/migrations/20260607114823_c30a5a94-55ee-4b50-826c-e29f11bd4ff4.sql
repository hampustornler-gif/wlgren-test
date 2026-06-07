CREATE TABLE public.global_exercises (
  id text PRIMARY KEY,
  name text NOT NULL,
  force text,
  level text,
  mechanic text,
  equipment text,
  category text,
  primary_muscle text,
  secondary_muscles text[] DEFAULT '{}',
  instructions text,
  image_url text,
  image_url_2 text,
  created_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT ON public.global_exercises TO authenticated, anon;
GRANT ALL ON public.global_exercises TO service_role;

ALTER TABLE public.global_exercises ENABLE ROW LEVEL SECURITY;

CREATE POLICY "anyone reads global exercises"
ON public.global_exercises FOR SELECT
TO authenticated, anon
USING (true);

CREATE INDEX idx_global_exercises_primary_muscle ON public.global_exercises (primary_muscle);
CREATE INDEX idx_global_exercises_level ON public.global_exercises (level);
CREATE INDEX idx_global_exercises_name ON public.global_exercises (name);