import { useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { UserPlus, Users } from "lucide-react";
import { toast } from "sonner";
import { AppShell } from "@/components/layout/app-shell";
import { PageHeader } from "@/components/shared/page-header";
import { EmptyState, ErrorState, TableSkeleton } from "@/components/shared/states";
import { StatusBadge } from "@/components/shared/status-badge";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useTeam } from "@/hooks/use-platform";
import { relative } from "@/lib/format";

export const Route = createFileRoute("/team")({
  head: () => ({
    meta: [
      { title: "Team — AI Platform" },
      {
        name: "description",
        content: "Invite teammates, assign workspace roles and review access to your AI voice agents.",
      },
      { property: "og:title", content: "Team — AI Platform" },
      { property: "og:description", content: "Manage teammates and workspace roles." },
    ],
  }),
  component: TeamPage,
});

function TeamPage() {
  const { data, isLoading, isError, refetch } = useTeam();
  const [email, setEmail] = useState("");
  const members = data ?? [];

  return (
    <AppShell>
      <PageHeader
        eyebrow="Platform"
        title="Team"
        description="Who can build, deploy and monitor agents in this workspace."
      />

      <form
        className="mt-6 flex flex-wrap items-center gap-2"
        onSubmit={(e) => {
          e.preventDefault();
          if (!email.trim()) return;
          toast.success("Invite sent", { description: `${email} will receive an email invitation.` });
          setEmail("");
        }}
      >
        <Input
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="teammate@company.com"
          aria-label="Teammate email"
          className="max-w-xs"
        />
        <Button type="submit">
          <UserPlus /> Invite
        </Button>
      </form>

      <div className="mt-6">
        {isLoading ? (
          <TableSkeleton rows={5} />
        ) : isError ? (
          <ErrorState onRetry={() => refetch()} />
        ) : members.length === 0 ? (
          <EmptyState icon={Users} title="No teammates yet" description="Invite someone to collaborate." />
        ) : (
          <div className="panel overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="border-b border-border text-left text-xs text-muted-foreground">
                <tr>
                  <th className="p-4 font-medium">Member</th>
                  <th className="p-4 font-medium">Role</th>
                  <th className="p-4 font-medium">Status</th>
                  <th className="p-4 font-medium">Last active</th>
                </tr>
              </thead>
              <tbody>
                {members.map((m) => (
                  <tr key={m.id} className="border-b border-border/60 last:border-0">
                    <td className="p-4">
                      <p className="font-medium">{m.name}</p>
                      <p className="text-xs text-muted-foreground">{m.email}</p>
                    </td>
                    <td className="p-4">
                      <Badge variant="secondary">{m.role}</Badge>
                    </td>
                    <td className="p-4">
                      <StatusBadge status={m.status} />
                    </td>
                    <td className="p-4 text-muted-foreground">{relative(m.lastActiveAt)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </AppShell>
  );
}
