import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Dumbbell, Eye, EyeOff, ArrowRight, Mail, Lock, ChevronLeft } from "lucide-react";

export const Route = createFileRoute("/auth")({
  component: AuthPage,
});

function AuthPage() {
  const nav = useNavigate();
  const [mode, setMode] = useState<"login" | "register" | "forgot">("login");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [name, setName] = useState("");
  const [showPw, setShowPw] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [mounted, setMounted] = useState(false);

  useEffect(() => { setMounted(true); }, []);

  const reset = () => { setError(""); setSuccess(""); };

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    reset();
    setLoading(true);
    try {
      if (mode === "login") {
        const { error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) throw error;
        nav({ to: "/", replace: true });
      } else if (mode === "register") {
        const { error } = await supabase.auth.signUp({
          email, password,
          options: { data: { display_name: name || email.split("@")[0] } },
        });
        if (error) throw error;
        setSuccess("Kolla din e-post och bekräfta kontot.");
      } else {
        const { error } = await supabase.auth.resetPasswordForEmail(email, {
          redirectTo: `${window.location.origin}/reset-password`,
        });
        if (error) throw error;
        setSuccess("Återställningslänk skickad!");
      }
    } catch (err: any) {
      setError(err?.message ?? "Något gick fel");
    } finally {
      setLoading(false);
    }
  };

  const switchMode = (m: typeof mode) => { reset(); setMode(m); };

  return (
    <div className="min-h-dvh bg-background flex items-center justify-center p-4 relative overflow-hidden">
      {/* Ambient orbs */}
      <div className="absolute inset-0 pointer-events-none">
        <div
          className="absolute top-1/4 left-1/4 w-96 h-96 rounded-full opacity-30"
          style={{
            background: "radial-gradient(circle, oklch(0.70 0.24 265 / 40%) 0%, transparent 70%)",
            animation: "orb-drift 14s ease-in-out infinite",
            filter: "blur(40px)",
          }}
        />
        <div
          className="absolute bottom-1/3 right-1/4 w-80 h-80 rounded-full opacity-20"
          style={{
            background: "radial-gradient(circle, oklch(0.65 0.28 304 / 40%) 0%, transparent 70%)",
            animation: "orb-drift-2 18s ease-in-out infinite",
            filter: "blur(50px)",
          }}
        />
        <div
          className="absolute top-1/2 right-1/3 w-48 h-48 rounded-full opacity-15"
          style={{
            background: "radial-gradient(circle, oklch(0.72 0.18 162 / 50%) 0%, transparent 70%)",
            animation: "orb-drift 22s ease-in-out infinite reverse",
            filter: "blur(30px)",
          }}
        />
      </div>

      {/* Grid pattern */}
      <div
        className="absolute inset-0 pointer-events-none opacity-[0.025]"
        style={{
          backgroundImage: "linear-gradient(oklch(1 0 0) 1px, transparent 1px), linear-gradient(90deg, oklch(1 0 0) 1px, transparent 1px)",
          backgroundSize: "48px 48px",
        }}
      />

      {/* Card */}
      <div
        className={[
          "relative w-full max-w-sm glass-strong rounded-3xl overflow-hidden",
          mounted ? "animate-scale-in" : "opacity-0",
        ].join(" ")}
      >
        {/* Top shimmer line */}
        <div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-white/30 to-transparent" />

        <div className="p-8">
          {/* Logo */}
          <div className="flex justify-center mb-8">
            <div className="size-16 rounded-2xl logo-icon grid place-items-center text-white">
              <Dumbbell className="size-7" />
            </div>
          </div>

          {/* Title */}
          <div className="text-center mb-8">
            <h1 className="text-2xl font-black tracking-tight text-white">
              {mode === "login" ? "Välkommen tillbaka" : mode === "register" ? "Skapa konto" : "Glömt lösenord"}
            </h1>
            <p className="text-sm text-white/35 mt-1.5 font-medium">
              {mode === "login" ? "Logga in på ditt konto" : mode === "register" ? "Börja din träningsresa" : "Vi skickar en återställningslänk"}
            </p>
          </div>

          {/* Form */}
          <form onSubmit={onSubmit} className="space-y-3">
            {mode === "register" && (
              <div className="animate-fade-up stagger-1">
                <label className="block text-[10px] font-bold uppercase tracking-widest text-white/30 mb-1.5">Namn</label>
                <div className="relative">
                  <input
                    type="text"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="Ditt namn"
                    className="w-full h-11 rounded-xl bg-white/[0.07] border border-white/10 text-white placeholder:text-white/20 text-sm px-4 input-premium"
                  />
                </div>
              </div>
            )}

            <div className={mode === "register" ? "animate-fade-up stagger-2" : "animate-fade-up stagger-1"}>
              <label className="block text-[10px] font-bold uppercase tracking-widest text-white/30 mb-1.5">E-post</label>
              <div className="relative">
                <Mail className="absolute left-3.5 top-1/2 -translate-y-1/2 size-3.5 text-white/25" />
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  placeholder="din@epost.se"
                  className="w-full h-11 rounded-xl bg-white/[0.07] border border-white/10 text-white placeholder:text-white/20 text-sm pl-10 pr-4 input-premium"
                />
              </div>
            </div>

            {mode !== "forgot" && (
              <div className={mode === "register" ? "animate-fade-up stagger-3" : "animate-fade-up stagger-2"}>
                <label className="block text-[10px] font-bold uppercase tracking-widest text-white/30 mb-1.5">Lösenord</label>
                <div className="relative">
                  <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 size-3.5 text-white/25" />
                  <input
                    type={showPw ? "text" : "password"}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                    placeholder="••••••••"
                    className="w-full h-11 rounded-xl bg-white/[0.07] border border-white/10 text-white placeholder:text-white/25 text-sm pl-10 pr-11 input-premium"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPw((v) => !v)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 p-1 text-white/25 hover:text-white/60 transition-colors"
                  >
                    {showPw ? <EyeOff className="size-3.5" /> : <Eye className="size-3.5" />}
                  </button>
                </div>
              </div>
            )}

            {error && (
              <div className="animate-fade-up rounded-xl border border-red-500/20 bg-red-500/10 px-4 py-3 text-xs text-red-300">
                {error}
              </div>
            )}
            {success && (
              <div className="animate-fade-up rounded-xl border border-emerald-500/20 bg-emerald-500/10 px-4 py-3 text-xs text-emerald-300">
                {success}
              </div>
            )}

            <button
              type="submit"
              disabled={loading}
              className="w-full h-11 rounded-xl bg-primary text-primary-foreground text-sm font-bold btn-glow flex items-center justify-center gap-2 mt-1 disabled:opacity-60 disabled:cursor-not-allowed"
            >
              {loading ? (
                <div className="size-4 rounded-full border-2 border-white/30 border-t-white animate-spin" />
              ) : (
                <>
                  {mode === "login" ? "Logga in" : mode === "register" ? "Skapa konto" : "Skicka länk"}
                  <ArrowRight className="size-4" />
                </>
              )}
            </button>
          </form>

          {/* Mode switchers */}
          <div className="mt-6 space-y-2 text-center">
            {mode === "login" && (
              <>
                <button onClick={() => switchMode("forgot")} className="text-xs text-white/30 hover:text-white/60 transition-colors block w-full">
                  Glömt lösenordet?
                </button>
                <div className="text-[10px] text-white/20">Inget konto?{" "}
                  <button onClick={() => switchMode("register")} className="text-primary/70 hover:text-primary font-semibold transition-colors">
                    Registrera dig
                  </button>
                </div>
              </>
            )}
            {mode !== "login" && (
              <button
                onClick={() => switchMode("login")}
                className="flex items-center justify-center gap-1.5 text-xs text-white/30 hover:text-white/60 transition-colors w-full"
              >
                <ChevronLeft className="size-3.5" /> Tillbaka till login
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
