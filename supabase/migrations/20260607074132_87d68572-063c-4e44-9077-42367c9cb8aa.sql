
-- Fix 1: trainers only read their own clients
DROP POLICY IF EXISTS "trainer reads client profiles" ON public.profiles;
CREATE POLICY "trainer reads client profiles"
ON public.profiles FOR SELECT TO authenticated
USING (trainer_id = auth.uid());

-- Fix 2: trainer can only assign programs to their own clients
DROP POLICY IF EXISTS "trainer manages own assignments" ON public.program_assignments;
CREATE POLICY "trainer manages own assignments"
ON public.program_assignments FOR ALL TO authenticated
USING (
  EXISTS (SELECT 1 FROM public.programs p WHERE p.id = program_assignments.program_id AND p.trainer_id = auth.uid())
  AND EXISTS (SELECT 1 FROM public.profiles pr WHERE pr.id = program_assignments.client_id AND pr.trainer_id = auth.uid())
)
WITH CHECK (
  EXISTS (SELECT 1 FROM public.programs p WHERE p.id = program_assignments.program_id AND p.trainer_id = auth.uid())
  AND EXISTS (SELECT 1 FROM public.profiles pr WHERE pr.id = program_assignments.client_id AND pr.trainer_id = auth.uid())
);

-- Fix 3: remove user-callable SECURITY DEFINER function.
-- First admin is already assigned automatically by handle_new_user trigger;
-- subsequent admin promotion goes through admin-only RLS on user_roles.
DROP FUNCTION IF EXISTS public.claim_first_admin();
