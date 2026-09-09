import { useState, useRef } from "react";
import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useQueryClient } from "@tanstack/react-query";
import {
  Github,
  Upload,
  FolderArchive,
  FileCode,
  CheckCircle2,
  AlertCircle,
  Loader2,
  FolderUp,
  RefreshCw,
  Sparkles,
  FileText,
} from "lucide-react";
import { toast } from "sonner";
import JSZip from "jszip";
import { AppShell } from "@/components/layout/app-shell";
import { PageHeader } from "@/components/shared/page-header";
import { Panel } from "@/components/developer/ui";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { devApi } from "@/services/developer-api";
import { fetchGitHubTree } from "@/lib/github-tree";
import type { ProjectFile } from "@/types/developer";

export const Route = createFileRoute("/developer/projects/new")({
  head: () => ({
    meta: [
      { title: "Connect a repository — Developer AI" },
      {
        name: "description",
        content: "Connect a GitHub repository or uploaded codebase to the Developer AI workspace.",
      },
      { property: "og:title", content: "Connect a repository — Developer AI" },
      { property: "og:description", content: "Add a codebase and let the AI engineering agents analyse it." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: NewProjectPage,
});

const sources = [
  { id: "github", label: "GitHub", desc: "Import a public or private repository.", icon: Github },
  { id: "upload", label: "Upload", desc: "Upload a zipped codebase or local files.", icon: Upload },
] as const;

function detectLanguage(filename: string): string {
  const ext = filename.split(".").pop()?.toLowerCase();
  switch (ext) {
    case "ts": return "TypeScript";
    case "tsx": return "TypeScript (React)";
    case "js": return "JavaScript";
    case "jsx": return "JavaScript (React)";
    case "json": return "JSON";
    case "py": return "Python";
    case "md": return "Markdown";
    case "css": return "CSS";
    case "html": return "HTML";
    case "sql": return "SQL";
    case "yaml":
    case "yml": return "YAML";
    case "go": return "Go";
    case "rs": return "Rust";
    case "java": return "Java";
    case "cpp":
    case "c": return "C/C++";
    default: return ext || "plaintext";
  }
}

function NewProjectPage() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  const [source, setSource] = useState<"github" | "upload">("github");
  const [name, setName] = useState("");
  const [repo, setRepo] = useState("");
  const [branch, setBranch] = useState("main");
  const [language, setLanguage] = useState("TypeScript");
  const [framework, setFramework] = useState("React");
  const [description, setDescription] = useState("");
  const [stack, setStack] = useState<string[]>(["React", "TypeScript"]);
  const [uploadedFiles, setUploadedFiles] = useState<ProjectFile[]>([]);

  // Verification & Loading States
  const [isVerifying, setIsVerifying] = useState(false);
  const [githubInfo, setGithubInfo] = useState<{
    stars?: number;
    language?: string;
    description?: string;
    defaultBranch?: string;
    verifiedName?: string;
  } | null>(null);

  const [isProcessing, setIsProcessing] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const zipInputRef = useRef<HTMLInputElement>(null);
  const folderInputRef = useRef<HTMLInputElement>(null);

  // Verify GitHub Repo
  const handleVerifyGitHub = async (targetRepo?: string) => {
    const raw = (targetRepo || repo).trim();
    const clean = raw.replace(/^https?:\/\/github\.com\//i, "").replace(/\/$/, "");
    if (!clean || !clean.includes("/")) {
      toast.error("Please enter a valid GitHub repository in 'owner/repo' format (e.g. facebook/react)");
      return;
    }

    setIsVerifying(true);
    setError(null);
    try {
      const res = await fetch(`https://api.github.com/repos/${clean}`);
      if (res.status === 404) {
        toast.error("Repository not found on GitHub. Check the name or verify it is public.");
        return;
      }
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        toast.error(`GitHub error (${res.status}): ${err.message || "Could not access repository"}`);
        return;
      }

      const data = await res.json();
      setGithubInfo({
        stars: data.stargazers_count,
        language: data.language,
        description: data.description,
        defaultBranch: data.default_branch,
        verifiedName: clean,
      });

      if (!name || name === "E-Commerce Platform") {
        setName(data.name.replace(/[-_]/g, " ").replace(/\b\w/g, (c: string) => c.toUpperCase()));
      }
      if (!description && data.description) {
        setDescription(data.description);
      }
      if (data.language) {
        setLanguage(data.language);
      }
      if (data.default_branch) {
        setBranch(data.default_branch);
      }

      // Fetch full recursive git tree and real code contents for the file explorer
      try {
        const { files: ghFiles, structure } = await fetchGitHubTree(clean, data.default_branch || "main");
        if (ghFiles.length > 0) {
          setUploadedFiles(ghFiles);
        }
      } catch (treeErr) {
        console.warn("Could not fetch full git tree:", treeErr);
      }

      toast.success(`Verified: ${clean}`, {
        description: `${data.stargazers_count?.toLocaleString() ?? 0} stars • ${data.language || "Code"} • Default branch: ${data.default_branch || "main"}`,
      });
    } catch (err: any) {
      toast.error("Network error verifying GitHub repository: " + err.message);
    } finally {
      setIsVerifying(false);
    }
  };

  // Process a Zip File
  const handleProcessZip = async (file: File) => {
    setIsProcessing(true);
    setError(null);
    try {
      const zip = await JSZip.loadAsync(file);
      const parsedFiles: ProjectFile[] = [];
      const validExtensions = [
        ".ts", ".tsx", ".js", ".jsx", ".json", ".py", ".html", ".css",
        ".scss", ".md", ".yaml", ".yml", ".sql", ".go", ".rs", ".java"
      ];

      const zipName = file.name.replace(/\.zip$/i, "");
      if (!name) {
        setName(zipName.replace(/[-_]/g, " ").replace(/\b\w/g, (c: string) => c.toUpperCase()));
      }

      let detectedPkgJson: any = null;
      let count = 0;

      const fileEntries = Object.keys(zip.files);
      for (const relativePath of fileEntries) {
        const entry = zip.files[relativePath];
        if (!entry || entry.dir) continue;

        if (
          relativePath.includes("node_modules/") ||
          relativePath.includes(".git/") ||
          relativePath.includes("dist/") ||
          relativePath.includes(".next/") ||
          relativePath.includes(".output/") ||
          relativePath.includes("build/")
        ) {
          continue;
        }

        const isCodeFile = validExtensions.some((ext) => relativePath.toLowerCase().endsWith(ext));
        if (!isCodeFile) continue;

        if (count >= 50) break; // Index up to 50 source files for prompt responsiveness

        const content = await entry.async("text");
        const filename = relativePath.split("/").pop() || relativePath;

        if (filename === "package.json" && !detectedPkgJson) {
          try {
            detectedPkgJson = JSON.parse(content);
          } catch {}
        }

        parsedFiles.push({
          id: `file_${Date.now()}_${count++}`,
          name: filename,
          path: relativePath,
          type: "file",
          language: detectLanguage(filename),
          content,
        });
      }

      if (detectedPkgJson) {
        if (detectedPkgJson.name && !name) {
          setName(detectedPkgJson.name.replace(/[-_]/g, " ").replace(/\b\w/g, (c: string) => c.toUpperCase()));
        }
        if (detectedPkgJson.description && !description) {
          setDescription(detectedPkgJson.description);
        }
        const deps = { ...(detectedPkgJson.dependencies || {}), ...(detectedPkgJson.devDependencies || {}) };
        if (deps.react) setFramework("React");
        else if (deps.next) setFramework("Next.js");
        else if (deps.vue) setFramework("Vue.js");
        else if (deps.express) setFramework("Express.js");
        else if (deps.hono) setFramework("Hono");

        if (deps.typescript) setLanguage("TypeScript");
        else setLanguage("JavaScript");

        const detectedStack: string[] = [];
        if (deps.react) detectedStack.push("React");
        if (deps.typescript) detectedStack.push("TypeScript");
        if (deps.tailwindcss || deps["@tailwindcss/vite"]) detectedStack.push("Tailwind CSS");
        if (deps.prisma) detectedStack.push("Prisma");
        if (deps.pg) detectedStack.push("PostgreSQL");
        if (detectedStack.length) setStack(detectedStack);
      }

      setUploadedFiles(parsedFiles);
      toast.success(`Unpacked ${parsedFiles.length} code files from ${file.name}`);
    } catch (err: any) {
      console.error("Zip processing error:", err);
      toast.error("Failed to read zip file: " + (err.message || "Corrupt zip archive"));
    } finally {
      setIsProcessing(false);
    }
  };

  // Process Folder / Multiple Files
  const handleMultipleFiles = async (filesList: FileList | null) => {
    if (!filesList || filesList.length === 0) return;

    setIsProcessing(true);
    setError(null);
    try {
      const parsedFiles: ProjectFile[] = [];
      let count = 0;

      for (let i = 0; i < filesList.length; i++) {
        const f = filesList[i];
        if (!f) continue;
        const relPath = (f as any).webkitRelativePath || f.name;

        if (
          relPath.includes("node_modules/") ||
          relPath.includes(".git/") ||
          relPath.includes("dist/") ||
          relPath.includes(".next/")
        ) {
          continue;
        }

        if (count >= 50) break;

        try {
          const text = await f.text();
          parsedFiles.push({
            id: `file_${Date.now()}_${count++}`,
            name: f.name,
            path: relPath,
            type: "file",
            language: detectLanguage(f.name),
            content: text,
          });
        } catch {}
      }

      if (!name && filesList[0]) {
        const topFolder = ((filesList[0] as any).webkitRelativePath || "").split("/")[0];
        if (topFolder) {
          setName(topFolder.replace(/[-_]/g, " ").replace(/\b\w/g, (c: string) => c.toUpperCase()));
        }
      }

      setUploadedFiles(parsedFiles);
      toast.success(`Indexed ${parsedFiles.length} files`);
    } catch (err: any) {
      toast.error("Failed to process files: " + err.message);
    } finally {
      setIsProcessing(false);
    }
  };

  // Drag & Drop
  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    const files = e.dataTransfer.files;
    if (!files || files.length === 0) return;

    const first = files[0];
    if (first && first.name.toLowerCase().endsWith(".zip")) {
      handleProcessZip(first);
    } else {
      handleMultipleFiles(files);
    }
  };

  // Form Submit
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!name.trim()) {
      setError("Please provide a project name.");
      return;
    }

    if (source === "github" && !repo.trim()) {
      setError("Please enter a GitHub repository name (e.g. owner/repo).");
      return;
    }

    if (source === "upload" && uploadedFiles.length === 0) {
      setError("Please select or upload a .zip archive or code files.");
      return;
    }

    setError(null);
    setIsSubmitting(true);

    try {
      const cleanRepo = repo.trim().replace(/^https?:\/\/github\.com\//i, "").replace(/\/$/, "");
      const fullName = source === "upload"
        ? `uploaded/${name.toLowerCase().replace(/[^a-z0-9]+/g, "-")}`
        : cleanRepo || name.toLowerCase().replace(/[^a-z0-9]+/g, "-");

      const created = await devApi.projects.create({
        name: name.trim(),
        description: description.trim() || `Codebase connected via ${source === "upload" ? "Upload" : "GitHub"}`,
        language,
        framework,
        stack: stack.length > 0 ? stack : [language, framework],
        repository: {
          provider: source === "upload" ? "upload" : "github",
          fullName,
          branch: branch || "main",
          branches: [branch || "main"],
          visibility: "private",
        },
        files: uploadedFiles,
        structure: uploadedFiles.map((f) => f.path),
      });

      // Invalidate project list cache so it appears immediately
      await queryClient.invalidateQueries({ queryKey: ["dev", "projects"] });

      toast.success("Project connected!", {
        description: `${name} has been added and is ready for AI analysis.`,
      });

      // Navigate to the newly created project
      navigate({ to: `/developer/projects/${created.id}` as "/" });
    } catch (err: any) {
      console.error("Failed to connect project:", err);
      toast.error("Failed to connect project: " + (err.message || "Unknown error"));
      setIsSubmitting(false);
    }
  };

  return (
    <AppShell>
      <PageHeader
        eyebrow="Developer AI"
        title="Connect a repository"
        description="Index your code for AI code review, debugging, test generation, and architectural analysis."
      />

      <form className="mt-6 grid max-w-3xl gap-6" onSubmit={handleSubmit}>
        {/* Source Selection */}
        <Panel title="Source">
          <div className="grid gap-3 sm:grid-cols-2">
            {sources.map((s) => (
              <button
                key={s.id}
                type="button"
                onClick={() => {
                  setSource(s.id);
                  setError(null);
                }}
                className={cn(
                  "flex items-start gap-3 rounded-xl border p-4 text-left transition-all cursor-pointer",
                  source === s.id
                    ? "border-primary bg-primary/10 shadow-sm ring-1 ring-primary/20"
                    : "border-border hover:bg-accent/50",
                )}
              >
                <s.icon className={cn("mt-0.5 size-4", source === s.id ? "text-primary" : "text-muted-foreground")} aria-hidden />
                <span>
                  <span className="block text-sm font-semibold">{s.label}</span>
                  <span className="block text-xs text-muted-foreground">{s.desc}</span>
                </span>
              </button>
            ))}
          </div>
        </Panel>

        {/* GitHub Source Details */}
        {source === "github" ? (
          <Panel title="GitHub Repository">
            <div className="grid gap-4">
              <div className="grid gap-2">
                <Label htmlFor="repo">Repository name or URL</Label>
                <div className="flex gap-2">
                  <Input
                    id="repo"
                    value={repo}
                    onChange={(e) => {
                      setRepo(e.target.value);
                      setGithubInfo(null);
                    }}
                    placeholder="e.g. facebook/react or https://github.com/owner/repo"
                    className="font-mono text-sm"
                  />
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => handleVerifyGitHub()}
                    disabled={isVerifying || !repo.trim()}
                    className="shrink-0 gap-1.5"
                  >
                    {isVerifying ? (
                      <>
                        <Loader2 className="size-3.5 animate-spin" /> Verifying...
                      </>
                    ) : (
                      <>
                        <RefreshCw className="size-3.5" /> Verify & Fetch
                      </>
                    )}
                  </Button>
                </div>
                <p className="text-xs text-muted-foreground">
                  Works with any public repository (e.g. <code>facebook/react</code>, <code>shadcn-ui/ui</code>, or your own).
                </p>
              </div>

              {/* GitHub Verified Banner */}
              {githubInfo && (
                <div className="flex items-center justify-between rounded-lg border border-emerald-500/30 bg-emerald-500/10 p-3 text-xs text-emerald-300">
                  <div className="flex items-center gap-2">
                    <CheckCircle2 className="size-4 text-emerald-400" />
                    <span>
                      Verified: <strong>{githubInfo.verifiedName}</strong>
                      {githubInfo.stars !== undefined && ` • ⭐️ ${githubInfo.stars.toLocaleString()} stars`}
                      {githubInfo.language && ` • ${githubInfo.language}`}
                      {githubInfo.defaultBranch && ` • branch: ${githubInfo.defaultBranch}`}
                    </span>
                  </div>
                  <Badge variant="outline" className="border-emerald-500/40 text-emerald-300">
                    Ready
                  </Badge>
                </div>
              )}
            </div>
          </Panel>
        ) : (
          /* Upload Codebase Details */
          <Panel title="Upload Codebase">
            <div className="grid gap-4">
              {/* Hidden Inputs */}
              <input
                ref={zipInputRef}
                type="file"
                accept=".zip"
                className="hidden"
                onChange={(e) => {
                  const f = e.target.files?.[0];
                  if (f) handleProcessZip(f);
                }}
              />
              <input
                ref={folderInputRef}
                type="file"
                multiple
                className="hidden"
                onChange={(e) => handleMultipleFiles(e.target.files)}
              />

              {/* Drag & Drop Upload Zone */}
              <div
                onDragOver={(e) => {
                  e.preventDefault();
                  setIsDragging(true);
                }}
                onDragLeave={() => setIsDragging(false)}
                onDrop={handleDrop}
                className={cn(
                  "flex flex-col items-center justify-center rounded-xl border-2 border-dashed p-8 text-center transition-all",
                  isDragging
                    ? "border-primary bg-primary/10"
                    : "border-border hover:border-primary/50 hover:bg-accent/30",
                )}
              >
                {isProcessing ? (
                  <div className="flex flex-col items-center gap-2">
                    <Loader2 className="size-8 animate-spin text-primary" />
                    <p className="text-sm font-medium">Extracting and indexing codebase files...</p>
                    <p className="text-xs text-muted-foreground">Parsing source code and package dependencies</p>
                  </div>
                ) : (
                  <>
                    <div className="flex size-12 items-center justify-center rounded-full bg-primary/10 text-primary mb-3">
                      <FolderArchive className="size-6" />
                    </div>
                    <h3 className="text-sm font-semibold">Drag & drop your code archive here</h3>
                    <p className="mt-1 text-xs text-muted-foreground max-w-sm">
                      Upload a <strong>.zip</strong> archive of your repository, or select multiple code files directly from your computer.
                    </p>

                    <div className="mt-4 flex flex-wrap justify-center gap-2.5">
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={() => zipInputRef.current?.click()}
                        className="gap-1.5"
                      >
                        <FolderArchive className="size-3.5" /> Choose .zip file
                      </Button>
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={() => folderInputRef.current?.click()}
                        className="gap-1.5"
                      >
                        <FolderUp className="size-3.5" /> Browse Code Files
                      </Button>
                    </div>
                  </>
                )}
              </div>

              {/* Uploaded Files Summary */}
              {uploadedFiles.length > 0 && (
                <div className="rounded-lg border border-primary/30 bg-primary/5 p-3.5">
                  <div className="flex items-center justify-between">
                    <span className="flex items-center gap-2 text-xs font-semibold text-foreground">
                      <FileCode className="size-4 text-primary" />
                      {uploadedFiles.length} files indexed and ready for AI analysis
                    </span>
                    <Badge variant="secondary" className="text-[11px]">
                      {language} • {framework}
                    </Badge>
                  </div>
                  <div className="mt-2.5 flex flex-wrap gap-1.5 max-h-24 overflow-y-auto">
                    {uploadedFiles.slice(0, 15).map((f) => (
                      <span
                        key={f.id}
                        className="inline-flex items-center gap-1 rounded bg-accent px-2 py-0.5 text-[11px] font-mono text-muted-foreground"
                      >
                        <FileText className="size-2.5" />
                        {f.name}
                      </span>
                    ))}
                    {uploadedFiles.length > 15 && (
                      <span className="text-[11px] text-muted-foreground self-center">
                        +{uploadedFiles.length - 15} more files
                      </span>
                    )}
                  </div>
                </div>
              )}
            </div>
          </Panel>
        )}

        {/* Project Details */}
        <Panel title="Project Details">
          <div className="grid gap-4">
            <div className="grid gap-2">
              <Label htmlFor="name">Project Name <span className="text-destructive">*</span></Label>
              <Input
                id="name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="e.g. E-Commerce Platform"
                required
              />
              {error ? <p className="text-xs text-destructive">{error}</p> : null}
            </div>

            <div className="grid gap-4 sm:grid-cols-3">
              <div className="grid gap-2">
                <Label htmlFor="branch">Default Branch</Label>
                <Input
                  id="branch"
                  value={branch}
                  onChange={(e) => setBranch(e.target.value)}
                  placeholder="main"
                />
              </div>

              <div className="grid gap-2">
                <Label>Primary Language</Label>
                <Select value={language} onValueChange={setLanguage}>
                  <SelectTrigger>
                    <SelectValue placeholder="Language" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="TypeScript">TypeScript</SelectItem>
                    <SelectItem value="JavaScript">JavaScript</SelectItem>
                    <SelectItem value="Python">Python</SelectItem>
                    <SelectItem value="Go">Go</SelectItem>
                    <SelectItem value="Rust">Rust</SelectItem>
                    <SelectItem value="Java">Java</SelectItem>
                    <SelectItem value="PHP">PHP</SelectItem>
                    <SelectItem value="C++">C++</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="grid gap-2">
                <Label>Framework</Label>
                <Select value={framework} onValueChange={setFramework}>
                  <SelectTrigger>
                    <SelectValue placeholder="Framework" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="React">React</SelectItem>
                    <SelectItem value="Next.js">Next.js</SelectItem>
                    <SelectItem value="Vue.js">Vue.js</SelectItem>
                    <SelectItem value="Node.js">Node.js</SelectItem>
                    <SelectItem value="Express.js">Express.js</SelectItem>
                    <SelectItem value="FastAPI">FastAPI</SelectItem>
                    <SelectItem value="Django">Django</SelectItem>
                    <SelectItem value="Tailwind">Tailwind</SelectItem>
                    <SelectItem value="Other">Other</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="grid gap-2">
              <Label htmlFor="desc">Description</Label>
              <Textarea
                id="desc"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="What does this codebase do? (Helps AI agents generate more accurate suggestions)"
                rows={3}
              />
            </div>
          </div>
        </Panel>

        {/* Action Buttons */}
        <div className="flex items-center justify-end gap-2.5">
          <Button
            type="button"
            variant="outline"
            onClick={() => navigate({ to: "/developer/projects" as "/" })}
            disabled={isSubmitting}
          >
            Cancel
          </Button>
          <Button type="submit" disabled={isSubmitting || isProcessing} className="gap-2">
            {isSubmitting ? (
              <>
                <Loader2 className="size-4 animate-spin" /> Connecting project...
              </>
            ) : (
              <>
                <Sparkles className="size-4" /> Connect project
              </>
            )}
          </Button>
        </div>
      </form>
    </AppShell>
  );
}
