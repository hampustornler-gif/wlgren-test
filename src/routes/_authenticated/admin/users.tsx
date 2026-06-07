import { createFileRoute } from "@tanstack/react-router";
import { AppShell } from "@/components/app-shell";
import { useServerFn } from "@tanstack/react-start";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  assignClientToTrainer,
  getMe,
  listAllUsers,
  setUserRole,
} from "@/lib/app.functions";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { toast } from "sonner";
import { Users, Lock } from "lucide-react";

export const Route = createFileRoute("/_authenticated/admin/users")({
  component: AdminUsers,
});

type Role = "admin" | "trainer" | "client";
const ALL_ROLES: Role[] = ["admin", "trainer", "client"];

const ROLE_LABELS: Record<Role, string> = {
  admin: "Admin",
  trainer: "Tränare",
  client: "Klient",
};

const ROLE_COLORS: Record<Role, string> = {
  admin: "text-violet-400",
  trainer: "text-blue-400",
  client: "text-emerald-400",
};

function AdminUsers() {
  const qc = useQueryClient();
  const fetchMe = useServerFn(getMe);
  const fetchUsers = useServerFn(listAllUsers);
  const setRole = useServerFn(setUserRole);
  const assignTrainer = useServerFn(assignClientToTrainer);

  const { data: me, isLoading: meLoading } = useQuery({
    queryKey: ["me"],
    queryFn: () => fetchMe(),
    refetchOnMount: "always",
    refetchInterval: 3000,
    refetchIntervalInBackground: true,
  });

  const { data: users = [], isLoading } = useQuery({
    queryKey: ["admin", "users"],
    queryFn: () => fetchUsers(),
    enabled: me?.isAdmin === true,
  });

  const roleMut = useMutation({
    mutationFn: (vars: { userId: string; role: Role; enabled: boolean }) =>
      setRole({ data: vars }),
    onSuccess: () => {
      toast.success("Roll uppdaterad");
      qc.invalidateQueries({ queryKey: ["admin", "users"] });
      qc.invalidateQueries({ queryKey: ["me"] });
    },
    onError: (e: any) => toast.error(e?.message ?? "Misslyckades"),
  });

  const trainerMut = useMutation({
    mutationFn: (vars: { clientId: string; trainerId: string | null }) =>
      assignTrainer({ data: vars }),
    onSuccess: () => {
      toast.success("Tränare uppdaterad");
      qc.invalidateQueries({ queryKey: ["admin", "users"] });
    },
    onError: (e: any) => toast.error(e?.message ?? "Misslyckades"),
  });

  if (meLoading) {
    return (
      <AppShell title="Användare">
        <div className="flex items-center gap-3 text-white/40">
          <div className="size-4 rounded-full border-2 border-white/20 border-t-white/60 animate-spin" />
          <span className="text-sm">Kontrollerar behörighet…</span>
        </div>
      </AppShell>
    );
  }

  if (!me?.isAdmin) {
    return (
      <AppShell title="Användare">
        <div className="glass rounded-3xl p-8 flex flex-col items-center gap-4 text-center max-w-sm mx-auto mt-12">
          <div className="size-14 rounded-2xl bg-red-500/10 border border-red-500/20 grid place-items-center">
            <Lock className="size-6 text-red-400" />
          </div>
          <div>
            <h2 className="text-lg font-bold text-white mb-1">Ingen behörighet</h2>
            <p className="text-sm text-white/50">Du saknar admin-behörighet.</p>
          </div>
        </div>
      </AppShell>
    );
  }

  const trainers = users.filter((u: any) => u.roles.includes("trainer"));

  return (
    <AppShell title="Användare">
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-2xl font-bold text-white tracking-tight">Användare</h2>
            <p className="text-white/40 text-sm mt-1">{users.length} registrerade användare</p>
          </div>
          <div className="size-10 rounded-xl bg-blue-500/15 border border-blue-500/20 grid place-items-center">
            <Users className="size-5 text-blue-400" />
          </div>
        </div>

        {/* User list */}
        {isLoading ? (
          <div className="flex items-center gap-3 text-white/40 py-8">
            <div className="size-4 rounded-full border-2 border-white/20 border-t-white/60 animate-spin" />
            <span className="text-sm">Laddar användare…</span>
          </div>
        ) : users.length === 0 ? (
          <div className="glass rounded-2xl p-8 text-center text-white/40 text-sm">Inga användare hittades.</div>
        ) : (
          <div className="space-y-3">
            {users.map((u: any) => (
              <div key={u.id} className="card-3d rounded-2xl p-4 md:p-5">
                <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
                  {/* User info */}
                  <div className="flex items-center gap-3">
                    <div className="size-10 rounded-xl bg-white/8 border border-white/10 grid place-items-center shrink-0">
                      <span className="text-sm font-bold text-white/60">
                        {(u.display_name || "?")[0].toUpperCase()}
                      </span>
                    </div>
                    <div>
                      <div className="font-semibold text-white">{u.display_name || "Namnlös"}</div>
                      <div className="text-xs text-white/30 font-mono mt-0.5">{u.id.slice(0, 12)}…</div>
                    </div>
                  </div>

                  {/* Controls */}
                  <div className="flex flex-wrap items-center gap-4">
                    {/* Role checkboxes */}
                    <div className="flex items-center gap-3">
                      {ALL_ROLES.map((role) => {
                        const enabled = u.roles.includes(role);
                        return (
                          <label key={role} className="flex items-center gap-1.5 cursor-pointer group">
                            <Checkbox
                              checked={enabled}
                              onCheckedChange={(v) =>
                                roleMut.mutate({ userId: u.id, role, enabled: v === true })
                              }
                              className="border-white/20 data-[state=checked]:bg-primary data-[state=checked]:border-primary"
                            />
                            <span className={`text-xs font-medium transition-colors ${
                              enabled ? ROLE_COLORS[role] : "text-white/30 group-hover:text-white/50"
                            }`}>
                              {ROLE_LABELS[role]}
                            </span>
                          </label>
                        );
                      })}
                    </div>

                    {/* Trainer select */}
                    <div className="min-w-[170px]">
                      <Select
                        value={u.trainer_id ?? "none"}
                        onValueChange={(v) =>
                          trainerMut.mutate({
                            clientId: u.id,
                            trainerId: v === "none" ? null : v,
                          })
                        }
                      >
                        <SelectTrigger className="bg-white/[0.05] border-white/10 text-white/70 rounded-xl h-9 text-xs">
                          <SelectValue placeholder="Tränare" />
                        </SelectTrigger>
                        <SelectContent className="bg-[oklch(0.12_0.03_265)] border-white/10 text-white">
                          <SelectItem value="none" className="text-white/50 focus:bg-white/8 focus:text-white">Ingen tränare</SelectItem>
                          {trainers.map((t: any) => (
                            <SelectItem key={t.id} value={t.id} className="focus:bg-white/8 focus:text-white">
                              {t.display_name || t.id.slice(0, 8)}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </AppShell>
  );
}
