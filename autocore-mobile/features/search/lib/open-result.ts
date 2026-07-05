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
  addToOrder: AddToOrderHandlers,
): void {
  const options = ['Добавить в наряд', 'Показать остаток', 'Отмена'];
  const addIndex = 0;
  const showIndex = 1;
  const cancelIndex = 2;

  const onSelect = (index: number) => {
    if (index === addIndex) {
      addToOrder.addPart(item.id);
      return;
    }
    if (index === showIndex) {
      const detail = [item.subtitle, item.meta].filter(Boolean).join(' · ');
      toast({
        title: item.title,
        description: detail || 'Позиция склада',
        variant: 'default',
      });
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
    { text: 'Добавить в наряд', onPress: () => onSelect(addIndex) },
    { text: 'Показать остаток', onPress: () => onSelect(showIndex) },
    { text: 'Отмена', style: 'cancel' },
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
  const options = ['Продать', 'Добавить в наряд', 'Отмена'];
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
    { text: 'Продать', onPress: () => onSelect(sellIndex) },
    { text: 'Добавить в наряд', onPress: () => onSelect(orderIndex) },
    { text: 'Отмена', style: 'cancel' },
  ]);
}

/** One-tap destination for a search hit. */
export async function openSearchResult(
  item: SearchResultItem,
  router: SearchRouter,
  addToOrder: AddToOrderHandlers,
  motorActions?: MotorActionHandlers,
): Promise<void> {
  void router;

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
    showPartActions(item, addToOrder);
    return;
  }

  if (item.kind === 'motor') {
    showMotorActions(item, {
      onSell: motorActions?.onSell ?? (() => undefined),
      addToOrder: (motorId) => {
        if (motorActions?.addToOrder) {
          motorActions.addToOrder(motorId);
          return;
        }
        addToOrder.addMotor(motorId, 'install');
      },
    });
    return;
  }

  if (item.kind === 'engine' || item.kind === 'gearbox') {
    toast({
      title: item.title,
      description: item.subtitle ?? item.meta,
    });
  }
}
