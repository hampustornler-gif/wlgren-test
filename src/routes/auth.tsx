import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dumbbell } from "lucide-react";
import { toast } from "sonner";

export const Route = createFileRoute("/auth")({
  head: () => ({ meta: [{ title: "Logga in — Träna" }] }),
  component: AuthPage,
});

function translateError(msg: string): string {
  const m = msg.toLowerCase();
  if (m.includes("invalid login") || m.includes("invalid credentials"))
    return "Fel e-post eller lösenord.";
  if (m.includes("email not confirmed"))
    return "Du måste bekräfta din e-post först. Kolla din inkorg.";
  if (m.includes("rate limit") || m.includes("too many"))
    return "För många försök. Vänta en stund och försök igen.";
  if (m.includes("weak") || m.includes("pwned") || m.includes("leaked"))
    return "Lösenordet är för svagt eller har läckt. Välj ett annat.";
  if (m.includes("user already registered"))
    return "E-posten är redan registrerad.";
  return msg;
}

function AuthPage() {
  const nav = useNavigate();
  const [mode, setMode] = useState<"login" | "signup" | "forgot">("login");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [name, setName] = useState("");
  const [loading, setLoading] = useState(false);
  const [needsConfirm, setNeedsConfirm] = useState(false);

  const pendingInvite = (() => {
    try { return sessionStorage.getItem("pendingInvite"); } catch { return null; }
  })();
  const inviteRedirect = pendingInvite ? `${window.location.origin}/invite/${pendingInvite}` : window.location.origin;

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setNeedsConfirm(false);
    try {
      if (mode === "signup") {
        const { error } = await supabase.auth.signUp({
          email,
          password,
          options: {
            emailRedirectTo: inviteRedirect,
            data: { display_name: name },
          },
        });
        if (error) throw error;
        toast.success("Konto skapat. Kolla din e-post för bekräftelse.");
        setMode("login");
      } else if (mode === "forgot") {
        const { error } = await supabase.auth.resetPasswordForEmail(email, {
          redirectTo: `${window.location.origin}/reset-password`,
        });
        if (error) throw error;
        toast.success("Återställningslänk skickad. Kolla din e-post.");
        setMode("login");
      } else {
        const { error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) {
          if (error.message.toLowerCase().includes("email not confirmed")) {
            setNeedsConfirm(true);
          }
          throw error;
        }
        if (pendingInvite) {
          nav({ to: "/invite/$token", params: { token: pendingInvite } });
        } else {
          nav({ to: "/" });
        }
      }
    } catch (e: any) {
      toast.error(translateError(e.message ?? "Något gick fel"));
    } finally {
      setLoading(false);
    }
  };


  const resendConfirmation = async () => {
    setLoading(true);
    try {
      const { error } = await supabase.auth.resend({ type: "signup", email });
      if (error) throw error;
      toast.success("Bekräftelsemail skickat igen.");
    } catch (e: any) {
      toast.error(translateError(e.message ?? "Kunde inte skicka"));
    } finally {
      setLoading(false);
    }
  };

  const title =
    mode === "login" ? "Logga in" : mode === "signup" ? "Skapa konto" : "Glömt lösenord";
  const subtitle =
    mode === "login"
      ? "Välkommen tillbaka."
      : mode === "signup"
      ? "Det första kontot blir admin. Övriga blir kunder."
      : "Ange din e-post så skickar vi en återställningslänk.";

  return (
    <div className="min-h-screen flex items-center justify-center px-4">
      <div className="w-full max-w-sm">
        <div className="flex items-center gap-2 mb-8 justify-center">
          <div className="size-9 rounded-xl bg-primary grid place-items-center text-primary-foreground">
            <Dumbbell className="size-5" />
          </div>
          <div className="text-xl font-semibold tracking-tight">Träna</div>
        </div>
        <div className="bg-card border border-border rounded-2xl p-6 shadow-sm">
          <h1 className="text-lg font-semibold mb-1">{title}</h1>
          <p className="text-sm text-muted-foreground mb-5">{subtitle}</p>
          <form onSubmit={onSubmit} className="space-y-4">
            {mode === "signup" && (
              <div className="space-y-1.5">
                <Label htmlFor="name">Namn</Label>
                <Input id="name" value={name} onChange={(e) => setName(e.target.value)} required maxLength={80} />
              </div>
            )}
            <div className="space-y-1.5">
              <Label htmlFor="email">E-post</Label>
              <Input id="email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} required />
            </div>
            {mode !== "forgot" && (
              <div className="space-y-1.5">
                <Label htmlFor="password">Lösenord</Label>
                <Input id="password" type="password" value={password} onChange={(e) => setPassword(e.target.value)} required minLength={6} />
              </div>
            )}
            <Button type="submit" className="w-full" disabled={loading}>
              {loading
                ? "Vänta…"
                : mode === "login"
                ? "Logga in"
                : mode === "signup"
                ? "Skapa konto"
                : "Skicka återställningslänk"}
            </Button>
          </form>

          {needsConfirm && mode === "login" && (
            <Button
              type="button"
              variant="outline"
              className="w-full mt-3"
              onClick={resendConfirmation}
              disabled={loading}
            >
              Skicka bekräftelsemail igen
            </Button>
          )}

          <div className="mt-4 flex flex-col gap-2 text-sm">
            {mode === "login" && (
              <>
                <button
                  type="button"
                  onClick={() => setMode("forgot")}
                  className="text-muted-foreground hover:text-foreground text-left"
                >
                  Glömt lösenord?
                </button>
                <button
                  type="button"
                  onClick={() => setMode("signup")}
                  className="text-muted-foreground hover:text-foreground text-left"
                >
                  Inget konto? Skapa ett.
                </button>
              </>
            )}
            {mode === "signup" && (
              <button
                type="button"
                onClick={() => setMode("login")}
                className="text-muted-foreground hover:text-foreground text-left"
              >
                Har du redan konto? Logga in.
              </button>
            )}
            {mode === "forgot" && (
              <button
                type="button"
                onClick={() => setMode("login")}
                className="text-muted-foreground hover:text-foreground text-left"
              >
                Tillbaka till inloggning
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
