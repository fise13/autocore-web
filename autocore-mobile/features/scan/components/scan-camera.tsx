import { useEffect, useRef, useState } from 'react';
import { Linking, Pressable, StyleSheet, View } from 'react-native';
import { CameraView, useCameraPermissions, type BarcodeScanningResult } from 'expo-camera';
import Animated from 'react-native-reanimated';

import { Text } from '@/components/ui';
import { useTheme } from '@/hooks';
import { useScanEnter } from '../animation/use-scan-enter';
import { scanTimeline } from '../animation/scan-timeline';
import { scanLayout } from '../layout';

type ScanCameraProps = {
  torch: boolean;
  active: boolean;
  onBarcode: (payload: string) => void;
};

export function ScanCamera({ torch, active, onBarcode }: ScanCameraProps) {
  const { colors } = useTheme();
  const [permission, requestPermission] = useCameraPermissions();
  const enterStyle = useScanEnter({ delay: scanTimeline.camera, scaleFrom: 0.98, duration: 380 });
  const lastScanRef = useRef<string | null>(null);
  const lastScanAtRef = useRef(0);

  useEffect(() => {
    if (!permission?.granted && permission?.canAskAgain) {
      void requestPermission();
    }
  }, [permission, requestPermission]);

  const handleBarcode = (result: BarcodeScanningResult) => {
    if (!active) return;
    const now = Date.now();
    const payload = result.data?.trim();
    if (!payload) return;
    if (lastScanRef.current === payload && now - lastScanAtRef.current < 2200) return;
    lastScanRef.current = payload;
    lastScanAtRef.current = now;
    onBarcode(payload);
  };

  if (!permission) {
    return <View style={[styles.fill, { backgroundColor: '#0d0f14' }]} />;
  }

  if (!permission.granted) {
    return (
      <View style={[styles.fill, styles.permission, { backgroundColor: '#0d0f14' }]}>
        <Text variant="body" style={{ color: '#f5f5f7', fontWeight: '600', marginBottom: 8 }}>
          Камера
        </Text>
        <Text variant="caption" style={{ color: '#9ca3af', textAlign: 'center', marginBottom: 16 }}>
          Нужен доступ к камере для сканирования.
        </Text>
        {permission.canAskAgain ? (
          <Pressable
            accessibilityRole="button"
            onPress={() => void requestPermission()}
            style={{
              paddingHorizontal: 18,
              paddingVertical: 10,
              borderRadius: 12,
              backgroundColor: colors.primary,
            }}
          >
            <Text variant="caption" style={{ color: colors.primaryForeground, fontWeight: '600' }}>
              Разрешить
            </Text>
          </Pressable>
        ) : (
          <Pressable accessibilityRole="button" onPress={() => void Linking.openSettings()}>
            <Text variant="caption" style={{ color: colors.primary, fontWeight: '600' }}>
              Открыть настройки
            </Text>
          </Pressable>
        )}
      </View>
    );
  }

  return (
    <Animated.View style={[styles.fill, enterStyle]}>
      <CameraView
        style={styles.fill}
        facing="back"
        enableTorch={torch}
        barcodeScannerSettings={{
          barcodeTypes: ['qr', 'ean13', 'ean8', 'code128', 'code39', 'datamatrix', 'pdf417'],
        }}
        onBarcodeScanned={active ? handleBarcode : undefined}
      />
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  fill: {
    flex: 1,
  },
  permission: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: scanLayout.pad,
  },
});
