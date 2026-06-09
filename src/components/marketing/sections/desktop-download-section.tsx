import { DesktopDownloadButtons } from "@/components/marketing/desktop-download-buttons";
import { SectionShell } from "@/components/marketing/ui/section-shell";

export function DesktopDownloadSection() {
  return (
    <SectionShell
      id="download"
      label="Desktop"
      title="Скачать AutoCore для авторазборки и автосервиса"
      description="Нативное приложение для macOS и Windows. Тот же интерфейс и данные, что в браузере на app.myautocore.com — без локального сервера."
      align="center"
    >
      <DesktopDownloadButtons variant="marketing" className="mx-auto max-w-xl text-center" />
    </SectionShell>
  );
}
