import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useState } from "react";
import { AppShell } from "@/components/app-shell";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { supabase } from "@/integrations/supabase/client";
import { Search, Dumbbell } from "lucide-react";

export const Route = createFileRoute("/_authenticated/trainer/exercises/")(
  { component: ExercisesPage }
);

const MUSCLES = ["", "abdominals", "biceps", "chest", "shoulders", "triceps", "quadriceps", "hamstrings", "glutes", "back", "calves", "forearms", "lats", "traps", "abductors", "adductors", "neck", "middle back", "lower back"];
const LEVELS  = ["", "beginner", "intermediate", "expert"];

async function fetchExercises({ search, muscle, level }: { search: string; muscle: string; level: string }) {
  let q = supabase.from("global_exercises").select("id,name,primary_muscle,equipment,level,category,image_url,image_url_2,instructions").order("name");
  if (search) q = q.ilike("name", `%${search}%`);
  if (muscle) q = q.eq("primary_muscle", muscle);
  if (level)  q = q.eq("level", level);
  const { data } = await q.limit(60);
  return data ?? [];
}

const levelColor: Record<string, string> = {
  beginner:     "border-emerald-500 text-emerald-400 bg-emerald-500/10",
  intermediate: "border-yellow-500 text-yellow-400 bg-yellow-500/10",
  expert:       "border-red-500 text-red-400 bg-red-500/10",
};

function ExerciseCard({ ex }: { ex: any }) {
  const [open, setOpen] = useState(false);
  return (
    <div
      className="bg-card border border-border rounded-2xl overflow-hidden cursor-pointer hover:border-primary/50 transition"
      onClick={() => setOpen(!open)}
    >
      {ex.image_url ? (
        <img
          src={ex.image_url}
          alt={ex.name}
          className="w-full h-44 object-cover bg-muted"
          loading="lazy"
          onError={(e) => { (e.target as HTMLImageElement).style.display = "none"; }}
        />
      ) : (
        <div className="w-full h-44 bg-muted grid place-items-center text-muted-foreground">
          <Dumbbell className="size-10 opacity-20" />
        </div>
      )}
      <div className="p-4">
        <div className="font-semibold text-sm leading-tight mb-2">{ex.name}</div>
        <div className="flex flex-wrap gap-1.5">
          {ex.primary_muscle && (
            <Badge variant="outline" className="text-xs border-primary/40 text-primary/80">{ex.primary_muscle}</Badge>
          )}
          {ex.level && (
            <Badge variant="outline" className={`text-xs ${levelColor[ex.level] ?? ""}`}>{ex.level}</Badge>
          )}
          {ex.equipment && (
            <Badge variant="outline" className="text-xs text-muted-foreground">{ex.equipment}</Badge>
          )}
        </div>
        {open && ex.instructions && (
          <p className="mt-3 text-xs text-muted-foreground leading-relaxed border-t border-border pt-3">
            {ex.instructions.slice(0, 400)}{ex.instructions.length > 400 ? "…" : ""}
          </p>
        )}
        {open && ex.image_url_2 && (
          <img src={ex.image_url_2} alt={ex.name + " 2"} className="mt-3 w-full rounded-lg object-cover" loading="lazy" />
        )}
      </div>
    </div>
  );
}

function ExercisesPage() {
  const [search, setSearch] = useState("");
  const [muscle, setMuscle] = useState("");
  const [level,  setLevel]  = useState("");

  const { data = [], isLoading } = useQuery({
    queryKey: ["global-exercises", search, muscle, level],
    queryFn:  () => fetchExercises({ search, muscle, level }),
    staleTime: 60_000,
  });

  return (
    <AppShell title="Övningsbibliotek">
      {/* Filters */}
      <div className="flex flex-wrap gap-3 mb-6">
        <div className="relative flex-1 min-w-[200px]">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
          <Input
            className="pl-9"
            placeholder="Sök övning…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
        <select
          value={muscle}
          onChange={(e) => setMuscle(e.target.value)}
          className="rounded-xl border border-border bg-card px-3 py-2 text-sm text-foreground outline-none"
        >
          <option value="">Alla muskler</option>
          {MUSCLES.filter(Boolean).map((m) => (
            <option key={m} value={m}>{m.charAt(0).toUpperCase() + m.slice(1)}</option>
          ))}
        </select>
        <select
          value={level}
          onChange={(e) => setLevel(e.target.value)}
          className="rounded-xl border border-border bg-card px-3 py-2 text-sm text-foreground outline-none"
        >
          <option value="">Alla nivåer</option>
          {LEVELS.filter(Boolean).map((l) => (
            <option key={l} value={l}>{l.charAt(0).toUpperCase() + l.slice(1)}</option>
          ))}
        </select>
      </div>

      <p className="text-xs text-muted-foreground mb-4">{isLoading ? "Laddar…" : `${data.length} övningar visas`}</p>

      {/* Grid */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
        {data.map((ex: any) => <ExerciseCard key={ex.id} ex={ex} />)}
      </div>

      {!isLoading && data.length === 0 && (
        <div className="mt-16 text-center text-muted-foreground text-sm">Inga övningar hittades.</div>
      )}
    </AppShell>
  );
}
