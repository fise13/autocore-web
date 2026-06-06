import type { Metadata } from "next";

import { landingCopy } from "@/components/marketing/copy/landing-copy";
import { MarketingSubpage } from "@/components/marketing/site/marketing-subpage";

const copy = landingCopy.pages.terms;

export const metadata: Metadata = {
  title: copy.title,
  description: copy.description,
};

export default function TermsPage() {
  return (
    <MarketingSubpage title={copy.title} description={copy.description} breadcrumbLabel="Условия">
      <article className="prose prose-neutral max-w-3xl space-y-6 text-muted-foreground">
        <section>
          <h2 className="text-lg font-semibold text-foreground">1. Предмет соглашения</h2>
          <p>
            AutoCore предоставляет программное обеспечение для операционного управления дилерским центром. Условия
            регулируют использование веб-приложения и связанных сервисов.
          </p>
        </section>
        <section>
          <h2 className="text-lg font-semibold text-foreground">2. Учётная запись</h2>
          <p>
            Пользователь обязан обеспечивать конфиденциальность учётных данных. Администратор компании управляет
            доступом сотрудников и несёт ответственность за действия в рамках организации.
          </p>
        </section>
        <section>
          <h2 className="text-lg font-semibold text-foreground">3. Использование сервиса</h2>
          <p>
            Запрещается нарушать работу системы, обходить ограничения доступа, использовать сервис вне законных
            целей. Операционные данные остаются собственностью клиента.
          </p>
        </section>
        <section>
          <h2 className="text-lg font-semibold text-foreground">4. Подписка и оплата</h2>
          <p>
            Платные функции активируются согласно выбранному тарифу в приложении. Условия оплаты и отмены указываются
            при оформлении подписки.
          </p>
        </section>
        <section>
          <h2 className="text-lg font-semibold text-foreground">5. Ограничение ответственности</h2>
          <p>
            Сервис предоставляется в рамках разумных технических возможностей. Клиент обязан сверять критичные
            финансовые и складские операции согласно внутренним процедурам.
          </p>
        </section>
        <p className="text-xs">Последнее обновление: май 2026</p>
      </article>
    </MarketingSubpage>
  );
}
