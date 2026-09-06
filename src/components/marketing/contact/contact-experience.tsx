"use client";

import { useEffect, useRef, useState, type ReactNode } from "react";
import { ArrowLeft, ArrowRight, ArrowUpRight, Check } from "lucide-react";
import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import { useLocale } from "next-intl";

import { ContactComposer } from "@/components/marketing/contact/contact-composer";
import { useMarketingPages } from "@/components/marketing/content/use-marketing-pages";
import { Link } from "@/i18n/navigation";
import { storePreferredLocale, withLangQuery, type AppLocale } from "@/lib/locale/preferred-locale";
import {
  isContactIntent,
  type ContactIntent,
} from "@/lib/marketing/contact-contract";
import { getPlatformContacts } from "@/lib/platform/platform-contacts";
import { appDemoUrl } from "@/lib/site-urls";
import { writeClipboardText } from "@/platform/clipboard";

const supportEmail = getPlatformContacts().email;
const EASE = [0.16, 1, 0.3, 1] as const;
const PRIMARY_INTENTS: ContactIntent[] = ["sales", "support"];

type IntentCopy = {
  id: string;
  title: string;
  description: string;
  topics: string[];
  mailSubject: string;
};

type PagesCopy = ReturnType<typeof useMarketingPages>["contact"];

function openProductDemo(locale: AppLocale) {
  storePreferredLocale(locale);
  window.location.href = withLangQuery(appDemoUrl(), locale);
}

function stageTransition(reduced: boolean | null, direction: 1 | -1) {
  if (reduced) {
    return {
      initial: { opacity: 0 },
      animate: { opacity: 1 },
      exit: { opacity: 0 },
      transition: { duration: 0.16 },
    };
  }

  return {
    initial: { opacity: 0, y: 22 * direction },
    animate: { opacity: 1, y: 0 },
    exit: { opacity: 0, y: -16 * direction },
    transition: { duration: 0.48, ease: EASE },
  };
}

