"use client";

import { useCallback, useEffect, useState } from "react";
import { ExternalLink, RefreshCw } from "lucide-react";
import Link from "next/link";

import { EnterprisePanelCard } from "@/components/layout/enterprise-panel-card";
import { EnterpriseWorkspaceShell } from "@/components/layout/enterprise-workspace-shell";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  getSystemStatusComponents,
  readExternalStatusUrl,
  systemStatusIncidents,
  type SystemStatusLevel,
} from "@/lib/product/product-status";
import { cn } from "@/lib/utils";
import { getActiveUserCopyLocale, userCopy } from "@/lib/user-copy";

type StatusApiResponse = {
  overall: SystemStatusLevel;
  checkedAt: string;
  components: Array<{
    id: string;
    status: SystemStatusLevel;
    message?: string;
  }>;
};

const statusTone: Record<SystemStatusLevel, string> = {
  operational: "bg-emerald-500/15 text-emerald-700 dark:text-emerald-400",
  degraded: "bg-amber-500/15 text-amber-800 dark:text-amber-400",
  outage: "bg-destructive/15 text-destructive",
};

function formatCheckedAt(iso: string): string {
  const date = new Date(iso);
  const locale = getActiveUserCopyLocale() === "ru" ? "en-US" : "en-US";
  return new Intl.DateTimeFormat(locale, {
    day: "numeric",
    month: "long",
    hour: "2-digit",
    minute: "2-digit",
  }).format(date);
}

export function StatusWorkspace() {
  const externalUrl = readExternalStatusUrl();
  const [payload, setPayload] = useState<StatusApiResponse | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  const refresh = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await fetch("/api/status", { cache: "no-store" });
      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      const data = (await response.json()) as StatusApiResponse;
      setPayload(data);
    } catch {
      setError(userCopy.systemStatus.fetchError);
      setPayload(null);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  const overall = payload?.overall ?? (error ? "degraded" : "operational");

  return (
    <EnterpriseWorkspaceShell
      title={userCopy.systemStatus.title}
      description={userCopy.systemStatus.description}
      action={
        <div className="flex flex-wrap gap-2">
          {externalUrl ? (
            <Button
              variant="outline"
              size="sm"
              className="gap-1.5"
              render={
                <a href={externalUrl} target="_blank" rel="noopener noreferrer" />
              }
            >
              {userCopy.systemStatus.fullPage}
              <ExternalLink className="size-3.5" />
            </Button>
          ) : null}
          <Button
            variant="outline"
            size="sm"
            className="gap-1.5"
            onClick={() => void refresh()}
            disabled={loading}
          >
            <RefreshCw className={cn("size-3.5", loading && "animate-spin")} />
            {userCopy.systemStatus.refresh}
          </Button>
        </div>
      }
      meta={
        <div className="flex flex-wrap items-center gap-3">
          <Badge className={cn("border-0 font-medium", statusTone[overall])}>
            {userCopy.systemStatus.levels[overall]}
          </Badge>
          {payload?.checkedAt ? (
            <span className="text-xs text-muted-foreground">
              {userCopy.systemStatus.checkedAt(formatCheckedAt(payload.checkedAt))}
            </span>
          ) : null}
        </div>
      }
    >
      <div className="mx-auto flex w-full max-w-3xl flex-col gap-4">
        {error ? (
          <EnterprisePanelCard
            title={userCopy.systemStatus.checkErrorTitle}
            contentClassName="px-6 py-5 text-sm text-muted-foreground"
          >
            {error}
          </EnterprisePanelCard>
        ) : null}

        <EnterprisePanelCard title={userCopy.systemStatus.components} contentClassName="divide-y divide-border px-0 py-0">
          <ul>
            {getSystemStatusComponents().map((definition) => {
              const live = payload?.components.find((item) => item.id === definition.id);
              const level = live?.status ?? (loading ? "operational" : "degraded");
              return (
                <li
                  key={definition.id}
                  className="flex flex-col gap-2 px-6 py-4 sm:flex-row sm:items-center sm:justify-between"
                >
                  <div className="min-w-0">
                    <p className="text-sm font-medium">{userCopy.systemStatus.componentsMeta[definition.id].name}</p>
                    <p className="mt-0.5 text-xs text-muted-foreground">{userCopy.systemStatus.componentsMeta[definition.id].description}</p>
                    {live?.message ? (
                      <p className="mt-1 text-xs text-amber-700 dark:text-amber-400">{live.message}</p>
                    ) : null}
                  </div>
                  <Badge className={cn("w-fit shrink-0 border-0", statusTone[level])}>
                    {userCopy.systemStatus.levels[level]}
                  </Badge>
                </li>
              );
            })}
          </ul>
        </EnterprisePanelCard>

        {systemStatusIncidents.length > 0 ? (
          <EnterprisePanelCard title={userCopy.systemStatus.incidents} contentClassName="divide-y divide-border px-0 py-0">
            <ul>
              {systemStatusIncidents.map((incident) => (
                <li key={incident.id} className="px-6 py-4">
                  <div className="flex items-center justify-between gap-3">
                    <p className="text-sm font-medium">{incident.title}</p>
                    <Badge variant="outline">{incident.resolved ? userCopy.systemStatus.resolved : userCopy.systemStatus.active}</Badge>
                  </div>
                  <p className="mt-1 text-xs text-muted-foreground">{incident.date}</p>
                  <p className="mt-2 text-sm text-muted-foreground">{incident.summary}</p>
                </li>
              ))}
            </ul>
          </EnterprisePanelCard>
        ) : (
          <EnterprisePanelCard
            title={userCopy.systemStatus.incidents}
            contentClassName="px-6 py-5 text-sm text-muted-foreground"
          >
            {userCopy.systemStatus.noIncidents}
          </EnterprisePanelCard>
        )}

        <p className="text-center text-xs text-muted-foreground">
          {userCopy.systemStatus.helpPrompt}{" "}
          <Link href="/help" className="font-medium text-primary hover:underline">
            {userCopy.systemStatus.helpLink}
          </Link>
        </p>
      </div>
    </EnterpriseWorkspaceShell>
  );
}
