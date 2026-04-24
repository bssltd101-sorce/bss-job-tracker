import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Link } from "wouter";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { apiRequest } from "@/lib/queryClient";
import { formatDateTime, timeAgo } from "@/lib/utils";
import { Bell, BellOff, CheckCheck, ArrowRight } from "lucide-react";
import { cn } from "@/lib/utils";

type Notification = {
  id: number; userId: number; jobId?: number; message: string;
  isRead: number; createdAt: string;
};

export default function NotificationsPage() {
  const qc = useQueryClient();
  const { data: notifs, isLoading } = useQuery<Notification[]>({ queryKey: ["/api/notifications"] });

  const markRead = useMutation({
    mutationFn: (id: number) => apiRequest("PATCH", `/api/notifications/${id}/read`),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["/api/notifications"] });
      qc.invalidateQueries({ queryKey: ["/api/notifications/unread-count"] });
    },
  });

  const markAllRead = useMutation({
    mutationFn: () => apiRequest("PATCH", "/api/notifications/read-all"),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["/api/notifications"] });
      qc.invalidateQueries({ queryKey: ["/api/notifications/unread-count"] });
    },
  });

  const unread = notifs?.filter((n) => !n.isRead).length ?? 0;

  return (
    <div className="h-full overflow-y-auto">
      <div className="p-4 md:p-6 max-w-3xl mx-auto space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-xl font-bold">Notifications</h1>
            <p className="text-sm text-muted-foreground mt-0.5">
              {unread > 0 ? `${unread} unread` : "All caught up"}
            </p>
          </div>
          {unread > 0 && (
            <Button
              variant="outline" size="sm"
              className="gap-1.5"
              onClick={() => markAllRead.mutate()}
              disabled={markAllRead.isPending}
              data-testid="button-mark-all-read"
            >
              <CheckCheck className="w-4 h-4" /> Mark all read
            </Button>
          )}
        </div>

        {isLoading ? (
          <div className="space-y-2">
            {[...Array(4)].map((_, i) => <Skeleton key={i} className="h-16 rounded-xl" />)}
          </div>
        ) : !notifs || notifs.length === 0 ? (
          <div className="text-center py-16 text-muted-foreground">
            <BellOff className="w-12 h-12 mx-auto mb-4 opacity-30" />
            <p className="font-medium">No notifications yet</p>
            <p className="text-sm mt-1">Updates on your jobs will appear here</p>
          </div>
        ) : (
          <div className="space-y-2">
            {notifs.map((n) => (
              <Card
                key={n.id}
                className={cn("transition-all", !n.isRead && "border-primary/30 bg-primary/5 dark:bg-primary/5")}
                data-testid={`notification-${n.id}`}
              >
                <CardContent className="p-3 flex items-start gap-3">
                  <div className={cn(
                    "w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5",
                    n.isRead ? "bg-muted text-muted-foreground" : "bg-primary/10 text-primary"
                  )}>
                    <Bell className="w-4 h-4" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className={cn("text-sm", !n.isRead && "font-medium")}>{n.message}</p>
                    <p className="text-xs text-muted-foreground mt-0.5" title={formatDateTime(n.createdAt)}>
                      {timeAgo(n.createdAt)}
                    </p>
                  </div>
                  <div className="flex items-center gap-1 flex-shrink-0">
                    {n.jobId && (
                      <Link href={`/jobs/${n.jobId}`}>
                        <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => !n.isRead && markRead.mutate(n.id)} title="View job">
                          <ArrowRight className="w-3.5 h-3.5" />
                        </Button>
                      </Link>
                    )}
                    {!n.isRead && (
                      <button
                        onClick={() => markRead.mutate(n.id)}
                        className="w-2 h-2 rounded-full bg-primary flex-shrink-0"
                        title="Mark as read"
                        aria-label="Mark as read"
                        data-testid={`button-mark-read-${n.id}`}
                      />
                    )}
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
