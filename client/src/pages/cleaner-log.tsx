import { useState, useRef, useCallback } from "react";
import { useRoute, useLocation } from "wouter";
import { useQuery } from "@tanstack/react-query";
import { useAuth } from "@/hooks/use-auth";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  CheckCircle2,
  ChevronLeft,
  Camera,
  X,
  AlertTriangle,
  Loader2,
} from "lucide-react";

const MAX_PHOTOS = 20;

const STATUS_OPTIONS = [
  "Completed",
  "Missed",
  "Rebooked",
  "Issue Reported",
] as const;

const ISSUE_TYPES = [
  "Damage",
  "Leak",
  "Lighting Fault",
  "Fly-tipping",
  "Health & Safety",
  "Other",
] as const;

interface ContractDetail {
  id: number;
  propertyId: number;
  frequency: string;
  dayOfWeek: string | null;
  operativeName: string | null;
  areas: string;
  notes: string | null;
  propertyName?: string;
  propertyAddress?: string;
}

function todayString() {
  return new Date().toISOString().slice(0, 10);
}

function currentTimeString() {
  const d = new Date();
  return `${String(d.getHours()).padStart(2, "0")}:${String(d.getMinutes()).padStart(2, "0")}`;
}

export default function CleanerLogPage() {
  const [, params] = useRoute("/cleaner/log/:contractId");
  const contractId = Number(params?.contractId);
  const [, navigate] = useLocation();
  const { user } = useAuth();
  const { toast } = useToast();

  // Fetch contract details
  const { data: contract, isLoading } = useQuery<ContractDetail>({
    queryKey: [`/api/cleaning/contracts/${contractId}`],
    enabled: !!contractId,
  });

  // Form state
  const [operativeName, setOperativeName] = useState(user?.name ?? "");
  const [date, setDate] = useState(todayString());
  const [timeCompleted, setTimeCompleted] = useState(currentTimeString());
  const [status, setStatus] = useState<string>("Completed");
  const [areasChecked, setAreasChecked] = useState<string[]>([]);
  const [notes, setNotes] = useState("");
  const [issueType, setIssueType] = useState("");
  const [issueDescription, setIssueDescription] = useState("");

  // Photo state
  const [photos, setPhotos] = useState<File[]>([]);
  const [photoPreviews, setPhotoPreviews] = useState<string[]>([]);
  const [photoError, setPhotoError] = useState("");
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Submission state
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  // Pre-fill areas once contract loads
  const [areasInitialised, setAreasInitialised] = useState(false);
  if (contract && !areasInitialised) {
    try {
      const parsed: string[] = JSON.parse(contract.areas);
      setAreasChecked(parsed);
    } catch {}
    setAreasInitialised(true);
  }

  const contractAreas: string[] = (() => {
    try { return contract ? JSON.parse(contract.areas) : []; } catch { return []; }
  })();

  function toggleArea(area: string) {
    setAreasChecked((prev) =>
      prev.includes(area) ? prev.filter((a) => a !== area) : [...prev, area]
    );
  }

  const handleFileChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    setPhotoError("");
    const incoming = Array.from(e.target.files ?? []);
    if (incoming.length === 0) return;

    const combined = [...photos, ...incoming];
    if (combined.length > MAX_PHOTOS) {
      setPhotoError(`Maximum ${MAX_PHOTOS} photos per visit`);
      // Only take up to MAX_PHOTOS
      const allowed = incoming.slice(0, MAX_PHOTOS - photos.length);
      if (allowed.length === 0) return;
      const newPreviews = allowed.map((f) => URL.createObjectURL(f));
      setPhotos((p) => [...p, ...allowed]);
      setPhotoPreviews((p) => [...p, ...newPreviews]);
    } else {
      const newPreviews = incoming.map((f) => URL.createObjectURL(f));
      setPhotos((p) => [...p, ...incoming]);
      setPhotoPreviews((p) => [...p, ...newPreviews]);
    }
    // Reset file input so same file can be re-added if removed
    if (fileInputRef.current) fileInputRef.current.value = "";
  }, [photos]);

  function removePhoto(index: number) {
    setPhotoError("");
    URL.revokeObjectURL(photoPreviews[index]);
    setPhotos((p) => p.filter((_, i) => i !== index));
    setPhotoPreviews((p) => p.filter((_, i) => i !== index));
  }

  async function handleSubmit() {
    if (!contract) return;
    setSubmitting(true);

    try {
      // 1. Create the cleaning log
      const logPayload = {
        contractId,
        propertyId: contract.propertyId,
        operativeName,
        scheduledDate: date,
        completedDate: status === "Completed" || status === "Issue Reported" ? date : null,
        status,
        areasCompleted: JSON.stringify(areasChecked),
        notes: notes || null,
        issueType: status === "Issue Reported" ? issueType || null : null,
        issueDescription: status === "Issue Reported" ? issueDescription || null : null,
        createdAt: "",
      };

      const logRes = await apiRequest("POST", "/api/cleaning/logs", logPayload);
      if (!logRes.ok) throw new Error("Failed to create log");
      const log = await logRes.json();

      // 2. Upload photos if any
      if (photos.length > 0) {
        const formData = new FormData();
        photos.forEach((file) => formData.append("files", file));
        await fetch(`/api/cleaning/logs/${log.id}/files`, {
          method: "POST",
          body: formData,
          credentials: "include",
        });
      }

      setSubmitted(true);
    } catch {
      toast({
        variant: "destructive",
        title: "Submission failed",
        description: "Something went wrong. Please try again.",
      });
    } finally {
      setSubmitting(false);
    }
  }

  // ── Success screen ──
  if (submitted) {
    return (
      <div className="min-h-dvh bg-background flex flex-col items-center justify-center px-6 gap-6 text-center">
        <div className="w-20 h-20 rounded-full bg-green-500/10 flex items-center justify-center">
          <CheckCircle2 className="w-10 h-10 text-green-500" />
        </div>
        <div className="space-y-1.5">
          <h1 className="text-xl font-bold">Clean logged successfully!</h1>
          <p className="text-sm text-muted-foreground">
            Your visit has been recorded for {contract?.propertyName ?? "this site"}.
          </p>
        </div>
        <div className="flex flex-col gap-3 w-full max-w-xs">
          <Button
            className="w-full font-semibold"
            onClick={() => {
              setSubmitted(false);
              setPhotos([]);
              setPhotoPreviews([]);
              setNotes("");
              setIssueType("");
              setIssueDescription("");
              setStatus("Completed");
              setDate(todayString());
              setTimeCompleted(currentTimeString());
              setAreasInitialised(false);
            }}
          >
            Log Another Clean
          </Button>
          <Button
            variant="outline"
            className="w-full"
            onClick={() => navigate("/")}
          >
            ← Back to Sites
          </Button>
        </div>
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="min-h-dvh flex items-center justify-center">
        <Loader2 className="w-6 h-6 animate-spin text-[#E8A020]" />
      </div>
    );
  }

  return (
    <div className="min-h-dvh bg-background pb-10">
      {/* Sub-header */}
      <div className="bg-muted/40 border-b border-border px-4 py-3 flex items-center gap-3">
        <button
          onClick={() => navigate("/")}
          className="text-muted-foreground hover:text-foreground transition-colors"
          aria-label="Back"
        >
          <ChevronLeft className="w-5 h-5" />
        </button>
        <div>
          <p className="text-xs text-muted-foreground">Logging clean for</p>
          <p className="text-sm font-semibold text-foreground leading-tight">
            {contract?.propertyName ?? "Loading…"}
          </p>
        </div>
      </div>

      <div className="px-4 pt-5 space-y-6">

        {/* ── Operative & Date / Time ── */}
        <section className="space-y-4">
          <h2 className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
            Visit Details
          </h2>

          <div className="space-y-1.5">
            <Label htmlFor="operative-name" className="text-sm font-medium">
              Operative name
            </Label>
            <Input
              id="operative-name"
              value={operativeName}
              onChange={(e) => setOperativeName(e.target.value)}
              className="h-12 text-base"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label htmlFor="date" className="text-sm font-medium">
                Date
              </Label>
              <Input
                id="date"
                type="date"
                value={date}
                onChange={(e) => setDate(e.target.value)}
                className="h-12 text-base"
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="time-completed" className="text-sm font-medium">
                Time completed
              </Label>
              <Input
                id="time-completed"
                type="time"
                value={timeCompleted}
                onChange={(e) => setTimeCompleted(e.target.value)}
                className="h-12 text-base"
              />
            </div>
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="status" className="text-sm font-medium">
              Status
            </Label>
            <Select value={status} onValueChange={setStatus}>
              <SelectTrigger id="status" className="h-12 text-base">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {STATUS_OPTIONS.map((s) => (
                  <SelectItem key={s} value={s}>{s}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </section>

        {/* ── Areas cleaned ── */}
        {contractAreas.length > 0 && (
          <section className="space-y-3">
            <h2 className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
              Areas Cleaned
            </h2>
            <div className="space-y-2.5">
              {contractAreas.map((area) => (
                <div key={area} className="flex items-center gap-3">
                  <Checkbox
                    id={`area-${area}`}
                    checked={areasChecked.includes(area)}
                    onCheckedChange={() => toggleArea(area)}
                    className="w-5 h-5"
                  />
                  <Label
                    htmlFor={`area-${area}`}
                    className="text-base font-normal cursor-pointer"
                  >
                    {area}
                  </Label>
                </div>
              ))}
            </div>
          </section>
        )}

        {/* ── Notes ── */}
        <section className="space-y-2">
          <h2 className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
            Notes
          </h2>
          <Textarea
            placeholder="Any notes about this visit…"
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            className="min-h-[100px] text-base resize-none"
          />
        </section>

        {/* ── Issue section ── */}
        {status === "Issue Reported" && (
          <section className="space-y-4 rounded-xl border border-amber-500/30 bg-amber-500/5 p-4">
            <div className="flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 text-amber-500 flex-shrink-0" />
              <h2 className="text-sm font-semibold text-amber-600 dark:text-amber-400">
                Issue Details
              </h2>
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="issue-type" className="text-sm font-medium">
                Issue type
              </Label>
              <Select value={issueType} onValueChange={setIssueType}>
                <SelectTrigger id="issue-type" className="h-12 text-base">
                  <SelectValue placeholder="Select issue type…" />
                </SelectTrigger>
                <SelectContent>
                  {ISSUE_TYPES.map((t) => (
                    <SelectItem key={t} value={t}>{t}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="issue-description" className="text-sm font-medium">
                Issue description
              </Label>
              <Textarea
                id="issue-description"
                placeholder="Describe the issue in detail…"
                value={issueDescription}
                onChange={(e) => setIssueDescription(e.target.value)}
                className="min-h-[100px] text-base resize-none"
              />
            </div>
          </section>
        )}

        {/* ── Photo upload ── */}
        <section className="space-y-3">
          <div className="flex items-center justify-between">
            <h2 className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
              Photos
            </h2>
            <span
              className={`text-xs font-medium tabular-nums ${
                photos.length >= MAX_PHOTOS ? "text-amber-500" : "text-muted-foreground"
              }`}
            >
              {photos.length} of {MAX_PHOTOS} photos added
            </span>
          </div>

          {/* Error message */}
          {photoError && (
            <div className="flex items-center gap-2 rounded-lg bg-destructive/10 border border-destructive/20 px-3 py-2">
              <AlertTriangle className="w-4 h-4 text-destructive flex-shrink-0" />
              <p className="text-xs font-medium text-destructive">{photoError}</p>
            </div>
          )}

          {/* Upload tap area */}
          {photos.length < MAX_PHOTOS && (
            <>
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                multiple
                className="sr-only"
                id="photo-upload"
                onChange={handleFileChange}
              />
              <label
                htmlFor="photo-upload"
                className="flex flex-col items-center justify-center gap-3 border-2 border-dashed border-border rounded-2xl py-8 cursor-pointer hover:border-[#E8A020]/50 hover:bg-[#E8A020]/5 transition-colors active:scale-[0.98]"
              >
                <div className="w-12 h-12 rounded-full bg-muted flex items-center justify-center">
                  <Camera className="w-6 h-6 text-muted-foreground" />
                </div>
                <div className="text-center">
                  <p className="text-sm font-semibold text-foreground">Tap to add photos</p>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    Up to {MAX_PHOTOS - photos.length} more photo{MAX_PHOTOS - photos.length !== 1 ? "s" : ""} allowed
                  </p>
                </div>
              </label>
            </>
          )}

          {photos.length >= MAX_PHOTOS && (
            <div className="flex items-center gap-2 rounded-lg bg-amber-500/10 border border-amber-500/20 px-3 py-2">
              <AlertTriangle className="w-4 h-4 text-amber-500 flex-shrink-0" />
              <p className="text-xs font-medium text-amber-600 dark:text-amber-400">
                Maximum {MAX_PHOTOS} photos per visit
              </p>
            </div>
          )}

          {/* Thumbnails */}
          {photoPreviews.length > 0 && (
            <div className="grid grid-cols-3 gap-2.5">
              {photoPreviews.map((src, i) => (
                <div key={i} className="relative aspect-square rounded-xl overflow-hidden bg-muted">
                  <img
                    src={src}
                    alt={`Photo ${i + 1}`}
                    className="w-full h-full object-cover"
                  />
                  <button
                    type="button"
                    onClick={() => removePhoto(i)}
                    className="absolute top-1 right-1 w-6 h-6 rounded-full bg-black/60 flex items-center justify-center hover:bg-black/80 transition-colors"
                    aria-label={`Remove photo ${i + 1}`}
                  >
                    <X className="w-3.5 h-3.5 text-white" />
                  </button>
                  <span className="absolute bottom-1 left-1 text-[10px] text-white bg-black/50 rounded px-1 py-0.5 font-medium tabular-nums">
                    {i + 1}
                  </span>
                </div>
              ))}
            </div>
          )}
        </section>

        {/* ── Submit ── */}
        <div className="pt-2 pb-4">
          <Button
            className="w-full h-14 text-base font-bold bg-[#E8A020] hover:bg-[#d4911c] text-white rounded-2xl"
            disabled={submitting || !operativeName || !date}
            onClick={handleSubmit}
          >
            {submitting ? (
              <span className="flex items-center gap-2">
                <Loader2 className="w-5 h-5 animate-spin" />
                Submitting…
              </span>
            ) : (
              "Submit Clean Log"
            )}
          </Button>
        </div>
      </div>
    </div>
  );
}
