import type { AiCallMetadata } from "./ai-port";
import type { Decision, SourceRef } from "./contracts";

/**
 * Why AutoCore decided what it decided.
 *
 * The question this answers is asked months later, by someone looking at a
 * record that is wrong: *why did the import think this row was a donor, and
 * why was this part attached to that car?* Without a trail the only honest
 * answer is a shrug, and an import nobody can explain is an import nobody
 * trusts.
 *
 * Every entry carries the source row, both forms of the value, the decision,
 * its confidence, and — when a model was involved — which model, running which
 * prompt version, at what time. A prompt change six months from now is then a
 * traceable difference rather than a mystery.
 *
 * Pure — the caller persists these.
 */

export type AuditStage =
  | "discovery"
  | "classification"
  | "normalization"
  | "resolution"
  | "relationship"
  | "plan";

export type AuditEntry = {
  stage: AuditStage;
  source?: SourceRef;
  /** Entity or relationship the decision was about. */
  subject: string;
  field?: string;
  rawValue?: string;
  normalizedValue?: string;
  decision: Decision;
  /** Present only when a model produced the decision. */
  ai?: AiCallMetadata;
};

export class ImportAuditTrail {
  private readonly entries: AuditEntry[] = [];

  record(entry: AuditEntry): void {
    this.entries.push(entry);
  }

  /** Everything recorded, in the order it happened. */
  all(): readonly AuditEntry[] {
    return this.entries;
  }

  /** The trail for one entity — what a person opens when they ask "why?". */
  forSubject(subject: string): AuditEntry[] {
    return this.entries.filter((entry) => entry.subject === subject);
  }

  get size(): number {
    return this.entries.length;
  }

  /** Only the decisions a model made, for reviewing a prompt's behaviour. */
  aiDecisions(): AuditEntry[] {
    return this.entries.filter((entry) => entry.ai != null);
  }
}
