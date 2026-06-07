import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { AppShell } from "@/components/app-shell";
import { exerciseProgress, listMeasurements, listSessions, listClients } from "@/lib/app.functions";
import { ProgressCharts } from "@/components/progress-charts";
import { format } from "date-fns";

export const Route = createFileRoute("/_authenticated/trainer/clients/$clientId")({
  component: ClientDetail,
});

function ClientDetail() {
  const { clientId } = Route.useParams();
  const fSessions = useServerFn(listSessions);
  const fProgress = useServerFn(exerciseProgress);
  const fMeas = useServerFn(listMeasurements);
  const fClients = useServerFn(listClients);

  const clients = useQuery({ queryKey: ["clients"], queryFn: () => fClients() });
  const sessions = useQuery({ queryKey: ["sessions", clientId], queryFn: () => fSessions({ data: { clientId } }) });
  const progress = useQuery({ queryKey: ["progress", clientId], queryFn: () => fProgress({ data: { clientId } }) });
  const meas = useQuery({ queryKey: ["measurements", clientId], queryFn: () => fMeas({ data: { clientId } }) });

  const client = clients.data?.find((c) => c.id === clientId);

  return (
    <AppShell title={client?.display_name || "Kund"}>
      <Link to="/trainer/clients" className="text-sm text-muted-foreground hover:text-foreground">← Tillbaka</Link>

      <div className="mt-6">
        <h2 className="text-sm font-medium text-muted-foreground mb-3">Utveckling</h2>
        <ProgressCharts progress={progress.data ?? []} measurements={meas.data ?? []} />
      </div>

      <div className="mt-8">
        <h2 className="text-sm font-medium text-muted-foreground mb-3">Senaste pass</h2>
        <div className="bg-card border border-border rounded-xl divide-y divide-border">
          {(sessions.data ?? []).map((s: any) => (
            <div key={s.id} className="p-4">
              <div className="font-medium">{s.programs?.name ?? "Pass"}</div>
              <div className="text-xs text-muted-foreground">
                {format(new Date(s.started_at), "PPP")} · {s.completed_at ? "klart" : "pågående"}
              </div>
            </div>
          ))}
          {(sessions.data ?? []).length === 0 && (
            <div className="p-6 text-sm text-muted-foreground">Inga loggade pass än.</div>
          )}
        </div>
      </div>
    </AppShell>
  );
}
