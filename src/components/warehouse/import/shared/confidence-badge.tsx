import { cn } from "@/lib/utils";

type ConfidenceBadgeProps = {
  confidence: number;
  className?: string;
};

export function ConfidenceBadge({ confidence, className }: ConfidenceBadgeProps) {
  const percent = Math.round(confidence * 100);
  const tone =
    percent >= 90 ? "bg-emerald-500/15 text-emerald-700" : percent >= 70 ? "bg-amber-500/15 text-amber-800" : "bg-destructive/10 text-destructive";

  return (
    <span className={cn("inline-flex rounded-full px-2 py-0.5 text-xs font-medium", tone, className)}>
      {percent}%
    </span>
  );
}
