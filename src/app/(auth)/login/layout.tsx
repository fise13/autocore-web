import type { Metadata } from "next";
import { Suspense, type ReactNode } from "react";

export const metadata: Metadata = {
  title: "Sign in",
  description: "Sign in to AutoCore — software for dismantlers and repair shops.",
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
