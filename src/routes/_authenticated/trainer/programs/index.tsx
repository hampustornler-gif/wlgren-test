import { createFileRoute, Link } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useState } from "react";
import { AppShell } from "@/components/app-shell";
import { createProgram, listPrograms, seedPPLPrograms } from "@/lib/app.functions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ArrowRight, Plus, Dumbbell, Sparkles } from "lucide-react";
import { toast } from "sonner";

export const Route = createFileRoute("/_authenticated/trainer/programs/")({
  component: ProgramsPage,
});

const PPL_PREVIEW = [
  { label: "Push", emoji: "💪", desc: "Bröst, axlar, triceps" },
  { label: "Pull", emoji: "🦵", desc: "Rygg, biceps" },
  { label: "Legs", emoji: "🤵", desc: "Quads, hamstrings, säten" },
];

function ProgramsPage() {
  const qc = useQueryClient();
  const fList = useServerFn(listPrograms);
  const fCreate = useServerFn(createProgram);
  const fSeed = useServerFn(seedPPLPrograms);
  const { data } = useQuery({ queryKey: ["programs"], queryFn: () => fList() });
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [showForm, setShowForm] = useState(false);

  const create = useMutation({
    mutationFn: () => fCreate({ data: { name, description } }),
    onSuccess: () => {
      setName(""); setDescription(""); setShowForm(false);
      qc.invalidateQueries({ queryKey: ["programs"] });
      toast.success("Program skapat");
    },
    onError: (e: any) => toast.error(e?.message ?? "Misslyckades"),
  });

  const seed = useMutation({
    mutationFn: () => fSeed(),
    onSuccess: (res) => {
      qc.invalidateQueries({ queryKey: ["programs"] });
      toast.success(`✨ ${res.created.join(", ")} skapade!`);
    },
    onError: (e: any) => toast.error(e?.message ?? "Misslyckades"),
  });

  const programs = data ?? [];

  return (
    <AppShell title="Program">
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-2xl font-bold text-white tracking-tight">Program</h2>
            <p className="text-white/40 text-sm mt-1">{programs.length} program</p>
          </div>
          <button
            onClick={() => setShowForm((v) => !v)}
            className="flex items-center gap-2 glass rounded-xl px-4 py-2 text-sm font-semibold text-white/70 hover:text-white transition-all btn-glow"
          >
            <Plus className="size-4" /> Nytt program
          </button>
        </div>

        {/* Create form */}
        {showForm && (
          <div className="glass rounded-2xl p-5">
            <h3 className="font-semibold text-white mb-4">Skapa program</h3>
            <form
              className="grid sm:grid-cols-[1fr_2fr_auto] gap-3 items-end"
              onSubmit={(e) => { e.preventDefault(); if (!name.trim()) return; create.mutate(); }}
            >
              <div className="space-y-1.5">
                <Label htmlFor="name" className="text-white/60 text-xs font-semibold uppercase tracking-wider">Namn</Label>
                <Input
                  id="name" value={name}
                  onChange={(e) => setName(e.target.value)}
                  maxLength={80} required
                  className="bg-white/[0.06] border-white/10 text-white rounded-xl h-10 input-premium"
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="desc" className="text-white/60 text-xs font-semibold uppercase tracking-wider">Beskrivning</Label>
                <Input
                  id="desc" value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  maxLength={500}
                  className="bg-white/[0.06] border-white/10 text-white rounded-xl h-10 input-premium"
                />
              </div>
              <Button type="submit" disabled={create.isPending} className="h-10 btn-glow">
                {create.isPending ? "Skapar…" : "Skapa"}
              </Button>
            </form>
          </div>
        )}

        {/* PPL Seed card — only shown when no programs */}
        {programs.length === 0 && (
          <div className="card-3d rounded-3xl p-6">
            <div className="flex items-center gap-3 mb-4">
              <div className="size-10 rounded-xl bg-primary/20 border border-primary/30 grid place-items-center">
                <Sparkles className="size-5 text-primary" />
              </div>
              <div>
                <div className="font-bold text-white">Kom igång snabbt</div>
                <div className="text-xs text-white/40">Skapa ett grundläggande Push/Pull/Legs-uppdelning</div>
              </div>
            </div>
            <div className="grid grid-cols-3 gap-3 mb-5">
              {PPL_PREVIEW.map((p) => (
                <div key={p.label} className="glass rounded-2xl p-3 text-center">
                  <div className="text-2xl mb-1">{p.emoji}</div>
                  <div className="text-sm font-bold text-white">{p.label}</div>
                  <div className="text-[10px] text-white/40 mt-0.5">{p.desc}</div>
                </div>
              ))}
            </div>
            <Button
              onClick={() => seed.mutate()}
              disabled={seed.isPending}
              className="w-full h-11 rounded-xl btn-glow font-semibold"
            >
              {seed.isPending ? (
                <><div className="size-3.5 rounded-full border-2 border-white/40 border-t-white animate-spin mr-2" />Skapar program…</>
              ) : (
                <><Dumbbell className="size-4 mr-2" />Skapa Push / Pull / Legs™</>
              )}
            </Button>
          </div>
        )}

        {/* Program list */}
        {programs.length > 0 && (
          <div className="space-y-2">
            {programs.map((p: any) => (
              <Link
                key={p.id}
                to="/trainer/programs/$programId"
                params={{ programId: p.id }}
                className="card-3d rounded-2xl flex items-center justify-between p-4 group hover:border-white/20 transition-all"
              >
                <div>
                  <div className="font-semibold text-white">{p.name}</div>
                  {p.description && <div className="text-xs text-white/40 mt-0.5">{p.description}</div>}
                </div>
                <ArrowRight className="size-4 text-white/20 group-hover:text-white/60 group-hover:translate-x-0.5 transition-all" />
              </Link>
            ))}
          </div>
        )}

        {/* Also show seed button as secondary option when programs exist */}
        {programs.length > 0 && (
          <button
            onClick={() => seed.mutate()}
            disabled={seed.isPending}
            className="w-full glass rounded-2xl p-4 flex items-center gap-3 hover:border-white/20 transition-all group"
          >
            <Sparkles className="size-4 text-primary/60 group-hover:text-primary transition-colors" />
            <span className="text-sm text-white/40 group-hover:text-white/70 transition-colors">
              {seed.isPending ? "Skapar…" : "Lägg till Push / Pull / Legs-mallar"}
            </span>
          </button>
        )}
      </div>
    </AppShell>
  );
}
