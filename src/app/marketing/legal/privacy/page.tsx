import type { Metadata } from "next";

import { landingCopy } from "@/components/marketing/copy/landing-copy";
import { MarketingSubpage } from "@/components/marketing/site/marketing-subpage";

const copy = landingCopy.pages.privacy;

export const metadata: Metadata = {
  title: copy.title,
  description: copy.description,
};

export default function PrivacyPage() {
  return (
    <MarketingSubpage title={copy.title} description={copy.description} breadcrumbLabel="Конфиденциальность">
      <article className="prose prose-neutral max-w-3xl space-y-6 text-muted-foreground">
        <section>
          <h2 className="text-lg font-semibold text-foreground">1. Общие положения</h2>
          <p>
            Настоящая политика описывает обработку данных пользователей и компаний в сервисе AutoCore. Используя
            приложение, вы соглашаетесь с условиями обработки данных в объёме, необходимом для работы сервиса.
          </p>
        </section>
        <section>
          <h2 className="text-lg font-semibold text-foreground">2. Какие данные обрабатываются</h2>
          <p>
            Учётные данные (email, идентификатор провайдера входа), данные компании, операционные записи склада и
            бухгалтерии, журнал активности сотрудников, технические метаданные сессии.
          </p>
        </section>
        <section>
          <h2 className="text-lg font-semibold text-foreground">3. Цели обработки</h2>
          <p>
            Предоставление функций AutoCore, синхронизация между устройствами, безопасность, поддержка пользователей
            и соблюдение законных требований.
          </p>
        </section>
        <section>
          <h2 className="text-lg font-semibold text-foreground">4. Хранение и защита</h2>
          <p>
            Данные хранятся в защищённой инфраструктуре с разграничением доступа по компаниям. Доступ сотрудников
            ограничивается ролями внутри продукта.
          </p>
        </section>
        <section>
          <h2 className="text-lg font-semibold text-foreground">5. Контакты</h2>
          <p>По вопросам персональных данных: support@autocore.app</p>
        </section>
        <p className="text-xs">Последнее обновление: май 2026</p>
      </article>
    </MarketingSubpage>
  );
}
