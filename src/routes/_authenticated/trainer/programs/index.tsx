import { createFileRoute, Link } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useState } from "react";
import { AppShell } from "@/components/app-shell";
import { createProgram, listPrograms } from "@/lib/app.functions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ArrowRight } from "lucide-react";
import { toast } from "sonner";

export const Route = createFileRoute("/_authenticated/trainer/programs/")({
  component: ProgramsPage,
});

function ProgramsPage() {
  const qc = useQueryClient();
  const fList = useServerFn(listPrograms);
  const fCreate = useServerFn(createProgram);
  const { data } = useQuery({ queryKey: ["programs"], queryFn: () => fList() });
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const create = useMutation({
    mutationFn: () => fCreate({ data: { name, description } }),
    onSuccess: () => {
      setName(""); setDescription("");
      qc.invalidateQueries({ queryKey: ["programs"] });
      toast.success("Program skapat");
    },
  });

  return (
    <AppShell title="Program">
      <div className="bg-card border border-border rounded-xl p-5 mb-6">
        <h2 className="font-medium mb-3">Nytt program</h2>
        <form
          className="grid sm:grid-cols-[1fr_2fr_auto] gap-3 items-end"
          onSubmit={(e) => { e.preventDefault(); if (!name.trim()) return; create.mutate(); }}
        >
          <div className="space-y-1.5">
            <Label htmlFor="name">Namn</Label>
            <Input id="name" value={name} onChange={(e) => setName(e.target.value)} maxLength={80} required />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="desc">Beskrivning</Label>
            <Input id="desc" value={description} onChange={(e) => setDescription(e.target.value)} maxLength={500} />
          </div>
          <Button type="submit" disabled={create.isPending}>Skapa</Button>
        </form>
      </div>

      <div className="bg-card border border-border rounded-xl divide-y divide-border">
        {(data ?? []).map((p) => (
          <Link
            key={p.id}
            to="/trainer/programs/$programId"
            params={{ programId: p.id }}
            className="flex items-center justify-between p-4 hover:bg-accent/40"
          >
            <div>
              <div className="font-medium">{p.name}</div>
              {p.description && <div className="text-xs text-muted-foreground">{p.description}</div>}
            </div>
            <ArrowRight className="size-4 text-muted-foreground" />
          </Link>
        ))}
        {(data ?? []).length === 0 && (
          <div className="p-6 text-sm text-muted-foreground">Inga program än.</div>
        )}
      </div>
    </AppShell>
  );
}
