
-- 1) Allow trainers to release (set trainer_id = null on) their own clients
CREATE POLICY "trainer releases own client"
ON public.profiles
FOR UPDATE
TO authenticated
USING (trainer_id = auth.uid())
WITH CHECK (trainer_id IS NULL);

-- 2) Client invites table
CREATE TABLE public.client_invites (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  trainer_id uuid NOT NULL,
  email text,
  name text,
  token text NOT NULL UNIQUE,
  expires_at timestamptz NOT NULL DEFAULT (now() + interval '14 days'),
  accepted_at timestamptz,
  accepted_by uuid,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX client_invites_trainer_idx ON public.client_invites(trainer_id);
CREATE INDEX client_invites_token_idx ON public.client_invites(token);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.client_invites TO authenticated;
GRANT ALL ON public.client_invites TO service_role;

ALTER TABLE public.client_invites ENABLE ROW LEVEL SECURITY;

-- Trainer manages own invites
CREATE POLICY "trainer manages own invites"
ON public.client_invites
FOR ALL
TO authenticated
USING (trainer_id = auth.uid())
WITH CHECK (trainer_id = auth.uid());

-- Admin reads all invites
CREATE POLICY "admin reads all invites"
ON public.client_invites
FOR SELECT
TO authenticated
USING (public.has_role(auth.uid(), 'admin'::public.app_role));
