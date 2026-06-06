import { ReactNode } from "react";

import { cn } from "@/lib/utils";

type SectionShellProps = {
  id: string;
  label: string;
  title: string;
  description: string;
  children: ReactNode;
  className?: string;
  align?: "left" | "center";
};

export function SectionShell({
  id,
  label,
  title,
  description,
  children,
  className,
  align = "left",
}: SectionShellProps) {
  return (
    <section id={id} className={cn("scroll-mt-24 py-20 md:py-28", className)}>
      <div className="mx-auto w-full max-w-7xl px-5 md:px-8">
        <header className={cn("mb-12 max-w-2xl md:mb-14", align === "center" && "mx-auto text-center")}>
          <p className="text-xs font-semibold tracking-wide text-primary uppercase">{label}</p>
          <h2 className="mt-3 text-3xl font-semibold tracking-tight text-foreground md:text-4xl">{title}</h2>
          <p className="mt-4 text-base leading-relaxed text-muted-foreground md:text-lg">{description}</p>
        </header>
        {children}
      </div>
    </section>
  );
}
