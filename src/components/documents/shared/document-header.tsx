import { DocumentContext } from "@/lib/documents/document-context";
import { DocumentTheme } from "@/domain/company-branding";
import { companyContactLine, companyMonogram } from "@/lib/documents/company-brand";

import { docBody, docDivider, docMuted, docSubtitle, docTitle } from "./document-tokens";

type DocumentHeaderProps = {
  context: DocumentContext;
  title: string;
  subtitle?: string;
  reference?: string;
  theme?: DocumentTheme;
};

export function DocumentHeader({ context, title, subtitle, reference, theme }: DocumentHeaderProps) {
  const contact = companyContactLine(context.company);
  const resolvedTheme = theme ?? context.theme ?? "modern";
  const isPremium = resolvedTheme === "premium";
  const isClassic = resolvedTheme === "classic";

  return (
    <header>
      {isPremium ? (
        <div
          className="doc-header-band -mx-[12mm] mb-6 px-[12mm] py-5"
          style={{ background: context.company.primaryColor }}
        >
          <div className="flex items-start justify-between gap-6 text-white">
            <div className="flex min-w-0 items-start gap-4">
              {context.company.logoDataUri ? (
                <img
                  src={context.company.logoDataUri}
                  alt=""
                  className="h-12 w-12 shrink-0 rounded-lg bg-white/10 object-contain p-1"
                />
              ) : (
                <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-lg bg-white/15 text-sm font-bold">
                  {companyMonogram(context.company.name)}
                </div>
              )}
              <div className="min-w-0">
                <p className="text-xs uppercase tracking-[0.18em] text-white/75">{context.company.name}</p>
                <h1 className="mt-1 text-2xl font-semibold tracking-tight">{title}</h1>
                {subtitle ? <p className="mt-1 text-sm text-white/80">{subtitle}</p> : null}
              </div>
            </div>
            <div className="shrink-0 text-right text-sm text-white/85">
              {reference ? <p className="font-medium">{reference}</p> : null}
              <p>
                {new Intl.DateTimeFormat("ru-KZ", {
                  day: "2-digit",
                  month: "long",
                  year: "numeric",
                }).format(context.generatedAt)}
              </p>
            </div>
          </div>
        </div>
      ) : (
        <div className="flex items-start justify-between gap-6">
          <div className="flex min-w-0 items-start gap-4">
            {context.company.logoDataUri ? (
              <img
                src={context.company.logoDataUri}
                alt=""
                className="h-12 w-12 shrink-0 rounded-xl border border-neutral-200 object-contain p-1"
              />
            ) : (
              <div
                className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl text-sm font-bold text-white shadow-sm"
                style={{ background: context.company.primaryColor }}
              >
                {companyMonogram(context.company.name)}
              </div>
            )}
            <div className="min-w-0">
              <p className={docSubtitle}>{context.company.name}</p>
              {context.company.slogan ? <p className={`${docMuted} mt-0.5`}>{context.company.slogan}</p> : null}
              <h1
                className={`${docTitle} mt-1 ${isClassic ? "font-serif" : ""}`}
                style={isClassic ? undefined : { color: context.company.primaryColor }}
              >
                {title}
              </h1>
              {subtitle ? <p className={`${docMuted} mt-1`}>{subtitle}</p> : null}
            </div>
          </div>
          <div className="doc-header-meta shrink-0 rounded-xl border border-neutral-200 bg-neutral-50 px-3 py-2 text-right text-sm">
            {reference ? <p className="font-semibold text-neutral-900">{reference}</p> : null}
            <p className={docMuted}>
              {new Intl.DateTimeFormat("ru-KZ", {
                day: "2-digit",
                month: "long",
                year: "numeric",
              }).format(context.generatedAt)}
            </p>
          </div>
        </div>
      )}
      {contact ? <p className={`${docBody} mt-3 text-neutral-600`}>{contact}</p> : null}
      <div className={docDivider} />
    </header>
  );
}
