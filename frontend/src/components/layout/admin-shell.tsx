import { useState, useEffect, type ReactNode } from "react";
import { Link, useRouterState } from "@tanstack/react-router";
import {
  ShieldCheck,
  ShieldAlert,
  Cpu,
  Building2,
  Users,
  Gauge,
  FileText,
  ArrowLeft,
  Search,
  CheckCircle2,
  Sparkles,
  Menu,
  RotateCcw,
  Sliders,
  LogOut,
  AlertOctagon,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Sheet, SheetContent, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { useSession } from "@/hooks/use-platform";
import { cn } from "@/lib/utils";

export interface AdminNavItem {
  label: string;
  to: string;
  icon: React.ComponentType<{ className?: string }>;
  exact?: boolean;
}

export interface AdminNavGroup {
  label: string;
  items: AdminNavItem[];
}

export const adminNavGroups: AdminNavGroup[] = [
  {
    label: "Core Administration",
    items: [
      { label: "AI Models", to: "/admin/models", icon: Cpu, exact: true },
    ],
  },
];

interface AdminShellProps {
  children: ReactNode;
  activeSection?: string;
  onSectionChange?: (section: string) => void;
}

export function AdminShell({ children, activeSection = "models", onSectionChange }: AdminShellProps) {
  const { data: session } = useSession();
  const [mobileOpen, setMobileOpen] = useState(false);
  const routerState = useRouterState();
  const currentPath = routerState.location.pathname;

  // RBAC Role State (allows live simulation of Admin vs Member role)
  const [activeRole, setActiveRole] = useState<"admin" | "member">(() => {
    if (typeof window !== "undefined") {
      const saved = localStorage.getItem("admin_rbac_role_override");
      if (saved === "member" || saved === "admin") return saved;
    }
    return (session?.role?.toLowerCase() === "member" ? "member" : "admin");
  });

  const handleRoleSwitch = (role: "admin" | "member") => {
    setActiveRole(role);
    if (typeof window !== "undefined") {
      localStorage.setItem("admin_rbac_role_override", role);
    }
  };

  const isAuthorized = activeRole === "admin";

  return (
    <div className="min-h-screen bg-background text-foreground">
      {/* ── Separate Dedicated Admin Sidebar (Desktop - Fixed, No Scroll) ── */}
      <aside className="fixed inset-y-0 left-0 z-40 hidden w-64 flex-col border-r border-border/80 bg-surface-1/95 backdrop-blur lg:flex select-none overflow-hidden">
        {/* Admin Header & Brand */}
        <div className="flex flex-col gap-2.5 p-3.5 border-b border-border/70 shrink-0">
          <div className="flex items-center justify-between">
            <Link to="/admin/models" className="flex items-center gap-2.5">
              <span className="flex size-8 items-center justify-center rounded-lg bg-gradient-to-br from-amber-500 to-rose-600 text-white shadow-md shadow-amber-500/20">
                <ShieldCheck className="size-4.5" />
              </span>
              <div>
                <span className="block text-xs font-bold tracking-tight text-foreground uppercase">
                  Admin Console
                </span>
                <span className="block text-[10px] text-muted-foreground font-medium">
                  AI Platform Governance
                </span>
              </div>
            </Link>
            <Badge variant="outline" className="text-[10px] text-amber-400 border-amber-500/40 bg-amber-500/10 font-mono uppercase px-1.5 py-0 h-4.5">
              RBAC
            </Badge>
          </div>

          {/* Cluster Fleet Status Badge */}
          <div className="rounded-lg border border-emerald-500/30 bg-emerald-500/5 px-2.5 py-1.5 flex items-center justify-between text-[11px]">
            <span className="flex items-center gap-1.5 text-emerald-400 font-medium">
              <span className="size-1.5 rounded-full bg-emerald-500 animate-pulse" />
              Fleet Online
            </span>
            <span className="font-mono text-[10px] text-muted-foreground">9/9 Nodes</span>
          </div>

          {/* Quick Exit to User Workspace Button */}
          <Button
            variant="outline"
            size="sm"
            asChild
            className="w-full justify-start h-8 text-xs text-muted-foreground hover:text-foreground gap-2 border-border/60 bg-surface-2/40 hover:bg-surface-2"
          >
            <Link to="/">
              <ArrowLeft className="size-3.5" /> Return to Workspace
            </Link>
          </Button>
        </div>

        {/* Admin Navigation Menu (No scrollbar, perfectly contained) */}
        <div className="flex-1 p-3 space-y-4 overflow-hidden [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
          <div>
            <p className="px-3 pb-1.5 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground/80">
              Core Controls
            </p>
            <ul className="space-y-1">
              <li>
                <button
                  type="button"
                  onClick={() => onSectionChange ? onSectionChange("models") : null}
                  className={cn(
                    "flex w-full items-center gap-2.5 rounded-lg px-3 py-2 text-xs font-medium transition-all text-left",
                    activeSection === "models" || currentPath.includes("/admin/models")
                      ? "bg-primary/15 text-primary shadow-xs ring-1 ring-primary/25 font-semibold"
                      : "text-muted-foreground hover:bg-muted/60 hover:text-foreground",
                  )}
                >
                  <Cpu className="size-4 shrink-0 text-primary" />
                  <span className="flex-1 truncate">AI Models</span>
                  <Badge variant="outline" className="text-[10px] text-emerald-400 border-emerald-500/30 bg-emerald-500/10 px-1 py-0 h-4">
                    Active
                  </Badge>
                </button>
              </li>
              <li>
                <button
                  type="button"
                  onClick={() => onSectionChange ? onSectionChange("workspaces") : null}
                  className={cn(
                    "flex w-full items-center gap-2.5 rounded-lg px-3 py-2 text-xs font-medium transition-all text-left",
                    activeSection === "workspaces"
                      ? "bg-primary/15 text-primary shadow-xs ring-1 ring-primary/25 font-semibold"
                      : "text-muted-foreground hover:bg-muted/60 hover:text-foreground",
                  )}
                >
                  <Building2 className="size-4 shrink-0" />
                  <span className="flex-1 truncate">Workspaces & Tenants</span>
                </button>
              </li>
              <li>
                <button
                  type="button"
                  onClick={() => onSectionChange ? onSectionChange("users") : null}
                  className={cn(
                    "flex w-full items-center gap-2.5 rounded-lg px-3 py-2 text-xs font-medium transition-all text-left",
                    activeSection === "users"
                      ? "bg-primary/15 text-primary shadow-xs ring-1 ring-primary/25 font-semibold"
                      : "text-muted-foreground hover:bg-muted/60 hover:text-foreground",
                  )}
                >
                  <Users className="size-4 shrink-0" />
                  <span className="flex-1 truncate">Users & RBAC Directory</span>
                </button>
              </li>
            </ul>
          </div>

          <div>
            <p className="px-3 pb-2 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground/80">
              Governance & Policies
            </p>
            <ul className="space-y-1">
              <li>
                <button
                  type="button"
                  onClick={() => onSectionChange ? onSectionChange("quotas") : null}
                  className={cn(
                    "flex w-full items-center gap-2.5 rounded-lg px-3 py-2 text-xs font-medium transition-all text-left",
                    activeSection === "quotas"
                      ? "bg-primary/15 text-primary shadow-xs ring-1 ring-primary/25 font-semibold"
                      : "text-muted-foreground hover:bg-muted/60 hover:text-foreground",
                  )}
                >
                  <Gauge className="size-4 shrink-0" />
                  <span className="flex-1 truncate">Quotas & Daily Limits</span>
                </button>
              </li>
              <li>
                <button
                  type="button"
                  onClick={() => onSectionChange ? onSectionChange("audit") : null}
                  className={cn(
                    "flex w-full items-center gap-2.5 rounded-lg px-3 py-2 text-xs font-medium transition-all text-left",
                    activeSection === "audit"
                      ? "bg-primary/15 text-primary shadow-xs ring-1 ring-primary/25 font-semibold"
                      : "text-muted-foreground hover:bg-muted/60 hover:text-foreground",
                  )}
                >
                  <FileText className="size-4 shrink-0" />
                  <span className="flex-1 truncate">Security Audit Logs</span>
                </button>
              </li>
            </ul>
          </div>
        </div>

        {/* Admin Footer: User profile & RBAC Role Switcher */}
        <div className="p-3 border-t border-border/80 bg-surface-2/40 space-y-2 shrink-0">
          <div className="flex items-center gap-2.5 px-2">
            <Avatar className="size-8 border border-border/60">
              <AvatarFallback className="text-xs bg-amber-500/15 text-amber-400 font-semibold">
                {session?.initials || "AD"}
              </AvatarFallback>
            </Avatar>
            <div className="min-w-0 flex-1">
              <p className="truncate text-xs font-semibold text-foreground">
                {session?.name || "Admin User"}
              </p>
              <p className="truncate text-[10px] text-muted-foreground">
                {session?.email || "admin@intelligenspace.io"}
              </p>
            </div>
          </div>

          {/* Live RBAC Simulator Widget */}
          <div className="rounded-lg border border-border/60 bg-background/80 p-2 text-xs space-y-1.5">
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-semibold uppercase text-muted-foreground tracking-wide flex items-center gap-1">
                <ShieldCheck className="size-3 text-amber-400" /> RBAC Role
              </span>
              <Badge
                variant="outline"
                className={cn(
                  "text-[10px] px-1 py-0 h-4 font-mono uppercase",
                  activeRole === "admin"
                    ? "text-emerald-400 border-emerald-500/30 bg-emerald-500/10"
                    : "text-rose-400 border-rose-500/30 bg-rose-500/10",
                )}
              >
                {activeRole}
              </Badge>
            </div>
            <div className="grid grid-cols-2 gap-1 pt-1">
              <Button
                variant={activeRole === "admin" ? "default" : "outline"}
                size="sm"
                onClick={() => handleRoleSwitch("admin")}
                className="h-6 text-[10px] px-1.5"
              >
                Admin
              </Button>
              <Button
                variant={activeRole === "member" ? "destructive" : "outline"}
                size="sm"
                onClick={() => handleRoleSwitch("member")}
                className="h-6 text-[10px] px-1.5"
              >
                Member (Test)
              </Button>
            </div>
          </div>
        </div>
      </aside>

      {/* ── Main Content Area ────────────────────────────────────── */}
      <div className="flex flex-1 flex-col min-w-0 lg:pl-64">
        {/* Top Header */}
        <header className="sticky top-0 z-30 flex h-14 items-center justify-between border-b border-border/80 bg-background/80 px-4 backdrop-blur lg:px-6">
          <div className="flex items-center gap-3">
            {/* Mobile Sheet Menu */}
            <Sheet open={mobileOpen} onOpenChange={setMobileOpen}>
              <SheetTrigger asChild className="lg:hidden">
                <Button variant="ghost" size="icon" className="size-8">
                  <Menu className="size-4" />
                </Button>
              </SheetTrigger>
              <SheetContent side="left" className="w-64 p-0">
                <SheetTitle className="sr-only">Admin Navigation</SheetTitle>
                <div className="flex flex-col h-full bg-surface-1">
                  <div className="p-4 border-b border-border/70">
                    <div className="flex items-center gap-2">
                      <ShieldCheck className="size-5 text-amber-400" />
                      <span className="font-bold text-sm uppercase">Admin Console</span>
                    </div>
                  </div>
                  <div className="p-3 flex-1 overflow-y-auto space-y-4">
                    <Button
                      variant="outline"
                      size="sm"
                      asChild
                      className="w-full justify-start h-8 text-xs gap-2"
                      onClick={() => setMobileOpen(false)}
                    >
                      <Link to="/">
                        <ArrowLeft className="size-3.5" /> Return to Workspace
                      </Link>
                    </Button>
                    <div className="space-y-1">
                      <button
                        onClick={() => { onSectionChange?.("models"); setMobileOpen(false); }}
                        className="w-full text-left px-3 py-2 text-xs rounded-lg font-medium text-foreground bg-primary/10"
                      >
                        AI Models
                      </button>
                      <button
                        onClick={() => { onSectionChange?.("workspaces"); setMobileOpen(false); }}
                        className="w-full text-left px-3 py-2 text-xs rounded-lg font-medium text-muted-foreground"
                      >
                        Workspaces & Tenants
                      </button>
                    </div>
                  </div>
                </div>
              </SheetContent>
            </Sheet>

            <div className="flex items-center gap-2 text-xs font-medium text-muted-foreground">
              <span className="font-semibold text-foreground">Admin Console</span>
              <span>/</span>
              <span className="capitalize">{activeSection}</span>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <Badge variant="outline" className="hidden sm:inline-flex text-[11px] text-emerald-400 border-emerald-500/40 bg-emerald-500/10 gap-1.5 px-2 py-0.5">
              <span className="size-1.5 rounded-full bg-emerald-500 animate-pulse" />
              RBAC Protected
            </Badge>

            <Button
              variant="outline"
              size="sm"
              asChild
              className="h-8 text-xs gap-1.5"
            >
              <Link to="/">
                <ArrowLeft className="size-3" /> Back to App
              </Link>
            </Button>
          </div>
        </header>

        {/* Main Body with RBAC Gate */}
        <main className="flex-1 p-4 lg:p-6">
          {!isAuthorized ? (
            /* ── 403 Forbidden RBAC Denial Screen ──────────────── */
            <div className="mx-auto max-w-lg mt-16 text-center space-y-5 panel p-8 border-destructive/40 bg-destructive/5">
              <div className="mx-auto flex size-14 items-center justify-center rounded-2xl bg-destructive/15 text-destructive ring-8 ring-destructive/10">
                <ShieldAlert className="size-7" />
              </div>
              <div className="space-y-2">
                <Badge variant="outline" className="text-xs text-destructive border-destructive/40 bg-destructive/10">
                  403 Forbidden — Access Denied
                </Badge>
                <h2 className="text-lg font-bold tracking-tight text-foreground">
                  Administrator Privileges Required
                </h2>
                <p className="text-xs text-muted-foreground leading-relaxed">
                  Your current session role is <strong>"Member"</strong>. You do not have permission to access the AI Platform Admin Console or modify system AI models.
                </p>
              </div>

              <div className="pt-2 flex flex-col sm:flex-row items-center justify-center gap-3">
                <Button variant="outline" size="sm" asChild className="w-full sm:w-auto text-xs gap-1.5">
                  <Link to="/">
                    <ArrowLeft className="size-3.5" /> Return to Workspace
                  </Link>
                </Button>
                <Button
                  size="sm"
                  onClick={() => handleRoleSwitch("admin")}
                  className="w-full sm:w-auto text-xs gap-1.5 bg-amber-500 hover:bg-amber-600 text-black font-semibold"
                >
                  <ShieldCheck className="size-3.5" /> Switch to Admin Role
                </Button>
              </div>
            </div>
          ) : (
            /* ── Authorized Admin Content ──────────────────────── */
            children
          )}
        </main>
      </div>
    </div>
  );
}
