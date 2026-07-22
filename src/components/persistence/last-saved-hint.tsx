"use client";

import { useEffect, useState } from "react";

import { usePersistenceOptional } from "@/components/persistence/persistence-provider";
import { persistenceKeyString, type PersistenceKey } from "@/lib/persistence";
import { cn } from "@/lib/utils";

function formatAgo(savedAt: number | null, now: number): string {
  if (savedAt == null) return "Ещё не сохранялось";
  const seconds = Math.max(0, Math.round((now - savedAt) / 1000));
  if (seconds < 5) return "Сохранено только что";
  if (seconds < 60) return `Сохранено ${seconds} сек назад`;
  const minutes = Math.round(seconds / 60);
  if (minutes < 60) return `Сохранено ${minutes} мин назад`;
  return `Сохранено ${Math.round(minutes / 60)} ч назад`;
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
  if (saving) text = "Сохранение…";
  else if (dirty) text = "Есть несохранённые изменения";
  else if (persistence.snapshot.uiStatus === "offline") text = "Офлайн — изменения в очереди";
  else if (persistence.snapshot.uiStatus === "error") {
    text = persistence.snapshot.lastError ?? "Ошибка синхронизации";
  } else text = formatAgo(lastSavedAt, now);

  return (
    <p
      className={cn(
        "text-[11px] text-muted-foreground",
        dirty && "text-amber-600 dark:text-amber-400",
        saving && "text-sky-600 dark:text-sky-400",
        className,
      )}
      role="status"
      aria-live="polite"
    >
      {text}
    </p>
  );
}
