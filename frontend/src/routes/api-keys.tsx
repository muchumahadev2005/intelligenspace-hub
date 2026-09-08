import { useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { useQueryClient } from "@tanstack/react-query";
import { Check, Copy, KeyRound, MoreHorizontal, Plus, ShieldCheck, Trash2, AlertCircle } from "lucide-react";
import { toast } from "sonner";
import { AppShell } from "@/components/layout/app-shell";
import { PageHeader } from "@/components/shared/page-header";
import { EmptyState, ErrorState, TableSkeleton } from "@/components/shared/states";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useApiKeys } from "@/hooks/use-platform";
import { api } from "@/services/api";
import { dateTime, num, relative } from "@/lib/format";

export const Route = createFileRoute("/api-keys")({
  head: () => ({
    meta: [
      { title: "API keys — AI Platform" },
      {
        name: "description",
        content: "API keys, REST endpoints and usage limits for building on the AI Platform voice agent API.",
      },
      { property: "og:title", content: "API keys — AI Platform" },
      { property: "og:description", content: "Manage API keys and explore the voice agent REST API." },
    ],
  }),
  component: DeveloperPage,
});

const endpoints = [
  { method: "GET", path: "/v1/agents", desc: "List every agent in the workspace." },
  { method: "POST", path: "/v1/agents", desc: "Create a new voice agent." },
  { method: "POST", path: "/v1/agents/:id/chat", desc: "Send a message to an agent and get AI reply." },
  { method: "POST", path: "/v1/calls", desc: "Place an outbound call with an agent." },
  { method: "GET", path: "/v1/calls/{id}", desc: "Fetch a call with transcript and summary." },
  { method: "GET", path: "/v1/appointments", desc: "List appointments booked by agents." },
  { method: "POST", path: "/v1/appointments", desc: "Create a new scheduled appointment." },
  { method: "GET", path: "/v1/orders", desc: "List orders captured by agents." },
  { method: "POST", path: "/v1/webhooks", desc: "Register a signed webhook endpoint." },
];

