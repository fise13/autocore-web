import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  BackHandler,
  Dimensions,
  Keyboard,
  Pressable,
  ScrollView,
  TextInput,
  View,
} from 'react-native';
import Animated, {
  Easing,
  interpolate,
  runOnJS,
  useAnimatedStyle,
  useSharedValue,
  withDelay,
  withSpring,
  withTiming,
} from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { SearchIcon } from '@/assets/icons';
import { Text } from '@/components/ui';
import { useReducedMotion } from '@/hooks/use-accessibility';
import { useTheme } from '@/hooks/use-theme';
import { haptics } from '@/theme';
import { rhythm } from '@/theme/screen';
import { tokens } from '@/theme/tokens';

import { workLayout } from '../layout';
import type { WorkModel, WorkSection } from '../lib/work-model';
import { WorkGroup, WorkGroupRow } from './work-group';

const FIELD_H = 36;
const ICON_SLOT = 40;
const CANCEL_W = 72;
const OPEN_EASE = Easing.bezier(0.22, 1, 0.36, 1);

function haystack(parts: Array<string | null | undefined>): string {
  return parts.filter(Boolean).join(' ').toLowerCase();
}

function filterSections(sections: WorkSection[], query: string): WorkSection[] {
  const q = query.trim().toLowerCase();
  if (!q) return sections;
  return sections
    .map((section) => ({
      ...section,
      rows: section.rows.filter((row) =>
        haystack([section.title, row.title, row.detail]).includes(q),
      ),
    }))
    .filter((section) => section.rows.length > 0);
}

type WorkSearchOverlayProps = {
  model: WorkModel;
  onClose: () => void;
  onOpenNode: (id: string, href: string) => void;
  onOpenToday: () => void;
};

/**
 * Settings-style search: the magnifier stays put, then the field grows left
 * from that trailing slot. Suggestions ride up underneath.
 */
