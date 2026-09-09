import { ChevronLeft, ChevronRight, FileCode, CheckCircle2 } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import type { ProjectFile } from "@/types/developer";

interface FileSelectorBarProps {
  files: ProjectFile[];
  selectedPath: string;
  onSelectPath: (path: string) => void;
  completedMap?: Record<string, boolean>;
  label?: string;
  actions?: React.ReactNode;
}

export function FileSelectorBar({
  files,
  selectedPath,
  onSelectPath,
  completedMap = {},
  label = "Target file",
  actions,
}: FileSelectorBarProps) {
  const currentIndex = files.findIndex((f) => f.path === selectedPath);
  const currentFile = files[currentIndex] ?? files[0] ?? null;

  const hasPrev = currentIndex > 0;
  const hasNext = currentIndex >= 0 && currentIndex < files.length - 1;

  const handlePrev = () => {
    const prev = files[currentIndex - 1];
    if (hasPrev && prev) onSelectPath(prev.path);
  };

  const handleNext = () => {
    const next = files[currentIndex + 1];
    if (hasNext && next) onSelectPath(next.path);
  };

  if (files.length === 0) {
    return (
      <div className="flex items-center justify-between rounded-lg border border-border bg-card/60 px-3.5 py-2 text-xs text-muted-foreground">
        <span>No project files detected. Connect a repository or upload code files.</span>
      </div>
    );
  }

  return (
    <div className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-border bg-card/75 p-2.5 shadow-sm backdrop-blur-sm">
      <div className="flex flex-wrap items-center gap-2">
        <span className="text-[11px] font-medium uppercase tracking-wider text-muted-foreground">
          {label}:
        </span>

        {/* File Dropdown Selector */}
        <div className="w-[280px] sm:w-[340px]">
          <Select value={selectedPath || currentFile?.path || ""} onValueChange={onSelectPath}>
            <SelectTrigger className="h-8 text-xs font-mono">
              <SelectValue placeholder="Select target file..." />
            </SelectTrigger>
            <SelectContent className="max-h-72">
              {files.map((file, idx) => {
                const isCompleted = !!completedMap[file.path];
                return (
                  <SelectItem key={file.path} value={file.path} className="font-mono text-xs">
                    <div className="flex items-center gap-2">
                      {isCompleted ? (
                        <CheckCircle2 className="size-3 text-emerald-400 shrink-0" />
                      ) : (
                        <FileCode className="size-3 text-muted-foreground shrink-0" />
                      )}
                      <span className="truncate">{file.path}</span>
                      {file.language && (
                        <span className="ml-auto text-[10px] text-muted-foreground opacity-60">
                          {file.language}
                        </span>
                      )}
                    </div>
                  </SelectItem>
                );
              })}
            </SelectContent>
          </Select>
        </div>

        {/* Prev / Next buttons */}
        <div className="flex items-center gap-1">
          <Button
            variant="outline"
            size="icon"
            className="size-8"
            onClick={handlePrev}
            disabled={!hasPrev}
            title="Previous file"
          >
            <ChevronLeft className="size-3.5" />
          </Button>
          <Button
            variant="outline"
            size="icon"
            className="size-8"
            onClick={handleNext}
            disabled={!hasNext}
            title="Next file"
          >
            <ChevronRight className="size-3.5" />
          </Button>
        </div>

        {/* Counter Badge */}
        {currentIndex >= 0 && (
          <span className="text-[11px] text-muted-foreground tabular-nums">
            {currentIndex + 1} of {files.length} files
          </span>
        )}

        {currentFile?.language && (
          <Badge variant="outline" className="text-[10px] hidden md:inline-flex">
            {currentFile.language}
          </Badge>
        )}
      </div>

      {actions && <div className="flex items-center gap-2">{actions}</div>}
    </div>
  );
}
