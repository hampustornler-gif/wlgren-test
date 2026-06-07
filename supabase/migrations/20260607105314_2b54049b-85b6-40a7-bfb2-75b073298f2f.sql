
REVOKE EXECUTE ON FUNCTION public.is_program_trainer(uuid, uuid) FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.is_trainer_of_client(uuid, uuid) FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.client_has_program(uuid, uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.is_program_trainer(uuid, uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.is_trainer_of_client(uuid, uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.client_has_program(uuid, uuid) TO authenticated;
