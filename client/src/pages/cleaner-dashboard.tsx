import { useQuery } from "@tanstack/react-query";
import { useLocation } from "wouter";
import { useAuth } from "@/hooks/use-auth";
import { MapPin, Calendar, ChevronRight, Loader2 } from "lucide-react";

interface AssignedContract {
  id: number;
  propertyId: number;
  clientId: number;
  contractRef: string | null;
  frequency: string;
  dayOfWeek: string | null;
  operativeName: string | null;
  areas: string;
  notes: string | null;
  isActive: number;
  createdAt: string;
  propertyName: string;
  propertyAddress: string;
}

function getGreeting() {
  const hour = new Date().getHours();
  if (hour < 12) return "Good morning";
  if (hour < 17) return "Good afternoon";
  return "Good evening";
}

export default function CleanerDashboardPage() {
  const { user } = useAuth();
  const [, navigate] = useLocation();

  const { data: contracts, isLoading, isError } = useQuery<AssignedContract[]>({
    queryKey: ["/api/cleaner/contracts"],
  });

  return (
    <div className="min-h-dvh bg-background pb-8">
      {/* Page header */}
      <div className="bg-[#0A0A0A] px-5 pt-6 pb-5">
        <p className="text-[#E8A020] text-base font-semibold">
          {getGreeting()}, {user?.name?.split(" ")[0] ?? "there"}
        </p>
        <p className="text-white/50 text-sm mt-0.5">Your assigned sites</p>
      </div>

      <div className="px-4 pt-5 space-y-4">
        {isLoading && (
          <div className="flex items-center justify-center py-16">
            <Loader2 className="w-6 h-6 animate-spin text-[#E8A020]" />
          </div>
        )}

        {isError && (
          <div className="rounded-xl bg-destructive/10 border border-destructive/20 p-4 text-center">
            <p className="text-sm text-destructive font-medium">Failed to load sites.</p>
            <p className="text-xs text-muted-foreground mt-1">Please check your connection and try again.</p>
          </div>
        )}

        {!isLoading && !isError && contracts?.length === 0 && (
          <div className="rounded-xl border border-border bg-muted/30 p-8 text-center">
            <div className="w-12 h-12 rounded-full bg-muted flex items-center justify-center mx-auto mb-4">
              <MapPin className="w-6 h-6 text-muted-foreground" />
            </div>
            <p className="text-sm font-medium text-foreground">No sites assigned yet.</p>
            <p className="text-xs text-muted-foreground mt-1">Contact your supervisor to be assigned to a cleaning site.</p>
          </div>
        )}

        {!isLoading && !isError && contracts && contracts.length > 0 && contracts.map((contract) => {
          let areas: string[] = [];
          try { areas = JSON.parse(contract.areas); } catch {}

          return (
            <div
              key={contract.id}
              className="rounded-2xl border border-border bg-card shadow-sm overflow-hidden"
            >
              {/* Card top — property info */}
              <div className="p-5">
                <div className="flex items-start justify-between gap-2 mb-0.5">
                  <h2 className="text-lg font-bold text-foreground leading-snug">
                    {contract.propertyName}
                  </h2>
                  {contract.contractRef && (
                    <span className="flex-shrink-0 text-[11px] font-mono font-semibold text-[#E8A020] bg-[#E8A020]/10 border border-[#E8A020]/20 px-2 py-0.5 rounded-full">
                      {contract.contractRef}
                    </span>
                  )}
                </div>
                <div className="flex items-start gap-1.5 mt-1.5">
                  <MapPin className="w-3.5 h-3.5 text-muted-foreground flex-shrink-0 mt-0.5" />
                  <p className="text-xs text-muted-foreground leading-snug">
                    {contract.propertyAddress}
                  </p>
                </div>

                {/* Frequency / day */}
                <div className="flex items-center gap-1.5 mt-3">
                  <Calendar className="w-3.5 h-3.5 text-[#E8A020] flex-shrink-0" />
                  <span className="text-xs font-medium text-foreground">
                    {contract.frequency}
                    {contract.dayOfWeek ? ` — ${contract.dayOfWeek}s` : ""}
                  </span>
                </div>

                {/* Areas */}
                {areas.length > 0 && (
                  <div className="flex flex-wrap gap-1.5 mt-3">
                    {areas.map((area) => (
                      <span
                        key={area}
                        className="inline-flex items-center px-2.5 py-1 rounded-full text-[11px] font-medium bg-[#E8A020]/10 text-[#E8A020] border border-[#E8A020]/20"
                      >
                        {area}
                      </span>
                    ))}
                  </div>
                )}
              </div>

              {/* CTA */}
              <div className="border-t border-border px-5 py-3.5">
                <button
                  onClick={() => navigate(`/cleaner/log/${contract.id}`)}
                  className="w-full flex items-center justify-center gap-2 bg-[#E8A020] hover:bg-[#d4911c] active:bg-[#c0831a] text-white font-semibold text-sm rounded-xl py-3.5 transition-colors"
                >
                  Log a Clean
                  <ChevronRight className="w-4 h-4" />
                </button>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
