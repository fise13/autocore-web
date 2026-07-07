import type { CSSProperties } from 'react';

export {
  USER_AVATAR_GRADIENTS,
  pickUserAvatarGradient,
  resolveUserAvatarSeed,
  userAvatarGradientColors,
  userAvatarGradientCss,
} from '@autocore/avatars';

import { pickUserAvatarGradient } from '@autocore/avatars';

export function userAvatarStyle(seed: string): CSSProperties {
  const { from, to } = pickUserAvatarGradient(seed);
  return {
    background: `linear-gradient(135deg, ${from} 0%, ${to} 100%)`,
  };
}
