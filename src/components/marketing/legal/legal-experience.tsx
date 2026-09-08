"use client";

import {
  useCallback,
  useEffect,
  useId,
  useLayoutEffect,
  useRef,
  useState,
  type MouseEvent,
} from "react";
import { useTranslations } from "next-intl";
import { motion, useReducedMotion } from "motion/react";

import { useMarketingPages } from "@/components/marketing/content/use-marketing-pages";
import { Link } from "@/i18n/navigation";
import type { MarketingPathname } from "@/i18n/routing";
import { getPlatformContacts } from "@/lib/platform/platform-contacts";
import { cn } from "@/lib/utils";

const supportEmail = getPlatformContacts().email;
const EASE = [0.16, 1, 0.3, 1] as const;
const TAB_STORAGE_KEY = "autocore-legal-tab";
const DOCUMENT_ORDER = ["privacy", "refund", "terms"] as const;

type LegalSection = {
  id: string;
  title: string;
  paragraphs: string[];
  bullets?: string[];
};

export type LegalDocumentKey = "privacy" | "refund" | "terms";

type LegalExperienceProps = {
  documentKey: LegalDocumentKey;
};

const DOCUMENTS: Array<{
  key: LegalDocumentKey;
  href: MarketingPathname;
}> = [
  { key: "privacy", href: "/legal/privacy" },
  { key: "refund", href: "/legal/refund" },
  { key: "terms", href: "/legal/terms" },
];

type RelatedLink = {
  href: MarketingPathname;
  label: string;
};

function splitHeading(title: string): { index: string | null; text: string } {
  const match = title.match(/^(\d+)\.\s+(.*)$/);
  if (!match) return { index: null, text: title };
  return { index: match[1], text: match[2] };
}

function useActiveSection(sectionKey: string) {
  const ids = sectionKey.split("|").filter(Boolean);
  const [activeId, setActiveId] = useState(ids[0] ?? "");
  const lockedRef = useRef(false);
  const currentId = ids.includes(activeId) ? activeId : (ids[0] ?? "");

  useEffect(() => {
    const observedIds = sectionKey.split("|").filter(Boolean);
    if (observedIds.length === 0) return;

    const elements = observedIds
      .map((id) => document.getElementById(id))
      .filter((node): node is HTMLElement => node !== null);

    if (elements.length === 0) return;

    const visible = new Map<string, number>();

    const observer = new IntersectionObserver(
      (entries) => {
        if (lockedRef.current) return;
        for (const entry of entries) {
          if (entry.isIntersecting) {
            visible.set(entry.target.id, entry.intersectionRatio);
          } else {
            visible.delete(entry.target.id);
          }
        }

        const ranked = [...visible.entries()].sort((a, b) => b[1] - a[1]);
        if (ranked[0]) setActiveId(ranked[0][0]);
      },
      {
        rootMargin: window.matchMedia("(max-width: 959px)").matches
          ? "-18% 0px -72% 0px"
          : "-22% 0px -64% 0px",
        threshold: [0, 0.2, 0.5, 1],
      },
    );

    for (const element of elements) observer.observe(element);
    return () => observer.disconnect();
  }, [sectionKey]);

  const lockTo = useCallback((id: string) => {
    lockedRef.current = true;
    setActiveId(id);
  }, [setActiveId]);

  const unlock = useCallback(() => {
    lockedRef.current = false;
  }, []);

  return { activeId: currentId, lockTo, unlock };
}

