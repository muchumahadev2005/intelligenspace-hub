import type { LucideIcon } from "lucide-react";
import { AlertTriangle, Inbox } from "lucide-react";
import type { ReactNode } from "react";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";

export function EmptyState({
  icon: Icon = Inbox,
  title,
  description,
  action,
}: {
  icon?: LucideIcon;
  title: string;
  description?: string;
  action?: ReactNode;
}) {
  return (
    <div className="panel flex flex-col items-center justify-center gap-3 px-6 py-16 text-center">
      <div className="flex size-11 items-center justify-center rounded-full bg-secondary">
        <Icon className="size-5 text-muted-foreground" aria-hidden />
      </div>
      <h3 className="text-base font-semibold text-foreground">{title}</h3>
      {description ? (
        <p className="max-w-sm text-sm text-muted-foreground">{description}</p>
      ) : null}
      {action}
    </div>
  );
}

export function ErrorState({
  title = "Something went wrong",
  description = "We couldn't load this data. Try again in a moment.",
  onRetry,
}: {
  title?: string;
  description?: string;
  onRetry?: () => void;
}) {
  return (
    <div className="panel flex flex-col items-center justify-center gap-3 px-6 py-14 text-center">
      <div className="flex size-11 items-center justify-center rounded-full bg-destructive/15">
        <AlertTriangle className="size-5 text-destructive" aria-hidden />
      </div>
      <h3 className="text-base font-semibold text-foreground">{title}</h3>
      <p className="max-w-sm text-sm text-muted-foreground">{description}</p>
      {onRetry ? (
        <Button variant="outline" size="sm" onClick={onRetry}>
          Try again
        </Button>
      ) : null}
    </div>
  );
}

export function CardsSkeleton({ count = 4, className }: { count?: number; className?: string }) {
  return (
    <div className={cn("grid gap-4 sm:grid-cols-2 xl:grid-cols-4", className)}>
      {Array.from({ length: count }).map((_, i) => (
        <Skeleton key={i} className="h-[118px] rounded-xl" />
      ))}
    </div>
  );
}

export function TableSkeleton({ rows = 6 }: { rows?: number }) {
  return (
    <div className="panel divide-y divide-border overflow-hidden">
      {Array.from({ length: rows }).map((_, i) => (
        <div key={i} className="flex items-center gap-4 p-4">
          <Skeleton className="size-9 rounded-full" />
          <Skeleton className="h-4 w-40" />
          <Skeleton className="ml-auto h-4 w-24" />
          <Skeleton className="h-4 w-16" />
        </div>
      ))}
    </div>
  );
}

export function ChartSkeleton({ className }: { className?: string }) {
  return <Skeleton className={cn("h-[300px] rounded-xl", className)} />;
}
