import { useState, useMemo, useEffect, useRef } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Loader2, Sparkles, TestTube2, CheckCircle2, Copy, FileCheck, Play } from "lucide-react";
import { DiffView, Panel, ScoreBar } from "@/components/developer/ui";
import { FileSelectorBar } from "@/components/developer/file-selector-bar";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useTestAnalysis, useProject } from "@/hooks/use-developer";
import { useDeveloperModel } from "@/hooks/use-developer-model";
import { devApi } from "@/services/developer-api";
import { getProjectCodeFiles, loadProjectFileCode } from "@/lib/github-tree";

export const Route = createFileRoute("/developer/projects/$id/tests")({
  head: () => ({
    meta: [
      { title: "Tests — Developer AI" },
      { name: "description", content: "Test suites, coverage gaps and test case generation file by file." },
      { property: "og:title", content: "Tests — Developer AI" },
      { property: "og:description", content: "Automated test synthesis and coverage analyzer file-by-file." },
    ],
  }),
  component: TestsPage,
});

const FRAMEWORKS = ["vitest", "jest", "mocha", "pytest", "go test"];

function TestsPage() {
  const { id } = Route.useParams();
  const queryClient = useQueryClient();
  const { data: project } = useProject(id);
  const { data: tests, isLoading } = useTestAnalysis(id);
  const { selectedModel, assertCanRun, invalidateQuota } = useDeveloperModel();

  // File list & selection for file-by-file testing
  const files = useMemo(() => getProjectCodeFiles(project, id), [project, id]);
  const [selectedPath, setSelectedPath] = useState<string>("");
  const fileContentCacheRef = useRef<Record<string, string>>({});
  const [currentFileCode, setCurrentFileCode] = useState<string>("");

  const [framework, setFramework] = useState<string>("vitest");
  const [running, setRunning] = useState(false);

  // Track which files have tests generated
  const [testedFiles, setTestedFiles] = useState<Record<string, boolean>>(() => {
    if (typeof window !== "undefined") {
      try {
        const saved = localStorage.getItem(`project_tested_files_${id}`);
        if (saved) return JSON.parse(saved);
      } catch {}
    }
    return {};
  });

  // Default selection
  useEffect(() => {
    if (files.length > 0 && !selectedPath) {
      const preferred =
        files.find((f) => {
          const p = f.path.toLowerCase();
          return (
            (p.includes("controller") || p.includes("util") || p.includes("service") || p.includes("route")) &&
            !p.includes(".test.") &&
            !p.includes(".spec.")
          );
        }) || files[0];
      if (preferred) setSelectedPath(preferred.path);
    }
  }, [files, selectedPath]);

  // Load code for selected file
  useEffect(() => {
    if (!selectedPath) return;
    let isMounted = true;

    if (fileContentCacheRef.current[selectedPath] !== undefined) {
      setCurrentFileCode(fileContentCacheRef.current[selectedPath]);
      return;
    }

    loadProjectFileCode(project, selectedPath, fileContentCacheRef.current)
      .then((code) => {
        if (isMounted) {
          const loaded = code || "";
          fileContentCacheRef.current[selectedPath] = loaded;
          setCurrentFileCode(loaded);
        }
      })
      .catch(() => {});

    return () => {
      isMounted = false;
    };
  }, [selectedPath, project]);

  const handleGenerateTests = async () => {
    if (!selectedPath) {
      toast.error("Please select a target file first");
      return;
    }

    if (!assertCanRun()) return;

    setRunning(true);
    const toastId = toast.loading(`Generating ${framework} tests with ${selectedModel.name} for ${selectedPath.split("/").pop()}...`, {
      description: "Synthesizing test cases, mocking dependencies, and checking coverage.",
    });

    try {
      const codeToTest = currentFileCode || `// File: ${selectedPath}\n// Language: ${project?.language || "TypeScript"}`;
      const updated = await devApi.tests.run(id, codeToTest, framework, selectedPath, selectedModel.id);
      invalidateQuota();

      queryClient.setQueryData(["dev", "tests", id], updated);

      const nextTested = { ...testedFiles, [selectedPath]: true };
      setTestedFiles(nextTested);
      if (typeof window !== "undefined") {
        localStorage.setItem(`project_tested_files_${id}`, JSON.stringify(nextTested));
      }

      toast.success("Unit tests generated", {
        id: toastId,
        description: `Generated ${updated.suggested?.length || 0} unit test scenarios with ${updated.coverage || 85}% target coverage.`,
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

  const handleCopyTestCode = () => {
    if (!tests?.generatedDiff) return;
    const code = tests.generatedDiff
      .map((l) => (l.type === "add" ? l.text.replace(/^\+\s?/, "") : l.text))
      .join("\n");
    navigator.clipboard.writeText(code);
    toast.success("Test code copied to clipboard!");
  };

  const missing = tests?.missing || [];
  const suggested = tests?.suggested || [];

  return (
    <div className="space-y-6">
      {/* File Selector Bar */}
      <FileSelectorBar
        files={files}
        selectedPath={selectedPath}
        onSelectPath={setSelectedPath}
        completedMap={testedFiles}
        label="Test target"
        actions={
          <div className="flex items-center gap-2">
            <div className="w-28">
              <Select value={framework} onValueChange={setFramework}>
                <SelectTrigger className="h-8 text-xs">
                  <SelectValue placeholder="Framework" />
                </SelectTrigger>
                <SelectContent>
                  {FRAMEWORKS.map((fw) => (
                    <SelectItem key={fw} value={fw} className="text-xs">
                      {fw}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <Button size="sm" onClick={handleGenerateTests} disabled={running} className="gap-1.5 h-8">
              {running ? (
                <>
                  <Loader2 className="size-3.5 animate-spin" /> Generating...
                </>
              ) : (
                <>
                  <Sparkles className="size-3.5" /> Generate Tests
                </>
              )}
            </Button>
          </div>
        }
      />

      {!tests ? (
        <Panel
          title="Test Coverage & Suite Generator"
          description="Detect missing unit test branches and generate test suites with AI file by file."
        >
          <div className="flex flex-col items-center justify-center py-16 text-center">
            <div className="size-12 rounded-full bg-primary/10 flex items-center justify-center text-primary mb-3">
              <TestTube2 className="size-6" />
            </div>
            <h3 className="text-base font-semibold">
              {selectedPath ? `Ready to test ${selectedPath.split("/").pop()}` : "Ready to generate unit tests"}
            </h3>
            <p className="mt-1.5 text-xs text-muted-foreground max-w-md">
              Target a file above and click &ldquo;Generate Tests&rdquo;. The AI test engineer will analyze the functions,
              parameters, and edge cases to produce production-grade unit tests.
            </p>
            {selectedPath && (
              <Badge variant="outline" className="mt-4 font-mono text-xs">
                Selected: {selectedPath}
              </Badge>
            )}
            <Button className="mt-6 gap-2" onClick={handleGenerateTests} disabled={running}>
              {running ? (
                <>
                  <Loader2 className="size-4 animate-spin" /> Generating Tests...
                </>
              ) : (
                <>
                  <Sparkles className="size-4" /> Generate Unit Tests
                </>
              )}
            </Button>
          </div>
        </Panel>
      ) : (
        <div className="space-y-6">
          <div className="grid gap-6 lg:grid-cols-2">
            <Panel
              title="Test Coverage & Analysis"
              description={`Target: ${tests.filePath || selectedPath || "Source file"} · Framework: ${tests.framework || framework}`}
            >
              <ScoreBar label="Estimated test coverage" value={tests.coverage || 85} />

              <div className="mt-5">
                <span className="text-[11px] font-medium uppercase tracking-wider text-muted-foreground block mb-2">
                  Missing Test Scenarios & Edge Cases
                </span>
                {missing.length > 0 ? (
                  <ul className="divide-y divide-border">
                    {missing.map((m, idx) => (
                      <li key={idx} className="flex items-center justify-between py-2 text-xs">
                        <span className="text-foreground">{m.area}</span>
                        <Badge variant="secondary" className="tabular-nums">
                          {m.count} tests needed
                        </Badge>
                      </li>
                    ))}
                  </ul>
                ) : (
                  <p className="text-xs text-muted-foreground">All primary branches and edge cases covered.</p>
                )}
              </div>
            </Panel>

            <Panel title="Generated Test Cases" description={`${suggested.length} automated test scenarios`}>
              <ul className="space-y-2.5">
                {suggested.map((s) => (
                  <li key={s.id} className="flex items-start gap-2.5 rounded-lg border border-border bg-card/40 p-2.5 text-xs">
                    <CheckCircle2 className="size-4 text-emerald-400 mt-0.5 shrink-0" />
                    <div>
                      <p className="font-medium text-foreground">{s.name}</p>
                      <p className="text-[11px] text-muted-foreground">{s.area}</p>
                    </div>
                  </li>
                ))}
              </ul>
            </Panel>
          </div>

          {tests.generatedDiff && tests.generatedDiff.length > 0 && (
            <Panel
              title="Generated Test Suite Code"
              description={`Unit test implementation for ${tests.filePath || selectedPath}`}
              actions={
                <Button size="sm" variant="outline" onClick={handleCopyTestCode} className="gap-1.5 text-xs">
                  <Copy className="size-3.5" /> Copy Test Code
                </Button>
              }
            >
              <DiffView lines={tests.generatedDiff} />
            </Panel>
          )}
        </div>
      )}
    </div>
  );
}
