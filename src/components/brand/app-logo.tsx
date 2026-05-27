import Image from "next/image";

import { brandAssets } from "@/lib/brand-assets";
import { cn } from "@/lib/utils";

type AppLogoProps = {
  size?: number;
  className?: string;
  priority?: boolean;
  alt?: string;
  variant?: "icon" | "transparent";
};

export function AppLogo({
  size = 72,
  className,
  priority = false,
  alt = "AutoCore",
  variant = "transparent",
}: AppLogoProps) {
  if (variant === "icon") {
    return (
      <span
        className={cn("relative inline-block shrink-0", className)}
        style={{ width: size, height: size }}
      >
        <Image
          src={brandAssets.icons.app}
          alt={alt}
          width={size}
          height={size}
          className="size-full select-none dark:hidden"
          priority={priority}
        />
        <Image
          src={brandAssets.icons.appDark}
          alt={alt}
          width={size}
          height={size}
          className="hidden size-full select-none dark:block"
          priority={priority}
        />
      </span>
    );
  }

  return (
    <Image
      src={brandAssets.branding.loginLogoTransparent}
      alt={alt}
      width={size}
      height={size}
      className={cn("select-none", className)}
      priority={priority}
    />
  );
}
