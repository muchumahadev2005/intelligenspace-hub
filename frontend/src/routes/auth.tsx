import { useState, useEffect } from "react";
import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { Loader2, ShieldCheck, Sparkles, CheckCircle2, Lock } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { setStoredAuth, getStoredToken, loginWithDemoCredentials } from "@/lib/api-client";

export const Route = createFileRoute("/auth")({
  head: () => ({
    meta: [
      { title: "Sign in with Google — IntelligenSpace Hub" },
      {
        name: "description",
        content: "Sign in with your Google account to access IntelligenSpace Hub enterprise AI workspace.",
      },
      { property: "og:title", content: "Sign in with Google — IntelligenSpace Hub" },
      { property: "og:description", content: "Enterprise Google SSO Authentication." },
    ],
  }),
  component: AuthPage,
});

const API_BASE = (import.meta.env["VITE_API_URL"] as string) || "http://localhost:3001/api/v1";

function GoogleIcon({ className = "size-5" }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24">
      <path
        fill="#4285F4"
        d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
      />
      <path
        fill="#34A853"
        d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
      />
      <path
        fill="#FBBC05"
        d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"
      />
      <path
        fill="#EA4335"
        d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"
      />
    </svg>
  );
}

function AuthPage() {
  const navigate = useNavigate();
  const [googleLoading, setGoogleLoading] = useState(false);
  const [demoLoading, setDemoLoading] = useState(false);

  // Listen for OAuth callback token or error in query string
  useEffect(() => {
    if (typeof window === "undefined") return;
    const params = new URLSearchParams(window.location.search);
    const token = params.get("token");
    const userRaw = params.get("user");
    const err = params.get("error");

    if (err) {
      toast.error("Google Authentication Notice", { description: decodeURIComponent(err) });
      window.history.replaceState({}, "", "/auth");
      return;
    }

    if (token) {
      try {
        let user: any = null;
        if (userRaw) {
          try {
            user = JSON.parse(userRaw);
          } catch {
            user = JSON.parse(decodeURIComponent(userRaw));
          }
        }
        if (!user) user = { email: "user@intelligenspace.io" };
        setStoredAuth(token, user);
        toast.success(`Welcome, ${user.name || "User"}!`, {
          description: "Signed in successfully with Google.",
        });
        window.location.href = "/";
        return;
      } catch (e) {
        console.error("Failed to parse Google user payload:", e);
        setStoredAuth(token, { email: "user@intelligenspace.io" });
        window.location.href = "/";
        return;
      }
    }

    // If already authenticated and no incoming token, redirect to workspace
    const existing = getStoredToken();
    if (existing) {
      navigate({ to: "/" as "/" });
    }
  }, [navigate]);

  // Handle Google OAuth redirect
  const handleGoogleSignIn = () => {
    setGoogleLoading(true);
    // Redirect to backend Google OAuth initiation endpoint
    window.location.href = `${API_BASE}/auth/google`;
  };

  // Optional 1-click fallback for development/evaluation
  const handleInstantDemoLogin = async () => {
    setDemoLoading(true);
    try {
      const data = await loginWithDemoCredentials();
      toast.success("Signed in as Demo Administrator", {
        description: `Welcome back, ${data.user.email}!`,
      });
      navigate({ to: "/" as "/" });
    } catch (err: any) {
      toast.error("Demo Sign In Failed", {
        description: err.message || "Could not connect with demo credentials.",
      });
    } finally {
      setDemoLoading(false);
    }
  };

  // If currently processing incoming token redirect, display clean full-screen loader
  const hasIncomingToken = typeof window !== "undefined" && new URLSearchParams(window.location.search).has("token");
  if (hasIncomingToken) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center bg-background text-foreground">
        <div className="flex flex-col items-center gap-4 p-8 text-center panel max-w-sm border-primary/30">
          <div className="relative">
            <div className="size-12 rounded-2xl bg-primary/10 flex items-center justify-center ring-8 ring-primary/5">
              <Loader2 className="size-6 animate-spin text-primary" />
            </div>
          </div>
          <div className="space-y-1">
            <h2 className="text-base font-bold text-foreground">Completing Google Sign In...</h2>
            <p className="text-xs text-muted-foreground">
              Establishing your secure session and provisioning workspace.
            </p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <main className="grid min-h-screen lg:grid-cols-2 bg-background text-foreground">
      {/* ── Left Feature Showcase Panel ───────────────────────────── */}
      <section className="hidden flex-col justify-between border-r border-border/80 bg-gradient-to-br from-surface-1 via-background to-surface-2 p-12 lg:flex relative overflow-hidden">
        <div className="absolute -top-32 -left-32 size-96 rounded-full bg-primary/10 blur-3xl pointer-events-none" />
        <div className="absolute -bottom-32 -right-32 size-96 rounded-full bg-amber-500/10 blur-3xl pointer-events-none" />

        {/* Brand Header */}
        <div className="relative z-10 flex items-center gap-3">
          <img
            src="/brand-logo.jpg"
            alt="IntelligenSpace Logo"
            className="size-10 rounded-xl object-cover shadow-lg shadow-primary/25 ring-1 ring-primary/30"
          />
          <div>
            <span className="text-base font-extrabold tracking-tight text-foreground block">
              IntelligenSpace Hub
            </span>
            <span className="text-[11px] text-muted-foreground font-medium block">
              Enterprise Autonomous AI Platform
            </span>
          </div>
        </div>

        {/* Hero Narrative */}
        <div className="relative z-10 max-w-lg space-y-6">
          <div className="inline-flex items-center gap-2 rounded-full border border-primary/30 bg-primary/10 px-3 py-1 text-xs font-semibold text-primary">
            <ShieldCheck className="size-3.5" /> Google OAuth 2.0 Verified
          </div>

          <h1 className="text-3xl lg:text-4xl font-extrabold tracking-tight text-foreground leading-tight">
            Build, Deploy & Govern Autonomous AI Fleets
          </h1>

          <p className="text-sm text-muted-foreground leading-relaxed">
            Unify Developer AI, agent orchestration, telemetry benchmarking, and multi-model neural routing in one secure workspace.
          </p>

          <div className="grid grid-cols-2 gap-3 pt-2">
            <div className="panel p-3.5 space-y-1 bg-surface-1/60">
              <span className="text-xs font-bold text-foreground">13+ AI Engines</span>
              <p className="text-[11px] text-muted-foreground">Gemini, GPT-4o, Claude, and free routers.</p>
            </div>
            <div className="panel p-3.5 space-y-1 bg-surface-1/60">
              <span className="text-xs font-bold text-foreground">Strict RBAC</span>
              <p className="text-[11px] text-muted-foreground">Role-based governance & tenant isolation.</p>
            </div>
          </div>
        </div>

        <div className="relative z-10 text-xs text-muted-foreground flex items-center justify-between">
          <span>Production AI Platform · Zero-Brand Routing</span>
          <span className="font-mono text-[11px]">v2.4.0</span>
        </div>
      </section>

      {/* ── Right Google SSO Panel ────────────────────────────────── */}
      <section className="flex items-center justify-center p-6 sm:p-12">
        <div className="w-full max-w-md space-y-8">
          {/* Header */}
          <div className="text-center space-y-2">
            <div className="mx-auto size-16 rounded-2xl p-1 bg-gradient-to-br from-primary/20 via-purple-500/10 to-amber-500/20 shadow-xl shadow-primary/15 ring-1 ring-border/80 flex items-center justify-center mb-4">
              <img
                src="/brand-logo.jpg"
                alt="Logo"
                className="size-full rounded-xl object-cover"
              />
            </div>

            <h2 className="text-2xl font-extrabold tracking-tight text-foreground">
              Sign in to IntelligenSpace
            </h2>
            <p className="text-xs text-muted-foreground max-w-sm mx-auto">
              Single Sign-On using your authorized Google Account. Seamless, passwordless access to your workspace.
            </p>
          </div>

          {/* ── Main Google SSO Card ──────────────────────────────── */}
          <div className="panel p-6 sm:p-8 space-y-6 border-border/80 bg-surface-1/80 backdrop-blur shadow-xl">
            <div className="space-y-4">
              <Button
                type="button"
                size="lg"
                onClick={handleGoogleSignIn}
                disabled={googleLoading || demoLoading}
                className="w-full h-12 gap-3 text-sm font-semibold text-white bg-gradient-to-r from-blue-600 to-blue-500 hover:from-blue-700 hover:to-blue-600 border border-blue-400/40 shadow-lg shadow-blue-500/35 transition-all hover:scale-[1.01] active:scale-[0.99] cursor-pointer"
              >
                {googleLoading ? (
                  <>
                    <Loader2 className="size-5 animate-spin text-white" />
                    <span>Connecting to Google...</span>
                  </>
                ) : (
                  <>
                    <span className="flex size-7 items-center justify-center rounded-full bg-white shadow-xs shrink-0">
                      <GoogleIcon className="size-4" />
                    </span>
                    <span className="font-semibold text-white tracking-wide">Continue with Google</span>
                  </>
                )}
              </Button>

              <div className="text-[11px] text-muted-foreground text-center flex items-center justify-center gap-1.5 pt-1">
                <Lock className="size-3 text-emerald-400" />
                <span>Protected by Google OAuth 2.0 · End-to-end Encrypted</span>
              </div>
            </div>

            {/* Feature Checkpoints */}
            <div className="pt-4 border-t border-border/60 space-y-2 text-xs text-muted-foreground">
              <div className="flex items-center gap-2">
                <CheckCircle2 className="size-3.5 text-emerald-400 shrink-0" />
                <span>One-click sign-in without passwords</span>
              </div>
              <div className="flex items-center gap-2">
                <CheckCircle2 className="size-3.5 text-emerald-400 shrink-0" />
                <span>Automatic isolated workspace provisioning</span>
              </div>
              <div className="flex items-center gap-2">
                <CheckCircle2 className="size-3.5 text-emerald-400 shrink-0" />
                <span>Instant access to 13+ neural AI models</span>
              </div>
            </div>
          </div>

          {/* ── Quick Developer Demo Access ───────────────────────── */}
          <div className="pt-2 text-center space-y-2">
            <p className="text-[11px] text-muted-foreground">
              Testing locally without Google?
            </p>
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={handleInstantDemoLogin}
              disabled={demoLoading || googleLoading}
              className="h-8 text-xs font-semibold gap-1.5 text-primary hover:bg-primary/10"
            >
              {demoLoading ? (
                <>
                  <Loader2 className="size-3 animate-spin" /> Signing In...
                </>
              ) : (
                <>
                  <Sparkles className="size-3 text-amber-400" /> 1-Click Sign In as Demo Admin
                </>
              )}
            </Button>
          </div>
        </div>
      </section>
    </main>
  );
}
