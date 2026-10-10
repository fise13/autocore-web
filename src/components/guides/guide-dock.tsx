"use client";

import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { userCopy } from "@/lib/user-copy";

type GuideDockProps = {
  stepLabel: string;
  title: string;
  instruction: string;
  wrongClick: string | null;
  stuck: boolean;
  canBack: boolean;
  completed: boolean;
  dockOnTop: boolean;
  onBack: () => void;
  onNext: () => void;
  onExit: () => void;
  onShowMe: () => void;
};

export function GuideDock({
  stepLabel,
  title,
  instruction,
  wrongClick,
  stuck,
  canBack,
  completed,
  dockOnTop,
  onBack,
  onNext,
  onExit,
  onShowMe,
}: GuideDockProps) {
  return (
    <div
      className={cn(
        "pointer-events-auto fixed inset-x-0 z-[80] flex justify-center px-4",
        dockOnTop ? "top-3" : "bottom-3",
      )}
    >
      <div
        className="w-full max-w-xl rounded-xl border border-border bg-card/95 px-4 py-3 text-card-foreground shadow-sm backdrop-blur-sm"
        role="status"
        aria-live="polite"
      >
        <p className="text-micro font-medium text-muted-foreground">
          {completed ? userCopy.guides.completeTitle : stepLabel}
        </p>
        <p className="mt-1 text-sm font-medium">{completed ? userCopy.guides.completeBody : title}</p>
        <p className="mt-0.5 text-sm leading-relaxed text-muted-foreground">
          {completed ? userCopy.guides.completeHint : instruction}
        </p>
        {wrongClick ? (
          <p className="mt-2 rounded-md bg-muted px-2.5 py-1.5 text-xs text-foreground">{wrongClick}</p>
        ) : null}
        {stuck && !completed ? (
          <div className="mt-2 flex items-center gap-2 text-xs text-muted-foreground">
            <span>{userCopy.guides.needHelp}</span>
            <Button type="button" size="xs" variant="outline" onClick={onShowMe}>
              {userCopy.guides.showMe}
            </Button>
          </div>
        ) : null}
        <div className="mt-3 flex items-center justify-end gap-2">
          {canBack && !completed ? (
            <Button type="button" variant="ghost" size="sm" onClick={onBack}>
              {userCopy.guides.back}
            </Button>
          ) : null}
          {!completed ? (
            <Button type="button" variant="ghost" size="sm" onClick={onNext}>
              {userCopy.guides.next}
            </Button>
          ) : null}
          <Button type="button" variant="outline" size="sm" onClick={onExit}>
            {completed ? userCopy.guides.done : userCopy.guides.exit}
          </Button>
        </div>
      </div>
    </div>
  );
}
