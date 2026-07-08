import type { BarcodeBounds, BarcodePoint } from 'expo-camera';

import type { ScanCandidate, ScanResult } from '@/features/scan/types';
import type { ParsedDocument } from '@/features/scan/lib/parse-document';
import type { ScanEntityLinkKind } from '@/features/scan/lib/classify-payload';

export type ScanSource = 'camera' | 'manual' | 'photo' | 'ocr';

export type ScanInputKind =
  | 'barcode'
  | 'qr'
  | 'vin'
  | 'entity-link'
  | 'url'
  | 'ocr'
  | 'document'
  | 'unknown';

export type ScanContext =
  | { mode: 'standalone' }
  | { mode: 'order'; orderId?: string; orderLabel?: string };

export type ScanPhase = 'idle' | 'tracking' | 'resolving' | 'confirmed' | 'paused';

export type ScanDetection = {
  payload: string;
  symbology: string;
  bounds: BarcodeBounds;
  cornerPoints: BarcodePoint[];
};

export type ScanSheetKind = 'product' | 'candidates' | 'not-found' | 'document' | 'code-picker' | null;

export type ScanOutcome =
  | { kind: 'navigate-entity'; entity: ScanEntityLinkKind; id: string; payload: string }
  | { kind: 'navigate-vin'; vin: string; payload: string }
  | { kind: 'foreign-url'; url: string }
  | { kind: 'product'; result: ScanResult; payload: string }
  | {
      kind: 'candidates';
      payload: string;
      result: ScanResult;
    }
  | { kind: 'not-found'; payload: string }
  | { kind: 'document'; document: ParsedDocument; payload: string };

export type ScanResolveRequest = {
  payload: string;
  source: ScanSource;
  canInventoryView: boolean;
  allowMock: boolean;
};

export type ScanServiceSnapshot = {
  phase: ScanPhase;
  context: ScanContext;
  detection: ScanDetection | null;
  outcome: ScanOutcome | null;
  sheetKind: ScanSheetKind;
  activeResult: ScanResult | null;
  pendingPayload: string | null;
  pendingDetections: ScanDetection[] | null;
};

export type ScanServiceListener = (snapshot: ScanServiceSnapshot) => void;

export type ScanOrderResult =
  | { type: 'added'; itemId: string }
  | { type: 'adhoc'; barcode: string; name?: string }
  | { type: 'create-item'; barcode: string }
  | { type: 'cancelled' };

export type { ScanCandidate, ScanResult };
