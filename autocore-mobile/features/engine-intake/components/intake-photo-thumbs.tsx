import { ScrollView, View } from 'react-native';
import { Image } from 'expo-image';

import { spacing, tokens, type SemanticColors } from '@/theme';

import {
  thumbStatusFromSync,
  type IntakePhotoThumbStatus,
} from '../lib/merge-intake-photos';

const TILE = 44;

export type IntakePhotoThumbItem = {
  id: string;
  uri: string;
  status: string;
};

function ringColor(status: IntakePhotoThumbStatus, chrome: SemanticColors): string {
  if (status === 'failed') return chrome.danger;
  if (status === 'uploading') return chrome.primary;
  if (status === 'completed') return chrome.success;
  return chrome.border;
}

export function IntakePhotoThumbs({
  items,
  chrome,
}: {
  items: readonly IntakePhotoThumbItem[];
  chrome: SemanticColors;
}) {
  if (items.length === 0) return null;
  const visible = items.slice(-8);

  return (
    <ScrollView
      horizontal
      showsHorizontalScrollIndicator={false}
      contentContainerStyle={{
        gap: spacing[2],
        justifyContent: 'center',
        flexGrow: 1,
      }}
    >
      {visible.map((item) => {
        const status = thumbStatusFromSync(item.status);
        return (
          <View
            key={item.id}
            style={{
              width: TILE,
              height: TILE,
              borderRadius: tokens.radius.control,
              overflow: 'hidden',
              borderWidth: 2,
              borderColor: ringColor(status, chrome),
              opacity: status === 'queued' ? 0.85 : 1,
            }}
          >
            <Image
              source={{ uri: item.uri }}
              style={{ width: TILE, height: TILE }}
              contentFit="cover"
              cachePolicy="memory-disk"
              transition={80}
              alt=""
              accessibilityIgnoresInvertColors
            />
            {status === 'uploading' || status === 'failed' ? (
              <View
                pointerEvents="none"
                style={{
                  position: 'absolute',
                  right: 3,
                  bottom: 3,
                  width: 8,
                  height: 8,
                  borderRadius: tokens.radius.full,
                  backgroundColor: status === 'failed' ? chrome.danger : chrome.primary,
                }}
              />
            ) : null}
          </View>
        );
      })}
    </ScrollView>
  );
}
