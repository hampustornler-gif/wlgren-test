import { createFileRoute, Link } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useState } from "react";
import { AppShell } from "@/components/app-shell";
import {
  addProgramExercise,
  assignProgram,
  getProgram,
  listClients,
  listExercises,
  removeProgramExercise,
  unassignProgram,
} from "@/lib/app.functions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Trash2, Check } from "lucide-react";
import { toast } from "sonner";

export const Route = createFileRoute("/_authenticated/trainer/programs/$programId")({
  component: ProgramDetail,
});

function ProgramDetail() {
  const { programId } = Route.useParams();
  const qc = useQueryClient();
  const fGet = useServerFn(getProgram);
  const fEx = useServerFn(listExercises);
  const fCli = useServerFn(listClients);
  const fAdd = useServerFn(addProgramExercise);
  const fRem = useServerFn(removeProgramExercise);
  const fAss = useServerFn(assignProgram);
  const fUna = useServerFn(unassignProgram);

  const prog = useQuery({ queryKey: ["program", programId], queryFn: () => fGet({ data: { programId } }) });
  const exs = useQuery({ queryKey: ["exercises"], queryFn: () => fEx() });
  const clients = useQuery({ queryKey: ["clients"], queryFn: () => fCli() });

  const invalidate = () => qc.invalidateQueries({ queryKey: ["program", programId] });
  const add = useMutation({ mutationFn: fAdd, onSuccess: invalidate });
  const rem = useMutation({ mutationFn: fRem, onSuccess: invalidate });
  const ass = useMutation({ mutationFn: fAss, onSuccess: () => { invalidate(); toast.success("Tilldelat"); } });
  const una = useMutation({ mutationFn: fUna, onSuccess: invalidate });

  const [exerciseId, setExerciseId] = useState("");
  const [sets, setSets] = useState(3);
  const [reps, setReps] = useState(10);
  const [rest, setRest] = useState(90);

  const items = prog.data?.items ?? [];
  const assignedIds = new Set((prog.data?.assignments ?? []).map((a: any) => a.client_id));
  const myClients = (clients.data ?? []).filter((c) => c.trainer_id);

  return (
    <AppShell title={prog.data?.program?.name ?? "Program"}>
      <Link to="/trainer/programs" className="text-sm text-muted-foreground hover:text-foreground">← Tillbaka</Link>

      <div className="mt-6 bg-card border border-border rounded-xl p-5">
        <h2 className="font-medium mb-3">Lägg till övning</h2>
        <form
          className="grid sm:grid-cols-[2fr_repeat(3,1fr)_auto] gap-3 items-end"
          onSubmit={(e) => {
            e.preventDefault();
            if (!exerciseId) return;
            add.mutate({ data: { programId, exerciseId, target_sets: sets, target_reps: reps, rest_seconds: rest } });
          }}
        >
          <div className="space-y-1.5">
            <Label>Övning</Label>
            <Select value={exerciseId} onValueChange={setExerciseId}>
              <SelectTrigger><SelectValue placeholder="Välj…" /></SelectTrigger>
              <SelectContent>
                {(exs.data ?? []).map((e: any) => (
                  <SelectItem key={e.id} value={e.id}>{e.name}</SelectItem>
                ))}

              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1.5">
            <Label>Set</Label>
            <Input type="number" min={1} max={30} value={sets} onChange={(e) => setSets(+e.target.value)} />
          </div>
          <div className="space-y-1.5">
            <Label>Reps</Label>
            <Input type="number" min={1} max={100} value={reps} onChange={(e) => setReps(+e.target.value)} />
          </div>
          <div className="space-y-1.5">
            <Label>Vila (s)</Label>
            <Input type="number" min={0} max={600} value={rest} onChange={(e) => setRest(+e.target.value)} />
          </div>
          <Button type="submit">Lägg till</Button>
        </form>
      </div>

      <div className="mt-6 bg-card border border-border rounded-xl divide-y divide-border">
        {items.map((it: any) => (
          <div key={it.id} className="flex items-center justify-between p-4">
            <div>
              <div className="font-medium">{it.exercises?.name}</div>
              <div className="text-xs text-muted-foreground">
                {it.target_sets} × {it.target_reps} · vila {it.rest_seconds}s
              </div>
            </div>
            <Button variant="ghost" size="sm" onClick={() => rem.mutate({ data: { id: it.id } })}>
              <Trash2 className="size-4 text-muted-foreground" />
            </Button>
          </div>
        ))}
        {items.length === 0 && <div className="p-6 text-sm text-muted-foreground">Inga övningar än.</div>}
      </div>

      <div className="mt-8">
        <h2 className="text-sm font-medium text-muted-foreground mb-3">Tilldela till kunder</h2>
        <div className="bg-card border border-border rounded-xl divide-y divide-border">
          {myClients.length === 0 && <div className="p-6 text-sm text-muted-foreground">Inga kunder ännu.</div>}
          {myClients.map((c) => {
            const isAssigned = assignedIds.has(c.id);
            return (
              <div key={c.id} className="flex items-center justify-between p-4">
                <div className="font-medium">{c.display_name || "Namnlös"}</div>
                <Button
                  size="sm"
                  variant={isAssigned ? "secondary" : "outline"}
                  onClick={() =>
                    isAssigned
                      ? una.mutate({ data: { programId, clientId: c.id } })
                      : ass.mutate({ data: { programId, clientId: c.id } })
                  }
                >
                  {isAssigned ? (<><Check className="size-3.5" /> Tilldelad</>) : "Tilldela"}
                </Button>
              </div>
            );
          })}
        </div>
      </div>
    </AppShell>
  );
}
