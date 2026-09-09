import { useEffect, useMemo, useRef, useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { useQueryClient } from "@tanstack/react-query";
import { Check, Copy, FilePlus, Loader2, Plus, RefreshCw, Upload, ExternalLink } from "lucide-react";
import { toast } from "sonner";
import { CodeBlock, FileTree, Panel } from "@/components/developer/ui";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Skeleton } from "@/components/ui/skeleton";
import { useProject } from "@/hooks/use-developer";
import { devApi } from "@/services/developer-api";
import { fetchGitHubTree, fetchRawFileContent, detectLanguage } from "@/lib/github-tree";
import type { ProjectFile } from "@/types/developer";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/developer/projects/$id/files")({
  head: () => ({
    meta: [
      { title: "Files — Developer AI" },
      { name: "description", content: "Browse the repository file tree and read source files." },
      { property: "og:title", content: "Files — Developer AI" },
      { property: "og:description", content: "Repository file explorer with source preview." },
    ],
  }),
  component: FilesPage,
});

function firstFile(nodes: ProjectFile[]): ProjectFile | undefined {
  for (const n of nodes) {
    if (n.type === "file") return n;
    const found = n.children ? firstFile(n.children) : undefined;
    if (found) return found;
  }
  return undefined;
}

function FilesPage() {
  const { id } = Route.useParams();
  const queryClient = useQueryClient();
  const { data: project, isLoading } = useProject(id);

  const [selected, setSelected] = useState<ProjectFile | null>(null);
  const [customFiles, setCustomFiles] = useState<ProjectFile[]>(() => {
    if (typeof window !== "undefined") {
      try {
        const saved = localStorage.getItem(`project_custom_files_${id}`);
        if (saved) return JSON.parse(saved);
      } catch {}
    }
    return [];
  });

  // Dynamic file content cache (path -> text)
  const contentCacheRef = useRef<Record<string, string>>({});
  const [contentCache, setContentCache] = useState<Record<string, string>>({});
  const [isLoadingContent, setIsLoadingContent] = useState(false);
  const [isSyncing, setIsSyncing] = useState(false);

  const [copied, setCopied] = useState(false);
  const [openNewDialog, setOpenNewDialog] = useState(false);
  const [newFilePath, setNewFilePath] = useState("");
  const [newFileContent, setNewFileContent] = useState("");
  const fileInputRef = useRef<HTMLInputElement>(null);
  const hasAutoSyncedRef = useRef(false);

  // Sync custom files to localStorage
  useEffect(() => {
    if (typeof window !== "undefined") {
      localStorage.setItem(`project_custom_files_${id}`, JSON.stringify(customFiles));
    }
  }, [id, customFiles]);

  // Merge project files with user-uploaded files
  const mergedFiles = useMemo(() => {
    const baseFiles = project?.files ?? [];
    if (customFiles.length === 0) return baseFiles;
    return [...customFiles, ...baseFiles];
  }, [project, customFiles]);

  const active = useMemo(
    () => selected ?? (mergedFiles.length ? (firstFile(mergedFiles) ?? null) : null),
    [selected, mergedFiles],
  );

  // Active file display content: cache -> file.content -> placeholder
  const activeContent = useMemo(() => {
    if (!active) return "";
    if (contentCache[active.path]) return contentCache[active.path];
    if (active.content && !active.content.startsWith("// Source from GitHub repository:")) {
      return active.content;
    }
    return "";
  }, [active, contentCache]);

  // On-demand fetch file content from GitHub if empty or placeholder
  useEffect(() => {
    if (!project || !active || active.type === "folder") return;
    const path = active.path;

    // Check if we already have content
    if (contentCacheRef.current[path] !== undefined) return;
    if (active.content && !active.content.startsWith("// Source from GitHub repository:")) {
      contentCacheRef.current[path] = active.content;
      return;
    }

    // Only applicable for GitHub repos
    if (project.repository?.provider !== "github" && !project.repository?.fullName?.includes("/")) return;

    let isMounted = true;
    setIsLoadingContent(true);

    const repoFullName = project.repository.fullName;
    const branch = project.repository.branch || "main";

    fetchRawFileContent(repoFullName, branch, path)
      .then((rawText) => {
        contentCacheRef.current[path] = rawText;
        if (isMounted) {
          setContentCache((prev) => ({ ...prev, [path]: rawText }));
        }
      })
      .catch((err) => {
        console.warn(`Could not load raw content for ${path}:`, err);
        contentCacheRef.current[path] = "// Could not load raw file content from repository";
        if (isMounted) {
          setContentCache((prev) => ({ ...prev, [path]: "// Could not load raw file content from repository" }));
        }
      })
      .finally(() => {
        if (isMounted) setIsLoadingContent(false);
      });

    return () => {
      isMounted = false;
    };
  }, [active?.path, project]);

  // Sync / Refresh full file tree from GitHub
  const handleSyncGithub = async (showToast = true) => {
    if (!project || isSyncing) return;
    const repoFullName = project.repository?.fullName;
    const branch = project.repository?.branch || "main";
    if (!repoFullName || !repoFullName.includes("/")) {
      if (showToast) toast.error("Invalid GitHub repository identifier.");
      return;
    }

    setIsSyncing(true);
    if (showToast) toast.info(`Syncing repository tree for ${repoFullName}...`);

    try {
      const { files: fullTree, structure } = await fetchGitHubTree(repoFullName, branch);

      // Save to backend database
      await devApi.projects.update(project.id, {
        files: fullTree,
        structure,
      });

      // Invalidate cache to reflect changes
      await queryClient.invalidateQueries({ queryKey: ["dev", "projects", project.id] });

      // Automatically select the first file (e.g. README.md)
      const first = firstFile(fullTree);
      if (first) setSelected(first);

      if (showToast) {
        toast.success(`Synchronized ${structure.length} files & folders from GitHub!`);
      }
    } catch (err: any) {
      console.error("GitHub sync error:", err);
      if (showToast) {
        toast.error("Failed to sync from GitHub: " + (err.message || "Network error"));
      }
    } finally {
      setIsSyncing(false);
    }
  };

  // Auto-sync if project tree is shallow (e.g. initial connection only had top-level or folders without children)
  useEffect(() => {
    if (isLoading || !project || hasAutoSyncedRef.current) return;
    if (project.repository?.provider !== "github") return;

    const baseFiles = project.files || [];
    const isShallow =
      baseFiles.length === 0 ||
      baseFiles.length <= 3 ||
      baseFiles.some((f) => f.type === "folder" && (!f.children || f.children.length === 0)) ||
      baseFiles.some((f) => f.content?.startsWith("// Source from GitHub repository:"));

    if (isShallow) {
      hasAutoSyncedRef.current = true;
      handleSyncGithub(false);
    }
  }, [project, isLoading]);

  if (isLoading || !project) return <Skeleton className="h-96 w-full" />;

  // Handle local file upload
  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    const uploadedNodes: ProjectFile[] = [];

    for (let i = 0; i < files.length; i++) {
      const file = files[i];
      if (!file) continue;

      try {
        const text = await file.text();
        const lang = detectLanguage(file.name);
        const node: ProjectFile = {
          id: `custom_${Date.now()}_${i}_${Math.random().toString(36).slice(2, 7)}`,
          name: file.name,
          path: file.name,
          type: "file",
          language: lang,
          content: text,
        };
        uploadedNodes.push(node);
      } catch (err) {
        console.error("Failed to read file", file.name, err);
        toast.error(`Could not read ${file.name}`);
      }
    }

    if (uploadedNodes.length > 0) {
      setCustomFiles((prev) => [...uploadedNodes, ...prev]);
      setSelected(uploadedNodes[0] ?? null);
      toast.success(
        uploadedNodes.length === 1
          ? `Uploaded ${uploadedNodes[0]?.name}`
          : `Uploaded ${uploadedNodes.length} files`,
        { description: "Files added to explorer and ready for AI analysis." },
      );
    }

    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  // Handle manual new file creation
  const handleCreateNewFile = () => {
    const path = newFilePath.trim();
    if (!path) {
      toast.error("Filename is required");
      return;
    }

    const filename = path.split("/").pop() || path;
    const lang = detectLanguage(filename);
    const newFile: ProjectFile = {
      id: `custom_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
      name: filename,
      path: path,
      type: "file",
      language: lang,
      content: newFileContent || "// " + path,
    };

    setCustomFiles((prev) => [newFile, ...prev]);
    setSelected(newFile);
    setNewFilePath("");
    setNewFileContent("");
    setOpenNewDialog(false);
    toast.success(`Created ${filename}`);
  };

  const handleCopyCode = () => {
    const code = activeContent || active?.content;
    if (!code) return;
    navigator.clipboard.writeText(code);
    setCopied(true);
    toast.success("Code copied to clipboard");
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <>
      {/* Hidden File Input */}
      <input
        ref={fileInputRef}
        type="file"
        multiple
        onChange={handleFileUpload}
        className="hidden"
        aria-label="Upload files"
      />

      <div className="grid gap-6 lg:grid-cols-[340px_1fr] items-start">
        {/* Left Section: Explorer with Independent Scrolling */}
        <Panel
          title="Explorer"
          description={project.repository?.fullName || project.name}
          className="flex flex-col h-[calc(100vh-220px)] min-h-[580px] p-5"
          actions={
            <div className="flex items-center gap-1.5">
              {project.repository?.provider === "github" && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => handleSyncGithub(true)}
                  disabled={isSyncing}
                  className="h-7 text-xs gap-1"
                  title="Synchronize complete file tree and code from GitHub"
                >
                  <RefreshCw className={cn("size-3", isSyncing && "animate-spin")} />
                  {isSyncing ? "Syncing..." : "Sync GitHub"}
                </Button>
              )}
              <Button
                variant="outline"
                size="sm"
                onClick={() => fileInputRef.current?.click()}
                className="h-7 text-xs gap-1"
                title="Upload code files from your computer"
              >
                <Upload className="size-3" /> Upload
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setOpenNewDialog(true)}
                className="h-7 text-xs gap-1"
                title="Create a new file"
              >
                <Plus className="size-3" /> New file
              </Button>
            </div>
          }
        >
          <div className="flex-1 min-h-0 overflow-y-auto overflow-x-hidden pr-1.5 pt-1">
            {isSyncing && mergedFiles.length === 0 ? (
              <div className="flex flex-col items-center justify-center p-6 text-center text-muted-foreground gap-2">
                <Loader2 className="size-5 animate-spin text-primary" />
                <p className="text-xs">Fetching repository tree from GitHub...</p>
              </div>
            ) : (
              <FileTree files={mergedFiles} activeId={active?.id} onSelect={setSelected} />
            )}
          </div>
        </Panel>

        {/* Right Section: Code Preview with Independent Scrolling */}
        <Panel
          title={active?.path ?? "No file selected"}
          {...(active?.language ? { description: active.language } : {})}
          className="flex flex-col h-[calc(100vh-220px)] min-h-[580px] p-5"
          actions={
            <div className="flex items-center gap-2">
              {project.repository?.provider === "github" && active?.path && (
                <Button
                  variant="ghost"
                  size="sm"
                  asChild
                  className="h-7 text-xs gap-1 text-muted-foreground hover:text-foreground"
                >
                  <a
                    href={`https://github.com/${project.repository.fullName}/blob/${project.repository.branch || "main"}/${active.path}`}
                    target="_blank"
                    rel="noreferrer"
                  >
                    <ExternalLink className="size-3" /> GitHub
                  </a>
                </Button>
              )}
              {activeContent ? (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={handleCopyCode}
                  className="h-7 text-xs gap-1 text-muted-foreground hover:text-foreground"
                >
                  {copied ? <Check className="size-3 text-emerald-400" /> : <Copy className="size-3" />}
                  {copied ? "Copied" : "Copy"}
                </Button>
              ) : null}
            </div>
          }
        >
          <div className="flex-1 min-h-0 overflow-hidden flex flex-col">
            {isLoadingContent ? (
              <div className="flex flex-col items-center justify-center flex-1 text-center text-muted-foreground gap-2">
                <Loader2 className="size-6 animate-spin text-primary" />
                <p className="text-xs font-medium">Loading file content from GitHub...</p>
                <p className="text-[11px] font-mono text-muted-foreground/80">{active?.path}</p>
              </div>
            ) : activeContent || active?.content ? (
              <div className="flex-1 min-h-0 overflow-auto rounded-lg border border-border bg-muted/40 p-4">
                <pre className="font-mono text-xs leading-6 select-text whitespace-pre">
                  <code>{activeContent || active?.content}</code>
                </pre>
              </div>
            ) : (
              <div className="flex flex-col items-center justify-center flex-1 text-center text-muted-foreground">
                <p className="text-sm">Select a file to preview its contents.</p>
              </div>
            )}
          </div>
        </Panel>
      </div>

      {/* New File Dialog */}
      <Dialog open={openNewDialog} onOpenChange={setOpenNewDialog}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <FilePlus className="size-4 text-primary" /> Create new file
            </DialogTitle>
            <DialogDescription>
              Add a source file to this project for analysis by Developer AI agents.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-2">
            <div className="space-y-2">
              <Label htmlFor="file-path">File path / name</Label>
              <Input
                id="file-path"
                placeholder="e.g. src/services/auth.ts"
                value={newFilePath}
                onChange={(e) => setNewFilePath(e.target.value)}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="file-content">Content (optional)</Label>
              <Textarea
                id="file-content"
                rows={8}
                placeholder="// Enter code here..."
                value={newFileContent}
                onChange={(e) => setNewFileContent(e.target.value)}
                className="font-mono text-xs"
              />
            </div>
          </div>

          <DialogFooter>
            <Button variant="ghost" onClick={() => setOpenNewDialog(false)}>
              Cancel
            </Button>
            <Button onClick={handleCreateNewFile} disabled={!newFilePath.trim()}>
              Create file
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
