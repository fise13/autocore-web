import { memo, useCallback, useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  View,
} from 'react-native';
import { Stack, useRouter, type Href } from 'expo-router';
import Animated, {
  FadeIn,
  FadeInDown,
  FadeOut,
  useAnimatedStyle,
  useSharedValue,
  withSpring,
  withTiming,
} from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import {
  CheckCircle2Icon,
  PlusIcon,
  UsersIcon,
} from '@/assets/icons';
import { useAuth } from '@/authentication/auth-provider';
import { CompanyAvatar } from '@/components/account/company-avatar';
import { AppLoadingScreen, Button, Text, toast } from '@/components/ui';
import { useReducedMotion } from '@/hooks/use-accessibility';
import { useSession, useTheme } from '@/hooks';
import { resolveActiveCompanyName } from '@/lib/resolve-active-company-name';
import { formatRole } from '@/lib/team/format';
import { switchActiveCompany } from '@/services/firestore/company-membership-service';
import { NotificationService } from '@/services/notifications';
import { useAuthStore } from '@/store/auth-store';
import { autocoreEase, duration, haptics, spring, tokens } from '@/theme';
import type { UserCompanyMembership } from '@/types/rbac';

const JOIN_HREF = '/(tabs)/profile/join-company' as Href;
const CREATE_HREF = '/(auth)/journey/company' as Href;
const HOME_HREF = '/(tabs)' as Href;

type OrgCardProps = {
  membership: UserCompanyMembership;
  active: boolean;
  busy: boolean;
  switching: boolean;
  onPress: () => void;
  index: number;
};

const OrganizationCard = memo(function OrganizationCard({
  membership,
  active,
  busy,
  switching,
  onPress,
  index,
}: OrgCardProps) {
  const { colors, isDark } = useTheme();
  const reducedMotion = useReducedMotion();
  const title = resolveActiveCompanyName(membership.companyId, membership.name, []);
  const role = formatRole(membership.role);
  const scale = useSharedValue(1);
  const dim = useSharedValue(1);

  useEffect(() => {
    if (reducedMotion) {
      dim.value = busy && !switching && !active ? 0.55 : 1;
      return;
    }
    dim.value = withTiming(busy && !switching && !active ? 0.45 : 1, {
      duration: duration.fast,
      easing: autocoreEase,
    });
  }, [active, busy, dim, reducedMotion, switching]);

  useEffect(() => {
    if (!switching || reducedMotion) return;
    scale.value = withSpring(0.97, spring.press);
    scale.value = withSpring(1, spring.settle);
  }, [reducedMotion, scale, switching]);

  const animatedStyle = useAnimatedStyle(() => ({
    opacity: dim.value,
    transform: [{ scale: scale.value }],
  }));

  const entering = reducedMotion
    ? undefined
    : FadeInDown.delay(Math.min(index, 6) * 40)
        .duration(duration.fast)
        .easing(autocoreEase);

  return (
    <Animated.View entering={entering} style={animatedStyle}>
      <Pressable
        accessibilityRole="button"
        accessibilityState={{ selected: active, busy: switching }}
        accessibilityLabel={`${title}, ${role}${active ? ', current' : ''}`}
        disabled={active || busy}
        onPressIn={() => {
          if (active || busy || reducedMotion) return;
          scale.value = withSpring(0.98, spring.press);
        }}
        onPressOut={() => {
          if (reducedMotion) return;
          scale.value = withSpring(1, spring.settle);
        }}
        onPress={onPress}
      >
        {({ pressed }) => (
          <View
            style={[
              styles.card,
              {
                backgroundColor: active
                  ? isDark
                    ? colors.secondary
                    : colors.card
                  : colors.card,
                borderColor: active || switching ? colors.primary : colors.border,
                borderWidth: active || switching ? 1.5 : StyleSheet.hairlineWidth,
                opacity: pressed && !active && !busy ? 0.92 : 1,
              },
            ]}
          >
            <CompanyAvatar companyId={membership.companyId} name={title} size="lg" />
            <View style={styles.cardCopy}>
              <Text variant="body" numberOfLines={1} style={styles.cardTitle}>
                {title}
              </Text>
              <View style={styles.metaRow}>
                <Text variant="caption" color="muted" numberOfLines={1}>
                  {role}
                </Text>
                {active ? (
                  <View
                    style={[
                      styles.currentPill,
                      { backgroundColor: colors.primarySubtle },
                    ]}
                  >
                    <Text
                      variant="caption"
                      style={{
                        color: colors.primaryOnSubtle,
                        fontSize: 11,
                        fontWeight: '700',
                        letterSpacing: 0.2,
                      }}
                    >
                      Current
                    </Text>
                  </View>
                ) : null}
              </View>
            </View>
            {switching ? (
              <ActivityIndicator size="small" color={colors.primary} />
            ) : active ? (
              <Animated.View
                entering={
                  reducedMotion
                    ? undefined
                    : FadeIn.duration(duration.fast).easing(autocoreEase)
                }
              >
                <CheckCircle2Icon size="md" color={colors.primary} strokeWidth={2} />
              </Animated.View>
            ) : null}
          </View>
        )}
      </Pressable>
    </Animated.View>
  );
});

