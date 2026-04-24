import { useQuery } from "@tanstack/react-query";
import { Link } from "wouter";
import { useAuth } from "@/hooks/use-auth";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Plus, Clipboard, AlertTriangle, Calendar, Sparkles,
  CheckCircle2, XCircle, RefreshCw, Clock,
} from "lucide-react";
import { formatDate } from "@/lib/utils";

type CleaningLog = {
  id: number;
  contractId: number;
  propertyId: number;
  propertyName: string;
  propertyAddress: string;
  operativeName: string;
  scheduledDate: string;
  completedDate?: string;
  status: string;
  areasCompleted: string;
  notes?: string;
  issueType?: string;
  issueDescription?: string;
  createdAt: string;
};

type CleaningContract = {
  id: number;
  propertyId: number;
  propertyName: string;
  propertyAddress: string;
  clientName?: string;
  frequency: string;
  dayOfWeek?: string;
  operativeName?: string;
  areas: string;
  isActive: number;
};

function cleaningStatusBadge(status: string) {
  const cfg: Record<string, { className: string; icon: React.ReactNode }> = {
    Scheduled: { className: "bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300", icon: <Clock className="w-3 h-3 mr-1" /> },
    Completed: { className: "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300", icon: <CheckCircle2 className="w-3 h-3 mr-1" /> },
    Missed: { className: "bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-300", icon: <XCircle className="w-3 h-3 mr-1" /> },
    Rebooked: { className: "bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-300", icon: <RefreshCw className="w-3 h-3 mr-1" /> },
    "Issue Reported": { className: "bg-orange-100 text-orange-800 dark:bg-orange-900/30 dark:text-orange-300", icon: <AlertTriangle className="w-3 h-3 mr-1" /> },
  };
  const c = cfg[status] ?? { className: "bg-muted text-muted-foreground", icon: null };
  return (
    <span className={`inline-flex items-center text-xs font-medium px-2 py-0.5 rounded-full ${c.className}`}>
      {c.icon}{status}
    </span>
  );
}

