"use client";

import { ReactNode, useMemo, useState } from "react";
import { LayoutGroup, motion } from "framer-motion";
import { Building2, Laptop, Palette, Settings2, Trash2, UserCircle } from "lucide-react";

import { useAuth } from "@/components/providers/auth-provider";
import { can } from "@/lib/auth/permissions";
import { cn } from "@/lib/utils";
import { userCopy } from "@/lib/user-copy";

export type SettingsSectionId =
  | "account"
  | "company"
  | "branding"
  | "accounting"
  | "dataCleanup"
  | "macOnly";

const allSections: { id: SettingsSectionId; label: string; icon: typeof UserCircle }[] = [
  { id: "account", label: userCopy.settings.account, icon: UserCircle },
  { id: "company", label: userCopy.settings.company, icon: Building2 },
  { id: "branding", label: "Брендинг", icon: Palette },
  { id: "accounting", label: userCopy.settings.accounting, icon: Building2 },
  { id: "dataCleanup", label: userCopy.settings.dataCleanup, icon: Trash2 },
  { id: "macOnly", label: userCopy.settings.macOnly, icon: Laptop },
];

const sectionSubtitles: Record<SettingsSectionId, string> = {
  account: userCopy.settings.subtitleAccount,
  company: userCopy.settings.subtitleCompany,
  branding: "Логотип, контакты и фирменные цвета для PDF-документов клиентам.",
  accounting: userCopy.settings.subtitleAccounting,
  dataCleanup: userCopy.settings.subtitleDataCleanup,
  macOnly: userCopy.settings.macOnlyHint,
};

const navSpring = { type: "spring" as const, stiffness: 420, damping: 34, mass: 0.85 };

type SettingsShellProps = {
  children: (section: SettingsSectionId) => ReactNode;
  initialSection?: SettingsSectionId;
};

export function SettingsShell({ children, initialSection = "account" }: SettingsShellProps) {
  const { profile } = useAuth();
  const hasCompany = Boolean(profile?.companyId?.trim());
  const canCleanupData =
    can(profile, "accounting_delete") || can(profile, "inventory_delete");
  const sections = useMemo(
    () =>
      allSections.filter((section) => {
        if (section.id === "company") return hasCompany && can(profile, "settings_manage");
        if (section.id === "branding") return hasCompany && can(profile, "settings_manage");
        if (section.id === "accounting") return can(profile, "accounting_view");
        if (section.id === "dataCleanup") return canCleanupData;
        if (section.id === "macOnly") return can(profile, "settings_manage");
        return true;
      }),
    [canCleanupData, hasCompany, profile],
  );
  const resolvedInitialSection = sections.some((section) => section.id === initialSection)
    ? initialSection
    : "account";
  const [activeSection, setActiveSection] = useState<SettingsSectionId>(resolvedInitialSection);
  const [sectionEpoch, setSectionEpoch] = useState(0);

  function selectSection(section: SettingsSectionId) {
    if (section === activeSection) return;
    setActiveSection(section);
    setSectionEpoch((current) => current + 1);
  }

  return (
    <section className="mx-auto flex w-full max-w-[1100px] flex-col gap-5 lg:flex-row lg:items-start">
      <aside className="w-full shrink-0 rounded-xl border bg-card p-2 lg:sticky lg:top-4 lg:w-56 lg:self-start">
        <LayoutGroup id="settings-nav">
          <nav className="flex flex-row gap-1 overflow-x-auto lg:flex-col">
            {sections.map((section) => {
              const Icon = section.icon;
              const active = activeSection === section.id;
              return (
                <button
                  key={section.id}
                  type="button"
                  onClick={() => selectSection(section.id)}
                  className={cn(
                    "relative inline-flex min-w-max items-center gap-2 rounded-lg px-3 py-2 text-sm transition-colors duration-200",
                    active
                      ? "text-primary"
                      : "text-muted-foreground hover:bg-muted/60 hover:text-foreground",
                  )}
                >
                  {active ? (
                    <motion.span
                      layoutId="settings-nav-active"
                      className="absolute inset-0 rounded-lg bg-primary/10"
                      transition={navSpring}
                    />
                  ) : null}
                  <motion.span
                    className="relative z-10 flex items-center gap-2"
                    animate={active && section.id === "branding" ? { scale: [1, 1.06, 1] } : { scale: 1 }}
                    transition={{ duration: 0.35, ease: [0.22, 1, 0.36, 1] }}
                  >
                    <Icon className={cn("size-4", active && section.id === "branding" && "text-primary")} />
                    {section.label}
                  </motion.span>
                </button>
              );
            })}
          </nav>
        </LayoutGroup>
      </aside>

      <div className="min-w-0 flex-1 space-y-5">
        <header className="space-y-1">
          <div className="flex items-center gap-2">
            <Settings2 className="size-5 text-primary" />
            <h2 className="text-2xl font-semibold tracking-tight">{userCopy.settings.title}</h2>
          </div>
          <motion.p
            key={activeSection}
            initial={{ opacity: 0, y: 4 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.2 }}
            className="text-sm text-muted-foreground"
          >
            {sectionSubtitles[activeSection]}
          </motion.p>
        </header>
        <motion.div
          key={sectionEpoch}
          initial={
            activeSection === "branding"
              ? { opacity: 0, y: 14, filter: "blur(6px)" }
              : { opacity: 0, y: 8 }
          }
          animate={{ opacity: 1, y: 0, filter: "blur(0px)" }}
          transition={
            activeSection === "branding"
              ? { type: "spring", stiffness: 360, damping: 32, mass: 0.9 }
              : { duration: 0.22, ease: [0.22, 1, 0.36, 1] }
          }
          className="space-y-5 motion-reduce:transform-none motion-reduce:filter-none"
        >
          {children(activeSection)}
        </motion.div>
      </div>
    </section>
  );
}
