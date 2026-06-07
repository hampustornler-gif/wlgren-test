import { createFileRoute } from "@tanstack/react-router";
import { AppShell } from "@/components/app-shell";
import { useServerFn } from "@tanstack/react-start";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  assignClientToTrainer,
  listAllUsers,
  setUserRole,
} from "@/lib/app.functions";
import { Card, CardContent } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { toast } from "sonner";

export const Route = createFileRoute("/_authenticated/admin/users")({
  component: AdminUsers,
});

type Role = "admin" | "trainer" | "client";
const ALL_ROLES: Role[] = ["admin", "trainer", "client"];

function AdminUsers() {
  const qc = useQueryClient();
  const fetchUsers = useServerFn(listAllUsers);
  const setRole = useServerFn(setUserRole);
  const assignTrainer = useServerFn(assignClientToTrainer);

  const { data: users = [], isLoading } = useQuery({
    queryKey: ["admin", "users"],
    queryFn: () => fetchUsers(),
  });

  const trainers = users.filter((u: any) => u.roles.includes("trainer"));

  const roleMut = useMutation({
    mutationFn: (vars: { userId: string; role: Role; enabled: boolean }) =>
      setRole({ data: vars }),
    onSuccess: () => {
      toast.success("Roll uppdaterad");
      qc.invalidateQueries({ queryKey: ["admin", "users"] });
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

  return (
    <AppShell title="Användare">
      {isLoading ? (
        <p className="text-sm text-muted-foreground">Laddar…</p>
      ) : (
        <div className="space-y-3">
          {users.map((u: any) => (
            <Card key={u.id}>
              <CardContent className="p-4 flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
                <div>
                  <div className="font-medium">{u.display_name || "Namnlös"}</div>
                  <div className="text-xs text-muted-foreground font-mono">{u.id}</div>
                </div>
                <div className="flex flex-wrap items-center gap-4">
                  <div className="flex items-center gap-3">
                    {ALL_ROLES.map((role) => {
                      const enabled = u.roles.includes(role);
                      return (
                        <label key={role} className="flex items-center gap-1 text-sm">
                          <Checkbox
                            checked={enabled}
                            onCheckedChange={(v) =>
                              roleMut.mutate({
                                userId: u.id,
                                role,
                                enabled: v === true,
                              })
                            }
                          />
                          {role}
                        </label>
                      );
                    })}
                  </div>
                  <div className="min-w-[200px]">
                    <Select
                      value={u.trainer_id ?? "none"}
                      onValueChange={(v) =>
                        trainerMut.mutate({
                          clientId: u.id,
                          trainerId: v === "none" ? null : v,
                        })
                      }
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Tränare" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="none">Ingen tränare</SelectItem>
                        {trainers.map((t: any) => (
                          <SelectItem key={t.id} value={t.id}>
                            {t.display_name || t.id.slice(0, 8)}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </AppShell>
  );
}
