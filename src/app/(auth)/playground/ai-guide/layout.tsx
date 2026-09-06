import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "AI Guide playground",
  robots: { index: false, follow: false },
};

export default function AiGuidePlaygroundLayout({ children }: { children: React.ReactNode }) {
  return children;
}
