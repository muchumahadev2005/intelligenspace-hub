import { useState, useMemo, useEffect, useRef } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Loader2, Sparkles, FileText, Copy, BookOpen, Check, Layers } from "lucide-react";
import { CodeBlock, Panel } from "@/components/developer/ui";
import { FileSelectorBar } from "@/components/developer/file-selector-bar";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useDocumentation, useProject } from "@/hooks/use-developer";
import { useDeveloperModel } from "@/hooks/use-developer-model";
import { devApi } from "@/services/developer-api";
import { getProjectCodeFiles, loadProjectFileCode } from "@/lib/github-tree";
import { relative } from "@/lib/format";
import type { DocumentationDoc } from "@/types/developer";

export const Route = createFileRoute("/developer/projects/$id/documentation")({
  head: () => ({
    meta: [
      { title: "Documentation — Developer AI" },
      { name: "description", content: "Generated READMEs, API references, setup and deployment guides file-by-file." },
      { property: "og:title", content: "Documentation — Developer AI" },
      { property: "og:description", content: "AI-written documentation kept in sync with the codebase." },
    ],
  }),
  component: DocsPage,
});

const DOC_KINDS = [
  "README",
  "API Reference",
  "Setup & Architecture",
  "File JSDoc & Types",
];

function DocsPage() {
  const { id } = Route.useParams();
  const queryClient = useQueryClient();
  const { data: project } = useProject(id);
  const { data: docs = [], isLoading } = useDocumentation(id);
  const { selectedModel, assertCanRun, invalidateQuota } = useDeveloperModel();

  // File list & selection for file-by-file documentation
  const files = useMemo(() => getProjectCodeFiles(project, id), [project, id]);
  const [selectedPath, setSelectedPath] = useState<string>("");
  const fileContentCacheRef = useRef<Record<string, string>>({});
  const [currentFileCode, setCurrentFileCode] = useState<string>("");

  const [activeKind, setActiveKind] = useState<string>("README");
  const [activeDocId, setActiveDocId] = useState<string | null>(null);
  const [running, setRunning] = useState(false);

  // Default selection
  useEffect(() => {
    if (files.length > 0 && !selectedPath) {
      const preferred =
        files.find((f) => {
          const p = f.path.toLowerCase();
          return p.includes("readme") || p.includes("app.") || p.includes("server.") || p.includes("index.");
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

  const activeDoc = docs.find((d) => d.id === activeDocId) ?? docs[0] ?? null;

  const handleGenerateDocs = async (kindToGenerate = activeKind) => {
    if (!assertCanRun()) return;

    setRunning(true);
    const targetLabel = selectedPath ? selectedPath.split("/").pop() : project?.name || "Project";
    const toastId = toast.loading(`Generating ${kindToGenerate} with ${selectedModel.name} for ${targetLabel}...`, {
      description: "Extracting endpoints, interfaces, setup commands and documentation.",
    });

    try {
      const codeSnippet = currentFileCode || `// Documentation target: ${selectedPath || project?.name || id}\n// Framework: ${project?.framework || "React / Node"}`;
      const newDoc = await devApi.documentation.generate(id, codeSnippet, kindToGenerate, selectedPath || undefined, selectedModel.id);
      invalidateQuota();

      const updatedDocs = [newDoc, ...docs.filter((d) => d.id !== newDoc.id && d.kind !== newDoc.kind)];
      queryClient.setQueryData(["dev", "docs", id], updatedDocs);
      setActiveDocId(newDoc.id);
      setActiveKind(newDoc.kind);
      toast.success("Documentation generated", {
        id: toastId,
        description: `Successfully generated ${newDoc.kind}.`,
      });
    } catch (err: any) {
      console.error("Documentation generation failed", err);
      toast.error("Failed to generate documentation", {
        id: toastId,
        description: err?.message || "Please check backend connection.",
      });
    } finally {
      setRunning(false);
    }
  };

  const handleCopyContent = () => {
    if (!activeDoc?.content) return;
    navigator.clipboard.writeText(activeDoc.content);
    toast.success("Documentation copied to clipboard!");
  };

  return (
    <div className="space-y-6">
      {/* File Selector Bar */}
      <FileSelectorBar
        files={files}
        selectedPath={selectedPath}
        onSelectPath={setSelectedPath}
        label="Doc target"
        actions={
          <Button
            size="sm"
            onClick={() => handleGenerateDocs()}
            disabled={running}
            className="gap-1.5 h-8"
          >
            {running ? (
              <>
                <Loader2 className="size-3.5 animate-spin" /> Generating...
              </>
            ) : (
              <>
                <Sparkles className="size-3.5" /> Generate {activeKind}
              </>
            )}
          </Button>
        }
      />

      <div className="grid gap-6 lg:grid-cols-[280px_1fr]">
        {/* Left: Document types & history */}
        <div className="space-y-4">
          <Panel title="Document Kind" description="Select type of documentation to create">
            <div className="flex flex-col gap-1.5">
              {DOC_KINDS.map((k) => (
                <button
                  key={k}
                  type="button"
                  onClick={() => {
                    setActiveKind(k);
                    const matching = docs.find((d) => d.kind === k);
                    if (matching) setActiveDocId(matching.id);
                  }}
                  className={
                    activeKind === k
                      ? "flex items-center justify-between rounded-md bg-primary/15 px-3 py-2 text-left text-xs font-medium text-primary"
                      : "flex items-center justify-between rounded-md px-3 py-2 text-left text-xs text-muted-foreground hover:bg-accent hover:text-foreground"
                  }
                >
                  <span>{k}</span>
                  {docs.some((d) => d.kind === k) && (
                    <Badge variant="secondary" className="text-[10px]">
                      Ready
                    </Badge>
                  )}
                </button>
              ))}
            </div>

            <Button
              size="sm"
              className="mt-4 w-full gap-1.5"
              disabled={running}
              onClick={() => handleGenerateDocs(activeKind)}
            >
              {running ? (
                <>
                  <Loader2 className="size-3.5 animate-spin" />
                  Generating...
                </>
              ) : (
                <>
                  <Sparkles className="size-3.5" />
                  Generate {activeKind}
                </>
              )}
            </Button>
          </Panel>

          {docs.length > 0 && (
            <Panel title="Saved Documents">
              <ul className="space-y-1">
                {docs.map((d) => (
                  <li key={d.id}>
                    <button
                      onClick={() => {
                        setActiveDocId(d.id);
                        setActiveKind(d.kind);
                      }}
                      className={
                        d.id === activeDoc?.id
                          ? "w-full rounded-md bg-primary/12 px-3 py-2 text-left text-xs text-primary"
                          : "w-full rounded-md px-3 py-2 text-left text-xs text-muted-foreground hover:bg-accent"
                      }
                    >
                      <span className="block font-medium">{d.kind}</span>
                      <span className="block text-[11px] opacity-70">
                        Updated {relative(d.updatedAt)}
                      </span>
                    </button>
                  </li>
                ))}
              </ul>
            </Panel>
          )}
        </div>

        {/* Right: Preview */}
        {activeDoc ? (
          <Panel
            title={activeDoc.kind}
            description={`Updated ${relative(activeDoc.updatedAt)}${activeDoc.filePath ? ` · Source: ${activeDoc.filePath}` : ""}`}
            actions={
              <Button size="sm" variant="outline" onClick={handleCopyContent} className="gap-1.5 text-xs">
                <Copy className="size-3.5" /> Copy Markdown
              </Button>
            }
          >
            <CodeBlock code={activeDoc.content} className="max-h-[600px]" />
          </Panel>
        ) : (
          <Panel title="AI Technical Documentation" description="Generate synchronized developer documentation.">
            <div className="flex flex-col items-center justify-center py-16 text-center">
              <div className="size-12 rounded-full bg-primary/10 flex items-center justify-center text-primary mb-3">
                <BookOpen className="size-6" />
              </div>
              <h3 className="text-base font-semibold">Generate {activeKind}</h3>
              <p className="mt-1.5 text-xs text-muted-foreground max-w-md">
                Click &ldquo;Generate {activeKind}&rdquo; to analyze {selectedPath ? selectedPath.split("/").pop() : "your project"} and generate comprehensive, well-structured markdown documentation.
              </p>
              {selectedPath && (
                <Badge variant="outline" className="mt-4 font-mono text-xs">
                  Target: {selectedPath}
                </Badge>
              )}
              <Button className="mt-6 gap-2" onClick={() => handleGenerateDocs(activeKind)} disabled={running}>
                {running ? (
                  <>
                    <Loader2 className="size-4 animate-spin" /> Generating...
                  </>
                ) : (
                  <>
                    <Sparkles className="size-4" /> Generate {activeKind}
                  </>
                )}
              </Button>
            </div>
          </Panel>
        )}
      </div>
    </div>
  );
}
