import { useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { Save } from "lucide-react";
import { toast } from "sonner";
import { AppShell } from "@/components/layout/app-shell";
import { PageHeader } from "@/components/shared/page-header";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { currentUser } from "@/mock/data";

export const Route = createFileRoute("/settings")({
  head: () => ({
    meta: [
      { title: "Settings — AI Platform" },
      {
        name: "description",
        content: "Workspace profile, notification preferences and security settings for your AI agent platform.",
      },
      { property: "og:title", content: "Settings — AI Platform" },
      { property: "og:description", content: "Configure workspace, profile and security preferences." },
    ],
  }),
  component: SettingsPage,
});

function SettingsPage() {
  const [workspace, setWorkspace] = useState("Acme Labs");
  const [name, setName] = useState(currentUser.name);
  const [email, setEmail] = useState(currentUser.email);
  const [region, setRegion] = useState("ap-south-1");
  const [prefs, setPrefs] = useState({ callAlerts: true, weekly: true, lowCredits: true, product: false });
  const [mfa, setMfa] = useState(true);

  const save = () => toast.success("Settings saved", { description: "Your preferences are up to date." });

  return (
    <AppShell>
      <PageHeader
        eyebrow="Platform"
        title="Settings"
        description="Workspace identity, notifications and security."
        actions={
          <Button onClick={save}>
            <Save /> Save changes
          </Button>
        }
      />

      <Tabs defaultValue="workspace" className="mt-6">
        <TabsList>
          <TabsTrigger value="workspace">Workspace</TabsTrigger>
          <TabsTrigger value="profile">Profile</TabsTrigger>
          <TabsTrigger value="notifications">Notifications</TabsTrigger>
          <TabsTrigger value="security">Security</TabsTrigger>
        </TabsList>

        <TabsContent value="workspace" className="mt-6">
          <div className="panel max-w-xl space-y-5 p-6">
            <div className="space-y-2">
              <Label htmlFor="ws">Workspace name</Label>
              <Input id="ws" value={workspace} onChange={(e) => setWorkspace(e.target.value)} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="region">Voice region</Label>
              <Select value={region} onValueChange={setRegion}>
                <SelectTrigger id="region">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="ap-south-1">Mumbai (ap-south-1)</SelectItem>
                  <SelectItem value="eu-west-1">Dublin (eu-west-1)</SelectItem>
                  <SelectItem value="us-east-1">Virginia (us-east-1)</SelectItem>
                </SelectContent>
              </Select>
              <p className="text-xs text-muted-foreground">
                Calls are routed through the closest region for lowest latency.
              </p>
            </div>
          </div>
        </TabsContent>

        <TabsContent value="profile" className="mt-6">
          <div className="panel max-w-xl space-y-5 p-6">
            <div className="space-y-2">
              <Label htmlFor="name">Full name</Label>
              <Input id="name" value={name} onChange={(e) => setName(e.target.value)} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <Input id="email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} />
            </div>
          </div>
        </TabsContent>

        <TabsContent value="notifications" className="mt-6">
          <div className="panel max-w-xl divide-y divide-border">
            {[
              { key: "callAlerts", label: "Failed call alerts", desc: "Notify me when an agent drops a call." },
              { key: "weekly", label: "Weekly summary", desc: "Performance digest every Monday." },
              { key: "lowCredits", label: "Low credit warnings", desc: "Alert when the balance drops below ₹200." },
              { key: "product", label: "Product updates", desc: "New features and changelog highlights." },
            ].map((row) => (
              <div key={row.key} className="flex items-center justify-between gap-4 p-5">
                <div>
                  <p className="text-sm font-medium">{row.label}</p>
                  <p className="text-xs text-muted-foreground">{row.desc}</p>
                </div>
                <Switch
                  checked={prefs[row.key as keyof typeof prefs]}
                  onCheckedChange={(v) => setPrefs((p) => ({ ...p, [row.key]: v }))}
                  aria-label={row.label}
                />
              </div>
            ))}
          </div>
        </TabsContent>

        <TabsContent value="security" className="mt-6">
          <div className="panel max-w-xl space-y-5 p-6">
            <div className="flex items-center justify-between gap-4">
              <div>
                <p className="text-sm font-medium">Two-factor authentication</p>
                <p className="text-xs text-muted-foreground">Require a one-time code at sign-in.</p>
              </div>
              <Switch checked={mfa} onCheckedChange={setMfa} aria-label="Two-factor authentication" />
            </div>
            <Button
              variant="outline"
              onClick={() => toast.success("Sessions revoked", { description: "All other devices were signed out." })}
            >
              Sign out other sessions
            </Button>
          </div>
        </TabsContent>
      </Tabs>
    </AppShell>
  );
}
