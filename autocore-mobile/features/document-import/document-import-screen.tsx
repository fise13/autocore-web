import { useCallback, useRef, useState } from 'react';
import {
  Image,
  Pressable,
  StyleSheet,
  View,
} from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import { useIsFocused, useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Animated, { FadeIn, FadeOut } from 'react-native-reanimated';

import { ArrowLeftIcon, FlashlightIcon, ImagesIcon } from '@/assets/icons';
import { Text, toast } from '@/components/ui';
import { useTheme } from '@/hooks';
import { haptics, rhythm } from '@/theme';
import { uploadDocumentImport } from '@/services/api/document-import';

import { ImportCamera, type ImportCameraHandle } from './components/import-camera';
import { ImportSuccessView, ImportUploadingView } from './components/import-status-views';

type Phase = 'capture' | 'review' | 'uploading' | 'success';

export function DocumentImportScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const isFocused = useIsFocused();
  const { colors } = useTheme();
  const cameraRef = useRef<ImportCameraHandle>(null);

  const [phase, setPhase] = useState<Phase>('capture');
  const [torchOn, setTorchOn] = useState(false);
  const [photoUri, setPhotoUri] = useState<string | null>(null);

  const goBack = useCallback(() => {
    if (router.canGoBack()) {
      router.back();
      return;
    }
    router.replace('/(tabs)/scan');
  }, [router]);

  const handleCapture = useCallback(async () => {
    haptics.light();
    const uri = await cameraRef.current?.takePicture();
    if (!uri) {
      toast({ title: 'Не удалось сделать снимок', variant: 'warning' });
      return;
    }
    setPhotoUri(uri);
    setPhase('review');
  }, []);

  const handlePickGallery = useCallback(async () => {
    const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!permission.granted) {
      toast({
        title: 'Нет доступа к фото',
        description: 'Разрешите доступ к галерее в настройках.',
        variant: 'warning',
      });
      return;
    }
    const pick = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      quality: 0.85,
    });
    if (pick.canceled || !pick.assets[0]?.uri) return;
    setPhotoUri(pick.assets[0].uri);
    setPhase('review');
  }, []);

  const handleRetake = useCallback(() => {
    haptics.selection();
    setPhotoUri(null);
    setPhase('capture');
  }, []);

  const handleSubmit = useCallback(async () => {
    if (!photoUri) return;
    setPhase('uploading');
    haptics.light();
    try {
      const filename = photoUri.split('/').pop() ?? 'document.jpg';
      const extension = filename.split('.').pop()?.toLowerCase();
      const mimeType =
        extension === 'png'
          ? 'image/png'
          : extension === 'webp'
            ? 'image/webp'
            : 'image/jpeg';
      await uploadDocumentImport(photoUri, filename, mimeType);
      haptics.success();
      setPhase('success');
    } catch (error) {
      toast({
        title: 'Не удалось отправить',
        description: error instanceof Error ? error.message : undefined,
        variant: 'destructive',
      });
      setPhase('review');
    }
  }, [photoUri]);

  const cameraActive = isFocused && phase === 'capture';

  return (
    <View style={styles.root}>
      {phase === 'capture' || phase === 'review' ? (
        <View style={StyleSheet.absoluteFill}>
          {phase === 'capture' ? (
            <ImportCamera ref={cameraRef} torch={torchOn} active={cameraActive} />
          ) : photoUri ? (
            <Animated.View entering={FadeIn.duration(180)} style={StyleSheet.absoluteFill}>
              <Image source={{ uri: photoUri }} style={styles.preview} resizeMode="contain" />
            </Animated.View>
          ) : null}
          <View style={[styles.dim, { opacity: phase === 'review' ? 0.35 : 0 }]} pointerEvents="none" />
        </View>
      ) : (
        <View style={[StyleSheet.absoluteFill, { backgroundColor: '#000' }]} />
      )}

      <View style={[styles.topBar, { paddingTop: insets.top + 8 }]} pointerEvents="box-none">
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Назад"
          onPress={goBack}
          style={styles.iconBtn}
        >
          <ArrowLeftIcon size={20} color="#fff" strokeWidth={2} />
        </Pressable>
        <Text variant="body" style={styles.topTitle}>
          Import
        </Text>
        {phase === 'capture' ? (
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Фонарик"
            onPress={() => {
              haptics.selection();
              setTorchOn((value) => !value);
            }}
            style={[styles.iconBtn, torchOn ? { backgroundColor: colors.primary } : null]}
          >
            <FlashlightIcon size={18} color="#fff" strokeWidth={2} />
          </Pressable>
        ) : (
          <View style={styles.iconBtnPlaceholder} />
        )}
      </View>

      {phase === 'capture' ? (
        <View style={[styles.bottomBar, { paddingBottom: Math.max(insets.bottom, 16) }]}>
          <Text variant="caption" style={styles.hint}>
            Сфотографируйте документ целиком
          </Text>
          <View style={styles.captureRow}>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Галерея"
              onPress={() => void handlePickGallery()}
              style={styles.sideBtn}
            >
              <ImagesIcon size={22} color="#fff" strokeWidth={1.8} />
            </Pressable>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Сделать снимок"
              onPress={() => void handleCapture()}
              style={styles.shutter}
            >
              <View style={styles.shutterInner} />
            </Pressable>
            <View style={styles.sideBtn} />
          </View>
        </View>
      ) : null}

      {phase === 'review' ? (
        <Animated.View
          entering={FadeIn.duration(200)}
          exiting={FadeOut.duration(120)}
          style={[styles.bottomBar, { paddingBottom: Math.max(insets.bottom, 16), gap: 10 }]}
        >
          <Pressable
            accessibilityRole="button"
            onPress={handleRetake}
            style={[styles.secondaryButton, { borderColor: 'rgba(255,255,255,0.35)' }]}
          >
            <Text variant="body" style={{ color: '#fff', fontWeight: '600' }}>
              Переснять
            </Text>
          </Pressable>
          <Pressable
            accessibilityRole="button"
            onPress={() => void handleSubmit()}
            style={[styles.primaryButton, { backgroundColor: colors.primary }]}
          >
            <Text variant="body" style={{ color: colors.primaryForeground, fontWeight: '700' }}>
              Отправить
            </Text>
          </Pressable>
        </Animated.View>
      ) : null}

      {phase === 'uploading' ? <ImportUploadingView /> : null}
      {phase === 'success' ? <ImportSuccessView onDone={goBack} /> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: '#000',
  },
  preview: {
    width: '100%',
    height: '100%',
    backgroundColor: '#000',
  },
  dim: {
    ...StyleSheet.absoluteFill,
    backgroundColor: '#000',
  },
  topBar: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
  },
  topTitle: {
    color: '#fff',
    fontWeight: '700',
    fontSize: 16,
  },
  iconBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(0,0,0,0.35)',
  },
  iconBtnPlaceholder: {
    width: 40,
    height: 40,
  },
  bottomBar: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    alignItems: 'center',
    paddingHorizontal: 20,
    gap: rhythm.inline,
  },
  hint: {
    color: 'rgba(255,255,255,0.78)',
    fontWeight: '500',
    textAlign: 'center',
  },
  captureRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    width: '100%',
    maxWidth: 320,
  },
  sideBtn: {
    width: 48,
    height: 48,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(255,255,255,0.12)',
  },
  shutter: {
    width: 72,
    height: 72,
    borderRadius: 36,
    borderWidth: 3,
    borderColor: 'rgba(255,255,255,0.92)',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(0,0,0,0.28)',
  },
  shutterInner: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: '#fff',
  },
  primaryButton: {
    width: '100%',
    minHeight: 52,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  secondaryButton: {
    width: '100%',
    minHeight: 48,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    backgroundColor: 'rgba(0,0,0,0.35)',
  },
});
