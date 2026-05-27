import loginLogo from "@assets/branding/login-logo.png";
import appleTouchIcon from "@assets/meta/apple-touch-icon.png";
import favicon from "@assets/meta/favicon.png";

/** Single source of truth: native login logo (red A on black). */
export const brandAssets = {
  logo: loginLogo,
  meta: {
    favicon,
    appleTouchIcon,
  },
} as const;
