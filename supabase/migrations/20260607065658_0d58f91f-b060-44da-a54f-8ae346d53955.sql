
CREATE TYPE public.app_role AS ENUM ('trainer', 'client');

-- TABLES --
CREATE TABLE public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  display_name TEXT NOT NULL DEFAULT '',
  trainer_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.profiles TO authenticated;
GRANT ALL ON public.profiles TO service_role;
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

CREATE TABLE public.user_roles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role public.app_role NOT NULL,
  UNIQUE (user_id, role)
);
GRANT SELECT ON public.user_roles TO authenticated;
GRANT ALL ON public.user_roles TO service_role;
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;

CREATE OR REPLACE FUNCTION public.has_role(_user_id UUID, _role public.app_role)
RETURNS BOOLEAN LANGUAGE SQL STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = _user_id AND role = _role)
$$;

CREATE TABLE public.exercises (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  trainer_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  notes TEXT DEFAULT '',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.exercises TO authenticated;
GRANT ALL ON public.exercises TO service_role;
ALTER TABLE public.exercises ENABLE ROW LEVEL SECURITY;

CREATE TABLE public.programs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  trainer_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  description TEXT DEFAULT '',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.programs TO authenticated;
GRANT ALL ON public.programs TO service_role;
ALTER TABLE public.programs ENABLE ROW LEVEL SECURITY;

CREATE TABLE public.program_exercises (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  program_id UUID NOT NULL REFERENCES public.programs(id) ON DELETE CASCADE,
  exercise_id UUID NOT NULL REFERENCES public.exercises(id) ON DELETE CASCADE,
  order_index INT NOT NULL DEFAULT 0,
  target_sets INT NOT NULL DEFAULT 3,
  target_reps INT NOT NULL DEFAULT 10,
  rest_seconds INT NOT NULL DEFAULT 90,
  note TEXT DEFAULT ''
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.program_exercises TO authenticated;
GRANT ALL ON public.program_exercises TO service_role;
ALTER TABLE public.program_exercises ENABLE ROW LEVEL SECURITY;

CREATE TABLE public.program_assignments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  program_id UUID NOT NULL REFERENCES public.programs(id) ON DELETE CASCADE,
  client_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  assigned_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (program_id, client_id)
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.program_assignments TO authenticated;
GRANT ALL ON public.program_assignments TO service_role;
ALTER TABLE public.program_assignments ENABLE ROW LEVEL SECURITY;

CREATE TABLE public.workout_sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  program_id UUID REFERENCES public.programs(id) ON DELETE SET NULL,
  started_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  completed_at TIMESTAMPTZ,
  notes TEXT DEFAULT ''
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.workout_sessions TO authenticated;
GRANT ALL ON public.workout_sessions TO service_role;
ALTER TABLE public.workout_sessions ENABLE ROW LEVEL SECURITY;

CREATE TABLE public.set_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id UUID NOT NULL REFERENCES public.workout_sessions(id) ON DELETE CASCADE,
  exercise_id UUID NOT NULL REFERENCES public.exercises(id) ON DELETE CASCADE,
  set_index INT NOT NULL DEFAULT 1,
  weight_kg NUMERIC(6,2) NOT NULL DEFAULT 0,
  reps INT NOT NULL DEFAULT 0,
  rpe NUMERIC(3,1),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.set_logs TO authenticated;
GRANT ALL ON public.set_logs TO service_role;
ALTER TABLE public.set_logs ENABLE ROW LEVEL SECURITY;

CREATE TABLE public.body_measurements (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  measured_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  weight_kg NUMERIC(5,2),
  waist_cm NUMERIC(5,2),
  chest_cm NUMERIC(5,2),
  arm_cm NUMERIC(5,2),
  thigh_cm NUMERIC(5,2),
  photo_url TEXT
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.body_measurements TO authenticated;
GRANT ALL ON public.body_measurements TO service_role;
ALTER TABLE public.body_measurements ENABLE ROW LEVEL SECURITY;

-- POLICIES --
CREATE POLICY "users read own roles" ON public.user_roles
  FOR SELECT TO authenticated USING (auth.uid() = user_id);

CREATE POLICY "read own profile" ON public.profiles
  FOR SELECT TO authenticated USING (auth.uid() = id);
CREATE POLICY "trainer reads client profiles" ON public.profiles
  FOR SELECT TO authenticated USING (trainer_id = auth.uid() OR public.has_role(auth.uid(), 'trainer'));
CREATE POLICY "update own profile" ON public.profiles
  FOR UPDATE TO authenticated USING (auth.uid() = id) WITH CHECK (auth.uid() = id);
CREATE POLICY "trainer updates client profile" ON public.profiles
  FOR UPDATE TO authenticated
  USING (public.has_role(auth.uid(), 'trainer'))
  WITH CHECK (public.has_role(auth.uid(), 'trainer'));
CREATE POLICY "insert own profile" ON public.profiles
  FOR INSERT TO authenticated WITH CHECK (auth.uid() = id);

CREATE POLICY "trainer manages own exercises" ON public.exercises
  FOR ALL TO authenticated
  USING (trainer_id = auth.uid()) WITH CHECK (trainer_id = auth.uid());
CREATE POLICY "client reads trainer exercises" ON public.exercises
  FOR SELECT TO authenticated
  USING (EXISTS (SELECT 1 FROM public.profiles p WHERE p.id = auth.uid() AND p.trainer_id = exercises.trainer_id));

CREATE POLICY "trainer manages own programs" ON public.programs
  FOR ALL TO authenticated
  USING (trainer_id = auth.uid()) WITH CHECK (trainer_id = auth.uid());
CREATE POLICY "client reads assigned programs" ON public.programs
  FOR SELECT TO authenticated
  USING (EXISTS (SELECT 1 FROM public.program_assignments pa WHERE pa.program_id = programs.id AND pa.client_id = auth.uid()));

CREATE POLICY "trainer manages own program_exercises" ON public.program_exercises
  FOR ALL TO authenticated
  USING (EXISTS (SELECT 1 FROM public.programs p WHERE p.id = program_exercises.program_id AND p.trainer_id = auth.uid()))
  WITH CHECK (EXISTS (SELECT 1 FROM public.programs p WHERE p.id = program_exercises.program_id AND p.trainer_id = auth.uid()));
CREATE POLICY "client reads assigned program_exercises" ON public.program_exercises
  FOR SELECT TO authenticated
  USING (EXISTS (SELECT 1 FROM public.program_assignments pa WHERE pa.program_id = program_exercises.program_id AND pa.client_id = auth.uid()));

CREATE POLICY "trainer manages own assignments" ON public.program_assignments
  FOR ALL TO authenticated
  USING (EXISTS (SELECT 1 FROM public.programs p WHERE p.id = program_assignments.program_id AND p.trainer_id = auth.uid()))
  WITH CHECK (EXISTS (SELECT 1 FROM public.programs p WHERE p.id = program_assignments.program_id AND p.trainer_id = auth.uid()));
CREATE POLICY "client reads own assignments" ON public.program_assignments
  FOR SELECT TO authenticated USING (client_id = auth.uid());

CREATE POLICY "client manages own sessions" ON public.workout_sessions
  FOR ALL TO authenticated
  USING (client_id = auth.uid()) WITH CHECK (client_id = auth.uid());
CREATE POLICY "trainer reads client sessions" ON public.workout_sessions
  FOR SELECT TO authenticated
  USING (EXISTS (SELECT 1 FROM public.profiles p WHERE p.id = workout_sessions.client_id AND p.trainer_id = auth.uid()));

CREATE POLICY "client manages own set_logs" ON public.set_logs
  FOR ALL TO authenticated
  USING (EXISTS (SELECT 1 FROM public.workout_sessions s WHERE s.id = set_logs.session_id AND s.client_id = auth.uid()))
  WITH CHECK (EXISTS (SELECT 1 FROM public.workout_sessions s WHERE s.id = set_logs.session_id AND s.client_id = auth.uid()));
CREATE POLICY "trainer reads client set_logs" ON public.set_logs
  FOR SELECT TO authenticated
  USING (EXISTS (
    SELECT 1 FROM public.workout_sessions s
    JOIN public.profiles p ON p.id = s.client_id
    WHERE s.id = set_logs.session_id AND p.trainer_id = auth.uid()
  ));

CREATE POLICY "client manages own measurements" ON public.body_measurements
  FOR ALL TO authenticated
  USING (client_id = auth.uid()) WITH CHECK (client_id = auth.uid());
CREATE POLICY "trainer reads client measurements" ON public.body_measurements
  FOR SELECT TO authenticated
  USING (EXISTS (SELECT 1 FROM public.profiles p WHERE p.id = body_measurements.client_id AND p.trainer_id = auth.uid()));

-- AUTO-CREATE PROFILE + ROLE ON SIGNUP --
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  is_first BOOLEAN;
  assigned_role public.app_role;
BEGIN
  SELECT NOT EXISTS (SELECT 1 FROM public.user_roles) INTO is_first;
  assigned_role := CASE WHEN is_first THEN 'trainer'::public.app_role ELSE 'client'::public.app_role END;

  INSERT INTO public.profiles (id, display_name)
  VALUES (NEW.id, COALESCE(NEW.raw_user_meta_data->>'display_name', split_part(NEW.email, '@', 1)));

  INSERT INTO public.user_roles (user_id, role) VALUES (NEW.id, assigned_role);
  RETURN NEW;
END;
$$;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();
