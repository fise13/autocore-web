import { Children, type ReactNode } from 'react';
import { View } from 'react-native';

import { useTheme } from '@/hooks';
import { rhythm } from '@/theme';

import { Surface } from './surface';

type ListGroupProps = {
  children: ReactNode;
  /** Apply page horizontal inset */
  inset?: boolean;
};

/** Grouped list surface with hairline dividers between rows. */
export function ListGroup({ children, inset = true }: ListGroupProps) {
  const { colors } = useTheme();
  const items = Children.toArray(children).filter(Boolean);

  return (
    <Surface padded={false} inset={inset} style={{ overflow: 'hidden' }}>
      {items.map((child, index) => (
        <View key={index}>
          {child}
          {index < items.length - 1 ? (
            <View
              style={{
                height: rhythm.hairline,
                backgroundColor: colors.border,
                marginHorizontal: rhythm.cardPadX,
              }}
            />
          ) : null}
        </View>
      ))}
    </Surface>
  );
}
