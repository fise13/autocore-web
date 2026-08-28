/**
 * The one description of what a feedback report may contain.
 *
 * Both ends read it. A form that lets someone type 5,000 characters into a
 * field the route caps at 4,000 does not fail until after they have written
 * them, so the counter under the textarea and the schema on the server are the
 * same numbers rather than two guesses that drift.
 */

export const FEEDBACK_KINDS = ["bug", "idea", "question", "other"] as const;

export type FeedbackKind = (typeof FEEDBACK_KINDS)[number];

export const FEEDBACK_MESSAGE_MIN = 10;
export const FEEDBACK_MESSAGE_MAX = 4000;
export const FEEDBACK_SUBJECT_MAX = 120;

/** A screenshot is the common attachment; the ceiling is sized for one. */
export const FEEDBACK_MAX_ATTACHMENT_BYTES = 10 * 1024 * 1024;

/**
 * What the subject line of the mail says.
 *
 * Deliberately not translated: the destination is the team's inbox, not the
 * reader's screen, and a mailbox filter is easier to write against a fixed
 * word than against whichever language the reporter's account happened to be
 * set to.
 */
export function feedbackKindLabel(kind: FeedbackKind): string {
  switch (kind) {
    case "bug":
      return "Bug";
    case "idea":
      return "Idea";
    case "question":
      return "Question";
    case "other":
      return "Feedback";
  }
}

export function isFeedbackKind(value: unknown): value is FeedbackKind {
  return typeof value === "string" && (FEEDBACK_KINDS as readonly string[]).includes(value);
}
