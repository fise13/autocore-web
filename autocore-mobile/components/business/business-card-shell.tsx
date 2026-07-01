import { View, type ViewProps } from 'react-native';

import { useDesignLanguage } from '@/hooks';
import { Text } from '@/components/ui/text';

type BusinessCardShellProps = ViewProps & {
  title?: string;
  subtitle?: string;
  headerRight?: React.ReactNode;
  footer?: React.ReactNode;
  elevated?: boolean;
};

/** Shared shell for all business cards — mirrors .mc-list-row / .mc-action-tile */
export function BusinessCardShell({
  title,
  subtitle,
  headerRight,
  footer,
  elevated = false,
  children,
  style,
  ...props
}: BusinessCardShellProps) {
  const dl = useDesignLanguage();

  return (
    <View
      style={[
        elevated ? dl.styles.createSurfaceCardStyle({ scheme: dl.scheme, colors: dl.colors }) : dl.styles.createListRowStyle({ scheme: dl.scheme, colors: dl.colors }),
        { gap: dl.layout.stackGap },
        style,
      ]}
      {...props}
    >
      {(title || headerRight) && (
        <View style={{ flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'space-between', gap: dl.layout.inlineGap }}>
          <View style={{ flex: 1, gap: dl.layout.inlineGap / 2 }}>
            {title ? <Text variant="heading">{title}</Text> : null}
            {subtitle ? <Text variant="caption" color="muted">{subtitle}</Text> : null}
          </View>
          {headerRight}
        </View>
      )}
      {children}
      {footer ? <View style={{ marginTop: dl.layout.inlineGap }}>{footer}</View> : null}
    </View>
  );
}
