import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  UserCheck,
  Plus,
  ChevronDown,
  ChevronUp,
  Trash2,
  Loader2,
  Phone,
  Mail,
} from "lucide-react";

interface Cleaner {
  id: number;
  name: string;
  email: string;
  phone?: string;
  hasCompletedSetup: number;
}

interface Assignment {
  id: number;
  cleanerId: number;
  contractId: number;
  createdAt: string;
}

interface Contract {
  id: number;
  propertyName?: string;
  propertyAddress?: string;
  frequency: string;
  dayOfWeek?: string;
}

function CleanerCard({ cleaner }: { cleaner: Cleaner }) {
  const [expanded, setExpanded] = useState(false);
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data: assignments, isLoading: loadingAssignments } = useQuery<Assignment[]>({
    queryKey: [`/api/cleaners/${cleaner.id}/assignments`],
    enabled: expanded,
  });

  const { data: allContracts } = useQuery<Contract[]>({
    queryKey: ["/api/cleaning/contracts"],
    enabled: expanded,
  });

  const [addContractId, setAddContractId] = useState<string>("");

  const assignMutation = useMutation({
    mutationFn: async (contractId: number) => {
      const res = await apiRequest("POST", `/api/cleaners/${cleaner.id}/assignments`, { contractId });
      if (!res.ok) throw new Error("Failed to assign");
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [`/api/cleaners/${cleaner.id}/assignments`] });
      setAddContractId("");
      toast({ title: "Site assigned successfully" });
    },
    onError: () => toast({ variant: "destructive", title: "Failed to assign site" }),
  });

  const removeMutation = useMutation({
    mutationFn: async (assignmentId: number) => {
      const res = await apiRequest("DELETE", `/api/cleaners/assignments/${assignmentId}`);
      if (!res.ok) throw new Error("Failed to remove");
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [`/api/cleaners/${cleaner.id}/assignments`] });
      toast({ title: "Assignment removed" });
    },
    onError: () => toast({ variant: "destructive", title: "Failed to remove assignment" }),
  });

  // Contracts not yet assigned to this cleaner
  const assignedContractIds = new Set((assignments ?? []).map((a) => a.contractId));
  const availableContracts = (allContracts ?? []).filter((c) => !assignedContractIds.has(c.id));

  function getContractLabel(contractId: number) {
    const c = allContracts?.find((cc) => cc.id === contractId);
    if (!c) return `Contract #${contractId}`;
    return `${c.propertyName ?? `Property #${c.id}`} — ${c.frequency}${c.dayOfWeek ? ` (${c.dayOfWeek}s)` : ""}`;
  }

  return (
    <div className="rounded-xl border border-border bg-card overflow-hidden shadow-sm">
      {/* Main row */}
      <div className="p-4 flex items-start justify-between gap-3">
        <div className="flex items-start gap-3 min-w-0">
          <div className="w-10 h-10 rounded-full bg-[#E8A020] flex items-center justify-center flex-shrink-0 text-sm font-bold text-white">
            {cleaner.name.charAt(0).toUpperCase()}
          </div>
          <div className="min-w-0">
            <p className="text-sm font-semibold text-foreground truncate">{cleaner.name}</p>
            <div className="flex items-center gap-1 mt-0.5">
              <Mail className="w-3 h-3 text-muted-foreground flex-shrink-0" />
              <p className="text-xs text-muted-foreground truncate">{cleaner.email}</p>
            </div>
            {cleaner.phone && (
              <div className="flex items-center gap-1 mt-0.5">
                <Phone className="w-3 h-3 text-muted-foreground flex-shrink-0" />
                <p className="text-xs text-muted-foreground">{cleaner.phone}</p>
              </div>
            )}
          </div>
        </div>

        <div className="flex items-center gap-2 flex-shrink-0">
          <Badge
            variant={cleaner.hasCompletedSetup ? "default" : "secondary"}
            className={`text-[10px] px-2 py-0.5 ${
              cleaner.hasCompletedSetup
                ? "bg-green-500/15 text-green-600 dark:text-green-400 border-green-500/20"
                : "bg-amber-500/15 text-amber-600 dark:text-amber-400 border-amber-500/20"
            }`}
          >
            {cleaner.hasCompletedSetup ? "Setup complete" : "Pending setup"}
          </Badge>
          <button
            onClick={() => setExpanded((v) => !v)}
            className="text-muted-foreground hover:text-foreground transition-colors p-1"
            aria-label={expanded ? "Collapse" : "Expand"}
          >
            {expanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
          </button>
        </div>
      </div>

      {/* Expanded assignments */}
      {expanded && (
        <div className="border-t border-border bg-muted/20 p-4 space-y-4">
          <h3 className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
            Assigned Sites
          </h3>

          {loadingAssignments && (
            <div className="flex items-center gap-2 text-muted-foreground text-xs">
              <Loader2 className="w-3.5 h-3.5 animate-spin" />
              Loading…
            </div>
          )}

          {!loadingAssignments && assignments?.length === 0 && (
            <p className="text-xs text-muted-foreground italic">No sites assigned yet.</p>
          )}

          {assignments && assignments.length > 0 && (
            <div className="space-y-2">
              {assignments.map((a) => (
                <div
                  key={a.id}
                  className="flex items-center justify-between gap-2 rounded-lg bg-background border border-border px-3 py-2"
                >
                  <p className="text-xs text-foreground truncate">{getContractLabel(a.contractId)}</p>
                  <button
                    onClick={() => removeMutation.mutate(a.id)}
                    disabled={removeMutation.isPending}
                    className="text-muted-foreground hover:text-destructive transition-colors flex-shrink-0"
                    aria-label="Remove assignment"
                  >
                    {removeMutation.isPending ? (
                      <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    ) : (
                      <Trash2 className="w-3.5 h-3.5" />
                    )}
                  </button>
                </div>
              ))}
            </div>
          )}

          {/* Add assignment */}
          {availableContracts.length > 0 && (
            <div className="flex items-center gap-2 pt-1">
              <Select value={addContractId} onValueChange={setAddContractId}>
                <SelectTrigger className="flex-1 h-9 text-xs">
                  <SelectValue placeholder="Add a site…" />
                </SelectTrigger>
                <SelectContent>
                  {availableContracts.map((c) => (
                    <SelectItem key={c.id} value={String(c.id)} className="text-xs">
                      {c.propertyName ?? `Contract #${c.id}`} — {c.frequency}
                      {c.dayOfWeek ? ` (${c.dayOfWeek}s)` : ""}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Button
                size="sm"
                className="h-9 text-xs"
                disabled={!addContractId || assignMutation.isPending}
                onClick={() => assignMutation.mutate(Number(addContractId))}
              >
                {assignMutation.isPending ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : "Assign"}
              </Button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

export default function CleanersListPage() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [showAddModal, setShowAddModal] = useState(false);
  const [newName, setNewName] = useState("");
  const [newEmail, setNewEmail] = useState("");
  const [newPhone, setNewPhone] = useState("");
  const [creating, setCreating] = useState(false);

  const { data: cleaners, isLoading } = useQuery<Cleaner[]>({
    queryKey: ["/api/cleaners"],
  });

  async function handleCreateCleaner() {
    if (!newName || !newEmail) return;
    setCreating(true);
    try {
      const res = await apiRequest("POST", "/api/cleaners", {
        name: newName,
        email: newEmail,
        phone: newPhone,
      });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error ?? "Failed to create");
      }
      queryClient.invalidateQueries({ queryKey: ["/api/cleaners"] });
      setShowAddModal(false);
      setNewName("");
      setNewEmail("");
      setNewPhone("");
      toast({ title: "Cleaner account created", description: `Login: ${newEmail} / changeme123` });
    } catch (e: any) {
      toast({ variant: "destructive", title: "Error", description: e.message });
    } finally {
      setCreating(false);
    }
  }

  return (
    <div className="h-full overflow-y-auto">
      <div className="p-5 max-w-2xl mx-auto">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-[#E8A020]/10 flex items-center justify-center">
              <UserCheck className="w-4 h-4 text-[#E8A020]" />
            </div>
            <div>
              <h1 className="text-lg font-bold text-foreground">Cleaners</h1>
              <p className="text-xs text-muted-foreground">
                {cleaners?.length ?? 0} operative{(cleaners?.length ?? 0) !== 1 ? "s" : ""}
              </p>
            </div>
          </div>
          <Button
            onClick={() => setShowAddModal(true)}
            className="flex items-center gap-1.5 text-sm"
          >
            <Plus className="w-4 h-4" />
            Add Cleaner
          </Button>
        </div>

        {/* List */}
        {isLoading && (
          <div className="flex items-center justify-center py-16">
            <Loader2 className="w-6 h-6 animate-spin text-[#E8A020]" />
          </div>
        )}

        {!isLoading && cleaners?.length === 0 && (
          <div className="rounded-xl border border-border bg-muted/30 p-8 text-center">
            <UserCheck className="w-10 h-10 text-muted-foreground mx-auto mb-3" />
            <p className="text-sm font-medium">No cleaners yet.</p>
            <p className="text-xs text-muted-foreground mt-1">Add a cleaner to get started.</p>
          </div>
        )}

        <div className="space-y-3">
          {cleaners?.map((c) => (
            <CleanerCard key={c.id} cleaner={c} />
          ))}
        </div>
      </div>

      {/* Add Cleaner Modal */}
      <Dialog open={showAddModal} onOpenChange={setShowAddModal}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>Add Cleaner</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-1.5">
              <Label htmlFor="cleaner-name" className="text-xs font-medium">
                Full name <span className="text-destructive">*</span>
              </Label>
              <Input
                id="cleaner-name"
                placeholder="e.g. Jane Smith"
                value={newName}
                onChange={(e) => setNewName(e.target.value)}
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="cleaner-email" className="text-xs font-medium">
                Email address <span className="text-destructive">*</span>
              </Label>
              <Input
                id="cleaner-email"
                type="email"
                placeholder="e.g. jane@bssltd.info"
                value={newEmail}
                onChange={(e) => setNewEmail(e.target.value)}
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="cleaner-phone" className="text-xs font-medium">
                Phone number
              </Label>
              <Input
                id="cleaner-phone"
                type="tel"
                placeholder="e.g. 07700 900004"
                value={newPhone}
                onChange={(e) => setNewPhone(e.target.value)}
              />
            </div>
            <p className="text-xs text-muted-foreground rounded-lg bg-muted/50 border border-border p-2.5">
              The cleaner will receive temporary password <strong>changeme123</strong> and be prompted to change it on first login.
            </p>
          </div>
          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={() => setShowAddModal(false)}>
              Cancel
            </Button>
            <Button
              disabled={!newName || !newEmail || creating}
              onClick={handleCreateCleaner}
            >
              {creating ? <Loader2 className="w-4 h-4 animate-spin" /> : "Create Account"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
