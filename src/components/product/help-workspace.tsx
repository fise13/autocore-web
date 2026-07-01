"use client";

import { useMemo, useState } from "react";
import { ExternalLink, Mail, Phone } from "lucide-react";
import Link from "next/link";

import { EnterprisePanelCard } from "@/components/layout/enterprise-panel-card";
import { EnterpriseWorkspaceShell } from "@/components/layout/enterprise-workspace-shell";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import {
  filterProductHelpSections,
  productHelpSections,
} from "@/lib/product/product-help";
import { getPlatformContacts } from "@/lib/platform/platform-contacts";
import { marketingPageUrl } from "@/lib/site-urls";
import { marketingRoutes } from "@/lib/marketing-routes";

export function HelpWorkspace() {
  const [query, setQuery] = useState("");
  const contacts = getPlatformContacts();

  const sections = useMemo(
    () => filterProductHelpSections(productHelpSections, query),
    [query],
  );

  return (
    <EnterpriseWorkspaceShell
      title="Справка"
      description="Ответы по работе со складом, моторами, нарядами и документами."
    >
      <div className="mx-auto flex w-full max-w-3xl flex-col gap-6">
        <Input
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          placeholder="Поиск по вопросам…"
          aria-label="Поиск по справке"
          className="h-10"
        />

        {sections.length === 0 ? (
          <EnterprisePanelCard
            title="Ничего не найдено"
            contentClassName="px-6 py-8 text-sm text-muted-foreground"
          >
            Попробуйте другой запрос или напишите в поддержку — мы поможем.
          </EnterprisePanelCard>
        ) : (
          sections.map((section) => (
            <EnterprisePanelCard
              key={section.id}
              title={section.title}
              contentClassName="divide-y divide-border px-0 py-0"
            >
              <dl>
                {section.items.map((item) => (
                  <div key={item.q} className="px-6 py-4">
                    <dt className="text-sm font-medium text-foreground">{item.q}</dt>
                    <dd className="mt-2 text-sm leading-relaxed text-muted-foreground">{item.a}</dd>
                  </div>
                ))}
              </dl>
            </EnterprisePanelCard>
          ))
        )}

        <EnterprisePanelCard
          title="Нужна помощь?"
          description="Свяжитесь с командой AutoCore"
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
              Страница контактов
              <ExternalLink className="size-3.5" />
            </Button>
          </div>
        </EnterprisePanelCard>
      </div>
    </EnterpriseWorkspaceShell>
  );
}
