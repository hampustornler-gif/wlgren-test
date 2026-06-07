import { Link, useRouter } from "@tanstack/react-router";
import { ReactNode, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import {
  Dumbbell, LineChart, Users, ListChecks, User2,
  LogOut, Ruler, Shield, Menu, X
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { getMe } from "@/lib/app.functions";

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
  const [drawerOpen, setDrawerOpen] = useState(false);

  const closeDrawer = () => setDrawerOpen(false);

  const onSignOut = async () => {
    closeDrawer();
    await qc.cancelQueries();
    qc.clear();
    await supabase.auth.signOut();
    router.navigate({ to: "/auth", replace: true });
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

  const primaryItems = meLoading
    ? []
    : me?.isAdmin
    ? adminSection.items
    : me?.isTrainer
    ? trainerSection.items
    : clientSection.items;

  const hasMoreSections = sections.length > 1;
  const bottomNavItems = hasMoreSections ? primaryItems.slice(0, 3) : primaryItems;

  const roleBadgeClass = me?.isAdmin
    ? "border-violet-500/50 text-violet-300 bg-violet-500/15"
    : me?.isTrainer
    ? "border-blue-500/50 text-blue-300 bg-blue-500/15"
    : "border-emerald-500/50 text-emerald-300 bg-emerald-500/15";

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
      <aside className="hidden md:flex w-64 shrink-0 border-r border-white/[0.06] flex-col p-4 gap-1 bg-sidebar">
        <div className="flex items-center gap-3 mb-6 px-2 pt-2">
          <div className="size-9 rounded-xl bg-primary grid place-items-center text-primary-foreground shadow-lg shadow-primary/30 btn-glow">
            <Dumbbell className="size-4" />
          </div>
          <div className="font-bold tracking-tight text-base text-foreground">Tr\u00e4na</div>
        </div>
        <nav className="flex flex-col gap-5 flex-1 overflow-y-auto">
          {sections.map((section) => (
            <div key={section.label}>
              {sections.length > 1 && (
                <div className="px-3 mb-1.5 text-[10px] font-semibold uppercase tracking-widest text-white/30">
                  {section.label}
                </div>
              )}
              <div className="flex flex-col gap-0.5">
                {section.items.map((n) => (
                  <Link
                    key={n.to}
                    to={n.to}
                    activeProps={{ className: "bg-white/10 text-white shadow-sm" }}
                    className="flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm text-white/50 hover:text-white hover:bg-white/8 transition-all duration-150"
                  >
                    <n.icon className="size-4" />
                    {n.label}
                  </Link>
                ))}
              </div>
            </div>
          ))}
        </nav>
        <div className="flex flex-col gap-1 pt-4 border-t border-white/[0.06]">
          <div className="px-3 py-2 flex flex-col gap-1.5">
            <div className="text-sm font-semibold text-white">
              {meLoading ? "Laddar konto\u2026" : me?.profile?.display_name ?? "Konto"}
            </div>
            {!meLoading && (
              <Badge variant="outline" className={`${roleBadgeClass} text-xs w-fit`}>
                {roleLabel}
              </Badge>
            )}
          </div>
          <button
            onClick={onSignOut}
            className="flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm text-white/40 hover:text-red-400 hover:bg-red-500/10 transition-all duration-150"
          >
            <LogOut className="size-4" /> Logga ut
          </button>
        </div>
      </aside>

      {/* Main content area */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Header */}
        <header className="border-b border-white/[0.06] bg-background/60 backdrop-blur-xl px-4 md:px-8 h-14 flex items-center justify-between sticky top-0 z-10">
          <h1 className="text-base font-bold tracking-tight truncate text-white">{title ?? ""}</h1>
          <div className="flex items-center gap-2 text-sm shrink-0">
            <User2 className="size-4 shrink-0 text-white/40" />
            <span className="hidden sm:inline truncate max-w-[120px] text-white/60">
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
          className="md:hidden border-t border-white/[0.06] bg-background/80 backdrop-blur-xl grid sticky bottom-0 z-10"
          style={{
            gridTemplateColumns: `repeat(${totalBottomSlots}, 1fr)`,
            paddingBottom: "env(safe-area-inset-bottom)",
            boxShadow: "0 -8px 32px -4px rgba(0,0,0,0.4)",
          }}
        >
          {bottomNavItems.map((n) => (
            <Link
              key={n.to}
              to={n.to}
              activeProps={{ className: "text-primary" }}
              className="flex flex-col items-center justify-center gap-1 py-3 px-1 text-xs text-white/40 hover:text-white active:scale-95 transition-all min-h-[56px]"
            >
              <n.icon className="size-5 shrink-0" />
              <span className="leading-none truncate w-full text-center">{n.label}</span>
            </Link>
          ))}
          {hasMoreSections && (
            <button
              onClick={() => setDrawerOpen(true)}
              className="flex flex-col items-center justify-center gap-1 py-3 px-1 text-xs text-white/40 hover:text-white active:scale-95 transition-all min-h-[56px]"
            >
              <Menu className="size-5 shrink-0" />
              <span className="leading-none">Mer</span>
            </button>
          )}
        </nav>
      </div>

      {/* Mobile full-nav drawer */}
      {drawerOpen && (
        <>
          <div
            className="fixed inset-0 z-20 bg-black/70 backdrop-blur-sm md:hidden"
            onClick={closeDrawer}
          />
          <div
            className="fixed bottom-0 left-0 right-0 z-30 md:hidden rounded-t-3xl flex flex-col glass"
            style={{ paddingBottom: "env(safe-area-inset-bottom)", maxHeight: "82vh" }}
          >
            {/* Handle bar */}
            <div className="flex justify-center pt-3 pb-1">
              <div className="w-10 h-1 rounded-full bg-white/20" />
            </div>

            <div className="flex items-center justify-between px-5 pt-2 pb-3">
              <div className="flex flex-col gap-1">
                <span className="text-base font-bold text-white">
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
                className="p-2 rounded-full bg-white/8 hover:bg-white/14 text-white/60 hover:text-white transition-all"
              >
                <X className="size-5" />
              </button>
            </div>

            <div className="overflow-y-auto px-4 pb-4">
              {sections.map((section) => (
                <div key={section.label} className="mb-5">
                  <div className="px-2 mb-2 text-[10px] font-semibold uppercase tracking-widest text-white/30">
                    {section.label}
                  </div>
                  <div className="flex flex-col gap-1">
                    {section.items.map((n) => (
                      <Link
                        key={n.to}
                        to={n.to}
                        onClick={closeDrawer}
                        activeProps={{ className: "bg-white/12 text-white" }}
                        className="flex items-center gap-4 rounded-2xl px-4 py-3.5 text-sm text-white/50 hover:text-white hover:bg-white/8 transition-all duration-150"
                      >
                        <n.icon className="size-5" />
                        <span className="font-medium">{n.label}</span>
                      </Link>
                    ))}
                  </div>
                </div>
              ))}
              <div className="border-t border-white/[0.06] pt-4">
                <button
                  onClick={onSignOut}
                  className="w-full flex items-center gap-4 rounded-2xl px-4 py-3.5 text-sm text-red-400 hover:text-red-300 hover:bg-red-500/10 transition-all duration-150"
                >
                  <LogOut className="size-5" />
                  <span className="font-medium">Logga ut</span>
                </button>
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
