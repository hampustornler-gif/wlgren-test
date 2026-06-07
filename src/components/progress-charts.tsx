import { useMemo, useState } from "react";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from "recharts";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

type ProgressRow = {
  exerciseId: string;
  exerciseName: string;
  date: string;
  maxWeight: number;
  volume: number;
};
type Measurement = {
  measured_at: string;
  weight_kg: number | null;
  waist_cm: number | null;
  chest_cm: number | null;
  arm_cm: number | null;
  thigh_cm: number | null;
};

export function ProgressCharts({
  progress,
  measurements,
}: {
  progress: ProgressRow[];
  measurements: Measurement[];
}) {
  const exercises = useMemo(() => {
    const map = new Map<string, string>();
    progress.forEach((p) => map.set(p.exerciseId, p.exerciseName));
    return Array.from(map, ([id, name]) => ({ id, name }));
  }, [progress]);

  const [selected, setSelected] = useState<string>(exercises[0]?.id ?? "");
  const activeId = selected || exercises[0]?.id || "";
  const series = progress.filter((p) => p.exerciseId === activeId);

  const weightSeries = measurements
    .filter((m) => m.weight_kg != null)
    .map((m) => ({ date: m.measured_at.slice(0, 10), kg: Number(m.weight_kg) }));

  return (
    <div className="grid gap-4">
      <div className="bg-card border border-border rounded-xl p-5">
        <div className="flex items-center justify-between mb-4 gap-3">
          <h3 className="font-medium">Övning</h3>
          {exercises.length > 0 && (
            <Select value={activeId} onValueChange={setSelected}>
              <SelectTrigger className="w-48"><SelectValue /></SelectTrigger>
              <SelectContent>
                {exercises.map((e) => (
                  <SelectItem key={e.id} value={e.id}>{e.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          )}
        </div>
        {series.length === 0 ? (
          <div className="text-sm text-muted-foreground">Inga loggade set ännu.</div>
        ) : (
          <div className="h-56">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={series}>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--color-border)" />
                <XAxis dataKey="date" tick={{ fontSize: 11 }} />
                <YAxis tick={{ fontSize: 11 }} />
                <Tooltip />
                <Line type="monotone" dataKey="maxWeight" name="Max vikt (kg)" stroke="var(--color-chart-1)" strokeWidth={2} dot={{ r: 3 }} />
                <Line type="monotone" dataKey="volume" name="Volym (kg·reps)" stroke="var(--color-chart-2)" strokeWidth={2} dot={{ r: 3 }} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        )}
      </div>

      <div className="bg-card border border-border rounded-xl p-5">
        <h3 className="font-medium mb-4">Kroppsvikt</h3>
        {weightSeries.length === 0 ? (
          <div className="text-sm text-muted-foreground">Inga mått loggade.</div>
        ) : (
          <div className="h-48">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={weightSeries}>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--color-border)" />
                <XAxis dataKey="date" tick={{ fontSize: 11 }} />
                <YAxis tick={{ fontSize: 11 }} />
                <Tooltip />
                <Line type="monotone" dataKey="kg" name="kg" stroke="var(--color-chart-3)" strokeWidth={2} dot={{ r: 3 }} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        )}
      </div>
    </div>
  );
}
