import { useCallback, useEffect, useRef, useState } from 'react';
import {
  Image,
  Pressable,
  StyleSheet,
  View,
} from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import { useFocusEffect, useIsFocused, useLocalSearchParams, useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Animated, { FadeIn, FadeOut } from 'react-native-reanimated';

import { ArrowLeftIcon, FlashlightIcon, ImagesIcon } from '@/assets/icons';
import { Text, toast } from '@/components/ui';
import { useFloatingTabBarInset, useTheme } from '@/hooks';
import { haptics, rhythm } from '@/theme';
import {
  pollDocumentImportUntilSettled,
  uploadDocumentImportWithRetry,
} from '@/services/api/document-import';

import { DocumentFrameOverlay } from './components/document-frame-overlay';
import { ImportCamera, type ImportCameraHandle } from './components/import-camera';
import {
  ImportSuccessView,
  ImportUploadingView,
  type ImportParseStatus,
} from './components/import-status-views';

type Phase = 'capture' | 'review' | 'uploading' | 'success';

export function DocumentImportScreen() {
  const router = useRouter();
  const params = useLocalSearchParams<{ batchId?: string }>();
  const paramBatchId = typeof params.batchId === 'string' ? params.batchId.trim() : '';
  const insets = useSafeAreaInsets();
  const { footerBottom } = useFloatingTabBarInset();
  const isFocused = useIsFocused();
  const { colors } = useTheme();
  const cameraRef = useRef<ImportCameraHandle>(null);

  const [phase, setPhase] = useState<Phase>('capture');
  const [torchOn, setTorchOn] = useState(false);
  const [photoUri, setPhotoUri] = useState<string | null>(null);
  const [queue, setQueue] = useState<string[]>([]);
  const [uploadedCount, setUploadedCount] = useState(0);
  const [sessionBatchId, setSessionBatchId] = useState<string | null>(paramBatchId || null);
  const [uploadProgress, setUploadProgress] = useState<number | null>(null);
  const [uploadLabel, setUploadLabel] = useState('Uploading document…');
  const [lastJobId, setLastJobId] = useState<string | null>(null);
  const [parseStatus, setParseStatus] = useState<ImportParseStatus>('processing');
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (paramBatchId) {
      setSessionBatchId(paramBatchId);
    }
  }, [paramBatchId]);

  const resetCaptureState = useCallback(() => {
    setPhase('capture');
    setPhotoUri(null);
    setQueue([]);
    setTorchOn(false);
    setUploadProgress(null);
    setBusy(false);
  }, []);

  const goBack = useCallback(() => {
    if (router.canGoBack()) {
      router.back();
      return;
    }
    router.replace('/(tabs)/scan');
  }, [router]);

  const finishImport = useCallback(() => {
    resetCaptureState();
    setUploadedCount(0);
    setLastJobId(null);
    setParseStatus('processing');
    if (!paramBatchId) {
      setSessionBatchId(null);
    }
    router.replace('/(tabs)/scan');
  }, [paramBatchId, resetCaptureState, router]);

  useFocusEffect(
    useCallback(() => {
      return () => {
        resetCaptureState();
      };
    }, [resetCaptureState]),
  );

  const handleCapture = useCallback(async () => {
    if (busy) return;
    haptics.light();
    const uri = await cameraRef.current?.takePicture();
    if (!uri) {
      toast({ title: 'Could not take photo', variant: 'warning' });
      return;
    }
    setPhotoUri(uri);
    setQueue([uri]);
    setPhase('review');
  }, [busy]);

  const handlePickGallery = useCallback(async () => {
    if (busy) return;
    const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!permission.granted) {
      toast({
        title: 'No access to photos',
        description: 'Allow access to your photo library in Settings.',
        variant: 'warning',
      });
      return;
    }
    const pick = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      quality: 0.9,
      allowsMultipleSelection: true,
      selectionLimit: 12,
    });
    if (pick.canceled || !pick.assets?.length) return;
    const uris = pick.assets.map((asset) => asset.uri).filter(Boolean);
    if (uris.length === 0) return;
    setQueue(uris);
    setPhotoUri(uris[0] ?? null);
    setPhase('review');
  }, [busy]);

  const handleRetake = useCallback(() => {
    haptics.selection();
    setPhotoUri(null);
    setQueue([]);
    setPhase('capture');
  }, []);

  const refreshParseStatus = useCallback(async (jobId: string) => {
    setParseStatus('processing');
    const settled = await pollDocumentImportUntilSettled(jobId, {
      attempts: 8,
      intervalMs: 1200,
    });
    if (!settled) {
      setParseStatus('unknown');
      return;
    }
    if (settled.status === 'failed') {
      setParseStatus('failed');
      return;
    }
    setParseStatus('ready');
  }, []);

  const uploadUris = useCallback(
    async (uris: string[]) => {
      if (uris.length === 0) return;
      setBusy(true);
      setPhase('uploading');
      setUploadProgress(0);
      setParseStatus('processing');

      let batchId = sessionBatchId;
      let lastId: string | null = null;
      let okCount = 0;

      try {
        for (let i = 0; i < uris.length; i++) {
          const uri = uris[i];
          if (!uri) continue;
          setUploadLabel(
            uris.length > 1 ? `Uploading ${i + 1} of ${uris.length}…` : 'Uploading document…',
          );
          setUploadProgress(0);

          const result = await uploadDocumentImportWithRetry(uri, {
            batchId: batchId ?? undefined,
            onProgress: (ratio) => setUploadProgress(ratio),
            retries: 2,
          });

          if (result.batchId) {
            batchId = result.batchId;
            setSessionBatchId(result.batchId);
          }
          lastId = result.id;
          okCount += 1;
          setUploadedCount((n) => n + 1);
        }

        haptics.success();
        setLastJobId(lastId);
        setPhase('success');
        if (lastId) {
          void refreshParseStatus(lastId);
        }
      } catch (error) {
        toast({
          title: okCount > 0 ? 'Some photos failed to upload' : 'Upload failed',
          description: error instanceof Error ? error.message : undefined,
          variant: 'destructive',
        });
        if (okCount > 0) {
          setPhase('success');
          if (lastId) void refreshParseStatus(lastId);
        } else {
          setPhase('review');
        }
      } finally {
        setBusy(false);
        setUploadProgress(null);
      }
    },
    [refreshParseStatus, sessionBatchId],
  );

  const handleSubmit = useCallback(async () => {
    const uris = queue.length > 0 ? queue : photoUri ? [photoUri] : [];
    if (uris.length === 0) return;
    haptics.light();
    await uploadUris(uris);
  }, [photoUri, queue, uploadUris]);

  const cameraActive = isFocused && phase === 'capture';
  const hint =
    uploadedCount > 0
      ? `${uploadedCount} uploaded · you can add another page`
      : queue.length > 1
        ? `${queue.length} photos from gallery · review and send`
        : 'Frame the document · you can capture several pages in a row';

  return (
    <View style={styles.root}>
      {phase === 'capture' || phase === 'review' ? (
        <View style={StyleSheet.absoluteFill} pointerEvents="box-none">
          {phase === 'capture' ? (
            <ImportCamera ref={cameraRef} torch={torchOn} active={cameraActive} />
          ) : photoUri ? (
            <Animated.View entering={FadeIn.duration(180)} style={StyleSheet.absoluteFill} pointerEvents="none">
              <Image source={{ uri: photoUri }} style={styles.preview} resizeMode="contain" />
            </Animated.View>
          ) : null}
          {phase === 'capture' ? <DocumentFrameOverlay /> : null}
          <View style={[styles.dim, { opacity: phase === 'review' ? 0.35 : 0 }]} pointerEvents="none" />
        </View>
      ) : (
        <View style={[StyleSheet.absoluteFill, { backgroundColor: '#000' }]} pointerEvents="none" />
      )}

      <View style={[styles.topBar, { paddingTop: insets.top + 8 }]} pointerEvents="box-none">
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Back"
          onPress={goBack}
          style={styles.iconBtn}
        >
          <ArrowLeftIcon size={20} color="#fff" strokeWidth={2} />
        </Pressable>
        <Text variant="body" style={styles.topTitle}>
          Document import
        </Text>
        {phase === 'capture' ? (
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Flashlight"
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
        <View style={[styles.bottomBar, { paddingBottom: footerBottom }]}>
          <Text variant="caption" style={styles.hint}>
            {hint}
          </Text>
          <View style={styles.captureRow}>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Gallery"
              onPress={() => void handlePickGallery()}
              style={styles.sideBtn}
            >
              <ImagesIcon size={22} color="#fff" strokeWidth={1.8} />
            </Pressable>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Take photo"
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
          style={[styles.bottomBar, { paddingBottom: footerBottom, gap: 10 }]}
        >
          {queue.length > 1 ? (
            <Text variant="caption" style={styles.hint}>
              To send: {queue.length} photos
            </Text>
          ) : null}
          <Pressable
            accessibilityRole="button"
            onPress={handleRetake}
            style={[styles.secondaryButton, { borderColor: 'rgba(255,255,255,0.35)' }]}
          >
            <Text variant="body" style={{ color: '#fff', fontWeight: '600' }}>
              {queue.length > 1 ? 'Cancel' : 'Retake'}
            </Text>
          </Pressable>
          <Pressable
            accessibilityRole="button"
            disabled={busy}
            onPress={() => void handleSubmit()}
            style={[styles.primaryButton, { backgroundColor: colors.primary, opacity: busy ? 0.7 : 1 }]}
          >
            <Text variant="body" style={{ color: colors.primaryForeground, fontWeight: '700' }}>
              {queue.length > 1 ? `Send (${queue.length})` : 'Send'}
            </Text>
          </Pressable>
        </Animated.View>
      ) : null}

      {phase === 'uploading' ? (
        <ImportUploadingView
          progressLabel={uploadLabel}
          progress={uploadProgress}
        />
      ) : null}

      {phase === 'success' ? (
        <ImportSuccessView
          uploadedCount={uploadedCount}
          parseStatus={parseStatus}
          onDone={finishImport}
          onContinue={() => {
            setPhotoUri(null);
            setQueue([]);
            setPhase('capture');
          }}
          onRetryStatus={
            lastJobId
              ? () => {
                  void refreshParseStatus(lastJobId);
                }
              : undefined
          }
        />
      ) : null}
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
    zIndex: 5,
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
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(0,0,0,0.4)',
  },
  iconBtnPlaceholder: {
    width: 44,
    height: 44,
  },
  bottomBar: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    zIndex: 5,
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
    width: 52,
    height: 52,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(255,255,255,0.14)',
  },
  shutter: {
    width: 76,
    height: 76,
    borderRadius: 38,
    borderWidth: 3,
    borderColor: 'rgba(255,255,255,0.94)',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(0,0,0,0.32)',
  },
  shutterInner: {
    width: 58,
    height: 58,
    borderRadius: 29,
    backgroundColor: '#fff',
  },
  primaryButton: {
    width: '100%',
    minHeight: 54,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  secondaryButton: {
    width: '100%',
    minHeight: 50,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    backgroundColor: 'rgba(0,0,0,0.4)',
  },
});
