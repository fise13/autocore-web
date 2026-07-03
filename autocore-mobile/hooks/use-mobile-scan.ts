import { useMutation } from '@tanstack/react-query';

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
      const formData = new FormData();
      const filename = uri.split('/').pop() ?? 'scan.jpg';
      const extension = filename.split('.').pop()?.toLowerCase();
      const mimeType =
        extension === 'png' ? 'image/png' : extension === 'webp' ? 'image/webp' : 'image/jpeg';
      formData.append('image', {
        uri,
        name: filename,
        type: mimeType,
      } as unknown as Blob);
      return mobileUpload<ScanOcrResolveResponse>(mobileApi.scanOcr, formData);
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
