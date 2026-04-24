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
import DashboardPage from "@/pages/dashboard";
import JobsListPage from "@/pages/jobs-list";
import JobDetailPage from "@/pages/job-detail";
import NewJobPage from "@/pages/new-job";
import ClientsListPage from "@/pages/clients-list";
import NotificationsPage from "@/pages/notifications";
import NotFoundPage from "@/pages/not-found";
import { Bell, Sun, Moon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useQuery } from "@tanstack/react-query";
import { Link } from "wouter";
import { useState, useEffect } from "react";

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
    <Link href="/notifications">
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

function AppShell() {
  const { user, loading } = useAuth();

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
          <main className="flex-1 overflow-hidden">
            <Router hook={useHashLocation}>
              <Switch>
                <Route path="/"              component={DashboardPage}   />
                <Route path="/jobs/new"      component={NewJobPage}      />
                <Route path="/jobs/:id"      component={JobDetailPage}   />
                <Route path="/jobs"          component={JobsListPage}    />
                <Route path="/clients"       component={ClientsListPage} />
                <Route path="/notifications" component={NotificationsPage} />
                <Route                       component={NotFoundPage}    />
              </Switch>
            </Router>
          </main>
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
