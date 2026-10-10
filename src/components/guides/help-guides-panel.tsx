"use client";

import { BorderBeam } from "border-beam";
import { ArrowUp, ClipboardList, Package, Users } from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { AnimatePresence, LayoutGroup, motion, useReducedMotion } from "motion/react";
import { useTheme } from "next-themes";
import {
  useEffect,
  useRef,
  useState,
  type FormEvent,
  type KeyboardEvent,
  type ReactNode,
} from "react";

import { ThinkingOrb } from "@/components/ai/thinking-orb";
import { ToolPartRenderer } from "@/components/ai/tools/tool-part-renderer";
import { useGuideOptional } from "@/components/guides/guide-provider";
import type { CoreUIMessage, CoreUIPart } from "@/domain/ai/core-message";
import { replyToGuideAsk } from "@/lib/guides/ask-interceptor";
import { GUIDE_CATALOG } from "@/lib/guides/catalog";
import { localizeGuide } from "@/lib/guides/localize";
import { userCopy } from "@/lib/user-copy";
import { cn } from "@/lib/utils";

const EASE = [0.16, 1, 0.3, 1] as const;
const CHIP_SPRING = { type: "spring" as const, stiffness: 420, damping: 34, mass: 0.85 };

type RevealPhase = "thinking" | "typing" | "ready";

function textOf(message: CoreUIMessage): string {
  return message.parts
    .filter((part): part is Extract<CoreUIPart, { type: "text" }> => part.type === "text")
    .map((part) => part.text)
    .join("")
    .trim();
}

function lastAssistantOf(messages: CoreUIMessage[]): CoreUIMessage | undefined {
  for (let index = messages.length - 1; index >= 0; index -= 1) {
    if (messages[index]?.role === "assistant") return messages[index];
  }
  return undefined;
}

function HelpComposerBeam({ children, className }: { children: ReactNode; className?: string }) {
  const { resolvedTheme } = useTheme();
  const reduceMotion = useReducedMotion();

  return (
    <BorderBeam
      size="md"
      colorVariant="colorful"
      strength={0.7}
      theme={resolvedTheme === "light" ? "light" : "dark"}
      active={!reduceMotion}
      className={className}
    >
      {children}
    </BorderBeam>
  );
}

