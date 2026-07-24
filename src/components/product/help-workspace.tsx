"use client";

import { useEffect, useMemo, useState, type ReactNode } from "react";
import {
  ArrowUpRight,
  BookOpen,
  CircleDollarSign,
  ClipboardList,
  ExternalLink,
  FileText,
  HelpCircle,
  LayoutGrid,
  Mail,
  Package,
  Phone,
  Search,
  Smartphone,
  Sparkles,
  Users,
  X,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";
import Link from "next/link";
import { AnimatePresence, LayoutGroup, motion, useReducedMotion } from "motion/react";

import { EnterpriseAnimatedPanel } from "@/components/layout/enterprise-animated-panel";
import { EnterprisePanelCard } from "@/components/layout/enterprise-panel-card";
import { EnterpriseWorkspaceShell } from "@/components/layout/enterprise-workspace-shell";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/empty-state";
import { InputGroup, InputGroupAddon, InputGroupInput } from "@/components/ui/input-group";
import { cn } from "@/lib/utils";
import {
  countProductHelpArticles,
  filterProductHelpSections,
  findHelpArticleSectionId,
  getPopularHelpArticles,
  getProductHelpSections,
  type ProductHelpArticle,
  type ProductHelpSection,
  type ProductHelpSectionId,
} from "@/lib/product/product-help";
import { getPlatformContacts } from "@/lib/platform/platform-contacts";
import { marketingPageUrl } from "@/lib/site-urls";
import { marketingRoutes } from "@/lib/marketing-routes";
import { getActiveUserCopyLocale, userCopy } from "@/lib/user-copy";

type CategoryFilter = ProductHelpSectionId | "all";

const CATEGORY_ICONS: Record<ProductHelpSectionId, LucideIcon> = {
  "getting-started": Sparkles,
  warehouse: Package,
  motors: LayoutGrid,
  "work-orders": ClipboardList,
  finance: CircleDollarSign,
  documents: FileText,
  mobile: Smartphone,
  team: Users,
};

const EASE = [0.16, 1, 0.3, 1] as const;
const NAV_SPRING = { type: "spring" as const, stiffness: 420, damping: 34, mass: 0.85 };
const HELP_NAV_LAYOUT_ID = "help-category-nav";

function highlightMatch(text: string, query: string): ReactNode {
  const normalized = query.trim();
  if (!normalized) return text;
  const lower = text.toLowerCase();
  const needle = normalized.toLowerCase();
  const index = lower.indexOf(needle);
  if (index < 0) return text;
  return (
    <>
      {text.slice(0, index)}
      <mark className="rounded-sm bg-primary/15 px-0.5 text-foreground">{text.slice(index, index + needle.length)}</mark>
      {text.slice(index + needle.length)}
    </>
  );
}

function HelpArticleLink({ article }: { article: ProductHelpArticle }) {
  if (!article.href) return null;
  return (
    <Button
      size="sm"
      variant="outline"
      className="mt-3 gap-1.5"
      render={<Link href={article.href} />}
      nativeButton={false}
    >
      {article.hrefLabel ?? userCopy.help.openSection}
      <ArrowUpRight className="size-3.5" />
    </Button>
  );
}

function HelpArticleList({
  sections,
  query,
  openIds,
  onOpenChange,
}: {
  sections: ProductHelpSection[];
  query: string;
  openIds: string[];
  onOpenChange: (next: string[]) => void;
}) {
  return (
    <div className="flex flex-col gap-5">
      {sections.map((section) => {
        const Icon = CATEGORY_ICONS[section.id];
        return (
          <EnterprisePanelCard
            key={section.id}
            title={section.title}
            description={section.description}
            action={
              <Badge variant="secondary" className="shrink-0 font-normal tabular-nums">
                {section.items.length}
              </Badge>
            }
            contentClassName="px-2 py-1 sm:px-3"
          >
            <div className="mb-1 flex items-center gap-2 px-3 pt-3 text-xs text-muted-foreground sm:hidden">
              <Icon className="size-3.5" />
              <span>{section.title}</span>
            </div>
            <Accordion
              multiple
              value={openIds}
              onValueChange={(next) =>
                onOpenChange(Array.isArray(next) ? next : next ? [next] : [])
              }
              className="w-full"
            >
              {section.items.map((item) => (
                <AccordionItem key={item.id} value={item.id} className="border-border/60 px-2">
                  <AccordionTrigger className="py-3.5 text-[15px] font-medium hover:no-underline">
                    {highlightMatch(item.q, query)}
                  </AccordionTrigger>
                  <AccordionContent>
                    <p className="pb-1 text-sm leading-relaxed text-muted-foreground">
                      {highlightMatch(item.a, query)}
                    </p>
                    <HelpArticleLink article={item} />
                  </AccordionContent>
                </AccordionItem>
              ))}
            </Accordion>
          </EnterprisePanelCard>
        );
      })}
    </div>
  );
}

export function HelpWorkspace() {
  const [query, setQuery] = useState("");
  const [category, setCategory] = useState<CategoryFilter>("all");
  const [openIds, setOpenIds] = useState<string[]>([]);
  const contacts = getPlatformContacts();
  const reduceMotion = useReducedMotion();
  const locale = getActiveUserCopyLocale();
  // Stable across renders for a locale — fresh array from getter must not enter effect deps.
  const productHelpSections = useMemo(() => getProductHelpSections(), [locale]);

  const totalArticles = countProductHelpArticles(productHelpSections);
  const popular = useMemo(
    () => getPopularHelpArticles(productHelpSections),
    [productHelpSections],
  );

  const scopedSections = useMemo(() => {
    if (category === "all") return productHelpSections;
    return productHelpSections.filter((section) => section.id === category);
  }, [category, productHelpSections]);

  const sections = useMemo(
    () => filterProductHelpSections(scopedSections, query),
    [query, scopedSections],
  );

  const resultCount = useMemo(
    () => sections.reduce((total, section) => total + section.items.length, 0),
    [sections],
  );

  const isSearching = query.trim().length > 0;
  const showPopular = !isSearching && category === "all";
  const contentKey = showPopular
    ? "home"
    : sections.length === 0
      ? "empty"
      : isSearching
        ? "search"
        : category;

  const searchOpenIdsKey = useMemo(() => {
    if (!isSearching) return "";
    return sections
      .flatMap((section) => section.items.map((item) => item.id))
      .slice(0, 8)
      .join("\0");
  }, [isSearching, sections]);

  useEffect(() => {
    if (!isSearching) return;
    const ids = searchOpenIdsKey ? searchOpenIdsKey.split("\0") : [];
    setOpenIds((prev) =>
      prev.length === ids.length && prev.every((id, index) => id === ids[index]) ? prev : ids,
    );
  }, [isSearching, searchOpenIdsKey]);

  const selectPopular = (articleId: string) => {
    const sectionId = findHelpArticleSectionId(articleId, productHelpSections);
    if (sectionId) setCategory(sectionId);
    setQuery("");
    setOpenIds([articleId]);
  };

  const clearSearch = () => {
    setQuery("");
    setOpenIds([]);
  };

  const selectCategory = (next: CategoryFilter) => {
    setCategory(next);
    setOpenIds([]);
  };

  return (
    <EnterpriseWorkspaceShell
      title={userCopy.help.title}
      description={userCopy.help.description}
      meta={
        <div className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
          <Badge variant="outline" className="font-normal tabular-nums">
            {userCopy.help.articlesCount(totalArticles)}
          </Badge>
          <span className="hidden sm:inline">·</span>
          <span>{userCopy.help.sectionsCount(productHelpSections.length)}</span>
        </div>
      }
    >
      <div className="mx-auto grid w-full max-w-6xl gap-6 lg:grid-cols-[240px_minmax(0,1fr)] lg:items-start">
        <aside className="lg:sticky lg:top-4 lg:self-start">
          <LayoutGroup id={HELP_NAV_LAYOUT_ID}>
            <nav
              aria-label={userCopy.help.sectionsAria}
              className="flex gap-1 overflow-x-auto pb-1 lg:flex-col lg:overflow-visible lg:rounded-xl lg:border lg:border-border/60 lg:bg-card lg:p-2"
            >
              <CategoryButton
                active={category === "all"}
                icon={BookOpen}
                label={userCopy.help.allSections}
                hint={`${totalArticles}`}
                onClick={() => selectCategory("all")}
              />
              {productHelpSections.map((section) => {
                const Icon = CATEGORY_ICONS[section.id];
                return (
                  <CategoryButton
                    key={section.id}
                    active={category === section.id}
                    icon={Icon}
                    label={section.title}
                    hint={`${section.items.length}`}
                    onClick={() => selectCategory(section.id)}
                  />
                );
              })}
            </nav>
          </LayoutGroup>
        </aside>

        <div className="flex min-w-0 flex-col gap-6">
          <motion.div
            initial={reduceMotion ? false : { opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.35, ease: EASE }}
            className="rounded-xl border border-border/60 bg-gradient-to-br from-primary/[0.06] via-background to-background p-4 sm:p-5"
          >
            <label htmlFor="help-search" className="sr-only">
              {userCopy.help.searchTitle}
            </label>
            <InputGroup>
              <InputGroupAddon>
                <Search className="size-4" />
              </InputGroupAddon>
              <InputGroupInput
                id="help-search"
                value={query}
                onChange={(event) => setQuery(event.target.value)}
                placeholder={userCopy.help.searchPlaceholder}
                aria-label={userCopy.help.searchTitle}
                className="h-11 bg-background/80 pr-10 text-[15px]"
              />
              <AnimatePresence initial={false}>
                {query ? (
                  <motion.button
                    key="help-search-clear"
                    type="button"
                    initial={reduceMotion ? false : { opacity: 0, scale: 0.85 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={reduceMotion ? undefined : { opacity: 0, scale: 0.85 }}
                    transition={{ duration: 0.15 }}
                    onClick={clearSearch}
                    className="absolute inset-y-0 right-0 flex items-center pr-3 text-muted-foreground transition-colors hover:text-foreground"
                    aria-label={userCopy.help.clearSearchAria}
                  >
                    <X className="size-4" />
                  </motion.button>
                ) : null}
              </AnimatePresence>
            </InputGroup>
            <p className="mt-3 text-xs leading-relaxed text-muted-foreground sm:text-sm">
              {isSearching
                ? resultCount > 0
                  ? userCopy.help.found(resultCount)
                  : userCopy.help.nothingFoundQuery
                : category === "all"
                  ? userCopy.help.pickSectionHint
                  : (productHelpSections.find((section) => section.id === category)?.description ??
                    "")}
            </p>
          </motion.div>

          <EnterpriseAnimatedPanel panelKey={contentKey} className="flex min-w-0 flex-col gap-6">
            {showPopular ? (
              <>
                <section aria-labelledby="help-popular-heading" className="flex flex-col gap-3">
                  <div>
                    <h2
                      id="help-popular-heading"
                      className="text-sm font-semibold tracking-tight text-foreground"
                    >
                      {userCopy.help.popular}
                    </h2>
                    <p className="mt-0.5 text-xs text-muted-foreground">
                      {userCopy.help.popularHint}
                    </p>
                  </div>
                  <div className="grid gap-2 sm:grid-cols-2">
                    {popular.map((article, index) => (
                      <motion.button
                        key={article.id}
                        type="button"
                        onClick={() => selectPopular(article.id)}
                        initial={reduceMotion ? false : { opacity: 0, y: 6 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{
                          duration: 0.3,
                          delay: reduceMotion ? 0 : index * 0.04,
                          ease: EASE,
                        }}
                        className={cn(
                          "group flex items-start gap-3 rounded-xl border border-border/60 bg-card px-3.5 py-3 text-left",
                          "transition-[border-color,background-color,transform] duration-200",
                          "hover:border-primary/25 hover:bg-muted/30 motion-reduce:transition-none",
                        )}
                      >
                        <span className="mt-0.5 flex size-8 shrink-0 items-center justify-center rounded-lg border border-border/60 bg-background text-muted-foreground transition-colors group-hover:border-primary/20 group-hover:text-primary">
                          <HelpCircle className="size-3.5" />
                        </span>
                        <span className="min-w-0">
                          <span className="block text-sm font-medium leading-snug">{article.q}</span>
                          <span className="mt-1 line-clamp-2 text-xs leading-relaxed text-muted-foreground">
                            {article.a}
                          </span>
                        </span>
                      </motion.button>
                    ))}
                  </div>
                </section>

                <section aria-labelledby="help-catalog-heading" className="flex flex-col gap-3">
                  <div>
                    <h2
                      id="help-catalog-heading"
                      className="text-sm font-semibold tracking-tight text-foreground"
                    >
                      {userCopy.help.sections}
                    </h2>
                    <p className="mt-0.5 text-xs text-muted-foreground">
                      {userCopy.help.sectionsHint}
                    </p>
                  </div>
                  <div className="grid gap-2 sm:grid-cols-2 xl:grid-cols-3">
                    {productHelpSections.map((section, index) => {
                      const Icon = CATEGORY_ICONS[section.id];
                      return (
                        <motion.button
                          key={section.id}
                          type="button"
                          onClick={() => selectCategory(section.id)}
                          initial={reduceMotion ? false : { opacity: 0, y: 8 }}
                          animate={{ opacity: 1, y: 0 }}
                          transition={{
                            duration: 0.28,
                            delay: reduceMotion ? 0 : 0.08 + index * 0.03,
                            ease: EASE,
                          }}
                          className={cn(
                            "group flex items-start gap-3 rounded-xl border border-border/60 bg-card px-3.5 py-3.5 text-left",
                            "transition-[border-color,background-color] duration-200",
                            "hover:border-primary/25 hover:bg-muted/30",
                          )}
                        >
                          <span className="flex size-9 shrink-0 items-center justify-center rounded-lg border border-border/60 bg-background shadow-sm transition-colors group-hover:border-primary/20">
                            <Icon className="size-4 text-muted-foreground transition-colors group-hover:text-primary" />
                          </span>
                          <span className="min-w-0">
                            <span className="flex items-center gap-2">
                              <span className="text-sm font-medium">{section.title}</span>
                              <Badge variant="secondary" className="font-normal tabular-nums">
                                {section.items.length}
                              </Badge>
                            </span>
                            <span className="mt-1 block text-xs leading-relaxed text-muted-foreground">
                              {section.description}
                            </span>
                          </span>
                        </motion.button>
                      );
                    })}
                  </div>
                </section>
              </>
            ) : null}

            {!showPopular && sections.length === 0 ? (
              <EmptyState
                icon={Search}
                title={userCopy.help.nothingFoundTitle}
                description={userCopy.help.nothingFoundDescription}
                primaryAction={{
                  label: userCopy.help.resetSearch,
                  onClick: clearSearch,
                  variant: "outline",
                }}
                secondaryAction={{
                  label: userCopy.help.allSections,
                  onClick: () => {
                    clearSearch();
                    selectCategory("all");
                  },
                  variant: "secondary",
                }}
              />
            ) : null}

            {!showPopular && sections.length > 0 ? (
              <HelpArticleList
                sections={sections}
                query={query}
                openIds={openIds}
                onOpenChange={setOpenIds}
              />
            ) : null}
          </EnterpriseAnimatedPanel>

          <EnterprisePanelCard
            title={userCopy.help.needHelpTitle}
            description={userCopy.help.needHelpDescription}
            contentClassName="px-6 py-5"
          >
            <div className="flex flex-col gap-3 sm:flex-row sm:flex-wrap">
              <Button
                variant="outline"
                className="justify-start gap-2"
                render={<a href={contacts.mailtoHref} />}
                nativeButton={false}
              >
                <Mail className="size-4" />
                {contacts.email}
              </Button>
              <Button
                variant="outline"
                className="justify-start gap-2"
                render={<a href={contacts.telHref} />}
                nativeButton={false}
              >
                <Phone className="size-4" />
                {contacts.formattedPhone}
              </Button>
              <Button
                variant="ghost"
                className="justify-start gap-2 sm:ml-auto"
                render={
                  <Link
                    href={marketingPageUrl(marketingRoutes.contact)}
                    target="_blank"
                    rel="noopener noreferrer"
                  />
                }
                nativeButton={false}
              >
                {userCopy.help.contactsPage}
                <ExternalLink className="size-3.5" />
              </Button>
            </div>
          </EnterprisePanelCard>
        </div>
      </div>
    </EnterpriseWorkspaceShell>
  );
}

function CategoryButton({
  active,
  icon: Icon,
  label,
  hint,
  onClick,
}: {
  active: boolean;
  icon: LucideIcon;
  label: string;
  hint?: string;
  onClick: () => void;
}) {
  const reduceMotion = useReducedMotion();

  return (
    <button
      type="button"
      onClick={onClick}
      aria-current={active ? "page" : undefined}
      className={cn(
        "relative inline-flex shrink-0 items-center gap-2 overflow-hidden rounded-lg px-3 py-2 text-sm transition-colors",
        "lg:w-full lg:justify-between",
        active
          ? "text-primary"
          : "text-muted-foreground hover:bg-muted/60 hover:text-foreground",
      )}
    >
      {active ? (
        reduceMotion ? (
          <span className="absolute inset-0 rounded-lg bg-primary/10" />
        ) : (
          <motion.span
            layoutId={`${HELP_NAV_LAYOUT_ID}-active`}
            className="absolute inset-0 rounded-lg bg-primary/10 shadow-sm"
            transition={NAV_SPRING}
          />
        )
      ) : null}
      <span className="relative z-10 inline-flex items-center gap-2">
        <Icon className="size-4 shrink-0 opacity-90" />
        <span className="whitespace-nowrap font-medium">{label}</span>
      </span>
      {hint ? (
        <span
          className={cn(
            "relative z-10 hidden tabular-nums lg:inline",
            active ? "text-primary/80" : "text-muted-foreground/80",
          )}
        >
          {hint}
        </span>
      ) : null}
    </button>
  );
}
