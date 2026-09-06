"use client";

import { ArrowRight } from "lucide-react";

import { Button } from "@/components/ui/button";
import { useGuideOptional } from "@/components/guides/guide-provider";
import type { ShowGuideOutput } from "@/domain/ai/tool-schemas";
import { getGuide } from "@/lib/guides/catalog";
import { localizeGuide } from "@/lib/guides/localize";
import { userCopy } from "@/lib/user-copy";

type Ok<T> = Extract<T, { ok: true }>;

export function ShowGuideCard({ data }: { data: Ok<ShowGuideOutput> }) {
  const guide = useGuideOptional();
  const canStart = Boolean(guide?.enabled);
  const definition = getGuide(data.guideId);
  const display = definition ? localizeGuide(definition) : data;

  return (
    <div className="max-w-lg rounded-xl border border-border bg-card px-3 py-2.5">
      <p className="text-[13px] font-medium text-foreground">{display.title}</p>
      <p className="mt-0.5 text-[13px] leading-snug text-muted-foreground">{display.summary}</p>
      {canStart ? (
        <Button
          type="button"
          size="sm"
          className="mt-2.5 gap-1.5"
          onClick={() => guide?.start(data.guideId)}
        >
          {userCopy.guides.startWalkthrough}
          <ArrowRight className="size-3.5" />
        </Button>
      ) : null}
    </div>
  );
}
