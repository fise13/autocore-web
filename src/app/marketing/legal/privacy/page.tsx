import { MarketingSubpage } from "@/components/marketing/site/marketing-subpage";
import { buildMarketingMetadata } from "@/lib/seo/build-marketing-metadata";

export const metadata = buildMarketingMetadata("privacy");

export const revalidate = 3600;

export default function PrivacyPage() {
  return (
    <MarketingSubpage
      title="Политика конфиденциальности"
      description="Как мы обрабатываем данные пользователей и компаний авторазборок и автосервисов в сервисе AutoCore."
      breadcrumbLabel="Конфиденциальность"
      pathKey="privacy"
      showCta={false}
    >
      <article className="marketing-legal-article">
        <section>
          <h2>1. Общие положения</h2>
          <p>
            Настоящая политика описывает обработку данных пользователей и компаний в сервисе AutoCore — программе для
            авторазборок и автосервисов. Используя приложение, вы соглашаетесь с условиями обработки данных в объёме,
            необходимом для работы сервиса.
          </p>
        </section>
        <section>
          <h2>2. Какие данные обрабатываются</h2>
          <p>
            Учётные данные (email, идентификатор провайдера входа), данные компании, операционные записи склада и
            бухгалтерии, заказ-наряды, документы, журнал активности сотрудников, технические метаданные сессии.
          </p>
        </section>
        <section>
          <h2>3. Цели обработки</h2>
          <p>
            Предоставление функций AutoCore, синхронизация между устройствами, безопасность, поддержка пользователей
            и соблюдение законных требований.
          </p>
        </section>
        <section>
          <h2>4. Хранение и защита</h2>
          <p>
            Данные хранятся в защищённой облачной инфраструктуре (Firebase / Google Cloud). Доступ ограничен правилами
            безопасности на уровне компании и ролей сотрудников.
          </p>
        </section>
        <section>
          <h2>5. Права пользователя</h2>
          <p>
            Вы можете запросить удаление учётной записи или экспорт данных компании, обратившись в поддержку. Администратор
            компании управляет доступом сотрудников.
          </p>
        </section>
        <p className="marketing-legal-updated">Последнее обновление: май 2026</p>
      </article>
    </MarketingSubpage>
  );
}
