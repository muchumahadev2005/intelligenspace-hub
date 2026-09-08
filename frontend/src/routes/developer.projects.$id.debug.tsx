import { useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Loader2, Sparkles } from "lucide-react";
import { DiffView, Panel } from "@/components/developer/ui";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Skeleton } from "@/components/ui/skeleton";
import { Progress } from "@/components/ui/progress";
import { useDebugSession } from "@/hooks/use-developer";
import { devApi } from "@/services/developer-api";
import { relative } from "@/lib/format";

export const Route = createFileRoute("/developer/projects/$id/debug")({
  head: () => ({
    meta: [
      { title: "Debugger — Developer AI" },
      { name: "description", content: "Paste an error and get a root-cause analysis with a suggested patch." },
      { property: "og:title", content: "Debugger — Developer AI" },
      { property: "og:description", content: "AI root-cause analysis and patches for runtime errors." },
    ],
  }),
  component: DebugPage,
});

function DebugPage() {
  const { id } = Route.useParams();
  const queryClient = useQueryClient();
  const { data: session, isLoading } = useDebugSession(id);
  const [input, setInput] = useState("");
  const [running, setRunning] = useState(false);

  if (isLoading || !session) return <Skeleton className="h-96 w-full" />;

  const run = async () => {
    if (!input.trim()) {
      toast.error("Paste an error message first");
      return;
    }
    setRunning(true);
    const toastId = toast.loading("Analyzing runtime error with AI...", {
      description: "Tracing stack trace and root causes.",
    });

    try {
      const updated = await devApi.debug.run(id, input.trim());
      queryClient.setQueryData(["dev", "debug", id], updated);
      setInput("");
      toast.success("AI Debug Analysis complete", {
        id: toastId,
        description: `Root cause identified with ${updated.confidence}% confidence.`,
      });
    } catch (err: any) {
      console.error("Debug analysis failed", err);
      toast.error("Failed to analyze error", {
        id: toastId,
        description: err?.message || "Please check backend connection.",
      });
    } finally {
      setRunning(false);
    }
  };

  return (
    <div className="grid gap-6 lg:grid-cols-[380px_1fr]">
      <Panel title="Report an error" description="Stack trace, log output or a description of the failure.">
        <Textarea
          value={input}
          onChange={(e) => setInput(e.target.value)}
          rows={10}
          placeholder={session.errorMessage}
          aria-label="Error message"
          className="font-mono text-xs"
        />
        <Button className="mt-3 w-full" onClick={run} disabled={running}>
          {running ? "Analysing…" : "Analyse error"}
        </Button>
      </Panel>

      <div className="space-y-6">
        <Panel title={session.title} description={`Analysed ${relative(session.createdAt)}`}>
          <pre className="overflow-x-auto rounded-lg border border-destructive/30 bg-destructive/10 p-4 font-mono text-xs text-destructive">
            {session.errorMessage}
          </pre>
          <h3 className="mt-5 text-xs font-semibold text-muted-foreground">Root cause</h3>
          <p className="mt-1 text-sm">{session.rootCause}</p>
          <div className="mt-4">
            {(() => {
              const conf = session.confidence <= 1 ? Math.round(session.confidence * 100) : Math.round(session.confidence);
              return (
                <>
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-muted-foreground">Confidence</span>
                    <span className="tabular-nums font-medium">{conf}%</span>
                  </div>
                  <Progress value={conf} className="mt-2 h-1.5" />
                </>
              );
            })()}
          </div>
        </Panel>

        <Panel title="Reasoning">
          <ol className="space-y-2 text-sm">
            {session.reasoning.map((step, i) => (
              <li key={i} className="flex gap-3">
                <span className="mt-0.5 flex size-5 shrink-0 items-center justify-center rounded-full bg-primary/12 text-[11px] font-medium text-primary">
                  {i + 1}
                </span>
                <span className="text-muted-foreground">{step}</span>
              </li>
            ))}
          </ol>
        </Panel>

        <Panel title="Suggested fix" description={session.suggestedFix}>
          <DiffView lines={session.patch} />
          <Button
            size="sm"
            className="mt-3"
            onClick={() => toast.success("Patch applied", { description: session.title })}
          >
            Apply patch
          </Button>
        </Panel>
      </div>
    </div>
  );
}
