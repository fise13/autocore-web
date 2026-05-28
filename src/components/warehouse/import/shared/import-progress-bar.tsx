import { cn } from "@/lib/utils";

type ImportProgressBarProps = {
  percent: number;
  message?: string;
  className?: string;
};

export function ImportProgressBar({ percent, message, className }: ImportProgressBarProps) {
  return (
    <div className={cn("space-y-2", className)}>
      <div className="h-2 overflow-hidden rounded-full bg-muted">
        <div
          className="h-full rounded-full bg-primary transition-all duration-300"
          style={{ width: `${Math.max(0, Math.min(100, percent))}%` }}
        />
      </div>
      {message ? <p className="text-xs text-muted-foreground">{message}</p> : null}
    </div>
  );
}
