import appIcon from "@assets/icons/app-icon.png";
import appIconDark from "@assets/icons/app-icon-dark.png";
import loginLogo from "@assets/branding/login-logo.png";
import loginLogoTransparent from "@assets/branding/login-logo-transparent.png";
import appleTouchIcon from "@assets/meta/apple-touch-icon.png";
import favicon from "@assets/meta/favicon.png";

export const brandAssets = {
  icons: {
    app: appIcon,
    appDark: appIconDark,
  },
  branding: {
    loginLogo,
    loginLogoTransparent,
  },
  meta: {
    favicon,
    appleTouchIcon,
  },
} as const;

export type BrandAssetIcon = keyof typeof brandAssets.icons;
export type BrandAssetLogo = keyof typeof brandAssets.branding;
