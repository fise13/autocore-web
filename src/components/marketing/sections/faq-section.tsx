import { landingCopy } from "@/components/marketing/copy/landing-copy";
import { SectionShell } from "@/components/marketing/ui/section-shell";

const faq = landingCopy.faq;

export function FaqSection() {
  return (
    <SectionShell id="faq" label={faq.label} title={faq.title} description={faq.description}>
      <dl className="divide-y divide-border rounded-xl border border-border bg-card shadow-sm">
        {faq.items.map((item) => (
          <div key={item.q} className="px-6 py-5">
            <dt className="font-semibold text-foreground">{item.q}</dt>
            <dd className="mt-2 text-sm leading-relaxed text-muted-foreground">{item.a}</dd>
          </div>
        ))}
      </dl>
    </SectionShell>
  );
}
