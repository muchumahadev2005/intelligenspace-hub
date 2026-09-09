import type { ProjectFile } from "@/types/developer";

export function detectLanguage(filename: string): string {
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
    case "sh": return "Shell";
    default: return ext ? ext.toUpperCase() : "Plaintext";
  }
}

/**
 * Builds a nested ProjectFile[] hierarchy from a flat list of Git paths.
 */
export function buildFileTree(
  items: Array<{ path: string; type?: string; content?: string; language?: string }>,
): ProjectFile[] {
  const root: ProjectFile[] = [];

  for (const item of items) {
    const rawParts = item.path.split("/").filter(Boolean);
    if (rawParts.length === 0) continue;

    let currentLevel = root;

    for (let i = 0; i < rawParts.length; i++) {
      const part = rawParts[i];
      if (!part) continue;
      const isLast = i === rawParts.length - 1;
      const currentPath = rawParts.slice(0, i + 1).join("/");
      const isFolder = !isLast || item.type === "tree" || item.type === "folder";

      let existing = currentLevel.find((n) => n.name === part);

      if (!existing) {
        const newNode: ProjectFile = {
          id: `node_${currentPath.replace(/[^a-zA-Z0-9_-]/g, "_")}`,
          name: part,
          path: currentPath,
          type: isFolder ? "folder" : "file",
          language: isFolder ? undefined : (item.language || detectLanguage(part)),
          children: isFolder ? [] : undefined,
          content: isFolder ? undefined : (item.content || ""),
        };
        currentLevel.push(newNode);
        existing = newNode;
      }

      if (isFolder && existing) {
        if (!existing.children) existing.children = [];
        currentLevel = existing.children;
      }
    }
  }

  function sortTree(nodes: ProjectFile[]) {
    nodes.sort((a, b) => {
      if (a.type === b.type) return a.name.localeCompare(b.name);
      return a.type === "folder" ? -1 : 1;
    });
    for (const n of nodes) {
      if (n.children && n.children.length > 0) {
        sortTree(n.children);
      }
    }
  }

  sortTree(root);
  return root;
}

/**
 * Fetches raw file content from GitHub raw usercontent.
 */
