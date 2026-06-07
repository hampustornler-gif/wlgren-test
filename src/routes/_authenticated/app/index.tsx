import { createFileRoute, Link } from "@tanstack/react-router";
import { useMutation, useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { AppShell } from "@/components/app-shell";
import { myPrograms, startSession } from "@/lib/app.functions";
import { Button } from "@/components/ui/button";
import { Play } from "lucide-react";
import { useNavigate } from "@tanstack/react-router";

export const Route = createFileRoute("/_authenticated/app/")({
  component: ClientHome,
});

function ClientHome() {
  const nav = useNavigate();
  const fList = useServerFn(myPrograms);
  const fStart = useServerFn(startSession);
  const { data } = useQuery({ queryKey: ["my-programs"], queryFn: () => fList() });
  const start = useMutation({
    mutationFn: (programId: string) => fStart({ data: { programId } }),
    onSuccess: (s: any) => nav({ to: "/app/sessions/$sessionId", params: { sessionId: s.id } }),
  });

  return (
    <AppShell title="Idag">
      <h2 className="text-sm font-medium text-muted-foreground mb-3">Mina program</h2>
      <div className="grid gap-3">
        {(data ?? []).map((p: any) => (
          <div key={p.id} className="bg-card border border-border rounded-xl p-5 flex items-center justify-between">
            <div>
              <div className="font-medium">{p.name}</div>
              {p.description && <div className="text-sm text-muted-foreground">{p.description}</div>}
            </div>
            <Button onClick={() => start.mutate(p.id)} disabled={start.isPending}>
              <Play className="size-4" /> Starta
            </Button>
          </div>
        ))}
        {(data ?? []).length === 0 && (
          <div className="bg-card border border-border rounded-xl p-6 text-sm text-muted-foreground">
            Inga tilldelade program ännu. Be din tränare lägga till dig.
          </div>
        )}
      </div>

      <div className="mt-8 text-sm">
        <Link to="/app/history" className="text-primary">Se historik →</Link>
      </div>
    </AppShell>
  );
}
