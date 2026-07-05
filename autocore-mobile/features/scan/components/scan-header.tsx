import { View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { ArrowLeftIcon, FlashlightIcon, SettingsIcon } from '@/assets/icons';
import { IconButton, PageHeader } from '@/components/ui';
import { useTheme } from '@/hooks';
import { haptics, rhythm } from '@/theme';

type ScanHeaderProps = {
  torchOn: boolean;
  onToggleTorch: () => void;
  onSettingsPress: () => void;
  orderContext?: boolean;
  orderLabel?: string;
  onBackPress?: () => void;
};

export function ScanHeader({
  torchOn,
  onToggleTorch,
  onSettingsPress,
  orderContext,
  orderLabel,
  onBackPress,
}: ScanHeaderProps) {
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();
  const orderTarget = orderLabel?.trim() || 'новый заказ-наряд';

  return (
    <>
      {orderContext && onBackPress ? (
        <View
          style={{
            position: 'absolute',
            top: insets.top + rhythm.headerTop,
            left: rhythm.pad,
            zIndex: 3,
            borderRadius: rhythm.radius,
            overflow: 'hidden',
            backgroundColor: 'rgba(0,0,0,0.28)',
          }}
        >
          <IconButton
            accessibilityLabel="Назад к наряду"
            variant="ghost"
            size="sm"
            onPress={() => {
              haptics.light();
              onBackPress();
            }}
          >
            <ArrowLeftIcon size="sm" color="#fff" strokeWidth={1.85} />
          </IconButton>
        </View>
      ) : null}

      <PageHeader
        title={orderContext ? 'Сканер запчасти' : 'Scan'}
        subtitle={
          orderContext ? `Добавление в ${orderTarget}` : 'Умная камера'
        }
        logo={orderContext ? null : undefined}
        inverted
        overlay
        align={orderContext ? 'start' : 'center'}
        trailing={
          <View style={{ alignItems: 'flex-end', gap: rhythm.micro }}>
            {!orderContext ? (
              <View
                style={{
                  borderRadius: rhythm.radius,
                  overflow: 'hidden',
                  backgroundColor: 'rgba(0,0,0,0.28)',
                }}
              >
                <IconButton
                  accessibilityLabel="Настройки"
                  variant="ghost"
                  size="sm"
                  onPress={() => {
                    haptics.light();
                    onSettingsPress();
                  }}
                >
                  <SettingsIcon size="sm" color="#fff" strokeWidth={1.75} />
                </IconButton>
              </View>
            ) : null}
            <View
              style={{
                borderRadius: rhythm.radius,
                overflow: 'hidden',
                backgroundColor: torchOn ? `${colors.primary}44` : 'rgba(0,0,0,0.28)',
              }}
            >
              <IconButton
                accessibilityLabel="Вспышка"
                variant="ghost"
                size="sm"
                onPress={() => {
                  haptics.selection();
                  onToggleTorch();
                }}
              >
                <FlashlightIcon
                  size="sm"
                  color={torchOn ? colors.primary : '#fff'}
                  strokeWidth={1.85}
                />
              </IconButton>
            </View>
          </View>
        }
      />
    </>
  );
}
