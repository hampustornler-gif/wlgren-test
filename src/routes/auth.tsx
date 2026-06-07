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

function AuthPage() {
  const nav = useNavigate();
  const [mode, setMode] = useState<"login" | "signup">("login");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [name, setName] = useState("");
  const [loading, setLoading] = useState(false);

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      if (mode === "signup") {
        const { error } = await supabase.auth.signUp({
          email,
          password,
          options: {
            emailRedirectTo: window.location.origin,
            data: { display_name: name },
          },
        });
        if (error) throw error;
        toast.success("Konto skapat");
      } else {
        const { error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) throw error;
      }
      nav({ to: "/" });
    } catch (e: any) {
      toast.error(e.message ?? "Något gick fel");
    } finally {
      setLoading(false);
    }
  };

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
          <h1 className="text-lg font-semibold mb-1">
            {mode === "login" ? "Logga in" : "Skapa konto"}
          </h1>
          <p className="text-sm text-muted-foreground mb-5">
            {mode === "login"
              ? "Välkommen tillbaka."
              : "Det första kontot blir tränare. Övriga blir kunder."}
          </p>
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
            <div className="space-y-1.5">
              <Label htmlFor="password">Lösenord</Label>
              <Input id="password" type="password" value={password} onChange={(e) => setPassword(e.target.value)} required minLength={6} />
            </div>
            <Button type="submit" className="w-full" disabled={loading}>
              {loading ? "Vänta…" : mode === "login" ? "Logga in" : "Skapa konto"}
            </Button>
          </form>
          <button
            onClick={() => setMode(mode === "login" ? "signup" : "login")}
            className="mt-4 w-full text-sm text-muted-foreground hover:text-foreground"
          >
            {mode === "login" ? "Inget konto? Skapa ett." : "Har du redan konto? Logga in."}
          </button>
        </div>
      </div>
    </div>
  );
}
