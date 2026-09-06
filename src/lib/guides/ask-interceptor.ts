import type { CoreUIMessage } from "@/domain/ai/core-message";
import { resolveGuideIntent } from "@/lib/guides/intent";
import { localizeGuide } from "@/lib/guides/localize";
import { userCopy } from "@/lib/user-copy";

export type GuideAskOffer = {
  userText: string;
  messages: CoreUIMessage[];
};

function messageId(prefix: string): string {
  return typeof crypto !== "undefined" && "randomUUID" in crypto
    ? `${prefix}-${crypto.randomUUID()}`
    : `${prefix}-${Date.now()}`;
}

/**
 * Help how-to path: map a question to a typed assistant turn without calling
 * the model. The Guide Engine still owns the walkthrough. Core AI uses the
 * same `showGuide` tool when the user asks in chat.
 */
export function buildGuideAskOffer(text: string): GuideAskOffer | null {
  const intent = resolveGuideIntent(text);
  if (!intent) return null;

  const userText = text.trim();
  const userMessage: CoreUIMessage = {
    id: messageId("guide-user"),
    role: "user",
    parts: [{ type: "text", text: userText }],
  };

  if (intent.type === "explain") {
    const assistantMessage: CoreUIMessage = {
      id: messageId("guide-assistant"),
      role: "assistant",
      parts: [
        { type: "text", text: intent.explanation },
        ...(intent.href
          ? [
              {
                type: "tool-navigateTo" as const,
                toolCallId: messageId("nav"),
                state: "output-available" as const,
                input: { href: intent.href, label: userCopy.guides.openMotors },
                output: {
                  ok: true as const,
                  href: intent.href,
                  label: userCopy.guides.openMotors,
                  reason: intent.title,
                },
              },
            ]
          : []),
      ],
    };
    return { userText, messages: [userMessage, assistantMessage] };
  }

  const display = localizeGuide(intent.guide);

  const assistantMessage: CoreUIMessage = {
    id: messageId("guide-assistant"),
    role: "assistant",
    parts: [
      { type: "text", text: display.aiExplanation },
      {
        type: "tool-showGuide",
        toolCallId: messageId("guide"),
        state: "output-available",
        input: { guideId: display.id },
        output: {
          ok: true,
          guideId: display.id,
          title: display.title,
          summary: display.summary,
        },
      },
    ],
  };

  return { userText, messages: [userMessage, assistantMessage] };
}

/**
 * Help-only replies. Never goes through Core chat or `/api/assistant`.
 */
export function replyToGuideAsk(text: string): CoreUIMessage[] {
  const offer = buildGuideAskOffer(text);
  if (offer) return offer.messages;

  const userText = text.trim();
  return [
    {
      id: messageId("guide-user"),
      role: "user",
      parts: [{ type: "text", text: userText }],
    },
    {
      id: messageId("guide-assistant"),
      role: "assistant",
      parts: [{ type: "text", text: userCopy.guides.unmatched }],
    },
  ];
}