export async function fetchRawFileContent(
  ownerRepo: string,
  branch: string,
  filePath: string,
): Promise<string> {
  const clean = ownerRepo.replace(/^https?:\/\/github\.com\//i, "").replace(/\/$/, "");
  const cleanBranch = branch || "main";
  const url = `https://raw.githubusercontent.com/${clean}/${cleanBranch}/${filePath}`;

  const res = await fetch(url);
  if (!res.ok) {
    throw new Error(`Failed to load file (${res.status} ${res.statusText})`);
  }
  return await res.text();
}

/**
 * Fetches entire recursive Git tree for a GitHub repo and pre-populates key source files.
 */
export async function fetchGitHubTree(
  ownerRepo: string,
  branch = "main",
): Promise<{ files: ProjectFile[]; structure: string[]; totalCount: number }> {
  const clean = ownerRepo.replace(/^https?:\/\/github\.com\//i, "").replace(/\/$/, "");

  // 1. Fetch recursive git tree
  const treeRes = await fetch(`https://api.github.com/repos/${clean}/git/trees/${branch}?recursive=1`);
  if (!treeRes.ok) {
    throw new Error(`GitHub Git Tree API failed with status ${treeRes.status}`);
  }

  const data = await treeRes.json();
  const rawTree: Array<{ path: string; type: string; size?: number }> = data.tree || [];

  // Filter out node_modules, .git, binaries, and giant artifacts
  const filtered = rawTree.filter((item) => {
    const p = item.path.toLowerCase();
    if (
      p.includes("node_modules/") ||
      p.includes(".git/") ||
      p.includes("dist/") ||
      p.includes(".output/") ||
      p.includes("build/") ||
      p.endsWith(".png") ||
      p.endsWith(".jpg") ||
      p.endsWith(".jpeg") ||
      p.endsWith(".gif") ||
      p.endsWith(".ico") ||
      p.endsWith(".pdf") ||
      p.endsWith(".zip") ||
      p.endsWith(".mp4") ||
      p.endsWith(".mp3") ||
      p.endsWith(".lock") ||
      p.endsWith("-lock.json")
    ) {
      return false;
    }
    return true;
  });

  // Limit tree size to reasonable count if repository is massive
  const prioritizedTree = filtered.slice(0, 300);

  // 2. Identify priority files to pre-fetch content (README, package.json, configs, first 10 source files)
  const priorityBlobs = prioritizedTree
    .filter((i) => i.type === "blob")
    .filter((i) => {
      const p = i.path.toLowerCase();
      return (
        p === "readme.md" ||
        p === "package.json" ||
        p.endsWith("/readme.md") ||
        p.endsWith("/package.json") ||
        p.includes("app.") ||
        p.includes("index.") ||
        p.includes("main.") ||
        p.includes("server.")
      );
    })
    .slice(0, 12);

  const contentMap: Record<string, string> = {};

  await Promise.all(
    priorityBlobs.map(async (item) => {
      try {
        const text = await fetchRawFileContent(clean, branch, item.path);
        contentMap[item.path] = text;
      } catch {}
    }),
  );

  const treeItems = prioritizedTree.map((item) => ({
    path: item.path,
    type: item.type === "tree" ? ("folder" as const) : ("file" as const),
    content: contentMap[item.path] || "",
    language: detectLanguage(item.path.split("/").pop() || item.path),
  }));

  const nestedFiles = buildFileTree(treeItems);
  const structure = prioritizedTree.map((i) => i.path);

  return {
    files: nestedFiles,
    structure,
    totalCount: prioritizedTree.length,
  };
}

/**
 * Extracts a flattened array of reviewable code files from nested ProjectFile tree.
 */
export function extractCodeFiles(nodes: ProjectFile[]): ProjectFile[] {
  const list: ProjectFile[] = [];
  function recurse(items: ProjectFile[]) {
    for (const node of items) {
      if (node.type === "file") {
        const p = node.path.toLowerCase();
        if (
          !p.endsWith(".png") &&
          !p.endsWith(".jpg") &&
          !p.endsWith(".jpeg") &&
          !p.endsWith(".gif") &&
          !p.endsWith(".ico") &&
          !p.endsWith(".svg") &&
          !p.endsWith(".pdf") &&
          !p.endsWith(".zip") &&
          !p.endsWith(".lock") &&
          !p.endsWith("-lock.json") &&
          !p.includes("node_modules/") &&
          !p.includes(".git/")
        ) {
          list.push(node);
        }
      }
      if (node.children && node.children.length > 0) {
        recurse(node.children);
      }
    }
  }
  recurse(nodes || []);
  return list;
}

/**
 * Robustly retrieves all code files for a project, taking into account
 * project.files, local storage cache, and project.structure paths.
 */
export function getProjectCodeFiles(project: any, projectId: string): ProjectFile[] {
  if (!project) return [];
  let customFiles: ProjectFile[] = [];
  if (typeof window !== "undefined") {
    try {
      const raw = localStorage.getItem(`project_custom_files_${projectId}`);
      if (raw) customFiles = JSON.parse(raw);
    } catch {}
  }

  const combinedTree = [...customFiles, ...(project.files || [])];
  let extracted = extractCodeFiles(combinedTree);

  // If tree is empty but project.structure (flat paths) exists, synthesize ProjectFile items
  if (extracted.length === 0 && Array.isArray(project.structure) && project.structure.length > 0) {
    const synthetic: ProjectFile[] = project.structure
      .filter((p: string) => {
        const lower = p.toLowerCase();
        return (
          !lower.endsWith(".png") &&
          !lower.endsWith(".jpg") &&
          !lower.endsWith(".jpeg") &&
          !lower.endsWith(".gif") &&
          !lower.endsWith(".ico") &&
          !lower.endsWith(".svg") &&
          !lower.endsWith(".pdf") &&
          !lower.endsWith(".zip") &&
          !lower.endsWith(".lock") &&
          !lower.endsWith("-lock.json") &&
          !lower.includes("node_modules/") &&
          !lower.includes(".git/") &&
          p.includes(".")
        );
      })
      .map((p: string) => ({
        id: `synth_${p.replace(/[^a-zA-Z0-9_-]/g, "_")}`,
        name: p.split("/").pop() || p,
        path: p,
        type: "file" as const,
        language: detectLanguage(p.split("/").pop() || p),
      }));
    extracted = synthetic;
  }

  // Deduplicate by path
  const seen = new Set<string>();
  const unique: ProjectFile[] = [];
  for (const f of extracted) {
    if (!seen.has(f.path)) {
      seen.add(f.path);
      unique.push(f);
    }
  }

  return unique;
}

/**
 * Loads the code of a specific file from cache, project files, or GitHub raw.
 */
export async function loadProjectFileCode(
  project: any,
  filePath: string,
  cache: Record<string, string> = {},
): Promise<string> {
  if (cache[filePath]) return cache[filePath];

  // Check if content exists in project.files
  if (project?.files) {
    const flat = extractCodeFiles(project.files);
    const match = flat.find((f) => f.path === filePath);
    if (match?.content) return match.content;
  }

  // Fetch from GitHub raw
  const repoFullName = project?.repository?.fullName || project?.name;
  const branch = project?.repository?.branch || "main";
  if (repoFullName) {
    return await fetchRawFileContent(repoFullName, branch, filePath);
  }

  return "";
}

