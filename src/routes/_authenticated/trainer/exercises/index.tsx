import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useState } from "react";
import { AppShell } from "@/components/app-shell";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { supabase } from "@/integrations/supabase/client";
import { Search, Dumbbell, ChevronDown, SlidersHorizontal } from "lucide-react";

export const Route = createFileRoute("/_authenticated/trainer/exercises/")(
  { component: ExercisesPage }
);

const MUSCLES = ["", "abdominals", "biceps", "chest", "shoulders", "triceps", "quadriceps", "hamstrings", "glutes", "back", "calves", "forearms", "lats", "traps", "abductors", "adductors", "neck", "middle back", "lower back"];
const LEVELS  = ["", "beginner", "intermediate", "expert"];
const PAGE_SIZE = 24;

async function fetchExercises({
  search, muscle, level, page,
}: { search: string; muscle: string; level: string; page: number }) {
  const from = page * PAGE_SIZE;
  const to   = from + PAGE_SIZE - 1;
  let q = (supabase as any)
    .from("global_exercises")
    .select("id,name,primary_muscle,equipment,level,category,image_url,image_url_2,instructions", { count: "exact" })
    .order("name")
    .range(from, to);
  if (search) q = q.ilike("name", `%${search}%`);
  if (muscle) q = q.eq("primary_muscle", muscle);
  if (level)  q = q.eq("level", level);
  const { data, count } = await q;
  return { data: data ?? [], count: count ?? 0 };
}

const levelColor: Record<string, string> = {
  beginner:     "border-emerald-500/40 text-emerald-400 bg-emerald-500/10",
  intermediate: "border-yellow-500/40 text-yellow-400 bg-yellow-500/10",
  expert:       "border-red-500/40 text-red-400 bg-red-500/10",
};

const levelLabel: Record<string, string> = {
  beginner: "Nybörjare",
  intermediate: "Medel",
  expert: "Expert",
};

function ExerciseCard({ ex }: { ex: any }) {
  const [open, setOpen] = useState(false);
  return (
    <div
      className="card-3d rounded-2xl overflow-hidden cursor-pointer group"
      onClick={() => setOpen(!open)}
    >
      {/* Image */}
      {ex.image_url ? (
        <div className="relative overflow-hidden">
          <img
            src={ex.image_url}
            alt={ex.name}
            className="w-full h-44 object-cover bg-white/5 group-hover:scale-105 transition-transform duration-500"
            loading="lazy"
            onError={(e) => { (e.target as HTMLImageElement).style.display = "none"; }}
          />
          <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent" />
          {ex.level && (
            <div className="absolute top-2.5 right-2.5">
              <Badge variant="outline" className={`text-[10px] font-semibold ${levelColor[ex.level] ?? ""}`}>
                {levelLabel[ex.level] ?? ex.level}
              </Badge>
            </div>
          )}
        </div>
      ) : (
        <div className="w-full h-44 bg-white/[0.04] grid place-items-center text-white/20 relative">
          <Dumbbell className="size-10" />
          {ex.level && (
            <div className="absolute top-2.5 right-2.5">
              <Badge variant="outline" className={`text-[10px] font-semibold ${levelColor[ex.level] ?? ""}`}>
                {levelLabel[ex.level] ?? ex.level}
              </Badge>
            </div>
          )}
        </div>
      )}

      {/* Content */}
      <div className="p-4">
        <div className="font-semibold text-sm text-white leading-snug mb-2.5">{ex.name}</div>
        <div className="flex flex-wrap gap-1.5">
          {ex.primary_muscle && (
            <Badge variant="outline" className="text-[10px] border-primary/30 text-primary/80 bg-primary/8">
              {ex.primary_muscle}
            </Badge>
          )}
          {ex.equipment && (
            <Badge variant="outline" className="text-[10px] border-white/15 text-white/40">
              {ex.equipment}
            </Badge>
          )}
        </div>

        {/* Expandable instructions */}
        {open && (
          <div className="mt-3 pt-3 border-t border-white/[0.06] space-y-3">
            {ex.instructions && (
              <p className="text-xs text-white/50 leading-relaxed">
                {ex.instructions.slice(0, 500)}{ex.instructions.length > 500 ? "…" : ""}
              </p>
            )}
            {ex.image_url_2 && (
              <img
                src={ex.image_url_2}
                alt={ex.name + " 2"}
                className="w-full rounded-xl object-cover"
                loading="lazy"
              />
            )}
          </div>
        )}

        <button className="mt-2.5 flex items-center gap-1 text-[10px] text-white/30 hover:text-white/60 transition-colors">
          <ChevronDown className={`size-3 transition-transform duration-200 ${open ? "rotate-180" : ""}`} />
          {open ? "Dölj" : "Visa detaljer"}
        </button>
      </div>
    </div>
  );
}

