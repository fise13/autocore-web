import { getGuide } from "@/lib/guides/catalog";
import type { GuideDefinition } from "@/lib/guides/types";
import { userCopy } from "@/lib/user-copy";

export type GuideIntent =
  | { type: "guide"; guide: GuideDefinition }
  | { type: "explain"; title: string; explanation: string; href?: string };

const GUIDE_PATTERNS: { guideId: string; patterns: RegExp[] }[] = [
  {
    guideId: "create-work-order",
    patterns: [
      /how (do i|to) create (a )?(work[ -]?order|job|order)/i,
      /create (a )?(work[ -]?order|job)/i,
      /new work[ -]?order/i,
      /open (a )?work[ -]?order/i,
      /как (создать|открыть).*(заказ|наряд|work.?order)/i,
    ],
  },
  {
    guideId: "invite-team-member",
    patterns: [
      /how (do i|to) (invite|add).*(team|member|employee|mechanic|colleague)/i,
      /invite (a )?(mechanic|member|employee|teammate)/i,
      /add (someone|a (mechanic|member|employee)) to (my )?team/i,
      /how (do i|to) add someone to my team/i,
      /как (пригласить|добавить).*(команд|механик|сотрудник)/i,
    ],
  },
];

const INVENTORY_PATTERNS = [
  /how (does|do) inventory work/i,
  /how (do i|to) add (an )?engine/i,
  /where (are|is) (the )?engines/i,
  /как работает (склад|инвентар|моторы)/i,
];

export function resolveGuideIntent(question: string): GuideIntent | null {
  const text = question.trim();
  if (!text) return null;

  for (const entry of GUIDE_PATTERNS) {
    if (entry.patterns.some((pattern) => pattern.test(text))) {
      const guide = getGuide(entry.guideId);
      if (guide) return { type: "guide", guide };
    }
  }

  if (INVENTORY_PATTERNS.some((pattern) => pattern.test(text))) {
    return {
      type: "explain",
      title: userCopy.guides.inventoryTitle,
      explanation: userCopy.guides.inventoryExplanation,
      href: "/motors",
    };
  }

  return null;
}
