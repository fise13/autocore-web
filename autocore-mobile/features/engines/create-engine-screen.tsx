import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { View, type NativeScrollEvent, type NativeSyntheticEvent } from 'react-native';
import { Stack, useLocalSearchParams, useRouter } from 'expo-router';

import { AlertTriangleIcon, CheckCircle2Icon } from '@/assets/icons';
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
import { useSession, useTheme } from '@/hooks';
import { useSessionQueryData } from '@/hooks/use-session-query-data';
import { motorRepository } from '@/services/firestore/motor-repository';
import { haptics, tokens } from '@/theme';
import type { MotorEntity } from '@/types/motor';

import { EngineGlyph } from './components/engine-glyph';
import { engineFrameStyle } from './components/engine-surface';
import { eng } from './layout';

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
 * Add a serialized engine to the catalog.
 *
 * Replaces the inline spreadsheet pad that used to sit above the list. That pad
 * committed on blur, gave no confirmation, and had nowhere to say "this serial
 * already exists" — so the same block could be filed twice and nobody found out
 * until two cards disagreed. This is the same composer shape as the ledger's
 * New Operation sheet: Cancel · title · Add, one grouped form, one save.
 */
export function CreateEngineScreen() {
  const router = useRouter();
  const { colors } = useTheme();
  const { companyId, uid, can } = useSession();
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

  // Same key SessionRealtimeHead already listens on — read only, never a second
  // motors listener, and it gives the duplicate check a catalog for free.
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
  const canSubmit = canEdit && canSaveEngineDraft(check) && phase === 'idle';

  const onSubmit = useCallback(async () => {
    if (!uid || !companyId || !canEdit) return;

    // Re-check rather than trust the render-time verdict: the listener may
    // have delivered the colliding unit while this form was open.
    const verdict = checkEngineDraft(draft, motors);
    if (verdict.status === 'incomplete') {
      setError('Enter the serial stamped on the block.');
      return;
    }
    if (verdict.status === 'duplicate') {
      setError(`Serial ${verdict.existing.serialCode} is already in the catalog.`);
      return;
    }

    setError(null);
    setPhase('submitting');
    haptics.light();

    try {
      await motorRepository.create(uid, { companyId, ...toEngineCreateInput(draft) }, motors);
      haptics.success();
      // Confirm on the button the user just pressed, then close. No toast — the
      // engine is on the list behind the sheet, which says it better.
      setPhase('success');
      dismissTimer.current = setTimeout(dismiss, SUCCESS_HOLD_MS);
    } catch (caught) {
      haptics.warning();
      setPhase('idle');
      const message = caught instanceof Error ? caught.message : 'Could not add this engine';
      setError(message);
      toast({ title: 'Engine was not added', description: message, variant: 'destructive' });
    }
  }, [canEdit, companyId, dismiss, draft, motors, uid]);

  if (!canEdit) {
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
            Your role cannot add engines to the catalog.
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
            onSubmit={() => void onSubmit()}
            submitLabel="Add"
            successLabel="Added"
            canSubmit={canSubmit}
            phase={phase}
            scrolled={scrolled}
          />
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
          One unit, one card. The serial is enough. Brand and code decide which
          heading it files under.
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

/**
 * Says what the save will do before it happens: which heading the unit files
 * under, or why the serial is a problem. A duplicate is stated as a refusal, a
 * near match as a question — the wording carries the difference, not just colour.
 */
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
          gap: eng.stack,
          padding: eng.stack + 2,
          ...engineFrameStyle(colors),
          backgroundColor: blocking ? colors.dangerSubtle : colors.warningSubtle,
          borderColor: blocking ? colors.dangerBorder : colors.warningBorder,
        }}
      >
        <EngineGlyph
          sf="exclamationmark.triangle"
          fallback={AlertTriangleIcon}
          size={17}
          color={ink}
          weight="medium"
        />
        <View style={{ flex: 1, gap: eng.micro, minWidth: 0 }}>
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
        gap: eng.tight,
        paddingHorizontal: eng.micro,
      }}
    >
      <EngineGlyph
        sf="checkmark.circle"
        fallback={CheckCircle2Icon}
        size={14}
        color={colors.successOnSubtle}
        weight="medium"
      />
      <Text variant="caption" color="muted" numberOfLines={1} style={{ flexShrink: 1 }}>
        Files under {draftVariantLabel(draft)}.
      </Text>
    </View>
  );
}
