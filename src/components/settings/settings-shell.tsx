"use client";

import { ReactNode, useMemo, useState } from "react";
import {
  Building2,
  Cloud,
  Download,
  Laptop,
  Settings2,
  Shield,
  Trash2,
  UserCircle,
  Users,
  Workflow,
} from "lucide-react";

import { useAuth } from "@/components/providers/auth-provider";
import { can, canViewEmployees } from "@/lib/auth/permissions";
import { cn } from "@/lib/utils";
import { userCopy } from "@/lib/user-copy";

export type SettingsSectionId =
  | "account"
  | "employees"
  | "roles"
  | "accounting"
  | "sync"
  | "importExport"
  | "workflow"
  | "dataCleanup"
  | "macOnly";

const allSections: { id: SettingsSectionId; label: string; icon: typeof UserCircle }[] = [
  { id: "account", label: userCopy.settings.account, icon: UserCircle },
  { id: "employees", label: userCopy.settings.employees, icon: Users },
  { id: "roles", label: userCopy.settings.roles, icon: Shield },
  { id: "accounting", label: userCopy.settings.accounting, icon: Building2 },
  { id: "sync", label: userCopy.settings.sync, icon: Cloud },
  { id: "importExport", label: userCopy.settings.importExport, icon: Download },
  { id: "workflow", label: userCopy.settings.workflow, icon: Workflow },
  { id: "dataCleanup", label: userCopy.settings.dataCleanup, icon: Trash2 },
  { id: "macOnly", label: "Mac", icon: Laptop },
];

type SettingsShellProps = {
  children: (section: SettingsSectionId) => ReactNode;
  initialSection?: SettingsSectionId;
};

export function SettingsShell({ children, initialSection = "account" }: SettingsShellProps) {
  const { profile } = useAuth();
  const canViewTeam = canViewEmployees(profile);
  const canCleanupData =
    can(profile, "accounting_delete") || can(profile, "inventory_delete");
  const sections = useMemo(
    () =>
      allSections.filter((section) => {
        if (section.id === "employees" || section.id === "roles") return canViewTeam;
        if (section.id === "dataCleanup") return canCleanupData;
        return true;
      }),
    [canCleanupData, canViewTeam],
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
      <aside className="w-full shrink-0 rounded-xl border bg-card p-2 lg:w-56">
        <nav className="flex flex-row gap-1 overflow-x-auto lg:flex-col">
          {sections.map((section) => {
            const Icon = section.icon;
            return (
              <button
                key={section.id}
                type="button"
                onClick={() => selectSection(section.id)}
                className={cn(
                  "inline-flex min-w-max items-center gap-2 rounded-lg px-3 py-2 text-sm transition-all duration-200",
                  activeSection === section.id
                    ? "bg-primary/10 text-primary"
                    : "text-muted-foreground hover:bg-muted/60 hover:text-foreground",
                )}
              >
                <Icon className="size-4" />
                {section.label}
              </button>
            );
          })}
        </nav>
      </aside>

      <div className="min-w-0 flex-1 space-y-5">
        <header className="space-y-1">
          <div className="flex items-center gap-2">
            <Settings2 className="size-5 text-primary" />
            <h2 className="text-2xl font-semibold tracking-tight">{userCopy.settings.title}</h2>
          </div>
          <p className="text-sm text-muted-foreground">{userCopy.settings.subtitle}</p>
        </header>
        <div key={sectionEpoch} className="animate-tab-enter space-y-5 motion-reduce:animate-none">
          {children(activeSection)}
        </div>
      </div>
    </section>
  );
}
