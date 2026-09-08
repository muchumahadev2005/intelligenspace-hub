import { useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Loader2, Sparkles } from "lucide-react";
import { DiffView, Panel, ScoreBar } from "@/components/developer/ui";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { useTestAnalysis, useProject } from "@/hooks/use-developer";
import { devApi } from "@/services/developer-api";

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
  const queryClient = useQueryClient();
  const { data: project } = useProject(id);
  const { data: tests, isLoading } = useTestAnalysis(id);
  const [running, setRunning] = useState(false);

  if (isLoading || !tests) return <Skeleton className="h-96 w-full" />;

  const handleGenerateTests = async () => {
    setRunning(true);
    const toastId = toast.loading("Generating test suites with AI...", {
      description: "Analyzing branches, edge cases, and mocking dependencies.",
    });

    try {
      const codeSnippet = `// Project ${project?.name || id}\n// Framework: ${tests.framework || "vitest"}\n// Generate comprehensive tests`;
      const updated = await devApi.tests.run(id, codeSnippet, tests.framework || "vitest");
      queryClient.setQueryData(["dev", "tests", id], updated);
      toast.success("Test suite generated", {
        id: toastId,
        description: `Generated ${updated.suggested?.length || 0} suggested test cases with diff.`,
      });
    } catch (err: any) {
      console.error("Test generation failed", err);
      toast.error("Failed to generate tests", {
        id: toastId,
        description: err?.message || "Please check backend connection.",
      });
    } finally {
      setRunning(false);
    }
  };

  const missing = tests.missing || [];
  const suggested = tests.suggested || [];

  return (
    <div className="space-y-6">
      <div className="grid gap-6 lg:grid-cols-2">
        <Panel title="Coverage" description={`Framework: ${tests.framework}`}>
          <ScoreBar label="Overall coverage" value={tests.coverage || 0} />
          <ul className="mt-5 divide-y divide-border">
            {missing.map((m) => (
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
            <Button size="sm" onClick={handleGenerateTests} disabled={running} className="gap-1.5">
              {running ? (
                <>
                  <Loader2 className="size-3.5 animate-spin" />
                  Generating...
                </>
              ) : (
                <>
                  <Sparkles className="size-3.5" />
                  Generate tests
                </>
              )}
            </Button>
          }
        >
          <ul className="divide-y divide-border">
            {suggested.map((s) => (
              <li key={s.id} className="flex items-center justify-between gap-3 py-2.5 text-sm">
                <span className="min-w-0 truncate">{s.name}</span>
                <Badge variant="secondary">{s.area}</Badge>
              </li>
            ))}
          </ul>
        </Panel>
      </div>

      <Panel title="Generated test code">
        <DiffView lines={tests.generatedDiff || []} />
      </Panel>
    </div>
  );
}
