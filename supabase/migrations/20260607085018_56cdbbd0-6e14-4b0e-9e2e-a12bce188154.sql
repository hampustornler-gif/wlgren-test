-- Prevent clients from changing trainer_id via "update own profile"
DROP POLICY IF EXISTS "update own profile" ON public.profiles;

CREATE POLICY "update own profile"
ON public.profiles
FOR UPDATE
TO authenticated
USING (auth.uid() = id)
WITH CHECK (
  auth.uid() = id
  AND trainer_id IS NOT DISTINCT FROM (SELECT trainer_id FROM public.profiles WHERE id = auth.uid())
);