import { memo, type ReactNode } from 'react';
import { View, Text, Pressable } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { workOsColors } from '../tokens/colors';
import { workOsType } from '../tokens/typography';
import { workOsSpace, workOsRadius } from '../tokens/space';

export type SheetScaffoldProps = {
  title: string;
  onClose?: () => void;
  children: ReactNode;
  footer?: ReactNode;
  scheme?: 'light' | 'dark';
};

export const SheetScaffold = memo(function SheetScaffold({
  title,
  onClose,
  children,
  footer,
  scheme = 'light',
}: SheetScaffoldProps) {
  const colors = workOsColors(scheme);
  const insets = useSafeAreaInsets();
  return (
    <View
      style={{
        flex: 1,
        backgroundColor: colors.canvas,
        borderTopLeftRadius: workOsRadius.xl,
        borderTopRightRadius: workOsRadius.xl,
        paddingBottom: Math.max(insets.bottom, workOsSpace.lg),
      }}
    >
      <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: workOsSpace.screenX, paddingTop: workOsSpace.lg, paddingBottom: workOsSpace.md }}>
        <Text style={[workOsType.headline, { color: colors.ink }]}>{title}</Text>
        {onClose ? (
          <Pressable onPress={onClose} hitSlop={8} accessibilityRole="button" accessibilityLabel="Close">
            <Text style={[workOsType.callout, { color: colors.accent }]}>Close</Text>
          </Pressable>
        ) : null}
      </View>
      <View style={{ flex: 1, paddingHorizontal: workOsSpace.screenX }}>{children}</View>
      {footer ? <View style={{ paddingHorizontal: workOsSpace.screenX, paddingTop: workOsSpace.md }}>{footer}</View> : null}
    </View>
  );
});
