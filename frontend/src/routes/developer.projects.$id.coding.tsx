import { useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Loader2, Sparkles } from "lucide-react";
import { DiffView, Panel, TaskStatusPill } from "@/components/developer/ui";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { Skeleton } from "@/components/ui/skeleton";
import { useCodingTask } from "@/hooks/use-developer";
import { devApi } from "@/services/developer-api";

export const Route = createFileRoute("/developer/projects/$id/coding")({
  head: () => ({
    meta: [
      { title: "Coding agent — Developer AI" },
      { name: "description", content: "Describe a feature and watch the AI agent plan, implement and diff the changes." },
      { property: "og:title", content: "Coding agent — Developer AI" },
      { property: "og:description", content: "Plan-and-implement AI agent with file-level diffs." },
    ],
  }),
  component: CodingPage,
});

function CodingPage() {
  const { id } = Route.useParams();
  const queryClient = useQueryClient();
  const { data: task, isLoading } = useCodingTask(id);
  const [prompt, setPrompt] = useState("");
  const [running, setRunning] = useState(false);

  if (isLoading || !task) return <Skeleton className="h-96 w-full" />;

  const run = async () => {
    if (!prompt.trim()) {
      toast.error("Describe what you want built");
      return;
    }
    setRunning(true);
    const toastId = toast.loading("Coding agent is working...", {
      description: "Planning implementation steps and generating code diffs.",
    });

    try {
      const updated = await devApi.coding.run(id, prompt.trim());
      queryClient.setQueryData(["dev", "coding", id], updated);
      setPrompt("");
      toast.success("Implementation ready", {
        id: toastId,
        description: `Generated ${updated.changes?.length || 0} file diffs and plan steps.`,
      });
    } catch (err: any) {
      console.error("Coding task failed", err);
      toast.error("Failed to run coding agent", {
        id: toastId,
        description: err?.message || "Please check backend connection.",
      });
    } finally {
      setRunning(false);
    }
  };

  return (
    <div className="grid gap-6 lg:grid-cols-[380px_1fr]">
      <div className="space-y-6">
        <Panel title="What should we build?" description="Describe the feature, refactor or fix.">
          <Textarea
            value={prompt}
            onChange={(e) => setPrompt(e.target.value)}
            rows={6}
            placeholder={task.prompt}
            aria-label="Feature prompt"
          />
          <Button className="mt-3 w-full" onClick={run} disabled={running}>
            {running ? "Building…" : "Run coding agent"}
          </Button>
        </Panel>

        <Panel title="Steps">
          <ul className="space-y-3">
            {task.steps.map((s) => (
              <li key={s.id} className="flex items-center justify-between gap-3 text-sm">
                <span className="min-w-0 truncate text-muted-foreground">{s.label}</span>
                <TaskStatusPill status={s.status} />
              </li>
            ))}
          </ul>
        </Panel>
      </div>

      <div className="space-y-6">
        <Panel title="Plan">
          <ul className="space-y-2 text-sm">
            {task.plan.map((p) => (
              <li key={p.id} className="flex items-start gap-3">
                <span
                  className={
                    p.done
                      ? "mt-1 size-2 rounded-full bg-emerald-400"
                      : "mt-1 size-2 rounded-full bg-muted-foreground/40"
                  }
                  aria-hidden
                />
                <span className={p.done ? "text-muted-foreground line-through" : ""}>{p.label}</span>
              </li>
            ))}
          </ul>
        </Panel>

        <Panel title="Changed files">
          <ul className="divide-y divide-border">
            {task.changes.map((c) => (
              <li key={c.path} className="flex flex-wrap items-center gap-3 py-2.5 text-xs">
                <span className="min-w-0 flex-1 truncate font-mono">{c.path}</span>
                <Badge variant="secondary" className="capitalize">{c.change}</Badge>
                <span className="tabular-nums text-emerald-400">+{c.additions}</span>
                <span className="tabular-nums text-destructive">-{c.deletions}</span>
              </li>
            ))}
          </ul>
        </Panel>

        <Panel title="Diff">
          <DiffView lines={task.diff} />
          <div className="mt-3 flex gap-2">
            <Button size="sm" onClick={() => toast.success("Changes merged to branch")}>
              Merge changes
            </Button>
            <Button size="sm" variant="ghost" onClick={() => toast("Changes discarded")}>
              Discard
            </Button>
          </div>
        </Panel>
      </div>
    </div>
  );
}
