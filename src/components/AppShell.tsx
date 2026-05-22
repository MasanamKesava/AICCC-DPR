import { Link, useRouterState } from "@tanstack/react-router";
import { LayoutDashboard, FilePlus, Building2, BarChart3, FileDown, LogOut, Bell, Search, FileText, UserX } from "lucide-react";
import { useAuth } from "@/contexts/AuthProvider";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarProvider,
  SidebarTrigger,
  SidebarHeader,
  SidebarFooter,
  useSidebar,
} from "@/components/ui/sidebar";

const nav = [
  { to: "/dpr-summary", icon: FileText, label: "DPR Summary" },
  { to: "/dashboard", icon: LayoutDashboard, label: "Dashboard" },
  { to: "/dpr", icon: FilePlus, label: "DPR Entries" },
  { to: "/departments", icon: Building2, label: "Departments" },
  { to: "/absentees", icon: UserX, label: "Absentees" },
  { to: "/analytics", icon: BarChart3, label: "Analytics" },
  { to: "/reports", icon: FileDown, label: "Reports" },
];

function AppSidebar() {
  const path = useRouterState({ select: (s) => s.location.pathname });
  const { user, roles } = useAuth();
  const { state } = useSidebar();
  const collapsed = state === "collapsed";

  return (
    <Sidebar collapsible="icon">
      <SidebarHeader className="border-b border-sidebar-border">
        <div className="flex h-14 items-center gap-3 px-2">
          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-md bg-sidebar-primary text-sidebar-primary-foreground">
            <Building2 className="h-5 w-5" />
          </div>
          {!collapsed && (
            <div className="min-w-0">
              <p className="truncate text-sm font-semibold leading-tight">AICCC</p>
              <p className="truncate text-xs text-sidebar-foreground/70 leading-tight">DPR System</p>
            </div>
          )}
        </div>
      </SidebarHeader>
      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupLabel>Workspace</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {nav.map((n) => {
                const active = path === n.to || path.startsWith(n.to + "/");
                return (
                  <SidebarMenuItem key={n.to}>
                    <SidebarMenuButton asChild isActive={active} tooltip={n.label}>
                      <Link to={n.to}>
                        <n.icon className="h-4 w-4" />
                        <span className="whitespace-nowrap">{n.label}</span>
                      </Link>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                );
              })}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>
      <SidebarFooter className="border-t border-sidebar-border">
        {!collapsed && (
          <div className="px-2 py-1 text-xs text-sidebar-foreground/60">
            <p className="truncate">{user?.email}</p>
            <p className="mt-1 capitalize">{roles[0]?.replace("_", " ") ?? "viewer"}</p>
          </div>
        )}
      </SidebarFooter>
    </Sidebar>
  );
}

export function AppShell({ children }: { children: React.ReactNode }) {
  const { signOut } = useAuth();
  return (
    <SidebarProvider>
      <div className="flex min-h-screen w-full bg-background">
        <AppSidebar />
        <div className="flex min-w-0 flex-1 flex-col">
          <header className="sticky top-0 z-30 flex h-16 items-center gap-3 border-b border-border bg-card/80 px-3 backdrop-blur md:px-6">
            <SidebarTrigger />
            <div className="relative hidden flex-1 max-w-md md:block">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input placeholder="Search DPRs, departments, vendors..." className="pl-9" />
            </div>
            <div className="ml-auto flex items-center gap-2">
              <Button variant="ghost" size="icon"><Bell className="h-4 w-4" /></Button>
              <Button variant="outline" size="sm" onClick={signOut}>
                <LogOut className="mr-2 h-4 w-4" /> Sign out
              </Button>
            </div>
          </header>
          <main className="flex-1 p-4 md:p-6">{children}</main>
        </div>
      </div>
    </SidebarProvider>
  );
}