function ExercisesPage() {
  const [search, setSearch] = useState("");
  const [muscle, setMuscle] = useState("");
  const [level,  setLevel]  = useState("");
  const [page,   setPage]   = useState(0);
  const [allItems, setAllItems] = useState<any[]>([]);

  const { data, isLoading, isFetching } = useQuery({
    queryKey: ["global-exercises", search, muscle, level, page],
    queryFn: async () => {
      const result = await fetchExercises({ search, muscle, level, page });
      if (page === 0) {
        setAllItems(result.data);
      } else {
        setAllItems((prev) => [...prev, ...result.data]);
      }
      return result;
    },
    staleTime: 60_000,
  });

  const resetPage = () => {
    setPage(0);
    setAllItems([]);
  };

  const total = data?.count ?? 0;
  const hasMore = allItems.length < total;

  return (
    <AppShell title="Övningsbibliotek">
      {/* Header */}
      <div className="mb-6">
        <h2 className="text-2xl font-bold text-white tracking-tight">Övningsbibliotek</h2>
        <p className="text-white/40 text-sm mt-1">
          {isLoading ? "Laddar…" : `${total} övningar totalt`}
        </p>
      </div>

      {/* Filters */}
      <div className="glass rounded-2xl p-4 mb-6 flex flex-wrap gap-3 items-center">
        <SlidersHorizontal className="size-4 text-white/30 shrink-0" />
        <div className="relative flex-1 min-w-[180px]">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-white/30" />
          <Input
            className="pl-9 bg-white/[0.06] border-white/10 text-white placeholder:text-white/25 rounded-xl h-9 text-sm input-premium"
            placeholder="Sök övning…"
            value={search}
            onChange={(e) => { setSearch(e.target.value); resetPage(); }}
          />
        </div>
        <select
          value={muscle}
          onChange={(e) => { setMuscle(e.target.value); resetPage(); }}
          className="rounded-xl border border-white/10 bg-white/[0.06] px-3 py-2 text-sm text-white/70 outline-none h-9 focus:border-primary/50 transition-colors"
        >
          <option value="">Alla muskler</option>
          {MUSCLES.filter(Boolean).map((m) => (
            <option key={m} value={m}>{m.charAt(0).toUpperCase() + m.slice(1)}</option>
          ))}
        </select>
        <select
          value={level}
          onChange={(e) => { setLevel(e.target.value); resetPage(); }}
          className="rounded-xl border border-white/10 bg-white/[0.06] px-3 py-2 text-sm text-white/70 outline-none h-9 focus:border-primary/50 transition-colors"
        >
          <option value="">Alla nivåer</option>
          <option value="beginner">Nybörjare</option>
          <option value="intermediate">Medel</option>
          <option value="expert">Expert</option>
        </select>
      </div>

      {/* Results info */}
      <p className="text-xs text-white/30 mb-4">
        {isFetching && !isLoading ? "Laddar fler…" : `Visar ${allItems.length} av ${total}`}
      </p>

      {/* Grid */}
      {isLoading && allItems.length === 0 ? (
        <div className="flex items-center gap-3 text-white/40 py-16 justify-center">
          <div className="size-5 rounded-full border-2 border-white/20 border-t-white/60 animate-spin" />
          <span className="text-sm">Laddar övningar…</span>
        </div>
      ) : allItems.length === 0 ? (
        <div className="glass rounded-2xl p-12 text-center">
          <Dumbbell className="size-10 text-white/20 mx-auto mb-3" />
          <p className="text-white/40 text-sm">Inga övningar hittades.</p>
        </div>
      ) : (
        <>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            {allItems.map((ex: any) => <ExerciseCard key={ex.id} ex={ex} />)}
          </div>

          {/* Load more */}
          {hasMore && (
            <div className="mt-8 flex justify-center">
              <button
                onClick={() => setPage((p) => p + 1)}
                disabled={isFetching}
                className="glass rounded-2xl px-8 py-3 text-sm font-semibold text-white/70 hover:text-white transition-all hover:border-white/20 disabled:opacity-50 flex items-center gap-2"
              >
                {isFetching ? (
                  <><div className="size-3.5 rounded-full border-2 border-white/30 border-t-white animate-spin" /> Laddar…</>
                ) : (
                  <><ChevronDown className="size-4" /> Ladda fler ({total - allItems.length} kvar)</>
                )}
              </button>
            </div>
          )}
        </>
      )}
    </AppShell>
  );
}
