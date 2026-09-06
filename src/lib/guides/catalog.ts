import { findGuide } from "@/lib/guides/controller";
import { CREATE_WORK_ORDER_GUIDE } from "@/lib/guides/definitions/create-work-order";
import { INVITE_TEAM_MEMBER_GUIDE } from "@/lib/guides/definitions/invite-team-member";
import type { GuideDefinition, GuideId } from "@/lib/guides/types";

export const GUIDE_CATALOG: readonly GuideDefinition[] = [
  CREATE_WORK_ORDER_GUIDE,
  INVITE_TEAM_MEMBER_GUIDE,
];

export const GUIDE_IDS = GUIDE_CATALOG.map((guide) => guide.id);

export function getGuide(guideId: string | null | undefined): GuideDefinition | null {
  return findGuide(GUIDE_CATALOG, guideId);
}

export function isKnownGuideId(guideId: string): guideId is GuideId {
  return GUIDE_CATALOG.some((guide) => guide.id === guideId);
}

export function describeKnownGuides(): string {
  return GUIDE_CATALOG.map((guide) => `${guide.id} (${guide.title})`).join(", ");
}
