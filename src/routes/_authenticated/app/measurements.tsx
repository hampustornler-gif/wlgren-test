import { createFileRoute } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useState } from "react";
import { AppShell } from "@/components/app-shell";
import { addMeasurement, listMeasurements } from "@/lib/app.functions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { format } from "date-fns";
import { toast } from "sonner";

export const Route = createFileRoute("/_authenticated/app/measurements")({
  component: MeasurementsPage,
});

const fields = [
  { key: "weight_kg", label: "Vikt (kg)" },
  { key: "waist_cm", label: "Midja (cm)" },
  { key: "chest_cm", label: "Bröst (cm)" },
  { key: "arm_cm", label: "Arm (cm)" },
  { key: "thigh_cm", label: "Lår (cm)" },
] as const;

function MeasurementsPage() {
  const qc = useQueryClient();
  const fList = useServerFn(listMeasurements);
  const fAdd = useServerFn(addMeasurement);
  const { data } = useQuery({ queryKey: ["my-measurements"], queryFn: () => fList({ data: {} }) });
  const [vals, setVals] = useState<Record<string, string>>({});
  const add = useMutation({
    mutationFn: () =>
      fAdd({
        data: Object.fromEntries(
          fields.map((f) => [f.key, vals[f.key] ? Number(vals[f.key]) : null]),
        ) as any,
      }),
    onSuccess: () => {
      setVals({});
      qc.invalidateQueries({ queryKey: ["my-measurements"] });
      toast.success("Mätning sparad");
    },
  });

  return (
    <AppShell title="Kroppsmått">
      <div className="bg-card border border-border rounded-xl p-5 mb-6">
        <h2 className="font-medium mb-3">Ny mätning</h2>
        <form
          className="grid grid-cols-2 sm:grid-cols-5 gap-3"
          onSubmit={(e) => { e.preventDefault(); add.mutate(); }}
        >
          {fields.map((f) => (
            <div key={f.key} className="space-y-1.5">
              <Label htmlFor={f.key}>{f.label}</Label>
              <Input
                id={f.key} type="number" step="0.1" inputMode="decimal"
                value={vals[f.key] ?? ""}
                onChange={(e) => setVals({ ...vals, [f.key]: e.target.value })}
              />
            </div>
          ))}
          <div className="col-span-2 sm:col-span-5">
            <Button type="submit" disabled={add.isPending}>Spara mätning</Button>
          </div>
        </form>
      </div>

      <div className="bg-card border border-border rounded-xl divide-y divide-border">
        {(data ?? []).slice().reverse().map((m: any) => (
          <div key={m.id} className="p-4 text-sm">
            <div className="font-medium">{format(new Date(m.measured_at), "PPP")}</div>
            <div className="text-muted-foreground mt-1 flex flex-wrap gap-x-4 gap-y-1">
              {fields.map((f) => m[f.key] != null && (
                <span key={f.key}>{f.label}: {m[f.key]}</span>
              ))}
            </div>
          </div>
        ))}
        {(data ?? []).length === 0 && (
          <div className="p-6 text-sm text-muted-foreground">Inga mätningar än.</div>
        )}
      </div>
    </AppShell>
  );
}
