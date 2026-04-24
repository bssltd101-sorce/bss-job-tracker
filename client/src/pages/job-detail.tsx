import { useState } from "react";
import { useParams, Link } from "wouter";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useAuth } from "@/hooks/use-auth";
import { StatusBadge } from "@/components/status-badge";
import { JobProgress } from "@/components/job-progress";
import { MessageThread } from "@/components/message-thread";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Skeleton } from "@/components/ui/skeleton";
import { Separator } from "@/components/ui/separator";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import {
  formatDate, formatDateTime, formatCurrency, priorityColor,
  timeAgo, JOB_STATUSES, FILE_CATEGORIES
} from "@/lib/utils";
import {
  MapPin, Calendar, User, Pound, FileText, Image, ArrowLeft,
  Send, Lock, Clock, CheckCircle, Upload, Trash2, Download,
  ChevronDown, ChevronUp
} from "lucide-react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";

type JobDetail = {
  id: number; reference: string; propertyAddress: string; description: string;
  status: string; progress: number; jobType: string; priority: string;
  estimatedValue?: number; invoiceValue?: number; paymentStatus: string;
  startDate?: string; completedDate?: string; createdAt: string; updatedAt: string;
  clientName: string; clientEmail: string; clientId: number;
};

type Update = {
  id: number; message: string; isInternal: number; authorName: string;
  authorRole: string; createdAt: string;
};

type JobFile = {
  id: number; filename: string; originalName: string; mimeType: string;
  size: number; category: string; caption?: string; createdAt: string;
};

