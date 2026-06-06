import Link from "next/link";

import { siteContent } from "@/components/marketing/content/site-content";

export function StripeClose() {
  const copy = siteContent.close;

  return (
    <section className="stripe-section border-t border-border">
      <div className="stripe-container py-20 text-center">
        <h2 className="stripe-h2">{copy.title}</h2>
        <nav className="mx-auto mt-10 flex max-w-2xl flex-wrap justify-center gap-3" aria-label="Разделы">
          {copy.links.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              className="rounded-full border border-border bg-card px-5 py-2.5 text-sm font-medium shadow-sm transition-colors hover:border-primary/40"
            >
              {link.label}
            </Link>
          ))}
        </nav>
      </div>
    </section>
  );
}