function DeveloperPage() {
  const queryClient = useQueryClient();
  const { data, isLoading, isError, refetch } = useApiKeys();
  const keys = data ?? [];

  // Create Key Modal State
  const [createOpen, setCreateOpen] = useState(false);
  const [keyName, setKeyName] = useState("");
  const [keyScope, setKeyScope] = useState<"full" | "read">("full");
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Secret Revelation Modal State
  const [revealedKey, setRevealedKey] = useState<{ name: string; secret: string } | null>(null);
  const [hasCopied, setHasCopied] = useState(false);

  // Delete State
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!keyName.trim()) return;

    setIsSubmitting(true);
    try {
      const created = await api.developer.createKey(keyName.trim(), keyScope);
      await queryClient.invalidateQueries({ queryKey: ["api-keys"] });
      setCreateOpen(false);
      setKeyName("");
      setKeyScope("full");
      setRevealedKey({ name: created.name, secret: created.secret });
      toast.success("API key created successfully");
    } catch (err) {
      toast.error("Failed to create API key");
      console.error(err);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDelete = async (id: string) => {
    setDeletingId(id);
    try {
      await api.developer.deleteKey(id);
      await queryClient.invalidateQueries({ queryKey: ["api-keys"] });
      toast.success("API key revoked");
    } catch (err) {
      toast.error("Failed to revoke API key");
      console.error(err);
    } finally {
      setDeletingId(null);
    }
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard?.writeText(text);
    setHasCopied(true);
    toast.success("Copied to clipboard");
    setTimeout(() => setHasCopied(false), 2500);
  };

  return (
    <AppShell>
      <PageHeader
        eyebrow="Platform"
        title="API keys"
        description="Keys, endpoints and quotas for the AI Platform API."
        actions={
          <Button onClick={() => setCreateOpen(true)} className="gap-2">
            <Plus className="h-4 w-4" /> Create key
          </Button>
        }
      />

      {/* Tabs */}
      <Tabs defaultValue="keys" className="mt-6">
        <TabsList>
          <TabsTrigger value="keys">API keys</TabsTrigger>
          <TabsTrigger value="docs">Reference</TabsTrigger>
        </TabsList>

        <TabsContent value="keys" className="mt-6">
          {isLoading ? (
            <TableSkeleton rows={4} />
          ) : isError ? (
            <ErrorState onRetry={() => refetch()} />
          ) : keys.length === 0 ? (
            <EmptyState
              icon={KeyRound}
              title="No API keys"
              description="Create an API key to start connecting your website or external apps."
              action={
                <Button onClick={() => setCreateOpen(true)} className="mt-4 gap-2">
                  <Plus className="h-4 w-4" /> Create key
                </Button>
              }
            />
          ) : (
            <div className="panel overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="border-b border-border text-left text-xs text-muted-foreground">
                  <tr>
                    <th className="p-4 font-medium">Name</th>
                    <th className="p-4 font-medium">Key</th>
                    <th className="p-4 font-medium">Scope</th>
                    <th className="p-4 font-medium">Requests (30d)</th>
                    <th className="p-4 font-medium">Last used</th>
                    <th className="p-4 font-medium">Created</th>
                    <th className="p-4 font-medium text-right">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {keys.map((k) => (
                    <tr key={k.id} className="border-b border-border/60 transition-colors hover:bg-muted/30 last:border-0">
                      <td className="p-4 font-medium text-foreground">{k.name}</td>
                      <td className="p-4 font-mono text-xs text-muted-foreground">
                        <div className="flex items-center gap-2">
                          <span>{k.maskedKey}</span>
                          <button
                            onClick={() => copyToClipboard(k.maskedKey)}
                            title="Copy masked key"
                            className="text-muted-foreground/60 transition-colors hover:text-foreground"
                          >
                            <Copy className="h-3.5 w-3.5" />
                          </button>
                        </div>
                      </td>
                      <td className="p-4">
                        <Badge variant={k.permission === "full" ? "default" : "secondary"}>
                          {k.permission === "full" ? "Full access" : "Read only"}
                        </Badge>
                      </td>
                      <td className="p-4 tabular-nums text-foreground">{num(k.requests30d)}</td>
                      <td className="p-4 text-muted-foreground">
                        {k.lastUsedAt ? relative(k.lastUsedAt) : "Never"}
                      </td>
                      <td className="p-4 text-muted-foreground">{dateTime(k.createdAt)}</td>
                      <td className="p-4 text-right">
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground">
                              <MoreHorizontal className="h-4 w-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end" className="w-44">
                            <DropdownMenuItem onClick={() => copyToClipboard(k.maskedKey)} className="gap-2 text-xs">
                              <Copy className="h-3.5 w-3.5" /> Copy key prefix
                            </DropdownMenuItem>
                            <DropdownMenuSeparator />
                            <DropdownMenuItem
                              onClick={() => handleDelete(k.id)}
                              disabled={deletingId === k.id}
                              className="gap-2 text-xs text-red-500 focus:text-red-500"
                            >
                              <Trash2 className="h-3.5 w-3.5" />
                              {deletingId === k.id ? "Revoking..." : "Revoke key"}
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </TabsContent>

        <TabsContent value="docs" className="mt-6 space-y-4">
          <div className="panel p-6">
            <p className="text-eyebrow mb-2">Authentication</p>
            <p className="mb-4 text-xs text-muted-foreground">
              Pass your API key as a Bearer token in the <code>Authorization</code> header of every request.
            </p>
            <pre className="overflow-x-auto rounded-md bg-muted/70 p-4 font-mono text-xs text-foreground">
{`curl http://localhost:3001/api/v1/agents \\
  -H "Authorization: Bearer sk_live_..." \\
  -H "Content-Type: application/json"`}
            </pre>
          </div>

          <div className="panel divide-y divide-border">
            {endpoints.map((e) => (
              <div key={e.path + e.method} className="flex flex-wrap items-center gap-3 p-4">
                <Badge variant="secondary" className="font-mono">{e.method}</Badge>
                <code className="font-mono text-sm">{e.path}</code>
                <span className="text-xs text-muted-foreground">{e.desc}</span>
              </div>
            ))}
          </div>
        </TabsContent>
      </Tabs>

      {/* ── Modal: Create API Key ────────────────────────────────────────── */}
      <Dialog open={createOpen} onOpenChange={setCreateOpen}>
        <DialogContent className="sm:max-w-[480px] p-6 sm:p-7 gap-5">
          <form onSubmit={handleCreate}>
            <DialogHeader className="space-y-2 text-left">
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary border border-primary/20">
                  <KeyRound className="h-5 w-5" />
                </div>
                <div>
                  <DialogTitle className="text-base font-semibold text-foreground">
                    Create new API key
                  </DialogTitle>
                  <DialogDescription className="text-xs text-muted-foreground mt-0.5">
                    Generate a secret key to securely connect external websites or apps.
                  </DialogDescription>
                </div>
              </div>
            </DialogHeader>

            <div className="grid gap-4 py-4">
              <div className="space-y-1.5">
                <Label htmlFor="key-name" className="text-xs font-medium text-foreground">
                  Key Name
                </Label>
                <Input
                  id="key-name"
                  placeholder="e.g. Laddu Store Website, Production Server"
                  value={keyName}
                  onChange={(e) => setKeyName(e.target.value)}
                  className="h-10 rounded-lg bg-muted/40 border-border/70 focus-visible:ring-primary/40 text-sm"
                  autoFocus
                  required
                />
                <p className="text-[11px] text-muted-foreground">
                  A recognizable label indicating where this key is being used.
                </p>
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="key-scope" className="text-xs font-medium text-foreground">
                  Access Scope
                </Label>
                <Select value={keyScope} onValueChange={(val) => setKeyScope(val as "full" | "read")}>
                  <SelectTrigger id="key-scope" className="h-10 rounded-lg bg-muted/40 border-border/70 text-sm">
                    <SelectValue placeholder="Select scope" />
                  </SelectTrigger>
                  <SelectContent className="rounded-xl border-border/80 shadow-xl bg-card">
                    <SelectItem value="full" className="py-2 cursor-pointer">
                      <div className="flex flex-col text-left">
                        <span className="font-medium text-xs text-foreground">Full Access (Read & Write)</span>
                        <span className="text-[11px] text-muted-foreground">Talk to agents, schedule appointments, and manage orders</span>
                      </div>
                    </SelectItem>
                    <SelectItem value="read" className="py-2 cursor-pointer">
                      <div className="flex flex-col text-left">
                        <span className="font-medium text-xs text-foreground">Read Only</span>
                        <span className="text-[11px] text-muted-foreground">Query analytics, call logs, and platform metrics only</span>
                      </div>
                    </SelectItem>
                  </SelectContent>
                </Select>
                <p className="text-[11px] text-muted-foreground">
                  {keyScope === "full"
                    ? "Allows external code to make AI calls, book appointments, and capture orders."
                    : "Allows external code to read dashboard metrics and stats only."}
                </p>
              </div>
            </div>

            <DialogFooter className="gap-2 pt-3 border-t border-border/40">
              <Button
                type="button"
                variant="outline"
                className="h-9 px-4 rounded-lg text-xs"
                onClick={() => setCreateOpen(false)}
                disabled={isSubmitting}
              >
                Cancel
              </Button>
              <Button
                type="submit"
                className="h-9 px-5 rounded-lg text-xs font-medium bg-primary text-primary-foreground hover:bg-primary/90 shadow-sm"
                disabled={!keyName.trim() || isSubmitting}
              >
                {isSubmitting ? "Generating..." : "Create key"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* ── Modal: Secret Revealed (Show once) ───────────────────────────── */}
      <Dialog open={Boolean(revealedKey)} onOpenChange={(open) => !open && setRevealedKey(null)}>
        <DialogContent className="sm:max-w-[500px] p-6 sm:p-7 gap-5">
          <DialogHeader className="space-y-2 text-left">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-green-500/10 text-green-400 border border-green-500/20">
                <ShieldCheck className="h-5 w-5" />
              </div>
              <div>
                <DialogTitle className="text-base font-semibold text-foreground">
                  Save your secret API key
                </DialogTitle>
                <DialogDescription className="text-xs text-muted-foreground mt-0.5">
                  This key will <strong>never be shown again</strong>. Copy it now.
                </DialogDescription>
              </div>
            </div>
          </DialogHeader>

          <div className="space-y-4 py-2">
            <div className="rounded-xl border border-amber-500/30 bg-amber-500/10 p-3.5 text-xs text-amber-200 flex items-start gap-2.5 leading-relaxed">
              <AlertCircle className="h-4 w-4 text-amber-400 mt-0.5 shrink-0" />
              <span>
                Do not expose this secret key in client-side HTML or public Git repositories. Keep it safe in your server environment variables (<code className="font-mono text-[11px] text-amber-300">.env</code>).
              </span>
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs text-muted-foreground">Generated Key for &quot;{revealedKey?.name}&quot;</Label>
              <div className="flex items-center gap-2 rounded-xl border border-border/80 bg-muted/60 p-2.5 shadow-inner">
                <code className="flex-1 font-mono text-xs break-all select-all text-primary font-medium pl-1">
                  {revealedKey?.secret}
                </code>
                <Button
                  size="sm"
                  variant="secondary"
                  onClick={() => revealedKey && copyToClipboard(revealedKey.secret)}
                  className="shrink-0 h-8 px-3 rounded-lg gap-1.5 text-xs font-medium"
                >
                  {hasCopied ? <Check className="h-3.5 w-3.5 text-green-400" /> : <Copy className="h-3.5 w-3.5" />}
                  {hasCopied ? "Copied" : "Copy"}
                </Button>
              </div>
            </div>
          </div>

          <DialogFooter className="pt-2 border-t border-border/40">
            <Button
              className="h-9 px-5 rounded-lg text-xs font-medium"
              onClick={() => {
                setRevealedKey(null);
                setHasCopied(false);
              }}
            >
              Done
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </AppShell>
  );
}
