import type { CSSProperties } from 'react';

export {
  companyMonogramLabel,
  companyAvatarGradient,
  companyAvatarGradientCss,
  companyAvatarGradientColors,
  pickCompanyAvatarGradient,
} from '@autocore/avatars';

import { companyAvatarGradientCss } from '@autocore/avatars';

export function companyAvatarStyle(companyId: string): CSSProperties {
  return {
    background: companyAvatarGradientCss(companyId),
  };
}
