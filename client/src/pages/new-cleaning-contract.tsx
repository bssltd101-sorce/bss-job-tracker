import { useState } from "react";
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
import { ArrowLeft, Sparkles } from "lucide-react";

type Property = { id: number; name: string; address: string; clientId: number };
type Client = { id: number; name: string; email: string; company?: string };

const FREQUENCIES = ["Weekly", "Fortnightly", "Monthly"];
const DAYS = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"];
const AREA_OPTIONS = ["Hallways", "Staircases", "Landings", "Entrance", "Bin Store", "Cupboards", "Courtyards", "External Areas"];

export default function NewCleaningContractPage() {
  const { toast } = useToast();
  const [, navigate] = useLocation();

  const [propertyId, setPropertyId] = useState("");
  const [clientId, setClientId] = useState("");
  const [contractRef, setContractRef] = useState("");
  const [frequency, setFrequency] = useState("Weekly");
  const [dayOfWeek, setDayOfWeek] = useState("Thursday");
  const [operativeName, setOperativeName] = useState("");
  const [selectedAreas, setSelectedAreas] = useState<string[]>([]);
  const [notes, setNotes] = useState("");

  const { data: properties } = useQuery<Property[]>({ queryKey: ["/api/properties"] });
  const { data: clients } = useQuery<Client[]>({ queryKey: ["/api/users"] });

  const create = useMutation({
    mutationFn: (data: unknown) =>
      apiRequest("POST", "/api/cleaning/contracts", data).then((r) => r.json()),
    onSuccess: () => {
      toast({ title: "Contract created" });
      navigate("~/cleaning");
    },
    onError: (e) => toast({ variant: "destructive", title: "Failed to create contract", description: String(e) }),
  });

  function toggleArea(area: string) {
    setSelectedAreas((prev) =>
      prev.includes(area) ? prev.filter((a) => a !== area) : [...prev, area]
    );
  }

  // Auto-set clientId when property changes
  function handlePropertyChange(pid: string) {
    setPropertyId(pid);
    const prop = properties?.find((p) => String(p.id) === pid);
    if (prop) setClientId(String(prop.clientId));
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!propertyId || !clientId) {
      toast({ variant: "destructive", title: "Please select a property and client" });
      return;
    }
    create.mutate({
      propertyId: Number(propertyId),
      clientId: Number(clientId),
      contractRef: contractRef.trim() || "",
      frequency,
      dayOfWeek,
      operativeName: operativeName || null,
      areas: selectedAreas,
      notes: notes || null,
    });
  }

  return (
    <div className="h-full overflow-y-auto">
      <div className="p-4 md:p-6 max-w-2xl mx-auto space-y-5">
        <Link href="~/cleaning">
          <Button variant="ghost" size="sm" className="gap-1.5 -ml-2 text-muted-foreground">
            <ArrowLeft className="w-4 h-4" /> Back to Cleaning
          </Button>
        </Link>

        <div className="flex items-center gap-2">
          <Sparkles className="w-5 h-5 text-primary" />
          <h1 className="text-xl font-bold">New Cleaning Contract</h1>
        </div>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm">Contract Details</CardTitle>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-1.5">
                <Label className="text-xs">Contract Reference / Work Order No.</Label>
                <Input
                  value={contractRef}
                  onChange={(e) => setContractRef(e.target.value)}
                  placeholder="e.g. CLN-2026-001"
                  className="text-sm font-mono"
                  data-testid="input-contract-ref"
                />
                <p className="text-[11px] text-muted-foreground">Optional — enter your internal reference or work order number</p>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <Label className="text-xs">Property *</Label>
                  <Select value={propertyId} onValueChange={handlePropertyChange}>
                    <SelectTrigger className="text-sm">
                      <SelectValue placeholder="Select property…" />
                    </SelectTrigger>
                    <SelectContent>
                      {(properties ?? []).map((p) => (
                        <SelectItem key={p.id} value={String(p.id)}>
                          {p.name} — {p.address}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-1.5">
                  <Label className="text-xs">Client *</Label>
                  <Select value={clientId} onValueChange={setClientId}>
                    <SelectTrigger className="text-sm">
                      <SelectValue placeholder="Select client…" />
                    </SelectTrigger>
                    <SelectContent>
                      {(clients ?? []).map((c) => (
                        <SelectItem key={c.id} value={String(c.id)}>
                          {c.name} {c.company ? `(${c.company})` : ""}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-1.5">
                  <Label className="text-xs">Frequency</Label>
                  <Select value={frequency} onValueChange={setFrequency}>
                    <SelectTrigger className="text-sm">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {FREQUENCIES.map((f) => <SelectItem key={f} value={f}>{f}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-1.5">
                  <Label className="text-xs">Day of Week</Label>
                  <Select value={dayOfWeek} onValueChange={setDayOfWeek}>
                    <SelectTrigger className="text-sm">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {DAYS.map((d) => <SelectItem key={d} value={d}>{d}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="space-y-1.5">
                <Label className="text-xs">Operative Name</Label>
                <Input
                  value={operativeName}
                  onChange={(e) => setOperativeName(e.target.value)}
                  placeholder="e.g. Maria Santos"
                  className="text-sm"
                />
              </div>

              <div className="space-y-2">
                <Label className="text-xs">Areas to Clean</Label>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                  {AREA_OPTIONS.map((area) => (
                    <div key={area} className="flex items-center gap-2">
                      <Checkbox
                        id={`area-${area}`}
                        checked={selectedAreas.includes(area)}
                        onCheckedChange={() => toggleArea(area)}
                      />
                      <label htmlFor={`area-${area}`} className="text-xs cursor-pointer">{area}</label>
                    </div>
                  ))}
                </div>
              </div>

              <div className="space-y-1.5">
                <Label className="text-xs">Notes</Label>
                <Textarea
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder="Access instructions, special requirements…"
                  className="text-sm min-h-[80px]"
                />
              </div>

              <Button type="submit" className="w-full" disabled={create.isPending}>
                {create.isPending ? "Creating…" : "Create Contract"}
              </Button>
            </form>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
