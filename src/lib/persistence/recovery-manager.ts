import type { DraftManager } from "./draft-manager";
import { diffSnapshots, type FieldDiff } from "./conflict-resolver";
import {
  parsePersistenceKey,
  type PersistenceDraftRecord,
  type PersistenceKey,
} from "./types";

export type RecoveryCandidate = {
  draft: PersistenceDraftRecord;
  key: PersistenceKey;
  diffs: FieldDiff[];
  hasServer: boolean;
};

export class RecoveryManager {
  constructor(private readonly drafts: DraftManager) {}

  async findCandidates(input: {
    companyId: string;
    kind?: string;
    /** Map of persistence key string → current server snapshot */
    serverSnapshots?: Map<string, unknown>;
  }): Promise<RecoveryCandidate[]> {
    const drafts = await this.drafts.list(input.companyId, input.kind);
    const candidates: RecoveryCandidate[] = [];

    for (const draft of drafts) {
      const key = parsePersistenceKey(draft.key) ?? {
        companyId: draft.companyId,
        kind: draft.kind,
        id: draft.id,
      };
      const server = input.serverSnapshots?.get(draft.key);
      const hasServer = server !== undefined;
      if (hasServer) {
        const diffs = diffSnapshots(draft.snapshot, server);
        if (diffs.length === 0) continue;
        candidates.push({ draft, key, diffs, hasServer: true });
      } else {
        candidates.push({ draft, key, diffs: [], hasServer: false });
      }
    }

    return candidates.sort((a, b) => b.draft.updatedAt - a.draft.updatedAt);
  }
}
