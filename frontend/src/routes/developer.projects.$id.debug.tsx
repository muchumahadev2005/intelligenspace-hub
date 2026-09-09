import { useState, useMemo, useRef } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import {
  Loader2,
  Sparkles,
  Bug,
  Check,
  AlertCircle,
  FileCode,
  Wrench,
  Copy,
  Terminal,
  CheckCircle2,
  Lightbulb,
} from "lucide-react";
import { DiffView, Panel } from "@/components/developer/ui";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useDebugSession, useProject } from "@/hooks/use-developer";
import { devApi } from "@/services/developer-api";
import { relative } from "@/lib/format";
import { getProjectCodeFiles, loadProjectFileCode } from "@/lib/github-tree";
import { useDeveloperModel } from "@/hooks/use-developer-model";
import { applyAndSaveProjectPatch } from "@/lib/patch-applier";
import type { ProjectFile } from "@/types/developer";

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

const QUICK_ERRORS = [
  {
    title: "TypeError (undefined)",
    text: "TypeError: Cannot read properties of undefined (reading 'split')\n    at parseHeader (src/auth.ts:24:18)\n    at authenticate (src/middleware.ts:45:12)",
  },
  {
    title: "DB Connection Refused",
    text: "Error: connect ECONNREFUSED 127.0.0.1:5432\n    at TCPConnectWrap.afterConnect (node:net:1607:16)\n    at Client._connect (node_modules/pg/lib/client.js:321:11)",
  },
  {
    title: "JSON Parse Error",
    text: "SyntaxError: Unexpected token '<', \"<!DOCTYPE \"... is not valid JSON\n    at JSON.parse (<anonymous>)\n    at Response.json (src/api/client.ts:68:20)",
  },
  {
    title: "Unhandled Rejection (401)",
    text: "UnhandledPromiseRejection: Unauthorized — invalid or revoked API key\n    at authMiddleware (backend/src/middleware/auth.js:29:16)\n    at dispatch (node_modules/hono/dist/compose.js:19:15)",
  },
];

