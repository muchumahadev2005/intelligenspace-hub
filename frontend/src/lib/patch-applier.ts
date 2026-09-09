import type { QueryClient } from "@tanstack/react-query";
import type { DiffLine, Project, ProjectFile } from "@/types/developer";
import { devApi } from "@/services/developer-api";
import { detectLanguage } from "@/lib/github-tree";

/**
 * Normalizes a file path for comparison.
 */
function normalizePath(path: string): string {
  return path.replace(/^[./\\]+/, "").replace(/\\/g, "/").toLowerCase();
}

/**
 * Checks if two file paths refer to the same file.
 */
function isSamePath(a: string, b: string): boolean {
  const normA = normalizePath(a);
  const normB = normalizePath(b);
  return normA === normB || normA.endsWith(`/${normB}`) || normB.endsWith(`/${normA}`);
}

/**
 * Strips leading git diff prefixes (+, -, space) from a diff line.
 */
export function cleanDiffLineText(line: DiffLine): string {
  const text = line.text;
  if (line.type === "remove") {
    if (text.startsWith("- ")) return text.slice(2);
    if (text.startsWith("-")) return text.slice(1);
  } else if (line.type === "add") {
    if (text.startsWith("+ ")) return text.slice(2);
    if (text.startsWith("+")) return text.slice(1);
  } else if (line.type === "context") {
    if (text.startsWith("  ")) return text.slice(1);
  }
  return text;
}

/**
 * Applies a DiffLine array to existing file content.
 * Uses multi-tier matching: exact block, normalized line search, context anchor search, or fallback.
 */
export function applyDiffToContent(originalContent: string, diff: DiffLine[]): string {
  if (!diff || diff.length === 0) return originalContent;

  const removeLines = diff.filter((l) => l.type === "remove").map(cleanDiffLineText);
  const addLines = diff.filter((l) => l.type === "add").map(cleanDiffLineText);

  // If the file is empty or placeholder, reconstruct directly from diff context + additions
  const isPlaceholder =
    !originalContent ||
    originalContent.trim().length === 0 ||
    originalContent.startsWith("// Source from GitHub repository:") ||
    originalContent.startsWith("// Could not load");

  if (isPlaceholder) {
    return diff
      .filter((l) => l.type !== "remove")
      .map(cleanDiffLineText)
      .join("\n");
  }

  // Strategy 1: Exact substring replacement for removed block
  if (removeLines.length > 0) {
    const removeBlock = removeLines.join("\n");
    const addBlock = addLines.join("\n");

    if (originalContent.includes(removeBlock)) {
      return originalContent.replace(removeBlock, addBlock);
    }

    // Also try with \r\n
    const removeBlockCRLF = removeLines.join("\r\n");
    if (originalContent.includes(removeBlockCRLF)) {
      return originalContent.replace(removeBlockCRLF, addBlock);
    }
  }

  // Strategy 2: Line-by-line whitespace-tolerant sliding window
  const origLines = originalContent.split(/\r?\n/);

  if (removeLines.length > 0) {
    const normRemove = removeLines.map((l) => l.trim());

    for (let i = 0; i <= origLines.length - removeLines.length; i++) {
      let match = true;
      for (let j = 0; j < removeLines.length; j++) {
        const origTrim = (origLines[i + j] ?? "").trim();
        const remTrim = normRemove[j] ?? "";
        if (origTrim !== remTrim && !origTrim.includes(remTrim) && !remTrim.includes(origTrim)) {
          match = false;
          break;
        }
      }

      if (match) {
        const nextLines = [...origLines];
        nextLines.splice(i, removeLines.length, ...addLines);
        return nextLines.join("\n");
      }
    }
  }

  // Strategy 3: Context-anchored insertion (when no remove lines, or remove lines were not found)
  const contextBefore = diff
    .slice(0, diff.findIndex((l) => l.type === "add" || l.type === "remove"))
    .filter((l) => l.type === "context")
    .map(cleanDiffLineText);

  if (contextBefore.length > 0 && addLines.length > 0) {
    const anchor = contextBefore[contextBefore.length - 1]?.trim();
    if (anchor) {
      const anchorIdx = origLines.findIndex((line) => line.trim() === anchor || line.includes(anchor));
      if (anchorIdx !== -1) {
        const nextLines = [...origLines];
        nextLines.splice(anchorIdx + 1, 0, ...addLines);
        return nextLines.join("\n");
      }
    }
  }

  // Strategy 4: Fallback - append added lines
  if (addLines.length > 0) {
    return `${originalContent.trimEnd()}\n\n// Patched by Developer AI\n${addLines.join("\n")}\n`;
  }

  return originalContent;
}

/**
 * Recursively updates a file's content in a ProjectFile tree.
 */
