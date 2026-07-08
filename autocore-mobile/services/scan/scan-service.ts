import { ScanDebounce } from './scan-debounce';
import {
  disambiguateScanPayload,
  pickScanCandidate,
  resolveScanPayload,
  resolveScanPhoto,
  type ScanServiceDeps,
} from './scan-resolver';
import type {
  ScanContext,
  ScanDetection,
  ScanOutcome,
  ScanPhase,
  ScanResolveRequest,
  ScanServiceListener,
  ScanServiceSnapshot,
  ScanSheetKind,
  ScanSource,
} from './types';

function sheetKindForOutcome(outcome: ScanOutcome | null): ScanSheetKind {
  if (!outcome) return null;
  switch (outcome.kind) {
    case 'product':
      return 'product';
    case 'candidates':
      return 'candidates';
    case 'not-found':
    case 'foreign-url':
      return 'not-found';
    case 'document':
      return 'document';
    default:
      return null;
  }
}

function activeResultForOutcome(outcome: ScanOutcome | null) {
  if (!outcome) return null;
  if (outcome.kind === 'product' || outcome.kind === 'candidates') return outcome.result;
  return null;
}

function isInstantOutcome(outcome: ScanOutcome): boolean {
  return (
    outcome.kind === 'navigate-entity' ||
    outcome.kind === 'navigate-vin' ||
    outcome.kind === 'foreign-url'
  );
}

function dedupeDetections(detections: ScanDetection[]): ScanDetection[] {
  const seen = new Set<string>();
  const unique: ScanDetection[] = [];
  for (const detection of detections) {
    const payload = detection.payload.trim();
    if (!payload || seen.has(payload)) continue;
    seen.add(payload);
    unique.push({ ...detection, payload });
  }
  return unique;
}

export class ScanService {
  private debounce = new ScanDebounce();
  private listeners = new Set<ScanServiceListener>();
  private commitTimer: ReturnType<typeof setTimeout> | null = null;
  private pendingCommitPayload: string | null = null;
  private stablePayload: string | null = null;
  private snapshot: ScanServiceSnapshot = {
    phase: 'idle',
    context: { mode: 'standalone' },
    detection: null,
    outcome: null,
    sheetKind: null,
    activeResult: null,
    pendingPayload: null,
    pendingDetections: null,
  };

  constructor(private readonly deps: ScanServiceDeps) {}

  subscribe(listener: ScanServiceListener): () => void {
    this.listeners.add(listener);
    listener(this.snapshot);
    return () => this.listeners.delete(listener);
  }

  getState(): ScanServiceSnapshot {
    return this.snapshot;
  }

  setContext(context: ScanContext): void {
    this.patch({ context });
  }

  onDetection(detection: ScanDetection): void {
    if (
      this.snapshot.phase === 'paused' ||
      this.snapshot.phase === 'resolving' ||
      this.snapshot.phase === 'confirmed'
    ) {
      return;
    }

    const payload = detection.payload.trim();
    if (!payload) return;
    if (!this.debounce.canTrack(payload)) return;

    this.stablePayload = payload;
    this.debounce.noteSeen(payload);
    this.patch({
      phase: 'tracking',
      detection: { ...detection, payload },
      pendingDetections: null,
    });

    // Commit on first valid read — no second-frame wait / timer lag.
    void this.commitPayload(payload, 'camera').catch(() => undefined);
  }

  onDetections(detections: ScanDetection[]): void {
    if (
      this.snapshot.phase === 'paused' ||
      this.snapshot.phase === 'resolving' ||
      this.snapshot.phase === 'confirmed'
    ) {
      return;
    }
    if (!this.debounce.canTrack('multi-code')) return;

    const unique = dedupeDetections(detections);
    if (unique.length === 0) return;

    if (unique.length === 1) {
      this.onDetection(unique[0]!);
      return;
    }

    this.clearCommitTimer();
    this.resetStableReads();
    this.patch({
      phase: 'confirmed',
      detection: unique[0] ?? null,
      outcome: null,
      sheetKind: 'code-picker',
      activeResult: null,
      pendingPayload: null,
      pendingDetections: unique,
    });
  }

