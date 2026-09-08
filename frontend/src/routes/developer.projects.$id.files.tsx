import { useEffect, useMemo, useRef, useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { Check, Copy, FilePlus, Plus, Upload } from "lucide-react";
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
import type { ProjectFile } from "@/types/developer";

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

function detectLanguage(filename: string): string {
  const ext = filename.split(".").pop()?.toLowerCase();
  switch (ext) {
    case "ts": return "typescript";
    case "tsx": return "tsx";
    case "js": return "javascript";
    case "jsx": return "jsx";
    case "json": return "json";
    case "py": return "python";
    case "md": return "markdown";
    case "css": return "css";
    case "html": return "html";
    case "sql": return "sql";
    case "yaml":
    case "yml": return "yaml";
    case "go": return "go";
    case "rs": return "rust";
    default: return ext || "plaintext";
  }
}

function FilesPage() {
  const { id } = Route.useParams();
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

  const [copied, setCopied] = useState(false);
  const [openNewDialog, setOpenNewDialog] = useState(false);
  const [newFilePath, setNewFilePath] = useState("");
  const [newFileContent, setNewFileContent] = useState("");
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Sync custom files to localStorage
  useEffect(() => {
    if (typeof window !== "undefined") {
      localStorage.setItem(`project_custom_files_${id}`, JSON.stringify(customFiles));
    }
  }, [id, customFiles]);

  // Merge default project files with user-uploaded files
  const mergedFiles = useMemo(() => {
    const baseFiles = project?.files ?? [];
    if (customFiles.length === 0) return baseFiles;
    return [...customFiles, ...baseFiles];
  }, [project, customFiles]);

  const active = useMemo(
    () => selected ?? (mergedFiles.length ? (firstFile(mergedFiles) ?? null) : null),
    [selected, mergedFiles],
  );

  if (isLoading || !project) return <Skeleton className="h-96 w-full" />;

  // Handle local file upload (multiple files supported)
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

    // Reset input
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
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
    if (!active?.content) return;
    navigator.clipboard.writeText(active.content);
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

      <div className="grid gap-6 lg:grid-cols-[300px_1fr]">
        <Panel
          title="Explorer"
          description={project.repository.fullName}
          actions={
            <div className="flex items-center gap-1.5">
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
          <div className="space-y-3">
            <FileTree files={mergedFiles} activeId={active?.id} onSelect={setSelected} />
          </div>
        </Panel>

        <Panel
          title={active?.path ?? "No file selected"}
          {...(active?.language ? { description: active.language } : {})}
          actions={
            active?.content ? (
              <Button
                variant="ghost"
                size="sm"
                onClick={handleCopyCode}
                className="h-7 text-xs gap-1 text-muted-foreground hover:text-foreground"
              >
                {copied ? <Check className="size-3 text-emerald-400" /> : <Copy className="size-3" />}
                {copied ? "Copied" : "Copy"}
              </Button>
            ) : null
          }
        >
          {active?.content ? (
            <CodeBlock code={active.content} />
          ) : (
            <p className="text-sm text-muted-foreground">Select a file to preview its contents.</p>
          )}
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
