import type { LucideIcon } from "lucide-react";
import { ArrowDownRight, ArrowUpRight } from "lucide-react";
import { cn } from "@/lib/utils";

export function StatCard({
  label,
  value,
  delta,
  note,
  icon: Icon,
  className,
}: {
  label: string;
  value: string | number;
  delta?: string;
  note?: string;
  icon?: LucideIcon;
  className?: string;
}) {
  const negative = delta?.trim().startsWith("-");
  return (
    <div className={cn("panel rise-in p-5", className)}>
      <div className="flex items-start justify-between gap-3">
        <p className="text-eyebrow">{label}</p>
        {Icon ? <Icon className="size-4 text-muted-foreground" aria-hidden /> : null}
      </div>
      <p className="mt-3 text-3xl font-semibold tracking-tight tabular-nums text-foreground">
        {value}
      </p>
      <div className="mt-2 flex items-center gap-2 text-xs">
        {delta ? (
          <span
            className={cn(
              "inline-flex items-center gap-1 rounded-full px-2 py-0.5 font-medium",
              negative
                ? "bg-destructive/15 text-destructive"
                : "bg-success/15 text-success",
            )}
          >
            {negative ? (
              <ArrowDownRight className="size-3" aria-hidden />
            ) : (
              <ArrowUpRight className="size-3" aria-hidden />
            )}
            {delta}
          </span>
        ) : null}
        {note ? <span className="text-muted-foreground">{note}</span> : null}
      </div>
    </div>
  );
}
