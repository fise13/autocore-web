import { memo, type ReactNode } from 'react';
import { View, Text, Pressable } from 'react-native';

import { workOsColors } from '../tokens/colors';
import { workOsType } from '../tokens/typography';
import { workOsSpace, workOsRadius } from '../tokens/space';

export type OpsTableColumn<T> = {
  id: string;
  title: string;
  flex?: number;
  render: (row: T) => ReactNode;
};

export type OpsTableProps<T extends { id: string }> = {
  columns: OpsTableColumn<T>[];
  rows: T[];
  onRowPress?: (row: T) => void;
  scheme?: 'light' | 'dark';
  emptyLabel?: string;
};

function OpsTableInner<T extends { id: string }>({
  columns,
  rows,
  onRowPress,
  scheme = 'light',
  emptyLabel = 'No rows',
}: OpsTableProps<T>) {
  const colors = workOsColors(scheme);
  if (rows.length === 0) {
    return (
      <View style={{ padding: workOsSpace.xl, alignItems: 'center' }}>
        <Text style={[workOsType.callout, { color: colors.inkMuted }]}>{emptyLabel}</Text>
      </View>
    );
  }
  return (
    <View style={{ borderRadius: workOsRadius.lg, borderWidth: 1, borderColor: colors.border, overflow: 'hidden', backgroundColor: colors.surface }}>
      <View style={{ flexDirection: 'row', backgroundColor: colors.tableHeader, paddingVertical: workOsSpace.sm, paddingHorizontal: workOsSpace.tableCellX, borderBottomWidth: 1, borderBottomColor: colors.border }}>
        {columns.map((col) => (
          <Text key={col.id} style={[workOsType.caption, { color: colors.inkMuted, flex: col.flex ?? 1 }]}>
            {col.title}
          </Text>
        ))}
      </View>
      {rows.map((row, index) => {
        const body = (
          <View
            key={row.id}
            style={{
              flexDirection: 'row',
              paddingVertical: workOsSpace.tableCellY,
              paddingHorizontal: workOsSpace.tableCellX,
              backgroundColor: index % 2 ? colors.tableRowAlt : colors.tableRow,
              borderBottomWidth: index === rows.length - 1 ? 0 : 1,
              borderBottomColor: colors.border,
              alignItems: 'center',
            }}
          >
            {columns.map((col) => (
              <View key={col.id} style={{ flex: col.flex ?? 1 }}>
                {col.render(row)}
              </View>
            ))}
          </View>
        );
        if (!onRowPress) return body;
        return (
          <Pressable key={row.id} onPress={() => onRowPress(row)}>
            {body}
          </Pressable>
        );
      })}
    </View>
  );
}

export const OpsTable = memo(OpsTableInner) as typeof OpsTableInner;
