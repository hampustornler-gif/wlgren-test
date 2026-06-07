import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { buildPublicUrl } from "@/lib/public-url";
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
  const inviteRedirect = pendingInvite ? buildPublicUrl(`/invite/${pendingInvite}`) : buildPublicUrl("/");

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
          redirectTo: buildPublicUrl("/reset-password"),
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
    mode === "login" ? "Välkommen tillbaka" : mode === "signup" ? "Skapa konto" : "Glömt lösenord";
  const subtitle =
    mode === "login"
      ? "Logga in för att fortsätta."
      : mode === "signup"
      ? "Det första kontot blir admin. Övriga blir kunder."
      : "Ange din e-post så skickar vi en återställningslänk.";

  return (
    <div className="min-h-screen flex items-center justify-center px-4 py-12">
      {/* Decorative orb */}
      <div
        aria-hidden
        className="pointer-events-none fixed left-1/2 top-1/3 -translate-x-1/2 -translate-y-1/2 w-[700px] h-[700px] rounded-full"
        style={{
          background: "radial-gradient(circle, oklch(0.68 0.22 265 / 12%) 0%, transparent 70%)",
          filter: "blur(48px)",
        }}
      />

      <div className="w-full max-w-sm relative">
        {/* Logo */}
        <div className="flex items-center gap-3 mb-10 justify-center">
          <div className="size-11 rounded-2xl bg-primary grid place-items-center text-primary-foreground btn-glow">
            <Dumbbell className="size-5" />
          </div>
          <div className="text-2xl font-bold tracking-tight text-white">Träna</div>
        </div>

        {/* Glass card */}
        <div className="glass rounded-3xl p-7">
          <h1 className="text-xl font-bold text-white mb-1">{title}</h1>
          <p className="text-sm text-white/50 mb-6">{subtitle}</p>

          <form onSubmit={onSubmit} className="space-y-4">
            {mode === "signup" && (
              <div className="space-y-1.5">
                <Label htmlFor="name" className="text-white/60 text-xs font-semibold uppercase tracking-wider">Namn</Label>
                <Input
                  id="name"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  required
                  maxLength={80}
                  className="bg-white/[0.06] border-white/10 text-white placeholder:text-white/25 rounded-xl h-11 input-premium"
                />
              </div>
            )}
            <div className="space-y-1.5">
              <Label htmlFor="email" className="text-white/60 text-xs font-semibold uppercase tracking-wider">E-post</Label>
              <Input
                id="email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                className="bg-white/[0.06] border-white/10 text-white placeholder:text-white/25 rounded-xl h-11 input-premium"
              />
            </div>
            {mode !== "forgot" && (
              <div className="space-y-1.5">
                <Label htmlFor="password" className="text-white/60 text-xs font-semibold uppercase tracking-wider">Lösenord</Label>
                <Input
                  id="password"
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  minLength={6}
                  className="bg-white/[0.06] border-white/10 text-white placeholder:text-white/25 rounded-xl h-11 input-premium"
                />
              </div>
            )}
            <Button
              type="submit"
              className="w-full h-11 rounded-xl text-sm font-semibold mt-2 btn-glow"
              disabled={loading}
            >
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
              className="w-full mt-3 rounded-xl h-11 border-white/10 text-white/60 hover:text-white hover:bg-white/8"
              onClick={resendConfirmation}
              disabled={loading}
            >
              Skicka bekräftelsemail igen
            </Button>
          )}

          <div className="mt-5 flex flex-col gap-2.5 text-sm border-t border-white/[0.06] pt-4">
            {mode === "login" && (
              <>
                <button
                  type="button"
                  onClick={() => setMode("forgot")}
                  className="text-white/40 hover:text-white/80 text-left transition-colors"
                >
                  Glömt lösenord?
                </button>
                <button
                  type="button"
                  onClick={() => setMode("signup")}
                  className="text-white/40 hover:text-white/80 text-left transition-colors"
                >
                  Inget konto? Skapa ett.
                </button>
              </>
            )}
            {mode === "signup" && (
              <button
                type="button"
                onClick={() => setMode("login")}
                className="text-white/40 hover:text-white/80 text-left transition-colors"
              >
                Har du redan konto? Logga in.
              </button>
            )}
            {mode === "forgot" && (
              <button
                type="button"
                onClick={() => setMode("login")}
                className="text-white/40 hover:text-white/80 text-left transition-colors"
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
