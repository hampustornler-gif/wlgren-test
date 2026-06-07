import { Link, useRouter } from "@tanstack/react-router";
import { ReactNode, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import {
  Dumbbell, LineChart, Users, ListChecks, User2,
  LogOut, Ruler, Shield, RefreshCw, Menu, X
} from "lucide-react";
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
  const [drawerOpen, setDrawerOpen] = useState(false);

  const closeDrawer = () => setDrawerOpen(false);

  const onSignOut = async () => {
    closeDrawer();
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
      toast.success("Beh\u00f6righeter uppdaterade");
    } catch (e: any) {
      toast.error(e?.message ?? "Kunde inte uppdatera");
    } finally {
      setRefreshing(false);
    }
  };

  const adminSection = {
    label: "\uD83D\uDEE1\uFE0F Admin",
    items: [
      { to: "/admin", label: "\u00d6versikt", icon: LineChart },
      { to: "/admin/users", label: "Anv\u00e4ndare", icon: Shield },
    ],
  };
  const trainerSection = {
    label: "\uD83C\uDFC3 Tr\u00e4nare",
    items: [
      { to: "/trainer", label: "\u00d6versikt", icon: LineChart },
      { to: "/trainer/clients", label: "Kunder", icon: Users },
      { to: "/trainer/programs", label: "Program", icon: ListChecks },
      { to: "/trainer/exercises", label: "\u00d6vningar", icon: Dumbbell },
    ],
  };
  const clientSection = {
    label: "\uD83D\uDCAA Klient",
    items: [
      { to: "/app", label: "Idag", icon: Dumbbell },
      { to: "/app/history", label: "Historik", icon: ListChecks },
      { to: "/app/progress", label: "Utveckling", icon: LineChart },
      { to: "/app/measurements", label: "Kroppsm\u00e5tt", icon: Ruler },
    ],
  };

  const sections = meLoading
    ? []
    : me?.isAdmin
    ? [adminSection, trainerSection, clientSection]
    : me?.isTrainer
    ? [trainerSection, clientSection]
    : [clientSection];

  // Primary section items shown directly in bottom bar
  const primaryItems = meLoading
    ? []
    : me?.isAdmin
    ? adminSection.items
    : me?.isTrainer
    ? trainerSection.items
    : clientSection.items;

  // Show "More" button only if there are multiple sections
  const hasMoreSections = sections.length > 1;
  // Bottom bar shows max 4 primary items + maybe a "More" slot
  const bottomNavItems = hasMoreSections ? primaryItems.slice(0, 3) : primaryItems;

  const roleBadgeClass = me?.isAdmin
    ? "border-violet-500 text-violet-400 bg-violet-500/10"
    : me?.isTrainer
    ? "border-blue-500 text-blue-400 bg-blue-500/10"
    : "border-emerald-500 text-emerald-400 bg-emerald-500/10";

  const roleLabel = meLoading
    ? "Laddar\u2026"
    : me?.isAdmin
    ? "\uD83D\uDEE1\uFE0F Admin"
    : me?.isTrainer
    ? "\uD83C\uDFC3 Tr\u00e4nare"
    : "\uD83D\uDCAA Klient";

  const totalBottomSlots = hasMoreSections ? bottomNavItems.length + 1 : bottomNavItems.length;

  return (
    <div className="min-h-screen bg-background flex">
      {/* Desktop sidebar */}
      <aside className="hidden md:flex w-64 shrink-0 border-r border-border flex-col p-4 gap-1 bg-sidebar">
        <div className="flex items-center gap-2 mb-5 px-2">
          <div className="size-8 rounded-lg bg-primary grid place-items-center text-primary-foreground">
            <Dumbbell className="size-4" />
          </div>
          <div className="font-semibold tracking-tight">Tr\u00e4na</div>
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
              {meLoading ? "Laddar konto\u2026" : me?.profile?.display_name ?? "Konto"}
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
            {refreshing ? "Uppdaterar\u2026" : "Uppdatera beh\u00f6righeter"}
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
              aria-label="Uppdatera beh\u00f6righeter"
              className="p-2 rounded-md hover:bg-accent/60 disabled:opacity-60 md:hidden"
            >
              <RefreshCw className={`size-4 ${refreshing ? "animate-spin" : ""}`} />
            </button>
            <User2 className="size-4 shrink-0" />
            <span className="hidden sm:inline truncate max-w-[120px]">
              {meLoading ? "Laddar\u2026" : (me?.profile?.display_name ?? "Konto")}
            </span>
            {!meLoading && (
              <Badge variant="outline" className={`${roleBadgeClass} text-xs hidden sm:inline-flex`}>
                {roleLabel}
              </Badge>
            )}
          </div>
        </header>

        {/* Page content */}
        <main className="p-4 md:p-8 pb-[calc(4rem+env(safe-area-inset-bottom))] md:pb-8 max-w-5xl w-full mx-auto flex-1 min-h-0">
          {children}
        </main>

        {/* Mobile bottom navigation */}
        <nav
          className="md:hidden border-t border-border bg-background/95 backdrop-blur grid sticky bottom-0 z-10"
          style={{
            gridTemplateColumns: `repeat(${totalBottomSlots}, 1fr)`,
            paddingBottom: "env(safe-area-inset-bottom)",
          }}
        >
          {bottomNavItems.map((n) => (
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

          {/* "More" button — opens full nav drawer */}
          {hasMoreSections && (
            <button
              onClick={() => setDrawerOpen(true)}
              className="flex flex-col items-center justify-center gap-1 py-3 px-1 text-xs text-muted-foreground hover:text-foreground active:bg-accent/60 transition-colors min-h-[56px]"
            >
              <Menu className="size-5 shrink-0" />
              <span className="leading-none">Mer</span>
            </button>
          )}
        </nav>
      </div>

      {/* Mobile full-nav drawer overlay */}
      {drawerOpen && (
        <>
          {/* Backdrop */}
          <div
            className="fixed inset-0 z-20 bg-black/50 md:hidden"
            onClick={closeDrawer}
          />
          {/* Drawer */}
          <div
            className="fixed bottom-0 left-0 right-0 z-30 md:hidden bg-background rounded-t-2xl shadow-xl flex flex-col"
            style={{ paddingBottom: "env(safe-area-inset-bottom)", maxHeight: "80vh" }}
          >
            {/* Drag handle */}
            <div className="flex items-center justify-between px-5 pt-4 pb-2">
              <div className="flex flex-col gap-0.5">
                <span className="text-sm font-semibold">
                  {meLoading ? "Laddar\u2026" : (me?.profile?.display_name ?? "Konto")}
                </span>
                {!meLoading && (
                  <Badge variant="outline" className={`${roleBadgeClass} text-xs w-fit`}>
                    {roleLabel}
                  </Badge>
                )}
              </div>
              <button
                onClick={closeDrawer}
                className="p-2 rounded-full hover:bg-accent/60 text-muted-foreground"
              >
                <X className="size-5" />
              </button>
            </div>

            <div className="overflow-y-auto px-4 pb-2">
              {sections.map((section) => (
                <div key={section.label} className="mb-4">
                  <div className="px-2 mb-1 text-[10px] font-semibold uppercase tracking-widest text-muted-foreground/60">
                    {section.label}
                  </div>
                  <div className="flex flex-col gap-0.5">
                    {section.items.map((n) => (
                      <Link
                        key={n.to}
                        to={n.to}
                        onClick={closeDrawer}
                        activeProps={{ className: "bg-accent text-accent-foreground" }}
                        className="flex items-center gap-3 rounded-xl px-4 py-3 text-sm text-muted-foreground hover:text-foreground hover:bg-accent/60 transition"
                      >
                        <n.icon className="size-5" />
                        {n.label}
                      </Link>
                    ))}
                  </div>
                </div>
              ))}

              <div className="border-t border-border pt-3 flex flex-col gap-0.5">
                <button
                  onClick={onRefreshRoles}
                  disabled={refreshing}
                  className="flex items-center gap-3 rounded-xl px-4 py-3 text-sm text-muted-foreground hover:text-foreground hover:bg-accent/60 disabled:opacity-60"
                >
                  <RefreshCw className={`size-5 ${refreshing ? "animate-spin" : ""}`} />
                  {refreshing ? "Uppdaterar\u2026" : "Uppdatera beh\u00f6righeter"}
                </button>
                <button
                  onClick={onSignOut}
                  className="flex items-center gap-3 rounded-xl px-4 py-3 text-sm text-red-400 hover:text-red-300 hover:bg-red-500/10"
                >
                  <LogOut className="size-5" /> Logga ut
                </button>
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
