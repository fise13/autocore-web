import { useCallback, useEffect, useState, type RefObject } from 'react';
import type { CameraView } from 'expo-camera';

import { preferIphoneMacroLens } from '@/lib/scan/prefer-iphone-macro-lens';

type CameraWithLenses = CameraView & {
  getAvailableLenses?: () => Promise<string[]>;
};

/** Survives tab unmount so the next Scan open doesn't wait on lens discovery. */
let cachedPreferredLens: string | undefined;

/**
 * Picks the iPhone virtual multi-camera lens (Triple / Dual Wide) so the system
 * can auto-switch into macro for close-up barcodes and documents.
 *
 * Lens preference is cached across tab leaves — clearing it forced a cold
 * `selectedLens` apply on every Scan open and stuttered the preview.
 */
export function usePreferredMacroLens(
  cameraRef: RefObject<CameraView | null>,
  mounted: boolean,
) {
  const [selectedLens, setSelectedLens] = useState<string | undefined>(
    () => cachedPreferredLens,
  );

  const applyLenses = useCallback((lenses: readonly string[]) => {
    const preferred = preferIphoneMacroLens(lenses);
    if (!preferred) return;
    cachedPreferredLens = preferred;
    setSelectedLens((current) => (current === preferred ? current : preferred));
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
    if (!mounted) return;
    if (cachedPreferredLens) {
      setSelectedLens((current) =>
        current === cachedPreferredLens ? current : cachedPreferredLens,
      );
    }
  }, [mounted]);

  return {
    selectedLens,
    onAvailableLensesChanged,
    refreshLenses,
  };
}
