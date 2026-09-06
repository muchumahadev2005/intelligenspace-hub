import { useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { AppShell } from "@/components/layout/app-shell";
import { PageHeader } from "@/components/shared/page-header";
import { EmptyState } from "@/components/shared/states";
import { Panel, TaskStatusPill } from "@/components/developer/ui";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { useAITasks } from "@/hooks/use-developer";
import { relative } from "@/lib/format";
import type { TaskStatus } from "@/types/developer";

export const Route = createFileRoute("/developer/tasks")({
  head: () => ({
    meta: [
      { title: "Task history — Developer AI" },
      { name: "description", content: "Every AI engineering agent run across all connected repositories." },
      { property: "og:title", content: "Task history — Developer AI" },
      { property: "og:description", content: "Search and filter all AI agent runs." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: TasksPage,
});

const statuses: (TaskStatus | "all")[] = ["all", "running", "completed", "waiting", "failed"];

function TasksPage() {
  const { data, isLoading } = useAITasks();
  const [q, setQ] = useState("");
  const [status, setStatus] = useState<TaskStatus | "all">("all");

  const tasks = (data ?? []).filter(
    (t) =>
      (status === "all" || t.status === status) &&
      `${t.title} ${t.agent} ${t.user}`.toLowerCase().includes(q.toLowerCase()),
  );

  return (
    <AppShell>
      <PageHeader
        eyebrow="Developer AI"
        title="Task history"
        description="Everything the engineering agents have run, across every connected repository."
      />

      <Panel className="mt-6">
        <div className="flex flex-wrap items-center gap-2">
          <Input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Search tasks…"
            aria-label="Search tasks"
            className="max-w-xs"
          />
          {statuses.map((s) => (
            <Button
              key={s}
              size="sm"
              variant={status === s ? "default" : "outline"}
              onClick={() => setStatus(s)}
              className="capitalize"
            >
              {s}
            </Button>
          ))}
        </div>
      </Panel>

      <div className="mt-6">
        {isLoading ? (
          <Skeleton className="h-72 w-full" />
        ) : tasks.length === 0 ? (
          <EmptyState title="No tasks found" description="Try a different search or filter." />
        ) : (
          <Panel>
            <ul className="divide-y divide-border">
              {tasks.map((t) => (
                <li key={t.id} className="flex flex-wrap items-center gap-3 py-3 text-sm">
                  <span className="min-w-0 flex-1 truncate">{t.title}</span>
                  <Badge variant="secondary">{t.agent}</Badge>
                  <TaskStatusPill status={t.status} />
                  <span className="text-xs text-muted-foreground">{t.filesChanged} files</span>
                  <span className="hidden text-xs text-muted-foreground sm:inline">{t.user}</span>
                  <span className="text-xs text-muted-foreground">{relative(t.createdAt)}</span>
                </li>
              ))}
            </ul>
          </Panel>
        )}
      </div>
    </AppShell>
  );
}