function useSwitcherPill(
  documentKey: LegalDocumentKey,
  trackRef: { current: HTMLDivElement | null },
) {
  const currentIndex = DOCUMENT_ORDER.indexOf(documentKey);

  useLayoutEffect(() => {
    const track = trackRef.current;
    if (!track) return;

    let from = currentIndex;
    try {
      const stored = sessionStorage.getItem(TAB_STORAGE_KEY);
      if (stored && DOCUMENT_ORDER.includes(stored as LegalDocumentKey)) {
        from = DOCUMENT_ORDER.indexOf(stored as LegalDocumentKey);
      }
    } catch {
      from = currentIndex;
    }

    track.style.setProperty("--legal-pill", String(from));
    track.classList.remove("legal-doc-switcher-pill-animate");

    let cancelled = false;
    const frame = requestAnimationFrame(() => {
      requestAnimationFrame(() => {
        if (cancelled) return;
        if (from !== currentIndex) {
          track.classList.add("legal-doc-switcher-pill-animate");
        }
        track.style.setProperty("--legal-pill", String(currentIndex));
        try {
          sessionStorage.setItem(TAB_STORAGE_KEY, documentKey);
        } catch {
          /* private mode */
        }
      });
    });

    return () => {
      cancelled = true;
      cancelAnimationFrame(frame);
    };
  }, [currentIndex, documentKey, trackRef]);
}

