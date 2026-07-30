import * as React from "react"

import { cn } from "@/lib/utils"

type UsageTone = "muted" | "primary" | "warning" | "danger"

/**
 * Tone escalates as a limit fills, so the row carries its own status without
 * needing a separate badge: comfortable -> primary, tight -> warning, at or
 * over the cap -> danger. An unlimited or unmetered row stays muted.
 */
export function usageTone(used: number, limit: number | null): UsageTone {
  if (limit === null || limit <= 0) return "muted"
  const ratio = used / limit
  if (ratio >= 1) return "danger"
  if (ratio >= 0.8) return "warning"
  return "primary"
}

const TONE_STROKE: Record<UsageTone, string> = {
  muted: "stroke-muted-foreground",
  primary: "stroke-primary-on-subtle",
  warning: "stroke-warning-on-subtle",
  danger: "stroke-danger-on-subtle",
}

const TONE_TEXT: Record<UsageTone, string> = {
  muted: "text-muted-foreground",
  primary: "text-primary-on-subtle",
  warning: "text-warning-on-subtle",
  danger: "text-danger-on-subtle",
}

function UsageRing({
  progress,
  tone,
  size = 18,
  className,
}: {
  /** 0–1. Values outside the range are clamped. */
  progress: number
  tone: UsageTone
  size?: number
  className?: string
}) {
  const clamped = Math.min(1, Math.max(0, Number.isFinite(progress) ? progress : 0))
  const strokeWidth = size >= 24 ? 3 : 2.5
  const r = (size - strokeWidth) / 2
  const circumference = 2 * Math.PI * r

  return (
    <svg
      width={size}
      height={size}
      viewBox={`0 0 ${size} ${size}`}
      aria-hidden="true"
      // Start the sweep at 12 o'clock instead of 3.
      className={cn("-rotate-90", className)}
    >
      <circle
        cx={size / 2}
        cy={size / 2}
        r={r}
        strokeWidth={strokeWidth}
        fill="none"
        className="stroke-border-muted"
      />
      {clamped > 0 ? (
        <circle
          cx={size / 2}
          cy={size / 2}
          r={r}
          strokeWidth={strokeWidth}
          strokeLinecap="round"
          strokeDasharray={circumference}
          strokeDashoffset={circumference * (1 - clamped)}
          fill="none"
          className={TONE_STROKE[tone]}
        />
      ) : null}
    </svg>
  )
}

function UsageMeterRow({
  label,
  used,
  limit,
  valueLabel,
  icon,
  showDivider = true,
  className,
}: {
  label: string
  used: number
  /** `null` renders an unmetered row (icon instead of ring). */
  limit: number | null
  /** Overrides the `used / limit` readout — e.g. "7 days". */
  valueLabel?: string
  /** Shown in place of the ring when the row has no numeric limit. */
  icon?: React.ReactNode
  showDivider?: boolean
  className?: string
}) {
  const tone = usageTone(used, limit)
  const isMetered = limit !== null && limit > 0
  const readout = valueLabel ?? (limit === null ? String(used) : `${used} / ${limit}`)

  return (
    <div
      className={cn(
        "flex min-h-12 items-center gap-2.5",
        showDivider && "border-b border-border-muted",
        className
      )}
    >
      <span className="flex w-5 shrink-0 items-center justify-center text-muted-foreground [&>svg]:size-4">
        {isMetered ? (
          <UsageRing progress={used / limit} tone={tone} />
        ) : (
          icon ?? <span className="size-1.5 rounded-full bg-border-muted" />
        )}
      </span>

      <span className="min-w-0 flex-1 truncate text-sm">{label}</span>

      <span className={cn("text-sm font-medium tabular-nums", TONE_TEXT[tone])}>
        {readout}
      </span>
    </div>
  )
}

export { UsageMeterRow, UsageRing }
