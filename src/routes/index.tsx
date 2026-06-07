import { createFileRoute, redirect } from "@tanstack/react-router";
import { supabase } from "@/integrations/supabase/client";

export const Route = createFileRoute("/")({
  ssr: false,
  beforeLoad: async () => {
    const { data } = await supabase.auth.getUser();
    if (!data.user) throw redirect({ to: "/auth" });
    const { data: roles } = await supabase
      .from("user_roles")
      .select("role")
      .eq("user_id", data.user.id);
    const list = roles?.map((r) => r.role) ?? [];
    if (list.includes("admin")) throw redirect({ to: "/admin" });
    if (list.includes("trainer")) throw redirect({ to: "/trainer" });
    throw redirect({ to: "/app" });
  },
  component: () => null,
});
