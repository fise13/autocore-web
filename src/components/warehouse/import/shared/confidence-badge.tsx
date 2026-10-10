import { cn } from "@/lib/utils";

type ConfidenceBadgeProps = {
  confidence: number;
  className?: string;
};

export function ConfidenceBadge({ confidence, className }: ConfidenceBadgeProps) {
  const percent = Math.round(confidence * 100);
  const tone =
    percent >= 90 ? "bg-success-subtle text-success-on-subtle" : percent >= 70 ? "bg-warning-subtle text-warning-on-subtle" : "bg-destructive/10 text-destructive";

  return (
    <span className={cn("inline-flex rounded-full px-2 py-0.5 text-xs font-medium", tone, className)}>
      {percent}%
    </span>
  );
}
