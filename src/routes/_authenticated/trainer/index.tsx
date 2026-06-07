import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { AppShell } from "@/components/app-shell";
import { listClients, listPrograms } from "@/lib/app.functions";
import { Users, ListChecks, ArrowRight } from "lucide-react";

export const Route = createFileRoute("/_authenticated/trainer/")({
  component: TrainerHome,
});

function TrainerHome() {
  const fClients = useServerFn(listClients);
  const fPrograms = useServerFn(listPrograms);
  const clients = useQuery({ queryKey: ["clients"], queryFn: () => fClients() });
  const programs = useQuery({ queryKey: ["programs"], queryFn: () => fPrograms() });

  return (
    <AppShell title="Översikt">
      <div className="grid sm:grid-cols-2 gap-4">
        <StatCard icon={<Users className="size-5" />} label="Kunder" value={clients.data?.length ?? 0} to="/trainer/clients" />
        <StatCard icon={<ListChecks className="size-5" />} label="Program" value={programs.data?.length ?? 0} to="/trainer/programs" />
      </div>
      <div className="mt-8">
        <h2 className="text-sm font-medium text-muted-foreground mb-3">Senaste kunder</h2>
        <div className="bg-card border border-border rounded-xl divide-y divide-border">
          {(clients.data ?? []).slice(0, 6).map((c) => (
            <Link
              key={c.id}
              to="/trainer/clients/$clientId"
              params={{ clientId: c.id }}
              className="flex items-center justify-between p-4 hover:bg-accent/40 transition"
            >
              <div>
                <div className="font-medium">{c.display_name || "Namnlös"}</div>
                <div className="text-xs text-muted-foreground">
                  {c.trainer_id ? "Din kund" : "Inte tilldelad"}
                </div>
              </div>
              <ArrowRight className="size-4 text-muted-foreground" />
            </Link>
          ))}
          {(clients.data ?? []).length === 0 && (
            <div className="p-6 text-sm text-muted-foreground">Inga kunder än.</div>
          )}
        </div>
      </div>
    </AppShell>
  );
}

function StatCard({ icon, label, value, to }: { icon: React.ReactNode; label: string; value: number; to: string }) {
  return (
    <Link to={to} className="bg-card border border-border rounded-xl p-5 hover:shadow-sm transition flex items-center justify-between">
      <div>
        <div className="text-sm text-muted-foreground">{label}</div>
        <div className="text-3xl font-semibold tracking-tight mt-1">{value}</div>
      </div>
      <div className="size-10 rounded-lg bg-accent grid place-items-center text-accent-foreground">{icon}</div>
    </Link>
  );
}
