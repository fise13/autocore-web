import { useCallback, useEffect, useMemo, useState } from 'react';
import { Pressable, TextInput, View } from 'react-native';
import type { PressableProps, ViewStyle } from 'react-native';
import Animated, { FadeIn, FadeInDown, FadeOut, Layout } from 'react-native-reanimated';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { ArrowLeftIcon, PlusIcon, ReceiptIcon, TagIcon, UsersIcon, XIcon } from '@/assets/icons';
import { IconButton, Screen, ScreenScroll, Skeleton, Text, toast } from '@/components/ui';
import {
  useAccountingPreferences,
} from '@/hooks/use-accounting-preferences';
import {
  useReducedMotion,
  useReleaseStackNavigationOnFocus,
  useSession,
  useTheme,
} from '@/hooks';
import { canManageEmployees } from '@/lib/permissions';
import { resolveFinanceSettingsReturnHref } from '@/lib/navigation/open-finance-settings';
import { withAlpha } from '@/theme/color-utils';
import { autocoreEase, duration, haptics, rhythm } from '@/theme';
import { tokens } from '@/theme/tokens';

/**
 * Pressable that dims on touch without a function `style`.
 *
 * The function form of `style` never reaches the view here — NativeWind's JSX
 * runtime normalises the prop first and discards a function, taking layout with
 * it. Owning the flag inside a component keeps it per-chip within the list,
 * which one flag on the screen could not do.
 */
function PressFade({
  style,
  pressedOpacity,
  children,
  ...props
}: Omit<PressableProps, 'style'> & {
  style: ViewStyle;
  pressedOpacity: number;
  children: React.ReactNode;
}) {
  const [pressed, setPressed] = useState(false);

  return (
    <Pressable
      {...props}
      onPressIn={() => setPressed(true)}
      onPressOut={() => setPressed(false)}
      style={{ ...style, opacity: pressed ? pressedOpacity : (style.opacity ?? 1) }}
    >
      {children}
    </Pressable>
  );
}

function normalizeList(items: string[]): string[] {
  const seen = new Set<string>();
  const next: string[] = [];
  for (const raw of items) {
    const value = raw.trim();
    if (!value) continue;
    const key = value.toLocaleLowerCase();
    if (seen.has(key)) continue;
    seen.add(key);
    next.push(value);
  }
  return next;
}

function listsEqual(a: string[], b: string[]): boolean {
  if (a.length !== b.length) return false;
  return a.every((item, index) => item === b[index]);
}

type ListPanelProps = {
  icon: React.ComponentType<{
    size?: number | 'sm' | 'md' | 'lg';
    color?: string;
    strokeWidth?: number;
  }>;
  title: string;
  caption: string;
  items: string[];
  draft: string;
  placeholder: string;
  emptyHint: string;
  canEdit: boolean;
  accent: string;
  onDraftChange: (value: string) => void;
  onAdd: () => void;
  onRemove: (index: number) => void;
  /** Optional per-item invite — used for employee names. */
  onInvite?: (name: string) => void;
};

