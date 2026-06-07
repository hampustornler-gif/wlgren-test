import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { AppShell } from "@/components/app-shell";
import { exerciseProgress, listMeasurements } from "@/lib/app.functions";
import { ProgressCharts } from "@/components/progress-charts";

export const Route = createFileRoute("/_authenticated/app/progress")({
  component: ProgressPage,
});

function ProgressPage() {
  const fP = useServerFn(exerciseProgress);
  const fM = useServerFn(listMeasurements);
  const progress = useQuery({ queryKey: ["my-progress"], queryFn: () => fP({ data: {} }) });
  const meas = useQuery({ queryKey: ["my-measurements"], queryFn: () => fM({ data: {} }) });

  return (
    <AppShell title="Utveckling">
      <ProgressCharts progress={progress.data ?? []} measurements={meas.data ?? []} />
    </AppShell>
  );
}
