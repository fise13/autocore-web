import Link from "next/link";

import { landingCopy } from "@/components/marketing/copy/landing-copy";

const copy = landingCopy.cta;

export function CtaSection() {
  return (
    <section id="cta" className="scroll-mt-24 border-t border-border bg-muted/30 py-20 md:py-28">
      <div className="mx-auto max-w-7xl px-5 md:px-8">
        <p className="text-xs font-semibold tracking-wide text-primary uppercase">{copy.label}</p>
        <h2 className="mt-4 max-w-2xl text-3xl font-semibold tracking-tight md:text-4xl">{copy.title}</h2>
        <p className="mt-4 max-w-xl text-lg text-muted-foreground">{copy.description}</p>

        <nav className="mt-10 grid gap-3 sm:grid-cols-2 lg:grid-cols-3" aria-label="Разделы сайта">
          {copy.links.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              className="autocore-metric-card flex items-center justify-between px-5 py-4 text-sm font-medium transition-colors hover:border-primary/30"
            >
              {link.label}
              <span className="text-primary">→</span>
            </Link>
          ))}
        </nav>
      </div>
    </section>
  );
}
