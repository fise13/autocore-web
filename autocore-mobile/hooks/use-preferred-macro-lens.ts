import { useCallback, useEffect, useState, type RefObject } from 'react';
import type { CameraView } from 'expo-camera';

import { preferIphoneMacroLens } from '@/lib/scan/prefer-iphone-macro-lens';

type CameraWithLenses = CameraView & {
  getAvailableLenses?: () => Promise<string[]>;
};

/**
 * Picks the iPhone virtual multi-camera lens (Triple / Dual Wide) so the system
 * can auto-switch into macro for close-up barcodes and documents.
 */
export function usePreferredMacroLens(
  cameraRef: RefObject<CameraView | null>,
  active: boolean,
) {
  const [selectedLens, setSelectedLens] = useState<string | undefined>(undefined);

  const applyLenses = useCallback((lenses: readonly string[]) => {
    const preferred = preferIphoneMacroLens(lenses);
    setSelectedLens((current) => {
      if (!preferred) return current;
      return current === preferred ? current : preferred;
    });
  }, []);

  const onAvailableLensesChanged = useCallback(
    (event: { lenses: string[] }) => {
      applyLenses(event.lenses ?? []);
    },
    [applyLenses],
  );

  const refreshLenses = useCallback(() => {
    const camera = cameraRef.current as CameraWithLenses | null;
    if (!camera?.getAvailableLenses) return;
    void camera
      .getAvailableLenses()
      .then((lenses) => {
        if (Array.isArray(lenses)) applyLenses(lenses);
      })
      .catch(() => undefined);
  }, [applyLenses, cameraRef]);

  useEffect(() => {
    if (!active) {
      setSelectedLens(undefined);
    }
  }, [active]);

  return {
    selectedLens,
    onAvailableLensesChanged,
    refreshLenses,
  };
}
