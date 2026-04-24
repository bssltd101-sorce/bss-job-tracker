import { Progress } from "@/components/ui/progress";
import { cn } from "@/lib/utils";

interface Props {
  progress: number;
  showLabel?: boolean;
  className?: string;
}

export function JobProgress({ progress, showLabel = true, className }: Props) {
  const clipped = Math.min(100, Math.max(0, progress));
  return (
    <div className={cn("space-y-1", className)}>
      {showLabel && (
        <div className="flex justify-between items-center text-xs text-muted-foreground">
          <span>Progress</span>
          <span className="font-semibold text-foreground">{clipped}%</span>
        </div>
      )}
      <div className="relative h-2 rounded-full bg-muted overflow-hidden">
        <div
          className="h-full rounded-full transition-all duration-500"
          style={{
            width: `${clipped}%`,
            background: clipped === 100
              ? "linear-gradient(90deg, #16a34a, #22c55e)"
              : "linear-gradient(90deg, hsl(36,100%,44%), hsl(45,100%,51%))",
          }}
          data-testid="progress-bar"
          aria-valuenow={clipped}
          aria-valuemin={0}
          aria-valuemax={100}
          role="progressbar"
        />
      </div>
    </div>
  );
}
