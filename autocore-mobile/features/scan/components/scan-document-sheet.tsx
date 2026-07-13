import { forwardRef } from 'react';
import { Pressable, View } from 'react-native';
import { BottomSheetModal, BottomSheetScrollView } from '@gorhom/bottom-sheet';

import { Text } from '@/components/ui';
import { useModalBottomSheet, useTheme } from '@/hooks';
import { haptics, rhythm } from '@/theme';
import { formatPrice } from '@/features/search/lib/format';

import { documentClassLabel } from '../lib/classify-document';
import type { ParsedDocument } from '../lib/parse-document';

type ScanDocumentSheetProps = {
  document: ParsedDocument | null;
  onPrimary: () => void;
  onSearchVin?: () => void;
  onDismiss: () => void;
};

function Field({ label, value }: { label: string; value?: string | number | null }) {
  if (value == null || value === '') return null;
  return (
    <View style={{ gap: 2 }}>
      <Text variant="caption" color="muted">
        {label}
      </Text>
      <Text variant="body" style={{ fontSize: 14, fontWeight: '600' }}>
        {value}
      </Text>
    </View>
  );
}

function primaryLabel(doc: ParsedDocument): string {
  switch (doc.kind) {
    case 'invoice':
    case 'waybill':
      return 'Создать приход';
    case 'receipt':
      return 'Записать расход';
    case 'work-order':
      return 'Создать наряд';
    default:
      return doc.vin ? 'Создать наряд с VIN' : 'Открыть поиск';
  }
}

export const ScanDocumentSheet = forwardRef<BottomSheetModal, ScanDocumentSheetProps>(
  function ScanDocumentSheet({ document, onPrimary, onSearchVin, onDismiss }, ref) {
    const { colors } = useTheme();
    const sheet = useModalBottomSheet();
    const modalProps = {
      ...sheet.sheetLayout,
      index: 0 as const,
      snapPoints: sheet.documentSnapPoints,
      topInset: sheet.topInset,
      enablePanDownToClose: true,
      onDismiss,
      backdropComponent: sheet.renderBackdrop,
      backgroundStyle: sheet.backgroundStyle,
      handleIndicatorStyle: sheet.handleIndicatorStyle,
    };

    const confidenceLabel = document
      ? document.confidence === 'high'
        ? 'Проверено'
        : document.confidence === 'medium'
          ? 'Проверьте поля'
          : 'Низкая уверенность'
      : '';

    // Single modal instance — early-return trees remount the portal and can leave a stuck backdrop.
    return (
      <BottomSheetModal ref={ref} {...modalProps}>
        {!document ? (
          <BottomSheetScrollView contentContainerStyle={{ minHeight: 1 }}>
            <View />
          </BottomSheetScrollView>
        ) : (
          <BottomSheetScrollView contentContainerStyle={{ ...sheet.formContentStyle, gap: 14 }}>
            <View style={{ gap: 4 }}>
              <Text variant="heading" style={{ fontSize: 20, fontWeight: '700' }}>
                {documentClassLabel(document.kind)}
              </Text>
              <Text variant="caption" color="muted">
                {confidenceLabel}
                {document.totalsMatch === true ? ' · суммы сходятся' : null}
                {document.totalsMatch === false ? ' · проверьте суммы' : null}
              </Text>
            </View>

            <View style={{ gap: rhythm.stack }}>
              <Field label="Номер" value={document.number} />
              <Field label="Дата" value={document.date} />
              <Field label="Контрагент" value={document.merchant ?? document.clientName} />
              <Field label="ИНН / БИН" value={document.inn} />
              <Field label="Телефон" value={document.phone} />
              <Field label="Госномер" value={document.plate} />
              <Field label="VIN" value={document.vin} />
              <Field label="Итого" value={document.total != null ? formatPrice(document.total) : null} />
            </View>

            {document.lines.length > 0 ? (
              <View style={{ gap: 8 }}>
                <Text variant="caption" color="muted" style={{ fontWeight: '600' }}>
                  Позиции ({document.lines.length})
                </Text>
                {document.lines.slice(0, 8).map((line, index) => (
                  <View
                    key={`${line.name}-${index}`}
                    style={{
                      flexDirection: 'row',
                      justifyContent: 'space-between',
                      gap: 12,
                      paddingVertical: 6,
                      borderBottomWidth: index < Math.min(document.lines.length, 8) - 1 ? 1 : 0,
                      borderBottomColor: colors.border,
                    }}
                  >
                    <Text variant="body" style={{ flex: 1, fontSize: 13, fontWeight: '500' }}>
                      {line.name}
                    </Text>
                    <Text variant="caption" color="muted" style={{ fontVariant: ['tabular-nums'] }}>
                      {line.qty != null ? `${line.qty} × ` : ''}
                      {line.sum != null ? formatPrice(line.sum) : line.unitPrice != null ? formatPrice(line.unitPrice) : ''}
                    </Text>
                  </View>
                ))}
              </View>
            ) : null}

            <View style={{ gap: 8, marginTop: 4 }}>
              <Pressable
                accessibilityRole="button"
                onPress={() => {
                  haptics.light();
                  onPrimary();
                }}
                style={{
                  minHeight: 48,
                  borderRadius: 12,
                  alignItems: 'center',
                  justifyContent: 'center',
                  backgroundColor: colors.primary,
                }}
              >
                <Text variant="body" style={{ fontSize: 15, fontWeight: '700', color: colors.primaryForeground }}>
                  {primaryLabel(document)}
                </Text>
              </Pressable>

              {document.vin && onSearchVin ? (
                <Pressable
                  accessibilityRole="button"
                  onPress={() => {
                    haptics.light();
                    onSearchVin();
                  }}
                  style={{
                    minHeight: 44,
                    borderRadius: 12,
                    alignItems: 'center',
                    justifyContent: 'center',
                    backgroundColor: colors.secondary,
                    borderWidth: 1,
                    borderColor: colors.border,
                  }}
                >
                  <Text variant="body" style={{ fontSize: 14, fontWeight: '600' }}>
                    Найти авто по VIN
                  </Text>
                </Pressable>
              ) : null}
            </View>
          </BottomSheetScrollView>
        )}
      </BottomSheetModal>
    );
  },
);
