import type { Metadata } from "next";
import Link from "next/link";

import { landingCopy } from "@/components/marketing/copy/landing-copy";
import { MarketingSubpage } from "@/components/marketing/site/marketing-subpage";
import { appLoginUrl } from "@/lib/site-urls";

const copy = landingCopy.pages.contact;

export const metadata: Metadata = {
  title: copy.title,
  description: copy.description,
};

export default function ContactPage() {
  return (
    <MarketingSubpage title={copy.title} description={copy.description} breadcrumbLabel="Контакты">
      <div className="grid gap-8 lg:grid-cols-2">
        <div className="autocore-surface-group space-y-4 p-8">
          <h2 className="font-semibold">Запрос доступа</h2>
          <p className="text-muted-foreground">
            Для демо и подключения команды используйте вход в приложение — после регистрации можно создать
            компанию или присоединиться по приглашению.
          </p>
          <Link href={appLoginUrl()} className="inline-flex text-sm font-medium text-primary hover:underline">
            Перейти к входу →
          </Link>
        </div>
        <div className="autocore-surface-group space-y-4 p-8">
          <h2 className="font-semibold">Внедрение</h2>
          <p className="text-muted-foreground">
            Помогаем перенести склад и процессы из Excel, настроить роли и первый Mission Control. Напишите через
            канал, указанный вашим менеджером AutoCore.
          </p>
          <p className="text-sm text-muted-foreground">support@autocore.app — пример контактного адреса для production.</p>
        </div>
      </div>
    </MarketingSubpage>
  );
}
