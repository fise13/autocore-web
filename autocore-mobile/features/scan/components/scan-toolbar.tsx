import { Pressable, View } from 'react-native';

import { ClockIcon, FileTextIcon, ImagesIcon, SearchIcon } from '@/assets/icons';
import { Text } from '@/components/ui';
import { haptics } from '@/theme';

import { scanLayout } from '../layout';
import { useScanChromeColors } from '../lib/scan-chrome-colors';

type ScanToolbarProps = {
  onPhotos: () => void;
  onSearch: () => void;
  onRecents: () => void;
  onImportDocument?: () => void;
  compact?: boolean;
};

function Tool({
  label,
  accessibilityLabel,
  onPress,
  children,
}: {
  label: string;
  accessibilityLabel: string;
  onPress: () => void;
  children: React.ReactNode;
}) {
  const chrome = useScanChromeColors();

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel}
      onPress={() => {
        haptics.light();
        onPress();
      }}
      style={{
        alignItems: 'center',
        justifyContent: 'center',
        gap: 6,
        minWidth: 64,
        paddingVertical: 4,
      }}
    >
      <View
        style={{
          width: 44,
          height: 44,
          borderRadius: 999,
          alignItems: 'center',
          justifyContent: 'center',
          backgroundColor: chrome.toolWell,
        }}
      >
        {children}
      </View>
      <Text
        variant="caption"
        style={{
          color: chrome.toolLabel,
          fontSize: 11,
          fontWeight: '500',
        }}
      >
        {label}
      </Text>
    </Pressable>
  );
}

/** Action row under the mode control — theme surfaces. */
export function ScanToolbar({
  onPhotos,
  onSearch,
  onRecents,
  onImportDocument,
  compact = false,
}: ScanToolbarProps) {
  const chrome = useScanChromeColors();

  return (
    <View
      style={{
        flexDirection: 'row',
        alignItems: 'flex-start',
        justifyContent: 'center',
        gap: scanLayout.toolbarGap,
        paddingTop: 4,
      }}
    >
      <Tool label="Photos" accessibilityLabel="Open photo" onPress={onPhotos}>
        <ImagesIcon size="sm" color={chrome.toolIcon} strokeWidth={1.75} />
      </Tool>
      <Tool label="Search" accessibilityLabel="Manual search" onPress={onSearch}>
        <SearchIcon size="sm" color={chrome.toolIcon} strokeWidth={1.75} />
      </Tool>
      <Tool label="Recents" accessibilityLabel="Recent scans" onPress={onRecents}>
        <ClockIcon size="sm" color={chrome.toolIcon} strokeWidth={1.75} />
      </Tool>
      {!compact && onImportDocument ? (
        <Tool label="Import" accessibilityLabel="Import document" onPress={onImportDocument}>
          <FileTextIcon size="sm" color={chrome.toolIcon} strokeWidth={1.75} />
        </Tool>
      ) : null}
    </View>
  );
}
