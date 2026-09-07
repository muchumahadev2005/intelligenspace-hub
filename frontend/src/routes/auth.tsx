import { useState } from "react";
import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { Sparkles } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

export const Route = createFileRoute("/auth")({
  head: () => ({
    meta: [
      { title: "Sign in — AI Platform" },
      {
        name: "description",
        content: "Sign in or create an account to build, deploy and monitor AI voice agents.",
      },
      { property: "og:title", content: "Sign in — AI Platform" },
      { property: "og:description", content: "Access your AI voice agent workspace." },
    ],
  }),
  component: AuthPage,
});

function AuthPage() {
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  const submit = (mode: "in" | "up") => (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim() || password.length < 6) {
      toast.error("Check your details", { description: "Enter an email and a password of at least 6 characters." });
      return;
    }
    toast.success(mode === "in" ? "Welcome back" : "Account created");
    navigate({ to: mode === "in" ? "/" : "/onboarding" });
  };

  return (
    <main className="grid min-h-screen lg:grid-cols-2">
      <section className="hidden flex-col justify-between bg-muted/40 p-10 lg:flex">
        <div className="flex items-center gap-2 text-sm font-semibold">
          <Sparkles className="size-4 text-primary" aria-hidden /> AI Platform
        </div>
        <div className="max-w-md">
          <h2 className="text-3xl font-semibold tracking-tight">Voice agents that actually close the loop.</h2>
          <p className="mt-3 text-sm text-muted-foreground">
            Answer calls, book appointments and take orders — with transcripts, analytics and webhooks built in.
          </p>
        </div>
        <p className="text-xs text-muted-foreground">Demo experience · no real telephony</p>
      </section>

      <section className="flex items-center justify-center p-6">
        <div className="w-full max-w-sm">
          <h1 className="text-2xl font-semibold tracking-tight">Welcome to AI Platform</h1>
          <p className="mt-1 text-sm text-muted-foreground">Use any email to explore the demo workspace.</p>

          <Tabs defaultValue="in" className="mt-6">
            <TabsList className="w-full">
              <TabsTrigger value="in" className="flex-1">Sign in</TabsTrigger>
              <TabsTrigger value="up" className="flex-1">Create account</TabsTrigger>
            </TabsList>

            {(["in", "up"] as const).map((mode) => (
              <TabsContent key={mode} value={mode} className="mt-6">
                <form className="space-y-4" onSubmit={submit(mode)}>
                  <div className="space-y-2">
                    <Label htmlFor={`email-${mode}`}>Email</Label>
                    <Input
                      id={`email-${mode}`}
                      type="email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      placeholder="you@company.com"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor={`pass-${mode}`}>Password</Label>
                    <Input
                      id={`pass-${mode}`}
                      type="password"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      placeholder="••••••••"
                    />
                  </div>
                  <Button type="submit" className="w-full">
                    {mode === "in" ? "Sign in" : "Create account"}
                  </Button>
                </form>
              </TabsContent>
            ))}
          </Tabs>
        </div>
      </section>
    </main>
  );
}