export function HelpGuidesPanel() {
  const guide = useGuideOptional();
  const reduceMotion = useReducedMotion();
  const [text, setText] = useState("");
  const [messages, setMessages] = useState<CoreUIMessage[]>([]);
  const [selectedChip, setSelectedChip] = useState<string | null>(null);
  const [revealId, setRevealId] = useState<string | null>(null);
  const [phase, setPhase] = useState<RevealPhase>("ready");
  const [typed, setTyped] = useState("");
  const enabled = Boolean(guide?.enabled);
  const chipTimer = useRef(0);
  const threadRef = useRef<HTMLDivElement>(null);
  const suggestions: readonly { prompt: string; Icon: LucideIcon }[] = [
    { prompt: userCopy.guides.suggestions.workOrder, Icon: ClipboardList },
    { prompt: userCopy.guides.suggestions.invite, Icon: Users },
    { prompt: userCopy.guides.suggestions.inventory, Icon: Package },
  ];

  const lastAssistant = lastAssistantOf(messages);

  useEffect(() => {
    if (phase !== "thinking" || !revealId) return;
    const timer = window.setTimeout(() => setPhase("typing"), 720);
    return () => window.clearTimeout(timer);
  }, [phase, revealId]);

  useEffect(() => {
    if (phase !== "typing" || !lastAssistant || lastAssistant.id !== revealId) return;
    const full = textOf(lastAssistant);
    if (!full) return;
    let index = 0;
    const step = Math.max(1, Math.ceil(full.length / 52));
    const timer = window.setInterval(() => {
      index += step;
      setTyped(full.slice(0, index));
      if (index >= full.length) {
        window.clearInterval(timer);
        setPhase("ready");
      }
    }, 16);
    return () => window.clearInterval(timer);
  }, [lastAssistant, phase, revealId]);

  useEffect(() => {
    const node = threadRef.current;
    if (!node) return;
    node.scrollTo({
      top: node.scrollHeight,
      behavior: reduceMotion ? "auto" : "smooth",
    });
  }, [messages.length, phase, typed, reduceMotion]);

  if (!enabled) return null;

  const presenting = phase === "thinking" || phase === "typing";

  function submit(question: string) {
    const trimmed = question.trim();
    if (!trimmed || presenting) return;
    window.clearTimeout(chipTimer.current);
    const next = replyToGuideAsk(trimmed);
    const assistant = lastAssistantOf(next);
    const full = assistant ? textOf(assistant) : "";
    setMessages((current) => [...current, ...next].slice(-8));
    setText("");
    if (!assistant) return;
    setRevealId(assistant.id);
    if (reduceMotion || !full) {
      setPhase("ready");
      setTyped(full);
      return;
    }
    setPhase("thinking");
    setTyped("");
  }

  function pickSuggestion(prompt: string) {
    if (presenting) return;
    setSelectedChip(prompt);
    if (reduceMotion) {
      submit(prompt);
      return;
    }
    window.clearTimeout(chipTimer.current);
    chipTimer.current = window.setTimeout(() => submit(prompt), 180);
  }

  function onSubmit(event: FormEvent) {
    event.preventDefault();
    setSelectedChip(null);
    submit(text);
  }

  function onKeyDown(event: KeyboardEvent<HTMLInputElement>) {
    if (event.key !== "Enter" || event.nativeEvent.isComposing) return;
    event.preventDefault();
    setSelectedChip(null);
    submit(text);
  }

  return (
    <section>
      <div className="min-w-0">
        <h2 className="text-[17px] font-semibold tracking-tight">{userCopy.guides.helpTitle}</h2>
        <p className="mt-0.5 text-sm text-muted-foreground">{userCopy.guides.helpDescription}</p>
      </div>

      <HelpComposerBeam className="mt-4 w-full">
        <form
          onSubmit={onSubmit}
          className="core-liquid-glass core-composer-pill flex items-center gap-2 pl-4 pr-1.5"
        >
          <input
            value={text}
            onChange={(event) => setText(event.target.value)}
            onKeyDown={onKeyDown}
            placeholder={userCopy.guides.helpPlaceholder}
            disabled={presenting}
            className="min-h-12 min-w-0 flex-1 bg-transparent text-[15px] leading-5 text-foreground outline-none placeholder:text-muted-foreground disabled:opacity-60"
            aria-label={userCopy.guides.helpAskAria}
          />
          <button
            type="submit"
            aria-label={userCopy.ai.send}
            disabled={!text.trim() || presenting}
            className={cn(
              "flex size-8 shrink-0 items-center justify-center rounded-full bg-foreground text-background",
              "disabled:opacity-40",
            )}
          >
            <ArrowUp className="size-4" />
          </button>
        </form>
      </HelpComposerBeam>

      <LayoutGroup id="help-guide-chips">
        <div className="mt-3 flex flex-wrap gap-2">
          {suggestions.map(({ prompt, Icon }) => {
            const selected = selectedChip === prompt;
            return (
              <motion.button
                key={prompt}
                type="button"
                onClick={() => pickSuggestion(prompt)}
                disabled={presenting}
                whileTap={reduceMotion ? undefined : { scale: 0.96 }}
                transition={CHIP_SPRING}
                className={cn(
                  "relative inline-flex items-center gap-1.5 overflow-hidden rounded-full px-3 py-1.5",
                  "border border-border/60 bg-background text-grid leading-4",
                  "text-foreground/80 transition-colors hover:bg-muted/40 hover:text-foreground",
                  "disabled:pointer-events-none disabled:opacity-50",
                  selected && "text-foreground",
                )}
              >
                {selected ? (
                  <motion.span
                    layoutId="help-guide-chip-fill"
                    className="absolute inset-0 rounded-full bg-secondary"
                    transition={CHIP_SPRING}
                  />
                ) : null}
                <Icon
                  className="relative z-10 size-3.5 shrink-0 text-muted-foreground"
                  strokeWidth={1.7}
                />
                <span className="relative z-10">{prompt}</span>
              </motion.button>
            );
          })}
        </div>
      </LayoutGroup>

      <AnimatePresence mode="wait" initial={false}>
        {messages.length > 0 ? (
          <motion.div
            key="thread"
            ref={threadRef}
            initial={reduceMotion ? false : { opacity: 0, y: 18 }}
            animate={{ opacity: 1, y: 0 }}
            exit={reduceMotion ? undefined : { opacity: 0, y: -10 }}
            transition={{ duration: 0.38, ease: EASE }}
            className="mt-5 max-h-80 space-y-3 overflow-y-auto"
          >
            {messages.map((message) => {
              if (message.role === "user") {
                const body = textOf(message);
                if (!body) return null;
                return (
                  <motion.p
                    key={message.id}
                    initial={reduceMotion ? false : { opacity: 0, y: 14, scale: 0.98 }}
                    animate={{ opacity: 1, y: 0, scale: 1 }}
                    transition={{ duration: 0.32, ease: EASE }}
                    className="ml-auto max-w-[min(85%,28rem)] rounded-full bg-secondary px-4 py-2 text-[15px] leading-snug text-foreground"
                  >
                    {body}
                  </motion.p>
                );
              }
              if (message.role !== "assistant") return null;
              const revealing = message.id === revealId;
              const full = textOf(message);
              const body = revealing ? typed : full;
              const showTools = !revealing || phase === "ready";
              const hideText = revealing && phase === "thinking";
              return (
                <motion.div
                  key={message.id}
                  initial={reduceMotion ? false : { opacity: 0, y: 16 }}
                  animate={{ opacity: hideText ? 0.001 : 1, y: hideText ? 8 : 0 }}
                  transition={{ duration: 0.36, ease: EASE }}
                  className="space-y-2"
                >
                  {hideText ? null : body ? (
                    <p className="text-[15px] leading-6 text-foreground">
                      {body}
                      {revealing && phase === "typing" ? (
                        <span
                          className="ml-0.5 inline-block h-[1em] w-px translate-y-0.5 bg-foreground align-middle"
                          aria-hidden
                        />
                      ) : null}
                    </p>
                  ) : null}
                  {showTools
                    ? message.parts.map((part, index) => {
                        if (!part.type.startsWith("tool-")) return null;
                        return (
                          <motion.div
                            key={`${message.id}-${index}`}
                            initial={reduceMotion ? false : { opacity: 0, y: 12 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ duration: 0.34, ease: EASE, delay: 0.06 }}
                          >
                            <ToolPartRenderer part={part} />
                          </motion.div>
                        );
                      })
                    : null}
                </motion.div>
              );
            })}
            {phase === "thinking" ? (
              <motion.div
                key="thinking-orb"
                initial={reduceMotion ? false : { opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                className="flex justify-start py-1"
              >
                <ThinkingOrb size={64} />
              </motion.div>
            ) : null}
          </motion.div>
        ) : (
          <motion.ul
            key="catalog"
            initial={false}
            exit={reduceMotion ? undefined : { opacity: 0, y: -12 }}
            transition={{ duration: 0.28, ease: EASE }}
            className="mt-5 grid gap-2 sm:grid-cols-2"
          >
            {GUIDE_CATALOG.map((item) => {
              const display = localizeGuide(item);
              return (
              <li
                key={item.id}
                className="flex items-center justify-between gap-3 rounded-2xl border border-border/60 px-3.5 py-3"
              >
                <div className="min-w-0">
                  <p className="text-sm font-medium">{display.title}</p>
                  <p className="mt-0.5 text-xs leading-relaxed text-muted-foreground">{display.summary}</p>
                </div>
                <button
                  type="button"
                  className="h-8 shrink-0 rounded-full border border-border/60 px-3 text-xs font-medium transition-colors hover:bg-muted/40"
                  onClick={() => guide?.start(item.id)}
                >
                  {userCopy.guides.start}
                </button>
              </li>
              );
            })}
          </motion.ul>
        )}
      </AnimatePresence>
    </section>
  );
}
