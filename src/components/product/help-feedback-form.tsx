"use client";

import { useRef, useState, type ReactNode } from "react";
import { usePathname } from "next/navigation";
import {
  Bug,
  Check,
  CircleHelp,
  Lightbulb,
  Loader2,
  MessageSquare,
  Paperclip,
  Send,
  X,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { AnimatePresence, motion, useReducedMotion } from "motion/react";

import { EnterprisePanelCard } from "@/components/layout/enterprise-panel-card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/components/ui/toast-provider";
import { useAuth } from "@/components/providers/auth-provider";
import { getFirebaseAuth } from "@/infrastructure/firebase/client";
import {
  FEEDBACK_KINDS,
  FEEDBACK_MAX_ATTACHMENT_BYTES,
  FEEDBACK_MESSAGE_MAX,
  FEEDBACK_MESSAGE_MIN,
  FEEDBACK_SUBJECT_MAX,
  type FeedbackKind,
} from "@/lib/support/feedback-contract";
import { userCopy } from "@/lib/user-copy";
import { cn } from "@/lib/utils";

const KIND_ICONS: Record<FeedbackKind, LucideIcon> = {
  bug: Bug,
  idea: Lightbulb,
  question: CircleHelp,
  other: MessageSquare,
};

const EASE = [0.16, 1, 0.3, 1] as const;

/** Below this the counter is a warning rather than decoration. */
const COUNTER_VISIBLE_FROM = FEEDBACK_MESSAGE_MAX - 400;

type Phase = "editing" | "sending" | "sent";

/**
 * In-product feedback.
 *
 * Help could already put an address on screen, but a `mailto:` is a dead end on
 * a work laptop with no mail client configured, and what arrives through one is
 * a bare paragraph — no account, no company, no screen. This posts instead, and
 * the route fills those in from the verified session, so the person writing has
 * to supply only the part nobody else knows: what happened.
 *
 * The four kinds are not decoration. Each one changes the placeholder into an
 * example of a *useful* report of that kind, which is the cheapest way to ask
 * for reproduction steps without printing a form full of required fields.
 *
 * `mailto:` survives as the fallback for a deployment with no mail transport
 * configured — the one case where posting genuinely cannot work, and the worst
 * possible moment to discard what someone just wrote.
 */
export function HelpFeedbackForm({ supportEmail }: { supportEmail: string }) {
  const copy = userCopy.help.feedback;
  const { toast } = useToast();
  const { profile } = useAuth();
  const pathname = usePathname();
  const reduceMotion = useReducedMotion();
  const fileRef = useRef<HTMLInputElement>(null);

  const [kind, setKind] = useState<FeedbackKind>("bug");
  const [subject, setSubject] = useState("");
  const [message, setMessage] = useState("");
  const [replyTo, setReplyTo] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const [phase, setPhase] = useState<Phase>("editing");
  const [touched, setTouched] = useState(false);

  const accountEmail = profile?.email ?? "";
  const trimmed = message.trim();
  const tooShort = trimmed.length < FEEDBACK_MESSAGE_MIN;
  const remaining = FEEDBACK_MESSAGE_MAX - message.length;
  const showCounter = message.length >= COUNTER_VISIBLE_FROM;
  const sending = phase === "sending";

  const pageLabel = pathname || "/help";

  /**
   * Browser, OS and viewport, read at submit rather than at mount.
   *
   * This is the half of a bug report nobody thinks to type and every "works for
   * me" reply turns on. It is disclosed under the send button rather than
   * collected quietly — the form says exactly what rides along with it.
   */
  function describeClient(): string {
    if (typeof window === "undefined") return "";
    return [
      navigator.userAgent,
      `${window.innerWidth}x${window.innerHeight}`,
      `dpr ${window.devicePixelRatio}`,
    ].join(" · ");
  }

  function reset() {
    setSubject("");
    setMessage("");
    setFile(null);
    setTouched(false);
    setPhase("editing");
  }

  function pickFile(next: File | null) {
    if (next && next.size > FEEDBACK_MAX_ATTACHMENT_BYTES) {
      toast({ title: copy.attachTooLarge, variant: "error" });
      return;
    }
    setFile(next);
  }

  /** Hand the reader's own words to their mail client rather than dropping them. */
  function fallbackToMailto(support: string) {
    const body = [subject ? `${subject}\n` : "", message].join("");
    const href =
      `mailto:${support}` +
      `?subject=${encodeURIComponent(subject || copy.title)}` +
      `&body=${encodeURIComponent(body)}`;
    toast({
      title: copy.mailFallbackTitle,
      description: copy.mailFallbackDescription,
      variant: "default",
    });
    window.location.href = href;
  }

  async function submit() {
    setTouched(true);
    if (tooShort || sending) return;

    setPhase("sending");
    try {
      const token = await getFirebaseAuth().currentUser?.getIdToken();
      if (!token) throw new Error("no-token");

      const body = new FormData();
      body.set("kind", kind);
      body.set("subject", subject.trim());
      body.set("message", trimmed);
      body.set("replyTo", replyTo.trim());
      body.set("pageUrl", pageLabel);
      body.set("client", describeClient());
      if (file) body.set("file", file);

      const response = await fetch("/api/support/feedback", {
        method: "POST",
        headers: { Authorization: `Bearer ${token}` },
        body,
      });

      if (!response.ok) {
        const data = (await response.json().catch(() => null)) as
          | { error?: string; support?: string }
          | null;

        if (response.status === 503 && data?.support) {
          fallbackToMailto(data.support);
          setPhase("editing");
          return;
        }
        if (response.status === 429) {
          toast({
            title: copy.rateLimitedTitle,
            description: copy.rateLimitedDescription,
            variant: "error",
          });
          setPhase("editing");
          return;
        }
        throw new Error(data?.error ?? "send_failed");
      }

      setPhase("sent");
      toast({ title: copy.sentTitle, description: copy.sentDescription, variant: "success" });
    } catch {
      setPhase("editing");
      toast({ title: copy.failedTitle, description: copy.failedDescription, variant: "error" });
    }
  }

  return (
    <EnterprisePanelCard
      title={copy.title}
      description={copy.description}
      contentClassName="px-6 py-5"
    >
      <AnimatePresence mode="wait" initial={false}>
        {phase === "sent" ? (
          <motion.div
            key="feedback-sent"
            initial={reduceMotion ? false : { opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={reduceMotion ? undefined : { opacity: 0, y: -8 }}
            transition={{ duration: 0.28, ease: EASE }}
            className="flex flex-col items-start gap-3 py-2"
          >
            <span className="flex size-10 items-center justify-center rounded-full bg-success-subtle text-success-on-subtle">
              <Check className="size-5" />
            </span>
            <div>
              <p className="text-sm font-medium">{copy.sentTitle}</p>
              <p className="mt-1 text-sm text-muted-foreground">{copy.sentDescription}</p>
            </div>
            <Button variant="outline" size="sm" onClick={reset}>
              {copy.sentAgain}
            </Button>
          </motion.div>
        ) : (
          <motion.form
            key="feedback-form"
            initial={reduceMotion ? false : { opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.2, ease: EASE }}
            className="flex flex-col gap-5"
            onSubmit={(event) => {
              event.preventDefault();
              void submit();
            }}
          >
            <fieldset className="flex flex-col gap-2.5" disabled={sending}>
              <legend className="mb-2.5 text-sm font-medium">{copy.kindLabel}</legend>
              <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-4">
                {FEEDBACK_KINDS.map((option) => (
                  <KindButton
                    key={option}
                    icon={KIND_ICONS[option]}
                    label={copy.kinds[option]}
                    active={kind === option}
                    reduceMotion={Boolean(reduceMotion)}
                    onClick={() => setKind(option)}
                  />
                ))}
              </div>
              <p className="text-xs leading-relaxed text-muted-foreground">
                {copy.kindHints[kind]}
              </p>
            </fieldset>

            <FormRow
              htmlFor="feedback-subject"
              label={copy.subjectLabel}
              aside={
                <span className="text-xs font-normal text-muted-foreground">
                  {copy.subjectOptional}
                </span>
              }
            >
              <Input
                id="feedback-subject"
                value={subject}
                maxLength={FEEDBACK_SUBJECT_MAX}
                disabled={sending}
                onChange={(event) => setSubject(event.target.value)}
                placeholder={copy.subjectPlaceholder}
                className="h-9"
              />
            </FormRow>

            <FormRow
              htmlFor="feedback-message"
              label={copy.messageLabel}
              aside={
                showCounter ? (
                  <span
                    className={cn(
                      "text-xs tabular-nums",
                      remaining < 0 ? "text-destructive" : "text-muted-foreground",
                    )}
                  >
                    {copy.charactersLeft(remaining)}
                  </span>
                ) : null
              }
            >
              <Textarea
                id="feedback-message"
                value={message}
                rows={6}
                maxLength={FEEDBACK_MESSAGE_MAX}
                disabled={sending}
                aria-invalid={touched && tooShort ? true : undefined}
                aria-describedby={touched && tooShort ? "feedback-message-error" : undefined}
                onChange={(event) => setMessage(event.target.value)}
                placeholder={copy.messagePlaceholders[kind]}
                className="min-h-32 resize-y"
              />
              <AnimatePresence initial={false}>
                {touched && tooShort ? (
                  <motion.p
                    id="feedback-message-error"
                    initial={reduceMotion ? false : { opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: "auto" }}
                    exit={reduceMotion ? undefined : { opacity: 0, height: 0 }}
                    transition={{ duration: 0.18, ease: EASE }}
                    className="overflow-hidden text-xs text-destructive"
                  >
                    {copy.messageTooShort}
                  </motion.p>
                ) : null}
              </AnimatePresence>
            </FormRow>

            <FormRow htmlFor="feedback-reply-to" label={copy.replyToLabel}>
              <Input
                id="feedback-reply-to"
                type="email"
                value={replyTo}
                disabled={sending}
                onChange={(event) => setReplyTo(event.target.value)}
                placeholder={accountEmail || "you@company.com"}
                className="h-9"
              />
              <p className="text-xs text-muted-foreground">{copy.replyToHint}</p>
            </FormRow>

            <div className="flex flex-col gap-3 border-t pt-4 sm:flex-row sm:items-center sm:justify-between">
              <div className="flex min-w-0 items-center gap-2">
                <input
                  ref={fileRef}
                  type="file"
                  accept="image/*,.pdf,.txt,.log,.csv"
                  className="sr-only"
                  onChange={(event) => pickFile(event.target.files?.[0] ?? null)}
                />
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  disabled={sending}
                  onClick={() => fileRef.current?.click()}
                >
                  <Paperclip data-icon="inline-start" />
                  {file ? copy.attachReplace : copy.attachLabel}
                </Button>
                {file ? (
                  <span className="flex min-w-0 items-center gap-1 text-xs text-muted-foreground">
                    <span className="truncate">{file.name}</span>
                    <button
                      type="button"
                      onClick={() => {
                        setFile(null);
                        if (fileRef.current) fileRef.current.value = "";
                      }}
                      className="rounded p-0.5 transition-colors hover:text-foreground"
                      aria-label={copy.attachRemove}
                    >
                      <X className="size-3.5" />
                    </button>
                  </span>
                ) : null}
              </div>

              <Button type="submit" size="lg" disabled={sending || remaining < 0}>
                {sending ? (
                  <Loader2 className="animate-spin" data-icon="inline-start" />
                ) : (
                  <Send data-icon="inline-start" />
                )}
                {sending ? copy.sending : copy.submit}
              </Button>
            </div>

            <p className="text-xs leading-relaxed text-muted-foreground">
              {copy.contextNote} {supportEmail}
            </p>
          </motion.form>
        )}
      </AnimatePresence>
    </EnterprisePanelCard>
  );
}

function FormRow({
  htmlFor,
  label,
  aside,
  children,
}: {
  htmlFor: string;
  label: string;
  aside?: ReactNode;
  children: ReactNode;
}) {
  return (
    <div className="flex flex-col gap-2">
      <div className="flex items-baseline justify-between gap-3">
        <Label htmlFor={htmlFor}>{label}</Label>
        {aside}
      </div>
      {children}
    </div>
  );
}

/**
 * A pressed-in card rather than a radio dot.
 *
 * The choice changes the placeholder underneath it, so it has to read as a
 * mode the form is now in — an outlined tile does that; a small circle in a
 * row of four labels does not.
 */
function KindButton({
  icon: Icon,
  label,
  active,
  reduceMotion,
  onClick,
}: {
  icon: LucideIcon;
  label: string;
  active: boolean;
  reduceMotion: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={active}
      className={cn(
        // `appearance-none` is load-bearing, not tidiness: WebKit paints the
        // native control for a bare <button> and ignores the author background,
        // which rendered these tiles slate-grey in light mode.
        "group relative flex appearance-none items-center gap-2.5 overflow-hidden rounded-xl border px-3 py-2.5 text-left",
        "transition-[border-color,background-color,color] duration-200 motion-reduce:transition-none",
        active
          ? "border-primary/30 text-foreground"
          : "border-border/60 bg-card text-muted-foreground hover:border-primary/25 hover:bg-muted/30 hover:text-foreground",
      )}
    >
      {active ? (
        reduceMotion ? (
          <span className="absolute inset-0 bg-primary/10" />
        ) : (
          <motion.span
            layoutId="help-feedback-kind-active"
            className="absolute inset-0 bg-primary/10"
            transition={{ type: "spring", stiffness: 420, damping: 34, mass: 0.85 }}
          />
        )
      ) : null}
      <span
        className={cn(
          "relative z-10 flex size-8 shrink-0 items-center justify-center rounded-lg border transition-colors",
          active
            ? "border-primary/25 bg-background text-primary"
            : "border-border/60 bg-background group-hover:text-primary",
        )}
      >
        <Icon className="size-4" />
      </span>
      <span className="relative z-10 text-sm font-medium leading-snug">{label}</span>
    </button>
  );
}
