import { createFileRoute, Link } from "@tanstack/react-router";
import {
  Activity,
  Bug,
  FileText,
  FolderGit2,
  Network,
  ScanSearch,
  ShieldCheck,
  Sparkles,
  TestTube2,
} from "lucide-react";
import { AppShell } from "@/components/layout/app-shell";
import { PageHeader } from "@/components/shared/page-header";
import { CardsSkeleton } from "@/components/shared/states";
import { ActivityTimeline, Panel, TaskStatusPill } from "@/components/developer/ui";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { useAITasks, useDevActivity, useProjects } from "@/hooks/use-developer";
import { relative } from "@/lib/format";

export const Route = createFileRoute("/developer/")({
  head: () => ({
    meta: [
      { title: "Developer AI workspace — AI Platform" },
      {
        name: "description",
        content:
          "AI code review, debugging, coding, architecture, tests, security and documentation agents for your repositories.",
      },
      { property: "og:title", content: "Developer AI workspace — AI Platform" },
      {
        property: "og:description",
        content: "Specialised AI engineering agents across all of your connected projects.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: DeveloperHome,
});

const tools = [
  { label: "Code Review", desc: "Find bugs, smells and risky patterns.", icon: ScanSearch, slug: "review" },
  { label: "Debugger", desc: "Root-cause an error with a suggested patch.", icon: Bug, slug: "debug" },
  { label: "Coding Agent", desc: "Plan and implement a feature end to end.", icon: Sparkles, slug: "coding" },
  { label: "Architecture", desc: "Design systems, data models and APIs.", icon: Network, slug: "architecture" },
  { label: "Test Agent", desc: "Spot coverage gaps and generate tests.", icon: TestTube2, slug: "tests" },
  { label: "Security", desc: "Scan for vulnerabilities and secrets.", icon: ShieldCheck, slug: "security" },
  { label: "Documentation", desc: "Generate READMEs, guides and API docs.", icon: FileText, slug: "documentation" },
];

function DeveloperHome() {
  const { data: projects, isLoading } = useProjects();
  const { data: tasks } = useAITasks();
  const { data: activity } = useDevActivity();
  const firstId = projects?.[0]?.id;

  return (
    <AppShell>
      <PageHeader
        eyebrow="Developer AI"
        title="Engineering workspace"
        description="Seven specialised AI agents that review, debug, build, secure and document your codebases."
        actions={
          <>
            <Button asChild variant="outline">
              <Link to={"/developer/projects" as "/"}>
                <FolderGit2 /> All projects
              </Link>
            </Button>
            <Button asChild>
              <Link to={"/developer/projects/new" as "/"}>Connect repository</Link>
            </Button>
          </>
        }
      />

      <section className="mt-6 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {tools.map((tool) => (
          <Link
            key={tool.slug}
            to={(firstId ? `/developer/projects/$id/${tool.slug}` : "/developer/projects") as "/"}
            params={(firstId ? { id: firstId } : {}) as never}
            className="panel group p-5 transition-colors hover:border-primary/40"
          >
            <span
              className="flex size-9 items-center justify-center rounded-lg bg-primary/12 text-primary"
              aria-hidden
            >
              <tool.icon className="size-4" />
            </span>
            <h2 className="mt-3 text-sm font-semibold">{tool.label}</h2>
            <p className="mt-1 text-xs text-muted-foreground">{tool.desc}</p>
          </Link>
        ))}
      </section>

      <Panel title="Projects" description="Repositories connected to the workspace." className="mt-8">
        {isLoading ? (
          <CardsSkeleton count={3} />
        ) : (
          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
            {projects?.map((p) => (
              <Link
                key={p.id}
                to={"/developer/projects/$id" as "/"}
                params={{ id: p.id } as never}
                className="rounded-xl border border-border p-4 transition-colors hover:border-primary/40"
              >
                <div className="flex items-center justify-between gap-2">
                  <h3 className="truncate text-sm font-semibold">{p.name}</h3>
                  <Badge variant="secondary">{p.language}</Badge>
                </div>
                <p className="mt-1 line-clamp-2 text-xs text-muted-foreground">{p.description}</p>
                <div className="mt-3 flex flex-wrap gap-3 text-[11px] text-muted-foreground">
                  <span>Quality {p.codeQuality}%</span>
                  <span>Security {p.security}%</span>
                  <span>Coverage {p.coverage}%</span>
                </div>
              </Link>
            ))}
          </div>
        )}
      </Panel>

      <div className="mt-8 grid gap-6 lg:grid-cols-2">
        <Panel
          title="Recent AI tasks"
          actions={
            <Button asChild size="sm" variant="ghost">
              <Link to={"/developer/tasks" as "/"}>View all</Link>
            </Button>
          }
        >
          <ul className="divide-y divide-border">
            {tasks?.slice(0, 6).map((t) => (
              <li key={t.id} className="flex items-center gap-3 py-3 text-sm">
                <span className="min-w-0 flex-1 truncate">{t.title}</span>
                <Badge variant="secondary">{t.agent}</Badge>
                <TaskStatusPill status={t.status} />
                <span className="hidden text-xs text-muted-foreground sm:inline">
                  {relative(t.createdAt)}
                </span>
              </li>
            ))}
          </ul>
        </Panel>

        <Panel title="Activity">
          <ActivityTimeline items={activity ?? []} />
          <p className="mt-4 flex items-center gap-2 text-xs text-muted-foreground">
            <Activity className="size-3.5" aria-hidden /> Updated continuously as agents run.
          </p>
        </Panel>
      </div>
    </AppShell>
  );
}
