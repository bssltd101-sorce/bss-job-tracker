import { useState, useEffect } from "react";
import { Link, useLocation } from "wouter";
import { useQuery, useMutation } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { ArrowLeft, Clipboard, Upload } from "lucide-react";

type CleaningContract = {
  id: number;
  propertyId: number;
  propertyName: string;
  propertyAddress: string;
  operativeName?: string;
  areas: string;
  frequency: string;
  dayOfWeek?: string;
};

const STATUSES = ["Scheduled", "Completed", "Missed", "Rebooked", "Issue Reported"];
const ISSUE_TYPES = ["Damage", "Leak", "Lighting Fault", "Fly-tipping", "Health & Safety", "Other"];
const AREA_OPTIONS = ["Hallways", "Staircases", "Landings", "Entrance", "Bin Store", "Cupboards", "Courtyards", "External Areas"];

export default function NewCleaningLogPage() {
  const { toast } = useToast();
  const [, navigate] = useLocation();

  const [contractId, setContractId] = useState("");
  const [operativeName, setOperativeName] = useState("");
  const [scheduledDate, setScheduledDate] = useState("");
  const [status, setStatus] = useState("Scheduled");
  const [selectedAreas, setSelectedAreas] = useState<string[]>([]);
  const [notes, setNotes] = useState("");
  const [issueType, setIssueType] = useState("");
  const [issueDescription, setIssueDescription] = useState("");
  const [files, setFiles] = useState<FileList | null>(null);

  const { data: contracts } = useQuery<CleaningContract[]>({ queryKey: ["/api/cleaning/contracts"] });

  // Pre-fill from selected contract
  useEffect(() => {
    if (!contractId || !contracts) return;
    const c = contracts.find((c) => String(c.id) === contractId);
    if (!c) return;
    if (c.operativeName) setOperativeName(c.operativeName);
    try {
      const areas = JSON.parse(c.areas);
      setSelectedAreas(Array.isArray(areas) ? areas : []);
    } catch {}
  }, [contractId, contracts]);

  const selectedContract = contracts?.find((c) => String(c.id) === contractId);

  const create = useMutation({
    mutationFn: async (data: FormData | Record<string, unknown>) => {
      const response = await apiRequest("POST", "/api/cleaning/logs", data);
      return response.json();
    },
    onSuccess: async (newLog) => {
      // Upload files if any
      if (files && files.length > 0) {
        const fd = new FormData();
        for (let i = 0; i < files.length; i++) {
          fd.append("files", files[i]);
        }
        await apiRequest("POST", `/api/cleaning/logs/${newLog.id}/files`, fd);
      }
      toast({ title: "Cleaning log created" });
      navigate("/cleaning");
    },
    onError: (e) => toast({ variant: "destructive", title: "Failed to create log", description: String(e) }),
  });

  function toggleArea(area: string) {
    setSelectedAreas((prev) =>
      prev.includes(area) ? prev.filter((a) => a !== area) : [...prev, area]
    );
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!contractId || !operativeName || !scheduledDate) {
      toast({ variant: "destructive", title: "Please fill all required fields" });
      return;
    }
    const payload: Record<string, unknown> = {
      contractId: Number(contractId),
      propertyId: selectedContract?.propertyId,
      operativeName,
      scheduledDate,
      status,
      areasCompleted: selectedAreas,
      notes: notes || null,
      issueType: status === "Issue Reported" ? issueType || null : null,
      issueDescription: status === "Issue Reported" ? issueDescription || null : null,
    };
    create.mutate(payload);
  }

  return (
    <div className="h-full overflow-y-auto">
      <div className="p-4 md:p-6 max-w-2xl mx-auto space-y-5">
        <Link href="/cleaning">
          <Button variant="ghost" size="sm" className="gap-1.5 -ml-2 text-muted-foreground">
            <ArrowLeft className="w-4 h-4" /> Back to Cleaning
          </Button>
        </Link>

        <div className="flex items-center gap-2">
          <Clipboard className="w-5 h-5 text-primary" />
          <h1 className="text-xl font-bold">Log a Clean</h1>
        </div>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm">Visit Details</CardTitle>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-1.5">
                <Label className="text-xs">Contract *</Label>
                <Select value={contractId} onValueChange={setContractId}>
                  <SelectTrigger className="text-sm">
                    <SelectValue placeholder="Select cleaning contract…" />
                  </SelectTrigger>
                  <SelectContent>
                    {(contracts ?? []).map((c) => (
                      <SelectItem key={c.id} value={String(c.id)}>
                        {c.propertyName || c.propertyAddress} — {c.frequency}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <Label className="text-xs">Operative Name *</Label>
                  <Input
                    value={operativeName}
                    onChange={(e) => setOperativeName(e.target.value)}
                    placeholder="e.g. Maria Santos"
                    className="text-sm"
                    required
                  />
                </div>

                <div className="space-y-1.5">
                  <Label className="text-xs">Scheduled Date *</Label>
                  <Input
                    type="date"
                    value={scheduledDate}
                    onChange={(e) => setScheduledDate(e.target.value)}
                    className="text-sm"
                    required
                  />
                </div>
              </div>

              <div className="space-y-1.5">
                <Label className="text-xs">Status</Label>
                <Select value={status} onValueChange={setStatus}>
                  <SelectTrigger className="text-sm">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {STATUSES.map((s) => <SelectItem key={s} value={s}>{s}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label className="text-xs">Areas Completed</Label>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                  {AREA_OPTIONS.map((area) => (
                    <div key={area} className="flex items-center gap-2">
                      <Checkbox
                        id={`log-area-${area}`}
                        checked={selectedAreas.includes(area)}
                        onCheckedChange={() => toggleArea(area)}
                      />
                      <label htmlFor={`log-area-${area}`} className="text-xs cursor-pointer">{area}</label>
                    </div>
                  ))}
                </div>
              </div>

              <div className="space-y-1.5">
                <Label className="text-xs">Notes</Label>
                <Textarea
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder="Any notes from the visit…"
                  className="text-sm min-h-[70px]"
                />
              </div>

              {/* Issue section — only visible when Issue Reported */}
              {status === "Issue Reported" && (
                <div className="space-y-3 rounded-lg border border-orange-200 dark:border-orange-800 bg-orange-50 dark:bg-orange-950/20 p-3">
                  <div className="text-xs font-semibold text-orange-700 dark:text-orange-400">Issue Details</div>
                  <div className="space-y-1.5">
                    <Label className="text-xs">Issue Type</Label>
                    <Select value={issueType} onValueChange={setIssueType}>
                      <SelectTrigger className="text-sm">
                        <SelectValue placeholder="Select issue type…" />
                      </SelectTrigger>
                      <SelectContent>
                        {ISSUE_TYPES.map((t) => <SelectItem key={t} value={t}>{t}</SelectItem>)}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-1.5">
                    <Label className="text-xs">Issue Description</Label>
                    <Textarea
                      value={issueDescription}
                      onChange={(e) => setIssueDescription(e.target.value)}
                      placeholder="Describe the issue in detail…"
                      className="text-sm min-h-[70px]"
                    />
                  </div>
                </div>
              )}

              {/* Photo Upload */}
              <div className="space-y-1.5">
                <Label className="text-xs">Photos (optional)</Label>
                <label className="cursor-pointer">
                  <div className="flex items-center justify-center gap-1.5 h-9 px-3 rounded-md border border-dashed border-input bg-background text-sm hover:bg-accent transition-colors">
                    <Upload className="w-3.5 h-3.5" />
                    {files && files.length > 0 ? `${files.length} file(s) selected` : "Choose Photos"}
                  </div>
                  <input
                    type="file"
                    className="sr-only"
                    multiple
                    accept="image/*"
                    onChange={(e) => setFiles(e.target.files)}
                  />
                </label>
              </div>

              <Button type="submit" className="w-full" disabled={create.isPending}>
                {create.isPending ? "Saving…" : "Save Cleaning Log"}
              </Button>
            </form>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
