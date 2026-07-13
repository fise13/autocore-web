type ScanDebounceOptions = {
  /** Minimum gap between accepted reads of the same payload after a successful commit. */
  samePayloadCooldownMs?: number;
  /** Global cooldown after any commit starts. */
  commitCooldownMs?: number;
  /** How long the same payload must be seen before committing. */
  stableMs?: number;
};

export type ScanCommitResult = 'success' | 'miss';

export class ScanDebounce {
  private lastPayload: string | null = null;
  private lastCommitAt = 0;
  private lastCommitSucceeded = false;
  private lastSeenPayload: string | null = null;
  private lastSeenAt = 0;

  constructor(private readonly options: ScanDebounceOptions = {}) {}

  private get samePayloadCooldownMs() {
    return this.options.samePayloadCooldownMs ?? 1200;
  }

  private get commitCooldownMs() {
    return this.options.commitCooldownMs ?? 0;
  }

  private get stableMs() {
    return this.options.stableMs ?? 0;
  }

  /** Visual tracking — allowed while camera is active. */
  canTrack(payload: string): boolean {
    const now = Date.now();
    if (now - this.lastCommitAt < this.commitCooldownMs) return false;
    if (
      this.lastCommitSucceeded &&
      this.lastPayload === payload &&
      this.lastCommitAt > 0 &&
      now - this.lastCommitAt < this.samePayloadCooldownMs
    ) {
      return false;
    }
    return true;
  }

  /** @deprecated Use timer-based commit in ScanService instead. */
  shouldCommit(payload: string): boolean {
    const now = Date.now();
    if (!this.canTrack(payload)) return false;
    if (this.lastSeenPayload !== payload) {
      this.lastSeenPayload = payload;
      this.lastSeenAt = now;
    }
    return now - this.lastSeenAt >= this.stableMs;
  }

  noteSeen(payload: string): void {
    const now = Date.now();
    if (this.lastSeenPayload !== payload) {
      this.lastSeenPayload = payload;
      this.lastSeenAt = now;
    }
  }

  markCommitted(payload: string): void {
    const now = Date.now();
    this.lastPayload = payload;
    this.lastCommitAt = now;
    this.lastSeenPayload = null;
    this.lastSeenAt = 0;
  }

  markCommitResult(result: ScanCommitResult): void {
    if (result === 'success') {
      this.lastCommitSucceeded = true;
      return;
    }
    this.lastPayload = null;
    this.lastCommitAt = 0;
    this.lastCommitSucceeded = false;
    this.reset();
  }

  reset(): void {
    this.lastSeenPayload = null;
    this.lastSeenAt = 0;
  }

  fullReset(): void {
    this.lastPayload = null;
    this.lastCommitAt = 0;
    this.lastCommitSucceeded = false;
    this.reset();
  }
}
