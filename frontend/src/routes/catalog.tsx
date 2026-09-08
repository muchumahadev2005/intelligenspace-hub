import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { Package, Plus, Search, MoreHorizontal, Trash2, CheckCircle2 } from "lucide-react";
import { toast } from "sonner";
import { AppShell } from "@/components/layout/app-shell";
import { PageHeader } from "@/components/shared/page-header";
import { EmptyState, ErrorState, TableSkeleton } from "@/components/shared/states";
import { StatusBadge } from "@/components/shared/status-badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useCatalog } from "@/hooks/use-platform";
import { api } from "@/services/api";
import { money, num } from "@/lib/format";
import type { Product } from "@/types";

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
  const queryClient = useQueryClient();
  const [query, setQuery] = useState("");

  // Create Product Dialog state
  const [openCreate, setOpenCreate] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [name, setName] = useState("");
  const [category, setCategory] = useState("Sweets");
  const [sku, setSku] = useState("");
  const [price, setPrice] = useState("");
  const [stock, setStock] = useState("");
  const [status, setStatus] = useState<Product["status"]>("active");
  const [description, setDescription] = useState("");
  const [agentVisible, setAgentVisible] = useState(true);

  const resetForm = () => {
    setName("");
    setCategory("Sweets");
    setSku("");
    setPrice("");
    setStock("");
    setStatus("active");
    setDescription("");
    setAgentVisible(true);
  };

  const handleCreateProduct = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) {
      toast.error("Product name is required");
      return;
    }

    setIsSubmitting(true);
    try {
      const generatedSku = sku.trim() || `PRD-${Date.now().toString().slice(-5)}`;
      await api.catalog.create({
        name: name.trim(),
        category: category.trim() || "General",
        sku: generatedSku,
        price: Number(price) || 0,
        stock: Number(stock) || 0,
        status,
        description: description.trim(),
        agentVisible,
      });

      await queryClient.invalidateQueries({ queryKey: ["catalog"] });
      toast.success("Product added to catalog!", {
        description: `"${name}" is now stored in PostgreSQL and accessible by AI agents.`,
      });
      setOpenCreate(false);
      resetForm();
    } catch (err: any) {
      toast.error("Failed to add product", {
        description: err.message || "An error occurred while saving the product.",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleToggleVisibility = async (product: Product, visible: boolean) => {
    try {
      await api.catalog.update(product.id, { agentVisible: visible });
      await queryClient.invalidateQueries({ queryKey: ["catalog"] });
      toast.success(visible ? "Product exposed to agents" : "Product hidden from agents");
    } catch (err: any) {
      toast.error("Failed to update visibility", { description: err.message });
    }
  };

  const handleUpdateStatus = async (productId: string, newStatus: Product["status"]) => {
    try {
      await api.catalog.update(productId, { status: newStatus });
      await queryClient.invalidateQueries({ queryKey: ["catalog"] });
      toast.success(`Status updated to ${newStatus}`);
    } catch (err: any) {
      toast.error("Failed to update status", { description: err.message });
    }
  };

  const handleDeleteProduct = async (productId: string, productName: string) => {
    if (!confirm(`Are you sure you want to delete "${productName}" from your catalog?`)) {
      return;
    }
    try {
      await api.catalog.delete(productId);
      await queryClient.invalidateQueries({ queryKey: ["catalog"] });
      toast.success("Product deleted from catalog");
    } catch (err: any) {
      toast.error("Failed to delete product", { description: err.message });
    }
  };

  const products = (data ?? []).filter((p) =>
    `${p.name} ${p.sku} ${p.category}`.toLowerCase().includes(query.toLowerCase()),
  );

  return (
    <AppShell>
      <PageHeader
        eyebrow="Business"
        title="Catalog"
        description="What your agents can sell, quote and reference on a call or chat."
        actions={
          <Dialog open={openCreate} onOpenChange={setOpenCreate}>
            <DialogTrigger asChild>
              <Button className="gap-2">
                <Plus className="size-4" /> Add product
              </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-lg">
              <form onSubmit={handleCreateProduct}>
                <DialogHeader>
                  <DialogTitle>Add New Product</DialogTitle>
                  <DialogDescription>
                    Add items to your catalog. AI agents use this information to quote prices, take orders, and check stock.
                  </DialogDescription>
                </DialogHeader>

                <div className="grid gap-4 py-4">
                  {/* Name */}
                  <div className="space-y-1.5">
                    <Label htmlFor="prodName">Product Name *</Label>
                    <Input
                      id="prodName"
                      placeholder="e.g. Royal Motichoor Laddu (500g)"
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      required
                    />
                  </div>

                  {/* Category and SKU */}
                  <div className="grid grid-cols-2 gap-3">
                    <div className="space-y-1.5">
                      <Label htmlFor="prodCategory">Category</Label>
                      <Select value={category} onValueChange={setCategory}>
                        <SelectTrigger id="prodCategory">
                          <SelectValue placeholder="Category" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="Sweets">Sweets</SelectItem>
                          <SelectItem value="Mains">Mains</SelectItem>
                          <SelectItem value="Starters">Starters</SelectItem>
                          <SelectItem value="Beverages">Beverages</SelectItem>
                          <SelectItem value="Desserts">Desserts</SelectItem>
                          <SelectItem value="Bundles">Bundles</SelectItem>
                          <SelectItem value="General">General</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>

                    <div className="space-y-1.5">
                      <Label htmlFor="prodSku">SKU / Code</Label>
                      <Input
                        id="prodSku"
                        placeholder="e.g. SR-SWT-001"
                        value={sku}
                        onChange={(e) => setSku(e.target.value)}
                      />
                    </div>
                  </div>

                  {/* Price and Stock */}
                  <div className="grid grid-cols-2 gap-3">
                    <div className="space-y-1.5">
                      <Label htmlFor="prodPrice">Price (₹) *</Label>
                      <Input
                        id="prodPrice"
                        type="number"
                        min="0"
                        step="0.01"
                        placeholder="480.00"
                        value={price}
                        onChange={(e) => setPrice(e.target.value)}
                        required
                      />
                    </div>

                    <div className="space-y-1.5">
                      <Label htmlFor="prodStock">Stock Units</Label>
                      <Input
                        id="prodStock"
                        type="number"
                        min="0"
                        placeholder="100"
                        value={stock}
                        onChange={(e) => setStock(e.target.value)}
                      />
                    </div>
                  </div>

                  {/* Status */}
                  <div className="space-y-1.5">
                    <Label htmlFor="prodStatus">Status</Label>
                    <Select value={status} onValueChange={(val) => setStatus(val as Product["status"])}>
                      <SelectTrigger id="prodStatus">
                        <SelectValue placeholder="Status" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="active">Active (Available)</SelectItem>
                        <SelectItem value="out_of_stock">Out of Stock</SelectItem>
                        <SelectItem value="hidden">Hidden</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  {/* Description */}
                  <div className="space-y-1.5">
                    <Label htmlFor="prodDesc">Description</Label>
                    <Textarea
                      id="prodDesc"
                      rows={3}
                      placeholder="Ingredients, special preparation notes, or details for the AI agent to explain to customers."
                      value={description}
                      onChange={(e) => setDescription(e.target.value)}
                    />
                  </div>

                  {/* Agent Visible Toggle */}
                  <div className="flex items-center justify-between rounded-lg border border-border/60 bg-muted/30 p-3">
                    <div className="space-y-0.5">
                      <Label className="text-sm font-medium">Visible to AI Agents</Label>
                      <p className="text-xs text-muted-foreground">
                        Allow agents to recommend, quote and sell this product in conversations.
                      </p>
                    </div>
                    <Switch
                      checked={agentVisible}
                      onCheckedChange={setAgentVisible}
                    />
                  </div>
                </div>

                <DialogFooter>
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => setOpenCreate(false)}
                    disabled={isSubmitting}
                  >
                    Cancel
                  </Button>
                  <Button type="submit" disabled={isSubmitting}>
                    {isSubmitting ? "Saving..." : "Save Product"}
                  </Button>
                </DialogFooter>
              </form>
            </DialogContent>
          </Dialog>
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
        <EmptyState
          icon={Package}
          title="No products found"
          description="Add products to your catalog so agents can quote and sell them."
          action={
            <Button size="sm" onClick={() => setOpenCreate(true)}>
              <Plus className="size-4" /> Add product
            </Button>
          }
        />
      ) : (
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {products.map((p) => (
            <div key={p.id} className="panel flex flex-col gap-3 p-5 relative group transition-colors hover:border-primary/40">
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0 pr-2">
                  <p className="truncate text-sm font-semibold text-foreground">{p.name}</p>
                  <p className="text-xs text-muted-foreground">{p.sku} · {p.category}</p>
                </div>
                <div className="flex items-center gap-1.5 shrink-0">
                  <StatusBadge status={p.status} />
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="ghost" size="icon" className="size-7 text-muted-foreground hover:text-foreground">
                        <MoreHorizontal className="size-4" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DropdownMenuItem onClick={() => handleUpdateStatus(p.id, "active")}>
                        <CheckCircle2 className="size-3.5 mr-2 text-emerald-500" /> Mark Active
                      </DropdownMenuItem>
                      <DropdownMenuItem onClick={() => handleUpdateStatus(p.id, "out_of_stock")}>
                        Mark Out of Stock
                      </DropdownMenuItem>
                      <DropdownMenuItem onClick={() => handleUpdateStatus(p.id, "hidden")}>
                        Mark Hidden
                      </DropdownMenuItem>
                      <DropdownMenuSeparator />
                      <DropdownMenuItem
                        className="text-destructive focus:text-destructive"
                        onClick={() => handleDeleteProduct(p.id, p.name)}
                      >
                        <Trash2 className="size-3.5 mr-2" /> Delete Product
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>
              </div>

              <p className="line-clamp-2 text-sm text-muted-foreground">{p.description || "No description provided."}</p>

              <div className="flex items-baseline justify-between pt-1">
                <span className="text-lg font-semibold text-foreground">{money(p.price)}</span>
                <span className="text-xs text-muted-foreground">{num(p.stock)} in stock</span>
              </div>

              <label className="mt-auto flex items-center justify-between gap-3 rounded-md bg-secondary/50 px-3 py-2 text-xs cursor-pointer select-none">
                <span>Visible to agents</span>
                <Switch
                  checked={p.agentVisible}
                  onCheckedChange={(v) => handleToggleVisibility(p, v)}
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
