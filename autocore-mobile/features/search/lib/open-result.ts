import { ActionSheetIOS, Alert, Platform } from 'react-native';
import type { Href } from 'expo-router';

import { toast } from '@/components/ui';
import type { WorkOrderMotorOutcome } from '@/types/work-order';
import { openPhone } from '@/utils/open-phone';

import type { SearchResultItem } from '../types';

type SearchRouter = {
  push: (href: Href) => void;
};

export type AddToOrderHandlers = {
  addPart: (itemId: string) => void;
  addMotor: (motorId: string, outcome?: WorkOrderMotorOutcome) => void;
};

export type MotorActionHandlers = {
  onSell: (motorId: string) => void;
  addToOrder: (motorId: string) => void;
};

function showPartActions(
  item: SearchResultItem,
  router: SearchRouter,
  addToOrder: AddToOrderHandlers,
): void {
  const options = ['Add to work order', 'Show stock', 'Cancel'];
  const addIndex = 0;
  const showIndex = 1;
  const cancelIndex = 2;

  const onSelect = (index: number) => {
    if (index === addIndex) {
      addToOrder.addPart(item.id);
      return;
    }
    if (index === showIndex) {
      router.push(`/warehouse?q=${encodeURIComponent(item.title)}` as Href);
    }
  };

  if (Platform.OS === 'ios') {
    ActionSheetIOS.showActionSheetWithOptions(
      { options, cancelButtonIndex: cancelIndex, title: item.title },
      onSelect,
    );
    return;
  }

  Alert.alert(item.title, item.subtitle, [
    { text: 'Add to work order', onPress: () => onSelect(addIndex) },
    { text: 'Show stock', onPress: () => onSelect(showIndex) },
    { text: 'Cancel', style: 'cancel' },
  ]);
}

function motorActionTitle(item: SearchResultItem): string {
  return item.serialCode?.trim() || item.subtitle?.trim() || item.title;
}

function motorActionMessage(item: SearchResultItem): string | undefined {
  const parts = [item.title, item.meta].filter(Boolean);
  const message = parts.join(' · ');
  const title = motorActionTitle(item);
  if (!message || message === title) return undefined;
  return message;
}

function showMotorActions(item: SearchResultItem, handlers: MotorActionHandlers): void {
  const options = ['Sell', 'Add to work order', 'Cancel'];
  const sellIndex = 0;
  const orderIndex = 1;
  const cancelIndex = 2;
  const title = motorActionTitle(item);
  const message = motorActionMessage(item);

  const onSelect = (index: number) => {
    if (index === sellIndex) {
      handlers.onSell(item.id);
      return;
    }
    if (index === orderIndex) {
      handlers.addToOrder(item.id);
    }
  };

  if (Platform.OS === 'ios') {
    ActionSheetIOS.showActionSheetWithOptions(
      {
        options,
        cancelButtonIndex: cancelIndex,
        title,
        message,
      },
      onSelect,
    );
    return;
  }

  Alert.alert(title, message, [
    { text: 'Sell', onPress: () => onSelect(sellIndex) },
    { text: 'Add to work order', onPress: () => onSelect(orderIndex) },
    { text: 'Cancel', style: 'cancel' },
  ]);
}

function showCatalogActions(item: SearchResultItem, router: SearchRouter): void {
  const kindLabel = item.kind === 'engine' ? 'engines' : 'gearboxes';
  const options = ['Find in warehouse', 'Search related', 'Cancel'];
  const warehouseIndex = 0;
  const searchIndex = 1;
  const cancelIndex = 2;
  const query = encodeURIComponent(item.title);

  const onSelect = (index: number) => {
    if (index === warehouseIndex) {
      router.push(`/warehouse?q=${query}` as Href);
      return;
    }
    if (index === searchIndex) {
      router.push(`/search?q=${query}&filter=${kindLabel}` as Href);
    }
  };

  if (Platform.OS === 'ios') {
    ActionSheetIOS.showActionSheetWithOptions(
      {
        options,
        cancelButtonIndex: cancelIndex,
        title: item.title,
        message: item.subtitle ?? item.meta,
      },
      onSelect,
    );
    return;
  }

  Alert.alert(item.title, item.subtitle ?? item.meta, [
    { text: 'Find in warehouse', onPress: () => onSelect(warehouseIndex) },
    { text: 'Search related', onPress: () => onSelect(searchIndex) },
    { text: 'Cancel', style: 'cancel' },
  ]);
}

/** One-tap destination for a search hit. */
export async function openSearchResult(
  item: SearchResultItem,
  router: SearchRouter,
  addToOrder: AddToOrderHandlers,
  motorActions?: MotorActionHandlers,
): Promise<void> {
  if (item.kind === 'workspace') {
    if (item.href) router.push(item.href as Href);
    return;
  }

  if (item.kind === 'order') {
    router.push(`/(tabs)/orders/${item.id}` as Href);
    return;
  }

  if (item.kind === 'client') {
    const phone = item.subtitle || item.meta;
    await openPhone(phone);
    return;
  }

  if (item.kind === 'part') {
    showPartActions(item, router, addToOrder);
    return;
  }

  if (item.kind === 'motor') {
    // Canonical Engine object — sell / add-to-order remain available from the object.
    router.push(`/objects/engine/${item.id}` as Href);
    void motorActions;
    return;
  }

  if (item.kind === 'engine' || item.kind === 'gearbox') {
    showCatalogActions(item, router);
    return;
  }

  if (item.kind === 'document' || item.kind === 'sale' || item.kind === 'accounting') {
    toast({
      title: item.title,
      description: item.subtitle ?? item.meta ?? 'Open this item on web for full detail.',
    });
  }
}
