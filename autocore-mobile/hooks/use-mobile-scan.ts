import { useMutation } from '@tanstack/react-query';

import { createLocalFileFormData } from '@/lib/network/mobile-form-data';
import { mobileApi } from '@/services/api/endpoints';
import { mobilePost, mobileUpload } from '@/services/api/mobile-client';
import type { MobileScanResolveResult, ScanOcrResolveResponse } from '@/types/inventory';

export type ScanResolveInput = {
  barcode: string;
  source?: 'camera' | 'manual' | 'photo' | 'ocr';
  disambiguate?: boolean;
};

export function useMobileScanResolve() {
  return useMutation({
    mutationFn: async (input: string | ScanResolveInput) => {
      const payload = typeof input === 'string' ? { barcode: input, source: 'camera' as const } : input;
      return mobilePost<MobileScanResolveResult>(mobileApi.scanResolve, payload);
    },
  });
}

export function useMobileScanDisambiguate() {
  return useMutation({
    mutationFn: async (barcode: string) => {
      return mobilePost<MobileScanResolveResult>(mobileApi.scanDisambiguate, { barcode });
    },
  });
}

export function useMobileScanOcr() {
  return useMutation({
    mutationFn: async (uri: string) => {
      return mobileUpload<ScanOcrResolveResponse>(
        mobileApi.scanOcr,
        createLocalFileFormData('image', uri),
      );
    },
  });
}

export function useMobileScanFeedback() {
  return useMutation({
    mutationFn: async (input: {
      barcode: string;
      itemId?: string;
      outcome: 'user_picked_candidate' | 'user_rejected' | 'created_mapping';
      confidence?: number;
    }) => mobilePost<{ ok: boolean; result?: MobileScanResolveResult }>(mobileApi.scanFeedback, input),
  });
}
