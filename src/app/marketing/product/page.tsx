import type { Metadata } from "next";

import { landingCopy } from "@/components/marketing/copy/landing-copy";
import { FeatureCard } from "@/components/marketing/site/feature-card";
import { MarketingSubpage } from "@/components/marketing/site/marketing-subpage";
import { Radar, RefreshCw, Workflow } from "lucide-react";

const copy = landingCopy.pages.product;

export const metadata: Metadata = {
  title: copy.title,
  description: copy.description,
};

export default function ProductPage() {
  return (
    <MarketingSubpage title={copy.title} description={copy.description} breadcrumbLabel="Продукт">
      <div className="prose prose-neutral max-w-none dark:prose-invert">
        <p className="text-lg text-muted-foreground">
          AutoCore объединяет ежедневные операции дилерского центра в одной системе с тем же интерфейсом, что и в
          рабочем приложении: светлая тема, чёткая иерархия, метрики и журнал активности.
        </p>
      </div>

      <div className="mt-12 grid gap-4 md:grid-cols-3">
        <FeatureCard
          icon={Radar}
          tone="blue"
          title="Mission Control"
          description="Утренний обзор: склад, финансы, команда и алерты на одном экране."
        />
        <FeatureCard
          icon={Workflow}
          tone="green"
          title="Связанные процессы"
          description="От остатка до документа — без разрывов между модулями."
        />
        <FeatureCard
          icon={RefreshCw}
          tone="amber"
          title="Realtime"
          description="Изменения видны на всех устройствах без ручной выгрузки."
        />
      </div>

      <section className="mt-16 autocore-surface-group p-8">
        <h2 className="text-xl font-semibold">Для кого</h2>
        <ul className="mt-4 space-y-3 text-muted-foreground">
          <li>— Дилерские центры и сервисные станции с активным складом</li>
          <li>— Команды от 3 до 50+ сотрудников с разграничением прав</li>
          <li>— Бизнес, которому нужен контроль, а не маркетинговые обещания</li>
        </ul>
      </section>
    </MarketingSubpage>
  );
}
