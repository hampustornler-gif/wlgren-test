import { Link, useRouter, useRouterState } from "@tanstack/react-router";
import { ReactNode, useEffect, useRef, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import {
  Dumbbell, LineChart, Users, ListChecks, User2,
  LogOut, Ruler, Shield, Menu, X,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { getMe } from "@/lib/app.functions";

function NavLink({ to, label, icon: Icon, onClick }: { to: string; label: string; icon: any; onClick?: () => void }) {
  const { location } = useRouterState();
  const isActive = location.pathname === to || (to !== "/" && location.pathname.startsWith(to));
  return (
    <Link
      to={to}
      onClick={onClick}
      className={[
        "flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition-all duration-200 group relative overflow-hidden",
        isActive
          ? "nav-active"
          : "text-white/40 hover:text-white/80 hover:bg-white/[0.06]",
      ].join(" ")}
    >
      {isActive && (
        <span className="absolute left-0 top-1/2 -translate-y-1/2 w-0.5 h-5 bg-primary rounded-r-full shadow-[0_0_8px_oklch(0.70_0.24_265)] opacity-80" />
      )}
      <Icon className={["size-4 shrink-0 transition-transform duration-200", isActive ? "text-primary" : "group-hover:scale-110"].join(" ")} />
      <span className="tracking-tight">{label}</span>
    </Link>
  );
}

function BottomNavLink({ to, label, icon: Icon }: { to: string; label: string; icon: any }) {
  const { location } = useRouterState();
  const isActive = location.pathname === to || (to !== "/" && location.pathname.startsWith(to));
  return (
    <Link
      to={to}
      className={[
        "flex flex-col items-center justify-center gap-1 py-2 px-1 text-[10px] font-medium transition-all duration-200 min-h-[52px] relative active:scale-90",
        isActive ? "bottom-nav-active" : "text-white/30 hover:text-white/60",
      ].join(" ")}
    >
      <Icon className={["size-5 shrink-0 transition-all duration-200", isActive ? "scale-110" : ""].join(" ")} />
      <span className="leading-none">{label}</span>
    </Link>
  );
}

export function AppShell({ children, title }: { children: ReactNode; title?: string }) {
  const router = useRouter();
  const qc = useQueryClient();
  const fetchMe = useServerFn(getMe);
  const { data: me, isLoading: meLoading } = useQuery({
    queryKey: ["me"],
    queryFn: () => fetchMe(),
    refetchOnWindowFocus: true,
    refetchOnMount: "always",
    refetchInterval: 5000,
    refetchIntervalInBackground: false,
  });
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [pageKey, setPageKey] = useState(0);
  const prevPath = useRef("");
  const { location } = useRouterState();

  useEffect(() => {
    if (location.pathname !== prevPath.current) {
      prevPath.current = location.pathname;
      setPageKey((k) => k + 1);
    }
  }, [location.pathname]);

  const closeDrawer = () => setDrawerOpen(false);

  const onSignOut = async () => {
    closeDrawer();
    await qc.cancelQueries();
    qc.clear();
    await supabase.auth.signOut();
    router.navigate({ to: "/auth", replace: true });
  };

  const adminSection = {
    label: "Admin",
    items: [
      { to: "/admin",       label: "Översikt",  icon: LineChart },
      { to: "/admin/users", label: "Användare", icon: Shield },
    ],
  };
  const trainerSection = {
    label: "Tränare",
    items: [
      { to: "/trainer",           label: "Översikt",  icon: LineChart },
      { to: "/trainer/clients",   label: "Kunder",    icon: Users },
      { to: "/trainer/programs",  label: "Program",   icon: ListChecks },
      { to: "/trainer/exercises", label: "Övningar",  icon: Dumbbell },
    ],
  };
  const clientSection = {
    label: "Klient",
    items: [
      { to: "/app",               label: "Idag",       icon: Dumbbell },
      { to: "/app/history",       label: "Historik",   icon: ListChecks },
      { to: "/app/progress",      label: "Utveckling", icon: LineChart },
      { to: "/app/measurements",  label: "Kroppsmått", icon: Ruler },
    ],
  };

  const sections = meLoading
    ? []
    : me?.isAdmin   ? [adminSection, trainerSection, clientSection]
    : me?.isTrainer ? [trainerSection, clientSection]
    : [clientSection];

  const primaryItems = meLoading
    ? []
    : me?.isAdmin   ? adminSection.items
    : me?.isTrainer ? trainerSection.items
    : clientSection.items;

  const hasMoreSections = sections.length > 1;
  const bottomNavItems = hasMoreSections ? primaryItems.slice(0, 3) : primaryItems;
  const totalBottomSlots = hasMoreSections ? bottomNavItems.length + 1 : bottomNavItems.length;

  const roleBadgeClass = me?.isAdmin
    ? "border-violet-500/40 text-violet-300 bg-violet-500/12"
    : me?.isTrainer
    ? "border-blue-500/40 text-blue-300 bg-blue-500/12"
    : "border-emerald-500/40 text-emerald-300 bg-emerald-500/12";

  const roleLabel = meLoading ? "Laddar…"
    : me?.isAdmin   ? "Admin"
    : me?.isTrainer ? "Tränare"
    : "Klient";

  return (
    <div className="min-h-screen bg-background flex">
      {/* ===== DESKTOP SIDEBAR ===== */}
      <aside className="hidden md:flex w-64 shrink-0 border-r border-white/[0.05] flex-col bg-sidebar relative overflow-hidden">
        <div className="absolute inset-0 pointer-events-none">
          <div className="absolute -top-20 -left-20 w-60 h-60 rounded-full bg-primary/8 blur-3xl" />
          <div className="absolute bottom-20 -right-10 w-40 h-40 rounded-full bg-violet-500/6 blur-2xl" />
        </div>

        {/* Logo */}
        <div className="flex items-center gap-3 px-5 pt-6 pb-5 relative">
          <div className="size-9 rounded-xl logo-icon grid place-items-center text-white shrink-0">
            <Dumbbell className="size-4" />
          </div>
          <div>
            <div className="font-black tracking-tight text-sm text-white leading-tight">WÄLGREN</div>
            <div className="text-[10px] text-white/30 font-medium tracking-widest uppercase leading-tight">Training</div>
          </div>
        </div>

        <div className="h-px mx-4 divider-glow mb-3" />

        <nav className="flex flex-col gap-5 flex-1 overflow-y-auto px-3 py-2 relative">
          {sections.map((section, si) => (
            <div key={section.label} className={["animate-fade-up", `stagger-${si + 1}`].join(" ")}>
              {sections.length > 1 && (
                <div className="px-3 mb-1.5">
                  <span className="text-[9px] font-bold uppercase tracking-[0.15em] text-white/25">{section.label}</span>
                </div>
              )}
              <div className="flex flex-col gap-0.5">
                {section.items.map((n) => (
                  <NavLink key={n.to} to={n.to} label={n.label} icon={n.icon} />
                ))}
              </div>
            </div>
          ))}
        </nav>

        <div className="h-px mx-4 divider-glow" />

        <div className="p-3 pb-5 relative">
          <div className="glass rounded-xl p-3 mb-1 animate-fade-up stagger-5">
            <div className="flex items-center gap-3">
              <div className="size-8 rounded-lg bg-white/8 border border-white/10 grid place-items-center shrink-0">
                <User2 className="size-3.5 text-white/50" />
              </div>
              <div className="min-w-0 flex-1">
                <div className="text-xs font-semibold text-white/80 truncate">
                  {meLoading ? "Laddar…" : (me?.profile?.display_name ?? "Konto")}
                </div>
                {!meLoading && (
                  <Badge variant="outline" className={`${roleBadgeClass} text-[9px] py-0 px-1.5 mt-0.5 w-fit`}>
                    {roleLabel}
                  </Badge>
                )}
              </div>
            </div>
          </div>
          <button
            onClick={onSignOut}
            className="w-full flex items-center gap-3 rounded-xl px-3 py-2 text-xs font-medium text-white/30 hover:text-red-400 hover:bg-red-500/8 transition-all duration-200 group"
          >
            <LogOut className="size-3.5 group-hover:translate-x-0.5 transition-transform" />
            Logga ut
          </button>
        </div>
      </aside>

      {/* ===== MAIN ===== */}
      <div className="flex-1 flex flex-col min-w-0">
        <header className="border-b border-white/[0.05] bg-background/40 backdrop-blur-2xl px-5 md:px-8 h-14 flex items-center justify-between sticky top-0 z-10 relative">
          <div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-white/10 to-transparent" />
          <h1 className="text-sm font-bold tracking-tight truncate text-white/80">{title ?? ""}</h1>
          <div className="flex items-center gap-2.5 shrink-0">
            <div className="hidden sm:flex items-center gap-2 glass rounded-xl px-3 py-1.5">
              <User2 className="size-3.5 text-white/30" />
              <span className="text-xs text-white/50 font-medium truncate max-w-[100px]">
                {meLoading ? "" : (me?.profile?.display_name ?? "")}
              </span>
              {!meLoading && (
                <Badge variant="outline" className={`${roleBadgeClass} text-[9px] py-0 px-1.5`}>
                  {roleLabel}
                </Badge>
              )}
            </div>
          </div>
        </header>

        <main
          key={pageKey}
          className="page-enter p-4 md:p-8 pb-[calc(4rem+env(safe-area-inset-bottom))] md:pb-10 max-w-5xl w-full mx-auto flex-1 min-h-0"
        >
          {children}
        </main>

        <nav
          className="md:hidden border-t border-white/[0.05] bg-background/70 backdrop-blur-2xl grid sticky bottom-0 z-10 relative"
          style={{
            gridTemplateColumns: `repeat(${totalBottomSlots}, 1fr)`,
            paddingBottom: "env(safe-area-inset-bottom)",
            boxShadow: "0 -1px 0 oklch(1 0 0 / 5%), 0 -16px 40px -4px oklch(0 0 0 / 50%)",
          }}
        >
          <div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-white/8 to-transparent" />
          {bottomNavItems.map((n) => (
            <BottomNavLink key={n.to} to={n.to} label={n.label} icon={n.icon} />
          ))}
          {hasMoreSections && (
            <button
              onClick={() => setDrawerOpen(true)}
              className="flex flex-col items-center justify-center gap-1 py-2 px-1 text-[10px] font-medium text-white/30 hover:text-white/60 transition-all duration-200 min-h-[52px] active:scale-90"
            >
              <Menu className="size-5" />
              <span className="leading-none">Mer</span>
            </button>
          )}
        </nav>
      </div>

      {/* ===== MOBILE DRAWER ===== */}
      {drawerOpen && (
        <>
          <div
            className="fixed inset-0 z-20 bg-black/60 backdrop-blur-md md:hidden animate-fade-in"
            onClick={closeDrawer}
          />
          <div
            className="fixed bottom-0 left-0 right-0 z-30 md:hidden rounded-t-3xl glass-strong animate-drawer-up"
            style={{ paddingBottom: "env(safe-area-inset-bottom)", maxHeight: "85vh" }}
          >
            <div className="flex justify-center pt-3 pb-2">
              <div className="w-10 h-1 rounded-full bg-white/15" />
            </div>

            <div className="flex items-center justify-between px-5 pt-1 pb-4">
              <div className="flex items-center gap-3">
                <div className="size-10 rounded-xl bg-white/8 border border-white/10 grid place-items-center">
                  <User2 className="size-4 text-white/50" />
                </div>
                <div>
                  <div className="text-sm font-bold text-white">
                    {meLoading ? "Laddar…" : (me?.profile?.display_name ?? "Konto")}
                  </div>
                  {!meLoading && (
                    <Badge variant="outline" className={`${roleBadgeClass} text-[10px] py-0 px-1.5 mt-0.5 w-fit`}>
                      {roleLabel}
                    </Badge>
                  )}
                </div>
              </div>
              <button
                onClick={closeDrawer}
                className="size-9 rounded-full glass grid place-items-center text-white/50 hover:text-white transition-all active:scale-90"
              >
                <X className="size-4" />
              </button>
            </div>

            <div className="h-px mx-4 divider-glow mb-3" />

            <div className="overflow-y-auto px-4 pb-4">
              {sections.map((section, si) => (
                <div key={section.label} className={["mb-5 animate-fade-up", `stagger-${si + 1}`].join(" ")}>
                  <div className="px-2 mb-2 text-[9px] font-bold uppercase tracking-[0.15em] text-white/25">
                    {section.label}
                  </div>
                  <div className="flex flex-col gap-1">
                    {section.items.map((n) => (
                      <NavLink key={n.to} to={n.to} label={n.label} icon={n.icon} onClick={closeDrawer} />
                    ))}
                  </div>
                </div>
              ))}

              <div className="h-px divider-glow mx-2 mb-4" />

              <button
                onClick={onSignOut}
                className="w-full flex items-center gap-3 rounded-2xl px-4 py-3.5 text-sm font-medium text-red-400/70 hover:text-red-300 hover:bg-red-500/10 transition-all duration-200 group"
              >
                <LogOut className="size-4 group-hover:translate-x-0.5 transition-transform" />
                Logga ut
              </button>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
