import { useCallback, useRef, useState } from 'react';
import {
  Pressable,
  ScrollView,
  TextInput,
  View,
  type TextInput as TextInputType,
} from 'react-native';

import { Text, toast } from '@/components/ui';
import { useTheme } from '@/hooks';
import { motorRepository } from '@/services/firestore/motor-repository';
import { haptics, radius, spacing, tokens } from '@/theme';
import type { MotorEntity } from '@/types/motor';

type DraftRow = {
  key: string;
  serial: string;
  brand: string;
  code: string;
  shelf: string;
  busy: boolean;
};

type EngineExcelAddGridProps = {
  uid: string;
  companyId: string;
  motors: MotorEntity[];
};

const COL = { serial: 132, brand: 120, code: 108, shelf: 112 } as const;
const ROW_H = 36;
const EMPTY_ROWS = 3;

function blankRow(): DraftRow {
  return {
    key: `draft-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    serial: '',
    brand: '',
    code: '',
    shelf: '',
    busy: false,
  };
}

function seedRows(): DraftRow[] {
  return Array.from({ length: EMPTY_ROWS }, () => blankRow());
}

/**
 * Spreadsheet pad for new serialized engines. A filled serial commits to the
 * same Firestore path the web excel grid uses, so the row appears there too.
 */
export function EngineExcelAddGrid({ uid, companyId, motors }: EngineExcelAddGridProps) {
  const { colors } = useTheme();
  const motorsRef = useRef(motors);
  motorsRef.current = motors;
  const [rows, setRows] = useState<DraftRow[]>(seedRows);
  const rowsRef = useRef(rows);
  rowsRef.current = rows;
  const serialRefs = useRef<Record<string, TextInputType | null>>({});

  const hairline = tokens.control.hairline;
  const line = colors.border;

  const patch = useCallback((key: string, next: Partial<DraftRow>) => {
    setRows((current) => current.map((row) => (row.key === key ? { ...row, ...next } : row)));
  }, []);

  const commit = useCallback(
    async (key: string) => {
      const row = rowsRef.current.find((item) => item.key === key);
      if (!row || row.busy) return;
      const serial = row.serial.trim();
      if (!serial) return;

      patch(key, { busy: true });
      try {
        await motorRepository.create(
          uid,
          {
            companyId,
            serialCode: serial,
            brandName: row.brand,
            engineCode: row.code,
            warehouseLocation: row.shelf,
          },
          motorsRef.current,
        );
        haptics.success();
        setRows((current) => {
          const cleared = current.map((item) =>
            item.key === key ? { ...blankRow(), key: item.key } : item,
          );
          const filled = cleared.filter((item) => item.serial.trim()).length;
          if (filled >= cleared.length) return [...cleared, blankRow()];
          return cleared;
        });
      } catch (error) {
        patch(key, { busy: false });
        toast({
          title: 'Could not add engine',
          description: error instanceof Error ? error.message : 'Try again',
          variant: 'destructive',
        });
      }
    },
    [companyId, patch, uid],
  );

  const addRow = useCallback(() => {
    haptics.light();
    const next = blankRow();
    setRows((current) => [...current, next]);
    requestAnimationFrame(() => serialRefs.current[next.key]?.focus());
  }, []);

  const cell = (opts: {
    value: string;
    placeholder: string;
    width: number;
    last?: boolean;
    autoCapitalize?: 'none' | 'characters';
    onChange: (value: string) => void;
    onSubmit: () => void;
    inputRef?: (node: TextInputType | null) => void;
    returnKeyType?: 'next' | 'done';
  }) => (
    <TextInput
      ref={opts.inputRef}
      value={opts.value}
      onChangeText={opts.onChange}
      placeholder={opts.placeholder}
      placeholderTextColor={colors.mutedForeground}
      autoCapitalize={opts.autoCapitalize ?? 'characters'}
      autoCorrect={false}
      returnKeyType={opts.returnKeyType ?? 'next'}
      onSubmitEditing={opts.onSubmit}
      onBlur={opts.last ? opts.onSubmit : undefined}
      style={{
        width: opts.width,
        height: ROW_H,
        paddingHorizontal: spacing[2],
        fontSize: 13,
        fontWeight: '500',
        color: colors.foreground,
        borderRightWidth: opts.last ? 0 : hairline,
        borderRightColor: line,
      }}
    />
  );

  const headerCell = (label: string, width: number, last?: boolean) => (
    <View
      style={{
        width,
        height: 28,
        justifyContent: 'center',
        paddingHorizontal: spacing[2],
        borderRightWidth: last ? 0 : hairline,
        borderRightColor: line,
      }}
    >
      <Text variant="caption" color="muted" style={{ fontWeight: '600', letterSpacing: 0.3 }}>
        {label}
      </Text>
    </View>
  );

  return (
    <View style={{ paddingHorizontal: spacing[5], paddingTop: spacing[3], gap: spacing[2] }}>
      <Text variant="subheadline" style={{ fontWeight: '600', color: colors.foreground }}>
        Add to spreadsheet
      </Text>
      <ScrollView
        horizontal
        keyboardShouldPersistTaps="handled"
        showsHorizontalScrollIndicator={false}
        style={{
          borderWidth: hairline,
          borderColor: line,
          borderRadius: radius.md,
          backgroundColor: colors.card,
        }}
      >
        <View>
          <View
            style={{
              flexDirection: 'row',
              borderBottomWidth: hairline,
              borderBottomColor: line,
              backgroundColor: colors.muted,
            }}
          >
            {headerCell('Serial', COL.serial)}
            {headerCell('Brand', COL.brand)}
            {headerCell('Code', COL.code)}
            {headerCell('Shelf', COL.shelf, true)}
          </View>
          {rows.map((row, index) => (
            <View
              key={row.key}
              style={{
                flexDirection: 'row',
                borderBottomWidth: index === rows.length - 1 ? 0 : hairline,
                borderBottomColor: line,
                opacity: row.busy ? 0.55 : 1,
              }}
              pointerEvents={row.busy ? 'none' : 'auto'}
            >
              {cell({
                value: row.serial,
                placeholder: 'Serial',
                width: COL.serial,
                autoCapitalize: 'characters',
                onChange: (serial) => patch(row.key, { serial }),
                onSubmit: () => undefined,
                inputRef: (node) => {
                  serialRefs.current[row.key] = node;
                },
                returnKeyType: 'next',
              })}
              {cell({
                value: row.brand,
                placeholder: 'Brand',
                width: COL.brand,
                autoCapitalize: 'none',
                onChange: (brand) => patch(row.key, { brand }),
                onSubmit: () => undefined,
              })}
              {cell({
                value: row.code,
                placeholder: 'Code',
                width: COL.code,
                autoCapitalize: 'characters',
                onChange: (code) => patch(row.key, { code }),
                onSubmit: () => undefined,
              })}
              {cell({
                value: row.shelf,
                placeholder: 'Shelf',
                width: COL.shelf,
                last: true,
                autoCapitalize: 'characters',
                onChange: (shelf) => patch(row.key, { shelf }),
                onSubmit: () => void commit(row.key),
                returnKeyType: 'done',
              })}
            </View>
          ))}
        </View>
      </ScrollView>
      <Pressable
        onPress={addRow}
        accessibilityRole="button"
        accessibilityLabel="Add spreadsheet row"
        hitSlop={8}
        style={{ minHeight: 36, justifyContent: 'center' }}
      >
        <Text variant="footnote" style={{ color: colors.primary, fontWeight: '600' }}>
          Add row
        </Text>
      </Pressable>
    </View>
  );
}
