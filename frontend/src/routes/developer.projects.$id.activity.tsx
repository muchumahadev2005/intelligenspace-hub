import { createFileRoute } from "@tanstack/react-router";
import { ActivityTimeline, Panel, TaskStatusPill } from "@/components/developer/ui";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { EmptyState } from "@/components/shared/states";
import { ScrollArea } from "@/components/ui/scroll-area";
import { useAITasks, useDevActivity } from "@/hooks/use-developer";
import { relative } from "@/lib/format";

export const Route = createFileRoute("/developer/projects/$id/activity")({
  head: () => ({
    meta: [
      { title: "Activity — Developer AI" },
      { name: "description", content: "Every AI agent run and change made on this repository." },
      { property: "og:title", content: "Activity — Developer AI" },
      { property: "og:description", content: "Full history of agent runs for this project." },
    ],
  }),
  component: ActivityPage,
});

function ActivityPage() {
  const { id } = Route.useParams();
  const { data: activity, isLoading } = useDevActivity(id);
  const { data: tasks } = useAITasks(id);

  if (isLoading) return <Skeleton className="h-96 w-full" />;

  return (
    <div className="grid gap-6 lg:grid-cols-2">
      <Panel
        title="Timeline"
        description={activity?.length ? `${activity.length} event${activity.length === 1 ? "" : "s"} recorded` : undefined}
      >
        {activity?.length ? (
          <ScrollArea className="h-[560px] pr-4 pl-3 pt-2">
            <ActivityTimeline items={activity} />
          </ScrollArea>
        ) : (
          <EmptyState title="No activity yet" description="Run an agent to see history here." />
        )}
      </Panel>
      <Panel
        title="Agent runs"
        description={tasks?.length ? `${tasks.length} total run${tasks.length === 1 ? "" : "s"}` : undefined}
      >
        {tasks?.length ? (
          <ScrollArea className="h-[560px] pr-4">
            <ul className="divide-y divide-border">
              {tasks.map((t) => (
                <li key={t.id} className="flex flex-wrap items-center gap-3 py-3 text-sm">
                  <span className="min-w-0 flex-1 truncate">{t.title}</span>
                  <Badge variant="secondary">{t.agent}</Badge>
                  <TaskStatusPill status={t.status} />
                  <span className="text-xs text-muted-foreground">{relative(t.createdAt)}</span>
                </li>
              ))}
            </ul>
          </ScrollArea>
        ) : (
          <EmptyState title="No agent runs yet" description="Execute code reviews, tests, or coding tasks to see them here." />
        )}
      </Panel>
    </div>
  );
}