function ListPanel({
  icon: Icon,
  title,
  caption,
  items,
  draft,
  placeholder,
  emptyHint,
  canEdit,
  accent,
  onDraftChange,
  onAdd,
  onRemove,
  onInvite,
}: ListPanelProps) {
  const { colors, isDark } = useTheme();
  const reduced = useReducedMotion();
  const canAdd = canEdit && draft.trim().length > 0;
  const chipBg = withAlpha(accent, isDark ? 0.16 : 0.09);
  const chipBorder = withAlpha(accent, isDark ? 0.28 : 0.16);

  return (
    <View
      style={{
        marginHorizontal: tokens.space.screenX,
        borderRadius: tokens.radius.sheet,
        backgroundColor: colors.card,
        borderWidth: tokens.control.hairline,
        borderColor: colors.border,
        overflow: 'hidden',
      }}
    >
      <View
        style={{
          flexDirection: 'row',
          alignItems: 'center',
          gap: tokens.space.stack,
          paddingHorizontal: tokens.space.stack + 2,
          paddingTop: tokens.space.stack + 4,
          paddingBottom: tokens.space.stack,
        }}
      >
        <View
          style={{
            width: 44,
            height: 44,
            borderRadius: 14,
            alignItems: 'center',
            justifyContent: 'center',
            backgroundColor: withAlpha(accent, isDark ? 0.2 : 0.1),
          }}
        >
          <Icon size={22} color={accent} strokeWidth={1.85} />
        </View>
        <View style={{ flex: 1, gap: 2 }}>
          <View style={{ flexDirection: 'row', alignItems: 'baseline', gap: 8 }}>
            <Text
              variant="title3"
              style={{ fontSize: 20, fontWeight: '700', letterSpacing: -0.4, color: colors.foreground }}
            >
              {title}
            </Text>
            <Text
              variant="caption"
              style={{
                fontSize: 13,
                fontWeight: '600',
                color: accent,
                fontVariant: ['tabular-nums'],
              }}
            >
              {items.length}
            </Text>
          </View>
          <Text variant="footnote" color="muted" style={{ lineHeight: 17 }}>
            {caption}
          </Text>
        </View>
      </View>

      <View
        style={{
          height: tokens.control.hairline,
          backgroundColor: colors.border,
          marginHorizontal: tokens.space.stack + 2,
          opacity: 0.7,
        }}
      />

      <View
        style={{
          paddingHorizontal: tokens.space.stack + 2,
          paddingTop: tokens.space.stack,
          paddingBottom: tokens.space.inline,
          minHeight: 72,
        }}
      >
        {items.length === 0 ? (
          <View
            style={{
              paddingVertical: tokens.space.stack,
              alignItems: 'center',
              gap: 6,
            }}
          >
            <Text
              variant="body"
              style={{ fontSize: 15, fontWeight: '500', color: colors.mutedForeground }}
            >
              Nothing here yet
            </Text>
            <Text
              variant="caption"
              color="muted"
              style={{ textAlign: 'center', lineHeight: 17, maxWidth: 260 }}
            >
              {emptyHint}
            </Text>
          </View>
        ) : (
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
            {items.map((item, index) => (
              <Animated.View
                key={`${item}-${index}`}
                entering={reduced ? undefined : FadeIn.duration(duration.fast).easing(autocoreEase)}
                exiting={reduced ? undefined : FadeOut.duration(duration.instant)}
                layout={reduced ? undefined : Layout.duration(duration.normal).easing(autocoreEase)}
              >
                <View
                  style={{
                    flexDirection: 'row',
                    alignItems: 'center',
                    gap: 6,
                    paddingLeft: 12,
                    paddingRight: canEdit || onInvite ? 8 : 12,
                    paddingVertical: 8,
                    borderRadius: tokens.radius.full,
                    backgroundColor: chipBg,
                    borderWidth: tokens.control.hairline,
                    borderColor: chipBorder,
                  }}
                >
                  <Text
                    variant="body"
                    style={{ fontSize: 15, fontWeight: '500', color: colors.foreground }}
                  >
                    {item}
                  </Text>
                  {onInvite ? (
                    <PressFade
                      accessibilityRole="button"
                      accessibilityLabel={`Invite ${item}`}
                      hitSlop={4}
                      onPress={() => {
                        haptics.selection();
                        onInvite(item);
                      }}
                      pressedOpacity={0.8}
                      style={{
                        paddingHorizontal: 8,
                        paddingVertical: 4,
                        borderRadius: tokens.radius.full,
                        backgroundColor: withAlpha(accent, isDark ? 0.28 : 0.16),
                      }}
                    >
                      <Text
                        variant="caption"
                        style={{ fontSize: 12, fontWeight: '600', color: accent }}
                      >
                        Invite
                      </Text>
                    </PressFade>
                  ) : null}
                  {canEdit ? (
                    <PressFade
                      accessibilityRole="button"
                      accessibilityLabel={`Remove ${item}`}
                      hitSlop={4}
                      onPress={() => {
                        haptics.selection();
                        onRemove(index);
                      }}
                      pressedOpacity={0.75}
                      style={{
                        width: 20,
                        height: 20,
                        borderRadius: 10,
                        alignItems: 'center',
                        justifyContent: 'center',
                        backgroundColor: withAlpha(colors.foreground, isDark ? 0.14 : 0.08),
                      }}
                    >
                      <XIcon size={11} color={colors.mutedForeground} strokeWidth={2.6} />
                    </PressFade>
                  ) : null}
                </View>
              </Animated.View>
            ))}
          </View>
        )}
      </View>

      {canEdit ? (
        <View
          style={{
            flexDirection: 'row',
            alignItems: 'center',
            gap: tokens.space.inline,
            marginHorizontal: tokens.space.stack + 2,
            marginBottom: tokens.space.stack + 2,
            paddingLeft: 14,
            paddingRight: 6,
            minHeight: 48,
            borderRadius: tokens.radius.full,
            backgroundColor: withAlpha(colors.foreground, isDark ? 0.06 : 0.04),
            borderWidth: tokens.control.hairline,
            borderColor: colors.borderMuted,
          }}
        >
          <TextInput
            value={draft}
            onChangeText={onDraftChange}
            placeholder={placeholder}
            placeholderTextColor={colors.mutedForeground}
            autoCapitalize="sentences"
            autoCorrect={false}
            returnKeyType="done"
            onSubmitEditing={onAdd}
            accessibilityLabel={placeholder}
            style={{
              flex: 1,
              fontSize: 16,
              lineHeight: 21,
              color: colors.foreground,
              paddingVertical: 12,
            }}
          />
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={`Add ${title.slice(0, -1).toLowerCase()}`}
            accessibilityState={{ disabled: !canAdd }}
            disabled={!canAdd}
            hitSlop={4}
            onPress={onAdd}
            style={{
              width: 36,
              height: 36,
              borderRadius: 18,
              alignItems: 'center',
              justifyContent: 'center',
              backgroundColor: canAdd ? accent : withAlpha(colors.mutedForeground, 0.12),
            }}
          >
            <PlusIcon
              size={18}
              color={canAdd ? colors.primaryForeground : colors.mutedForeground}
              strokeWidth={2.5}
            />
          </Pressable>
        </View>
      ) : null}
    </View>
  );
}

