import type { Metadata } from "next";

import { AIProductWorkspace } from "@/components/ai/ai-product-workspace";

export const metadata: Metadata = {
  title: "Core",
  description: "Core — AutoCore intelligence",
};

export default function AIPage() {
  return <AIProductWorkspace />;
}
