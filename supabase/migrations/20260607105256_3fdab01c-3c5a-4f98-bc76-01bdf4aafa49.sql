
-- Helper functions (SECURITY DEFINER bypasses RLS, breaking the recursion)
CREATE OR REPLACE FUNCTION public.is_program_trainer(_program_id uuid, _user_id uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (SELECT 1 FROM public.programs WHERE id = _program_id AND trainer_id = _user_id)
$$;

CREATE OR REPLACE FUNCTION public.is_trainer_of_client(_client_id uuid, _user_id uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (SELECT 1 FROM public.profiles WHERE id = _client_id AND trainer_id = _user_id)
$$;

CREATE OR REPLACE FUNCTION public.client_has_program(_program_id uuid, _user_id uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (SELECT 1 FROM public.program_assignments WHERE program_id = _program_id AND client_id = _user_id)
$$;

-- programs: replace recursive SELECT policy
DROP POLICY IF EXISTS "client reads assigned programs" ON public.programs;
CREATE POLICY "client reads assigned programs" ON public.programs
FOR SELECT TO authenticated
USING (public.client_has_program(id, auth.uid()));

-- program_exercises: replace recursive SELECT policy
DROP POLICY IF EXISTS "client reads assigned program_exercises" ON public.program_exercises;
CREATE POLICY "client reads assigned program_exercises" ON public.program_exercises
FOR SELECT TO authenticated
USING (public.client_has_program(program_id, auth.uid()));

-- program_exercises: trainer policy refs programs (not recursive but tidy via helper)
DROP POLICY IF EXISTS "trainer manages own program_exercises" ON public.program_exercises;
CREATE POLICY "trainer manages own program_exercises" ON public.program_exercises
FOR ALL TO authenticated
USING (public.is_program_trainer(program_id, auth.uid()))
WITH CHECK (public.is_program_trainer(program_id, auth.uid()));

-- program_assignments: rewrite trainer ALL policy via helpers
DROP POLICY IF EXISTS "trainer manages own assignments" ON public.program_assignments;
CREATE POLICY "trainer manages own assignments" ON public.program_assignments
FOR ALL TO authenticated
USING (public.is_program_trainer(program_id, auth.uid()) AND public.is_trainer_of_client(client_id, auth.uid()))
WITH CHECK (public.is_program_trainer(program_id, auth.uid()) AND public.is_trainer_of_client(client_id, auth.uid()));
