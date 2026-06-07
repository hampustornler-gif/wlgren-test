import { createFileRoute, Link } from "@tanstack/react-router";
import { AppShell } from "@/components/app-shell";
import { useServerFn } from "@tanstack/react-start";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { claimFirstAdmin, getMe } from "@/lib/app.functions";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { toast } from "sonner";

export const Route = createFileRoute("/_authenticated/admin/")({
  component: AdminHome,
});

function AdminHome() {
  const qc = useQueryClient();
  const fetchMe = useServerFn(getMe);
  const claim = useServerFn(claimFirstAdmin);
  const { data: me } = useQuery({ queryKey: ["me"], queryFn: () => fetchMe() });

  const claimMut = useMutation({
    mutationFn: () => claim(),
    onSuccess: (res) => {
      if (res.claimed) {
        toast.success("Du är nu admin!");
        qc.invalidateQueries({ queryKey: ["me"] });
      } else {
        toast.error("En admin finns redan.");
      }
    },
    onError: (e: any) => toast.error(e?.message ?? "Kunde inte göra dig till admin"),
  });

  return (
    <AppShell title="Admin">
      <div className="space-y-6">
        {!me?.isAdmin && (
          <Card>
            <CardHeader>
              <CardTitle>Gör mig till admin</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <p className="text-sm text-muted-foreground">
                Den här knappen fungerar bara om det inte finns någon admin än. Använd
                den första gången för att uppgradera ditt konto.
              </p>
              <Button onClick={() => claimMut.mutate()} disabled={claimMut.isPending}>
                Gör mig till admin
              </Button>
            </CardContent>
          </Card>
        )}
        {me?.isAdmin && (
          <Card>
            <CardHeader>
              <CardTitle>Användare</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground mb-3">
                Hantera roller och koppla kunder till tränare.
              </p>
              <Button asChild>
                <Link to="/admin/users">Öppna användarhantering</Link>
              </Button>
            </CardContent>
          </Card>
        )}
      </div>
    </AppShell>
  );
}
