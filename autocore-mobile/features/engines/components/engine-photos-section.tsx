import { ActivityIndicator, Pressable, ScrollView, View } from 'react-native';
import { Image } from 'expo-image';

import { CameraIcon, PlusIcon } from '@/assets/icons';
import { Text } from '@/components/ui';
import { presentNativeMenu } from '@/components/ui/native-context-menu';
import { useTheme } from '@/hooks';
import { haptics, spacing } from '@/theme';

import { eng } from '../layout';

const TILE = 92;
const RADIUS = 12;

type EnginePhotosSectionProps = {
  photos: string[];
  canEdit: boolean;
  uploading: { done: number; total: number } | null;
  onOpen: (index: number) => void;
  onTakePhoto: () => void;
  onPickFromLibrary: () => void;
  onMakeMain: (index: number) => void;
  onDelete: (index: number) => void;
};

/**
 * The engine's photos as a strip of tiles: tap to view, hold for "Make main" /
 * "Delete", and a trailing tile to add more from the camera or the library.
 * The first photo is the main one — it leads the catalog row and the hero.
 */
export function EnginePhotosSection({
  photos,
  canEdit,
  uploading,
  onOpen,
  onTakePhoto,
  onPickFromLibrary,
  onMakeMain,
  onDelete,
}: EnginePhotosSectionProps) {
  const { colors } = useTheme();

  const chooseSource = () => {
    presentNativeMenu({
      title: 'Add photos',
      actions: [
        { id: 'camera', title: 'Take Photo', systemImage: 'camera' },
        { id: 'library', title: 'Choose from Library', systemImage: 'photo.on.rectangle' },
      ],
      onPressAction: (id) => (id === 'camera' ? onTakePhoto() : onPickFromLibrary()),
    });
  };

  const photoMenu = (index: number) => {
    if (!canEdit) return;
    presentNativeMenu({
      actions: [
        ...(index > 0
          ? [{ id: 'main', title: 'Make Main Photo', systemImage: 'star' as const }]
          : []),
        { id: 'delete', title: 'Delete Photo', systemImage: 'trash' as const, destructive: true },
      ],
      onPressAction: (id) => (id === 'main' ? onMakeMain(index) : onDelete(index)),
    });
  };

  if (photos.length === 0 && !uploading) {
    if (!canEdit) return null;
    return (
      <Pressable
        accessibilityRole="button"
        accessibilityLabel="Add photos of this engine"
        onPress={() => {
          haptics.selection();
          chooseSource();
        }}
        style={{
          flexDirection: 'row',
          alignItems: 'center',
          gap: spacing[3],
          padding: spacing[4],
          borderRadius: RADIUS,
          borderWidth: 1.5,
          borderStyle: 'dashed',
          borderColor: colors.border,
          backgroundColor: colors.surface,
        }}
      >
        <View
          style={{
            width: 44,
            height: 44,
            borderRadius: 22,
            alignItems: 'center',
            justifyContent: 'center',
            backgroundColor: colors.primary,
          }}
        >
          <CameraIcon size="sm" color={colors.primaryForeground} strokeWidth={2} />
        </View>
        <View style={{ flex: 1, gap: 2 }}>
          <Text variant="headline">Add photos</Text>
          <Text variant="footnote" color="muted">
            Take a picture or choose from your library
          </Text>
        </View>
      </Pressable>
    );
  }

  return (
    <ScrollView
      horizontal
      showsHorizontalScrollIndicator={false}
      contentContainerStyle={{ gap: spacing[2], paddingRight: eng.pad }}
      style={{ marginRight: -eng.pad }}
    >
      {photos.map((url, index) => (
        <Pressable
          key={url}
          accessibilityRole="imagebutton"
          accessibilityLabel={index === 0 ? 'Main photo' : `Photo ${index + 1}`}
          accessibilityHint={canEdit ? 'Hold for more options' : undefined}
          onPress={() => onOpen(index)}
          onLongPress={() => photoMenu(index)}
          delayLongPress={300}
        >
          <Image
            alt=""
            source={{ uri: url }}
            recyclingKey={url}
            contentFit="cover"
            transition={120}
            style={{
              width: TILE,
              height: TILE,
              borderRadius: RADIUS,
              backgroundColor: colors.surfaceElevated,
            }}
          />
          {index === 0 && photos.length > 1 ? (
            <View
              style={{
                position: 'absolute',
                left: 6,
                bottom: 6,
                paddingHorizontal: 6,
                paddingVertical: 2,
                borderRadius: 6,
                backgroundColor: colors.overlay,
              }}
            >
              <Text variant="caption2" style={{ color: '#fff', fontWeight: '600' }}>
                Main
              </Text>
            </View>
          ) : null}
        </Pressable>
      ))}

      {uploading ? (
        <View
          accessibilityLabel={`Uploading photo ${uploading.done + 1} of ${uploading.total}`}
          style={{
            width: TILE,
            height: TILE,
            borderRadius: RADIUS,
            alignItems: 'center',
            justifyContent: 'center',
            gap: spacing[1],
            backgroundColor: colors.surface,
          }}
        >
          <ActivityIndicator size="small" color={colors.mutedForeground} />
          <Text variant="caption2" color="muted" style={{ fontVariant: ['tabular-nums'] }}>
            {Math.min(uploading.done + 1, uploading.total)}/{uploading.total}
          </Text>
        </View>
      ) : canEdit ? (
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Add photos"
          onPress={() => {
            haptics.selection();
            chooseSource();
          }}
          style={{
            width: TILE,
            height: TILE,
            borderRadius: RADIUS,
            alignItems: 'center',
            justifyContent: 'center',
            gap: spacing[1],
            borderWidth: 1.5,
            borderStyle: 'dashed',
            borderColor: colors.border,
          }}
        >
          <PlusIcon size="sm" color={colors.primary} strokeWidth={2.2} />
          <Text variant="caption2" style={{ color: colors.primary, fontWeight: '600' }}>
            Add
          </Text>
        </Pressable>
      ) : null}
    </ScrollView>
  );
}
