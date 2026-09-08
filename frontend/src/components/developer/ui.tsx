import { useState, type ReactNode } from "react";
import { ChevronRight, File as FileIcon, Folder, FolderOpen } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { cn } from "@/lib/utils";
import { relative } from "@/lib/format";
import type {
  DiffLine,
  ProjectFile,
  Severity,
  TaskStatus,
} from "@/types/developer";

const severityStyles: Record<Severity, string> = {
  critical: "bg-destructive/15 text-destructive border-destructive/30",
  high: "bg-orange-500/15 text-orange-400 border-orange-500/30",
  medium: "bg-amber-500/15 text-amber-400 border-amber-500/30",
  low: "bg-primary/15 text-primary border-primary/30",
};

export function SeverityBadge({ severity }: { severity: Severity }) {
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-md border px-2 py-0.5 text-[11px] font-medium capitalize",
        severityStyles[severity],
      )}
    >
      {severity}
    </span>
  );
}

const statusStyles: Record<TaskStatus, string> = {
  waiting: "bg-secondary text-muted-foreground",
  running: "bg-primary/15 text-primary",
  completed: "bg-emerald-500/15 text-emerald-400",
  failed: "bg-destructive/15 text-destructive",
};

export function TaskStatusPill({ status }: { status: TaskStatus }) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 rounded-md px-2 py-0.5 text-[11px] font-medium capitalize",
        statusStyles[status],
      )}
    >
      <span className="size-1.5 rounded-full bg-current" aria-hidden />
      {status}
    </span>
  );
}

export function ScoreBar({ label, value }: { label: string; value: number }) {
  return (
    <div>
      <div className="flex items-center justify-between text-xs">
        <span className="text-muted-foreground">{label}</span>
        <span className="tabular-nums font-medium">{value}%</span>
      </div>
      <Progress value={value} className="mt-2 h-1.5" />
    </div>
  );
}

export function DiffView({ lines = [], className }: { lines?: DiffLine[]; className?: string }) {
  const safeLines = lines || [];
  return (
    <pre
      className={cn(
        "overflow-x-auto rounded-lg border border-border bg-muted/40 p-0 font-mono text-xs leading-6",
        className,
      )}
    >
      {safeLines.map((line, i) => (
        <div
          key={i}
          className={cn(
            "px-4",
            line.type === "add" && "bg-emerald-500/10 text-emerald-400",
            line.type === "remove" && "bg-destructive/10 text-destructive",
            line.type === "context" && "text-muted-foreground",
          )}
        >
          <span className="select-none pr-3 opacity-60">
            {line.type === "add" ? "+" : line.type === "remove" ? "-" : " "}
          </span>
          {line.text || " "}
        </div>
      ))}
    </pre>
  );
}

export function CodeBlock({ code }: { code: string }) {
  return (
    <pre className="overflow-x-auto rounded-lg border border-border bg-muted/40 p-4 font-mono text-xs leading-6">
      {code}
    </pre>
  );
}

function FileNode({
  node,
  depth,
  activeId,
  onSelect,
}: {
  node: ProjectFile;
  depth: number;
  activeId?: string | undefined;
  onSelect: (file: ProjectFile) => void;
}) {
  const [open, setOpen] = useState(depth < 1);
  const isFolder = node.type === "folder";
  const active = node.id === activeId;

  return (
    <li>
      <button
        onClick={() => (isFolder ? setOpen((v) => !v) : onSelect(node))}
        className={cn(
          "flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-left text-xs transition-colors hover:bg-accent",
          active ? "bg-primary/12 text-primary" : "text-muted-foreground",
        )}
        style={{ paddingLeft: 8 + depth * 12 }}
      >
        {isFolder ? (
          <>
            <ChevronRight className={cn("size-3 transition-transform", open && "rotate-90")} aria-hidden />
            {open ? <FolderOpen className="size-3.5" aria-hidden /> : <Folder className="size-3.5" aria-hidden />}
          </>
        ) : (
          <FileIcon className="ml-5 size-3.5" aria-hidden />
        )}
        <span className="truncate">{node.name}</span>
      </button>
      {isFolder && open && node.children?.length ? (
        <ul>
          {node.children.map((child) => (
            <FileNode
              key={child.id}
              node={child}
              depth={depth + 1}
              activeId={activeId}
              onSelect={onSelect}
            />
          ))}
        </ul>
      ) : null}
    </li>
  );
}

export function FileTree({
  files,
  activeId,
  onSelect,
}: {
  files: ProjectFile[];
  activeId?: string | undefined;
  onSelect: (file: ProjectFile) => void;
}) {
  return (
    <ul className="space-y-0.5">
      {files.map((f) => (
        <FileNode key={f.id} node={f} depth={0} activeId={activeId} onSelect={onSelect} />
      ))}
    </ul>
  );
}

export function ActivityTimeline({
  items,
}: {
  items: { id: string; label: string; detail: string; agent: string; at: string }[];
}) {
  return (
    <ol className="relative space-y-5 border-l border-border pl-5">
      {items.map((item) => (
        <li key={item.id} className="relative">
          <span className="absolute -left-[26px] top-1.5 size-2.5 rounded-full bg-primary" aria-hidden />
          <p className="text-sm font-medium">{item.label}</p>
          <p className="text-xs text-muted-foreground">{item.detail}</p>
          <p className="mt-1 text-[11px] text-muted-foreground">
            <Badge variant="secondary" className="mr-2">{item.agent}</Badge>
            {relative(item.at)}
          </p>
        </li>
      ))}
    </ol>
  );
}

export function Panel({
  title,
  description,
  actions,
  children,
  className,
}: {
  title?: string;
  description?: string;
  actions?: ReactNode;
  children: ReactNode;
  className?: string;
}) {
  return (
    <section className={cn("panel p-6", className)}>
      {title ? (
        <header className="mb-4 flex flex-wrap items-start justify-between gap-3">
          <div>
            <h2 className="text-sm font-semibold">{title}</h2>
            {description ? (
              <p className="mt-1 text-xs text-muted-foreground">{description}</p>
            ) : null}
          </div>
          {actions}
        </header>
      ) : null}
      {children}
    </section>
  );
}
