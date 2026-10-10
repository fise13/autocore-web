"use client";

import { ReactNode, useMemo, useState } from "react";
import { LayoutGroup, motion } from "motion/react";
import { Archive, Building2, CircleUser, Coins, Palette, Settings, SlidersHorizontal } from "lucide-react";

import { useAuth } from "@/components/providers/auth-provider";
import { can } from "@/lib/auth/permissions";
import { cn } from "@/lib/utils";
import { userCopy } from "@/lib/user-copy";

export type SettingsSectionId =
  | "account"
  | "company"
  | "appConfig"
  | "branding"
  | "accounting"
  | "dataCleanup";

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

  const allSections = useMemo(
    () =>
      [
        { id: "account" as const, label: userCopy.settings.account, icon: CircleUser },
        { id: "company" as const, label: userCopy.settings.company, icon: Building2 },
        { id: "appConfig" as const, label: userCopy.settings.appConfig, icon: SlidersHorizontal },
        { id: "branding" as const, label: userCopy.settings.branding, icon: Palette },
        { id: "accounting" as const, label: userCopy.settings.accounting, icon: Coins },
        { id: "dataCleanup" as const, label: userCopy.settings.dataCleanup, icon: Archive },
      ] as const,
    [],
  );

  const sectionSubtitles = useMemo(
    (): Record<SettingsSectionId, string> => ({
      account: userCopy.settings.subtitleAccount,
      company: userCopy.settings.subtitleCompany,
      appConfig: userCopy.settings.subtitleAppConfig,
      branding: userCopy.settings.subtitleBranding,
      accounting: userCopy.settings.subtitleAccounting,
      dataCleanup: userCopy.settings.subtitleDataCleanup,
    }),
    [],
  );

  const sections = useMemo(
    () =>
      allSections.filter((section) => {
        if (section.id === "company") return hasCompany && can(profile, "settings_manage");
        if (section.id === "appConfig") return hasCompany && can(profile, "settings_manage");
        if (section.id === "branding") return hasCompany && can(profile, "settings_manage");
        if (section.id === "accounting") return can(profile, "accounting_view");
        if (section.id === "dataCleanup") return canCleanupData;
        return true;
      }),
    [allSections, canCleanupData, hasCompany, profile],
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
    <section
      className={cn(
        "mx-auto flex w-full flex-col gap-5 lg:flex-row lg:items-start",
        activeSection === "branding" ? "max-w-[1280px]" : "max-w-[1100px]",
      )}
    >
      <aside className="w-full shrink-0 rounded-xl border bg-card p-2 lg:sticky lg:top-4 lg:w-56 lg:self-start">
        <LayoutGroup id="settings-nav">
          <nav className="settings-nav-scroll flex flex-row gap-1 overflow-x-auto lg:flex-col">
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
            <Settings className="size-5 text-primary" />
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
