import { Link } from "wouter";
import { useLocation } from "wouter";
import {
  LayoutDashboard, Briefcase, Users, Bell, LogOut,
} from "lucide-react";
import {
  Sidebar, SidebarContent, SidebarFooter, SidebarGroup,
  SidebarGroupContent, SidebarGroupLabel, SidebarHeader,
  SidebarMenu, SidebarMenuButton, SidebarMenuItem,
} from "@/components/ui/sidebar";
import { useAuth } from "@/hooks/use-auth";
import { useQuery } from "@tanstack/react-query";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import bssLogo from "@assets/bss-logo.jpeg";

const adminNav = [
  { href: "/",             label: "Dashboard",     icon: LayoutDashboard },
  { href: "/jobs",         label: "All Jobs",       icon: Briefcase       },
  { href: "/clients",      label: "Clients",        icon: Users           },
  { href: "/notifications",label: "Notifications",  icon: Bell            },
];

const clientNav = [
  { href: "/",             label: "My Jobs",        icon: LayoutDashboard },
  { href: "/notifications",label: "Notifications",  icon: Bell            },
];

export function AppSidebar() {
  const { user, logout } = useAuth();
  const [location] = useLocation();
  const isAdmin = user?.role === "admin";
  const navItems = isAdmin ? adminNav : clientNav;

  const { data: unread } = useQuery<{ count: number }>({
    queryKey: ["/api/notifications/unread-count"],
    refetchInterval: 30_000,
  });

  return (
    <Sidebar>
      {/* ── Logo header ── */}
      <SidebarHeader className="border-b border-sidebar-border pb-0 pt-0 px-0">
        {/* Logo image on brand black */}
        <div className="bg-[#0A0A0A] flex items-center justify-center px-4 py-3">
          <img
            src={bssLogo}
            alt="Bright Star Solutions"
            className="w-full max-w-[140px] h-auto object-contain"
            crossOrigin="anonymous"
          />
        </div>
        {/* Portal label strip in gold */}
        <div className="bg-primary/10 border-b border-sidebar-border px-3 py-1.5 text-center">
          <span className="text-[10px] font-bold tracking-[0.15em] uppercase text-primary">
            Your Property Portal
          </span>
        </div>
      </SidebarHeader>

      {/* ── Nav items ── */}
      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupLabel className="text-sidebar-foreground/40 text-[10px] tracking-wider uppercase">
            Menu
          </SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {navItems.map((item) => {
                const isActive =
                  item.href === "/"
                    ? location === "/"
                    : location.startsWith(item.href);
                return (
                  <SidebarMenuItem key={item.href}>
                    <SidebarMenuButton
                      asChild
                      data-active={isActive}
                      className={cn(
                        "transition-colors",
                        isActive
                          ? "bg-primary text-primary-foreground font-semibold"
                          : "hover:bg-sidebar-accent hover:text-sidebar-accent-foreground"
                      )}
                    >
                      <Link href={item.href}>
                        <item.icon className="w-4 h-4" />
                        <span>{item.label}</span>
                        {item.label === "Notifications" && unread?.count ? (
                          <Badge className="ml-auto text-xs px-1.5 py-0 bg-primary text-primary-foreground">
                            {unread.count > 99 ? "99+" : unread.count}
                          </Badge>
                        ) : null}
                      </Link>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                );
              })}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>

      {/* ── User footer ── */}
      <SidebarFooter className="border-t border-sidebar-border">
        <div className="flex items-center gap-2.5 px-2 py-2">
          {/* Avatar — gold initial on black */}
          <div className="w-8 h-8 rounded-full bg-primary flex items-center justify-center flex-shrink-0 text-sm font-bold text-primary-foreground">
            {user?.name?.charAt(0).toUpperCase()}
          </div>
          <div className="min-w-0 flex-1">
            <div className="text-xs font-semibold text-sidebar-foreground truncate">
              {user?.name}
            </div>
            <div className="text-[10px] text-sidebar-foreground/50 truncate">
              {user?.role === "admin" ? "Administrator" : "Client"}
            </div>
          </div>
          <button
            onClick={logout}
            className="text-sidebar-foreground/40 hover:text-primary transition-colors p-1"
            title="Sign out"
            data-testid="button-logout"
          >
            <LogOut className="w-4 h-4" />
          </button>
        </div>
      </SidebarFooter>
    </Sidebar>
  );
}
