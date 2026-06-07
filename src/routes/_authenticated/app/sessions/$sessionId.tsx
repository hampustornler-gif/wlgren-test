import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useState } from "react";
import { AppShell } from "@/components/app-shell";
import { completeSession, getSession, logSet } from "@/lib/app.functions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Check, Plus } from "lucide-react";
import { toast } from "sonner";

export const Route = createFileRoute("/_authenticated/app/sessions/$sessionId")({
  component: SessionPage,
});

function SessionPage() {
  const { sessionId } = Route.useParams();
  const nav = useNavigate();
  const qc = useQueryClient();
  const fGet = useServerFn(getSession);
  const fLog = useServerFn(logSet);
  const fDone = useServerFn(completeSession);
  const { data } = useQuery({ queryKey: ["session", sessionId], queryFn: () => fGet({ data: { sessionId } }) });

  const log = useMutation({
    mutationFn: fLog,
    onSuccess: () => qc.invalidateQueries({ queryKey: ["session", sessionId] }),
  });
  const done = useMutation({
    mutationFn: () => fDone({ data: { sessionId } }),
    onSuccess: () => {
      toast.success("Pass klart");
      nav({ to: "/app/history" });
    },
  });

  const items = data?.items ?? [];
  const logs = data?.logs ?? [];

  return (
    <AppShell title={data?.session?.programs?.name ?? "Pass"}>
      <div className="grid gap-4">
        {items.map((it: any) => {
          const exLogs = logs.filter((l: any) => l.exercise_id === it.exercises.id);
          return (
            <ExerciseBlock
              key={it.id}
              name={it.exercises.name}
              targetSets={it.target_sets}
              targetReps={it.target_reps}
              rest={it.rest_seconds}
              logged={exLogs}
              onLog={(weight, reps) =>
                log.mutate({
                  data: {
                    sessionId,
                    exerciseId: it.exercises.id,
                    set_index: exLogs.length + 1,
                    weight_kg: weight,
                    reps,
                  },
                })
              }
            />
          );
        })}
      </div>

      {!data?.session?.completed_at && (
        <div className="mt-6">
          <Button onClick={() => done.mutate()} disabled={done.isPending} className="w-full sm:w-auto">
            <Check className="size-4" /> Avsluta pass
          </Button>
        </div>
      )}
    </AppShell>
  );
}

function ExerciseBlock({
  name, targetSets, targetReps, rest, logged, onLog,
}: {
  name: string;
  targetSets: number;
  targetReps: number;
  rest: number;
  logged: any[];
  onLog: (weight: number, reps: number) => void;
}) {
  const last = logged[logged.length - 1];
  const [weight, setWeight] = useState<string>(last ? String(last.weight_kg) : "");
  const [reps, setReps] = useState<string>(last ? String(last.reps) : String(targetReps));

  return (
    <div className="bg-card border border-border rounded-xl p-5">
      <div className="flex items-center justify-between">
        <div>
          <div className="font-medium">{name}</div>
          <div className="text-xs text-muted-foreground">Mål: {targetSets} × {targetReps} · vila {rest}s</div>
        </div>
        <div className="text-sm text-muted-foreground">{logged.length}/{targetSets} set</div>
      </div>

      {logged.length > 0 && (
        <div className="mt-3 flex flex-wrap gap-2">
          {logged.map((l: any, i: number) => (
            <span key={l.id} className="text-xs bg-accent text-accent-foreground rounded-md px-2 py-1">
              {i + 1}: {l.weight_kg} kg × {l.reps}
            </span>
          ))}
        </div>
      )}

      <div className="mt-4 grid grid-cols-[1fr_1fr_auto] gap-2 items-end">
        <div>
          <label className="text-xs text-muted-foreground">Vikt (kg)</label>
          <Input type="number" inputMode="decimal" step="0.5" value={weight} onChange={(e) => setWeight(e.target.value)} />
        </div>
        <div>
          <label className="text-xs text-muted-foreground">Reps</label>
          <Input type="number" inputMode="numeric" value={reps} onChange={(e) => setReps(e.target.value)} />
        </div>
        <Button
          onClick={() => onLog(Number(weight || 0), Number(reps || 0))}
          disabled={!weight || !reps}
        >
          <Plus className="size-4" /> Logga set
        </Button>
      </div>
    </div>
  );
}
