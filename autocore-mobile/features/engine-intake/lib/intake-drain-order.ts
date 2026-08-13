/**
 * Drain order for the intake outbox.
 *
 * Finish (`field_complete`) used to sit in the same command list as create /
 * pause and ran *before* photo PUTs. The server then rejected Finish with
 * "needs at least one photo", the wave aborted, and the photos never left
 * the phone — the engine stayed in Active forever.
 *
 * Pure — no React Native — so the node test runner can load it.
 */

export type DrainWorkKind = 'command' | 'photo';

export type DrainWorkItem = {
  kind: DrainWorkKind;
  createdAt: string;
  jobId?: string;
  commandType?: string;
};

const SETUP_SKIP = new Set(['heartbeat_session', 'field_complete']);

export function orderIntakeDrainWork<T extends DrainWorkItem>(items: T[]): T[] {
  const completingJobs = new Set(
    items
      .filter((item) => item.kind === 'command' && item.commandType === 'field_complete')
      .map((item) => item.jobId)
      .filter((jobId): jobId is string => Boolean(jobId)),
  );
  const jobsWithPhotos = new Set(
    items
      .filter((item) => item.kind === 'photo' && item.jobId)
      .map((item) => item.jobId as string),
  );

  const byTime = (left: T, right: T) => left.createdAt.localeCompare(right.createdAt);

  const heartbeats = items
    .filter((item) => item.kind === 'command' && item.commandType === 'heartbeat_session')
    .sort(byTime);
  const setup = items
    .filter((item) => {
      if (item.kind !== 'command') return false;
      if (SETUP_SKIP.has(item.commandType ?? '')) return false;
      if (
        item.commandType === 'pause_session' &&
        item.jobId &&
        (completingJobs.has(item.jobId) || jobsWithPhotos.has(item.jobId))
      ) {
        return false;
      }
      return true;
    })
    .sort(byTime);
  const photos = items.filter((item) => item.kind === 'photo').sort(byTime);
  const complete = items
    .filter((item) => item.kind === 'command' && item.commandType === 'field_complete')
    .sort(byTime);

  return [...heartbeats, ...setup, ...photos, ...complete];
}

/** A retryable Finish/pause must not abort the photo wave. */
export function commandFailureAbortsDrainWave(commandType: string): boolean {
  return commandType !== 'field_complete' && commandType !== 'pause_session' && commandType !== 'heartbeat_session';
}
