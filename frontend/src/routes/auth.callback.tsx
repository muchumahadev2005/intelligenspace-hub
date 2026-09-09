import { useEffect } from "react";
import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { Loader2 } from "lucide-react";
import { toast } from "sonner";
import { setStoredAuth } from "@/lib/api-client";

export const Route = createFileRoute("/auth/callback")({
  component: AuthCallbackPage,
});

function AuthCallbackPage() {
  const navigate = useNavigate();

  useEffect(() => {
    if (typeof window === "undefined") return;

    const params = new URLSearchParams(window.location.search);
    const token = params.get("token");
    const userRaw = params.get("user");
    const error = params.get("error");

    if (error) {
      toast.error("Authentication Error", { description: error });
      navigate({ to: "/auth" as "/" });
      return;
    }

    if (token) {
      try {
        const user = userRaw ? JSON.parse(decodeURIComponent(userRaw)) : { email: "user@intelligenspace.io" };
        setStoredAuth(token, user);
        toast.success(`Welcome back, ${user.name || "User"}!`, {
          description: "Signed in successfully with Google.",
        });
        navigate({ to: "/" as "/" });
      } catch (err: any) {
        console.error("Failed to parse Google user payload:", err);
        setStoredAuth(token, { email: "user@intelligenspace.io" });
        navigate({ to: "/" as "/" });
      }
    } else {
      navigate({ to: "/auth" as "/" });
    }
  }, [navigate]);

  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-background text-foreground">
      <div className="flex flex-col items-center gap-3 p-6 text-center">
        <Loader2 className="size-8 animate-spin text-primary" />
        <h2 className="text-lg font-bold">Completing Sign In...</h2>
        <p className="text-xs text-muted-foreground">Verifying Google credentials and establishing secure session.</p>
      </div>
    </div>
  );
}
