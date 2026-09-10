import { Link, useRouterState } from "@tanstack/react-router";
import { useEffect, useState, type ReactNode } from "react";
import {
  Bell,
  ChevronsUpDown,
  Menu,
  Plus,
  Search,
  Sparkles,
  Shield,
} from "lucide-react";
import { Button } from "@/components/ui/button";
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
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { navGroups, mobileNav } from "./nav";
import { CommandPalette } from "./command-palette";
import { useNotifications, useSession, useWorkspaces } from "@/hooks/use-platform";
import { clearStoredAuth, getStoredToken } from "@/lib/api-client";
import { isUserAdmin } from "./admin-shell";

function Brand() {
  return (
    <Link to="/" className="flex items-center gap-2.5 px-1">
      <img
        src="/brand-logo.jpg"
        alt="IntelligenSpace Logo"
        className="size-8 rounded-lg object-cover shadow-sm ring-1 ring-primary/25"
      />
      <span className="text-sm font-semibold tracking-tight">IntelligenSpace</span>
    </Link>
  );
}

function WorkspaceSelector() {
  const { data: workspaces } = useWorkspaces();
  const [active, setActive] = useState(0);
  const current = workspaces?.[active];

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <button className="flex w-full items-center gap-2 rounded-lg border border-border bg-surface-2/60 px-3 py-2 text-left transition-colors hover:bg-accent">
          <span className="flex size-6 items-center justify-center rounded-md bg-primary/15 text-[11px] font-semibold text-primary">
            {(current?.name ?? "W").slice(0, 1)}
          </span>
          <span className="min-w-0 flex-1">
            <span className="block truncate text-xs font-medium">
              {current?.name ?? "Loading…"}
            </span>
            <span className="block truncate text-[11px] text-muted-foreground">
              {current?.plan ?? "—"} plan
            </span>
          </span>
          <ChevronsUpDown className="size-3.5 text-muted-foreground" aria-hidden />
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="start" className="w-56">
        <DropdownMenuLabel>Workspaces</DropdownMenuLabel>
        {workspaces?.map((ws, i) => (
          <DropdownMenuItem key={ws.id} onSelect={() => setActive(i)}>
            {ws.name}
            <span className="ml-auto text-xs text-muted-foreground">{ws.members}</span>
          </DropdownMenuItem>
        ))}
        <DropdownMenuSeparator />
        <DropdownMenuItem>
          <Plus /> New workspace
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

function NavLinks({ onNavigate }: { onNavigate?: () => void }) {
  return (
    <nav className="flex flex-col gap-6">
      {navGroups.map((group) => (
        <div key={group.label}>
          <p className="text-eyebrow px-3 pb-2">{group.label}</p>
          <ul className="space-y-0.5">
            {group.items.map((item) => (
              <li key={item.to}>
                <Link
                  to={item.to as "/"}
                  onClick={onNavigate}
                  activeOptions={{ exact: item.exact ?? false }}
                  className="flex items-center gap-3 rounded-lg px-3 py-2 text-sm text-muted-foreground transition-colors hover:bg-accent hover:text-foreground data-[status=active]:bg-primary/12 data-[status=active]:text-primary data-[status=active]:font-medium"
                >
                  <item.icon className="size-4" aria-hidden />
                  {item.label}
                </Link>
              </li>
            ))}
          </ul>
        </div>
      ))}
    </nav>
  );
}

function TopBar({ onOpenPalette }: { onOpenPalette: () => void }) {
  const { data: notifications } = useNotifications();
  const { data: session } = useSession();
  const user = session || { name: "User", email: "", initials: "U" };
  const unread = notifications?.filter((n) => !n.read).length ?? 0;

  return (
    <header className="sticky top-0 z-30 flex h-16 items-center gap-3 border-b border-border bg-background/80 px-4 backdrop-blur-xl lg:px-8">
      <Sheet>
        <SheetTrigger asChild>
          <Button variant="ghost" size="icon" className="lg:hidden" aria-label="Open navigation">
            <Menu />
          </Button>
        </SheetTrigger>
        <SheetContent side="left" className="w-[280px] overflow-y-auto p-4">
          <SheetTitle className="sr-only">Navigation</SheetTitle>
          <div className="space-y-5">
            <Brand />
            <WorkspaceSelector />
            <NavLinks />
          </div>
        </SheetContent>
      </Sheet>

      <div className="lg:hidden">
        <Brand />
      </div>

      <button
        onClick={onOpenPalette}
        aria-label="Search everything"

        className="ml-auto flex h-9 items-center gap-2 rounded-lg border border-border bg-surface-2/50 px-3 text-sm text-muted-foreground transition-colors hover:bg-accent lg:ml-0 lg:w-80"
      >
        <Search className="size-4" aria-hidden />
        <span className="hidden lg:inline">Search everything…</span>
        <kbd className="ml-auto hidden rounded border border-border px-1.5 py-0.5 font-mono text-[10px] lg:inline">
          ⌘K
        </kbd>
      </button>

      <div className="ml-auto flex items-center gap-2">
        <Button asChild size="sm" className="hidden sm:inline-flex">
          <Link to={"/agents/new" as "/"}>
            <Plus /> New agent
          </Link>
        </Button>
        <Button variant="ghost" size="icon" className="relative" aria-label="Notifications">
          <Bell />
          {unread > 0 ? (
            <Badge className="absolute -right-0.5 -top-0.5 size-4 justify-center p-0 text-[10px]">
              {unread}
            </Badge>
          ) : null}
        </Button>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <button aria-label="Account menu">
              <Avatar className="size-8">
                <AvatarFallback className="bg-secondary text-xs">
                  {user.initials}
                </AvatarFallback>
              </Avatar>
            </button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-56">
            <DropdownMenuLabel>
              <div className="text-sm font-medium">{user.name}</div>
              <div className="text-xs font-normal text-muted-foreground">{user.email}</div>
            </DropdownMenuLabel>
            <DropdownMenuSeparator />
            {isUserAdmin(user.email) && (
              <>
                <DropdownMenuItem asChild>
                  <Link
                    to={"/admin/models" as "/"}
                    className="flex items-center justify-between font-semibold text-amber-400 focus:text-amber-300 cursor-pointer"
                  >
                    <span className="flex items-center gap-2">
                      <Shield className="size-4" /> Admin Console
                    </span>
                    <Badge variant="outline" className="text-[9px] px-1 py-0 h-4 border-amber-500/40 bg-amber-500/10 text-amber-400">
                      Super Admin
                    </Badge>
                  </Link>
                </DropdownMenuItem>
                <DropdownMenuSeparator />
              </>
            )}
            <DropdownMenuItem asChild>
              <Link to={"/settings" as "/"}>Settings</Link>
            </DropdownMenuItem>
            <DropdownMenuItem asChild>
              <Link to={"/team" as "/"}>Team</Link>
            </DropdownMenuItem>
            <DropdownMenuItem asChild>
              <Link to={"/usage" as "/"}>Usage & credits</Link>
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem
              className="cursor-pointer text-destructive focus:text-destructive"
              onClick={() => {
                clearStoredAuth();
                window.location.href = "/auth";
              }}
            >
              Sign out
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </header>
  );
}

function BottomNav() {
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  return (
    <nav className="fixed inset-x-0 bottom-0 z-30 grid grid-cols-4 border-t border-border bg-background/95 backdrop-blur-xl md:hidden">
      {mobileNav.map((item) => {
        const active = item.exact ? pathname === item.to : pathname.startsWith(item.to);
        return (
          <Link
            key={item.to}
            to={item.to as "/"}
            className={cn(
              "flex flex-col items-center gap-1 py-2.5 text-[11px]",
              active ? "text-primary" : "text-muted-foreground",
            )}
          >
            <item.icon className="size-5" aria-hidden />
            {item.label}
          </Link>
        );
      })}
    </nav>
  );
}

export function AppShell({ children }: { children: ReactNode }) {
  const [paletteOpen, setPaletteOpen] = useState(false);

  // Authentication guard: redirect to /auth if no session token exists
  useEffect(() => {
    const token = getStoredToken();
    if (!token && typeof window !== "undefined" && !window.location.pathname.startsWith("/auth")) {
      window.location.href = "/auth";
    }
  }, []);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key.toLowerCase() === "k" && (e.metaKey || e.ctrlKey)) {
        e.preventDefault();
        setPaletteOpen((v) => !v);
      }
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, []);

  return (
    <div className="min-h-screen bg-background">
      <aside className="fixed inset-y-0 left-0 z-40 hidden w-[260px] flex-col gap-5 overflow-y-auto border-r border-border bg-sidebar p-4 lg:flex">
        <Brand />
        <WorkspaceSelector />
        <NavLinks />
        <div className="panel mt-auto p-3">
          <p className="text-xs font-medium">Credits</p>
          <p className="mt-1 text-xs text-muted-foreground">18,420 remaining</p>
          <Button asChild size="sm" variant="outline" className="mt-3 w-full">
            <Link to={"/usage" as "/"}>Top up</Link>
          </Button>
        </div>
      </aside>

      <div className="lg:pl-[260px]">
        <TopBar onOpenPalette={() => setPaletteOpen(true)} />
        <main className="mx-auto w-full max-w-[1400px] space-y-8 px-4 pb-24 pt-6 md:pb-10 lg:px-8">
          {children}
        </main>
      </div>

      <BottomNav />
      <CommandPalette open={paletteOpen} onOpenChange={setPaletteOpen} />
    </div>
  );
}
