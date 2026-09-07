import { cn } from "@/lib/utils";

const tones: Record<string, string> = {
  active: "bg-success/15 text-success",
  completed: "bg-success/15 text-success",
  confirmed: "bg-success/15 text-success",
  healthy: "bg-success/15 text-success",
  delivered: "bg-success/15 text-success",
  positive: "bg-success/15 text-success",
  processing: "bg-primary/15 text-primary",
  in_progress: "bg-primary/15 text-primary",
  pending: "bg-warning/15 text-warning",
  retrying: "bg-warning/15 text-warning",
  degraded: "bg-warning/15 text-warning",
  paused: "bg-warning/15 text-warning",
  out_of_stock: "bg-warning/15 text-warning",
  invited: "bg-warning/15 text-warning",
  voicemail: "bg-warning/15 text-warning",
  neutral: "bg-secondary text-muted-foreground",
  failed: "bg-destructive/15 text-destructive",
  cancelled: "bg-destructive/15 text-destructive",
  missed: "bg-destructive/15 text-destructive",
  negative: "bg-destructive/15 text-destructive",
  suspended: "bg-destructive/15 text-destructive",
};

export function StatusBadge({ status, className }: { status: string; className?: string }) {
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium capitalize",
        tones[status] ?? "bg-secondary text-secondary-foreground",
        className,
      )}
    >
      {status.replace(/_/g, " ")}
    </span>
  );
}
