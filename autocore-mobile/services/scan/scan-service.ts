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

export class ScanService {
  private debounce = new ScanDebounce();
  private listeners = new Set<ScanServiceListener>();
  private commitTimer: ReturnType<typeof setTimeout> | null = null;
  private pendingCommitPayload: string | null = null;
  private snapshot: ScanServiceSnapshot = {
    phase: 'idle',
    context: { mode: 'standalone' },
    detection: null,
    outcome: null,
    sheetKind: null,
    activeResult: null,
    pendingPayload: null,
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
    if (!this.debounce.canTrack(detection.payload)) return;

    this.debounce.noteSeen(detection.payload);
    this.patch({
      phase: 'tracking',
      detection,
    });

    this.scheduleCommit(detection.payload);
  }

  private scheduleCommit(payload: string): void {
    if (this.pendingCommitPayload === payload && this.commitTimer) return;

    if (this.commitTimer) {
      clearTimeout(this.commitTimer);
      this.commitTimer = null;
    }

    this.pendingCommitPayload = payload;
    this.commitTimer = setTimeout(() => {
      this.commitTimer = null;
      this.pendingCommitPayload = null;
      if (this.snapshot.phase === 'paused' || this.snapshot.phase === 'resolving') return;
      if (this.snapshot.detection?.payload !== payload) return;
      void this.commitPayload(payload, 'camera').catch(() => undefined);
    }, 180);
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

    this.clearCommitTimer();
    this.debounce.markCommitted(payload);
    this.patch({
      phase: 'resolving',
      pendingPayload: payload,
    });

    try {
      const outcome = await resolveScanPayload(this.deps, {
        payload,
        source,
        canInventoryView: this.deps.canInventoryView(),
        allowMock: this.deps.allowMock(),
      });

      return this.applyOutcome(outcome, payload);
    } catch {
      this.patch({
        phase: 'idle',
        detection: null,
        outcome: null,
        sheetKind: null,
        activeResult: null,
        pendingPayload: null,
      });
      return null;
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
    this.debounce.reset();
    this.patch({
      phase: 'idle',
      detection: null,
      outcome: null,
      sheetKind: null,
      activeResult: null,
      pendingPayload: null,
    });
  }

  dismissSheet(): void {
    this.clearCommitTimer();
    this.debounce.fullReset();
    this.resume();
  }

  private patch(patch: Partial<ScanServiceSnapshot>): void {
    this.snapshot = { ...this.snapshot, ...patch };
    for (const listener of this.listeners) listener(this.snapshot);
  }
}

export type { ScanServiceDeps };
