import { useState, useMemo, useEffect, useRef } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Loader2, Sparkles, Check, ShieldAlert, ShieldCheck, FileCode, CheckCircle2, ChevronDown, ChevronRight, Lock } from "lucide-react";
import { DiffView, Panel, SeverityBadge } from "@/components/developer/ui";
import { FileSelectorBar } from "@/components/developer/file-selector-bar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { useSecurityFindings, useProject } from "@/hooks/use-developer";
import { devApi } from "@/services/developer-api";
import { getProjectCodeFiles, loadProjectFileCode } from "@/lib/github-tree";
import { useDeveloperModel } from "@/hooks/use-developer-model";
import { applyAndSaveProjectPatch } from "@/lib/patch-applier";
import type { SecurityFinding, Severity } from "@/types/developer";

export const Route = createFileRoute("/developer/projects/$id/security")({
  head: () => ({
    meta: [
      { title: "Security — Developer AI" },
      { name: "description", content: "Vulnerabilities, exposed secrets and dependency risks with remediation patches file by file." },
      { property: "og:title", content: "Security — Developer AI" },
      { property: "og:description", content: "AI security audit and remediation patches file-by-file." },
    ],
  }),
  component: SecurityPage,
});

const filters: (Severity | "all")[] = ["all", "critical", "high", "medium", "low"];

