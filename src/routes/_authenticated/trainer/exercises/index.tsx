import { createFileRoute } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useState } from "react";
import { AppShell } from "@/components/app-shell";
import { createExercise, listExercises } from "@/lib/app.functions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";

export const Route = createFileRoute("/_authenticated/trainer/exercises/")({
  component: ExercisesPage,
});

function ExercisesPage() {
  const qc = useQueryClient();
  const fList = useServerFn(listExercises);
  const fCreate = useServerFn(createExercise);
  const { data } = useQuery({ queryKey: ["exercises"], queryFn: () => fList() });
  const [name, setName] = useState("");
  const [notes, setNotes] = useState("");
  const create = useMutation({
    mutationFn: () => fCreate({ data: { name, notes } }),
    onSuccess: () => {
      setName("");
      setNotes("");
      qc.invalidateQueries({ queryKey: ["exercises"] });
      toast.success("Övning tillagd");
    },
  });

  return (
    <AppShell title="Övningar">
      <div className="bg-card border border-border rounded-xl p-5 mb-6">
        <h2 className="font-medium mb-3">Lägg till övning</h2>
        <form
          className="grid sm:grid-cols-[1fr_2fr_auto] gap-3 items-end"
          onSubmit={(e) => {
            e.preventDefault();
            if (!name.trim()) return;
            create.mutate();
          }}
        >
          <div className="space-y-1.5">
            <Label htmlFor="name">Namn</Label>
            <Input id="name" value={name} onChange={(e) => setName(e.target.value)} maxLength={80} required />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="notes">Anteckning</Label>
            <Input id="notes" value={notes} onChange={(e) => setNotes(e.target.value)} maxLength={500} />
          </div>
          <Button type="submit" disabled={create.isPending}>Lägg till</Button>
        </form>
      </div>

      <div className="bg-card border border-border rounded-xl divide-y divide-border">
        {(data ?? []).map((e) => (
          <div key={e.id} className="p-4">
            <div className="font-medium">{e.name}</div>
            {e.notes && <div className="text-xs text-muted-foreground mt-0.5">{e.notes}</div>}
          </div>
        ))}
        {(data ?? []).length === 0 && (
          <div className="p-6 text-sm text-muted-foreground">Inga övningar än.</div>
        )}
      </div>
    </AppShell>
  );
}
