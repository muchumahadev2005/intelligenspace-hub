import { createFileRoute } from "@tanstack/react-router";
import { AlertTriangle, FileCode2, ShieldCheck, TestTube2 } from "lucide-react";
import { ActivityTimeline, Panel, ScoreBar, TaskStatusPill } from "@/components/developer/ui";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { ScrollArea } from "@/components/ui/scroll-area";
import { useAITasks, useDevActivity, useProject } from "@/hooks/use-developer";
import { relative } from "@/lib/format";

export const Route = createFileRoute("/developer/projects/$id/")({
  head: () => ({
    meta: [
      { title: "Project overview — Developer AI" },
      { name: "description", content: "Health scores, open findings and recent agent runs for this repository." },
      { property: "og:title", content: "Project overview — Developer AI" },
      { property: "og:description", content: "Quality, security and coverage at a glance." },
    ],
  }),
  component: Overview,
});

function Overview() {
  const { id } = Route.useParams();
  const { data: project, isLoading } = useProject(id);
  const { data: tasks } = useAITasks(id);
  const { data: activity } = useDevActivity(id);

  if (isLoading || !project) return <Skeleton className="h-64 w-full" />;

  const summary = [
    { label: "Security issues", value: project.findingsSummary.securityIssues, icon: ShieldCheck },
    { label: "Review suggestions", value: project.findingsSummary.reviewSuggestions, icon: FileCode2 },
    { label: "Missing tests", value: project.findingsSummary.missingTests, icon: TestTube2 },
    { label: "Architecture warnings", value: project.findingsSummary.architectureWarnings, icon: AlertTriangle },
  ];

  return (
    <div className="space-y-6">
      <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {summary.map((s) => (
          <div key={s.label} className="panel p-5">
            <span className="flex size-9 items-center justify-center rounded-lg bg-primary/12 text-primary" aria-hidden>
              <s.icon className="size-4" />
            </span>
            <p className="mt-3 text-2xl font-semibold tabular-nums">{s.value}</p>
            <p className="text-xs text-muted-foreground">{s.label}</p>
          </div>
        ))}
      </section>

      <div className="grid gap-6 lg:grid-cols-2">
        <Panel title="Health scores" description={`Last analysed ${relative(project.lastAnalyzedAt)}`}>
          <div className="space-y-4">
            <ScoreBar label="Code quality" value={project.codeQuality} />
            <ScoreBar label="Security" value={project.security} />
            <ScoreBar label="Test coverage" value={project.coverage} />
          </div>
          <p className="mt-4 text-xs text-muted-foreground">
            Architecture rating: <span className="text-foreground">{project.architectureRating}</span>
          </p>
        </Panel>

        <Panel title="Stack">
          <div className="flex flex-wrap gap-2">
            {project.stack.map((s) => (
              <Badge key={s} variant="secondary">{s}</Badge>
            ))}
          </div>
          <h3 className="mt-5 text-xs font-semibold text-muted-foreground">Structure</h3>
          <ul className="mt-2 space-y-1 font-mono text-xs text-muted-foreground">
            {project.structure.map((line) => (
              <li key={line}>{line}</li>
            ))}
          </ul>
        </Panel>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <Panel title="Recent agent runs">
          {tasks?.length ? (
            <ScrollArea className="h-[320px] pr-4">
              <ul className="divide-y divide-border">
                {tasks.map((t) => (
                  <li key={t.id} className="flex items-center gap-3 py-3 text-sm">
                    <span className="min-w-0 flex-1 truncate">{t.title}</span>
                    <Badge variant="secondary">{t.agent}</Badge>
                    <TaskStatusPill status={t.status} />
                  </li>
                ))}
              </ul>
            </ScrollArea>
          ) : (
            <p className="py-3 text-sm text-muted-foreground">No agent runs yet.</p>
          )}
        </Panel>
        <Panel title="Activity">
          {activity?.length ? (
            <ScrollArea className="h-[320px] pr-4 pl-3 pt-2">
              <ActivityTimeline items={activity} />
            </ScrollArea>
          ) : (
            <p className="py-3 text-sm text-muted-foreground">No activity recorded yet.</p>
          )}
        </Panel>
      </div>
    </div>
  );
}
