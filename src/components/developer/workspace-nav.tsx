import { Link } from "@tanstack/react-router";
import {
  Activity,
  Bug,
  FileCode2,
  FileText,
  LayoutDashboard,
  Network,
  ScanSearch,
  ShieldCheck,
  Sparkles,
  TestTube2,
  type LucideIcon,
} from "lucide-react";

export interface WorkspaceTab {
  label: string;
  to: string;
  icon: LucideIcon;
  exact?: boolean;
}

export const workspaceTabs: WorkspaceTab[] = [
  { label: "Overview", to: "/developer/projects/$id", icon: LayoutDashboard, exact: true },
  { label: "Files", to: "/developer/projects/$id/files", icon: FileCode2 },
  { label: "Code review", to: "/developer/projects/$id/review", icon: ScanSearch },
  { label: "Debugger", to: "/developer/projects/$id/debug", icon: Bug },
  { label: "Coding agent", to: "/developer/projects/$id/coding", icon: Sparkles },
  { label: "Architecture", to: "/developer/projects/$id/architecture", icon: Network },
  { label: "Tests", to: "/developer/projects/$id/tests", icon: TestTube2 },
  { label: "Security", to: "/developer/projects/$id/security", icon: ShieldCheck },
  { label: "Docs", to: "/developer/projects/$id/documentation", icon: FileText },
  { label: "Activity", to: "/developer/projects/$id/activity", icon: Activity },
];

export function WorkspaceTabs({ id }: { id: string }) {
  return (
    <nav className="-mx-1 mt-6 flex gap-1 overflow-x-auto pb-1">
      {workspaceTabs.map((tab) => (
        <Link
          key={tab.to}
          to={tab.to as "/"}
          params={{ id } as never}
          activeOptions={{ exact: tab.exact ?? false }}
          className="flex shrink-0 items-center gap-2 rounded-lg px-3 py-2 text-sm text-muted-foreground transition-colors hover:bg-accent hover:text-foreground data-[status=active]:bg-primary/12 data-[status=active]:font-medium data-[status=active]:text-primary"
        >
          <tab.icon className="size-4" aria-hidden />
          {tab.label}
        </Link>
      ))}
    </nav>
  );
}
