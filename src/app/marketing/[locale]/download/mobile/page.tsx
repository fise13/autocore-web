import { redirect } from "next/navigation";

import { routing } from "@/i18n/routing";

type PageProps = {
  params: Promise<{ locale: string }>;
};

export function generateStaticParams() {
  return routing.locales.map((locale) => ({ locale }));
}

export function generateMetadata() {
  return {
    robots: { index: false, follow: false },
  };
}

export default async function DownloadMobilePage({ params }: PageProps) {
  await params;
  redirect("/download");
}