function formatFileSize(bytes: number) {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function isImage(mime: string) {
  return mime.startsWith("image/");
}

export default function JobDetailPage() {
  const { id } = useParams();
  const { user } = useAuth();
  const { toast } = useToast();
  const qc = useQueryClient();
  const isAdmin = user?.role === "admin";

  const [message, setMessage] = useState("");
  const [isInternal, setIsInternal] = useState(false);
  const [newStatus, setNewStatus] = useState("");
  const [newProgress, setNewProgress] = useState("");
  const [fileCaption, setFileCaption] = useState("");
  const [fileCategory, setFileCategory] = useState("other");
  const [showAdminEdit, setShowAdminEdit] = useState(false);

  const { data: job, isLoading } = useQuery<JobDetail>({ queryKey: [`/api/jobs/${id}`] });
  const { data: updates } = useQuery<Update[]>({ queryKey: [`/api/jobs/${id}/updates`] });
  const { data: files } = useQuery<JobFile[]>({ queryKey: [`/api/jobs/${id}/files`] });

  const addUpdate = useMutation({
    mutationFn: (data: { message: string; isInternal: boolean }) =>
      apiRequest("POST", `/api/jobs/${id}/updates`, data).then((r) => r.json()),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: [`/api/jobs/${id}/updates`] });
      qc.invalidateQueries({ queryKey: ["/api/notifications"] });
      qc.invalidateQueries({ queryKey: ["/api/notifications/unread-count"] });
      setMessage("");
      toast({ title: "Update posted" });
    },
    onError: () => toast({ variant: "destructive", title: "Failed to post update" }),
  });

  const updateJob = useMutation({
    mutationFn: (data: Record<string, unknown>) =>
      apiRequest("PATCH", `/api/jobs/${id}`, data).then((r) => r.json()),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: [`/api/jobs/${id}`] });
      qc.invalidateQueries({ queryKey: ["/api/jobs"] });
      qc.invalidateQueries({ queryKey: ["/api/notifications"] });
      qc.invalidateQueries({ queryKey: ["/api/notifications/unread-count"] });
      qc.invalidateQueries({ queryKey: ["/api/stats"] });
      toast({ title: "Job updated" });
      setShowAdminEdit(false);
    },
    onError: () => toast({ variant: "destructive", title: "Update failed" }),
  });

  const uploadFile = useMutation({
    mutationFn: (formData: FormData) =>
      apiRequest("POST", `/api/jobs/${id}/files`, formData).then((r) => r.json()),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: [`/api/jobs/${id}/files`] });
      setFileCaption("");
      toast({ title: "File uploaded" });
    },
    onError: () => toast({ variant: "destructive", title: "Upload failed" }),
  });

  const deleteFile = useMutation({
    mutationFn: (fileId: number) => apiRequest("DELETE", `/api/files/${fileId}`),
    onSuccess: () => qc.invalidateQueries({ queryKey: [`/api/jobs/${id}/files`] }),
  });

  function handleUpdateSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!message.trim()) return;
    addUpdate.mutate({ message: message.trim(), isInternal });
  }

  function handleStatusUpdate(e: React.FormEvent) {
    e.preventDefault();
    const payload: Record<string, unknown> = {};
    if (newStatus) payload.status = newStatus;
    if (newProgress !== "") {
      const p = parseInt(newProgress);
      if (!isNaN(p) && p >= 0 && p <= 100) payload.progress = p;
    }
    if (Object.keys(payload).length === 0) return;
    updateJob.mutate(payload);
    setNewStatus("");
    setNewProgress("");
  }

  function handleFileUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    const fd = new FormData();
    fd.append("file", file);
    fd.append("category", fileCategory);
    if (fileCaption) fd.append("caption", fileCaption);
    uploadFile.mutate(fd);
    e.target.value = "";
  }

  if (isLoading) {
    return (
      <div className="h-full overflow-y-auto p-4 md:p-6 max-w-4xl mx-auto space-y-4">
        <Skeleton className="h-6 w-40" />
        <Skeleton className="h-32 w-full" />
        <Skeleton className="h-48 w-full" />
      </div>
    );
  }
  if (!job) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="text-center">
          <p className="font-medium">Job not found</p>
          <Link href="~/"><Button variant="outline" className="mt-3">Back to dashboard</Button></Link>
        </div>
      </div>
    );
  }

  const photoFiles = files?.filter((f) => isImage(f.mimeType)) ?? [];
  const docFiles = files?.filter((f) => !isImage(f.mimeType)) ?? [];

  return (
    <div className="h-full overflow-y-auto">
      <div className="p-4 md:p-6 max-w-4xl mx-auto space-y-5">
        {/* Back */}
        <Link href="~/">
          <Button variant="ghost" size="sm" className="gap-1.5 -ml-2 text-muted-foreground">
            <ArrowLeft className="w-4 h-4" /> Back
          </Button>
        </Link>

        {/* Job header */}
        <div className="flex flex-col sm:flex-row sm:items-start gap-3">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap mb-1">
              <span className="text-xs font-mono text-muted-foreground">{job.reference}</span>
              <StatusBadge status={job.status} />
              <Badge variant="outline" className="text-xs">{job.jobType}</Badge>
              {job.priority !== "Normal" && (
                <span className={`text-xs font-semibold ${priorityColor(job.priority)}`}>{job.priority} Priority</span>
              )}
            </div>
            <h1 className="text-lg font-bold leading-snug">{job.propertyAddress}</h1>
            <p className="text-sm text-muted-foreground mt-1">{job.description}</p>
          </div>
          <div className="sm:text-right">
            <div className="text-xs text-muted-foreground">Created {formatDate(job.createdAt)}</div>
          </div>
        </div>

        {/* Progress */}
        <JobProgress progress={job.progress} className="max-w-full" />

        {/* Key details */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {[
            { icon: Calendar, label: "Start Date", value: formatDate(job.startDate) },
            { icon: CheckCircle, label: "Completed", value: formatDate(job.completedDate) },
            { icon: User, label: "Client", value: isAdmin ? job.clientName : undefined },
            { icon: FileText, label: "Est. Value", value: formatCurrency(job.estimatedValue) },
          ].filter(d => d.value !== undefined).map(({ icon: Icon, label, value }) => (
            <Card key={label}>
              <CardContent className="p-3">
                <div className="flex items-center gap-1.5 text-xs text-muted-foreground mb-1">
                  <Icon className="w-3.5 h-3.5" />
                  {label}
                </div>
                <div className="text-sm font-medium">{value}</div>
              </CardContent>
            </Card>
          ))}
        </div>

        {/* Admin edit panel */}
        {isAdmin && (
          <Card>
            <CardHeader className="pb-2 cursor-pointer" onClick={() => setShowAdminEdit(!showAdminEdit)}>
              <div className="flex items-center justify-between">
                <CardTitle className="text-sm">Admin Controls</CardTitle>
                {showAdminEdit ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
              </div>
            </CardHeader>
            {showAdminEdit && (
              <CardContent className="pt-0">
                <form onSubmit={handleStatusUpdate} className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <div className="space-y-1.5">
                    <Label className="text-xs">Status</Label>
                    <Select value={newStatus || job.status} onValueChange={setNewStatus}>
                      <SelectTrigger className="h-8 text-sm" data-testid="select-job-status">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {JOB_STATUSES.map((s) => <SelectItem key={s} value={s}>{s}</SelectItem>)}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-1.5">
                    <Label className="text-xs">Progress (%)</Label>
                    <Input
                      type="number" min={0} max={100}
                      placeholder={String(job.progress)}
                      value={newProgress}
                      onChange={(e) => setNewProgress(e.target.value)}
                      className="h-8 text-sm"
                      data-testid="input-job-progress"
                    />
                  </div>
                  <div className="flex items-end">
                    <Button type="submit" size="sm" className="w-full" disabled={updateJob.isPending} data-testid="button-update-job">
                      {updateJob.isPending ? "Saving…" : "Save Changes"}
                    </Button>
                  </div>
                </form>

                <Separator className="my-4" />

                {/* File upload */}
                <div className="space-y-3">
                  <div className="text-sm font-medium">Upload File</div>
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                    <Select value={fileCategory} onValueChange={setFileCategory}>
                      <SelectTrigger className="h-8 text-sm" data-testid="select-file-category">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {FILE_CATEGORIES.map((c) => <SelectItem key={c} value={c} className="capitalize">{c}</SelectItem>)}
                      </SelectContent>
                    </Select>
                    <Input
                      placeholder="Caption (optional)"
                      value={fileCaption}
                      onChange={(e) => setFileCaption(e.target.value)}
                      className="h-8 text-sm"
                    />
                    <label className="cursor-pointer">
                      <div className="flex items-center justify-center gap-1.5 h-8 px-3 rounded-md border border-input bg-background text-sm hover:bg-accent transition-colors">
                        <Upload className="w-3.5 h-3.5" />
                        {uploadFile.isPending ? "Uploading…" : "Choose File"}
                      </div>
                      <input type="file" className="sr-only" onChange={handleFileUpload} disabled={uploadFile.isPending} data-testid="input-file-upload" />
                    </label>
                  </div>
                </div>
              </CardContent>
            )}
          </Card>
        )}

        {/* Photos */}
        {photoFiles.length > 0 && (
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm flex items-center gap-1.5">
                <Image className="w-4 h-4" /> Photos ({photoFiles.length})
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                {photoFiles.map((f) => (
                  <div key={f.id} className="relative group rounded-lg overflow-hidden bg-muted aspect-video" data-testid={`photo-${f.id}`}>
                    <img
                      src={`/api/uploads/${f.filename}`}
                      alt={f.caption || f.originalName}
                      className="w-full h-full object-cover"
                    />
                    <div className="absolute inset-0 bg-black/0 group-hover:bg-black/40 transition-colors flex items-end">
                      <div className="p-2 text-white text-xs opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-between w-full">
                        <span className="truncate">{f.caption || f.category}</span>
                        {isAdmin && (
                          <button onClick={() => deleteFile.mutate(f.id)} className="ml-1 flex-shrink-0">
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        )}
                      </div>
                    </div>
                    <div className="absolute top-1.5 right-1.5">
                      <Badge variant="secondary" className="text-xs capitalize px-1.5 py-0">{f.category}</Badge>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}

        {/* Documents */}
        {docFiles.length > 0 && (
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm flex items-center gap-1.5">
                <FileText className="w-4 h-4" /> Documents ({docFiles.length})
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              {docFiles.map((f) => (
                <div key={f.id} className="flex items-center gap-2 p-2.5 rounded-lg border border-border bg-muted/30" data-testid={`doc-${f.id}`}>
                  <FileText className="w-4 h-4 text-muted-foreground flex-shrink-0" />
                  <div className="flex-1 min-w-0">
                    <div className="text-sm font-medium truncate">{f.caption || f.originalName}</div>
                    <div className="text-xs text-muted-foreground">{f.category} · {formatFileSize(f.size)} · {formatDate(f.createdAt)}</div>
                  </div>
                  <div className="flex items-center gap-1">
                    <a href={`/api/uploads/${f.filename}`} target="_blank" rel="noopener noreferrer">
                      <Button variant="ghost" size="icon" className="h-7 w-7" title="Download">
                        <Download className="w-3.5 h-3.5" />
                      </Button>
                    </a>
                    {isAdmin && (
                      <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => deleteFile.mutate(f.id)} title="Delete">
                        <Trash2 className="w-3.5 h-3.5 text-destructive" />
                      </Button>
                    )}
                  </div>
                </div>
              ))}
            </CardContent>
          </Card>
        )}

        {/* Timeline */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm flex items-center gap-1.5">
              <Clock className="w-4 h-4" /> Job Timeline
            </CardTitle>
          </CardHeader>
          <CardContent>
            {updates && updates.length > 0 ? (
              <div className="relative pl-8 space-y-4">
                <div className="absolute left-4 top-2 bottom-2 w-px bg-border" />
                {updates.map((u, i) => (
                  <div key={u.id} className="relative" data-testid={`update-${u.id}`}>
                    <div className={`absolute left-[-1.25rem] top-1.5 w-3 h-3 rounded-full border-2 border-background ${u.isInternal ? "bg-orange-400" : "bg-primary"}`} />
                    <div className={`rounded-lg p-3 ${u.isInternal ? "bg-orange-50 dark:bg-orange-950/20 border border-orange-200 dark:border-orange-900" : "bg-muted/30 border border-border"}`}>
                      <div className="flex items-center justify-between gap-2 mb-1">
                        <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                          <span className="font-medium text-foreground">{u.authorName}</span>
                          {u.isInternal ? (
                            <Badge variant="outline" className="text-xs px-1 py-0 text-orange-600 border-orange-300">
                              <Lock className="w-2.5 h-2.5 mr-0.5" /> Internal
                            </Badge>
                          ) : (
                            <Badge variant="outline" className="text-xs px-1 py-0">Team update</Badge>
                          )}
                        </div>
                        <span className="text-xs text-muted-foreground flex-shrink-0" title={formatDateTime(u.createdAt)}>
                          {timeAgo(u.createdAt)}
                        </span>
                      </div>
                      <p className="text-sm">{u.message}</p>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-8 text-muted-foreground">
                <Clock className="w-8 h-8 mx-auto mb-2 opacity-30" />
                <p className="text-sm">No updates yet</p>
              </div>
            )}

            {/* Post update form */}
            <Separator className="my-4" />
            <form onSubmit={handleUpdateSubmit} className="space-y-2">
              <Textarea
                placeholder={isAdmin ? "Post an update to the client…" : "Send a message to the BSS team…"}
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                className="text-sm min-h-[80px]"
                data-testid="textarea-update-message"
              />
              <div className="flex items-center justify-between">
                {isAdmin && (
                  <div className="flex items-center gap-2 text-xs text-muted-foreground">
                    <Switch
                      checked={isInternal}
                      onCheckedChange={setIsInternal}
                      id="internal-toggle"
                      data-testid="switch-internal"
                    />
                    <label htmlFor="internal-toggle" className="cursor-pointer">
                      <Lock className="w-3 h-3 inline mr-0.5" /> Internal only
                    </label>
                  </div>
                )}
                <Button
                  type="submit"
                  size="sm"
                  disabled={!message.trim() || addUpdate.isPending}
                  className="gap-1.5 ml-auto"
                  data-testid="button-post-update"
                >
                  <Send className="w-3.5 h-3.5" />
                  {addUpdate.isPending ? "Posting…" : isAdmin ? "Post Update" : "Send Message"}
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>

        {/* Message Thread */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm flex items-center gap-1.5">
              <Send className="w-4 h-4" /> Messages
            </CardTitle>
          </CardHeader>
          <CardContent>
            <MessageThread
              threadType="job"
              threadId={job.id}
              clientId={job.clientId}
            />
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
