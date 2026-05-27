import Image from "next/image";

import { brandAssets } from "@/lib/brand-assets";
import { cn } from "@/lib/utils";

type AppLogoProps = {
  size?: number;
  className?: string;
  priority?: boolean;
  alt?: string;
};

export function AppLogo({
  size = 72,
  className,
  priority = false,
  alt = "AutoCore",
}: AppLogoProps) {
  return (
    <Image
      src={brandAssets.logo}
      alt={alt}
      width={size}
      height={size}
      className={cn("select-none", className)}
      priority={priority}
    />
  );
}
