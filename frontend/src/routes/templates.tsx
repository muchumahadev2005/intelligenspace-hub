import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import {
  Search,
  Sparkles,
  ArrowRight,
  Eye,
  Copy,
  Check,
  Bot,
  MessageSquareQuote,
  Wrench,
  Flame,
} from "lucide-react";
import { toast } from "sonner";
import { AppShell } from "@/components/layout/app-shell";
import { PageHeader } from "@/components/shared/page-header";
import { CardsSkeleton, EmptyState, ErrorState } from "@/components/shared/states";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { useTemplates } from "@/hooks/use-platform";
import { cn } from "@/lib/utils";
import type { AgentTemplate } from "@/types";

export const Route = createFileRoute("/templates")({
  head: () => ({
    meta: [
      { title: "Agent templates — AI Platform" },
      { name: "description", content: "Launch pre-built AI agents for healthcare, retail, real estate, restaurants and more." },
      { property: "og:title", content: "Agent templates — AI Platform" },
      { property: "og:description", content: "Industry-ready agent blueprints you can deploy in minutes." },
    ],
  }),
  component: TemplatesPage,
});

function TemplatesPage() {
  const { data, isLoading, isError, refetch } = useTemplates();
  const navigate = useNavigate();
  const [query, setQuery] = useState("");
  const [category, setCategory] = useState("All");
  const [selectedBlueprint, setSelectedBlueprint] = useState<AgentTemplate | null>(null);
  const [copied, setCopied] = useState(false);

  const categories = useMemo(() => {
    const rawCategories = (data ?? []).map((t) => t.category).filter(Boolean);
    return ["All", ...Array.from(new Set(rawCategories))];
  }, [data]);

  const templates = (data ?? []).filter(
    (t) =>
      (category === "All" || t.category === category) &&
      `${t.name} ${t.description} ${t.useCase} ${t.category} ${t.instructions || ""}`
        .toLowerCase()
        .includes(query.toLowerCase()),
  );

  const handleCopyInstructions = (instructions?: string) => {
    if (!instructions) return;
    navigator.clipboard.writeText(instructions);
    setCopied(true);
    toast.success("Prompt instructions copied to clipboard");
    setTimeout(() => setCopied(false), 2000);
  };

  const handleUseTemplate = (t: AgentTemplate) => {
    toast.success(`Loaded “${t.name}”`, {
      description: "Prefilled the wizard with prompt, tone, and tools.",
    });
    void navigate({
      to: "/agents/new",
      search: { templateId: t.id } as any,
    });
  };

  return (
    <AppShell>
      <PageHeader
        eyebrow="Templates"
        title="Start from a blueprint"
        description="Battle-tested agent configurations tuned for specific industries, voice personas, and real workflows."
      />

      <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
        {/* Category Filters */}
        <div className="flex flex-wrap gap-2">
          {categories.map((c) => {
            const count =
              c === "All"
                ? data?.length ?? 0
                : (data ?? []).filter((t) => t.category === c).length;
            return (
              <button
                key={c}
                onClick={() => setCategory(c)}
                className={cn(
                  "flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-xs transition-colors",
                  category === c
                    ? "border-primary/50 bg-primary/15 text-primary font-medium"
                    : "border-border/70 text-muted-foreground hover:border-border hover:text-foreground",
                )}
              >
                <span>{c}</span>
                <span className="rounded-full bg-secondary/80 px-1.5 py-0.2 text-[10px] text-muted-foreground">
                  {count}
                </span>
              </button>
            );
          })}
        </div>

        {/* Search */}
        <div className="relative lg:w-72">
          <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            className="pl-9"
            placeholder="Search blueprints & workflows…"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            aria-label="Search templates"
          />
        </div>
      </div>

      {isLoading ? (
        <CardsSkeleton count={6} className="xl:grid-cols-3" />
      ) : isError ? (
        <ErrorState onRetry={() => refetch()} />
      ) : templates.length === 0 ? (
        <EmptyState
          icon={Sparkles}
          title="No templates match"
          description="Try a different category filter or search query."
        />
      ) : (
        <div className="grid gap-5 md:grid-cols-2 xl:grid-cols-3">
          {templates.map((t) => (
            <article
              key={t.id}
              className="panel flex flex-col justify-between p-5 border border-border/60 hover:border-primary/40 transition-all hover:shadow-md"
            >
              <div className="space-y-3">
                {/* Header: Icon, Category & Popularity */}
                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-center gap-2.5">
                    <span className="text-3xl" aria-hidden>
                      {t.icon}
                    </span>
                    <div>
                      <Badge variant="secondary" className="text-[11px] font-medium">
                        {t.category}
                      </Badge>
                    </div>
                  </div>
                  <div className="flex items-center gap-1 text-[11px] font-medium text-amber-500 bg-amber-500/10 px-2 py-0.5 rounded-full">
                    <Flame className="size-3" />
                    <span>{t.popularity}% adoption</span>
                  </div>
                </div>

                {/* Title & Description */}
                <div>
                  <h2 className="text-base font-semibold text-foreground leading-snug">
                    {t.name}
                  </h2>
                  <p className="mt-1 text-xs text-muted-foreground leading-relaxed">
                    {t.description}
                  </p>
                </div>

                {/* Use Case */}
                <div className="rounded-md bg-secondary/50 p-2 text-[11px] text-muted-foreground">
                  <span className="font-semibold text-foreground/80 mr-1">Use case:</span>
                  {t.useCase}
                </div>

                {/* Greeting Preview Quote */}
                {t.greeting && (
                  <div className="rounded-lg border border-border/40 bg-card/60 p-2.5 text-xs text-muted-foreground italic flex items-start gap-2">
                    <MessageSquareQuote className="size-4 shrink-0 text-primary/70 mt-0.5" />
                    <p className="line-clamp-2">"{t.greeting}"</p>
                  </div>
                )}

                {/* Tone & Personality */}
                {t.tone && (
                  <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                    <Bot className="size-3.5 text-primary" />
                    <span className="font-medium text-foreground text-[11px]">Tone:</span>
                    <span className="text-[11px] truncate">{t.tone}</span>
                  </div>
                )}

                {/* Tools / Capabilities */}
                {t.tools && t.tools.length > 0 && (
                  <div className="flex flex-wrap gap-1 pt-1">
                    {t.tools.map((tool, idx) => (
                      <span
                        key={idx}
                        className="inline-flex items-center gap-1 rounded-md bg-secondary/70 px-2 py-0.5 text-[10px] text-muted-foreground font-medium"
                      >
                        <Wrench className="size-2.5" />
                        {tool}
                      </span>
                    ))}
                  </div>
                )}
              </div>

              {/* Action Buttons */}
              <div className="mt-5 flex items-center justify-between gap-2 border-t border-border/60 pt-3">
                <Button
                  size="sm"
                  variant="ghost"
                  className="gap-1.5 text-xs text-muted-foreground hover:text-foreground"
                  onClick={() => setSelectedBlueprint(t)}
                >
                  <Eye className="size-3.5" /> View Details
                </Button>
                <Button
                  size="sm"
                  className="gap-1.5 text-xs font-medium"
                  onClick={() => handleUseTemplate(t)}
                >
                  Use template <ArrowRight className="size-3.5" />
                </Button>
              </div>
            </article>
          ))}
        </div>
      )}

      {/* Blueprint Inspection Dialog */}
      <Dialog
        open={Boolean(selectedBlueprint)}
        onOpenChange={(open) => !open && setSelectedBlueprint(null)}
      >
        <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto">
          {selectedBlueprint && (
            <>
              <DialogHeader>
                <div className="flex items-center gap-2.5">
                  <span className="text-3xl">{selectedBlueprint.icon}</span>
                  <div>
                    <DialogTitle className="text-lg font-bold">
                      {selectedBlueprint.name}
                    </DialogTitle>
                    <DialogDescription className="text-xs text-muted-foreground">
                      {selectedBlueprint.category} · {selectedBlueprint.useCase}
                    </DialogDescription>
                  </div>
                </div>
              </DialogHeader>

              <div className="space-y-4 pt-3 text-xs">
                {/* Persona & Tone */}
                <div className="grid grid-cols-2 gap-3">
                  <div className="rounded-lg border border-border/60 p-3 bg-secondary/20">
                    <p className="font-semibold text-foreground text-[11px] mb-1">
                      Voice Persona & Tone
                    </p>
                    <p className="text-muted-foreground">{selectedBlueprint.tone || "Professional"}</p>
                  </div>
                  <div className="rounded-lg border border-border/60 p-3 bg-secondary/20">
                    <p className="font-semibold text-foreground text-[11px] mb-1">
                      Default AI Model
                    </p>
                    <p className="text-muted-foreground">{selectedBlueprint.model || "openai/gpt-4o-mini"}</p>
                  </div>
                </div>

                {/* Spoken Greeting */}
                <div>
                  <p className="font-semibold text-foreground text-[11px] mb-1.5">
                    Initial Voice Greeting
                  </p>
                  <div className="rounded-lg border border-primary/20 bg-primary/5 p-3 text-foreground italic">
                    "{selectedBlueprint.greeting}"
                  </div>
                </div>

                {/* Enabled Tools */}
                {selectedBlueprint.tools && selectedBlueprint.tools.length > 0 && (
                  <div>
                    <p className="font-semibold text-foreground text-[11px] mb-1.5">
                      Included Capabilities & Tools
                    </p>
                    <div className="flex flex-wrap gap-1.5">
                      {selectedBlueprint.tools.map((tool, idx) => (
                        <Badge key={idx} variant="secondary" className="gap-1 text-xs">
                          <Wrench className="size-3" /> {tool}
                        </Badge>
                      ))}
                    </div>
                  </div>
                )}

                {/* Full Prompt Instructions */}
                <div>
                  <div className="flex items-center justify-between mb-1.5">
                    <p className="font-semibold text-foreground text-[11px]">
                      System Prompt Instructions
                    </p>
                    <Button
                      size="sm"
                      variant="ghost"
                      className="h-7 text-[11px] gap-1 px-2"
                      onClick={() => handleCopyInstructions(selectedBlueprint.instructions)}
                    >
                      {copied ? <Check className="size-3 text-green-500" /> : <Copy className="size-3" />}
                      {copied ? "Copied" : "Copy prompt"}
                    </Button>
                  </div>
                  <pre className="rounded-lg border border-border/60 bg-muted/50 p-3.5 text-[11px] leading-relaxed text-muted-foreground font-mono whitespace-pre-wrap max-h-60 overflow-y-auto">
                    {selectedBlueprint.instructions || "No system instructions configured."}
                  </pre>
                </div>
              </div>

              <div className="flex items-center justify-end gap-2 pt-4 border-t border-border/60">
                <Button variant="outline" size="sm" onClick={() => setSelectedBlueprint(null)}>
                  Close
                </Button>
                <Button
                  size="sm"
                  className="gap-1.5"
                  onClick={() => {
                    const bp = selectedBlueprint;
                    setSelectedBlueprint(null);
                    handleUseTemplate(bp);
                  }}
                >
                  Deploy with this Blueprint <ArrowRight className="size-3.5" />
                </Button>
              </div>
            </>
          )}
        </DialogContent>
      </Dialog>
    </AppShell>
  );
}
