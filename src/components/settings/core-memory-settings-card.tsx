"use client";

import { useCallback, useEffect, useId, useState } from "react";

import { CoreAskButton, CoreLockup, CoreSurface } from "@/components/ai/core-surface";
import { useAuth } from "@/components/providers/auth-provider";
import type { CompanyBrainMemory } from "@/domain/ai/company-brain";
import { hasPermission } from "@/domain/user";
import { getFirebaseAuth } from "@/infrastructure/firebase/client";
import { normalizeCompanyId } from "@/lib/company-id";
import { userCopy } from "@/lib/user-copy";
import { cn } from "@/lib/utils";

type CoreMemorySettingsCardProps = {
  onStatus?: (message: string | null) => void;
};

async function memoryHeaders(companyId: string): Promise<HeadersInit> {
  const token = await getFirebaseAuth().currentUser?.getIdToken();
  if (!token) throw new Error(userCopy.ai.errorUnauthorized);
  return {
    Authorization: `Bearer ${token}`,
    "Content-Type": "application/json",
    "x-company-id": companyId,
  };
}

export function CoreMemorySettingsCard({ onStatus }: CoreMemorySettingsCardProps) {
  const { profile } = useAuth();
  const copy = userCopy.settings.coreMemory;
  const companyId = profile?.companyId ? normalizeCompanyId(profile.companyId) : "";
  const canTeach = hasPermission(profile, "settings_manage");
  const composerId = useId();
  const [memories, setMemories] = useState<CompanyBrainMemory[]>([]);
  const [draft, setDraft] = useState("");
  const [loading, setLoading] = useState(canTeach && Boolean(companyId));
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    if (!canTeach || !companyId) return;
    setError(null);
    try {
      const response = await fetch("/api/assistant/memory", { headers: await memoryHeaders(companyId) });
      if (!response.ok) throw new Error(copy.error);
      const payload = (await response.json()) as { memories?: CompanyBrainMemory[] };
      setMemories(payload.memories ?? []);
    } catch (next) {
      setError(next instanceof Error ? next.message : copy.error);
    } finally {
      setLoading(false);
    }
  }, [canTeach, companyId, copy.error]);

  useEffect(() => {
    if (!canTeach || !companyId) return;
    let cancelled = false;
    void (async () => {
      try {
        const response = await fetch("/api/assistant/memory", { headers: await memoryHeaders(companyId) });
        if (!response.ok) throw new Error(copy.error);
        const payload = (await response.json()) as { memories?: CompanyBrainMemory[] };
        if (cancelled) return;
        setMemories(payload.memories ?? []);
      } catch (next) {
        if (cancelled) return;
        setError(next instanceof Error ? next.message : copy.error);
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [canTeach, companyId, copy.error]);

  async function remember() {
    const text = draft.trim();
    if (!text || !companyId) return;
    setSaving(true);
    setError(null);
    onStatus?.(null);
    try {
      const response = await fetch("/api/assistant/memory", {
        method: "POST",
        headers: await memoryHeaders(companyId),
        body: JSON.stringify({ action: "remember", text }),
      });
      if (!response.ok) throw new Error(copy.error);
      setDraft("");
      await load();
      onStatus?.(copy.saved);
    } catch (next) {
      setError(next instanceof Error ? next.message : copy.error);
    } finally {
      setSaving(false);
    }
  }

  async function forget(memoryId: string) {
    if (!companyId) return;
    setSaving(true);
    setError(null);
    try {
      const response = await fetch("/api/assistant/memory", {
        method: "POST",
        headers: await memoryHeaders(companyId),
        body: JSON.stringify({ action: "forget", memoryId }),
      });
      if (!response.ok) throw new Error(copy.error);
      setMemories((current) => current.filter((item) => item.id !== memoryId));
    } catch (next) {
      setError(next instanceof Error ? next.message : copy.error);
    } finally {
      setSaving(false);
    }
  }

  const status = !canTeach
    ? copy.noAccess
    : loading
      ? copy.loading
      : copy.count(memories.length);

  return (
    <CoreSurface>
      <CoreLockup name={copy.title} status={status} />
      <p className="mt-3 max-w-prose text-sm leading-relaxed text-muted-foreground">{copy.description}</p>

      {canTeach && loading ? (
        <div className="mt-4 space-y-2">
          <div className="h-12 rounded-lg bg-ai-subtle/80 motion-safe:animate-pulse" />
          <div className="h-12 rounded-lg bg-ai-subtle/50 motion-safe:animate-pulse" />
        </div>
      ) : null}

      {canTeach && !loading && memories.length === 0 ? (
        <p className="mt-4 text-sm text-muted-foreground">{copy.empty}</p>
      ) : null}

      {canTeach && memories.length > 0 ? (
        <ul className="mt-4 space-y-2">
          {memories.map((memory) => (
            <li
              key={memory.id}
              className={cn(
                "flex items-start justify-between gap-3 rounded-lg bg-background/50 py-2.5 pl-3 pr-2",
                "border-l-2 border-ai",
              )}
            >
              <p className="text-sm leading-snug">{memory.text}</p>
              <button
                type="button"
                className="shrink-0 cursor-pointer rounded-full px-2 py-1 text-xs text-muted-foreground transition-colors hover:bg-muted hover:text-foreground disabled:opacity-50"
                disabled={saving}
                onClick={() => void forget(memory.id)}
              >
                {copy.remove}
              </button>
            </li>
          ))}
        </ul>
      ) : null}

      {canTeach ? (
        <div className="mt-4 rounded-xl bg-muted/40 p-3">
          <label htmlFor={composerId} className="text-micro leading-none text-muted-foreground">
            {copy.composer}
          </label>
          <textarea
            id={composerId}
            value={draft}
            onChange={(event) => setDraft(event.target.value)}
            placeholder={copy.placeholder}
            rows={3}
            maxLength={2000}
            className="mt-2 w-full resize-none bg-transparent text-sm leading-relaxed outline-none placeholder:text-muted-foreground/80"
          />
          <div className="mt-2 flex justify-end">
            <CoreAskButton
              mark="confirm"
              disabled={saving || !draft.trim()}
              onClick={() => void remember()}
            >
              {copy.add}
            </CoreAskButton>
          </div>
        </div>
      ) : null}

      {error ? <p className="mt-3 text-sm text-destructive">{error}</p> : null}
    </CoreSurface>
  );
}