function SecurityPage() {
  const { id } = Route.useParams();
  const queryClient = useQueryClient();
  const { data: project } = useProject(id);
  const { data: allFindings = [], isLoading } = useSecurityFindings(id);
  const { selectedModel, assertCanRun, invalidateQuota } = useDeveloperModel();

  // File list & selection for file-by-file security auditing
  const files = useMemo(() => getProjectCodeFiles(project, id), [project, id]);
  const [selectedPath, setSelectedPath] = useState<string>("");
  const fileContentCacheRef = useRef<Record<string, string>>({});
  const [currentFileCode, setCurrentFileCode] = useState<string>("");
  const [applyingId, setApplyingId] = useState<string | null>(null);

  const [severity, setSeverity] = useState<Severity | "all">("all");
  const [openId, setOpenId] = useState<string | null>(null);
  const [running, setRunning] = useState(false);
  const [filterCurrentFileOnly, setFilterCurrentFileOnly] = useState(false);

  // Track which files have been audited
  const [auditedFiles, setAuditedFiles] = useState<Record<string, boolean>>(() => {
    if (typeof window !== "undefined") {
      try {
        const saved = localStorage.getItem(`project_audited_files_${id}`);
        if (saved) return JSON.parse(saved);
      } catch {}
    }
    return {};
  });

  // Default selection to sensitive backend/auth file if possible
  useEffect(() => {
    if (files.length > 0 && !selectedPath) {
      const preferred =
        files.find((f) => {
          const p = f.path.toLowerCase();
          return (
            p.includes("auth") ||
            p.includes("jwt") ||
            p.includes("db") ||
            p.includes("config") ||
            p.includes("middleware") ||
            p.includes("server")
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

  const handleRunScan = async (targetFilePath?: string) => {
    const fileToScan = targetFilePath || selectedPath;
    if (!fileToScan) {
      toast.error("Please select a file to audit");
      return;
    }

    if (!assertCanRun()) return;

    setRunning(true);
    const fileName = fileToScan.split("/").pop();
    const toastId = toast.loading(`Auditing ${fileName} with ${selectedModel.name}...`, {
      description: "Inspecting auth mechanisms, secret leaks, and injection vectors.",
    });

    try {
      const codeToScan = currentFileCode || `// Audit file: ${fileToScan}\n// Project: ${project?.name || id}`;
      const updated = await devApi.security.run(id, codeToScan, fileToScan, selectedModel.id);
      invalidateQuota();

      queryClient.setQueryData(["dev", "security", id], updated);

      const nextAudited = { ...auditedFiles, [fileToScan]: true };
      setAuditedFiles(nextAudited);
      if (typeof window !== "undefined") {
        localStorage.setItem(`project_audited_files_${id}`, JSON.stringify(nextAudited));
      }

      const fileFindingsCount = updated.filter((f) => f.file === fileToScan).length;
      toast.success(`Security audit completed for ${fileName}`, {
        id: toastId,
        description: fileFindingsCount > 0
          ? `Identified ${fileFindingsCount} potential security finding(s) in this file.`
          : "Zero vulnerabilities found! File meets security best practices.",
      });
    } catch (err: any) {
      console.error("Security scan failed", err);
      toast.error("Failed to run security scan", {
        id: toastId,
        description: err?.message || "Please check backend connection.",
      });
    } finally {
      setRunning(false);
    }
  };

  const handleApplyFix = async (findingId: string, file: string) => {
    const finding = allFindings.find((f) => f.id === findingId);
    if (!finding) return;

    setApplyingId(findingId);
    try {
      const codeForFile = fileContentCacheRef.current[file] || (selectedPath === file ? currentFileCode : "");
      const res = await applyAndSaveProjectPatch({
        projectId: id,
        filePath: file,
        diff: finding.diff,
        originalCode: codeForFile,
        project,
        queryClient,
      });

      if (res.success) {
        fileContentCacheRef.current[file] = res.newContent;
        if (selectedPath === file) setCurrentFileCode(res.newContent);

        const updated = allFindings.map((f) => (f.id === findingId ? { ...f, status: "applied" as const } : f));
        queryClient.setQueryData(["dev", "security", id], updated);
        toast.success("Security patch applied & saved", { description: `Patched vulnerability in ${file}` });
      } else {
        toast.error("Could not apply security patch", { description: res.message });
      }
    } catch (err: any) {
      toast.error("Failed to apply patch", { description: err?.message || "Unknown error" });
    } finally {
      setApplyingId(null);
    }
  };

  // Filter findings
  const displayedFindings = allFindings
    .filter((f) => !filterCurrentFileOnly || !selectedPath || f.file === selectedPath)
    .filter((f) => severity === "all" || f.severity === severity);

  const counts = (["critical", "high", "medium", "low"] as Severity[]).map((s) => ({
    s,
    n: allFindings.filter((f) => f.severity === s).length,
  }));

  return (
    <div className="space-y-6">
      {/* File Selector Bar for File-by-File security inspection */}
      <FileSelectorBar
        files={files}
        selectedPath={selectedPath}
        onSelectPath={setSelectedPath}
        completedMap={auditedFiles}
        label="Audit target"
        actions={
          <Button
            size="sm"
            onClick={() => handleRunScan()}
            disabled={running || !selectedPath}
            className="gap-1.5 h-8"
          >
            {running ? (
              <>
                <Loader2 className="size-3.5 animate-spin" /> Auditing...
              </>
            ) : (
              <>
                <Sparkles className="size-3.5" /> Audit This File
              </>
            )}
          </Button>
        }
      />

      <Panel
        title="Security Audit & Remediation"
        description={`${allFindings.length} total findings across authentication, secrets, input validation and dependencies.`}
        actions={
          <div className="flex flex-wrap items-center gap-2">
            <Button
              size="sm"
              variant={filterCurrentFileOnly ? "default" : "outline"}
              onClick={() => setFilterCurrentFileOnly((v) => !v)}
              className="text-xs h-8"
            >
              {filterCurrentFileOnly ? "Showing current file" : "Showing all findings"}
            </Button>
          </div>
        }
      >
        <div className="mb-4 grid gap-3 sm:grid-cols-4">
          {counts.map((c) => (
            <div key={c.s} className="rounded-lg border border-border bg-card/50 p-3">
              <p className="text-xl font-semibold tabular-nums">{c.n}</p>
              <p className="text-xs capitalize text-muted-foreground">{c.s} Severity</p>
            </div>
          ))}
        </div>

        <div className="flex flex-wrap gap-2">
          {filters.map((f) => (
            <Button
              key={f}
              size="sm"
              variant={severity === f ? "default" : "outline"}
              onClick={() => setSeverity(f)}
              className="capitalize text-xs h-7"
            >
              {f}
            </Button>
          ))}
        </div>
      </Panel>

      {displayedFindings.length === 0 ? (
        <Panel title="Security Status" description={selectedPath ? `Target: ${selectedPath}` : undefined}>
          <div className="flex flex-col items-center justify-center py-16 text-center">
            <div className="size-12 rounded-full bg-emerald-500/10 flex items-center justify-center text-emerald-400 mb-3">
              <ShieldCheck className="size-6" />
            </div>
            <h3 className="text-base font-semibold">
              {allFindings.length === 0
                ? "No security vulnerabilities on file"
                : "No matching findings for this filter"}
            </h3>
            <p className="mt-1.5 text-xs text-muted-foreground max-w-md">
              {selectedPath
                ? `Click "Audit This File" to perform an automated deep scan on ${selectedPath.split("/").pop()}.`
                : "Select any file from the project to scan for vulnerabilities, exposed keys, and injection vectors."}
            </p>
            <Button className="mt-6 gap-2" onClick={() => handleRunScan()} disabled={running || !selectedPath}>
              {running ? (
                <>
                  <Loader2 className="size-4 animate-spin" /> Scanning...
                </>
              ) : (
                <>
                  <Sparkles className="size-4" /> Audit {selectedPath ? selectedPath.split("/").pop() : "File"}
                </>
              )}
            </Button>
          </div>
        </Panel>
      ) : (
        <div className="space-y-4">
          {displayedFindings.map((f) => {
            const isOpen = openId === f.id;
            return (
              <div
                key={f.id}
                className="overflow-hidden rounded-xl border border-border bg-card/60 transition-colors hover:border-primary/30"
              >
                <div
                  className="flex cursor-pointer flex-wrap items-center justify-between gap-3 p-4 select-none"
                  onClick={() => setOpenId(isOpen ? null : f.id)}
                >
                  <div className="flex items-center gap-3">
                    <SeverityBadge severity={f.severity} />
                    <span className="font-mono text-xs text-muted-foreground">
                      {f.file}:{f.line}
                    </span>
                    <h3 className="text-sm font-medium text-foreground">{f.title}</h3>
                  </div>
                  <div className="flex items-center gap-2">
                    {f.status === "applied" && (
                      <Badge variant="outline" className="text-emerald-400 border-emerald-500/30 gap-1 text-[11px]">
                        <Check className="size-3" /> Patch applied
                      </Badge>
                    )}
                    {isOpen ? <ChevronDown className="size-4 text-muted-foreground" /> : <ChevronRight className="size-4 text-muted-foreground" />}
                  </div>
                </div>

                {isOpen && (
                  <div className="border-t border-border/60 bg-muted/20 p-4 space-y-4">
                    <div>
                      <span className="text-[11px] font-medium uppercase tracking-wider text-muted-foreground block mb-1">
                        Mechanism & Description
                      </span>
                      <p className="text-xs text-foreground leading-relaxed">{f.description}</p>
                    </div>

                    {f.impact && (
                      <div>
                        <span className="text-[11px] font-medium uppercase tracking-wider text-destructive/80 block mb-1">
                          Security Impact
                        </span>
                        <p className="text-xs text-muted-foreground leading-relaxed">{f.impact}</p>
                      </div>
                    )}

                    {f.recommendation && (
                      <div>
                        <span className="text-[11px] font-medium uppercase tracking-wider text-emerald-400 block mb-1">
                          Recommended Remediation
                        </span>
                        <p className="text-xs text-muted-foreground leading-relaxed">{f.recommendation}</p>
                      </div>
                    )}

                    {f.diff && f.diff.length > 0 && (
                      <div className="space-y-2">
                        <span className="text-[11px] font-medium uppercase tracking-wider text-muted-foreground block">
                          Remediation Patch
                        </span>
                        <DiffView lines={f.diff} />
                        {f.status !== "applied" && (
                          <div className="pt-2 flex justify-end">
                            <Button
                              size="sm"
                              disabled={applyingId === f.id}
                              onClick={() => handleApplyFix(f.id, f.file)}
                              className="gap-1.5 text-xs"
                            >
                              {applyingId === f.id ? (
                                <>
                                  <Loader2 className="size-3.5 animate-spin" /> Applying Patch...
                                </>
                              ) : (
                                <>
                                  <Check className="size-3.5" /> Apply Security Patch
                                </>
                              )}
                            </Button>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
