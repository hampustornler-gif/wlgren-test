import { createFileRoute, Link } from "@tanstack/react-router";
import { AppShell } from "@/components/app-shell";
import { useServerFn } from "@tanstack/react-start";
import { useQuery } from "@tanstack/react-query";
import { getMe } from "@/lib/app.functions";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export const Route = createFileRoute("/_authenticated/admin/")({
  component: AdminHome,
});

function AdminHome() {
  const fetchMe = useServerFn(getMe);
  const { data: me } = useQuery({ queryKey: ["me"], queryFn: () => fetchMe() });

  return (
    <AppShell title="Admin">
      <div className="space-y-6">
        {!me?.isAdmin && (
          <Card>
            <CardHeader>
              <CardTitle>Ingen admin-behörighet</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground">
                Ditt konto har inte adminrollen. Be en befintlig admin att tilldela dig
                rollen.
              </p>
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
