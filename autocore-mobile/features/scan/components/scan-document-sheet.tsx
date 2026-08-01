import { forwardRef } from 'react';
import { View } from 'react-native';
import { BottomSheetModal, BottomSheetScrollView } from '@gorhom/bottom-sheet';

import { Text } from '@/components/ui';
import { useModalBottomSheet } from '@/hooks';
import { formatPrice } from '@/features/search/lib/format';

import { documentClassLabel } from '../lib/classify-document';
import type { ParsedDocument } from '../lib/parse-document';
import { scanLayout } from '../layout';
import {
  ScanSheetHairline,
  ScanSheetHeader,
  ScanSheetMetaRow,
  ScanSheetPrimaryButton,
  ScanSheetRow,
} from './scan-sheet-chrome';

type ScanDocumentSheetProps = {
  document: ParsedDocument | null;
  onPrimary: () => void;
  onSearchVin?: () => void;
  onDismiss: () => void;
};

function primaryLabel(doc: ParsedDocument): string {
  switch (doc.kind) {
    case 'invoice':
    case 'waybill':
      return 'Create receiving';
    case 'receipt':
      return 'Log expense';
    case 'work-order':
      return 'Create work order';
    default:
      return doc.vin ? 'Create work order with VIN' : 'Open search';
  }
}

export const ScanDocumentSheet = forwardRef<BottomSheetModal, ScanDocumentSheetProps>(
  function ScanDocumentSheet({ document, onPrimary, onSearchVin, onDismiss }, ref) {
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
        ? 'Verified'
        : document.confidence === 'medium'
          ? 'Check the fields'
          : 'Low confidence'
      : '';

    return (
      <BottomSheetModal ref={ref} {...modalProps}>
        {!document ? (
          <BottomSheetScrollView contentContainerStyle={{ minHeight: 1 }}>
            <View />
          </BottomSheetScrollView>
        ) : (
          <BottomSheetScrollView
            contentContainerStyle={{
              ...sheet.formContentStyle,
              paddingHorizontal: scanLayout.sheetPadX,
              gap: 12,
            }}
          >
            <ScanSheetHeader
              title={documentClassLabel(document.kind)}
              meta={[
                confidenceLabel,
                document.totalsMatch === true ? 'totals match' : null,
                document.totalsMatch === false ? 'check totals' : null,
              ]
                .filter(Boolean)
                .join(' · ')}
            />

            <View>
              {document.number ? <ScanSheetMetaRow label="Number" value={document.number} /> : null}
              {document.date ? (
                <>
                  <ScanSheetHairline />
                  <ScanSheetMetaRow label="Date" value={document.date} />
                </>
              ) : null}
              {(document.merchant ?? document.clientName) ? (
                <>
                  <ScanSheetHairline />
                  <ScanSheetMetaRow
                    label="Counterparty"
                    value={String(document.merchant ?? document.clientName)}
                  />
                </>
              ) : null}
              {document.vin ? (
                <>
                  <ScanSheetHairline />
                  <ScanSheetMetaRow label="VIN" value={document.vin} />
                </>
              ) : null}
              {document.total != null ? (
                <>
                  <ScanSheetHairline />
                  <ScanSheetMetaRow label="Total" value={formatPrice(document.total)} />
                </>
              ) : null}
            </View>

            {document.lines.length > 0 ? (
              <View style={{ gap: 0 }}>
                <Text variant="caption" color="muted" style={{ fontWeight: '600', marginBottom: 4 }}>
                  Items · {document.lines.length}
                </Text>
                {document.lines.slice(0, 8).map((line, index) => (
                  <View key={`${line.name}-${index}`}>
                    <View
                      style={{
                        flexDirection: 'row',
                        justifyContent: 'space-between',
                        gap: 12,
                        paddingVertical: 10,
                      }}
                    >
                      <Text variant="body" style={{ flex: 1, fontSize: 15, fontWeight: '500' }}>
                        {line.name}
                      </Text>
                      <Text
                        variant="caption"
                        color="muted"
                        style={{ fontVariant: ['tabular-nums'], fontSize: 13 }}
                      >
                        {line.qty != null ? `${line.qty} × ` : ''}
                        {line.sum != null
                          ? formatPrice(line.sum)
                          : line.unitPrice != null
                            ? formatPrice(line.unitPrice)
                            : ''}
                      </Text>
                    </View>
                    {index < Math.min(document.lines.length, 8) - 1 ? <ScanSheetHairline /> : null}
                  </View>
                ))}
              </View>
            ) : null}

            <View style={{ gap: 4, marginTop: 4 }}>
              <ScanSheetPrimaryButton label={primaryLabel(document)} onPress={onPrimary} />
              {document.vin && onSearchVin ? (
                <>
                  <ScanSheetHairline />
                  <ScanSheetRow label="Find vehicle by VIN" onPress={onSearchVin} />
                </>
              ) : null}
            </View>
          </BottomSheetScrollView>
        )}
      </BottomSheetModal>
    );
  },
);
