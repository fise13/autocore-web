import { forwardRef } from 'react';
import { View } from 'react-native';
import { BottomSheetModal, BottomSheetView } from '@gorhom/bottom-sheet';

import { useModalBottomSheet } from '@/hooks';

import { scanSheetAnimationConfigs } from '../animation/scan-sheet-motion';
import { isHttpUrl } from '../lib/classify-payload';
import { scanLayout } from '../layout';
import {
  ScanSheetHairline,
  ScanSheetHeader,
  ScanSheetPrimaryButton,
  ScanSheetRow,
} from './scan-sheet-chrome';

type ScanNotFoundSheetProps = {
  payload: string | null;
  isAiLoading?: boolean;
  orderContext?: boolean;
  onCreateItem: () => void;
  onAddAsSpecific: () => void;
  onTryAi?: () => void;
  onOpenUrl?: () => void;
  onCancel: () => void;
  onDismiss: () => void;
};

export const ScanNotFoundSheet = forwardRef<BottomSheetModal, ScanNotFoundSheetProps>(
  function ScanNotFoundSheet(
    {
      payload,
      isAiLoading,
      orderContext,
      onCreateItem,
      onAddAsSpecific,
      onTryAi,
      onOpenUrl,
      onCancel,
      onDismiss,
    },
    ref,
  ) {
    const sheet = useModalBottomSheet();
    const isUrl = isHttpUrl(payload);
    const modalProps = {
      ...sheet.sheetLayout,
      index: 0 as const,
      snapPoints: sheet.compactSnapPoints(orderContext ? 42 : 46),
      enablePanDownToClose: true,
      onDismiss,
      backdropComponent: sheet.renderBackdrop,
      backgroundStyle: sheet.backgroundStyle,
      handleIndicatorStyle: sheet.handleIndicatorStyle,
      animationConfigs: scanSheetAnimationConfigs,
    };
    let host = payload ?? '';
    if (payload && isUrl) {
      try {
        host = new URL(payload).host;
      } catch {
        host = payload;
      }
    }

    return (
      <BottomSheetModal ref={ref} {...modalProps}>
        {!payload ? (
          <BottomSheetView style={{ minHeight: 1 }}>
            <View />
          </BottomSheetView>
        ) : (
          <BottomSheetView
            style={{
              ...sheet.compactContentStyle,
              paddingHorizontal: scanLayout.sheetPadX,
              gap: 8,
            }}
          >
            <ScanSheetHeader
              title={isUrl ? 'External link' : 'Not found'}
              meta={isUrl ? host : payload}
            />

            <View style={{ height: 8 }} />

            {isUrl && onOpenUrl ? (
              <ScanSheetPrimaryButton label="Open link" onPress={onOpenUrl} />
            ) : null}

            {!isUrl ? (
              <>
                <ScanSheetPrimaryButton
                  label={orderContext ? 'Create item' : 'Create item'}
                  onPress={onCreateItem}
                />
                <ScanSheetHairline />
                <ScanSheetRow
                  label={orderContext ? 'Add as custom part' : 'Match as part'}
                  onPress={onAddAsSpecific}
                />
                {!orderContext && onTryAi ? (
                  <>
                    <ScanSheetHairline />
                    <ScanSheetRow
                      label={isAiLoading ? 'Searching…' : 'Refine with AI'}
                      onPress={onTryAi}
                    />
                  </>
                ) : null}
              </>
            ) : null}

            <ScanSheetHairline />
            <ScanSheetRow label="Cancel" onPress={onCancel} />
          </BottomSheetView>
        )}
      </BottomSheetModal>
    );
  },
);
