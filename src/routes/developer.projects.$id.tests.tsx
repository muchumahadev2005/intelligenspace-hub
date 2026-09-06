import { createFileRoute } from "@tanstack/react-router";
import { toast } from "sonner";
import { DiffView, Panel, ScoreBar } from "@/components/developer/ui";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { useTestAnalysis } from "@/hooks/use-developer";

export const Route = createFileRoute("/developer/projects/$id/tests")({
  head: () => ({
    meta: [
      { title: "Tests — Developer AI" },
      { name: "description", content: "Coverage gaps and AI-generated test suites for this repository." },
      { property: "og:title", content: "Tests — Developer AI" },
      { property: "og:description", content: "Find untested areas and generate the missing tests." },
    ],
  }),
  component: TestsPage,
});

function TestsPage() {
  const { id } = Route.useParams();
  const { data: tests, isLoading } = useTestAnalysis(id);

  if (isLoading || !tests) return <Skeleton className="h-96 w-full" />;

  return (
    <div className="space-y-6">
      <div className="grid gap-6 lg:grid-cols-2">
        <Panel title="Coverage" description={`Framework: ${tests.framework}`}>
          <ScoreBar label="Overall coverage" value={tests.coverage} />
          <ul className="mt-5 divide-y divide-border">
            {tests.missing.map((m) => (
              <li key={m.area} className="flex items-center justify-between py-2.5 text-sm">
                <span className="text-muted-foreground">{m.area}</span>
                <Badge variant="secondary">{m.count} missing</Badge>
              </li>
            ))}
          </ul>
        </Panel>

        <Panel
          title="Suggested tests"
          actions={
            <Button size="sm" onClick={() => toast.success("Test suite generated", { description: "Review the diff below." })}>
              Generate tests
            </Button>
          }
        >
          <ul className="divide-y divide-border">
            {tests.suggested.map((s) => (
              <li key={s.id} className="flex items-center justify-between gap-3 py-2.5 text-sm">
                <span className="min-w-0 truncate">{s.name}</span>
                <Badge variant="secondary">{s.area}</Badge>
              </li>
            ))}
          </ul>
        </Panel>
      </div>

      <Panel title="Generated test code">
        <DiffView lines={tests.generatedDiff} />
      </Panel>
    </div>
  );
}
