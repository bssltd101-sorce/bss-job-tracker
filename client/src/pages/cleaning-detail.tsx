import { useState } from "react";
import { useParams, Link } from "wouter";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useAuth } from "@/hooks/use-auth";
import { MessageThread } from "@/components/message-thread";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Separator } from "@/components/ui/separator";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  ArrowLeft, MapPin, Calendar, User, AlertTriangle,
  Image, Upload, ChevronDown, ChevronUp, MessageSquare, CheckCircle2,
  Clock, XCircle, RefreshCw,
} from "lucide-react";
import { formatDate, formatDateTime } from "@/lib/utils";

type CleaningLog = {
  id: number;
  contractId: number;
  propertyId: number;
  propertyName: string;
  propertyAddress: string;
  clientId?: number;
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
  contractRef?: string;
  frequency: string;
  dayOfWeek?: string;
  operativeName?: string;
};

type CleaningFile = {
  id: number;
  logId: number;
  filename: string;
  originalName: string;
  mimeType: string;
  size: number;
  createdAt: string;
};

const CLEANING_STATUSES = ["Scheduled", "Completed", "Missed", "Rebooked", "Issue Reported"];

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
    <span className={`inline-flex items-center text-xs font-semibold px-2.5 py-0.5 rounded-full ${c.className}`}>
      {c.icon}{status}
    </span>
  );
}

function isImage(mime: string) {
  return mime.startsWith("image/");
}

