/**
 * Engines list lanes after intake moved into this catalog.
 *
 * Incoming is the former bay (photograph / review). Yard is the sellable
 * serialized catalog. All is Incoming pinned above Yard.
 *
 * Pure — no React Native.
 */

import type { EngineIntakeJobState } from '@autocore/engine-intake';

import type { MotorEntity, MotorStatus } from '../../../types/motor';

export const ENGINE_LIST_FILTERS = ['incoming', 'yard', 'all'] as const;

export type EngineListFilter = (typeof ENGINE_LIST_FILTERS)[number];

const INCOMING_JOB_STATES = new Set<EngineIntakeJobState>([
  'open',
  'in_session',
  'paused',
  'rework',
  'awaiting_verification',
  'quarantine',
]);

const INCOMING_MOTOR_STATUSES = new Set<MotorStatus>([
  'draft',
  'intake_in_progress',
  'awaiting_verification',
  'quarantine',
]);

export function parseEngineListFilter(
  value: string | string[] | undefined,
): EngineListFilter | null {
  const raw = Array.isArray(value) ? value[0] : value;
  if (raw === 'incoming' || raw === 'yard' || raw === 'all') return raw;
  // Legacy intake bay filters from widgets / deep links.
  if (raw === 'active' || raw === 'ready') return 'incoming';
  return null;
}

export function isIncomingJobState(state: string): boolean {
  return INCOMING_JOB_STATES.has(state as EngineIntakeJobState);
}

export function isIncomingMotor(motor: MotorEntity): boolean {
  if (motor.intakeStatus && isIncomingJobState(motor.intakeStatus)) return true;
  return INCOMING_MOTOR_STATUSES.has(motor.status ?? 'available');
}

export function motorStatusFromIntakeJob(state: EngineIntakeJobState): MotorStatus {
  switch (state) {
    case 'awaiting_verification':
      return 'awaiting_verification';
    case 'quarantine':
      return 'quarantine';
    case 'rejected':
      return 'rejected';
    case 'verified':
    case 'closed':
      return 'available';
    default:
      return 'intake_in_progress';
  }
}

/**
 * The lane control's options.
 *
 * Here rather than in the screen because both list renderers draw the control
 * themselves — the React Native `SegmentedControl` and a SwiftUI segmented
 * `Picker` — and the two must not drift apart.
 */
export const ENGINE_LANE_SEGMENTS: { value: string; label: string }[] = [
  { value: 'incoming', label: 'Incoming' },
  { value: 'yard', label: 'Yard' },
  { value: 'all', label: 'All' },
];