function TopicView({
  active,
  copy,
  headingRef,
  reduced,
  onBack,
  onSwitch,
}: {
  active: IntentCopy & { id: ContactIntent };
  copy: PagesCopy;
  headingRef: React.RefObject<HTMLHeadingElement | null>;
  reduced: boolean | null;
  onBack: () => void;
  onSwitch: (intent: ContactIntent) => void;
}) {
  const switchIntent = active.id === "sales" ? "support" : "sales";
  const switchCopy = active.id === "sales" ? copy.form.switchToSupport : copy.form.switchToSales;

  return (
    <div className="contact-split">
      <div className="contact-copy">
        <motion.button
          type="button"
          className="contact-back"
          onClick={onBack}
          initial={reduced ? false : { opacity: 0, x: -8 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.35, ease: EASE }}
        >
          <ArrowLeft aria-hidden />
          {copy.form.back}
        </motion.button>
        <motion.h1
          ref={headingRef}
          tabIndex={-1}
          className="exp-display contact-title"
          initial={reduced ? false : { opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.44, delay: reduced ? 0 : 0.04, ease: EASE }}
        >
          {active.title}
        </motion.h1>
        <ul className="contact-topics">
          {active.topics.map((item, index) => (
            <motion.li
              key={item}
              initial={reduced ? false : { opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{
                duration: 0.38,
                delay: reduced ? 0 : 0.14 + index * 0.07,
                ease: EASE,
              }}
            >
              <span className="contact-topic-mark" aria-hidden>
                <Check strokeWidth={2.5} />
              </span>
              {item}
            </motion.li>
          ))}
        </ul>
        {active.id === "sales" || active.id === "support" ? (
          <motion.p
            className="contact-switch"
            initial={reduced ? false : { opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.35, delay: reduced ? 0 : 0.38, ease: EASE }}
          >
            {active.id === "support" ? copy.form.salesPrompt : copy.form.supportPrompt}{" "}
            <button type="button" onClick={() => onSwitch(switchIntent)}>
              {switchCopy}
            </button>
          </motion.p>
        ) : null}
      </div>

      <motion.div
        className="contact-aside"
        initial={reduced ? false : { opacity: 0, y: 24 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.52, delay: reduced ? 0 : 0.12, ease: EASE }}
      >
        <ContactComposer
          intent={active.id}
          mailSubject={active.mailSubject}
          supportEmail={supportEmail}
          copy={copy.form}
        />
      </motion.div>
    </div>
  );
}

function HubView({
  copy,
  primary,
  partnerships,
  reduced,
  copied,
  locale,
  onOpen,
  onCopyEmail,
}: {
  copy: PagesCopy;
  primary: Array<IntentCopy & { id: ContactIntent }>;
  partnerships: (IntentCopy & { id: ContactIntent }) | undefined;
  reduced: boolean | null;
  copied: boolean;
  locale: AppLocale;
  onOpen: (intent: ContactIntent) => void;
  onCopyEmail: () => void;
}) {
  return (
    <>
      <div className="contact-split">
        <div className="contact-copy">
          <h1 className="exp-display contact-title">{copy.hero.title}</h1>
          <p className="contact-lead">{copy.hero.description}</p>
        </div>

        <div className="contact-aside">
          <h2 className="sr-only">{copy.intentsHeading}</h2>
          <ul className="contact-channel-grid">
            {primary.map((intent) => (
              <li key={intent.id}>
                <motion.button
                  type="button"
                  className="contact-channel-card"
                  onClick={() => onOpen(intent.id)}
                  whileTap={reduced ? undefined : { scale: 0.985 }}
                  transition={{ duration: 0.18, ease: EASE }}
                >
                  <span className="contact-channel-title">{intent.title}</span>
                  <span className="contact-channel-body">{intent.description}</span>
                </motion.button>
              </li>
            ))}
          </ul>
        </div>
      </div>

      <div className="contact-touch">
        <h2 className="contact-touch-heading">{copy.methodsHeading}</h2>
        <ul className="contact-touch-list">
          <li className="contact-touch-row">
            <div>
              <p className="contact-touch-title">{copy.touch.emailTitle}</p>
              <p className="contact-touch-body">{copy.touch.emailDescription}</p>
            </div>
            <button
              type="button"
              className="contact-touch-action"
              onClick={onCopyEmail}
              aria-label={copied ? copy.touch.copied : copy.touch.copyEmail}
            >
              {supportEmail}
              <span aria-hidden>{copied ? <Check strokeWidth={2.25} /> : "+"}</span>
            </button>
          </li>
          <li className="contact-touch-row">
            <div>
              <p className="contact-touch-title">{copy.touch.demoTitle}</p>
              <p className="contact-touch-body">{copy.touch.demoDescription}</p>
            </div>
            <button
              type="button"
              className="contact-touch-action"
              onClick={() => openProductDemo(locale)}
            >
              {copy.touch.demoAction}
              <ArrowUpRight aria-hidden />
            </button>
          </li>
          <li className="contact-touch-row">
            <div>
              <p className="contact-touch-title">{copy.touch.productTitle}</p>
              <p className="contact-touch-body">{copy.touch.productDescription}</p>
            </div>
            <Link href="/product" className="contact-touch-action">
              {copy.touch.productAction}
              <ArrowRight aria-hidden />
            </Link>
          </li>
          {partnerships ? (
            <li className="contact-touch-row">
              <div>
                <p className="contact-touch-title">{copy.touch.partnershipsTitle}</p>
                <p className="contact-touch-body">{copy.touch.partnershipsDescription}</p>
              </div>
              <button
                type="button"
                className="contact-touch-action"
                onClick={() => onOpen("partnerships")}
              >
                {copy.touch.partnershipsAction}
                <ArrowRight aria-hidden />
              </button>
            </li>
          ) : null}
        </ul>
      </div>
    </>
  );
}

export function ContactExperience() {
  const pages = useMarketingPages();
  const copy = pages.contact;
  const locale = useLocale() as AppLocale;
  const reduced = useReducedMotion();
  const headingRef = useRef<HTMLHeadingElement>(null);
  const directionRef = useRef<1 | -1>(1);
  const [topic, setTopic] = useState<ContactIntent | null>(null);
  const [copied, setCopied] = useState(false);

  const intents = copy.intents.filter((intent): intent is IntentCopy & { id: ContactIntent } =>
    isContactIntent(intent.id),
  );
  const active = topic ? intents.find((intent) => intent.id === topic) : null;
  const primary = intents.filter((intent) => PRIMARY_INTENTS.includes(intent.id));
  const partnerships = intents.find((intent) => intent.id === "partnerships");
  const direction = directionRef.current;

  function openTopic(next: ContactIntent | null) {
    directionRef.current = next ? 1 : -1;
    setTopic(next);
  }

  useEffect(() => {
    if (!topic) return;
    const timer = window.setTimeout(() => headingRef.current?.focus(), reduced ? 0 : 420);
    return () => window.clearTimeout(timer);
  }, [topic, reduced]);

  async function copyEmail() {
    const ok = await writeClipboardText(supportEmail);
    if (!ok) return;
    setCopied(true);
    window.setTimeout(() => setCopied(false), 1600);
  }

  return (
    <div className="contact-page">
      <div className="contact-shell">
        <AnimatePresence mode="wait" initial={false}>
          {active ? (
            <motion.div
              key={active.id}
              className="contact-stage"
              {...stageTransition(reduced, direction)}
            >
              <TopicView
                active={active}
                copy={copy}
                headingRef={headingRef}
                reduced={reduced}
                onBack={() => openTopic(null)}
                onSwitch={(intent) => openTopic(intent)}
              />
            </motion.div>
          ) : (
            <motion.div
              key="hub"
              className="contact-stage"
              {...stageTransition(reduced, direction)}
            >
              <HubView
                copy={copy}
                primary={primary}
                partnerships={partnerships}
                reduced={reduced}
                copied={copied}
                locale={locale}
                onOpen={(intent) => openTopic(intent)}
                onCopyEmail={() => void copyEmail()}
              />
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}
