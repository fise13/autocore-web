import { Pressable, View } from 'react-native';
import { BlurView } from 'expo-blur';
import Animated from 'react-native-reanimated';
import { Platform } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { ClockIcon, FileTextIcon, ImagesIcon, SearchIcon } from '@/assets/icons';
import { Text } from '@/components/ui';
import { useTheme } from '@/hooks';
import { haptics } from '@/theme';

import { useScanEnter } from '../animation/use-scan-enter';
import { scanTimeline } from '../animation/scan-timeline';
import { scanLayout } from '../layout';

type ScanGlassPanelProps = {
  onManualSearch: () => void;
  onOpenPhotos: () => void;
  onImportDocument: () => void;
  onRecentScans: () => void;
};

function PanelItem({
  icon: Icon,
  label,
  onPress,
}: {
  icon: typeof SearchIcon;
  label: string;
  onPress: () => void;
}) {
  const { colors } = useTheme();

  return (
    <Pressable
      accessibilityRole="button"
      onPress={() => {
        haptics.light();
        onPress();
      }}
      style={{
        flexDirection: 'row',
        alignItems: 'center',
        gap: 10,
        minHeight: scanLayout.panelItemHeight,
        paddingHorizontal: 14,
      }}
    >
      <Icon size="sm" color={colors.primary} strokeWidth={1.9} />
      <Text variant="body" style={{ fontSize: 14, fontWeight: '600', color: colors.foreground }}>
        {label}
      </Text>
    </Pressable>
  );
}

export function ScanGlassPanel({
  onManualSearch,
  onOpenPhotos,
  onImportDocument,
  onRecentScans,
}: ScanGlassPanelProps) {
  const { colors, isDark } = useTheme();
  const insets = useSafeAreaInsets();
  const enterStyle = useScanEnter({ delay: scanTimeline.panel, translateY: 24, duration: 360 });

  const content = (
    <View style={{ gap: 2, paddingVertical: 6 }}>
      <PanelItem icon={SearchIcon} label="Поиск вручную" onPress={onManualSearch} />
      <View style={{ height: 1, backgroundColor: colors.border, marginHorizontal: 14, opacity: 0.5 }} />
      <PanelItem icon={ImagesIcon} label="Открыть фото" onPress={onOpenPhotos} />
      <View style={{ height: 1, backgroundColor: colors.border, marginHorizontal: 14, opacity: 0.5 }} />
      <PanelItem icon={FileTextIcon} label="Import" onPress={onImportDocument} />
      <View style={{ height: 1, backgroundColor: colors.border, marginHorizontal: 14, opacity: 0.5 }} />
      <PanelItem icon={ClockIcon} label="Недавние сканы" onPress={onRecentScans} />
    </View>
  );

  return (
    <Animated.View
      style={[
        {
          position: 'absolute',
          left: scanLayout.pad,
          right: scanLayout.pad,
          bottom: Math.max(insets.bottom, 8) + 76,
        },
        enterStyle,
      ]}
    >
      <View
        style={{
          borderRadius: scanLayout.panelRadius,
          overflow: 'hidden',
          borderWidth: 1,
          borderColor: `${colors.border}88`,
        }}
      >
        {Platform.OS === 'ios' ? (
          <BlurView intensity={isDark ? 34 : 48} tint={isDark ? 'dark' : 'light'} style={{ backgroundColor: `${colors.card}CC` }}>
            {content}
          </BlurView>
        ) : (
          <View style={{ backgroundColor: `${colors.card}F0` }}>{content}</View>
        )}
      </View>
    </Animated.View>
  );
}
