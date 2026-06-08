import type { ReactNode } from "react";

type MarketingSectionProps = {
  eyebrow?: string;
  title: string;
  description?: string;
  children?: ReactNode;
  className?: string;
  centered?: boolean;
  id?: string;
};

export function MarketingSection({
  eyebrow,
  title,
  description,
  children,
  className = "",
  centered = false,
  id,
}: MarketingSectionProps) {
  return (
    <section id={id} className={`marketing-subsection ${className}`.trim()}>
      <header className={centered ? "marketing-subsection-header is-centered" : "marketing-subsection-header"}>
        {eyebrow ? <p className="landing-eyebrow">{eyebrow}</p> : null}
        <h2 className="marketing-subsection-title">{title}</h2>
        {description ? <p className="landing-lead mt-4 max-w-2xl">{description}</p> : null}
      </header>
      {children ? <div className="mt-10 md:mt-12">{children}</div> : null}
    </section>
  );
}
