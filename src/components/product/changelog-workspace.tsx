"use client";

import Link from "next/link";
import { ArrowUpRight } from "lucide-react";

import { EnterprisePanelCard } from "@/components/layout/enterprise-panel-card";
import { EnterpriseWorkspaceShell } from "@/components/layout/enterprise-workspace-shell";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  getHighlightedProductUpdate,
  productUpdateTagLabels,
  sortProductUpdatesByDate,
  productUpdates,
} from "@/lib/product/product-updates";

function formatUpdateDate(isoDate: string): string {
  const date = new Date(`${isoDate}T12:00:00`);
  return new Intl.DateTimeFormat("ru-RU", {
    day: "numeric",
    month: "long",
    year: "numeric",
  }).format(date);
}

export function ChangelogWorkspace() {
  const updates = sortProductUpdatesByDate(productUpdates);
  const highlight = getHighlightedProductUpdate();

  return (
    <EnterpriseWorkspaceShell
      title="Что нового"
      description="Обновления AutoCore: новые возможности, улучшения и исправления."
    >
      <div className="mx-auto flex w-full max-w-3xl flex-col gap-4">
        {updates.map((update) => (
          <EnterprisePanelCard
            key={update.id}
            title={update.title}
            description={formatUpdateDate(update.date)}
            action={
              update.id === highlight?.id ? (
                <Badge variant="secondary" className="shrink-0">
                  Последнее
                </Badge>
              ) : null
            }
            contentClassName="px-6 py-5"
          >
            <p className="text-sm leading-relaxed text-muted-foreground">{update.summary}</p>
            {update.details?.length ? (
              <ul className="mt-4 space-y-2 text-sm text-foreground/90">
                {update.details.map((detail) => (
                  <li key={detail} className="flex gap-2">
                    <span className="text-muted-foreground">·</span>
                    <span>{detail}</span>
                  </li>
                ))}
              </ul>
            ) : null}
            <div className="mt-5 flex flex-wrap items-center gap-2">
              {update.tags?.map((tag) => (
                <Badge key={tag} variant="outline" className="font-normal">
                  {productUpdateTagLabels[tag]}
                </Badge>
              ))}
              {update.href ? (
                <Button
                  size="sm"
                  variant="outline"
                  className="ml-auto gap-1"
                  render={<Link href={update.href} />}
                  nativeButton={false}
                >
                  Открыть
                  <ArrowUpRight className="size-3.5" />
                </Button>
              ) : null}
            </div>
          </EnterprisePanelCard>
        ))}
      </div>
    </EnterpriseWorkspaceShell>
  );
}
