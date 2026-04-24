import { useState } from "react";
import { useLocation } from "wouter";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import { JOB_STATUSES, JOB_TYPES, JOB_PRIORITIES } from "@/lib/utils";
import { ArrowLeft, Plus } from "lucide-react";
import { Link } from "wouter";

type Client = { id: number; name: string; email: string; company?: string };

export default function NewJobPage() {
  const [, navigate] = useLocation();
  const { toast } = useToast();
  const qc = useQueryClient();

  const { data: clients } = useQuery<Client[]>({ queryKey: ["/api/users"] });

  const [form, setForm] = useState({
    reference: `BSS-${new Date().getFullYear()}-`,
    clientId: "",
    propertyAddress: "",
    description: "",
    status: "Booked" as string,
    progress: "0",
    jobType: "Maintenance" as string,
    priority: "Normal" as string,
    estimatedValue: "",
    startDate: "",
  });

  const create = useMutation({
    mutationFn: (data: unknown) => apiRequest("POST", "/api/jobs", data).then((r) => r.json()),
    onSuccess: (job) => {
      qc.invalidateQueries({ queryKey: ["/api/jobs"] });
      qc.invalidateQueries({ queryKey: ["/api/stats"] });
      toast({ title: "Job created", description: `${job.reference} has been created.` });
      navigate(`/jobs/${job.id}`);
    },
    onError: (e) => toast({ variant: "destructive", title: "Failed to create job", description: String(e) }),
  });

  function set(k: string, v: string) {
    setForm((p) => ({ ...p, [k]: v }));
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!form.clientId || !form.propertyAddress || !form.description || !form.reference) {
      toast({ variant: "destructive", title: "Please fill in all required fields" });
      return;
    }
    create.mutate({
      reference: form.reference,
      clientId: Number(form.clientId),
      propertyAddress: form.propertyAddress,
      description: form.description,
      status: form.status,
      progress: Number(form.progress),
      jobType: form.jobType,
      priority: form.priority,
      estimatedValue: form.estimatedValue ? Number(form.estimatedValue) : undefined,
      startDate: form.startDate || undefined,
      paymentStatus: "Pending",
    });
  }

  return (
    <div className="h-full overflow-y-auto">
      <div className="p-4 md:p-6 max-w-2xl mx-auto space-y-4">
        <Link href="~/jobs">
          <Button variant="ghost" size="sm" className="gap-1.5 -ml-2 text-muted-foreground">
            <ArrowLeft className="w-4 h-4" /> Back
          </Button>
        </Link>

        <div>
          <h1 className="text-xl font-bold">Create New Job</h1>
          <p className="text-sm text-muted-foreground mt-0.5">Fill in the job details below</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <Card>
            <CardHeader className="pb-2"><CardTitle className="text-sm">Job Details</CardTitle></CardHeader>
            <CardContent className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label className="text-xs">Reference *</Label>
                <Input value={form.reference} onChange={(e) => set("reference", e.target.value)} required className="text-sm" data-testid="input-reference" />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs">Client *</Label>
                <Select value={form.clientId} onValueChange={(v) => set("clientId", v)} required>
                  <SelectTrigger className="text-sm" data-testid="select-client">
                    <SelectValue placeholder="Select client…" />
                  </SelectTrigger>
                  <SelectContent>
                    {clients?.map((c) => (
                      <SelectItem key={c.id} value={String(c.id)}>
                        {c.name}{c.company ? ` — ${c.company}` : ""}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="sm:col-span-2 space-y-1.5">
                <Label className="text-xs">Property Address *</Label>
                <Input value={form.propertyAddress} onChange={(e) => set("propertyAddress", e.target.value)} required placeholder="42 Example Street, London E1 2AB" className="text-sm" data-testid="input-address" />
              </div>
              <div className="sm:col-span-2 space-y-1.5">
                <Label className="text-xs">Description of Works *</Label>
                <Textarea value={form.description} onChange={(e) => set("description", e.target.value)} required placeholder="Describe the works to be carried out…" className="text-sm" data-testid="textarea-description" />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2"><CardTitle className="text-sm">Status & Scheduling</CardTitle></CardHeader>
            <CardContent className="grid grid-cols-2 sm:grid-cols-3 gap-3">
              <div className="space-y-1.5">
                <Label className="text-xs">Status</Label>
                <Select value={form.status} onValueChange={(v) => set("status", v)}>
                  <SelectTrigger className="text-sm" data-testid="select-new-status">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {JOB_STATUSES.map((s) => <SelectItem key={s} value={s}>{s}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs">Type</Label>
                <Select value={form.jobType} onValueChange={(v) => set("jobType", v)}>
                  <SelectTrigger className="text-sm">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {JOB_TYPES.map((t) => <SelectItem key={t} value={t}>{t}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs">Priority</Label>
                <Select value={form.priority} onValueChange={(v) => set("priority", v)}>
                  <SelectTrigger className="text-sm">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {JOB_PRIORITIES.map((p) => <SelectItem key={p} value={p}>{p}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs">Start Date</Label>
                <Input type="date" value={form.startDate} onChange={(e) => set("startDate", e.target.value)} className="text-sm" data-testid="input-start-date" />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs">Estimated Value (£)</Label>
                <Input type="number" min="0" step="0.01" value={form.estimatedValue} onChange={(e) => set("estimatedValue", e.target.value)} placeholder="0.00" className="text-sm" data-testid="input-estimated-value" />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs">Initial Progress (%)</Label>
                <Input type="number" min="0" max="100" value={form.progress} onChange={(e) => set("progress", e.target.value)} className="text-sm" />
              </div>
            </CardContent>
          </Card>

          <Button type="submit" className="w-full gap-1.5" disabled={create.isPending} data-testid="button-create-job">
            <Plus className="w-4 h-4" />
            {create.isPending ? "Creating…" : "Create Job"}
          </Button>
        </form>
      </div>
    </div>
  );
}