export function WorkSearchOverlay({
  model,
  onClose,
  onOpenNode,
  onOpenToday,
}: WorkSearchOverlayProps) {
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();
  const reduced = useReducedMotion();
  const inputRef = useRef<TextInput>(null);
  const closingRef = useRef(false);
  const [query, setQuery] = useState('');

  const progress = useSharedValue(reduced ? 1 : 0);
  const list = useSharedValue(reduced ? 1 : 0);

  const screenW = Dimensions.get('window').width;
  const fieldMax = Math.max(160, screenW - workLayout.pad * 2 - CANCEL_W);

  const sections = useMemo(() => filterSections(model.sections, query), [model.sections, query]);
  const q = query.trim().toLowerCase();
  const showToday =
    Boolean(model.today.href) &&
    (!q || haystack([model.today.title, model.today.breakdown]).includes(q));

  useEffect(() => {
    if (reduced) {
      inputRef.current?.focus();
      return;
    }
    progress.value = withSpring(1, tokens.motion.springs.nav);
    list.value = withDelay(
      90,
      withSpring(1, tokens.motion.springs.list),
    );
    const focus = setTimeout(() => inputRef.current?.focus(), 220);
    return () => clearTimeout(focus);
  }, [list, progress, reduced]);

  const finishClose = useCallback(() => {
    onClose();
  }, [onClose]);

  const close = useCallback(() => {
    if (closingRef.current) return;
    closingRef.current = true;
    Keyboard.dismiss();
    haptics.selection();
    if (reduced) {
      finishClose();
      return;
    }
    list.value = withTiming(0, { duration: tokens.motion.duration.fast, easing: OPEN_EASE });
    progress.value = withTiming(
      0,
      { duration: tokens.motion.duration.medium, easing: OPEN_EASE },
      (finished) => {
        if (finished) runOnJS(finishClose)();
      },
    );
  }, [finishClose, list, progress, reduced]);

  useEffect(() => {
    const sub = BackHandler.addEventListener('hardwareBackPress', () => {
      close();
      return true;
    });
    return () => sub.remove();
  }, [close]);

  const bgStyle = useAnimatedStyle(() => ({
    opacity: interpolate(progress.value, [0, 0.45, 1], [0, 0.92, 1]),
  }));

  const fieldStyle = useAnimatedStyle(() => ({
    width: interpolate(progress.value, [0, 1], [ICON_SLOT, fieldMax]),
    right: interpolate(progress.value, [0, 1], [0, CANCEL_W]),
  }));

  const cancelStyle = useAnimatedStyle(() => ({
    opacity: interpolate(progress.value, [0.55, 1], [0, 1]),
    transform: [
      { translateX: interpolate(progress.value, [0.55, 1], [18, 0]) },
    ],
  }));

  const listStyle = useAnimatedStyle(() => ({
    opacity: list.value,
    transform: [{ translateY: interpolate(list.value, [0, 1], [22, 0]) }],
  }));

  const openNode = (id: string, href: string) => {
    Keyboard.dismiss();
    onClose();
    onOpenNode(id, href);
  };

  return (
    <View pointerEvents="box-none" style={{ flex: 1 }}>
      <Animated.View
        pointerEvents="auto"
        style={[
          {
            position: 'absolute',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            backgroundColor: colors.background,
          },
          bgStyle,
        ]}
      />

      <View
        pointerEvents="box-none"
        style={{
          paddingTop: insets.top + rhythm.headerTop,
          paddingHorizontal: workLayout.pad,
          height: insets.top + rhythm.headerTop + FIELD_H + 8,
        }}
      >
        <View style={{ height: FIELD_H }}>
          <Animated.View
            style={[
              {
                position: 'absolute',
                top: 0,
                height: FIELD_H,
                overflow: 'hidden',
                borderRadius: tokens.radius.control,
                backgroundColor: colors.secondary,
              },
              fieldStyle,
            ]}
          >
            <View
              style={{
                width: fieldMax,
                height: FIELD_H,
                flexDirection: 'row',
                alignItems: 'center',
                paddingLeft: 10,
                paddingRight: 12,
                gap: 8,
              }}
            >
              <SearchIcon size={18} color={colors.mutedForeground} strokeWidth={2} />
              <TextInput
                ref={inputRef}
                value={query}
                onChangeText={setQuery}
                placeholder="Search"
                placeholderTextColor={colors.mutedForeground}
                autoCapitalize="none"
                autoCorrect={false}
                returnKeyType="search"
                selectionColor={colors.primary}
                style={{
                  flex: 1,
                  fontSize: 17,
                  fontWeight: '400',
                  color: colors.foreground,
                  paddingVertical: 0,
                }}
              />
            </View>
          </Animated.View>

          <Animated.View
            style={[
              {
                position: 'absolute',
                right: 0,
                top: 0,
                height: FIELD_H,
                width: CANCEL_W,
                alignItems: 'flex-end',
                justifyContent: 'center',
              },
              cancelStyle,
            ]}
          >
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Cancel"
              onPress={close}
              hitSlop={8}
              style={{ minHeight: 44, justifyContent: 'center' }}
            >
              <Text variant="body" style={{ color: colors.primary, fontWeight: '400' }}>
                Cancel
              </Text>
            </Pressable>
          </Animated.View>
        </View>
      </View>

      <Animated.View style={[{ flex: 1 }, listStyle]}>
        <ScrollView
          keyboardShouldPersistTaps="handled"
          keyboardDismissMode="on-drag"
          contentContainerStyle={{ paddingTop: 14, paddingBottom: insets.bottom + 32 }}
        >
          {showToday ? (
            <WorkGroup title={q ? 'Today' : 'Suggestions'}>
              <WorkGroupRow
                title={model.today.title}
                detail={model.today.breakdown ?? model.today.trend.insight}
                detailKind={model.today.count > 0 ? 'live' : 'clear'}
                urgent={model.today.count > 0}
                onPress={() => {
                  Keyboard.dismiss();
                  onClose();
                  onOpenToday();
                }}
              />
            </WorkGroup>
          ) : null}

          {sections.length === 0 && !showToday ? (
            <Text
              variant="body"
              color="muted"
              style={{
                textAlign: 'center',
                marginTop: 48,
                marginHorizontal: workLayout.pad,
              }}
            >
              No Results
            </Text>
          ) : (
            sections.map((section) => (
              <WorkGroup key={section.id} title={section.title}>
                {section.rows.map((row) => (
                  <WorkGroupRow
                    key={row.id}
                    title={row.title}
                    detail={row.detail}
                    detailKind={row.detailKind}
                    urgent={row.attention > 0}
                    series={row.series}
                    onPress={() => openNode(row.id, row.href)}
                  />
                ))}
              </WorkGroup>
            ))
          )}
        </ScrollView>
      </Animated.View>
    </View>
  );
}
