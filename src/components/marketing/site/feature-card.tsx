import { type LucideIcon } from "lucide-react";
import Link from "next/link";

import { FeatureIcon, type FeatureIconTone } from "@/components/marketing/site/feature-icon";
import { cn } from "@/lib/utils";

type FeatureCardProps = {
  icon: LucideIcon;
  tone?: FeatureIconTone;
  title: string;
  description: string;
  href?: string;
  className?: string;
};

export function FeatureCard({ icon, tone = "blue", title, description, href, className }: FeatureCardProps) {
  const body = (
    <>
      <FeatureIcon icon={icon} tone={tone} />
      <div className="min-w-0 flex-1">
        <h3 className="text-base font-semibold tracking-tight text-foreground">{title}</h3>
        <p className="mt-2 text-sm leading-relaxed text-muted-foreground">{description}</p>
      </div>
    </>
  );

  const cardClass = cn(
    "autocore-metric-card flex gap-4 p-6 transition-colors",
    href && "hover:border-primary/25",
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
