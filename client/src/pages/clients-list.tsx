import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Link } from "wouter";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import { useAuth } from "@/hooks/use-auth";
import { Search, Plus, User, Mail, Phone, Building2, ArrowRight, Download } from "lucide-react";

type Client = { id: number; name: string; email: string; company?: string; phone?: string; createdAt: string };

export default function ClientsListPage() {
  const { toast } = useToast();
  const { user } = useAuth();
  const isAdmin = user?.role === "admin";
  const qc = useQueryClient();
  const { data: clients, isLoading } = useQuery<Client[]>({ queryKey: ["/api/users"] });
  const [search, setSearch] = useState("");
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({ name: "", email: "", password: "", company: "", phone: "" });

  function handleExportCSV() {
    const a = document.createElement("a");
    a.href = "/api/export/clients";
    a.download = "bss-clients-export.csv";
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
  }

  const filtered = (clients ?? []).filter((c) => {
    const q = search.toLowerCase();
    return !q || c.name.toLowerCase().includes(q) || c.email.toLowerCase().includes(q) || (c.company ?? "").toLowerCase().includes(q);
  });

  const create = useMutation({
    mutationFn: (data: unknown) => apiRequest("POST", "/api/users", data).then((r) => r.json()),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["/api/users"] });
      qc.invalidateQueries({ queryKey: ["/api/stats"] });
      toast({ title: "Client created" });
      setOpen(false);
      setForm({ name: "", email: "", password: "", company: "", phone: "" });
    },
    onError: (e) => toast({ variant: "destructive", title: "Failed to create client", description: String(e) }),
  });

  function set(k: string, v: string) { setForm((p) => ({ ...p, [k]: v })); }

  return (
    <div className="h-full overflow-y-auto">
      <div className="p-4 md:p-6 max-w-4xl mx-auto space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-xl font-bold">Clients</h1>
            <p className="text-sm text-muted-foreground mt-0.5">{clients?.length ?? 0} registered clients</p>
          </div>
          <div className="flex items-center gap-2">
            {isAdmin && (
              <Button size="sm" variant="outline" className="gap-1.5" onClick={handleExportCSV} data-testid="button-export-clients">
                <Download className="w-4 h-4" /> Export CSV
              </Button>
            )}
          <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
              <Button size="sm" className="gap-1.5" data-testid="button-add-client">
                <Plus className="w-4 h-4" /> Add Client
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Add New Client</DialogTitle>
              </DialogHeader>
              <form
                onSubmit={(e) => { e.preventDefault(); create.mutate(form); }}
                className="space-y-3 mt-2"
              >
                <div className="space-y-1.5">
                  <Label className="text-xs">Full Name *</Label>
                  <Input value={form.name} onChange={(e) => set("name", e.target.value)} required placeholder="John Smith" className="text-sm" data-testid="input-client-name" />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs">Email *</Label>
                  <Input type="email" value={form.email} onChange={(e) => set("email", e.target.value)} required placeholder="john@example.com" className="text-sm" data-testid="input-client-email" />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs">Password *</Label>
                  <Input type="password" value={form.password} onChange={(e) => set("password", e.target.value)} required placeholder="Set login password" className="text-sm" data-testid="input-client-password" />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs">Company</Label>
                  <Input value={form.company} onChange={(e) => set("company", e.target.value)} placeholder="Estate Agency / Property Co." className="text-sm" />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs">Phone</Label>
                  <Input value={form.phone} onChange={(e) => set("phone", e.target.value)} placeholder="07700 900000" className="text-sm" />
                </div>
                <Button type="submit" className="w-full" disabled={create.isPending} data-testid="button-save-client">
                  {create.isPending ? "Creating…" : "Create Client"}
                </Button>
              </form>
            </DialogContent>
          </Dialog>
          </div>
        </div>

        <div className="relative">
          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            placeholder="Search clients…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-8 h-8 text-sm"
            data-testid="input-search-clients"
          />
        </div>

        {isLoading ? (
          <div className="space-y-2">
            {[...Array(4)].map((_, i) => <Skeleton key={i} className="h-20 rounded-xl" />)}
          </div>
        ) : filtered.length === 0 ? (
          <div className="text-center py-12 text-muted-foreground">
            <User className="w-10 h-10 mx-auto mb-3 opacity-30" />
            <p className="font-medium">No clients found</p>
          </div>
        ) : (
          <div className="grid gap-2 sm:grid-cols-2">
            {filtered.map((c) => (
              <Card key={c.id} className="hover-elevate" data-testid={`client-card-${c.id}`}>
                <CardContent className="p-4 flex items-start gap-3">
                  <div className="w-9 h-9 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0 text-sm font-bold text-primary">
                    {c.name.charAt(0).toUpperCase()}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="font-semibold text-sm">{c.name}</div>
                    {c.company && (
                      <div className="flex items-center gap-1 text-xs text-muted-foreground">
                        <Building2 className="w-3 h-3" /> {c.company}
                      </div>
                    )}
                    <div className="flex items-center gap-1 text-xs text-muted-foreground">
                      <Mail className="w-3 h-3" /> {c.email}
                    </div>
                    {c.phone && (
                      <div className="flex items-center gap-1 text-xs text-muted-foreground">
                        <Phone className="w-3 h-3" /> {c.phone}
                      </div>
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
