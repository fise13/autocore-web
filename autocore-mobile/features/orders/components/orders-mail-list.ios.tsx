import { useCallback, useMemo } from 'react';
import { View } from 'react-native';
import { useRouter } from 'expo-router';
import * as Clipboard from 'expo-clipboard';
import {
  Button,
  ContentUnavailableView,
  ContextMenu,
  Host,
  HStack,
  Image,
  List,
  Section,
  Spacer,
  SwipeActions,
  Text,
  VStack,
} from '@expo/ui/swift-ui';
import {
  environment,
  font,
  foregroundStyle,
  lineLimit,
  listStyle,
  monospacedDigit,
  onTapGesture,
  scrollContentBackground,
  scrollDismissesKeyboard,
  tag,
  tint,
} from '@expo/ui/swift-ui/modifiers';

import { ClipboardListIcon } from '@/assets/icons';
import { EmptyState, toast } from '@/components/ui';
import { formatPrice } from '@/features/search/lib/format';
import { useTheme } from '@/hooks';
import { haptics, tokens } from '@/theme';
import { useMoneyFormatRevision } from '@/store/money-format-store';

import { useOrderTransition } from '../animation/order-transition-context';
import { buildOrderSections } from '../lib/group-orders';
import { navigateOrderEdit } from '../lib/order-composition-nav';
import { formatOrderListVehicleLine, formatWorkOrderLabel } from '../lib/order-display';
import { resolveStatusInk } from '../lib/status';
import { canMarkCompleted } from '../lib/transition-messages';
import type { WorkOrder } from '../types';
import type { OrdersMailListProps } from './orders-mail-list.types';

export type { OrdersMailListProps };

function MailOrderRowContent({ order }: { order: WorkOrder }) {
  const { colors } = useTheme();
  const ink = resolveStatusInk(colors, order.status);
  const vehicle = formatOrderListVehicleLine(order);
  const assignee = order.isUnassigned
    ? 'Unassigned'
    : order.assignee?.trim() || '—';

  return (
    <VStack alignment="leading" spacing={3}>
      <HStack spacing={8} alignment="center">
        <Text
          modifiers={[
            font({ textStyle: 'caption', weight: 'semibold' }),
            monospacedDigit(),
            foregroundStyle({ type: 'hierarchical', style: 'secondary' }),
          ]}
        >
          {formatWorkOrderLabel(order.number)}
        </Text>
        <Image systemName="circle.fill" size={6} color={ink.solid} />
        <Text
          modifiers={[
            font({ textStyle: 'caption2', weight: 'semibold' }),
            foregroundStyle(ink.solid),
          ]}
        >
          {ink.label}
        </Text>
        <Spacer />
        <Text
          modifiers={[
            font({ textStyle: 'subheadline', weight: 'bold' }),
            monospacedDigit(),
            foregroundStyle(colors.foreground),
          ]}
        >
          {formatPrice(order.price)}
        </Text>
      </HStack>

      <Text
        modifiers={[
          font({ textStyle: 'body', weight: 'semibold' }),
          lineLimit(1),
          foregroundStyle(colors.foreground),
        ]}
      >
        {order.customer}
      </Text>

      <HStack alignment="firstTextBaseline" spacing={8}>
        <Text
          modifiers={[
            font({ textStyle: 'footnote' }),
            lineLimit(1),
            foregroundStyle({ type: 'hierarchical', style: 'secondary' }),
          ]}
        >
          {[vehicle || order.vehicle || null, order.createdAt].filter(Boolean).join(' · ')}
        </Text>
        <Spacer />
        <Text
          modifiers={[
            font({ textStyle: 'caption2' }),
            lineLimit(1),
            foregroundStyle(
              order.isUnassigned
                ? colors.warning
                : { type: 'hierarchical', style: 'tertiary' },
            ),
          ]}
        >
          {assignee}
        </Text>
      </HStack>
    </VStack>
  );
}

