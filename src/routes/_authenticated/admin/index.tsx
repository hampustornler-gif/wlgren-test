import { createFileRoute, Link } from "@tanstack/react-router";
import { AppShell } from "@/components/app-shell";
import { useServerFn } from "@tanstack/react-start";
import { useQuery } from "@tanstack/react-query";
import { getMe } from "@/lib/app.functions";
import { Shield, Users, ChevronRight, Lock } from "lucide-react";

export const Route = createFileRoute("/_authenticated/admin/")({
  component: AdminHome,
});

function AdminHome() {
  const fetchMe = useServerFn(getMe);
  const { data: me, isLoading } = useQuery({
    queryKey: ["me"],
    queryFn: () => fetchMe(),
    refetchOnMount: "always",
    refetchInterval: 3000,
    refetchIntervalInBackground: true,
  });

  if (isLoading) {
    return (
      <AppShell title="Admin">
        <div className="flex items-center gap-3 text-white/40">
          <div className="size-4 rounded-full border-2 border-white/20 border-t-white/60 animate-spin" />
          <span className="text-sm">Kontrollerar behörighet…</span>
        </div>
      </AppShell>
    );
  }

  if (!me?.isAdmin) {
    return (
      <AppShell title="Admin">
        <div className="glass rounded-3xl p-8 flex flex-col items-center gap-4 text-center max-w-sm mx-auto mt-12">
          <div className="size-14 rounded-2xl bg-red-500/10 border border-red-500/20 grid place-items-center">
            <Lock className="size-6 text-red-400" />
          </div>
          <div>
            <h2 className="text-lg font-bold text-white mb-1">Ingen admin-behörighet</h2>
            <p className="text-sm text-white/50">Ditt konto har inte adminrollen. Be en befintlig admin att tilldela dig rollen.</p>
          </div>
        </div>
      </AppShell>
    );
  }

  return (
    <AppShell title="Admin">
      <div className="space-y-8">
        {/* Header */}
        <div>
          <h2 className="text-2xl font-bold text-white tracking-tight">Kontrollpanel</h2>
          <p className="text-white/40 text-sm mt-1">Hantera användare, roller och behörigheter.</p>
        </div>

        {/* Stat cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="card-3d rounded-2xl p-5 flex items-center gap-4">
            <div className="size-12 rounded-xl bg-violet-500/15 border border-violet-500/20 grid place-items-center shrink-0">
              <Shield className="size-5 text-violet-400" />
            </div>
            <div>
              <div className="text-xs text-white/40 uppercase tracking-wider font-semibold">Roll</div>
              <div className="text-lg font-bold text-white mt-0.5">🛡️ Admin</div>
            </div>
          </div>

          <Link
            to="/admin/users"
            className="card-3d rounded-2xl p-5 flex items-center gap-4 hover:border-white/20 group transition-all"
          >
            <div className="size-12 rounded-xl bg-blue-500/15 border border-blue-500/20 grid place-items-center shrink-0">
              <Users className="size-5 text-blue-400" />
            </div>
            <div className="flex-1">
              <div className="text-xs text-white/40 uppercase tracking-wider font-semibold">Användare</div>
              <div className="text-lg font-bold text-white mt-0.5">Hantera</div>
            </div>
            <ChevronRight className="size-4 text-white/20 group-hover:text-white/60 transition-colors" />
          </Link>
        </div>

        {/* Quick action */}
        <div>
          <h3 className="text-xs font-semibold uppercase tracking-widest text-white/30 mb-3">Snabbval</h3>
          <Link
            to="/admin/users"
            className="glass rounded-2xl p-5 flex items-center gap-4 hover:border-white/20 group transition-all block"
          >
            <div className="size-10 rounded-xl bg-primary/20 border border-primary/30 grid place-items-center shrink-0">
              <Users className="size-4 text-primary" />
            </div>
            <div className="flex-1">
              <div className="text-sm font-semibold text-white">Användarhantering</div>
              <div className="text-xs text-white/40 mt-0.5">Tilldela roller och koppla kunder till tränare</div>
            </div>
            <ChevronRight className="size-4 text-white/20 group-hover:text-white/60 transition-colors" />
          </Link>
        </div>
      </div>
    </AppShell>
  );
}
