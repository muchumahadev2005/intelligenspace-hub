import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { Search, Sparkles } from "lucide-react";
import { toast } from "sonner";
import { AppShell } from "@/components/layout/app-shell";
import { PageHeader } from "@/components/shared/page-header";
import { CardsSkeleton, EmptyState, ErrorState } from "@/components/shared/states";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useTemplates } from "@/hooks/use-platform";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/templates")({
  head: () => ({
    meta: [
      { title: "Agent templates — AI Platform" },
      { name: "description", content: "Launch pre-built AI agents for healthcare, retail, real estate and more." },
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

  const categories = useMemo(
    () => ["All", ...Array.from(new Set((data ?? []).map((t) => t.category)))],
    [data],
  );

  const templates = (data ?? []).filter(
    (t) =>
      (category === "All" || t.category === category) &&
      `${t.name} ${t.description} ${t.useCase}`.toLowerCase().includes(query.toLowerCase()),
  );

  return (
    <AppShell>
      <PageHeader
        eyebrow="Templates"
        title="Start from a blueprint"
        description="Battle-tested agent configurations tuned for specific industries and workflows."
      />

      <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
        <div className="flex flex-wrap gap-2">
          {categories.map((c) => (
            <button
              key={c}
              onClick={() => setCategory(c)}
              className={cn(
                "rounded-full border px-3 py-1.5 text-xs transition-colors",
                category === c
                  ? "border-primary/50 bg-primary/12 text-primary"
                  : "border-border text-muted-foreground hover:text-foreground",
              )}
            >
              {c}
            </button>
          ))}
        </div>
        <div className="relative lg:w-72">
          <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            className="pl-9"
            placeholder="Search templates…"
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
        <EmptyState icon={Sparkles} title="No templates match" description="Try a different category or search." />
      ) : (
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {templates.map((t) => (
            <article key={t.id} className="panel flex flex-col gap-3 p-5">
              <div className="flex items-start justify-between gap-3">
                <span className="text-2xl" aria-hidden>{t.icon}</span>
                <Badge variant="secondary">{t.category}</Badge>
              </div>
              <div>
                <h2 className="text-sm font-semibold">{t.name}</h2>
                <p className="mt-1 text-sm text-muted-foreground">{t.description}</p>
              </div>
              <p className="text-xs text-muted-foreground">Use case: {t.useCase}</p>
              <div className="mt-auto flex items-center justify-between border-t border-border pt-3">
                <span className="text-xs text-muted-foreground capitalize">
                  {t.type} · {t.popularity}% adoption
                </span>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => {
                    toast.success(`Using “${t.name}”`, { description: "Prefilled the agent wizard." });
                    void navigate({ to: "/agents/new" });
                  }}
                >
                  Use template
                </Button>
              </div>
            </article>
          ))}
        </div>
      )}
    </AppShell>
  );
}