export function updateFileInNodeTree(
  nodes: ProjectFile[],
  targetPath: string,
  newContent: string,
): { updated: boolean; nodes: ProjectFile[] } {
  let wasUpdated = false;

  const nextNodes = nodes.map((node) => {
    if (node.type === "file" && isSamePath(node.path, targetPath)) {
      wasUpdated = true;
      return { ...node, content: newContent };
    }

    if (node.type === "folder" && node.children) {
      const result = updateFileInNodeTree(node.children, targetPath, newContent);
      if (result.updated) {
        wasUpdated = true;
        return { ...node, children: result.nodes };
      }
    }

    return node;
  });

  return { updated: wasUpdated, nodes: nextNodes };
}

/**
 * Finds a file in a ProjectFile tree.
 */
export function findFileInTree(nodes: ProjectFile[], targetPath: string): ProjectFile | null {
  for (const node of nodes) {
    if (node.type === "file" && isSamePath(node.path, targetPath)) {
      return node;
    }
    if (node.type === "folder" && node.children) {
      const found = findFileInTree(node.children, targetPath);
      if (found) return found;
    }
  }
  return null;
}

export interface ApplyPatchOptions {
  projectId: string;
  filePath: string;
  diff?: DiffLine[] | undefined;
  newContentDirect?: string | undefined;
  originalCode?: string | undefined;
  project?: Project | undefined;
  queryClient: QueryClient;
}

/**
 * Applies a patch to a project file, updates localStorage, calls backend API,
 * and updates React Query caches so all tabs immediately reflect the changes.
 */
export async function applyAndSaveProjectPatch({
  projectId,
  filePath,
  diff,
  newContentDirect,
  originalCode,
  project,
  queryClient,
}: ApplyPatchOptions): Promise<{ success: boolean; newContent: string; message: string }> {
  try {
    // 1. Determine current file content
    let currentContent = originalCode || "";

    if (!currentContent && project) {
      const found = findFileInTree(project.files || [], filePath);
      if (found?.content && !found.content.startsWith("// Source from GitHub repository:")) {
        currentContent = found.content;
      }
    }

    // Check custom files in localStorage
    if (!currentContent && typeof window !== "undefined") {
      try {
        const savedCustom = localStorage.getItem(`project_custom_files_${projectId}`);
        if (savedCustom) {
          const customFiles: ProjectFile[] = JSON.parse(savedCustom);
          const foundCustom = findFileInTree(customFiles, filePath);
          if (foundCustom?.content) {
            currentContent = foundCustom.content;
          }
        }
      } catch {}
    }

    // 2. Compute patched content
    let finalContent = "";
    if (newContentDirect !== undefined) {
      finalContent = newContentDirect;
    } else if (diff && diff.length > 0) {
      finalContent = applyDiffToContent(currentContent, diff);
    } else {
      throw new Error("No diff or content provided to apply");
    }

    // 3. Update localStorage custom files
    if (typeof window !== "undefined") {
      try {
        const savedCustom = localStorage.getItem(`project_custom_files_${projectId}`);
        let customFiles: ProjectFile[] = savedCustom ? JSON.parse(savedCustom) : [];
        const customUpdate = updateFileInNodeTree(customFiles, filePath, finalContent);

        if (customUpdate.updated) {
          customFiles = customUpdate.nodes;
        } else {
          // If not in custom files and wasn't found, add it
          const fileName = filePath.split("/").pop() || filePath;
          customFiles = [
            {
              id: `patch_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
              name: fileName,
              path: filePath,
              type: "file",
              language: detectLanguage(fileName),
              content: finalContent,
            },
            ...customFiles,
          ];
        }

        localStorage.setItem(`project_custom_files_${projectId}`, JSON.stringify(customFiles));
      } catch (err) {
        console.warn("Failed to update localStorage custom files:", err);
      }
    }

    // 4. Update project tree in React Query and Postgres backend
    const currentFiles = project?.files || [];
    const treeResult = updateFileInNodeTree(currentFiles, filePath, finalContent);

    let updatedFiles = treeResult.nodes;
    if (!treeResult.updated) {
      const fileName = filePath.split("/").pop() || filePath;
      const newNode: ProjectFile = {
        id: `file_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
        name: fileName,
        path: filePath,
        type: "file",
        language: detectLanguage(fileName),
        content: finalContent,
      };
      updatedFiles = [newNode, ...updatedFiles];
    }

    // Update React Query cache synchronously
    queryClient.setQueryData(["dev", "projects", projectId], (old: Project | undefined) => {
      if (!old) return old;
      return { ...old, files: updatedFiles };
    });

    // Save to PostgreSQL via devApi
    try {
      await devApi.projects.update(projectId, { files: updatedFiles });
    } catch (apiErr) {
      console.warn("Could not sync patched file to backend database:", apiErr);
    }

    // Invalidate project query to ensure fresh state across the app
    await queryClient.invalidateQueries({ queryKey: ["dev", "projects", projectId] });

    return {
      success: true,
      newContent: finalContent,
      message: `Patch successfully applied to ${filePath}`,
    };
  } catch (err: any) {
    console.error("applyAndSaveProjectPatch failed:", err);
    return {
      success: false,
      newContent: "",
      message: err.message || "Failed to apply patch",
    };
  }
}