/**
 * Organization picker — pageSheet (formSheet blanks RN content).
 * Selecting a workspace covers the sheet with the branded loading splash,
 * switches company, then lands on the home tabs for the new org.
 */
export function SwitchOrganizationScreen() {
  const { colors, isDark } = useTheme();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const reducedMotion = useReducedMotion();
  const { firebaseUser, memberships: authMemberships, refreshProfile } = useAuth();
  const storeMemberships = useAuthStore((s) => s.memberships);
  const { companyId } = useSession();
  const workspaceBlock = useAuthStore((s) => s.workspaceBlock);
  const [switchingId, setSwitchingId] = useState<string | null>(null);
  const [switchingName, setSwitchingName] = useState<string | null>(null);

  const memberships = useMemo(() => {
    if (authMemberships.length > 0) return authMemberships;
    return storeMemberships;
  }, [authMemberships, storeMemberships]);

  const activeCompanyId = useMemo(() => {
    if (
      workspaceBlock?.kind === 'removed' ||
      workspaceBlock?.kind === 'deactivated'
    ) {
      return workspaceBlock.companyId;
    }
    return companyId;
  }, [companyId, workspaceBlock]);

  const ordered = useMemo(() => {
    const list = [...memberships];
    list.sort((a, b) => {
      if (a.companyId === activeCompanyId) return -1;
      if (b.companyId === activeCompanyId) return 1;
      return (a.name || '').localeCompare(b.name || '');
    });
    return list;
  }, [activeCompanyId, memberships]);

  const dismiss = useCallback(() => {
    if (switchingId) return;
    if (router.canGoBack()) {
      router.back();
      return;
    }
    router.replace('/(tabs)/profile' as Href);
  }, [router, switchingId]);

  const enterWorkspace = useCallback(() => {
    // Close the picker and land on home for the new org — no linger.
    if (typeof router.dismissAll === 'function') {
      router.dismissAll();
    }
    router.replace(HOME_HREF);
  }, [router]);

  const handleSwitch = useCallback(
    async (nextCompanyId: string) => {
      if (!firebaseUser || nextCompanyId === activeCompanyId || switchingId) return;

      const membership = memberships.find((entry) => entry.companyId === nextCompanyId);
      const nextName = resolveActiveCompanyName(
        nextCompanyId,
        membership?.name,
        [],
      );

      setSwitchingId(nextCompanyId);
      setSwitchingName(nextName);
      haptics.medium();

      try {
        await switchActiveCompany(firebaseUser.uid, nextCompanyId);
        await refreshProfile();
        await NotificationService.syncInbox();
        haptics.success();
        enterWorkspace();
      } catch (error) {
        haptics.warning();
        setSwitchingId(null);
        setSwitchingName(null);
        toast({
          title: "Couldn't switch organization",
          description: error instanceof Error ? error.message : undefined,
          variant: 'destructive',
        });
      }
    },
    [
      activeCompanyId,
      enterWorkspace,
      firebaseUser,
      memberships,
      refreshProfile,
      switchingId,
    ],
  );

  const openJoin = useCallback(() => {
    if (switchingId) return;
    haptics.selection();
    router.push(JOIN_HREF);
  }, [router, switchingId]);

  const openCreate = useCallback(() => {
    if (switchingId) return;
    haptics.selection();
    router.push(CREATE_HREF);
  }, [router, switchingId]);

  const listEntering = reducedMotion
    ? undefined
    : FadeIn.duration(duration.fast).easing(autocoreEase);
  const listExiting = reducedMotion
    ? undefined
    : FadeOut.duration(duration.instant).easing(autocoreEase);

  const isSwitching = Boolean(switchingId);

  return (
    <View style={{ flex: 1, backgroundColor: colors.background }}>
      <Stack.Screen
        options={{
          title: 'Organizations',
          headerShown: true,
          headerTintColor: colors.primary,
          headerTitleStyle: { color: colors.foreground, fontWeight: '600' },
          headerStyle: { backgroundColor: colors.background },
          headerShadowVisible: false,
          gestureEnabled: !isSwitching,
          headerBlurEffect: isDark ? 'systemChromeMaterialDark' : 'systemChromeMaterialLight',
          headerLeft: () => (
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Close"
              hitSlop={10}
              disabled={isSwitching}
              onPress={dismiss}
              style={{
                minHeight: tokens.control.hitTarget,
                minWidth: tokens.control.hitTarget,
                alignItems: 'center',
                justifyContent: 'center',
                paddingHorizontal: tokens.space.inline,
                opacity: isSwitching ? tokens.opacity.disabled : 1,
              }}
            >
              <Text variant="body" style={{ fontSize: 17, color: colors.primary }}>
                Close
              </Text>
            </Pressable>
          ),
        }}
      />

      <ScrollView
        contentInsetAdjustmentBehavior="automatic"
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{
          flexGrow: 1,
          paddingHorizontal: tokens.space.screenX,
          paddingTop: tokens.space.stack,
          paddingBottom: Math.max(insets.bottom, tokens.space.stack) + tokens.space.section,
          gap: tokens.space.section,
          backgroundColor: colors.background,
        }}
      >
        <View style={{ gap: tokens.space.inline }}>
          <Text
            variant="pageTitle"
            style={{
              fontSize: 28,
              lineHeight: 34,
              fontWeight: '700',
              letterSpacing: -0.7,
            }}
          >
            Switch organization
          </Text>
          <Text variant="body" color="muted" style={{ fontSize: 15, lineHeight: 21 }}>
            Pick the workspace you want to work in. Your account stays the same.
          </Text>
        </View>

        {ordered.length === 0 ? (
          <Animated.View
            entering={listEntering}
            exiting={listExiting}
            style={[
              styles.empty,
              { backgroundColor: colors.secondary, borderColor: colors.border },
            ]}
          >
            <Text variant="body" style={{ fontWeight: '600', textAlign: 'center' }}>
              No companies yet
            </Text>
            <Text variant="caption" color="muted" style={{ textAlign: 'center' }}>
              Join with an invite or create a new workspace.
            </Text>
          </Animated.View>
        ) : (
          <View style={{ gap: tokens.space.stack }}>
            <Text
              variant="meta"
              style={{
                color: colors.mutedForeground,
                fontWeight: '600',
                letterSpacing: 0.4,
                textTransform: 'uppercase',
                fontSize: 12,
              }}
            >
              Your workspaces
            </Text>
            <View style={{ gap: tokens.space.stack }}>
              {ordered.map((membership, index) => (
                <OrganizationCard
                  key={membership.companyId}
                  membership={membership}
                  active={membership.companyId === activeCompanyId}
                  busy={isSwitching}
                  switching={switchingId === membership.companyId}
                  index={index}
                  onPress={() => void handleSwitch(membership.companyId)}
                />
              ))}
            </View>
          </View>
        )}

        <View style={{ gap: tokens.space.stack }}>
          <Text
            variant="meta"
            style={{
              color: colors.mutedForeground,
              fontWeight: '600',
              letterSpacing: 0.4,
              textTransform: 'uppercase',
              fontSize: 12,
            }}
          >
            Add another
          </Text>
          <View style={{ flexDirection: 'row', gap: tokens.space.stack }}>
            <View style={{ flex: 1 }}>
              <Button
                variant="secondary"
                leftIcon={<UsersIcon size="sm" color={colors.foreground} strokeWidth={1.85} />}
                onPress={openJoin}
                disabled={isSwitching}
              >
                Join
              </Button>
            </View>
            <View style={{ flex: 1 }}>
              <Button
                variant="secondary"
                leftIcon={<PlusIcon size="sm" color={colors.foreground} strokeWidth={1.85} />}
                onPress={openCreate}
                disabled={isSwitching}
              >
                Create
              </Button>
            </View>
          </View>
        </View>
      </ScrollView>

      <Modal
        visible={isSwitching}
        animationType={reducedMotion ? 'none' : 'fade'}
        presentationStyle="fullScreen"
        statusBarTranslucent
        onRequestClose={() => {
          // Block Android back while the company swap is in flight.
        }}
      >
        <AppLoadingScreen
          appear={!reducedMotion}
          message={
            switchingName
              ? `Switching to ${switchingName}`
              : 'Switching organization'
          }
          accessibilityLabel={
            switchingName
              ? `Switching to ${switchingName}`
              : 'Switching organization'
          }
        />
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    paddingVertical: 14,
    paddingHorizontal: 14,
    borderRadius: tokens.radius.group,
    minHeight: 76,
  },
  cardCopy: {
    flex: 1,
    minWidth: 0,
    gap: 4,
  },
  cardTitle: {
    fontSize: 17,
    fontWeight: '600',
    letterSpacing: -0.3,
    lineHeight: 22,
  },
  metaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    flexWrap: 'wrap',
  },
  currentPill: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: tokens.radius.full,
  },
  empty: {
    borderWidth: StyleSheet.hairlineWidth,
    borderRadius: tokens.radius.group,
    paddingVertical: tokens.space.section,
    paddingHorizontal: tokens.space.stack,
    gap: tokens.space.inline,
    alignItems: 'center',
  },
});