export default function CleaningDetailPage() {
  const { id } = useParams();
  const { user } = useAuth();
  const { toast } = useToast();
  const qc = useQueryClient();
  const isAdmin = user?.role === "admin";

  const [showEdit, setShowEdit] = useState(false);
  const [newStatus, setNewStatus] = useState("");
  const [newNotes, setNewNotes] = useState("");

  const { data: log, isLoading } = useQuery<CleaningLog>({ queryKey: [`/api/cleaning/logs/${id}`] });
  const { data: files } = useQuery<CleaningFile[]>({ queryKey: [`/api/cleaning/logs/${id}/files`] });
  const { data: contract } = useQuery<CleaningContract>({
    queryKey: [`/api/cleaning/contracts/${log?.contractId}`],
    enabled: !!log?.contractId,
  });

  const updateLog = useMutation({
    mutationFn: (data: Record<string, unknown>) =>
      apiRequest("PATCH", `/api/cleaning/logs/${id}`, data).then((r) => r.json()),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: [`/api/cleaning/logs/${id}`] });
      qc.invalidateQueries({ queryKey: ["/api/cleaning/logs"] });
      toast({ title: "Log updated" });
      setShowEdit(false);
    },
    onError: () => toast({ variant: "destructive", title: "Update failed" }),
  });

  const uploadFiles = useMutation({
    mutationFn: (formData: FormData) =>
      apiRequest("POST", `/api/cleaning/logs/${id}/files`, formData).then((r) => r.json()),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: [`/api/cleaning/logs/${id}/files`] });
      toast({ title: "Photos uploaded" });
    },
    onError: () => toast({ variant: "destructive", title: "Upload failed" }),
  });

  function handleStatusUpdate(e: React.FormEvent) {
    e.preventDefault();
    const payload: Record<string, unknown> = {};
    if (newStatus) payload.status = newStatus;
    if (newNotes.trim()) payload.notes = newNotes.trim();
    if (Object.keys(payload).length === 0) return;
    updateLog.mutate(payload);
  }

  function handleFileUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const fileList = e.target.files;
    if (!fileList || fileList.length === 0) return;
    const fd = new FormData();
    for (let i = 0; i < fileList.length; i++) {
      fd.append("files", fileList[i]);
    }
    uploadFiles.mutate(fd);
    e.target.value = "";
  }

  if (isLoading) {
    return (
      <div className="h-full overflow-y-auto p-4 md:p-6 max-w-3xl mx-auto space-y-4">
        <Skeleton className="h-6 w-40" />
        <Skeleton className="h-32 w-full" />
        <Skeleton className="h-48 w-full" />
      </div>
    );
  }

  if (!log) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="text-center">
          <p className="font-medium">Cleaning log not found</p>
          <Link href="~/cleaning">
            <Button variant="outline" className="mt-3">Back to Cleaning</Button>
          </Link>
        </div>
      </div>
    );
  }

  let areas: string[] = [];
  try { areas = JSON.parse(log.areasCompleted); } catch {}

  const photoFiles = (files ?? []).filter((f) => isImage(f.mimeType));
  const clientId = log.clientId ?? 0;

  return (
    <div className="h-full overflow-y-auto">
      <div className="p-4 md:p-6 max-w-3xl mx-auto space-y-5">

        {/* Back */}
        <Link href="~/cleaning">
          <Button variant="ghost" size="sm" className="gap-1.5 -ml-2 text-muted-foreground">
            <ArrowLeft className="w-4 h-4" /> Back to Cleaning
          </Button>
        </Link>

        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-start gap-3">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap mb-1">
              {cleaningStatusBadge(log.status)}
              {contract?.contractRef && (
                <span className="inline-flex items-center gap-1 text-xs font-mono font-semibold text-primary bg-primary/10 px-2.5 py-0.5 rounded-full">
                  {contract.contractRef}
                </span>
              )}
            </div>
            <h1 className="text-lg font-bold leading-snug">
              {log.propertyName || log.propertyAddress}
            </h1>
            <div className="flex items-center gap-1.5 text-sm text-muted-foreground mt-0.5">
              <MapPin className="w-3.5 h-3.5" />
              {log.propertyAddress}
            </div>
          </div>
        </div>

        {/* Key Details */}
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
          <Card>
            <CardContent className="p-3">
              <div className="flex items-center gap-1.5 text-xs text-muted-foreground mb-1">
                <User className="w-3.5 h-3.5" /> Operative
              </div>
              <div className="text-sm font-medium">{log.operativeName}</div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-3">
              <div className="flex items-center gap-1.5 text-xs text-muted-foreground mb-1">
                <Calendar className="w-3.5 h-3.5" /> Scheduled
              </div>
              <div className="text-sm font-medium">{formatDate(log.scheduledDate)}</div>
            </CardContent>
          </Card>
          {log.completedDate && (
            <Card>
              <CardContent className="p-3">
                <div className="flex items-center gap-1.5 text-xs text-muted-foreground mb-1">
                  <CheckCircle2 className="w-3.5 h-3.5" /> Completed
                </div>
                <div className="text-sm font-medium">{formatDate(log.completedDate)}</div>
              </CardContent>
            </Card>
          )}
        </div>

        {/* Areas */}
        {areas.length > 0 && (
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm">Areas Cleaned</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex flex-wrap gap-1.5">
                {areas.map((a) => (
                  <span key={a} className="text-xs bg-primary/10 text-primary rounded-full px-3 py-1 font-medium">
                    {a}
                  </span>
                ))}
              </div>
            </CardContent>
          </Card>
        )}

        {/* Notes */}
        {log.notes && (
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm">Operative Notes</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground">{log.notes}</p>
            </CardContent>
          </Card>
        )}

        {/* Issue Section */}
        {log.issueType && (
          <Card className="border-orange-300 dark:border-orange-800">
            <CardContent className="p-4">
              <div className="flex items-start gap-2">
                <AlertTriangle className="w-4 h-4 text-orange-500 mt-0.5 flex-shrink-0" />
                <div>
                  <div className="font-semibold text-sm text-orange-700 dark:text-orange-400 mb-1">
                    Issue Reported: {log.issueType}
                  </div>
                  <p className="text-sm text-muted-foreground">{log.issueDescription}</p>
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Admin Edit Panel */}
        {isAdmin && (
          <Card>
            <CardHeader
              className="pb-2 cursor-pointer"
              onClick={() => setShowEdit(!showEdit)}
            >
              <div className="flex items-center justify-between">
                <CardTitle className="text-sm">Admin Controls</CardTitle>
                {showEdit ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
              </div>
            </CardHeader>
            {showEdit && (
              <CardContent className="pt-0 space-y-4">
                <form onSubmit={handleStatusUpdate} className="space-y-3">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div className="space-y-1.5">
                      <Label className="text-xs">Status</Label>
                      <Select value={newStatus || log.status} onValueChange={setNewStatus}>
                        <SelectTrigger className="h-8 text-sm">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {CLEANING_STATUSES.map((s) => (
                            <SelectItem key={s} value={s}>{s}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="flex items-end">
                      <Button type="submit" size="sm" className="w-full" disabled={updateLog.isPending}>
                        {updateLog.isPending ? "Saving…" : "Update Status"}
                      </Button>
                    </div>
                  </div>
                  <div className="space-y-1.5">
                    <Label className="text-xs">Add Note</Label>
                    <Textarea
                      value={newNotes}
                      onChange={(e) => setNewNotes(e.target.value)}
                      placeholder="Update notes…"
                      className="text-sm min-h-[60px]"
                    />
                  </div>
                </form>

                <Separator />

                <div className="space-y-2">
                  <Label className="text-xs">Upload Photos</Label>
                  <label className="cursor-pointer">
                    <div className="flex items-center justify-center gap-1.5 h-9 px-3 rounded-md border border-dashed border-input bg-background text-sm hover:bg-accent transition-colors">
                      <Upload className="w-3.5 h-3.5" />
                      {uploadFiles.isPending ? "Uploading…" : "Choose Photos"}
                    </div>
                    <input
                      type="file"
                      className="sr-only"
                      multiple
                      accept="image/*"
                      onChange={handleFileUpload}
                      disabled={uploadFiles.isPending}
                    />
                  </label>
                </div>
              </CardContent>
            )}
          </Card>
        )}

        {/* Photo Gallery */}
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
                  <div key={f.id} className="rounded-lg overflow-hidden bg-muted aspect-video">
                    <img
                      src={`/api/uploads/${f.filename}`}
                      alt={f.originalName}
                      className="w-full h-full object-cover"
                    />
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}

        {/* Message Thread */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm flex items-center gap-1.5">
              <MessageSquare className="w-4 h-4" /> Messages
            </CardTitle>
          </CardHeader>
          <CardContent>
            <MessageThread
              threadType="cleaning"
              threadId={log.id}
              clientId={clientId}
            />
          </CardContent>
        </Card>

      </div>
    </div>
  );
}
