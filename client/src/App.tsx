import { Switch, Route, Router } from "wouter";
import { useHashLocation } from "wouter/use-hash-location";
import { QueryClientProvider } from "@tanstack/react-query";
import { queryClient } from "@/lib/queryClient";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { AuthProvider, useAuth } from "@/hooks/use-auth";
import { SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar";
import { AppSidebar } from "@/components/app-sidebar";
import LoginPage from "@/pages/login";
import ClientSetupPage from "@/pages/client-setup";
import CleanerSetupPage from "@/pages/cleaner-setup";
import CleanerDashboardPage from "@/pages/cleaner-dashboard";
import CleanerLogPage from "@/pages/cleaner-log";
import CleanersListPage from "@/pages/cleaners-list";
import DashboardPage from "@/pages/dashboard";
import JobsListPage from "@/pages/jobs-list";
import JobDetailPage from "@/pages/job-detail";
import NewJobPage from "@/pages/new-job";
import ClientsListPage from "@/pages/clients-list";
import NotificationsPage from "@/pages/notifications";
import NotFoundPage from "@/pages/not-found";
import CleaningPage from "@/pages/cleaning";
import CleaningDetailPage from "@/pages/cleaning-detail";
import NewCleaningContractPage from "@/pages/new-cleaning-contract";
import NewCleaningLogPage from "@/pages/new-cleaning-log";
import { Bell, Sun, Moon, LayoutDashboard, Briefcase, Sparkles, Users, UserCheck } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useQuery } from "@tanstack/react-query";
import { Link } from "wouter";
import { useState, useEffect } from "react";
import { useLocation } from "wouter";
import bssLogo from "@assets/bss-logo.jpeg";