export function LegalExperience({ documentKey }: LegalExperienceProps) {
  const t = useTranslations(`marketing.pages.${documentKey}`);
  const tSwitcher = useTranslations("marketing.pages.legal.tabs");
  const a11y = useTranslations("marketing.a11y.legal");
  const pages = useMarketingPages();
  const reduced = useReducedMotion();
  const title = t("title");
  const description = t("description");
  const updated = t("updated");
  const contactLabel = t("contactLabel");
  const sections = t.raw("sections") as LegalSection[];
  const sectionKey = sections.map((section) => section.id).join("|");
  const { activeId, lockTo, unlock } = useActiveSection(sectionKey);
  const switcherId = useId();
  const switcherTrackRef = useRef<HTMLDivElement>(null);
  const tocRailRef = useRef<HTMLDivElement>(null);
  const [indicator, setIndicator] = useState({ top: 0, height: 0 });
  useSwitcherPill(documentKey, switcherTrackRef);

  const related: RelatedLink[] = [
    ...DOCUMENTS.filter((doc) => doc.key !== documentKey).map((doc) => ({
      href: doc.href,
      label: pages.breadcrumbs[doc.key],
    })),
    { href: "/security", label: pages.breadcrumbs.security },
    { href: "/contact", label: pages.legal.relatedContactTitle },
  ];

  useLayoutEffect(() => {
    const rail = tocRailRef.current;
    const active = rail?.querySelector<HTMLElement>(".legal-doc-toc-link-active");
    if (!rail || !active) return;
    const railBox = rail.getBoundingClientRect();
    const box = active.getBoundingClientRect();
    setIndicator({ top: box.top - railBox.top, height: box.height });
    active.scrollIntoView({ inline: "center", block: "nearest", behavior: "smooth" });
  }, [activeId, sectionKey]);

  const onTocClick = useCallback(
    (event: MouseEvent<HTMLAnchorElement>, id: string) => {
      const target = document.getElementById(id);
      if (!target) return;
      event.preventDefault();
      lockTo(id);
      target.classList.remove("legal-doc-section-arrive");
      target.getBoundingClientRect();
      target.classList.add("legal-doc-section-arrive");
      target.scrollIntoView({
        behavior: reduced ? "auto" : "smooth",
        block: "start",
      });
      history.replaceState(null, "", `#${id}`);

      let settled = false;
      const finish = () => {
        if (settled) return;
        settled = true;
        window.removeEventListener("scrollend", finish);
        unlock();
        window.setTimeout(() => {
          target.classList.remove("legal-doc-section-arrive");
        }, 320);
      };

      if (reduced) {
        finish();
        return;
      }

      window.addEventListener("scrollend", finish, { once: true });
      window.setTimeout(finish, 900);
    },
    [lockTo, reduced, unlock],
  );

  return (
    <div className="legal-doc">
      <header className="legal-doc-masthead">
        <nav className="sr-only" aria-label={a11y("breadcrumbsAria")}>
          <Link href="/">AutoCore</Link>
          <span>{pages.legal.family}</span>
          <span>{t("breadcrumb")}</span>
        </nav>

        <motion.div
          key={`${documentKey}-intro`}
          initial={reduced ? false : { opacity: 0, y: 18 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.55, ease: EASE }}
        >
          <p className="legal-doc-kicker">{pages.legal.family}</p>
          <h1 className="legal-doc-title">{title}</h1>
          <p className="legal-doc-lede">{description}</p>
          <p className="legal-doc-updated">
            {pages.legal.updatedPrefix} {updated}
          </p>
        </motion.div>
      </header>

      <div className="legal-doc-controls">
        <nav className="legal-doc-switcher" aria-label={pages.legal.switcherAria}>
          <div ref={switcherTrackRef} className="legal-doc-switcher-track">
            <span className="legal-doc-switcher-pill" aria-hidden />
            <ul className="legal-doc-switcher-list">
              {DOCUMENTS.map((doc) => {
                const current = doc.key === documentKey;
                return (
                  <li key={doc.key}>
                    <Link
                      href={doc.href}
                      aria-current={current ? "page" : undefined}
                      className={cn(
                        "legal-doc-switcher-link",
                        current && "legal-doc-switcher-link-active",
                      )}
                    >
                      {tSwitcher(doc.key)}
                    </Link>
                  </li>
                );
              })}
            </ul>
          </div>
        </nav>

        <aside className="legal-doc-toc" aria-labelledby={switcherId}>
          <p id={switcherId} className="legal-doc-toc-label">
            {pages.legal.onThisPage}
          </p>
          <div ref={tocRailRef} className="legal-doc-toc-rail">
            <span
              className="legal-doc-toc-indicator"
              style={{ top: indicator.top, height: indicator.height }}
              aria-hidden
            />
            <ol className="legal-doc-toc-list">
              {sections.map((section) => {
                const heading = splitHeading(section.title);
                return (
                  <li key={section.id}>
                    <a
                      href={`#${section.id}`}
                      className={cn(
                        "legal-doc-toc-link",
                        activeId === section.id && "legal-doc-toc-link-active",
                      )}
                      onClick={(event) => onTocClick(event, section.id)}
                    >
                      {heading.text}
                    </a>
                  </li>
                );
              })}
            </ol>
          </div>
        </aside>
      </div>

      <motion.article
        key={`${documentKey}-article`}
        className="legal-doc-article"
        aria-label={a11y("documentBodyAria")}
        initial={reduced ? false : { opacity: 0, y: 22 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.55, delay: reduced ? 0 : 0.08, ease: EASE }}
      >
        {sections.map((section) => {
          const heading = splitHeading(section.title);
          return (
            <section key={section.id} id={section.id} className="legal-doc-section">
              <h2 className="legal-doc-heading">
                {heading.index ? (
                  <span className="legal-doc-index" aria-hidden>
                    {heading.index}.
                  </span>
                ) : null}
                <span>{heading.text}</span>
              </h2>
              {section.paragraphs.map((paragraph) => (
                <p key={paragraph} className="legal-doc-copy">
                  {paragraph}
                </p>
              ))}
              {section.bullets ? (
                <ul className="legal-doc-list">
                  {section.bullets.map((item) => (
                    <li key={item}>{item}</li>
                  ))}
                </ul>
              ) : null}
            </section>
          );
        })}

        <div className="legal-doc-contact">
          <p className="legal-doc-contact-label">{contactLabel}</p>
          <a
            href={`mailto:${supportEmail}?subject=${encodeURIComponent(title)}`}
            className="legal-doc-mail"
          >
            {supportEmail}
          </a>
        </div>

        <nav className="legal-doc-also" aria-label={pages.legal.alsoSeeAria}>
          <p className="legal-doc-also-label">{pages.legal.alsoSee}</p>
          <ul className="legal-doc-also-list">
            {related.map((item) => (
              <li key={item.href}>
                <Link href={item.href} className="legal-doc-also-link">
                  {item.label}
                </Link>
              </li>
            ))}
          </ul>
        </nav>
      </motion.article>
    </div>
  );
}
