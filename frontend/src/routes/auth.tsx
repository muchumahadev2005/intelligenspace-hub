import { useState, useEffect } from "react";
import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { Sparkles, Loader2, Mail, Lock, User, ArrowRight, ShieldCheck } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { setStoredAuth, getStoredToken, loginWithDemoCredentials } from "@/lib/api-client";

export const Route = createFileRoute("/auth")({
  head: () => ({
    meta: [
      { title: "Sign in — AI Platform" },
      {
        name: "description",
        content: "Sign in or create an account to access AI agent workspaces and developer models.",
      },
      { property: "og:title", content: "Sign in — AI Platform" },
      { property: "og:description", content: "Access your AI workspace." },
    ],
  }),
  component: AuthPage,
});

const API_BASE = (import.meta.env["VITE_API_URL"] as string) || "http://localhost:3001/api/v1";

function GoogleIcon({ className = "size-4" }: { className?: string }) {
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
  const [mode, setMode] = useState<"in" | "up">("in");
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
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
      toast.error("Authentication Notice", { description: decodeURIComponent(err) });
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
        toast.success(`Welcome back, ${user.name || "User"}!`, {
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

  // One-click instant login as Demo Administrator
  const handleInstantDemoLogin = async () => {
    setDemoLoading(true);
    try {
      const data = await loginWithDemoCredentials();
      toast.success("Welcome back, Demo Administrator!", {
        description: `Signed in as ${data.user.email}`,
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

  // Handle Email/Password Login or Register
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim()) {
      toast.error("Please enter your email address");
      return;
    }
    if (password.length < 6) {
      toast.error("Password must be at least 6 characters");
      return;
    }
    if (mode === "up" && !name.trim()) {
      toast.error("Please enter your full name");
      return;
    }

    setLoading(true);
    try {
      const endpoint = mode === "in" ? "/auth/login" : "/auth/register";
      const payload = mode === "in" ? { email, password } : { name, email, password };

      const res = await fetch(`${API_BASE}${endpoint}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || "Authentication failed");
      }

      setStoredAuth(data.token, data.user);
      toast.success(mode === "in" ? "Welcome back!" : "Account created successfully!", {
        description: `Signed in as ${data.user.email}`,
      });

      navigate({ to: "/" as "/" });
    } catch (err: any) {
      toast.error(mode === "in" ? "Sign In Failed" : "Registration Failed", {
        description: err.message || "Please check your credentials and try again.",
      });
    } finally {
      setLoading(false);
    }
  };

  // Quick fill demo credentials
  const fillDemo = () => {
    setEmail("demo@intelligenspace.io");
    setPassword("demo1234");
    setMode("in");
    toast.info("Demo credentials loaded", { description: "Click 'Sign In' or use 1-click Demo below." });
  };

  const hasIncomingToken = typeof window !== "undefined" && new URLSearchParams(window.location.search).has("token");
  if (hasIncomingToken) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center bg-background text-foreground">
        <div className="flex flex-col items-center gap-3 p-6 text-center">
          <Loader2 className="size-8 animate-spin text-primary" />
          <h2 className="text-lg font-bold">Completing Sign In...</h2>
          <p className="text-xs text-muted-foreground">Verifying credentials and establishing your secure session.</p>
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

        <div className="relative z-10 flex items-center gap-2.5 text-sm font-bold tracking-tight">
          <span className="flex size-9 items-center justify-center rounded-xl bg-gradient-to-br from-primary to-purple-600 text-white shadow-md shadow-primary/20">
            <Sparkles className="size-4.5" />
          </span>
          <span className="text-base font-extrabold tracking-tight">IntelligenSpace Hub</span>
        </div>

        <div className="relative z-10 max-w-lg space-y-6">
          <div className="inline-flex items-center gap-2 rounded-full border border-primary/30 bg-primary/10 px-3 py-1 text-xs font-semibold text-primary">
            <ShieldCheck className="size-3.5" /> Enterprise AI Platform
          </div>

          <h2 className="text-3xl lg:text-4xl font-extrabold tracking-tight text-foreground leading-tight">
            Build, Deploy & Govern Autonomous AI Fleets
          </h2>

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

      {/* ── Right Auth Form Panel ─────────────────────────────────── */}
      <section className="flex items-center justify-center p-6 sm:p-12">
        <div className="w-full max-w-md space-y-6">
          <div>
            <h1 className="text-2xl font-extrabold tracking-tight text-foreground">
              {mode === "in" ? "Welcome back" : "Create your workspace account"}
            </h1>
            <p className="mt-1 text-xs text-muted-foreground">
              {mode === "in"
                ? "Enter your credentials or continue with Google to access your AI platform."
                : "Sign up to start building autonomous agents and developer projects."}
            </p>
          </div>

          {/* ── Continue with Google Button ───────────────────────── */}
          <Button
            type="button"
            variant="outline"
            onClick={handleGoogleSignIn}
            disabled={googleLoading || loading}
            className="w-full h-10 gap-2.5 text-xs font-semibold border-border/80 bg-surface-1 hover:bg-surface-2 shadow-xs transition-colors"
          >
            {googleLoading ? (
              <Loader2 className="size-4 animate-spin" />
            ) : (
              <GoogleIcon className="size-4" />
            )}
            Continue with Google
          </Button>

          {/* ── Or Divider ────────────────────────────────────────── */}
          <div className="relative flex items-center justify-center">
            <div className="w-full border-t border-border/80" />
            <span className="absolute bg-background px-3 text-[11px] font-medium uppercase text-muted-foreground">
              or with email
            </span>
          </div>

          {/* ── Email / Password Tabs Form ────────────────────────── */}
          <Tabs value={mode} onValueChange={(v) => setMode(v as any)} className="w-full">
            <TabsList className="w-full h-9">
              <TabsTrigger value="in" className="flex-1 text-xs">
                Sign In
              </TabsTrigger>
              <TabsTrigger value="up" className="flex-1 text-xs">
                Create Account
              </TabsTrigger>
            </TabsList>

            <TabsContent value="in" className="mt-4">
              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="space-y-1.5">
                  <Label htmlFor="email-in" className="text-xs font-semibold">
                    Email Address
                  </Label>
                  <div className="relative">
                    <Mail className="absolute left-3 top-1/2 -translate-y-1/2 size-3.5 text-muted-foreground" />
                    <Input
                      id="email-in"
                      type="email"
                      required
                      placeholder="you@company.com"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      className="pl-9 h-9 text-xs"
                    />
                  </div>
                </div>

                <div className="space-y-1.5">
                  <div className="flex items-center justify-between">
                    <Label htmlFor="pass-in" className="text-xs font-semibold">
                      Password
                    </Label>
                    <button
                      type="button"
                      onClick={() => toast.info("Password Reset", { description: "Contact your administrator or reset via Google OAuth." })}
                      className="text-[11px] text-primary hover:underline"
                    >
                      Forgot password?
                    </button>
                  </div>
                  <div className="relative">
                    <Lock className="absolute left-3 top-1/2 -translate-y-1/2 size-3.5 text-muted-foreground" />
                    <Input
                      id="pass-in"
                      type="password"
                      required
                      placeholder="••••••••"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      className="pl-9 h-9 text-xs"
                    />
                  </div>
                </div>

                <Button type="submit" disabled={loading} className="w-full h-9 gap-1.5 text-xs font-semibold">
                  {loading ? (
                    <>
                      <Loader2 className="size-3.5 animate-spin" /> Signing In...
                    </>
                  ) : (
                    <>
                      Sign In <ArrowRight className="size-3.5" />
                    </>
                  )}
                </Button>
              </form>
            </TabsContent>

            <TabsContent value="up" className="mt-4">
              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="space-y-1.5">
                  <Label htmlFor="name-up" className="text-xs font-semibold">
                    Full Name
                  </Label>
                  <div className="relative">
                    <User className="absolute left-3 top-1/2 -translate-y-1/2 size-3.5 text-muted-foreground" />
                    <Input
                      id="name-up"
                      type="text"
                      required
                      placeholder="Alex Developer"
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      className="pl-9 h-9 text-xs"
                    />
                  </div>
                </div>

                <div className="space-y-1.5">
                  <Label htmlFor="email-up" className="text-xs font-semibold">
                    Email Address
                  </Label>
                  <div className="relative">
                    <Mail className="absolute left-3 top-1/2 -translate-y-1/2 size-3.5 text-muted-foreground" />
                    <Input
                      id="email-up"
                      type="email"
                      required
                      placeholder="you@company.com"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      className="pl-9 h-9 text-xs"
                    />
                  </div>
                </div>

                <div className="space-y-1.5">
                  <Label htmlFor="pass-up" className="text-xs font-semibold">
                    Password (min 6 characters)
                  </Label>
                  <div className="relative">
                    <Lock className="absolute left-3 top-1/2 -translate-y-1/2 size-3.5 text-muted-foreground" />
                    <Input
                      id="pass-up"
                      type="password"
                      required
                      placeholder="••••••••"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      className="pl-9 h-9 text-xs"
                    />
                  </div>
                </div>

                <Button type="submit" disabled={loading} className="w-full h-9 gap-1.5 text-xs font-semibold">
                  {loading ? (
                    <>
                      <Loader2 className="size-3.5 animate-spin" /> Creating Account...
                    </>
                  ) : (
                    <>
                      Create Workspace Account <ArrowRight className="size-3.5" />
                    </>
                  )}
                </Button>
              </form>
            </TabsContent>
          </Tabs>

          {/* ── Demo Quick-Access Panel ───────────────────────────── */}
          <div className="pt-3 border-t border-border/60 space-y-2">
            <div className="flex items-center justify-between text-xs text-muted-foreground">
              <span>Developer Quick Access:</span>
              <button
                type="button"
                onClick={fillDemo}
                className="text-primary hover:underline font-medium text-xs"
              >
                Fill Demo Form
              </button>
            </div>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={handleInstantDemoLogin}
              disabled={demoLoading || loading || googleLoading}
              className="w-full h-8 text-xs font-semibold gap-1.5 border-dashed border-primary/40 bg-primary/5 hover:bg-primary/10 text-primary"
            >
              {demoLoading ? (
                <>
                  <Loader2 className="size-3 animate-spin" /> Signing in as Demo Admin...
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