function ThemeToggle() {
  const [dark, setDark] = useState(() =>
    window.matchMedia("(prefers-color-scheme: dark)").matches
  );
  useEffect(() => {
    document.documentElement.classList.toggle("dark", dark);
  }, [dark]);
  return (
    <Button
      variant="ghost"
      size="icon"
      onClick={() => setDark((d) => !d)}
      aria-label="Toggle theme"
      data-testid="button-theme-toggle"
      className="text-muted-foreground hover:text-foreground"
    >
      {dark ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
    </Button>
  );
}

function NotifBell() {
  const { data } = useQuery<{ count: number }>({
    queryKey: ["/api/notifications/unread-count"],
    refetchInterval: 30_000,
  });
  return (
    <Link href="~/notifications">
      <Button
        variant="ghost"
        size="icon"
        className="relative text-muted-foreground hover:text-foreground"
        data-testid="button-notifications-bell"
      >
        <Bell className="w-4 h-4" />
        {data?.count ? (
          <span className="absolute top-1.5 right-1.5 w-2 h-2 rounded-full bg-primary" />
        ) : null}
      </Button>
    </Link>
  );
}

const adminBottomNav = [
  { href: "/",             label: "Dashboard",  icon: LayoutDashboard },
  { href: "/jobs",         label: "Jobs",        icon: Briefcase       },
  { href: "/cleaning",     label: "Cleaning",    icon: Sparkles        },
  { href: "/clients",      label: "Clients",     icon: Users           },
  { href: "/cleaners",     label: "Cleaners",    icon: UserCheck       },
];

const clientBottomNav = [
  { href: "/",              label: "My Jobs",      icon: LayoutDashboard },
  { href: "/cleaning",      label: "Cleaning",     icon: Sparkles        },
  { href: "/notifications", label: "Notifications", icon: Bell            },
];

function BottomNav() {
  const { user } = useAuth();
  const [location, navigate] = useLocation();
  const isAdmin = user?.role === "admin";
  const tabs = isAdmin ? adminBottomNav : clientBottomNav;

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-50 md:hidden bg-[#0A0A0A] border-t border-[#E8A020]/30">
      <div className="flex items-stretch">
        {tabs.map((tab) => {
          const isActive =
            tab.href === "/"
              ? location === "/"
              : location.startsWith(tab.href);
          return (
            <button
              key={tab.href}
              onClick={() => navigate(tab.href)}
              className={`flex flex-col items-center justify-center gap-0.5 flex-1 py-2 px-1 text-[10px] font-medium transition-colors ${
                isActive ? "text-[#E8A020]" : "text-white/40"
              }`}
            >
              <tab.icon className="w-5 h-5" />
              <span>{tab.label}</span>
            </button>
          );
        })}
      </div>
    </nav>
  );
}

function AppShell() {
  const { user, loading, needsSetup, logout } = useAuth();

  useEffect(() => {
    const dark = window.matchMedia("(prefers-color-scheme: dark)").matches;
    document.documentElement.classList.toggle("dark", dark);
  }, []);

  if (loading) {
    return (
      <div className="min-h-dvh flex items-center justify-center bg-[#0A0A0A]">
        <div className="flex flex-col items-center gap-3">
          {/* Pulsing gold star */}
          <svg
            width="40" height="40" viewBox="0 0 48 48" fill="none"
            className="animate-pulse"
          >
            <polygon
              points="24,4 28.6,16.8 42,16.8 31.4,24.8 35.9,37.6 24,29.6 12.1,37.6 16.6,24.8 6,16.8 19.4,16.8"
              fill="#E8A020"
            />
          </svg>
          <p className="text-sm text-white/40">Loading…</p>
        </div>
      </div>
    );
  }

  if (!user) return <LoginPage />;
  if (needsSetup && user?.role === "cleaner") return <CleanerSetupPage />;
  if (needsSetup && user?.role === "client") return <ClientSetupPage />;

  // Cleaner portal — mobile-first shell, no sidebar
  if (user?.role === "cleaner") {
    return (
      <div className="min-h-dvh bg-background">
        <header className="bg-[#0A0A0A] px-4 py-3 flex items-center justify-between sticky top-0 z-50">
          <div className="flex items-center gap-2">
            <img src={bssLogo} alt="BSS" className="h-8 w-auto" />
            <span className="text-[#E8A020] font-semibold text-sm">Cleaning Portal</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-white/60 text-xs">{user.name}</span>
            <button
              onClick={logout}
              className="text-white/40 hover:text-white text-xs underline"
            >
              Sign out
            </button>
          </div>
        </header>
        <Router hook={useHashLocation}>
          <Switch>
            <Route path="/" component={CleanerDashboardPage} />
            <Route path="/cleaner/log/:contractId" component={CleanerLogPage} />
            <Route component={CleanerDashboardPage} />
          </Switch>
        </Router>
      </div>
    );
  }

  const sidebarStyle = {
    "--sidebar-width": "14rem",
    "--sidebar-width-icon": "3.5rem",
  };

  return (
    <SidebarProvider style={sidebarStyle as React.CSSProperties}>
      <div className="flex h-screen w-full overflow-hidden">
        <AppSidebar />

        <div className="flex flex-col flex-1 min-w-0">
          {/* ── Top bar: brand black strip ── */}
          <header className="flex items-center justify-between px-3 border-b border-border bg-background flex-shrink-0 h-12">
            <div className="flex items-center gap-2">
              <SidebarTrigger
                className="text-muted-foreground hover:text-foreground"
                data-testid="button-sidebar-toggle"
              />
              {/* Subtle brand name on desktop */}
              <span className="hidden md:block text-xs font-semibold text-primary tracking-wide">
                Bright Star Solutions
              </span>
              <span className="hidden md:block text-xs text-muted-foreground">
                — Your Property Portal
              </span>
            </div>

            <div className="flex items-center gap-1">
              <NotifBell />
              <ThemeToggle />
            </div>
          </header>

          {/* ── Page content ── */}
          <Router hook={useHashLocation}>
            <main className="flex-1 overflow-hidden pb-16 md:pb-0">
              <Switch>
                <Route path="/"                        component={DashboardPage}            />
                <Route path="/jobs/new"                component={NewJobPage}               />
                <Route path="/jobs/:id"                component={JobDetailPage}            />
                <Route path="/jobs"                    component={JobsListPage}             />
                <Route path="/cleaning/new-contract"   component={NewCleaningContractPage}  />
                <Route path="/cleaning/new-log"        component={NewCleaningLogPage}       />
                <Route path="/cleaning/:id"            component={CleaningDetailPage}       />
                <Route path="/cleaning"                component={CleaningPage}             />
                <Route path="/clients"                 component={ClientsListPage}          />
                <Route path="/cleaners"                component={CleanersListPage}         />
                <Route path="/notifications"           component={NotificationsPage}        />
                <Route                                 component={NotFoundPage}             />
              </Switch>
            </main>
            <BottomNav />
          </Router>
        </div>
      </div>
    </SidebarProvider>
  );
}

export default function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <AuthProvider>
          <AppShell />
          <Toaster />
        </AuthProvider>
      </TooltipProvider>
    </QueryClientProvider>
  );
}
