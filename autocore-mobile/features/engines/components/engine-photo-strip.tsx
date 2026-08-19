import { useState } from 'react';
import { Platform, Pressable, ScrollView, View } from 'react-native';
import { Image } from 'expo-image';
import * as Clipboard from 'expo-clipboard';
import {
  Button as SwiftButton,
  ContextMenu,
  Host,
  RNHostView,
} from '@expo/ui/swift-ui';

import { CameraIcon } from '@/assets/icons';
import { Skeleton, Text, toast } from '@/components/ui';
import { presentNativeMenu } from '@/components/ui/native-context-menu';
import { useTheme } from '@/hooks';
import { haptics, spacing } from '@/theme';
import { withAlpha } from '@/theme/color-utils';

import { shareEnginePhoto } from '../lib/engine-photo-file';

const TILE = 132;

type PhotoActions = {
  save: () => void;
  copyLink: () => void;
};

function PhotoTile({ url, onPress }: { url: string; onPress: () => void }) {
  const { colors, isDark } = useTheme();
  const [loaded, setLoaded] = useState(false);
  const [pressed, setPressed] = useState(false);

  return (
    // Static style: `Pressable`'s function-form `style` is dropped by this RN
    // version, so press feedback rides on `opacity` state instead.
    <Pressable
      accessibilityRole="imagebutton"
      accessibilityLabel="Open photo"
      onPressIn={() => setPressed(true)}
      onPressOut={() => setPressed(false)}
      onPress={() => {
        haptics.selection();
        onPress();
      }}
      style={{
        width: TILE,
        height: TILE,
        borderRadius: 8,
        overflow: 'hidden',
        backgroundColor: withAlpha(colors.muted, isDark ? 0.8 : 1),
        borderWidth: 1,
        borderColor: colors.border,
        opacity: pressed ? 0.85 : 1,
      }}
    >
      <Image
        source={{ uri: url }}
        style={{ width: TILE, height: TILE }}
        contentFit="cover"
        cachePolicy="memory-disk"
        transition={140}
        // Decorative: the tile's Pressable already carries the accessible name.
        alt=""
        accessibilityIgnoresInvertColors
        onLoadEnd={() => setLoaded(true)}
      />
      {loaded ? null : (
        <Skeleton
          width={TILE}
          height={TILE}
          style={{ position: 'absolute', top: 0, left: 0, borderRadius: 8 }}
        />
      )}
    </Pressable>
  );
}

/**
 * Tile plus the system context menu.
 *
 * `ContextMenu` here is the real UIKit menu — the hold, the lift, the blur and
 * the haptic all come from iOS rather than being redrawn in JS. The tile itself
 * stays a React Native view, hosted back inside SwiftUI through `RNHostView`.
 */
function NativeMenuTile({
  url,
  actions,
  onPress,
}: {
  url: string;
  actions: PhotoActions;
  onPress: () => void;
}) {
  const { colors, isDark } = useTheme();

  if (Platform.OS !== 'ios') {
    return (
      <Pressable
        onLongPress={() =>
          presentNativeMenu({
            actions: [
              { id: 'save', title: 'Save Photo', systemImage: 'square.and.arrow.down' },
              { id: 'copy', title: 'Copy Link', systemImage: 'link' },
            ],
            onPressAction: (id) => (id === 'save' ? actions.save() : actions.copyLink()),
          })
        }
      >
        <PhotoTile url={url} onPress={onPress} />
      </Pressable>
    );
  }

  return (
    <Host
      matchContents
      colorScheme={isDark ? 'dark' : 'light'}
      seedColor={colors.primary}
      style={{ width: TILE, height: TILE }}
    >
      <ContextMenu>
        <ContextMenu.Trigger>
          <RNHostView matchContents>
            <PhotoTile url={url} onPress={onPress} />
          </RNHostView>
        </ContextMenu.Trigger>
        <ContextMenu.Items>
          <SwiftButton
            label="Save Photo"
            systemImage="square.and.arrow.down"
            onPress={actions.save}
          />
          <SwiftButton
            label="Share"
            systemImage="square.and.arrow.up"
            onPress={actions.save}
          />
          <SwiftButton label="Copy Link" systemImage="link" onPress={actions.copyLink} />
        </ContextMenu.Items>
      </ContextMenu>
    </Host>
  );
}

/**
 * Every photo on the engine, as a strip.
 *
 * The hero pages through the same set; this is the "all of them" row, and the
 * place a hold means something — the full-screen viewer deliberately has no
 * long-press, because holding a photo you are mid-pinch on is ambiguous.
 */
export function EnginePhotoStrip({
  urls,
  serial,
  onOpen,
}: {
  urls: string[];
  serial: string;
  onOpen: (index: number) => void;
}) {
  const { colors } = useTheme();

  const actionsFor = (url: string, index: number): PhotoActions => ({
    save: () => {
      void (async () => {
        try {
          await shareEnginePhoto(url, serial, index);
          haptics.success();
        } catch (error) {
          haptics.error();
          toast({
            title: 'Could not save the photo',
            description: error instanceof Error ? error.message : undefined,
            variant: 'destructive',
          });
        }
      })();
    },
    copyLink: () => {
      void (async () => {
        await Clipboard.setStringAsync(url);
        toast({ title: 'Photo link copied', variant: 'success' });
      })();
    },
  });

  if (urls.length === 0) {
    return (
      <View
        style={{
          flexDirection: 'row',
          alignItems: 'center',
          gap: spacing[3],
          padding: spacing[3],
          borderRadius: 12,
          borderWidth: 1,
          borderColor: colors.border,
          backgroundColor: colors.card,
        }}
      >
        <CameraIcon size="md" color={withAlpha(colors.mutedForeground, 0.6)} strokeWidth={1.5} />
        <Text variant="footnote" color="muted" style={{ flex: 1 }}>
          No photos yet. Run an intake session to document this engine.
        </Text>
      </View>
    );
  }

  return (
    <ScrollView
      horizontal
      showsHorizontalScrollIndicator={false}
      contentContainerStyle={{ gap: spacing[2] }}
    >
      {urls.map((url, index) => (
        <NativeMenuTile
          key={url}
          url={url}
          actions={actionsFor(url, index)}
          onPress={() => onOpen(index)}
        />
      ))}
    </ScrollView>
  );
}
