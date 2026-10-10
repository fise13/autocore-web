"use client";

import { useEffect, useState } from "react";

import { usePersistenceOptional } from "@/components/persistence/persistence-provider";
import { persistenceKeyString, type PersistenceKey } from "@/lib/persistence";
import { cn } from "@/lib/utils";
import { userCopy } from "@/lib/user-copy";

function formatAgo(savedAt: number | null, now: number): string {
  const copy = userCopy.persistence;
  if (savedAt == null) return copy.neverSaved;
  const seconds = Math.max(0, Math.round((now - savedAt) / 1000));
  if (seconds < 5) return copy.justNow;
  if (seconds < 60) return copy.secondsAgo(seconds);
  const minutes = Math.round(seconds / 60);
  if (minutes < 60) return copy.minutesAgo(minutes);
  return copy.hoursAgo(Math.round(minutes / 60));
}

export function LastSavedHint({
  persistenceKey,
  className,
}: {
  persistenceKey?: PersistenceKey;
  className?: string;
}) {
  const persistence = usePersistenceOptional();
  const [now, setNow] = useState(() => Date.now());

  useEffect(() => {
    const id = window.setInterval(() => setNow(Date.now()), 5000);
    return () => window.clearInterval(id);
  }, []);

  if (!persistence) return null;

  const doc = persistenceKey
    ? persistence.snapshot.documents.find(
        (entry) => persistenceKeyString(entry.key) === persistenceKeyString(persistenceKey),
      )
    : null;

  const dirty = doc?.dirty ?? persistence.snapshot.uiStatus === "dirty";
  const saving = doc?.status === "saving" || persistence.snapshot.uiStatus === "saving";
  const lastSavedAt = doc?.lastSavedAt ?? persistence.snapshot.lastSavedAt;

  let text: string;
  if (saving) text = userCopy.persistence.saving;
  else if (dirty) text = userCopy.persistence.dirty;
  else if (persistence.snapshot.uiStatus === "offline") text = userCopy.persistence.offlineQueued;
  else if (persistence.snapshot.uiStatus === "error") {
    text = persistence.snapshot.lastError ?? userCopy.persistence.syncError;
  } else text = formatAgo(lastSavedAt, now);

  return (
    <p
      className={cn(
        "text-micro text-muted-foreground",
        dirty && "text-warning-on-subtle",
        saving && "text-primary-on-subtle",
        className,
      )}
      role="status"
      aria-live="polite"
    >
      {text}
    </p>
  );
}