function MailOrderRow({
  order,
  editing,
  canEdit,
  onOpen,
  onComplete,
  onEnterEdit,
  onCopy,
  onEditComposer,
}: {
  order: WorkOrder;
  editing: boolean;
  canEdit: boolean;
  onOpen: (order: WorkOrder) => void;
  onComplete: (order: WorkOrder) => void;
  onEnterEdit: (order: WorkOrder) => void;
  onCopy: (order: WorkOrder) => void;
  onEditComposer: (order: WorkOrder) => void;
}) {
  const { colors } = useTheme();
  const canComplete = canEdit && canMarkCompleted(order.status);
  const canOpenComposer =
    canEdit && (order.status === 'draft' || order.status === 'confirmed');

  const body = (
    <VStack
      alignment="leading"
      modifiers={[
        tag(order.id),
        ...(editing
          ? []
          : [
              onTapGesture(() => {
                onOpen(order);
              }),
            ]),
      ]}
    >
      <MailOrderRowContent order={order} />
    </VStack>
  );

  if (editing || !canEdit) {
    return body;
  }

  return (
    <SwipeActions>
      <ContextMenu>
        <ContextMenu.Trigger>{body}</ContextMenu.Trigger>
        <ContextMenu.Items>
          {canOpenComposer ? (
            <Button
              label="Edit"
              systemImage="pencil"
              onPress={() => onEditComposer(order)}
            />
          ) : null}
          <Button
            label="Select"
            systemImage="checkmark.circle"
            onPress={() => onEnterEdit(order)}
          />
          {canComplete ? (
            <Button
              label="Mark Completed"
              systemImage="checkmark.circle.fill"
              onPress={() => onComplete(order)}
            />
          ) : null}
          <Button
            label="Copy WO #"
            systemImage="doc.on.doc"
            onPress={() => onCopy(order)}
          />
        </ContextMenu.Items>
      </ContextMenu>

      {canComplete ? (
        <SwipeActions.Actions edge="trailing" allowsFullSwipe>
          <Button
            label="Done"
            systemImage="checkmark"
            onPress={() => {
              haptics.medium();
              onComplete(order);
            }}
            modifiers={[tint(colors.success)]}
          />
        </SwipeActions.Actions>
      ) : null}

      <SwipeActions.Actions edge="leading" allowsFullSwipe={false}>
        <Button
          label="Edit"
          systemImage="pencil"
          onPress={() => {
            haptics.medium();
            onEnterEdit(order);
          }}
          modifiers={[tint(colors.primary)]}
        />
      </SwipeActions.Actions>
    </SwipeActions>
  );
}

/**
 * Native SwiftUI `List` for work orders (iOS).
 */
export function OrdersMailList({
  orders,
  editing,
  selectedIds,
  onSelectionChange,
  onComplete,
  onEnterEdit,
  canEdit = true,
  emptyTitle,
  emptyDescription,
  isEmpty,
  onCreateEmpty,
}: OrdersMailListProps) {
  const { colors, isDark } = useTheme();
  useMoneyFormatRevision();
  const { openOrder } = useOrderTransition();
  const router = useRouter();
  const sections = useMemo(() => buildOrderSections(orders), [orders]);

  const handleOpen = useCallback(
    (order: WorkOrder) => {
      openOrder(order);
    },
    [openOrder],
  );

  const copyWo = useCallback(async (order: WorkOrder) => {
    const label = formatWorkOrderLabel(order.number);
    await Clipboard.setStringAsync(label);
    toast({ title: `${label} copied`, variant: 'success' });
  }, []);

  const openComposer = useCallback(
    (order: WorkOrder) => {
      navigateOrderEdit(router, order.id);
    },
    [router],
  );

  if (isEmpty) {
    if (onCreateEmpty) {
      return (
        <View style={{ paddingHorizontal: tokens.space.screenX, paddingTop: tokens.space.section }}>
          <EmptyState
            icon={ClipboardListIcon}
            title={emptyTitle}
            description={emptyDescription}
            primaryAction={{ label: 'Create work order', onPress: onCreateEmpty }}
          />
        </View>
      );
    }

    return (
      <Host style={{ flex: 1 }} colorScheme={isDark ? 'dark' : 'light'} seedColor={colors.primary}>
        <ContentUnavailableView
          title={emptyTitle}
          description={emptyDescription}
          systemImage="clipboard"
        />
      </Host>
    );
  }

  return (
    <Host
      style={{ flex: 1 }}
      colorScheme={isDark ? 'dark' : 'light'}
      seedColor={colors.primary}
      ignoreSafeArea="keyboard"
    >
      <List
        selection={editing ? Array.from(selectedIds) : undefined}
        onSelectionChange={
          editing
            ? (next) => {
                haptics.selection();
                onSelectionChange(new Set(next.map(String)));
              }
            : undefined
        }
        modifiers={[
          listStyle('insetGrouped'),
          scrollContentBackground('hidden'),
          scrollDismissesKeyboard('interactively'),
          environment('editMode', editing ? 'active' : 'inactive'),
        ]}
      >
        {sections.map((section) => (
          <Section
            key={section.id}
            header={
              <HStack>
                <Text
                  modifiers={[
                    font({ textStyle: 'headline', weight: 'bold' }),
                    foregroundStyle(colors.foreground),
                  ]}
                >
                  {section.label}
                </Text>
                <Spacer />
                <Text
                  modifiers={[
                    font({ textStyle: 'subheadline', weight: 'semibold' }),
                    monospacedDigit(),
                    foregroundStyle(colors.primary),
                  ]}
                >
                  {String(section.count)}
                </Text>
              </HStack>
            }
          >
            {section.orders.map((order) => (
              <MailOrderRow
                key={order.id}
                order={order}
                editing={editing}
                canEdit={canEdit}
                onOpen={handleOpen}
                onComplete={onComplete}
                onEnterEdit={onEnterEdit}
                onCopy={(o) => void copyWo(o)}
                onEditComposer={openComposer}
              />
            ))}
          </Section>
        ))}
      </List>
    </Host>
  );
}
