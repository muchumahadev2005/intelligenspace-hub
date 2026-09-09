import { Cpu, RefreshCw, Sparkles, Zap, AlertTriangle, CheckCircle } from "lucide-react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { useDeveloperModel } from "@/hooks/use-developer-model";
import { cn } from "@/lib/utils";

interface ModelQuotaBarProps {
  className?: string;
  compact?: boolean;
}

export function ModelQuotaBar({ className, compact = false }: ModelQuotaBarProps) {
  const { models, selectedModel, selectedModelId, setSelectedModelId, quota } = useDeveloperModel();

  const usagePercent = Math.min(100, Math.round((quota.runsToday / quota.dailyLimit) * 100));
  const isWarning = quota.remaining <= 5 && !quota.hasReachedLimit;
  const isExceeded = quota.hasReachedLimit;

  return (
    <div
      className={cn(
        "flex flex-wrap items-center justify-between gap-3 rounded-xl border border-border/80 bg-card/60 px-3.5 py-2.5 backdrop-blur-sm shadow-xs",
        isExceeded && "border-destructive/40 bg-destructive/5",
        className,
      )}
    >
      {/* Left: AI Model Selector */}
      <div className="flex items-center gap-2.5 min-w-0">
        <div className="flex size-7 items-center justify-center rounded-lg bg-primary/10 text-primary shrink-0">
          <Cpu className="size-3.5" />
        </div>

        <div className="flex items-center gap-2 min-w-0">
          <span className="text-xs font-medium text-muted-foreground shrink-0 hidden sm:inline">
            Active Model:
          </span>

          <Select value={selectedModelId} onValueChange={setSelectedModelId}>
            <SelectTrigger
              className="h-8 gap-2 border-border/70 bg-background/80 text-xs font-medium max-w-[260px] sm:max-w-[300px]"
              aria-label="Select AI Model for Developer tasks"
            >
              <div className="flex items-center gap-2 min-w-0 truncate">
                <span className="font-semibold text-foreground truncate">{selectedModel.name}</span>
                <Badge variant="outline" className="text-[10px] text-emerald-400 border-emerald-500/40 bg-emerald-500/10 px-1 py-0 h-4 shrink-0">
                  {selectedModel.badge || "Free"}
                </Badge>
              </div>
            </SelectTrigger>
            <SelectContent className="max-h-96 min-w-[340px]">
              <div className="px-2 py-1.5 flex items-center justify-between border-b border-border/50 mb-1">
                <span className="text-[11px] font-semibold text-foreground">
                  Platform AI Models
                </span>
                <Badge variant="outline" className="text-[10px] text-emerald-400 border-emerald-500/40 bg-emerald-500/10">
                  $0.00 Cost
                </Badge>
              </div>
              {models.map((model) => (
                <SelectItem key={model.id} value={model.id} className="py-2 cursor-pointer">
                  <div className="flex flex-col gap-0.5">
                    <div className="flex items-center justify-between gap-2">
                      <span className="font-semibold text-xs text-foreground flex items-center gap-1.5">
                        {model.name}
                        {model.recommended && (
                          <span className="text-[10px] font-normal text-emerald-400 bg-emerald-500/10 px-1 rounded">
                            Recommended
                          </span>
                        )}
                      </span>
                    </div>
                    <span className="text-[11px] text-muted-foreground line-clamp-1">
                      {model.description}
                    </span>
                    <div className="flex items-center gap-2 pt-0.5 text-[10px] text-muted-foreground/80">
                      <span>Speed: {model.speed}</span>
                      {model.badge && (
                        <>
                          <span>•</span>
                          <span className="text-emerald-400 font-medium">{model.badge}</span>
                        </>
                      )}
                    </div>
                  </div>
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Right: Quota & Daily Limit Badge */}
      <TooltipProvider>
        <div className="flex items-center gap-3 shrink-0 ml-auto">
          {/* Progress pill */}
          <Tooltip>
            <TooltipTrigger asChild>
              <div
                className={cn(
                  "flex items-center gap-2 rounded-lg border px-2.5 py-1 text-xs cursor-default transition-colors",
                  isExceeded
                    ? "border-destructive/40 bg-destructive/10 text-destructive"
                    : isWarning
                      ? "border-amber-500/40 bg-amber-500/10 text-amber-400"
                      : "border-border/60 bg-muted/40 text-foreground/80",
                )}
              >
                <Zap
                  className={cn(
                    "size-3.5",
                    isExceeded
                      ? "text-destructive fill-destructive"
                      : isWarning
                        ? "text-amber-400 fill-amber-400"
                        : "text-primary fill-primary",
                  )}
                />
                <span className="font-mono font-medium">
                  {quota.runsToday} / {quota.dailyLimit} runs
                </span>

                {/* Progress micro-bar */}
                <div className="hidden sm:block w-14 h-1.5 rounded-full bg-muted overflow-hidden">
                  <div
                    className={cn(
                      "h-full transition-all duration-300",
                      isExceeded
                        ? "bg-destructive"
                        : isWarning
                          ? "bg-amber-500"
                          : "bg-primary",
                    )}
                    style={{ width: `${usagePercent}%` }}
                  />
                </div>

                <Badge
                  variant={isExceeded ? "destructive" : isWarning ? "outline" : "secondary"}
                  className="text-[10px] px-1.5 py-0 h-4 ml-0.5"
                >
                  {isExceeded ? "Limit Reached" : `${quota.remaining} left`}
                </Badge>
              </div>
            </TooltipTrigger>
            <TooltipContent side="bottom" className="text-xs max-w-xs space-y-1">
              <p className="font-semibold flex items-center gap-1.5">
                {isExceeded ? (
                  <AlertTriangle className="size-3.5 text-destructive" />
                ) : (
                  <Sparkles className="size-3.5 text-primary" />
                )}
                Developer AI Daily Quota
              </p>
              <p className="text-muted-foreground text-[11px]">
                {quota.runsToday} of {quota.dailyLimit} runs used in the last 24 hours.
                {isExceeded
                  ? " All agent runs paused until quota resets."
                  : ` You have ${quota.remaining} runs remaining.`}
              </p>
            </TooltipContent>
          </Tooltip>

          {/* Refresh Quota Button */}
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                variant="ghost"
                size="icon"
                onClick={() => quota.refetch()}
                disabled={quota.isLoading}
                className="size-7 text-muted-foreground hover:text-foreground"
                aria-label="Refresh quota"
              >
                <RefreshCw className={cn("size-3.5", quota.isLoading && "animate-spin")} />
              </Button>
            </TooltipTrigger>
            <TooltipContent side="bottom">Refresh usage count</TooltipContent>
          </Tooltip>
        </div>
      </TooltipProvider>
    </div>
  );
}
