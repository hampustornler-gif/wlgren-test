import { Link, useRouter } from "@tanstack/react-router";
import { ReactNode, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Dumbbell, LineChart, Users, ListChecks, User2, LogOut, Ruler, Shield, RefreshCw } from "lucide-react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { getMe } from "@/lib/app.functions";
import { toast } from "sonner";

export function AppShell({ children, title }: { children: ReactNode; title?: string }) {
  const router = useRouter();
  const qc = useQueryClient();
  const fetchMe = useServerFn(getMe);
  const { data: me } = useQuery({
    queryKey: ["me"],
    queryFn: () => fetchMe(),
    refetchOnWindowFocus: true,
  });
  const [refreshing, setRefreshing] = useState(false);

  const onSignOut = async () => {
    await qc.cancelQueries();
    qc.clear();
    await supabase.auth.signOut();
    router.navigate({ to: "/auth", replace: true });
  };

  const onRefreshRoles = async () => {
    if (refreshing) return;
    setRefreshing(true);
    try {
      await supabase.auth.refreshSession();
      await qc.invalidateQueries();
      await router.invalidate();
      toast.success("Behörigheter uppdaterade");
    } catch (e: any) {
      toast.error(e?.message ?? "Kunde inte uppdatera");
    } finally {
      setRefreshing(false);
    }
  };

  const adminNav = [
    { to: "/admin", label: "Översikt", icon: LineChart },
    { to: "/admin/users", label: "Användare", icon: Shield },
    { to: "/trainer/clients", label: "Kunder", icon: Users },
    { to: "/trainer/programs", label: "Program", icon: ListChecks },
  ];
  const trainerNav = [
    { to: "/trainer", label: "Översikt", icon: LineChart },
    { to: "/trainer/clients", label: "Kunder", icon: Users },
    { to: "/trainer/programs", label: "Program", icon: ListChecks },
    { to: "/trainer/exercises", label: "Övningar", icon: Dumbbell },
  ];
  const clientNav = [
    { to: "/app", label: "Idag", icon: Dumbbell },
    { to: "/app/history", label: "Historik", icon: ListChecks },
    { to: "/app/progress", label: "Utveckling", icon: LineChart },
    { to: "/app/measurements", label: "Kroppsmått", icon: Ruler },
  ];
  const nav = me?.isAdmin ? adminNav : me?.isTrainer ? trainerNav : clientNav;
  const roleLabel = me?.isAdmin ? "Admin" : me?.isTrainer ? "Tränare" : "Kund";

  return (
    <div className="min-h-screen bg-background flex">
      <aside className="hidden md:flex w-60 shrink-0 border-r border-border flex-col p-5 gap-1 bg-sidebar">
        <div className="flex items-center gap-2 mb-6 px-2">
          <div className="size-8 rounded-lg bg-primary grid place-items-center text-primary-foreground">
            <Dumbbell className="size-4" />
          </div>
          <div className="font-semibold tracking-tight">Träna</div>
        </div>
        <nav className="flex flex-col gap-1">
          {nav.map((n) => (
            <Link
              key={n.to}
              to={n.to}
              activeProps={{ className: "bg-accent text-accent-foreground" }}
              className="flex items-center gap-3 rounded-md px-3 py-2 text-sm text-muted-foreground hover:text-foreground hover:bg-accent/60 transition"
            >
              <n.icon className="size-4" />
              {n.label}
            </Link>
          ))}
        </nav>
        <div className="mt-auto flex flex-col gap-1 pt-4 border-t border-border">
          <div className="px-3 py-2 text-xs text-muted-foreground">
            {me?.profile?.display_name} · {roleLabel}
          </div>
          <button
            onClick={onSignOut}
            className="flex items-center gap-3 rounded-md px-3 py-2 text-sm text-muted-foreground hover:text-foreground hover:bg-accent/60"
          >
            <LogOut className="size-4" /> Logga ut
          </button>
        </div>
      </aside>

      <div className="flex-1 flex flex-col min-w-0">
        <header className="border-b border-border bg-background/80 backdrop-blur px-4 md:px-8 h-14 flex items-center justify-between">
          <h1 className="text-base font-semibold tracking-tight">{title ?? ""}</h1>
          <div className="md:hidden flex items-center gap-2 text-sm text-muted-foreground">
            <User2 className="size-4" />
            {me?.profile?.display_name}
          </div>
        </header>
        <main className="p-4 md:p-8 max-w-5xl w-full mx-auto flex-1">{children}</main>
        <nav className="md:hidden border-t border-border bg-background grid grid-cols-4 sticky bottom-0">
          {nav.map((n) => (
            <Link
              key={n.to}
              to={n.to}
              activeProps={{ className: "text-foreground" }}
              className="flex flex-col items-center gap-1 py-2 text-xs text-muted-foreground"
            >
              <n.icon className="size-5" />
              {n.label}
            </Link>
          ))}
        </nav>
      </div>
    </div>
  );
}
