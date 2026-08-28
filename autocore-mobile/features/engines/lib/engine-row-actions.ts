/**
 * What holding an engine row offers, independent of who draws the menu.
 *
 * There are two renderers — the React Native lift menu on Android, and the real
 * UIKit context menu on iOS — and before this each built its own item list from
 * its own copy of the permission checks. That is how the same engine came to
 * offer different actions depending on the platform, and how a capability added
 * in one place quietly went missing in the other.
 *
 * The list is decided here, once. The renderers only turn it into buttons.
 *
 * Pure — no React Native, no SF Symbol import at runtime — so the node test
 * runner can load it.
 */

import type { MotorEntity } from '../../../types/motor';

import { isIncomingMotor } from './engine-lane';

export type EngineRowActionId =
  | 'open'
  | 'copySerial'
  | 'photograph'
  | 'accept'
  | 'edit'
  | 'relocate'
  | 'addToOrder'
  | 'sell'
  | 'cancel';

export type EngineRowAction = {
  id: EngineRowActionId;
  label: string;
  /** SF Symbol name; typed loosely here so this file stays dependency-free. */
  systemImage: string;
  destructive?: boolean;
};

export type EngineRowCapabilities = {
  incoming: boolean;
  /** Ready for review and this person may review it. */
  canAccept: boolean;
  canContinue: boolean;
  canEditIncoming: boolean;
  canCancelIncoming: boolean;
  canRelocate: boolean;
  canAddToOrder: boolean;
  canSell: boolean;
};

/**
 * Ordered exactly as the menu reads top to bottom.
 *
 * `open` leads because it is what a plain tap does — a context menu whose first
 * item is not the default action makes people hesitate. `cancel` is last and
 * destructive, which is where iOS renders it in red and away from the thumb.
 */
export function engineRowActions(caps: EngineRowCapabilities): EngineRowAction[] {
  const actions: EngineRowAction[] = [
    {
      id: 'open',
      label: caps.incoming && caps.canAccept ? 'Review' : 'Open',
      systemImage: 'arrow.up.right.square',
    },
    { id: 'copySerial', label: 'Copy serial', systemImage: 'doc.on.doc' },
  ];

  if (caps.incoming && caps.canContinue) {
    actions.push({ id: 'photograph', label: 'Photograph', systemImage: 'camera.fill' });
  }
  if (caps.incoming && caps.canAccept) {
    actions.push({ id: 'accept', label: 'Accept', systemImage: 'checkmark.seal.fill' });
  }
  if (caps.incoming && caps.canEditIncoming) {
    actions.push({ id: 'edit', label: 'Edit', systemImage: 'pencil' });
  }
  if (caps.canRelocate) {
    actions.push({ id: 'relocate', label: 'Relocate', systemImage: 'mappin.and.ellipse' });
  }
  if (caps.canAddToOrder) {
    actions.push({ id: 'addToOrder', label: 'Add to order', systemImage: 'plus.circle' });
  }
  if (caps.canSell) {
    actions.push({ id: 'sell', label: 'Sell', systemImage: 'dollarsign.circle' });
  }
  if (caps.incoming && caps.canCancelIncoming) {
    actions.push({
      id: 'cancel',
      label: 'Cancel engine',
      systemImage: 'trash',
      destructive: true,
    });
  }

  return actions;
}

/**
 * The one action a swipe should perform, or null.
 *
 * A swipe is a shortcut for the thing someone does over and over, not a second
 * copy of the menu: an incoming engine gets photographed again, a yard engine
 * gets put on a shelf. Anything rarer stays behind the hold.
 */
export function engineRowSwipeAction(caps: EngineRowCapabilities): EngineRowAction | null {
  const actions = engineRowActions(caps);
  const preferred: EngineRowActionId = caps.incoming ? 'photograph' : 'relocate';
  return actions.find((action) => action.id === preferred) ?? null;
}

/**
 * Which of those a given engine offers this person.
 *
 * Kept here rather than in a row component so the two renderers cannot drift:
 * both ask this, neither re-derives it. The permission flags arrive already
 * resolved because RBAC lives in a React hook and this file must stay pure.
 */
export function engineRowCapabilities(
  motor: MotorEntity,
  permissions: {
    canInventoryEdit: boolean;
    canWorkOrdersEdit: boolean;
    canAccountingEdit: boolean;
    canIntakeExecute: boolean;
    canIntakeVerify: boolean;
    /** Whether the screen wired up the intake handlers at all. */
    hasIncomingHandlers: boolean;
  },
): EngineRowCapabilities {
  const incoming = isIncomingMotor(motor);
  const sold = Boolean(motor.soldDate) || motor.status === 'sold';
  const intake = permissions.hasIncomingHandlers;

  return {
    incoming,
    canAccept:
      intake && permissions.canIntakeVerify && motor.status === 'awaiting_verification',
    canContinue: intake && permissions.canIntakeExecute,
    canEditIncoming: intake && permissions.canIntakeExecute && incoming,
    canCancelIncoming: intake && permissions.canIntakeExecute && incoming,
    canRelocate: permissions.canInventoryEdit && !sold && !incoming,
    canAddToOrder: permissions.canWorkOrdersEdit && !sold && !incoming,
    canSell:
      permissions.canAccountingEdit && !sold && !incoming && motor.status !== 'installed',
  };
}
