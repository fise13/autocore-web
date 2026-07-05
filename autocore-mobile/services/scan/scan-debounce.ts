type ScanDebounceOptions = {
  /** Minimum gap between accepted reads of the same payload after a commit. */
  samePayloadCooldownMs?: number;
  /** Global cooldown after any successful commit. */
  commitCooldownMs?: number;
  /** How long the same payload must be seen before committing. */
  stableMs?: number;
};

export class ScanDebounce {
  private lastPayload: string | null = null;
  private lastCommitAt = 0;
  private lastSeenPayload: string | null = null;
  private lastSeenAt = 0;

  constructor(private readonly options: ScanDebounceOptions = {}) {}

  private get samePayloadCooldownMs() {
    return this.options.samePayloadCooldownMs ?? 2800;
  }

  private get commitCooldownMs() {
    return this.options.commitCooldownMs ?? 400;
  }

  private get stableMs() {
    return this.options.stableMs ?? 160;
  }

  /** Visual tracking — always allowed while camera is active. */
  canTrack(payload: string): boolean {
    const now = Date.now();
    if (now - this.lastCommitAt < this.commitCooldownMs) return false;
    if (
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

  reset(): void {
    this.lastSeenPayload = null;
    this.lastSeenAt = 0;
  }

  fullReset(): void {
    this.lastPayload = null;
    this.lastCommitAt = 0;
    this.reset();
  }
}
