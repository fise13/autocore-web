import { type LucideIcon } from "lucide-react";
import Link from "next/link";
import { ArrowUpRight } from "lucide-react";

import { FeatureIcon, type FeatureIconTone } from "@/components/marketing/site/feature-icon";
import { cn } from "@/lib/utils";

type FeatureCardProps = {
  icon: LucideIcon;
  tone?: FeatureIconTone;
  title: string;
  description: string;
  href?: string;
  className?: string;
  layout?: "horizontal" | "vertical";
};

export function FeatureCard({
  icon,
  tone = "blue",
  title,
  description,
  href,
  className,
  layout = "horizontal",
}: FeatureCardProps) {
  const body = (
    <>
      <FeatureIcon icon={icon} tone={tone} />
      <div className="min-w-0 flex-1">
        <h3 className="text-base font-semibold tracking-tight">{title}</h3>
        <p className="mt-2 text-sm leading-relaxed text-muted-foreground">{description}</p>
      </div>
      {href ? (
        <ArrowUpRight
          className={cn(
            "size-4 shrink-0 text-muted-foreground opacity-0 transition-opacity group-hover:opacity-100",
            layout === "vertical" && "absolute right-5 top-5",
          )}
          aria-hidden
        />
      ) : null}
    </>
  );

  const cardClass = cn(
    "landing-card landing-card-hover group relative",
    layout === "vertical" ? "flex flex-col gap-4 p-6 md:p-7" : "flex gap-4 p-6",
    className,
  );

  if (href) {
    return (
      <Link href={href} className={cardClass}>
        {body}
      </Link>
    );
  }

  return <article className={cardClass}>{body}</article>;
}