  pickDetectedCode(payload: string): void {
    const detection =
      this.snapshot.pendingDetections?.find((entry) => entry.payload === payload) ?? null;
    this.patch({
      pendingDetections: null,
      sheetKind: null,
      detection,
    });
    void this.commitPayload(payload, 'camera').catch(() => undefined);
  }

  private resetStableReads(): void {
    this.stablePayload = null;
  }

  private clearCommitTimer(): void {
    if (this.commitTimer) {
      clearTimeout(this.commitTimer);
      this.commitTimer = null;
    }
    this.pendingCommitPayload = null;
  }

  async commitPayload(payload: string, source: ScanSource = 'camera'): Promise<ScanOutcome | null> {
    if (this.snapshot.phase === 'resolving' || this.snapshot.phase === 'paused') return null;

    const normalizedPayload = payload.trim();
    if (!normalizedPayload) return null;

    this.clearCommitTimer();
    this.debounce.markCommitted(normalizedPayload);
    this.patch({
      phase: 'resolving',
      pendingPayload: normalizedPayload,
    });

    try {
      const outcome = await resolveScanPayload(this.deps, {
        payload: normalizedPayload,
        source,
        canInventoryView: this.deps.canInventoryView(),
        allowMock: this.deps.allowMock(),
      });

      return this.applyOutcome(outcome, normalizedPayload);
    } catch (error) {
      console.warn('Scan resolve failed:', error);
      return this.applyOutcome({ kind: 'not-found', payload: normalizedPayload }, normalizedPayload);
    }
  }

  async pickCandidate(barcode: string, itemId: string, score: number): Promise<ScanOutcome | null> {
    const outcome = await pickScanCandidate(this.deps, { barcode, itemId, score });
    if (!outcome) return null;
    return this.applyOutcome(outcome, barcode);
  }

  async disambiguate(barcode: string): Promise<ScanOutcome | null> {
    const outcome = await disambiguateScanPayload(this.deps, barcode);
    return this.applyOutcome(outcome, barcode);
  }

  async resolvePhoto(uri: string, preferDocument: boolean): Promise<ScanOutcome | 'retry' | null> {
    if (this.snapshot.phase === 'resolving') return null;
    this.patch({ phase: 'resolving' });

    const outcome = await resolveScanPhoto(this.deps, uri, preferDocument, {
      canInventoryView: this.deps.canInventoryView(),
      allowMock: this.deps.allowMock(),
    });

    if (outcome === 'retry') {
      this.resume();
      return outcome;
    }

    return this.applyOutcome(outcome, this.snapshot.pendingPayload ?? uri);
  }

  private applyOutcome(outcome: ScanOutcome, payload: string): ScanOutcome {
    if (isInstantOutcome(outcome)) {
      this.patch({
        phase: 'paused',
        outcome,
        pendingPayload: payload,
      });
      return outcome;
    }

    const sheetKind = sheetKindForOutcome(outcome);
    this.patch({
      phase: sheetKind ? 'confirmed' : 'paused',
      outcome,
      sheetKind,
      activeResult: activeResultForOutcome(outcome),
      pendingPayload: payload,
    });
    return outcome;
  }

  pause(): void {
    this.patch({ phase: 'paused' });
  }

  resume(): void {
    this.clearCommitTimer();
    this.resetStableReads();
    this.debounce.reset();
    this.patch({
      phase: 'idle',
      detection: null,
      outcome: null,
      sheetKind: null,
      activeResult: null,
      pendingPayload: null,
      pendingDetections: null,
    });
  }

  dismissSheet(): void {
    this.clearCommitTimer();
    this.resetStableReads();
    this.debounce.fullReset();
    this.resume();
  }

  private patch(patch: Partial<ScanServiceSnapshot>): void {
    this.snapshot = { ...this.snapshot, ...patch };
    for (const listener of this.listeners) listener(this.snapshot);
  }
}

export type { ScanServiceDeps };
