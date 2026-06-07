import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { acceptInvite, getInviteByToken } from "@/lib/app.functions";
import { Button } from "@/components/ui/button";
import { Dumbbell } from "lucide-react";
import { toast } from "sonner";

export const Route = createFileRoute("/invite/$token")({
  ssr: false,
  head: () => ({ meta: [{ title: "Inbjudan — Träna" }] }),
  component: InvitePage,
});

function InvitePage() {
  const { token } = Route.useParams();
  const nav = useNavigate();
  const fGet = useServerFn(getInviteByToken);
  const fAccept = useServerFn(acceptInvite);

  const { data, isLoading } = useQuery({
    queryKey: ["invite", token],
    queryFn: () => fGet({ data: { token } }),
  });

  const [user, setUser] = useState<{ id: string } | null | undefined>(undefined);
  const [accepting, setAccepting] = useState(false);

  useEffect(() => {
    try {
      sessionStorage.setItem("pendingInvite", token);
    } catch {}
    supabase.auth.getUser().then(({ data }) => setUser(data.user ?? null));
    const { data: sub } = supabase.auth.onAuthStateChange((_e, session) => {
      setUser(session?.user ?? null);
    });
    return () => sub.subscription.unsubscribe();
  }, [token]);

  useEffect(() => {
    if (!user || !data?.ok || accepting) return;
    setAccepting(true);
    fAccept({ data: { token } })
      .then(() => {
        try { sessionStorage.removeItem("pendingInvite"); } catch {}
        toast.success("Du är nu kopplad till din tränare");
        nav({ to: "/app" });
      })
      .catch((e: any) => {
        toast.error(e?.message ?? "Kunde inte acceptera inbjudan");
        setAccepting(false);
      });
  }, [user, data, accepting, fAccept, nav, token]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-background px-4">
      <div className="w-full max-w-md bg-card border border-border rounded-2xl p-8 text-center">
        <div className="inline-flex size-12 items-center justify-center rounded-xl bg-primary/10 text-primary mb-4">
          <Dumbbell className="size-6" />
        </div>
        <h1 className="text-2xl font-semibold mb-2">Inbjudan</h1>

        {isLoading || user === undefined ? (
          <p className="text-sm text-muted-foreground">Läser in…</p>
        ) : !data?.ok ? (
          <InvalidState reason={data?.reason ?? "not_found"} />
        ) : user === null ? (
          <>
            <p className="text-sm text-muted-foreground mb-6">
              <span className="font-medium text-foreground">{data.invite.trainerName}</span> har
              bjudit in dig till Träna. Logga in eller skapa ett konto för att fortsätta — kontot
              kopplas sedan automatiskt.
            </p>
            <div className="flex flex-col gap-2">
              <Button asChild>
                <Link to="/auth">Skapa konto eller logga in</Link>
              </Button>
            </div>
            <p className="text-xs text-muted-foreground mt-4">
              Tips: öppna inbjudningslänken igen efter du loggat in om du inte skickas vidare.
            </p>
          </>
        ) : (
          <p className="text-sm text-muted-foreground">Kopplar dig till din tränare…</p>
        )}
      </div>
    </div>
  );
}

function InvalidState({ reason }: { reason: "not_found" | "accepted" | "expired" }) {
  const text =
    reason === "expired"
      ? "Inbjudan har gått ut. Be din tränare skicka en ny."
      : reason === "accepted"
      ? "Inbjudan har redan använts."
      : "Inbjudan hittades inte.";
  return (
    <>
      <p className="text-sm text-muted-foreground mb-6">{text}</p>
      <Button asChild variant="outline">
        <Link to="/">Till startsidan</Link>
      </Button>
    </>
  );
}
