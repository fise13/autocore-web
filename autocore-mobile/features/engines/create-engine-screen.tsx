import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { StyleSheet, View, type NativeScrollEvent, type NativeSyntheticEvent } from 'react-native';
import { Stack, useLocalSearchParams, useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { AlertTriangleIcon, CameraIcon, CheckCircle2Icon } from '@/assets/icons';
import {
  AutocompleteInput,
  Button,
  InputField,
  KeyboardFormShell,
  Text,
  toast,
} from '@/components/ui';
import { CoSheetHeader, type CoSubmitPhase } from '@/features/accounting/components/co-sheet-header';
import {
  FormListRow,
  GroupedList,
  GroupedSection,
} from '@/features/orders/components/create-order/grouped-form';
import { openEngineIntakeSession } from '@/features/engine-intake/lib/open-engine-intake';
import { queueOptimisticIntakeCreate } from '@/features/engine-intake/lib/start-intake-session';
import { useSession, useTheme } from '@/hooks';
import { useSessionQueryData } from '@/hooks/use-session-query-data';
import { motorRepository } from '@/services/firestore/motor-repository';
import { haptics, spacing, tokens } from '@/theme';
import type { MotorEntity } from '@/types/motor';

import {
  canSaveEngineDraft,
  checkEngineDraft,
  draftVariantLabel,
  emptyEngineDraft,
  toEngineCreateInput,
  type EngineDraft,
} from './lib/engine-draft';
import { engineUnitLocation } from './lib/engine-variants';

/** Matches the ledger composer — long enough to read the tick, short enough not to wait. */
const SUCCESS_HOLD_MS = 420;

function pickParam(value: string | string[] | undefined): string {
  if (typeof value === 'string') return value.trim();
  if (Array.isArray(value) && typeof value[0] === 'string') return value[0].trim();
  return '';
}

/**
 * Receive an engine: photograph (intake) or file without photos (catalog).
 */
export function CreateEngineScreen() {
  const router = useRouter();
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();
  const { companyId, uid, can, profile } = useSession();
  const params = useLocalSearchParams<{
    serial?: string;
    brand?: string;
    code?: string;
    location?: string;
  }>();

  const [draft, setDraft] = useState<EngineDraft>(() => ({
    ...emptyEngineDraft(),
    serial: pickParam(params.serial),
    brand: pickParam(params.brand),
    code: pickParam(params.code),
    location: pickParam(params.location),
  }));
  const [phase, setPhase] = useState<CoSubmitPhase>('idle');
  const [scrolled, setScrolled] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const dismissTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const canEdit = can('inventory_edit');
  const canPhotograph = can('engine_intake_execute');
  const canAdd = canEdit || canPhotograph;

  const motorsKey = useMemo(
    () => ['realtime', 'motors', companyId, uid] as const,
    [companyId, uid],
  );
  const motors = useSessionQueryData<MotorEntity[]>(
    motorsKey,
    Boolean(companyId && uid) && canEdit,
    [],
  );
  useEffect(
    () => () => {
      if (dismissTimer.current) clearTimeout(dismissTimer.current);
    },
    [],
  );

  const onScroll = useCallback((event: NativeSyntheticEvent<NativeScrollEvent>) => {
    const next = event.nativeEvent.contentOffset.y > 6;
    setScrolled((current) => (current === next ? current : next));
  }, []);

  const patch = useCallback((next: Partial<EngineDraft>) => {
    setError(null);
    setDraft((current) => ({ ...current, ...next }));
  }, []);

  const dismiss = useCallback(() => {
    haptics.selection();
    if (router.canGoBack()) router.back();
  }, [router]);

  const check = useMemo(() => checkEngineDraft(draft, motors), [draft, motors]);
  const identityReady = canSaveEngineDraft(check) && phase === 'idle';
  const canSubmitCatalog = identityReady && canEdit;

  const failSerial = useCallback((verdict: ReturnType<typeof checkEngineDraft>): boolean => {
    if (verdict.status === 'incomplete') {
      setError('Enter the serial stamped on the block.');
      return true;
    }
    if (verdict.status === 'duplicate') {
      setError(`Serial ${verdict.existing.serialCode} is already in the catalog.`);
      return true;
    }
    return false;
  }, []);

  const onPhotograph = useCallback(() => {
    if (!uid || !companyId || !canPhotograph) return;
    const verdict = checkEngineDraft(draft, motors);
    if (failSerial(verdict)) return;

    setError(null);
    haptics.light();
    const { jobId, sessionId } = queueOptimisticIntakeCreate({
      companyId,
      uid,
      displayName: profile?.displayName ?? null,
      identity: {
        serialCode: draft.serial.trim(),
        brandName: draft.brand.trim(),
        engineCode: draft.code.trim(),
      },
    });
    haptics.success();
    if (router.canGoBack()) router.back();
    openEngineIntakeSession(router, jobId, sessionId);
  }, [canPhotograph, companyId, draft, failSerial, motors, profile?.displayName, router, uid]);

  const onSaveWithoutPhotos = useCallback(async () => {
    if (!uid || !companyId || !canEdit) return;

    const verdict = checkEngineDraft(draft, motors);
    if (failSerial(verdict)) return;

    setError(null);
    setPhase('submitting');
    haptics.light();

    try {
      await motorRepository.create(uid, { companyId, ...toEngineCreateInput(draft) }, motors);
      haptics.success();
      setPhase('success');
      dismissTimer.current = setTimeout(dismiss, SUCCESS_HOLD_MS);
    } catch (caught) {
      haptics.warning();
      setPhase('idle');
      const message = caught instanceof Error ? caught.message : 'Could not add this engine';
      setError(message);
      toast({ title: 'Engine was not added', description: message, variant: 'destructive' });
    }
  }, [canEdit, companyId, dismiss, draft, failSerial, motors, uid]);

  if (!canAdd) {
    return (
      <View style={{ flex: 1, backgroundColor: colors.background }}>
        <Stack.Screen options={{ headerShown: false, title: 'Add engine' }} />
        <CoSheetHeader title="Add engine" onCancel={dismiss} />
        <View
          style={{
            flex: 1,
            alignItems: 'center',
            justifyContent: 'center',
            padding: tokens.space.section,
            gap: tokens.space.stack,
          }}
        >
          <Text variant="body" color="muted" style={{ textAlign: 'center' }}>
            Your role cannot add engines.
          </Text>
          <Button variant="outline" native={false} onPress={dismiss}>
            Close
          </Button>
        </View>
      </View>
    );
  }

  return (
    <View style={{ flex: 1, backgroundColor: colors.background }}>
      <Stack.Screen options={{ headerShown: false, title: 'Add engine' }} />
      <KeyboardFormShell
        backgroundColor={colors.background}
        contentInsetAdjustmentBehavior="never"
        onScroll={onScroll}
        scrollEventThrottle={16}
        header={
          <CoSheetHeader
            title="Add engine"
            onCancel={dismiss}
            onSubmit={canPhotograph ? undefined : () => void onSaveWithoutPhotos()}
            submitLabel="Add"
            successLabel="Added"
            canSubmit={canSubmitCatalog}
            phase={phase}
            scrolled={scrolled}
          />
        }
        footer={
          canPhotograph ? (
            <View
              style={{
                paddingHorizontal: tokens.space.screenX,
                paddingTop: tokens.space.stack,
                paddingBottom: Math.max(insets.bottom, tokens.space.stack),
                gap: tokens.space.stack,
                backgroundColor: colors.background,
                borderTopWidth: StyleSheet.hairlineWidth,
                borderTopColor: colors.border,
              }}
            >
              <Button
                size="xl"
                native={false}
                disabled={!identityReady}
                accessibilityLabel="Photograph this engine"
                leftIcon={
                  <CameraIcon
                    size={20}
                    color={identityReady ? colors.primaryForeground : colors.mutedForeground}
                    strokeWidth={2.2}
                  />
                }
                onPress={onPhotograph}
              >
                Photograph
              </Button>
              {canEdit ? (
                <Button
                  variant="outline"
                  native={false}
                  disabled={!identityReady}
                  onPress={() => void onSaveWithoutPhotos()}
                >
                  Save without photos
                </Button>
              ) : null}
            </View>
          ) : null
        }
        contentContainerStyle={{
          paddingHorizontal: tokens.space.screenX,
          paddingTop: tokens.space.stack,
          paddingBottom: tokens.space.section,
          gap: tokens.space.section - 4,
        }}
      >
        <Text
          variant="footnote"
          color="muted"
          style={{ paddingHorizontal: tokens.space.micro, letterSpacing: -0.08 }}
        >
          {canPhotograph
            ? 'Serial first. Photograph opens the camera — photos upload in the background.'
            : 'One unit, one card. The serial is enough. Brand and code decide which heading it files under.'}
        </Text>

        <GroupedSection title="Identity">
          <GroupedList>
            <FormListRow label="Serial" required hint="Stamped on the block">
              <InputField
                variant="plain"
                placeholder="U398539"
                value={draft.serial}
                onChangeText={(serial) => patch({ serial })}
                autoFocus
                autoCapitalize="characters"
                autoCorrect={false}
                returnKeyType="next"
                tone={check.status === 'duplicate' ? 'error' : undefined}
              />
            </FormListRow>
            <FormListRow label="Brand">
              <AutocompleteInput
                source="manufacturer"
                context={{ field: 'brand' }}
                placeholder="Toyota"
                value={draft.brand}
                onValueChange={(brand) => patch({ brand })}
                autoCorrect={false}
              />
            </FormListRow>
            <FormListRow label="Engine code" last>
              <AutocompleteInput
                source="engineCode"
                placeholder="2AZ-FE"
                value={draft.code}
                onValueChange={(code) => patch({ code })}
                autoCapitalize="characters"
                autoCorrect={false}
              />
            </FormListRow>
          </GroupedList>
        </GroupedSection>

        <GroupedSection title="Placement">
          <GroupedList>
            <FormListRow label="Shelf" last hint="Empty = unplaced">
              <AutocompleteInput
                source="warehouse"
                fieldKey="warehouseLocation"
                placeholder="A-12"
                value={draft.location}
                onValueChange={(location) => patch({ location })}
                autoCapitalize="characters"
                autoCorrect={false}
              />
            </FormListRow>
          </GroupedList>
        </GroupedSection>

        <DraftVerdict check={check} draft={draft} />

        {error ? (
          <Text variant="caption" color="destructive" style={{ paddingHorizontal: tokens.space.micro }}>
            {error}
          </Text>
        ) : null}
      </KeyboardFormShell>
    </View>
  );
}

function DraftVerdict({
  check,
  draft,
}: {
  check: ReturnType<typeof checkEngineDraft>;
  draft: EngineDraft;
}) {
  const { colors } = useTheme();

  if (check.status === 'incomplete') return null;

  if (check.status === 'duplicate' || check.status === 'similar') {
    const blocking = check.status === 'duplicate';
    const where = engineUnitLocation(check.existing);
    const ink = blocking ? colors.dangerOnSubtle : colors.warningOnSubtle;

    return (
      <View
        style={{
          flexDirection: 'row',
          gap: spacing[3],
          padding: spacing[3.5],
          borderRadius: tokens.radius.modal,
          borderWidth: tokens.control.hairline,
          backgroundColor: blocking ? colors.dangerSubtle : colors.warningSubtle,
          borderColor: blocking ? colors.dangerBorder : colors.warningBorder,
        }}
      >
        <AlertTriangleIcon size={17} color={ink} strokeWidth={1.85} />
        <View style={{ flex: 1, gap: spacing[1], minWidth: 0 }}>
          <Text variant="footnote" style={{ fontWeight: '600', color: ink }}>
            {blocking ? 'This serial is already in the catalog' : 'A very similar serial exists'}
          </Text>
          <Text variant="caption" style={{ color: ink }}>
            {check.existing.serialCode}
            {where ? ` · ${where}` : ' · no location'}
            {blocking
              ? '. Change the serial, or open that unit instead.'
              : '. Add it anyway if this really is a different block.'}
          </Text>
        </View>
      </View>
    );
  }

  return (
    <View
      style={{
        flexDirection: 'row',
        alignItems: 'center',
        gap: spacing[1.5],
        paddingHorizontal: spacing[1],
      }}
    >
      <CheckCircle2Icon size={14} color={colors.successOnSubtle} strokeWidth={1.85} />
      <Text variant="caption" color="muted" numberOfLines={1} style={{ flexShrink: 1 }}>
        Files under {draftVariantLabel(draft)}.
      </Text>
    </View>
  );
}
