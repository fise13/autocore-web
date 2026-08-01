import {
  BottomSheetModal,
  BottomSheetScrollView,
} from '@gorhom/bottom-sheet';
import { forwardRef, useCallback, useImperativeHandle, useRef, useState } from 'react';
import { View } from 'react-native';
import { format } from 'date-fns';
import { enUS } from 'date-fns/locale';

import { FileStackIcon, PrinterIcon, Share2Icon } from '@/assets/icons';
import { ActionIconButton, Button, Text } from '@/components/ui';
import { useModalBottomSheet, useTheme } from '@/hooks';
import {
  motorSaleDetail,
  motorSaleMotorId,
} from '@/lib/accounting/motor-sale';
import {
  printWarrantyDocument,
  shareWarrantyDocument,
} from '@/lib/documents/document-file-actions';
import { enqueueMotorSoldEffects, fetchMotorWarrantyId } from '@/services/api/motors';
import { haptics } from '@/theme';
import { toneBackground } from '@/theme/color-utils';
import type { FinancialOperation } from '@/types/financial-operation';

import { formatKzt } from '../utils/format';
import { ac } from '../layout';
import { formatTimestamp } from '@/lib/firestore-timestamp';

export type AcMotorSaleDocumentsSheetRef = {
  present: (operation: FinancialOperation) => void;
  dismiss: () => void;
};

type AcMotorSaleDocumentsSheetProps = {
  onDeleted?: () => void;
};

type DocAction = 'warranty-share' | 'warranty-print' | 'invoice-share' | 'invoice-print';

function parseClientNameFromComment(comment?: string | null): string | undefined {
  if (!comment?.trim()) return undefined;
  const parts = comment.split('·').map((part) => part.trim()).filter(Boolean);
  if (parts.length >= 3 && parts[0].toLowerCase().includes('sale')) {
    return parts[parts.length - 1];
  }
  return undefined;
}

export const AcMotorSaleDocumentsSheet = forwardRef<
  AcMotorSaleDocumentsSheetRef,
  AcMotorSaleDocumentsSheetProps