export default function CleaningPage() {
  const { user } = useAuth();
  const isAdmin = user?.role === "admin";

  const { data: logs, isLoading: logsLoading } = useQuery<CleaningLog[]>({
    queryKey: ["/api/cleaning/logs"],
  });

  const { data: contracts, isLoading: contractsLoading } = useQuery<CleaningContract[]>({
    queryKey: ["/api/cleaning/contracts"],
  });

  const isLoading = logsLoading || contractsLoading;

  // Stats
  const scheduled = (logs ?? []).filter((l) => l.status === "Scheduled").length;
  const issues = (logs ?? []).filter((l) => l.status === "Issue Reported").length;
  const totalContracts = (contracts ?? []).length;

  return (
    <div className="h-full overflow-y-auto">
      <div className="p-4 md:p-6 max-w-5xl mx-auto space-y-5">

        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center gap-3">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-0.5">
              <Sparkles className="w-5 h-5 text-primary" />
              <h1 className="text-xl font-bold">Cleaning</h1>
            </div>
            <p className="text-sm text-muted-foreground">
              {isAdmin ? "Manage communal cleaning contracts and visit logs" : "Your communal cleaning schedule and recent visits"}
            </p>
          </div>
          {isAdmin && (
            <div className="flex items-center gap-2">
              <Link href="/cleaning/new-contract">
                <Button size="sm" variant="outline" className="gap-1.5">
                  <Plus className="w-4 h-4" /> New Contract
                </Button>
              </Link>
              <Link href="/cleaning/new-log">
                <Button size="sm" className="gap-1.5">
                  <Clipboard className="w-4 h-4" /> Log Clean
                </Button>
              </Link>
            </div>
          )}
        </div>

        {/* Stats (admin) */}
        {isAdmin && (
          <div className="grid grid-cols-3 gap-3">
            <Card>
              <CardContent className="p-3 text-center">
                <div className="text-2xl font-bold text-primary">{totalContracts}</div>
                <div className="text-xs text-muted-foreground mt-0.5">Contracts</div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-3 text-center">
                <div className="text-2xl font-bold text-blue-500">{scheduled}</div>
                <div className="text-xs text-muted-foreground mt-0.5">Scheduled</div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-3 text-center">
                <div className="text-2xl font-bold text-orange-500">{issues}</div>
                <div className="text-xs text-muted-foreground mt-0.5">Issues</div>
              </CardContent>
            </Card>
          </div>
        )}

        {/* Client view: contracts / schedules */}
        {!isAdmin && (
          <>
            <div>
              <h2 className="text-base font-semibold mb-3">My Cleaning Contracts</h2>
              {contractsLoading ? (
                <div className="space-y-2">{[...Array(2)].map((_, i) => <Skeleton key={i} className="h-20 rounded-xl" />)}</div>
              ) : !contracts || contracts.length === 0 ? (
                <Card>
                  <CardContent className="py-8 text-center text-muted-foreground">
                    <Sparkles className="w-8 h-8 mx-auto mb-2 opacity-30" />
                    <p className="text-sm">No cleaning contracts found</p>
                  </CardContent>
                </Card>
              ) : (
                <div className="grid gap-3 sm:grid-cols-2">
                  {contracts.map((c) => {
                    let areas: string[] = [];
                    try { areas = JSON.parse(c.areas); } catch {}
                    return (
                      <Card key={c.id}>
                        <CardContent className="p-4">
                          <div className="font-semibold text-sm mb-0.5">{c.propertyName || c.propertyAddress}</div>
                          <div className="text-xs text-muted-foreground mb-2">{c.propertyAddress}</div>
                          <div className="flex flex-wrap gap-1.5 text-xs">
                            <Badge variant="outline">{c.frequency}</Badge>
                            {c.dayOfWeek && <Badge variant="outline">{c.dayOfWeek}s</Badge>}
                            {c.operativeName && <span className="text-muted-foreground">• {c.operativeName}</span>}
                          </div>
                          {areas.length > 0 && (
                            <div className="flex flex-wrap gap-1 mt-2">
                              {areas.map((a) => (
                                <span key={a} className="text-[10px] bg-primary/10 text-primary rounded px-1.5 py-0.5">{a}</span>
                              ))}
                            </div>
                          )}
                        </CardContent>
                      </Card>
                    );
                  })}
                </div>
              )}
            </div>
          </>
        )}

        {/* Cleaning Logs */}
        <div>
          <h2 className="text-base font-semibold mb-3">
            {isAdmin ? "All Cleaning Logs" : "Recent Visits"}
          </h2>
          {logsLoading ? (
            <div className="space-y-2">{[...Array(3)].map((_, i) => <Skeleton key={i} className="h-16 rounded-xl" />)}</div>
          ) : !logs || logs.length === 0 ? (
            <Card>
              <CardContent className="py-8 text-center text-muted-foreground">
                <Calendar className="w-8 h-8 mx-auto mb-2 opacity-30" />
                <p className="text-sm">No cleaning logs found</p>
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-2">
              {logs.map((log) => (
                <Link key={log.id} href={`/cleaning/${log.id}`}>
                  <Card className="cursor-pointer hover:border-primary/50 transition-colors">
                    <CardContent className="p-4">
                      <div className="flex items-center justify-between gap-3">
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className="font-semibold text-sm truncate">
                              {log.propertyName || log.propertyAddress}
                            </span>
                            {cleaningStatusBadge(log.status)}
                            {log.issueType && (
                              <Badge variant="outline" className="text-xs text-orange-600 border-orange-300">
                                <AlertTriangle className="w-2.5 h-2.5 mr-0.5" />{log.issueType}
                              </Badge>
                            )}
                          </div>
                          <div className="text-xs text-muted-foreground mt-0.5 flex items-center gap-2 flex-wrap">
                            <span className="flex items-center gap-0.5">
                              <Calendar className="w-3 h-3" /> {formatDate(log.scheduledDate)}
                            </span>
                            <span>• {log.operativeName}</span>
                            {isAdmin && log.propertyAddress && (
                              <span className="truncate hidden sm:inline">• {log.propertyAddress}</span>
                            )}
                          </div>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                </Link>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
