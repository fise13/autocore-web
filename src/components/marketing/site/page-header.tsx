import Link from "next/link";
import { ChevronRight } from "lucide-react";

type Breadcrumb = { label: string; href?: string };

type PageHeaderProps = {
  title: string;
  description: string;
  breadcrumbs?: Breadcrumb[];
};

export function PageHeader({ title, description, breadcrumbs }: PageHeaderProps) {
  return (
    <header className="site-page-header border-b border-border/80 bg-muted/25">
      <div className="mx-auto max-w-7xl px-5 py-14 md:px-8 md:py-16">
        {breadcrumbs && breadcrumbs.length > 0 ? (
          <nav className="mb-6 flex flex-wrap items-center gap-1 text-sm text-muted-foreground" aria-label="Хлебные крошки">
            {breadcrumbs.map((crumb, index) => (
              <span key={crumb.label} className="inline-flex items-center gap-1">
                {index > 0 ? <ChevronRight className="size-3.5 opacity-50" aria-hidden /> : null}
                {crumb.href ? (
                  <Link href={crumb.href} className="hover:text-foreground">
                    {crumb.label}
                  </Link>
                ) : (
                  <span className="text-foreground">{crumb.label}</span>
                )}
              </span>
            ))}
          </nav>
        ) : null}
        <h1 className="max-w-3xl text-3xl font-semibold tracking-tight md:text-4xl">{title}</h1>
        <p className="mt-4 max-w-2xl text-lg leading-relaxed text-muted-foreground">{description}</p>
      </div>
    </header>
  );
}