>(function AcMotorSaleDocumentsSheet(_props, ref) {
  const { colors } = useTheme();
  const sheet = useModalBottomSheet();
  const sheetRef = useRef<BottomSheetModal>(null);

  const [operation, setOperation] = useState<FinancialOperation | null>(null);
  const [warrantyId, setWarrantyId] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [busy, setBusy] = useState<DocAction | null>(null);
  const [error, setError] = useState<string | null>(null);

  const prepareDocuments = useCallback(async (next: FinancialOperation) => {
    const motorId = motorSaleMotorId(next);
    if (!motorId) {
      setError('Could not determine the motor for this sale.');
      setWarrantyId(null);
      return;
    }

    setLoading(true);
    setError(null);

    try {
      let nextWarrantyId = next.relatedWarrantyId ?? (await fetchMotorWarrantyId(motorId));

      if (!nextWarrantyId) {
        const effects = await enqueueMotorSoldEffects(motorId, {
          serialCode: next.description?.split(' ').pop() ?? motorId,
          amount: next.amount,
          account: next.account,
          paymentMethod: next.paymentMethod,
          comment: next.comment ?? next.description ?? 'Motor sale',
          clientId: next.relatedClientId ?? undefined,
          clientName: parseClientNameFromComment(next.comment),
        });
        nextWarrantyId = effects.warrantyId ?? null;
        if (!effects.ok && effects.error) {
          setError(effects.error);
        }
      }

      if (!nextWarrantyId) {
        setError((current) => current ?? 'Could not prepare the sale documents.');
      }
      setWarrantyId(nextWarrantyId);
    } catch (nextError) {
      setError(nextError instanceof Error ? nextError.message : 'Could not prepare the documents');
      setWarrantyId(null);
    } finally {
      setLoading(false);
    }
  }, []);

  useImperativeHandle(ref, () => ({
    present: (next) => {
      setOperation(next);
      setWarrantyId(next.relatedWarrantyId ?? null);
      setError(null);
      sheetRef.current?.present();
      void prepareDocuments(next);
    },
    dismiss: () => sheetRef.current?.dismiss(),
  }));

  const renderBackdrop = sheet.renderBackdrop;

  const runAction = async (action: DocAction) => {
    if (!warrantyId || !operation) return;
    const serial = motorSaleDetail(operation);
    setBusy(action);
    setError(null);
    haptics.light();

    try {
      const slug = action.startsWith('warranty') ? 'engine-warranty' : 'invoice';
      if (action.endsWith('share')) {
        await shareWarrantyDocument(slug, warrantyId, serial);
      } else {
        await printWarrantyDocument(slug, warrantyId, serial);
      }
      haptics.success();
    } catch (nextError) {
      haptics.warning();
      setError(nextError instanceof Error ? nextError.message : 'Could not open the PDF');
    } finally {
      setBusy(null);
    }
  };

  const detail = operation ? motorSaleDetail(operation) : '';

  return (
    <BottomSheetModal
      ref={sheetRef}
      {...sheet.sheetLayout}
      index={0}
      snapPoints={sheet.formSnapPoints}
      topInset={sheet.topInset}
      enablePanDownToClose
      backdropComponent={renderBackdrop}
      backgroundStyle={sheet.backgroundStyle}
      handleIndicatorStyle={sheet.handleIndicatorStyle}
    >
      <BottomSheetScrollView contentContainerStyle={sheet.formContentStyle}>
        <View style={{ gap: 4 }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
            <FileStackIcon size="sm" color={colors.primary} strokeWidth={1.85} />
            <Text variant="heading" style={{ fontSize: 18, fontWeight: '700' }}>
              Sale documents
            </Text>
          </View>
          {operation ? (
            <Text variant="caption" color="muted" style={{ fontSize: 13, lineHeight: 18 }}>
              {detail}
              {' · '}
              {formatKzt(operation.amount)}
              {' · '}
              {formatTimestamp(operation.createdAt, 'd MMM yyyy, HH:mm')}
            </Text>
          ) : null}
        </View>

        {loading ? (
          <View
            style={{
              padding: 14,
              borderRadius: ac.radius,
              borderWidth: ac.hairline,
              borderColor: colors.borderMuted,
              backgroundColor: toneBackground(colors.primary, 0.06),
            }}
          >
            <Text variant="caption" color="muted">
              Preparing warranty and invoice…
            </Text>
          </View>
        ) : null}

        {error ? (
          <View
            style={{
              padding: 14,
              borderRadius: ac.radius,
              borderWidth: ac.hairline,
              borderColor: colors.border,
              backgroundColor: toneBackground(colors.destructive, 0.08),
              gap: 10,
            }}
          >
            <Text variant="caption" color="destructive">
              {error}
            </Text>
            {operation ? (
              <Button
                variant="outline"
                size="sm"
                onPress={() => void prepareDocuments(operation)}
              >
                Retry
              </Button>
            ) : null}
          </View>
        ) : null}

        {warrantyId && !loading && !error ? (
          <View
            style={{
              padding: 12,
              borderRadius: ac.radius,
              borderWidth: ac.hairline,
              borderColor: colors.borderMuted,
              backgroundColor: toneBackground(colors.success, 0.08),
            }}
          >
            <Text variant="caption" style={{ color: colors.success, fontWeight: '600' }}>
              Documents are ready to print and share
            </Text>
          </View>
        ) : null}

        <DocGroup
          title="Warranty"
          shareAction="warranty-share"
          printAction="warranty-print"
          busy={busy}
          disabled={!warrantyId || loading}
          onAction={(id) => void runAction(id)}
        />

        <DocGroup
          title="Invoice"
          shareAction="invoice-share"
          printAction="invoice-print"
          busy={busy}
          disabled={!warrantyId || loading}
          onAction={(id) => void runAction(id)}
        />
      </BottomSheetScrollView>
    </BottomSheetModal>
  );
});

function DocGroup({
  title,
  shareAction,
  printAction,
  busy,
  disabled,
  onAction,
}: {
  title: string;
  shareAction: DocAction;
  printAction: DocAction;
  busy: DocAction | null;
  disabled: boolean;
  onAction: (id: DocAction) => void;
}) {
  return (
    <View
      style={{
        flexDirection: 'row',
        alignItems: 'center',
        gap: 12,
        paddingVertical: 10,
        paddingHorizontal: 2,
      }}
    >
      <Text variant="body" style={{ flex: 1, fontSize: 14, fontWeight: '600' }}>
        {title}
      </Text>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 2 }}>
        <ActionIconButton
          icon={Share2Icon}
          accessibilityLabel={`Share: ${title}`}
          loading={busy === shareAction}
          disabled={disabled || (busy !== null && busy !== shareAction)}
          onPress={() => onAction(shareAction)}
        />
        <ActionIconButton
          icon={PrinterIcon}
          accessibilityLabel={`Print: ${title}`}
          loading={busy === printAction}
          disabled={disabled || (busy !== null && busy !== printAction)}
          onPress={() => onAction(printAction)}
        />
      </View>
    </View>
  );
}
