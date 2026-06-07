
DROP POLICY IF EXISTS "trainer updates client profile" ON public.profiles;

CREATE POLICY "trainer updates own client profile" ON public.profiles
  FOR UPDATE TO authenticated
  USING (trainer_id = auth.uid())
  WITH CHECK (trainer_id = auth.uid());
