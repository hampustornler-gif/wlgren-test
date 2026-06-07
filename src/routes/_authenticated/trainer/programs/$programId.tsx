import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useEffect, useMemo, useRef, useState } from "react";
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
import { Trash2, Check, ChevronLeft, AlertTriangle, Pencil, X, Search } from "lucide-react";
import { toast } from "sonner";

export const Route = createFileRoute("/_authenticated/trainer/programs/$programId")({
  component: ProgramDetail,
});

// ---- Combobox for exercises with search ----
function ExerciseCombobox({
  exercises,
  value,
  onChange,
}: {
  exercises: any[];
  value: string;
  onChange: (id: string) => void;
}) {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState("");
  const ref = useRef<HTMLDivElement>(null);

  const selected = exercises.find((e) => e.id === value);

  const filtered = useMemo(() => {
    const q = search.toLowerCase().trim();
    if (!q) return exercises.slice(0, 80);
    return exercises.filter((e) => e.name.toLowerCase().includes(q)).slice(0, 80);
  }, [exercises, search]);

  // close on outside click
  useEffect(() => {
    function handler(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  return (
    <div ref={ref} className="relative">
      <button
        type="button"
        onClick={() => { setOpen((v) => !v); setSearch(""); }}
        className="w-full flex items-center justify-between bg-white/[0.06] border border-white/10 text-white rounded-xl h-10 px-3 text-sm hover:bg-white/[0.09] transition-colors"
      >
        <span className={selected ? "text-white" : "text-white/30"}>
          {selected ? selected.name : "Sök övning…"}
        </span>
        <Search className="size-3.5 text-white/30 shrink-0" />
      </button>

      {open && (
        <div className="absolute z-50 top-[calc(100%+4px)] left-0 right-0 bg-[oklch(0.14_0.03_265)] border border-white/10 rounded-xl shadow-2xl overflow-hidden">
          <div className="p-2 border-b border-white/8">
            <div className="flex items-center gap-2 bg-white/[0.06] rounded-lg px-3 h-8">
              <Search className="size-3.5 text-white/30 shrink-0" />
              <input
                autoFocus
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Sök…"
                className="flex-1 bg-transparent text-white text-sm outline-none placeholder:text-white/30"
              />
              {search && (
                <button type="button" onClick={() => setSearch("")} className="text-white/30 hover:text-white/60">
                  <X className="size-3.5" />
                </button>
              )}
            </div>
          </div>
          <div className="max-h-56 overflow-y-auto">
            {filtered.length === 0 && (
              <div className="p-4 text-center text-sm text-white/30">Inga övningar hittades</div>
            )}
            {filtered.map((e) => (
              <button
                key={e.id}
                type="button"
                onClick={() => { onChange(e.id); setOpen(false); setSearch(""); }}
                className={`w-full text-left px-3 py-2 text-sm transition-colors hover:bg-white/8 ${
                  e.id === value ? "text-primary bg-primary/10" : "text-white/80"
                }`}
              >
                <span>{e.name}</span>
                {e.primary_muscle && (
                  <span className="ml-2 text-[10px] text-white/30">{e.primary_muscle}</span>
                )}
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

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

  // --- Add exercise state ---
  const [muscleFilter, setMuscleFilter] = useState("all");
  const [exerciseId, setExerciseId] = useState("");
  const [sets, setSets] = useState(3);
  const [reps, setReps] = useState(10);
  const [rest, setRest] = useState(90);
  const [confirmDelete, setConfirmDelete] = useState(false);

  const allExercises: any[] = exs.data ?? [];

  // Unique sorted muscle groups
  const muscleGroups = useMemo(() => {
    const groups = new Set<string>();
    allExercises.forEach((e) => { if (e.primary_muscle) groups.add(e.primary_muscle); });
    return Array.from(groups).sort();
  }, [allExercises]);

  // Filter exercises by muscle group
  const filteredExercises = useMemo(() => {
    if (muscleFilter === "all") return allExercises;
    return allExercises.filter((e) => e.primary_muscle === muscleFilter);
  }, [allExercises, muscleFilter]);

  // Reset exercise selection when muscle group changes
  const handleMuscleChange = (val: string) => {
    setMuscleFilter(val);
    setExerciseId("");
  };

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
          <button onClick={() => setConfirmDelete(true)} className="flex items-center gap-1.5 text-sm text-white/30 hover:text-red-400 transition-colors">
            <Trash2 className="size-4" /> Radera program
          </button>
        ) : (
          <div className="flex items-center gap-3 glass rounded-xl px-4 py-2">
            <AlertTriangle className="size-4 text-red-400 shrink-0" />
            <span className="text-sm text-white/60">Radera?</span>
            <button onClick={() => del.mutate()} disabled={del.isPending} className="px-3 py-1 rounded-lg bg-red-500/20 border border-red-500/30 text-red-400 text-xs font-semibold hover:bg-red-500/30 transition-all">
              {del.isPending ? "Raderar…" : "Ja, radera"}
            </button>
            <button onClick={() => setConfirmDelete(false)} className="text-white/30 text-xs hover:text-white/60">Avbryt</button>
          </div>
        )}
      </div>

      {/* === EDIT NAME & DESCRIPTION === */}
      <div className="glass rounded-2xl p-5 mb-6">
        {!editing ? (
          <div className="flex items-start justify-between gap-4">
            <div className="min-w-0">
              <h2 className="text-xl font-bold text-white truncate">{prog.data?.program?.name}</h2>
              {prog.data?.program?.description
                ? <p className="text-sm text-white/40 mt-1">{prog.data.program.description}</p>
                : <p className="text-sm text-white/20 mt-1 italic">Ingen beskrivning</p>
              }
            </div>
            <button onClick={() => setEditing(true)} className="shrink-0 flex items-center gap-1.5 text-xs font-semibold text-white/30 hover:text-white/70 glass rounded-lg px-3 py-1.5 transition-all">
              <Pencil className="size-3.5" /> Redigera
            </button>
          </div>
        ) : (
          <form onSubmit={(e) => { e.preventDefault(); if (!editName.trim()) return; upd.mutate(); }} className="space-y-3">
            <div className="flex items-center justify-between mb-1">
              <span className="text-xs font-bold uppercase tracking-widest text-white/30">Redigera program</span>
              <button type="button" onClick={() => { setEditing(false); setEditName(prog.data?.program?.name ?? ""); setEditDesc(prog.data?.program?.description ?? ""); }} className="text-white/30 hover:text-white/60 transition-colors">
                <X className="size-4" />
              </button>
            </div>
            <div className="space-y-1.5">
              <Label className="text-white/50 text-xs font-semibold uppercase tracking-wider">Namn</Label>
              <Input value={editName} onChange={(e) => setEditName(e.target.value)} maxLength={80} required autoFocus className="bg-white/[0.06] border-white/10 text-white rounded-xl h-10 input-premium" />
            </div>
            <div className="space-y-1.5">
              <Label className="text-white/50 text-xs font-semibold uppercase tracking-wider">Beskrivning</Label>
              <Input value={editDesc} onChange={(e) => setEditDesc(e.target.value)} maxLength={500} placeholder="Valfri beskrivning…" className="bg-white/[0.06] border-white/10 text-white rounded-xl h-10 input-premium placeholder:text-white/20" />
            </div>
            <div className="flex gap-2 pt-1">
              <Button type="submit" disabled={upd.isPending} className="btn-glow h-9 text-sm">{upd.isPending ? "Sparar…" : "Spara"}</Button>
              <Button type="button" variant="ghost" onClick={() => { setEditing(false); setEditName(prog.data?.program?.name ?? ""); setEditDesc(prog.data?.program?.description ?? ""); }} className="h-9 text-sm text-white/40 hover:text-white">Avbryt</Button>
            </div>
          </form>
        )}
      </div>

      {/* === ADD EXERCISE === */}
      <div className="glass rounded-2xl p-5 mb-6">
        <h2 className="font-semibold text-white mb-4">Lägg till övning</h2>
        <form
          className="space-y-3"
          onSubmit={(e) => {
            e.preventDefault();
            if (!exerciseId) return;
            add.mutate({ data: { programId, exerciseId, target_sets: sets, target_reps: reps, rest_seconds: rest } });
          }}
        >
          {/* Row 1: muscle filter + exercise search */}
          <div className="grid sm:grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label className="text-white/60 text-xs font-semibold uppercase tracking-wider">Muskelgrupp</Label>
              <Select value={muscleFilter} onValueChange={handleMuscleChange}>
                <SelectTrigger className="bg-white/[0.06] border-white/10 text-white rounded-xl h-10">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="bg-[oklch(0.12_0.03_265)] border-white/10 text-white">
                  <SelectItem value="all" className="focus:bg-white/8 focus:text-white">Alla muskelgrupper</SelectItem>
                  {muscleGroups.map((m) => (
                    <SelectItem key={m} value={m} className="focus:bg-white/8 focus:text-white capitalize">{m}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label className="text-white/60 text-xs font-semibold uppercase tracking-wider">Övning</Label>
              <ExerciseCombobox exercises={filteredExercises} value={exerciseId} onChange={setExerciseId} />
            </div>
          </div>

          {/* Row 2: sets / reps / rest / submit */}
          <div className="grid grid-cols-[1fr_1fr_1fr_auto] gap-3 items-end">
            <div className="space-y-1.5">
              <Label className="text-white/60 text-xs font-semibold uppercase tracking-wider">Set</Label>
              <Input type="number" min={1} max={30} value={sets} onChange={(e) => setSets(+e.target.value)} className="bg-white/[0.06] border-white/10 text-white rounded-xl h-10" />
            </div>
            <div className="space-y-1.5">
              <Label className="text-white/60 text-xs font-semibold uppercase tracking-wider">Reps</Label>
              <Input type="number" min={1} max={100} value={reps} onChange={(e) => setReps(+e.target.value)} className="bg-white/[0.06] border-white/10 text-white rounded-xl h-10" />
            </div>
            <div className="space-y-1.5">
              <Label className="text-white/60 text-xs font-semibold uppercase tracking-wider">Vila (s)</Label>
              <Input type="number" min={0} max={600} value={rest} onChange={(e) => setRest(+e.target.value)} className="bg-white/[0.06] border-white/10 text-white rounded-xl h-10" />
            </div>
            <Button type="submit" disabled={!exerciseId || add.isPending} className="h-10 btn-glow">
              {add.isPending ? "Sparar…" : "Lägg till"}
            </Button>
          </div>
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
            <button onClick={() => rem.mutate({ data: { id: it.id } })} className="p-2 text-white/20 hover:text-red-400 transition-colors rounded-lg hover:bg-red-500/10">
              <Trash2 className="size-4" />
            </button>
          </div>
        ))}
        {items.length === 0 && (
          <div className="glass rounded-2xl p-8 text-center text-white/30 text-sm">Inga övningar än. Lägg till en övning ovan.</div>
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
                  className={isAssigned ? "bg-emerald-500/15 border-emerald-500/30 text-emerald-400 hover:bg-emerald-500/25" : "border-white/10 text-white/50 hover:text-white hover:bg-white/8"}
                  onClick={() => isAssigned ? una.mutate({ data: { programId, clientId: c.id } }) : ass.mutate({ data: { programId, clientId: c.id } })}
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
