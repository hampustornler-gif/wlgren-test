import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useEffect, useState } from "react";
import { AppShell } from "@/components/app-shell";
import {
  addProgramExercise,
  assignProgram,
  deleteProgram,
  getProgram,
  listClients,
  listExercises,
  removeProgramExercise,
  unassignProgram,
  updateProgram,
} from "@/lib/app.functions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Trash2, Check, ChevronLeft, AlertTriangle, Pencil, X } from "lucide-react";
import { toast } from "sonner";

export const Route = createFileRoute("/_authenticated/trainer/programs/$programId")({
  component: ProgramDetail,
});

function ProgramDetail() {
  const { programId } = Route.useParams();
  const nav = useNavigate();
  const qc = useQueryClient();
  const fGet = useServerFn(getProgram);
  const fEx = useServerFn(listExercises);
  const fCli = useServerFn(listClients);
  const fAdd = useServerFn(addProgramExercise);
  const fRem = useServerFn(removeProgramExercise);
  const fAss = useServerFn(assignProgram);
  const fUna = useServerFn(unassignProgram);
  const fDel = useServerFn(deleteProgram);
  const fUpd = useServerFn(updateProgram);

  const prog = useQuery({ queryKey: ["program", programId], queryFn: () => fGet({ data: { programId } }) });
  const exs = useQuery({ queryKey: ["exercises"], queryFn: () => fEx() });
  const clients = useQuery({ queryKey: ["clients"], queryFn: () => fCli() });

  const invalidate = () => qc.invalidateQueries({ queryKey: ["program", programId] });
  const add = useMutation({ mutationFn: fAdd, onSuccess: invalidate });
  const rem = useMutation({ mutationFn: fRem, onSuccess: invalidate });
  const ass = useMutation({ mutationFn: fAss, onSuccess: () => { invalidate(); toast.success("Tilldelat"); } });
  const una = useMutation({ mutationFn: fUna, onSuccess: invalidate });
  const del = useMutation({
    mutationFn: () => fDel({ data: { programId } }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["programs"] });
      toast.success("Program raderat");
      nav({ to: "/trainer/programs" });
    },
    onError: (e: any) => toast.error(e?.message ?? "Misslyckades"),
  });

  // --- Edit state ---
  const [editing, setEditing] = useState(false);
  const [editName, setEditName] = useState("");
  const [editDesc, setEditDesc] = useState("");

  // Sync fields when program loads
  useEffect(() => {
    if (prog.data?.program && !editing) {
      setEditName(prog.data.program.name ?? "");
      setEditDesc(prog.data.program.description ?? "");
    }
  }, [prog.data?.program]);

  const upd = useMutation({
    mutationFn: () => fUpd({ data: { programId, name: editName, description: editDesc } }),
    onSuccess: () => {
      invalidate();
      qc.invalidateQueries({ queryKey: ["programs"] });
      toast.success("Sparat");
      setEditing(false);
    },
    onError: (e: any) => toast.error(e?.message ?? "Misslyckades"),
  });

  const [exerciseId, setExerciseId] = useState("");
  const [sets, setSets] = useState(3);
  const [reps, setReps] = useState(10);
  const [rest, setRest] = useState(90);
  const [confirmDelete, setConfirmDelete] = useState(false);

  const items = prog.data?.items ?? [];
  const assignedIds = new Set((prog.data?.assignments ?? []).map((a: any) => a.client_id));
  const myClients = (clients.data ?? []).filter((c) => c.trainer_id);

  return (
    <AppShell title={prog.data?.program?.name ?? "Program"}>
      {/* Back + delete header */}
      <div className="flex items-center justify-between mb-6">
        <Link to="/trainer/programs" className="flex items-center gap-1.5 text-sm text-white/40 hover:text-white transition-colors">
          <ChevronLeft className="size-4" /> Tillbaka
        </Link>

        {!confirmDelete ? (
          <button
            onClick={() => setConfirmDelete(true)}
            className="flex items-center gap-1.5 text-sm text-white/30 hover:text-red-400 transition-colors"
          >
            <Trash2 className="size-4" /> Radera program
          </button>
        ) : (
          <div className="flex items-center gap-3 glass rounded-xl px-4 py-2">
            <AlertTriangle className="size-4 text-red-400 shrink-0" />
            <span className="text-sm text-white/60">Radera?</span>
            <button
              onClick={() => del.mutate()}
              disabled={del.isPending}
              className="px-3 py-1 rounded-lg bg-red-500/20 border border-red-500/30 text-red-400 text-xs font-semibold hover:bg-red-500/30 transition-all"
            >
              {del.isPending ? "Raderar…" : "Ja, radera"}
            </button>
            <button onClick={() => setConfirmDelete(false)} className="text-white/30 text-xs hover:text-white/60">
              Avbryt
            </button>
          </div>
        )}
      </div>

      {/* === EDIT NAME & DESCRIPTION === */}
      <div className="glass rounded-2xl p-5 mb-6">
        {!editing ? (
          <div className="flex items-start justify-between gap-4">
            <div className="min-w-0">
              <h2 className="text-xl font-bold text-white truncate">{prog.data?.program?.name}</h2>
              {prog.data?.program?.description && (
                <p className="text-sm text-white/40 mt-1">{prog.data.program.description}</p>
              )}
              {!prog.data?.program?.description && (
                <p className="text-sm text-white/20 mt-1 italic">Ingen beskrivning</p>
              )}
            </div>
            <button
              onClick={() => setEditing(true)}
              className="shrink-0 flex items-center gap-1.5 text-xs font-semibold text-white/30 hover:text-white/70 glass rounded-lg px-3 py-1.5 transition-all"
            >
              <Pencil className="size-3.5" /> Redigera
            </button>
          </div>
        ) : (
          <form
            onSubmit={(e) => { e.preventDefault(); if (!editName.trim()) return; upd.mutate(); }}
            className="space-y-3"
          >
            <div className="flex items-center justify-between mb-1">
              <span className="text-xs font-bold uppercase tracking-widest text-white/30">Redigera program</span>
              <button
                type="button"
                onClick={() => { setEditing(false); setEditName(prog.data?.program?.name ?? ""); setEditDesc(prog.data?.program?.description ?? ""); }}
                className="text-white/30 hover:text-white/60 transition-colors"
              >
                <X className="size-4" />
              </button>
            </div>
            <div className="space-y-1.5">
              <Label className="text-white/50 text-xs font-semibold uppercase tracking-wider">Namn</Label>
              <Input
                value={editName}
                onChange={(e) => setEditName(e.target.value)}
                maxLength={80}
                required
                autoFocus
                className="bg-white/[0.06] border-white/10 text-white rounded-xl h-10 input-premium"
              />
            </div>
            <div className="space-y-1.5">
              <Label className="text-white/50 text-xs font-semibold uppercase tracking-wider">Beskrivning</Label>
              <Input
                value={editDesc}
                onChange={(e) => setEditDesc(e.target.value)}
                maxLength={500}
                placeholder="Valfri beskrivning…"
                className="bg-white/[0.06] border-white/10 text-white rounded-xl h-10 input-premium placeholder:text-white/20"
              />
            </div>
            <div className="flex gap-2 pt-1">
              <Button type="submit" disabled={upd.isPending} className="btn-glow h-9 text-sm">
                {upd.isPending ? "Sparar…" : "Spara"}
              </Button>
              <Button
                type="button"
                variant="ghost"
                onClick={() => { setEditing(false); setEditName(prog.data?.program?.name ?? ""); setEditDesc(prog.data?.program?.description ?? ""); }}
                className="h-9 text-sm text-white/40 hover:text-white"
              >
                Avbryt
              </Button>
            </div>
          </form>
        )}
      </div>

      {/* Add exercise */}
      <div className="glass rounded-2xl p-5 mb-6">
        <h2 className="font-semibold text-white mb-4">Lägg till övning</h2>
        <form
          className="grid sm:grid-cols-[2fr_repeat(3,1fr)_auto] gap-3 items-end"
          onSubmit={(e) => {
            e.preventDefault();
            if (!exerciseId) return;
            add.mutate({ data: { programId, exerciseId, target_sets: sets, target_reps: reps, rest_seconds: rest } });
          }}
        >
          <div className="space-y-1.5">
            <Label className="text-white/60 text-xs font-semibold uppercase tracking-wider">Övning</Label>
            <Select value={exerciseId} onValueChange={setExerciseId}>
              <SelectTrigger className="bg-white/[0.06] border-white/10 text-white rounded-xl h-10">
                <SelectValue placeholder="Välj…" />
              </SelectTrigger>
              <SelectContent className="bg-[oklch(0.12_0.03_265)] border-white/10 text-white">
                {(exs.data ?? []).map((e: any) => (
                  <SelectItem key={e.id} value={e.id} className="focus:bg-white/8 focus:text-white">{e.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1.5">
            <Label className="text-white/60 text-xs font-semibold uppercase tracking-wider">Set</Label>
            <Input type="number" min={1} max={30} value={sets} onChange={(e) => setSets(+e.target.value)}
              className="bg-white/[0.06] border-white/10 text-white rounded-xl h-10" />
          </div>
          <div className="space-y-1.5">
            <Label className="text-white/60 text-xs font-semibold uppercase tracking-wider">Reps</Label>
            <Input type="number" min={1} max={100} value={reps} onChange={(e) => setReps(+e.target.value)}
              className="bg-white/[0.06] border-white/10 text-white rounded-xl h-10" />
          </div>
          <div className="space-y-1.5">
            <Label className="text-white/60 text-xs font-semibold uppercase tracking-wider">Vila (s)</Label>
            <Input type="number" min={0} max={600} value={rest} onChange={(e) => setRest(+e.target.value)}
              className="bg-white/[0.06] border-white/10 text-white rounded-xl h-10" />
          </div>
          <Button type="submit" className="h-10 btn-glow">Lägg till</Button>
        </form>
      </div>

      {/* Exercise list */}
      <div className="space-y-2 mb-8">
        {items.map((it: any) => (
          <div key={it.id} className="card-3d rounded-2xl flex items-center justify-between p-4">
            <div>
              <div className="font-semibold text-white">{it.exercises?.name}</div>
              <div className="text-xs text-white/40 mt-0.5">
                {it.target_sets} set × {it.target_reps} reps &middot; vila {it.rest_seconds}s
              </div>
            </div>
            <button
              onClick={() => rem.mutate({ data: { id: it.id } })}
              className="p-2 text-white/20 hover:text-red-400 transition-colors rounded-lg hover:bg-red-500/10"
            >
              <Trash2 className="size-4" />
            </button>
          </div>
        ))}
        {items.length === 0 && (
          <div className="glass rounded-2xl p-8 text-center text-white/30 text-sm">
            Inga övningar än. Lägg till en övning ovan.
          </div>
        )}
      </div>

      {/* Assign to clients */}
      <div>
        <h2 className="text-xs font-semibold uppercase tracking-widest text-white/30 mb-3">Tilldela till kunder</h2>
        <div className="space-y-2">
          {myClients.length === 0 && (
            <div className="glass rounded-2xl p-6 text-center text-white/30 text-sm">Inga kunder ännu.</div>
          )}
          {myClients.map((c) => {
            const isAssigned = assignedIds.has(c.id);
            return (
              <div key={c.id} className="card-3d rounded-2xl flex items-center justify-between p-4">
                <div className="font-semibold text-white">{c.display_name || "Namnlös"}</div>
                <Button
                  size="sm"
                  variant={isAssigned ? "secondary" : "outline"}
                  className={isAssigned
                    ? "bg-emerald-500/15 border-emerald-500/30 text-emerald-400 hover:bg-emerald-500/25"
                    : "border-white/10 text-white/50 hover:text-white hover:bg-white/8"
                  }
                  onClick={() =>
                    isAssigned
                      ? una.mutate({ data: { programId, clientId: c.id } })
                      : ass.mutate({ data: { programId, clientId: c.id } })
                  }
                >
                  {isAssigned ? (<><Check className="size-3.5 mr-1" /> Tilldelad</>) : "Tilldela"}
                </Button>
              </div>
            );
          })}
        </div>
      </div>
    </AppShell>
  );
}