function DebugPage() {
  const { id } = Route.useParams();
  const queryClient = useQueryClient();
  const { data: project } = useProject(id);
  const { data: session, isLoading } = useDebugSession(id);
  const { selectedModel, assertCanRun, invalidateQuota } = useDeveloperModel();

  const [input, setInput] = useState("");
  const [selectedFilePath, setSelectedFilePath] = useState<string>("auto");
  const [running, setRunning] = useState(false);
  const [isPatchApplied, setIsPatchApplied] = useState(false);
  const [applyingPatch, setApplyingPatch] = useState(false);
  const cacheRef = useRef<Record<string, string>>({});

  const filesList = useMemo(() => {
    return getProjectCodeFiles(project, id);
  }, [project, id]);

  const run = async () => {
    const errorText = input.trim();
    if (!errorText) {
      toast.error("Please enter or paste an error message first");
      return;
    }

    if (!assertCanRun()) return;

    setRunning(true);
    setIsPatchApplied(false);
    const toastId = toast.loading(`Diagnosing error with ${selectedModel.name}...`, {
      description: "Tracing stack trace, code lines, and root cause.",
    });

    try {
      // Find associated code if file selected
      let fileCode: string | undefined = undefined;
      if (selectedFilePath && selectedFilePath !== "auto") {
        const loadedCode = await loadProjectFileCode(project, selectedFilePath, cacheRef.current);
        if (loadedCode) {
          cacheRef.current[selectedFilePath] = loadedCode;
          fileCode = `// File: ${selectedFilePath}\n${loadedCode}`;
        }
      }

      const updated = await devApi.debug.run(id, errorText, fileCode, selectedModel.id);
      invalidateQuota();

      queryClient.setQueryData(["dev", "debug", id], updated);
      toast.success("AI Debug Analysis complete", {
        id: toastId,
        description: `Root cause identified with ${Math.round(updated.confidence || 85)}% confidence.`,
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

  const handleApplyPatch = async () => {
    if (!session?.patch || session.patch.length === 0) {
      toast.error("No patch available to apply");
      return;
    }

    // Determine target file
    let targetFile = selectedFilePath !== "auto" ? selectedFilePath : "";
    if (!targetFile) {
      // Search error message or root cause for file path
      const match = (session.errorMessage + " " + (session.rootCause || "")).match(
        /([a-zA-Z0-9_\-./]+\.(?:ts|tsx|js|jsx|json|py|go|html|css))/i,
      );
      if (match && match[1]) {
        targetFile = match[1];
      }
    }
    if (!targetFile && filesList.length > 0) {
      targetFile = filesList[0]!.path;
    }
    if (!targetFile) {
      toast.error("Could not determine target file to patch. Please select a file on the left.");
      return;
    }

    setApplyingPatch(true);
    try {
      const codeForFile = cacheRef.current[targetFile] || "";
      const res = await applyAndSaveProjectPatch({
        projectId: id,
        filePath: targetFile,
        diff: session.patch,
        originalCode: codeForFile,
        project,
        queryClient,
      });

      if (res.success) {
        cacheRef.current[targetFile] = res.newContent;
        setIsPatchApplied(true);
        toast.success("Patch applied & saved to workspace!", {
          description: `Updated ${targetFile} with diagnostic fix.`,
        });
      } else {
        toast.error("Could not apply patch", { description: res.message });
      }
    } catch (err: any) {
      toast.error("Failed to apply patch", { description: err?.message || "Unknown error" });
    } finally {
      setApplyingPatch(false);
    }
  };

  if (isLoading) return <Skeleton className="h-96 w-full" />;

  const conf = session
    ? session.confidence <= 1
      ? Math.round(session.confidence * 100)
      : Math.round(session.confidence || 85)
    : 85;

  return (
    <div className="grid gap-6 lg:grid-cols-[380px_1fr] items-start">
      {/* Left Column: Report / Input Panel (Sticky on desktop) */}
      <div className="lg:sticky lg:top-4 space-y-4">
        <Panel
          title="Report an error"
          description="Paste a stack trace, log output, or error description to diagnose."
        >
          <div className="space-y-3.5">
            {/* Quick error template pills */}
            <div>
              <span className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider block mb-1.5">
                Quick Templates
              </span>
              <div className="flex flex-wrap gap-1.5">
                {QUICK_ERRORS.map((t, idx) => (
                  <button
                    key={idx}
                    type="button"
                    onClick={() => setInput(t.text)}
                    className="rounded-md border border-border/70 bg-accent/30 hover:bg-accent px-2 py-1 text-[11px] font-medium text-muted-foreground hover:text-foreground transition-all cursor-pointer text-left"
                  >
                    {t.title}
                  </button>
                ))}
              </div>
            </div>

            {/* Target File Selector */}
            {filesList.length > 0 && (
              <div className="space-y-1">
                <label className="text-xs font-medium text-muted-foreground flex items-center justify-between">
                  <span>Affected File <span className="text-muted-foreground/60 font-normal">(optional)</span></span>
                </label>
                <Select value={selectedFilePath} onValueChange={setSelectedFilePath}>
                  <SelectTrigger className="h-8 text-xs font-mono">
                    <SelectValue placeholder="Auto-detect from stack trace" />
                  </SelectTrigger>
                  <SelectContent className="max-h-60">
                    <SelectItem value="auto" className="text-xs">
                      🔍 Auto-detect from stack trace
                    </SelectItem>
                    {filesList.slice(0, 50).map((f) => (
                      <SelectItem key={f.id || f.path} value={f.path} className="text-xs font-mono">
                        {f.path}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}

            {/* Textarea */}
            <div className="space-y-1">
              <div className="flex items-center justify-between">
                <label className="text-xs font-medium text-muted-foreground">
                  Error log / Stack trace
                </label>
                {input && (
                  <button
                    type="button"
                    onClick={() => setInput("")}
                    className="text-[10px] text-muted-foreground hover:text-foreground underline cursor-pointer"
                  >
                    Clear
                  </button>
                )}
              </div>
              <Textarea
                value={input}
                onChange={(e) => setInput(e.target.value)}
                rows={6}
                placeholder="Paste terminal error, browser console stack trace, or server logs here..."
                aria-label="Error message"
                className="font-mono text-xs resize-y"
              />
            </div>

            <Button
              className="w-full gap-2 font-medium"
              onClick={run}
              disabled={running || !input.trim()}
            >
              {running ? (
                <>
                  <Loader2 className="size-4 animate-spin" /> Analysing error with AI...
                </>
              ) : (
                <>
                  <Sparkles className="size-4" /> Diagnose Error
                </>
              )}
            </Button>
          </div>
        </Panel>
      </div>

      {/* Right Column: Diagnostic Results */}
      <div className="space-y-5 min-w-0">
        {session ? (
          <>
            {/* Card 1: Overview & Stack Trace */}
            <Panel
              title={session.title || "Debug Analysis"}
              description={`Analysed ${relative(session.createdAt)}`}
              actions={
                <Badge
                  variant="outline"
                  className="bg-emerald-500/10 text-emerald-400 border-emerald-500/30 gap-1.5 text-xs font-mono py-1 px-2.5"
                >
                  <CheckCircle2 className="size-3.5" />
                  {conf}% Confidence
                </Badge>
              }
            >
              {/* Stack Trace snippet with copy button */}
              <div className="space-y-1.5 mb-4">
                <div className="flex items-center justify-between text-xs text-muted-foreground">
                  <span className="font-mono text-[11px] uppercase tracking-wider flex items-center gap-1.5 text-destructive font-medium">
                    <Terminal className="size-3" /> Runtime Exception
                  </span>
                  <button
                    type="button"
                    onClick={() => {
                      navigator.clipboard.writeText(session.errorMessage);
                      toast.success("Error log copied to clipboard");
                    }}
                    className="text-[11px] text-muted-foreground hover:text-foreground flex items-center gap-1 transition-colors cursor-pointer"
                  >
                    <Copy className="size-3" /> Copy Log
                  </button>
                </div>
                <pre className="overflow-x-auto rounded-lg border border-destructive/25 bg-destructive/10 p-3.5 font-mono text-xs text-destructive leading-relaxed max-h-44">
                  {session.errorMessage}
                </pre>
              </div>

              {/* Root Cause Callout */}
              <div className="rounded-lg border border-amber-500/30 bg-amber-500/8 p-3.5 space-y-1">
                <div className="flex items-center gap-1.5 text-xs font-semibold text-amber-400">
                  <AlertCircle className="size-3.5" /> Root Cause Identified
                </div>
                <p className="text-xs leading-relaxed text-foreground/90 pl-5 font-normal">
                  {session.rootCause}
                </p>
              </div>
            </Panel>

            {/* Card 2: Diagnostic Reasoning */}
            {session.reasoning && session.reasoning.length > 0 && (
              <Panel
                title="Diagnostic Reasoning"
                description="Step-by-step execution trace leading to the failure"
              >
                <ol className="space-y-3">
                  {session.reasoning.map((step, i) => (
                    <li key={i} className="flex items-start gap-3 text-xs leading-relaxed">
                      <span className="flex size-5 shrink-0 items-center justify-center rounded-full bg-primary/15 text-[11px] font-semibold text-primary mt-0.5">
                        {i + 1}
                      </span>
                      <span className="text-foreground/80 flex-1 pt-0.5">{step}</span>
                    </li>
                  ))}
                </ol>
              </Panel>
            )}

            {/* Card 3: Suggested Fix & Patch */}
            <Panel
              title="Suggested Fix & Patch"
              description={session.suggestedFix || "Recommended code changes to resolve this runtime error"}
              actions={
                <div className="flex items-center gap-2">
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => {
                      const diffText = (session.patch || [])
                        .map((l) => `${l.type === "add" ? "+" : l.type === "remove" ? "-" : " "} ${l.text}`)
                        .join("\n");
                      navigator.clipboard.writeText(diffText || session.suggestedFix || "");
                      toast.success("Patch copied to clipboard");
                    }}
                    className="gap-1.5 text-xs h-8"
                  >
                    <Copy className="size-3" /> Copy Patch
                  </Button>
                  <Button
                    size="sm"
                    disabled={isPatchApplied || applyingPatch}
                    onClick={handleApplyPatch}
                    className="gap-1.5 text-xs h-8"
                  >
                    {applyingPatch ? (
                      <>
                        <Loader2 className="size-3 animate-spin" /> Applying...
                      </>
                    ) : isPatchApplied ? (
                      <>
                        <Check className="size-3 text-emerald-400" /> Patch Applied
                      </>
                    ) : (
                      <>
                        <Check className="size-3" /> Apply Patch
                      </>
                    )}
                  </Button>
                </div>
              }
            >
              {session.patch && session.patch.length > 0 ? (
                <div className="space-y-3">
                  <DiffView lines={session.patch} />
                </div>
              ) : (
                <div className="rounded-lg border border-border/60 bg-muted/20 p-4 text-xs text-muted-foreground flex items-center gap-2">
                  <Lightbulb className="size-4 text-amber-400 shrink-0" />
                  <span>{session.suggestedFix || "Review the diagnostic steps above to apply the manual fix."}</span>
                </div>
              )}
            </Panel>
          </>
        ) : (
          /* Empty / Initial state when no session has been run yet */
          <Panel
            title="AI Debugging Agent Ready"
            description="Diagnose unhandled errors, stack traces, and crashes across your codebase."
          >
            <div className="flex flex-col items-center justify-center py-12 text-center">
              <div className="size-12 rounded-full bg-primary/10 flex items-center justify-center text-primary mb-3">
                <Bug className="size-6" />
              </div>
              <h3 className="text-base font-semibold">No active debug session</h3>
              <p className="mt-1.5 text-xs text-muted-foreground max-w-md">
                Paste an error message or terminal stack trace into the left panel, or click one of the quick templates above to begin an AI root-cause analysis.
              </p>
              <div className="mt-6 grid gap-2 sm:grid-cols-2 max-w-md w-full text-left">
                <div className="rounded-lg border border-border bg-accent/30 p-3">
                  <span className="text-xs font-semibold flex items-center gap-1.5 text-foreground">
                    <AlertCircle className="size-3.5 text-amber-400" /> Stack Trace Analysis
                  </span>
                  <p className="text-[11px] text-muted-foreground mt-1">
                    AI isolates the failing file and line number in your project.
                  </p>
                </div>
                <div className="rounded-lg border border-border bg-accent/30 p-3">
                  <span className="text-xs font-semibold flex items-center gap-1.5 text-foreground">
                    <Wrench className="size-3.5 text-primary" /> Automated Patch
                  </span>
                  <p className="text-[11px] text-muted-foreground mt-1">
                    Generates clean code diffs ready to apply or copy.
                  </p>
                </div>
              </div>
            </div>
          </Panel>
        )}
      </div>
    </div>
  );
}
