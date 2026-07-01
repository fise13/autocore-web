import type { Metadata } from "next";
import { Suspense, type ReactNode } from "react";

export const metadata: Metadata = {
  title: "Вход",
  description: "Вход в AutoCore — программу для авторазборок и автосервисов.",
  robots: {
    index: false,
    follow: false,
  },
};

type LoginLayoutProps = {
  children: ReactNode;
};

export default function LoginLayout({ children }: LoginLayoutProps) {
  return <Suspense fallback={children}>{children}</Suspense>;
}
