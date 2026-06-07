import { Link, useRouter } from "@tanstack/react-router";
import { ReactNode, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Dumbbell, LineChart, Users, ListChecks, User2, LogOut, Ruler, Shield, RefreshCw } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { getMe } from "@/lib/app.functions";
import { toast } from "sonner";

export function AppShell({ children, title }: { children: ReactNode; title?: string }) {
  const router = useRouter();
  const qc = useQueryClient();
  const fetchMe = useServerFn(getMe);
  const { data: me, isLoading: meLoading } = useQuery({
    queryKey: ["me"],
    queryFn: () => fetchMe(),
    refetchOnWindowFocus: true,
    refetchOnMount: "always",
    refetchInterval: 3000,
    refetchIntervalInBackground: true,
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

  const adminSection = {
    label: "🛡️ Admin",
    items: [
      { to: "/admin", label: "Översikt", icon: LineChart },
      { to: "/admin/users", label: "Användare", icon: Shield },
    ],
  };
  const trainerSection = {
    label: "🏃 Tränare",
    items: [
      { to: "/trainer", label: "Översikt", icon: LineChart },
      { to: "/trainer/clients", label: "Kunder", icon: Users },
      { to: "/trainer/programs", label: "Program", icon: ListChecks },
      { to: "/trainer/exercises", label: "Övningar", icon: Dumbbell },
    ],
  };
  const clientSection = {
    label: "💪 Klient",
    items: [
      { to: "/app", label: "Idag", icon: Dumbbell },
      { to: "/app/history", label: "Historik", icon: ListChecks },
      { to: "/app/progress", label: "Utveckling", icon: LineChart },
      { to: "/app/measurements", label: "Kroppsmått", icon: Ruler },
    ],
  };

  const sections = meLoading
    ? []
    : me?.isAdmin
    ? [adminSection, trainerSection, clientSection]
    : me?.isTrainer
    ? [trainerSection, clientSection]
    : [clientSection];

  const mobileNav = meLoading
    ? []
    : me?.isAdmin
    ? adminSection.items
    : me?.isTrainer
    ? trainerSection.items
    : clientSection.items;

  const roleBadgeClass = me?.isAdmin
    ? "border-violet-500 text-violet-400 bg-violet-500/10"
    : me?.isTrainer
    ? "border-blue-500 text-blue-400 bg-blue-500/10"
    : "border-emerald-500 text-emerald-400 bg-emerald-500/10";

  const roleLabel = meLoading ? "Laddar…" : me?.isAdmin ? "🛡️ Admin" : me?.isTrainer ? "🏃 Tränare" : "💪 Klient";

  return (
    <div className="min-h-screen bg-background flex">
      {/* Desktop sidebar */}
      <aside className="hidden md:flex w-64 shrink-0 border-r border-border flex-col p-4 gap-1 bg-sidebar">
        <div className="flex items-center gap-2 mb-5 px-2">
          <div className="size-8 rounded-lg bg-primary grid place-items-center text-primary-foreground">
            <Dumbbell className="size-4" />
          </div>
          <div className="font-semibold tracking-tight">Träna</div>
        </div>

        <nav className="flex flex-col gap-4 flex-1 overflow-y-auto">
          {sections.map((section) => (
            <div key={section.label}>
              {sections.length > 1 && (
                <div className="px-3 mb-1 text-[10px] font-semibold uppercase tracking-widest text-muted-foreground/60">
                  {section.label}
                </div>
              )}
              <div className="flex flex-col gap-0.5">
                {section.items.map((n) => (
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
              </div>
            </div>
          ))}
        </nav>

        <div className="flex flex-col gap-1 pt-4 border-t border-border">
          <div className="px-3 py-2 flex flex-col gap-1.5">
            <div className="text-xs font-medium text-foreground">
              {meLoading ? "Laddar konto…" : me?.profile?.display_name ?? "Konto"}
            </div>
            {!meLoading && (
              <Badge variant="outline" className={`${roleBadgeClass} text-xs w-fit`}>
                {roleLabel}
              </Badge>
            )}
          </div>
          <button
            onClick={onRefreshRoles}
            disabled={refreshing}
            className="flex items-center gap-3 rounded-md px-3 py-2 text-sm text-muted-foreground hover:text-foreground hover:bg-accent/60 disabled:opacity-60"
          >
            <RefreshCw className={`size-4 ${refreshing ? "animate-spin" : ""}`} />
            {refreshing ? "Uppdaterar…" : "Uppdatera behörigheter"}
          </button>
          <button
            onClick={onSignOut}
            className="flex items-center gap-3 rounded-md px-3 py-2 text-sm text-muted-foreground hover:text-foreground hover:bg-accent/60"
          >
            <LogOut className="size-4" /> Logga ut
          </button>
        </div>
      </aside>

      {/* Main content area */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Header */}
        <header className="border-b border-border bg-background/80 backdrop-blur px-4 md:px-8 h-14 flex items-center justify-between sticky top-0 z-10">
          <h1 className="text-base font-semibold tracking-tight truncate">{title ?? ""}</h1>
          <div className="flex items-center gap-2 text-sm text-muted-foreground shrink-0">
            <button
              onClick={onRefreshRoles}
              disabled={refreshing}
              aria-label="Uppdatera behörigheter"
              className="p-2 rounded-md hover:bg-accent/60 disabled:opacity-60 md:hidden"
            >
              <RefreshCw className={`size-4 ${refreshing ? "animate-spin" : ""}`} />
            </button>
            <User2 className="size-4 shrink-0" />
            <span className="hidden sm:inline truncate max-w-[120px]">{meLoading ? "Laddar…" : (me?.profile?.display_name ?? "Konto")}</span>
            {!meLoading && (
              <Badge variant="outline" className={`${roleBadgeClass} text-xs hidden sm:inline-flex`}>
                {roleLabel}
              </Badge>
            )}
          </div>
        </header>

        {/* Page content — pb accounts for mobile bottom nav + iPhone safe area */}
        <main className="p-4 md:p-8 pb-[calc(4rem+env(safe-area-inset-bottom))] md:pb-8 max-w-5xl w-full mx-auto flex-1 min-h-0">
          {children}
        </main>

        {/* Mobile bottom navigation */}
        <nav
          className="md:hidden border-t border-border bg-background/95 backdrop-blur grid sticky bottom-0 z-10"
          style={{
            gridTemplateColumns: `repeat(${mobileNav.length}, 1fr)`,
            paddingBottom: "env(safe-area-inset-bottom)",
          }}
        >
          {mobileNav.map((n) => (
            <Link
              key={n.to}
              to={n.to}
              activeProps={{ className: "text-primary bg-primary/10" }}
              className="flex flex-col items-center justify-center gap-1 py-3 px-1 text-xs text-muted-foreground hover:text-foreground active:bg-accent/60 transition-colors min-h-[56px]"
            >
              <n.icon className="size-5 shrink-0" />
              <span className="leading-none truncate w-full text-center">{n.label}</span>
            </Link>
          ))}
        </nav>
      </div>
    </div>
  );
}
