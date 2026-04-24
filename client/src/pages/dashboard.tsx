import { useQuery } from "@tanstack/react-query";
import { Link } from "wouter";
import { useAuth } from "@/hooks/use-auth";
import { StatusBadge } from "@/components/status-badge";
import { JobProgress } from "@/components/job-progress";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { formatDate, formatCurrency, priorityColor } from "@/lib/utils";
import {
  Briefcase, CheckCircle, Clock, Package, AlertTriangle,
  Users, Plus, ArrowRight, MapPin, Calendar
} from "lucide-react";

type Job = {
  id: number; reference: string; propertyAddress: string; description: string;
  status: string; progress: number; jobType: string; priority: string;
  estimatedValue?: number; paymentStatus: string; startDate?: string;
  clientName?: string;
};

type Stats = {
  total: number; active: number; completed: number; booked: number;
  inProgress: number; awaitingParts: number; clients: number;
};

function StatCard({ icon: Icon, label, value, color }: { icon: any; label: string; value: number; color: string }) {
  return (
    <Card>
      <CardContent className="p-4 flex items-center gap-3">
        <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${color}`}>
          <Icon className="w-5 h-5" />
        </div>
        <div>
          <div className="text-2xl font-bold leading-none">{value}</div>
          <div className="text-xs text-muted-foreground mt-0.5">{label}</div>
        </div>
      </CardContent>
    </Card>
  );
}

function JobCard({ job, isAdmin }: { job: Job; isAdmin: boolean }) {
  return (
    <Card className="hover-elevate transition-all">
      <CardContent className="p-4">
        <div className="flex items-start justify-between gap-2 mb-3">
          <div className="min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="text-xs font-mono text-muted-foreground">{job.reference}</span>
              <StatusBadge status={job.status} size="sm" />
              {job.priority !== "Normal" && (
                <span className={`text-xs font-medium ${priorityColor(job.priority)}`}>{job.priority}</span>
              )}
            </div>
            <div className="flex items-start gap-1 mt-1.5">
              <MapPin className="w-3.5 h-3.5 text-muted-foreground mt-0.5 flex-shrink-0" />
              <p className="text-sm font-medium text-foreground leading-tight">{job.propertyAddress}</p>
            </div>
          </div>
          <Badge variant="outline" className="text-xs flex-shrink-0">{job.jobType}</Badge>
        </div>

        <p className="text-sm text-muted-foreground line-clamp-2 mb-3">{job.description}</p>

        <JobProgress progress={job.progress} showLabel={true} className="mb-3" />

        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3 text-xs text-muted-foreground">
            {job.startDate && (
              <span className="flex items-center gap-1">
                <Calendar className="w-3 h-3" />
                {formatDate(job.startDate)}
              </span>
            )}
            {isAdmin && job.clientName && (
              <span className="flex items-center gap-1">
                <Users className="w-3 h-3" />
                {job.clientName}
              </span>
            )}
          </div>
          <Link href={`/jobs/${job.id}`}>
            <Button variant="ghost" size="sm" className="gap-1 text-xs h-7" data-testid={`button-view-job-${job.id}`}>
              View <ArrowRight className="w-3 h-3" />
            </Button>
          </Link>
        </div>
      </CardContent>
    </Card>
  );
}

function JobsSkeleton() {
  return (
    <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
      {[...Array(4)].map((_, i) => (
        <Card key={i}>
          <CardContent className="p-4 space-y-3">
            <Skeleton className="h-4 w-24" />
            <Skeleton className="h-4 w-full" />
            <Skeleton className="h-3 w-2/3" />
            <Skeleton className="h-2 w-full rounded-full" />
          </CardContent>
        </Card>
      ))}
    </div>
  );
}

export default function DashboardPage() {
  const { user } = useAuth();
  const isAdmin = user?.role === "admin";

  const { data: jobs, isLoading: jobsLoading } = useQuery<Job[]>({ queryKey: ["/api/jobs"] });
  const { data: stats } = useQuery<Stats>({
    queryKey: ["/api/stats"],
    enabled: isAdmin,
  });

  const activeJobs = jobs?.filter((j) => j.status !== "Completed") ?? [];
  const completedJobs = jobs?.filter((j) => j.status === "Completed") ?? [];

  return (
    <div className="h-full overflow-y-auto">
      <div className="p-4 md:p-6 max-w-5xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-xl font-bold">
              {isAdmin ? "Dashboard" : `Welcome back, ${user?.name?.split(" ")[0]}`}
            </h1>
            <p className="text-sm text-muted-foreground mt-0.5">
              {isAdmin ? "Overview of all jobs" : "Track your property jobs"}
            </p>
          </div>
          {isAdmin && (
            <Link href="~/jobs/new">
              <Button size="sm" className="gap-1.5" data-testid="button-new-job">
                <Plus className="w-4 h-4" /> New Job
              </Button>
            </Link>
          )}
        </div>

        {/* Admin stat cards */}
        {isAdmin && stats && (
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <StatCard icon={Briefcase} label="Total Jobs" value={stats.total} color="bg-primary/10 text-primary" />
            <StatCard icon={Clock} label="Active" value={stats.active} color="bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400" />
            <StatCard icon={CheckCircle} label="Completed" value={stats.completed} color="bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400" />
            <StatCard icon={Users} label="Clients" value={stats.clients} color="bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400" />
          </div>
        )}

        {/* Client summary */}
        {!isAdmin && jobs && (
          <div className="grid grid-cols-3 gap-3">
            <Card>
              <CardContent className="p-3 text-center">
                <div className="text-2xl font-bold">{jobs.length}</div>
                <div className="text-xs text-muted-foreground">Total Jobs</div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-3 text-center">
                <div className="text-2xl font-bold text-amber-600">{activeJobs.length}</div>
                <div className="text-xs text-muted-foreground">Active</div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-3 text-center">
                <div className="text-2xl font-bold text-green-600">{completedJobs.length}</div>
                <div className="text-xs text-muted-foreground">Completed</div>
              </CardContent>
            </Card>
          </div>
        )}

        {/* Active jobs */}
        {jobsLoading ? (
          <JobsSkeleton />
        ) : (
          <>
            {activeJobs.length > 0 && (
              <section>
                <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider mb-3">
                  Active Jobs ({activeJobs.length})
                </h2>
                <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                  {activeJobs.map((job) => (
                    <JobCard key={job.id} job={job} isAdmin={isAdmin} />
                  ))}
                </div>
              </section>
            )}

            {completedJobs.length > 0 && (
              <section>
                <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider mb-3">
                  Completed ({completedJobs.length})
                </h2>
                <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                  {completedJobs.map((job) => (
                    <JobCard key={job.id} job={job} isAdmin={isAdmin} />
                  ))}
                </div>
              </section>
            )}

            {jobs?.length === 0 && (
              <div className="text-center py-16 text-muted-foreground">
                <Briefcase className="w-12 h-12 mx-auto mb-4 opacity-30" />
                <p className="font-medium">No jobs yet</p>
                <p className="text-sm mt-1">
                  {isAdmin ? "Create your first job to get started." : "Your jobs will appear here once created by the BSS team."}
                </p>
                {isAdmin && (
                  <Link href="~/jobs/new">
                    <Button className="mt-4 gap-1.5" data-testid="button-create-first-job">
                      <Plus className="w-4 h-4" /> Create Job
                    </Button>
                  </Link>
                )}
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
