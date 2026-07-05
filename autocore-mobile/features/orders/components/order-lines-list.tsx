import { View } from 'react-native';

import { Text } from '@/components/ui';
import { useTheme } from '@/hooks';
import { formatPrice } from '@/features/search/lib/format';

import { ordersLayout } from '../layout';

type OrderLine = {
  id: string;
  label: string;
  detail?: string;
  price: number;
};

type OrderLinesListProps = {
  laborLines?: OrderLine[];
  partLines?: OrderLine[];
  catalogLines?: OrderLine[];
  motorLines?: OrderLine[];
  compact?: boolean;
};

function LineRow({ label, detail, price, compact }: OrderLine & { compact?: boolean }) {
  const { colors } = useTheme();

  return (
    <View
      style={{
        flexDirection: 'row',
        alignItems: 'flex-start',
        justifyContent: 'space-between',
        gap: 12,
        paddingVertical: compact ? 6 : 8,
      }}
    >
      <View style={{ flex: 1, gap: 2 }}>
        <Text variant="body" style={{ fontSize: compact ? 13 : 14, fontWeight: '500' }}>
          {label}
        </Text>
        {detail ? (
          <Text variant="caption" color="muted">
            {detail}
          </Text>
        ) : null}
      </View>
      <Text variant="body" style={{ fontSize: compact ? 13 : 14, fontWeight: '600', fontVariant: ['tabular-nums'] }}>
        {formatPrice(price)}
      </Text>
    </View>
  );
}

function Section({ title, lines, compact }: { title: string; lines: OrderLine[]; compact?: boolean }) {
  const { colors } = useTheme();
  if (lines.length === 0) return null;

  return (
    <View style={{ gap: 4 }}>
      <Text variant="sectionLabel" color="muted" style={{ fontSize: 11, fontWeight: '600' }}>
        {title}
      </Text>
      <View
        style={{
          borderRadius: ordersLayout.radius,
          borderWidth: ordersLayout.hairline,
          borderColor: colors.border,
          backgroundColor: colors.card,
          paddingHorizontal: 12,
          paddingVertical: 4,
        }}
      >
        {lines.map((line, index) => (
          <View key={line.id}>
            <LineRow {...line} compact={compact} />
            {index < lines.length - 1 ? (
              <View style={{ height: ordersLayout.hairline, backgroundColor: colors.border }} />
            ) : null}
          </View>
        ))}
      </View>
    </View>
  );
}

export function OrderLinesList({
  laborLines = [],
  partLines = [],
  catalogLines = [],
  motorLines = [],
  compact,
}: OrderLinesListProps) {
  const total = [...laborLines, ...partLines, ...catalogLines, ...motorLines].reduce(
    (sum, line) => sum + line.price,
    0,
  );
  const empty = laborLines.length + partLines.length + catalogLines.length + motorLines.length === 0;

  if (empty) {
    return (
      <Text variant="caption" color="muted" style={{ lineHeight: 18 }}>
        Позиции не добавлены. Используйте сканер или поиск.
      </Text>
    );
  }

  return (
    <View style={{ gap: 12 }}>
      <Section title="Работы" lines={laborLines} compact={compact} />
      <Section title="Запчасти" lines={partLines} compact={compact} />
      <Section title="Каталог" lines={catalogLines} compact={compact} />
      <Section title="Двигатели" lines={motorLines} compact={compact} />
      {!compact ? (
        <View style={{ flexDirection: 'row', justifyContent: 'space-between', paddingTop: 4 }}>
          <Text variant="body" style={{ fontWeight: '600' }}>
            Итого по позициям
          </Text>
          <Text variant="body" style={{ fontWeight: '700', fontVariant: ['tabular-nums'] }}>
            {formatPrice(total)}
          </Text>
        </View>
      ) : null}
    </View>
  );
}
