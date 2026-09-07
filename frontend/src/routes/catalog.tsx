import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { Package, Plus, Search } from "lucide-react";
import { toast } from "sonner";
import { AppShell } from "@/components/layout/app-shell";
import { PageHeader } from "@/components/shared/page-header";
import { EmptyState, ErrorState, TableSkeleton } from "@/components/shared/states";
import { StatusBadge } from "@/components/shared/status-badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { useCatalog } from "@/hooks/use-platform";
import { money, num } from "@/lib/format";

export const Route = createFileRoute("/catalog")({
  head: () => ({
    meta: [
      { title: "Catalog — AI Platform" },
      { name: "description", content: "Products and services your AI agents can quote, upsell and order during conversations." },
      { property: "og:title", content: "Catalog — AI Platform" },
      { property: "og:description", content: "Manage the product catalog available to your AI agents." },
    ],
  }),
  component: CatalogPage,
});

function CatalogPage() {
  const { data, isLoading, isError, refetch } = useCatalog();
  const [query, setQuery] = useState("");

  const products = (data ?? []).filter((p) =>
    `${p.name} ${p.sku} ${p.category}`.toLowerCase().includes(query.toLowerCase()),
  );

  return (
    <AppShell>
      <PageHeader
        eyebrow="Business"
        title="Catalog"
        description="What your agents can sell, quote and reference on a call."
        actions={
          <Button onClick={() => toast.success("Product added", { description: "Visible to agents immediately." })}>
            <Plus /> Add product
          </Button>
        }
      />

      <div className="relative max-w-md">
        <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          className="pl-9"
          placeholder="Search products…"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          aria-label="Search catalog"
        />
      </div>

      {isLoading ? (
        <TableSkeleton rows={6} />
      ) : isError ? (
        <ErrorState onRetry={() => refetch()} />
      ) : products.length === 0 ? (
        <EmptyState icon={Package} title="No products" description="Add products so agents can quote them." />
      ) : (
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {products.map((p) => (
            <div key={p.id} className="panel flex flex-col gap-3 p-5">
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <p className="truncate text-sm font-semibold">{p.name}</p>
                  <p className="text-xs text-muted-foreground">{p.sku} · {p.category}</p>
                </div>
                <StatusBadge status={p.status} />
              </div>
              <p className="line-clamp-2 text-sm text-muted-foreground">{p.description}</p>
              <div className="flex items-baseline justify-between">
                <span className="text-lg font-semibold">{money(p.price)}</span>
                <span className="text-xs text-muted-foreground">{num(p.stock)} in stock</span>
              </div>
              <label className="mt-auto flex items-center justify-between gap-3 rounded-md bg-secondary/50 px-3 py-2 text-xs">
                <span>Visible to agents</span>
                <Switch
                  defaultChecked={p.agentVisible}
                  onCheckedChange={(v) => toast.success(v ? "Product exposed to agents" : "Product hidden from agents")}
                  aria-label={`Toggle agent visibility for ${p.name}`}
                />
              </label>
            </div>
          ))}
        </div>
      )}
    </AppShell>
  );
}