function FinanceSettingsSkeleton() {
  return (
    <View style={{ gap: tokens.space.section, paddingHorizontal: tokens.space.screenX }}>
      <Skeleton height={88} rounded="xl" />
      <Skeleton height={200} rounded="xl" />
      <Skeleton height={200} rounded="xl" />
    </View>
  );
}

export function FinanceSettingsScreen() {
  const { colors, isDark } = useTheme();
  const insets = useSafeAreaInsets();
  const reduced = useReducedMotion();
  const router = useRouter();
  useReleaseStackNavigationOnFocus();

  const { returnTo } = useLocalSearchParams<{ returnTo?: string }>();
  const backFallbackHref = useMemo(
    () => resolveFinanceSettingsReturnHref(returnTo),
    [returnTo],
  );

  const { profile, can } = useSession();
  const uid = profile?.id ?? null;
  const canEdit = can('accounting_edit');
  const canInvite = canManageEmployees(profile);
  const { employees, specifics, isLoading, saveLists } = useAccountingPreferences(uid);

  const [employeesDraft, setEmployeesDraft] = useState<string[]>([]);
  const [specificsDraft, setSpecificsDraft] = useState<string[]>([]);
  const [employeeInput, setEmployeeInput] = useState('');
  const [specificInput, setSpecificInput] = useState('');
  const [hydrated, setHydrated] = useState(false);
  const [saving, setSaving] = useState(false);
  const [savePressed, setSavePressed] = useState(false);

  useEffect(() => {
    if (isLoading) return;
    setEmployeesDraft(employees);
    setSpecificsDraft(specifics);
    setHydrated(true);
  }, [employees, isLoading, specifics]);

  const dirty =
    hydrated &&
    (!listsEqual(employeesDraft, employees) || !listsEqual(specificsDraft, specifics));

  const handleBack = useCallback(() => {
    const sameStackReturn = !returnTo || returnTo === 'hub';
    if (sameStackReturn && router.canGoBack()) {
      router.back();
      return;
    }
    router.replace(backFallbackHref);
  }, [backFallbackHref, returnTo, router]);

  const addEmployee = useCallback(() => {
    const value = employeeInput.trim();
    if (!value) return;
    setEmployeesDraft((prev) => normalizeList([...prev, value]));
    setEmployeeInput('');
    haptics.selection();
  }, [employeeInput]);

  const addSpecific = useCallback(() => {
    const value = specificInput.trim();
    if (!value) return;
    setSpecificsDraft((prev) => normalizeList([...prev, value]));
    setSpecificInput('');
    haptics.selection();
  }, [specificInput]);

  const handleSave = useCallback(async () => {
    if (!canEdit || !dirty || saving) return;
    setSaving(true);
    try {
      haptics.medium();
      const nextEmployees = normalizeList(employeesDraft);
      const nextSpecifics = normalizeList(specificsDraft);
      await saveLists({ employees: nextEmployees, specifics: nextSpecifics });
      setEmployeesDraft(nextEmployees);
      setSpecificsDraft(nextSpecifics);
      toast({ title: 'Finance lists saved', variant: 'success' });
    } catch (error) {
      toast({
        title: error instanceof Error ? error.message : 'Could not save',
        variant: 'destructive',
      });
    } finally {
      setSaving(false);
    }
  }, [canEdit, dirty, employeesDraft, saveLists, saving, specificsDraft]);

  const saveDockHeight = dirty && canEdit ? 72 + Math.max(insets.bottom, 12) : 0;
  const categoryAccent = colors.primary;
  const employeeAccent = isDark ? colors.success : colors.successOnSubtle;

  return (
    <Screen>
      <View
        style={{
          paddingTop: insets.top + rhythm.headerTop,
          paddingHorizontal: rhythm.pad,
          paddingBottom: rhythm.headerBottom,
          flexDirection: 'row',
          alignItems: 'center',
          gap: rhythm.inline,
        }}
      >
        <IconButton accessibilityLabel="Back" variant="ghost" size="sm" onPress={handleBack}>
          <ArrowLeftIcon size="sm" color={colors.foreground} strokeWidth={2} />
        </IconButton>
        <View style={{ flex: 1, gap: 1 }}>
          <Text
            variant="heading"
            style={{ fontSize: 17, fontWeight: '600', lineHeight: 22, color: colors.foreground }}
          >
            Finance
          </Text>
          <Text
            variant="caption"
            style={{ fontSize: 12, lineHeight: 16, color: colors.mutedForeground }}
          >
            {isLoading ? 'Loading…' : 'Names and categories'}
          </Text>
        </View>
        {canEdit && dirty ? (
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Save"
            disabled={saving}
            hitSlop={8}
            onPress={() => void handleSave()}
            style={{
              minHeight: 36,
              paddingHorizontal: 14,
              borderRadius: tokens.radius.full,
              alignItems: 'center',
              justifyContent: 'center',
              backgroundColor: colors.primary,
              opacity: saving ? 0.7 : 1,
            }}
          >
            <Text
              variant="body"
              style={{ fontSize: 15, fontWeight: '600', color: colors.primaryForeground }}
            >
              {saving ? 'Saving' : 'Save'}
            </Text>
          </Pressable>
        ) : null}
      </View>

      <ScreenScroll
        tabBarInset
        keyboardShouldPersistTaps="handled"
        contentStyle={{ paddingBottom: saveDockHeight + tokens.space.section }}
      >
        {isLoading && !hydrated ? (
          <FinanceSettingsSkeleton />
        ) : (
          <View style={{ gap: tokens.space.section }}>
            <Animated.View
              entering={
                reduced
                  ? undefined
                  : FadeInDown.duration(duration.medium).easing(autocoreEase).delay(40)
              }
              style={{
                marginHorizontal: tokens.space.screenX,
                borderRadius: tokens.radius.sheet,
                padding: tokens.space.stack + 4,
                gap: tokens.space.stack,
                backgroundColor: withAlpha(colors.primary, isDark ? 0.14 : 0.07),
                borderWidth: tokens.control.hairline,
                borderColor: withAlpha(colors.primary, isDark ? 0.28 : 0.14),
              }}
            >
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: tokens.space.stack }}>
                <View
                  style={{
                    width: 48,
                    height: 48,
                    borderRadius: 16,
                    alignItems: 'center',
                    justifyContent: 'center',
                    backgroundColor: colors.primary,
                  }}
                >
                  <ReceiptIcon size={24} color={colors.primaryForeground} strokeWidth={1.85} />
                </View>
                <View style={{ flex: 1, gap: 3 }}>
                  <Text
                    variant="title3"
                    style={{
                      fontSize: 22,
                      fontWeight: '700',
                      letterSpacing: -0.5,
                      color: colors.foreground,
                    }}
                  >
                    Suggestion lists
                  </Text>
                  <Text variant="footnote" color="muted" style={{ lineHeight: 18 }}>
                    Used when creating income or expense entries. Syncs with web.
                  </Text>
                </View>
              </View>

              <View style={{ flexDirection: 'row', gap: tokens.space.inline }}>
                <View
                  style={{
                    flex: 1,
                    borderRadius: tokens.radius.group,
                    paddingVertical: 12,
                    paddingHorizontal: 14,
                    backgroundColor: withAlpha(colors.background, isDark ? 0.35 : 0.55),
                    gap: 2,
                  }}
                >
                  <Text
                    variant="title3"
                    style={{
                      fontSize: 24,
                      fontWeight: '700',
                      letterSpacing: -0.6,
                      fontVariant: ['tabular-nums'],
                      color: colors.foreground,
                    }}
                  >
                    {employeesDraft.length}
                  </Text>
                  <Text variant="caption" color="muted" style={{ fontSize: 12, fontWeight: '500' }}>
                    Names
                  </Text>
                </View>
                <View
                  style={{
                    flex: 1,
                    borderRadius: tokens.radius.group,
                    paddingVertical: 12,
                    paddingHorizontal: 14,
                    backgroundColor: withAlpha(colors.background, isDark ? 0.35 : 0.55),
                    gap: 2,
                  }}
                >
                  <Text
                    variant="title3"
                    style={{
                      fontSize: 24,
                      fontWeight: '700',
                      letterSpacing: -0.6,
                      fontVariant: ['tabular-nums'],
                      color: colors.foreground,
                    }}
                  >
                    {specificsDraft.length}
                  </Text>
                  <Text variant="caption" color="muted" style={{ fontSize: 12, fontWeight: '500' }}>
                    Categories
                  </Text>
                </View>
              </View>
            </Animated.View>

            <Animated.View
              entering={
                reduced
                  ? undefined
                  : FadeInDown.duration(duration.medium).easing(autocoreEase).delay(90)
              }
            >
              <ListPanel
                icon={UsersIcon}
                title="People"
                caption="Names for payout categories — invite anytime"
                items={employeesDraft}
                draft={employeeInput}
                placeholder="Add a name"
                emptyHint="Add people you pay often."
                canEdit={canEdit}
                accent={employeeAccent}
                onDraftChange={setEmployeeInput}
                onAdd={addEmployee}
                onRemove={(index) => {
                  setEmployeesDraft((prev) => prev.filter((_, i) => i !== index));
                }}
                onInvite={
                  canInvite
                    ? (name) => {
                        router.push({
                          pathname: '/(tabs)/profile/team',
                          params: { inviteName: name },
                        } as never);
                      }
                    : undefined
                }
              />
            </Animated.View>

            <Animated.View
              entering={
                reduced
                  ? undefined
                  : FadeInDown.duration(duration.medium).easing(autocoreEase).delay(140)
              }
            >
              <ListPanel
                icon={TagIcon}
                title="Categories"
                caption="Recurring income and expense labels"
                items={specificsDraft}
                draft={specificInput}
                placeholder="Add a category"
                emptyHint="Rent, fuel, parts, ads…"
                canEdit={canEdit}
                accent={categoryAccent}
                onDraftChange={setSpecificInput}
                onAdd={addSpecific}
                onRemove={(index) => {
                  setSpecificsDraft((prev) => prev.filter((_, i) => i !== index));
                }}
              />
            </Animated.View>

            {!canEdit ? (
              <View
                style={{
                  marginHorizontal: tokens.space.screenX,
                  padding: tokens.space.stack,
                  borderRadius: tokens.radius.group,
                  backgroundColor: colors.muted,
                }}
              >
                <Text variant="footnote" color="muted" style={{ lineHeight: 18, textAlign: 'center' }}>
                  View only. Ask an admin if you need to change these lists.
                </Text>
              </View>
            ) : null}
          </View>
        )}
      </ScreenScroll>

      {dirty && canEdit ? (
        <Animated.View
          entering={reduced ? undefined : FadeInDown.duration(duration.normal).easing(autocoreEase)}
          exiting={reduced ? undefined : FadeOut.duration(duration.fast)}
          style={{
            position: 'absolute',
            left: 0,
            right: 0,
            bottom: 0,
            paddingHorizontal: tokens.space.screenX,
            paddingTop: tokens.space.stack,
            paddingBottom: Math.max(insets.bottom, 12),
            backgroundColor: withAlpha(colors.background, 0.94),
            borderTopWidth: tokens.control.hairline,
            borderTopColor: colors.border,
          }}
        >
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Save finance lists"
            disabled={saving}
            onPress={() => void handleSave()}
            onPressIn={() => setSavePressed(true)}
            onPressOut={() => setSavePressed(false)}
            // Static object, not a `({ pressed }) => …` function. NativeWind's JSX runtime
            // normalises `style` before Pressable sees it and drops a function, taking the
            // whole style object — layout included — with it.
            style={{
              minHeight: 52,
              borderRadius: tokens.radius.full,
              alignItems: 'center',
              justifyContent: 'center',
              backgroundColor: colors.primary,
              opacity: saving ? 0.7 : savePressed ? 0.9 : 1,
            }}
          >
            <Text
              variant="headline"
              style={{ fontSize: 17, fontWeight: '600', color: colors.primaryForeground }}
            >
              {saving ? 'Saving…' : 'Save changes'}
            </Text>
          </Pressable>
        </Animated.View>
      ) : null}
    </Screen>
  );
}
