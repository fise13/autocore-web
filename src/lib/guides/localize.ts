import type { GuideDefinition } from "@/lib/guides/types";
import { userCopy } from "@/lib/user-copy";

type GuideCatalogCopyId = keyof typeof userCopy.guides.catalog;

export function localizeGuide(guide: GuideDefinition): GuideDefinition {
  const copy = userCopy.guides.catalog[guide.id as GuideCatalogCopyId];
  if (!copy) return guide;
  return {
    ...guide,
    title: copy.title,
    summary: copy.summary,
    aiExplanation: copy.aiExplanation,
  };
}
