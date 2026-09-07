import { useState } from "react";
import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { Github, Upload } from "lucide-react";
import { toast } from "sonner";
import { AppShell } from "@/components/layout/app-shell";
import { PageHeader } from "@/components/shared/page-header";
import { Panel } from "@/components/developer/ui";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/developer/projects/new")({
  head: () => ({
    meta: [
      { title: "Connect a repository — Developer AI" },
      {
        name: "description",
        content: "Connect a GitHub, GitLab or uploaded codebase to the Developer AI workspace.",
      },
      { property: "og:title", content: "Connect a repository — Developer AI" },
      { property: "og:description", content: "Add a codebase and let the AI engineering agents analyse it." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: NewProjectPage,
});

const sources = [
  { id: "github", label: "GitHub", desc: "Import a repository you own.", icon: Github },
  { id: "upload", label: "Upload", desc: "Upload a zipped codebase.", icon: Upload },
] as const;

function NewProjectPage() {
  const navigate = useNavigate();
  const [source, setSource] = useState<string>("github");
  const [name, setName] = useState("");
  const [repo, setRepo] = useState("");
  const [description, setDescription] = useState("");
  const [error, setError] = useState<string | null>(null);

  return (
    <AppShell>
      <PageHeader
        eyebrow="Developer AI"
        title="Connect a repository"
        description="The agents index your code locally in this demo — nothing leaves the browser."
      />

      <form
        className="mt-6 grid max-w-3xl gap-6"
        onSubmit={(e) => {
          e.preventDefault();
          if (!name.trim()) {
            setError("Give the project a name.");
            return;
          }
          setError(null);
          toast.success("Project connected", { description: `${name} is being analysed.` });
          navigate({ to: "/developer/projects" as "/" });
        }}
      >
        <Panel title="Source">
          <div className="grid gap-3 sm:grid-cols-2">
            {sources.map((s) => (
              <button
                key={s.id}
                type="button"
                onClick={() => setSource(s.id)}
                className={cn(
                  "flex items-start gap-3 rounded-xl border p-4 text-left transition-colors",
                  source === s.id ? "border-primary bg-primary/8" : "border-border hover:bg-accent",
                )}
              >
                <s.icon className="mt-0.5 size-4" aria-hidden />
                <span>
                  <span className="block text-sm font-medium">{s.label}</span>
                  <span className="block text-xs text-muted-foreground">{s.desc}</span>
                </span>
              </button>
            ))}
          </div>
        </Panel>

        <Panel title="Details">
          <div className="grid gap-4">
            <div className="grid gap-2">
              <Label htmlFor="name">Project name</Label>
              <Input
                id="name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="E-Commerce Platform"
              />
              {error ? <p className="text-xs text-destructive">{error}</p> : null}
            </div>
            <div className="grid gap-2">
              <Label htmlFor="repo">Repository</Label>
              <Input
                id="repo"
                value={repo}
                onChange={(e) => setRepo(e.target.value)}
                placeholder="northwind/ecommerce-platform"
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="desc">Description</Label>
              <Textarea
                id="desc"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="What does this codebase do?"
                rows={3}
              />
            </div>
          </div>
        </Panel>

        <div className="flex justify-end gap-2">
          <Button type="button" variant="outline" onClick={() => navigate({ to: "/developer/projects" as "/" })}>
            Cancel
          </Button>
          <Button type="submit">Connect project</Button>
        </div>
      </form>
    </AppShell>
  );
}
