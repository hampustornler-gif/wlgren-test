import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { AppShell } from "@/components/app-shell";
import { listSessions } from "@/lib/app.functions";
import { format } from "date-fns";

export const Route = createFileRoute("/_authenticated/app/history")({
  component: HistoryPage,
});

function HistoryPage() {
  const f = useServerFn(listSessions);
  const { data } = useQuery({ queryKey: ["my-sessions"], queryFn: () => f({ data: {} }) });

  return (
    <AppShell title="Historik">
      <div className="bg-card border border-border rounded-xl divide-y divide-border">
        {(data ?? []).map((s: any) => (
          <div key={s.id} className="p-4">
            <div className="font-medium">{s.programs?.name ?? "Pass"}</div>
            <div className="text-xs text-muted-foreground">
              {format(new Date(s.started_at), "PPP p")} · {s.completed_at ? "klart" : "pågående"}
            </div>
          </div>
        ))}
        {(data ?? []).length === 0 && (
          <div className="p-6 text-sm text-muted-foreground">Inga pass ännu.</div>
        )}
      </div>
    </AppShell>
  );
}
