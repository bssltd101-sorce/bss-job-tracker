import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Link } from "wouter";
import { StatusBadge } from "@/components/status-badge";
import { JobProgress } from "@/components/job-progress";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { formatDate, formatCurrency, priorityColor, JOB_STATUSES } from "@/lib/utils";
import { Plus, Search, MapPin, ArrowRight, Filter, Users } from "lucide-react";

type Job = {
  id: number; reference: string; propertyAddress: string; description: string;
  status: string; progress: number; jobType: string; priority: string;
  estimatedValue?: number; paymentStatus: string; startDate?: string;
  clientName?: string; clientId: number;
};

export default function JobsListPage() {
  const { data: jobs, isLoading } = useQuery<Job[]>({ queryKey: ["/api/jobs"] });
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");

  const filtered = (jobs ?? []).filter((j) => {
    const q = search.toLowerCase();
    const matchSearch =
      !q ||
      j.reference.toLowerCase().includes(q) ||
      j.propertyAddress.toLowerCase().includes(q) ||
      j.description.toLowerCase().includes(q) ||
      (j.clientName ?? "").toLowerCase().includes(q);
    const matchStatus = statusFilter === "all" || j.status === statusFilter;
    return matchSearch && matchStatus;
  });

  return (
    <div className="h-full overflow-y-auto">
      <div className="p-4 md:p-6 max-w-5xl mx-auto space-y-4">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-xl font-bold">All Jobs</h1>
            <p className="text-sm text-muted-foreground mt-0.5">{jobs?.length ?? 0} jobs total</p>
          </div>
          <Link href="~/jobs/new">
            <Button size="sm" className="gap-1.5" data-testid="button-new-job-list">
              <Plus className="w-4 h-4" /> New Job
            </Button>
          </Link>
        </div>

        {/* Filters */}
        <div className="flex gap-2 flex-col sm:flex-row">
          <div className="relative flex-1">
            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              placeholder="Search jobs…"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-8 h-8 text-sm"
              data-testid="input-search-jobs"
            />
          </div>
          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="h-8 text-sm w-full sm:w-40" data-testid="select-status-filter">
              <Filter className="w-3.5 h-3.5 mr-1.5" />
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Statuses</SelectItem>
              {JOB_STATUSES.map((s) => <SelectItem key={s} value={s}>{s}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>

        {/* Job list */}
        {isLoading ? (
          <div className="space-y-2">
            {[...Array(5)].map((_, i) => <Skeleton key={i} className="h-24 w-full rounded-xl" />)}
          </div>
        ) : filtered.length === 0 ? (
          <div className="text-center py-12 text-muted-foreground">
            <Search className="w-10 h-10 mx-auto mb-3 opacity-30" />
            <p className="font-medium">No jobs found</p>
            {search && <p className="text-sm mt-1">Try a different search term</p>}
          </div>
        ) : (
          <div className="space-y-2">
            {filtered.map((job) => (
              <Card key={job.id} className="hover-elevate" data-testid={`job-card-${job.id}`}>
                <CardContent className="p-4">
                  <div className="flex items-start gap-3">
                    <div className="flex-1 min-w-0">
                      <div className="flex flex-wrap items-center gap-2 mb-1.5">
                        <span className="text-xs font-mono text-muted-foreground">{job.reference}</span>
                        <StatusBadge status={job.status} size="sm" />
                        <Badge variant="outline" className="text-xs">{job.jobType}</Badge>
                        {job.priority !== "Normal" && (
                          <span className={`text-xs font-semibold ${priorityColor(job.priority)}`}>{job.priority}</span>
                        )}
                      </div>
                      <div className="flex items-start gap-1.5">
                        <MapPin className="w-3.5 h-3.5 text-muted-foreground mt-0.5 flex-shrink-0" />
                        <span className="text-sm font-medium">{job.propertyAddress}</span>
                      </div>
                      <p className="text-xs text-muted-foreground mt-1 line-clamp-1">{job.description}</p>
                      <div className="flex items-center gap-3 mt-2">
                        <div className="flex-1 max-w-[200px]">
                          <JobProgress progress={job.progress} showLabel={false} />
                          <span className="text-xs text-muted-foreground">{job.progress}% complete</span>
                        </div>
                        {job.clientName && (
                          <span className="flex items-center gap-1 text-xs text-muted-foreground">
                            <Users className="w-3 h-3" /> {job.clientName}
                          </span>
                        )}
                        {job.startDate && (
                          <span className="text-xs text-muted-foreground hidden sm:block">{formatDate(job.startDate)}</span>
                        )}
                      </div>
                    </div>
                    <Link href={`/jobs/${job.id}`}>
                      <Button variant="ghost" size="icon" className="h-8 w-8 flex-shrink-0" data-testid={`button-view-${job.id}`}>
                        <ArrowRight className="w-4 h-4" />
                      </Button>
                    </Link>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
