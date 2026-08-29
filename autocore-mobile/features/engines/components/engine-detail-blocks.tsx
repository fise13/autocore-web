import { useState, type ReactNode } from 'react';
import { Pressable, View } from 'react-native';
import * as Clipboard from 'expo-clipboard';

import {
  ChevronRightIcon,
  CopyIcon,
  LockIcon,
  MapPinIcon,
  ShoppingCartIcon,
} from '@/assets/icons';
import { Button, Text, toast } from '@/components/ui';
import { useTheme } from '@/hooks';
import { fontFamily, haptics } from '@/theme';
import { pressedRowFill, withAlpha } from '@/theme/color-utils';
import type { MotorEntity } from '@/types/motor';

import { EngineGlyph } from './engine-glyph';
import { EngineStatusPill } from './engine-status-mark';
import { engineFrameStyle } from './engine-surface';
import { eng, engFontCap, engType } from '../layout';
import {
  engineQualityGrade,
  engineQualityGradeLabel,
  engineQualityToneForGrade,
} from '../lib/engine-quality';
import type { MotorQualityGrade } from '@autocore/engine-intake';
import type { DocumentationLine, EngineSpecRow } from '../lib/engine-facts';

const GRADE_FILL: Record<MotorQualityGrade, number> = { '2': 3, '1': 2, '3': 1 };
const BAR_HEIGHTS = [6, 9, 12];

/**
 * Grade as a three-step meter.
 *
 * It used to be a second tinted pill beside the status, and an Excellent unit
 * therefore showed two green pills in a row — the eye read one signal twice and
 * neither carried its own meaning. Bars encode the grade by height, so the
 * status keeps the colour and the grade keeps the shape.
 */
function EngineGradeMeter({ grade }: { grade: MotorQualityGrade | null }) {
  const { colors, tones } = useTheme();
  const tone = engineQualityToneForGrade(grade);
  const filled = grade ? GRADE_FILL[grade] : 0;
  const ink = tone === 'muted' ? colors.mutedForeground : tones[tone].fg;

  return (
    <View
      accessible
      accessibilityRole="text"
      accessibilityLabel={grade ? `Grade ${engineQualityGradeLabel(grade)}` : 'Ungraded'}
      style={{
        height: 22,
        paddingHorizontal: 9,
        borderRadius: eng.pillRadius,
        flexDirection: 'row',
        alignItems: 'center',
        gap: 6,
        backgroundColor: colors.secondary,
        borderWidth: eng.rule,
        borderColor: colors.border,
      }}
    >
      <View style={{ flexDirection: 'row', alignItems: 'flex-end', gap: 2 }}>
        {BAR_HEIGHTS.map((height, index) => (
          <View
            key={height}
            style={{
              width: 3,
              height,
              borderRadius: 1,
              backgroundColor: index < filled ? ink : withAlpha(colors.mutedForeground, 0.28),
            }}
          />
        ))}
      </View>
      <Text
        variant="caption1"
        maxFontSizeMultiplier={engFontCap.control}
        style={{ color: colors.foreground, fontWeight: '600' }}
      >
        {grade ? engineQualityGradeLabel(grade) : 'Ungraded'}
      </Text>
    </View>
  );
}

/**
 * Identity block.
 *
 * The motor leads and the serial supports it. It used to be the other way
 * round — a 34pt serial over a muted model line — which read as a barcode with
 * a footnote. On a shelf you find the unit by its serial, but on a screen you
 * have already found it: the question the page answers is *what is this*.
 */
export function EngineIdentity({
  motor,
  serial,
  title,
}: {
  motor: MotorEntity;
  serial: string;
  title: string;
}) {
  const { colors, isDark } = useTheme();
  const [pressed, setPressed] = useState(false);
  const grade = engineQualityGrade(motor);
  const pressedFill = pressedRowFill(colors.muted, isDark);

  const copySerial = async () => {
    await Clipboard.setStringAsync(serial);
    haptics.success();
    toast({ title: `${serial} copied`, variant: 'success' });
  };

  return (
    <View style={{ gap: eng.stack }}>
      <View style={{ gap: eng.micro }}>
        <Text
          variant="title2"
          numberOfLines={2}
          maxFontSizeMultiplier={engFontCap.title}
          style={{ color: colors.foreground, fontWeight: '700', letterSpacing: -0.4 }}
        >
          {title}
        </Text>

        <Pressable
          accessibilityRole="button"
          accessibilityLabel={`Copy serial ${serial}`}
          hitSlop={6}
          onPressIn={() => setPressed(true)}
          onPressOut={() => setPressed(false)}
          onPress={() => void copySerial()}
          style={{
            alignSelf: 'flex-start',
            flexDirection: 'row',
            alignItems: 'center',
            gap: eng.inline,
            paddingVertical: eng.micro,
            paddingHorizontal: eng.tight,
            marginHorizontal: -eng.tight,
            borderRadius: eng.radius,
            maxWidth: '100%',
            backgroundColor: pressed ? pressedFill : 'transparent',
          }}
        >
          <Text
            variant="subheadline"
            maxFontSizeMultiplier={engFontCap.control}
            numberOfLines={1}
            style={{
              fontFamily: fontFamily.mono,
              flexShrink: 1,
              color: colors.mutedForeground,
              letterSpacing: -0.1,
            }}
          >
            {serial}
          </Text>
          <EngineGlyph
            sf="doc.on.doc"
            fallback={CopyIcon}
            size={14}
            color={withAlpha(colors.mutedForeground, 0.8)}
            weight="medium"
          />
        </Pressable>
      </View>

      <View style={{ flexDirection: 'row', alignItems: 'center', flexWrap: 'wrap', gap: eng.inline }}>
        <EngineStatusPill motor={motor} />
        <EngineGradeMeter grade={grade} />
      </View>
    </View>
  );
}

/**
 * Details as a two-column card.
 *
 * The old shape was a ruled label→value ledger, one fact per full-width line.
 * Four facts made four rules and a lot of empty middle; paired cells read in
 * one glance and halve the vertical cost.
 */
export function EngineSpecList({ rows }: { rows: EngineSpecRow[] }) {
  const { colors } = useTheme();

  if (rows.length === 0) return null;

  return (
    <View
      style={{
        ...engineFrameStyle(colors),
        padding: eng.block,
        flexDirection: 'row',
        flexWrap: 'wrap',
        rowGap: eng.block,
      }}
    >
      {rows.map((row) => (
        <View key={row.id} style={{ width: '50%', gap: eng.micro, paddingRight: eng.stack }}>
          <Text
            variant="caption2"
            color="muted"
            numberOfLines={1}
            maxFontSizeMultiplier={engFontCap.control}
            style={{ textTransform: 'uppercase', letterSpacing: 0.6, fontWeight: '600' }}
          >
            {row.label}
          </Text>
          <Text
            variant="headline"
            numberOfLines={1}
            adjustsFontSizeToFit
            minimumFontScale={0.8}
            maxFontSizeMultiplier={engFontCap.body}
            style={{
              fontVariant: ['tabular-nums'],
              fontFamily: row.mono ? fontFamily.mono : undefined,
              color: row.tone === 'warning' ? colors.warningOnSubtle : colors.foreground,
            }}
          >
            {row.value}
          </Text>
        </View>
      ))}
    </View>
  );
}

export function EngineChapter({
  title,
  children,
}: {
  title: string;
  children: ReactNode;
}) {
  return (
    <View style={{ gap: eng.inline }}>
      <Text
        variant="sectionLabel"
        color="muted"
        style={{ ...engType.section, letterSpacing: 0.2 }}
      >
        {title}
      </Text>
      {children}
    </View>
  );
}

export function EngineNoteBody({ children }: { children: ReactNode }) {
  const { colors } = useTheme();

  return (
    <View
      style={{
        ...engineFrameStyle(colors),
        padding: eng.block,
      }}
    >
      <Text variant="body" style={{ ...engType.body, color: colors.foreground, lineHeight: 24 }}>
        {children}
      </Text>
    </View>
  );
}

/**
 * Documentation status.
 *
 * The sentence that names the blocker ("7 shots block sale") now lives on the
 * Sell control, where the person is when they hit the wall. Printing it here
 * too said the same thing twice on one screen, so this card went back to what
 * it is good at: how much is done, and a way in.
 */
export function EngineDocumentationRow({
  line,
  onPress,
}: {
  line: DocumentationLine;
  onPress?: () => void;
}) {
  const { colors, tones } = useTheme();
  const [pressed, setPressed] = useState(false);

  const chrome =
    line.tone === 'danger' ? tones.danger : line.tone === 'warning' ? tones.warning : tones.success;

  const body = (
    <View
      style={{
        ...engineFrameStyle(colors),
        opacity: pressed ? 0.72 : 1,
        minHeight: eng.rowMin,
        paddingVertical: eng.stack + 1,
        paddingHorizontal: eng.stack + 2,
        flexDirection: 'row',
        alignItems: 'center',
        gap: eng.stack,
      }}
    >
      <View style={{ flex: 1, minWidth: 0, gap: 7 }}>
        <View style={{ flexDirection: 'row', alignItems: 'baseline', justifyContent: 'space-between', gap: eng.inline }}>
          <Text variant="subheadline" style={{ fontWeight: '600', color: colors.foreground }}>
            Intake shots
          </Text>
          <Text
            variant="footnote"
            style={{
              fontFamily: fontFamily.mono,
              fontWeight: '500',
              color: colors.mutedForeground,
              fontVariant: ['tabular-nums'],
            }}
          >
            {line.headline}
          </Text>
        </View>

        <View
          accessible
          accessibilityRole="progressbar"
          accessibilityValue={{ text: line.headline }}
          style={{
            height: 4,
            borderRadius: 2,
            overflow: 'hidden',
            backgroundColor: withAlpha(colors.mutedForeground, 0.22),
          }}
        >
          <View
            style={{
              width: `${Math.round(Math.min(Math.max(line.ratio, 0), 1) * 100)}%`,
              height: '100%',
              backgroundColor: chrome.fg,
            }}
          />
        </View>
      </View>

      {onPress ? (
        <EngineGlyph
          sf="chevron.right"
          fallback={ChevronRightIcon}
          size={12}
          color={withAlpha(colors.mutedForeground, 0.6)}
          weight="semibold"
        />
      ) : null}
    </View>
  );

  if (!onPress) return body;

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={`Documentation, ${line.headline} shots, ${line.detail}`}
      onPressIn={() => setPressed(true)}
      onPressOut={() => setPressed(false)}
      onPress={() => {
        haptics.selection();
        onPress();
      }}
    >
      {body}
    </Pressable>
  );
}

/**
 * Verbs for the unit.
 *
 * When paperwork gates the sale, Sell is not a greyed-out rectangle with the
 * reason printed underneath it — that states a problem and offers nothing to do
 * about it, and the reason ended up on screen twice. It becomes one control
 * that names the gate and opens it.
 */
export function EngineActionCluster({
  canSell,
  canAddToOrder,
  canRelocate,
  relocating,
  sellGate,
  onSell,
  onAddToOrder,
  onRelocate,
}: {
  canSell: boolean;
  canAddToOrder: boolean;
  canRelocate: boolean;
  relocating: boolean;
  /** Set when documentation blocks the sale; `onPress` goes to the fix. */
  sellGate?: { label: string; hint: string; onPress?: () => void } | null;
  onSell: () => void;
  onAddToOrder: () => void;
  onRelocate: () => void;
}) {
  const { colors, tones } = useTheme();
  const [gatePressed, setGatePressed] = useState(false);

  if (!canSell && !canAddToOrder && !canRelocate) return null;

  // The two slots sit on different fills, so each takes its own ink.
  const orderIcon = <ShoppingCartIcon size="sm" color={colors.foreground} strokeWidth={1.85} />;
  const relocateIcon = <MapPinIcon size="sm" color={colors.foreground} strokeWidth={1.85} />;
  const orderIconLead = (
    <ShoppingCartIcon size="sm" color={colors.primaryForeground} strokeWidth={1.85} />
  );
  const relocateIconLead = (
    <MapPinIcon size="sm" color={colors.primaryForeground} strokeWidth={1.85} />
  );

  const secondary = (
    <>
      {canAddToOrder && canSell ? (
        <Button
          key="order"
          variant="outline"
          style={{ flex: 1, backgroundColor: colors.card }}
          leftIcon={orderIcon}
          onPress={onAddToOrder}
        >
          Add to order
        </Button>
      ) : null}
      {canRelocate && (canSell || canAddToOrder) ? (
        <Button
          key="relocate"
          variant="outline"
          style={{ flex: 1, backgroundColor: colors.card }}
          leftIcon={relocateIcon}
          loading={relocating}
          onPress={onRelocate}
        >
          Relocate
        </Button>
      ) : null}
    </>
  );

  const hasSecondary =
    (canSell && canAddToOrder) || (canSell && canRelocate) || (!canSell && canAddToOrder && canRelocate);

  const gate = sellGate ? (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={`${sellGate.label}. ${sellGate.hint}`}
      disabled={!sellGate.onPress}
      onPressIn={() => setGatePressed(true)}
      onPressOut={() => setGatePressed(false)}
      onPress={() => {
        haptics.warning();
        sellGate.onPress?.();
      }}
      style={{
        minHeight: eng.control,
        paddingHorizontal: eng.stack + 2,
        borderRadius: eng.radius,
        flexDirection: 'row',
        alignItems: 'center',
        gap: eng.stack,
        backgroundColor: tones.danger.bg,
        borderWidth: eng.rule,
        borderColor: tones.danger.border,
        opacity: gatePressed ? 0.72 : 1,
      }}
    >
      <LockIcon size="sm" color={tones.danger.fg} strokeWidth={1.9} />
      <View style={{ flex: 1, minWidth: 0 }}>
        <Text variant="subheadline" numberOfLines={1} style={{ fontWeight: '600', color: tones.danger.fg }}>
          {sellGate.label}
        </Text>
        <Text variant="caption1" numberOfLines={1} color="muted" style={{ marginTop: 1 }}>
          {sellGate.hint}
        </Text>
      </View>
      {sellGate.onPress ? (
        <EngineGlyph
          sf="chevron.right"
          fallback={ChevronRightIcon}
          size={12}
          color={withAlpha(tones.danger.fg, 0.75)}
          weight="semibold"
        />
      ) : null}
    </Pressable>
  ) : null;

  return (
    <View style={{ gap: eng.inline }}>
      {canSell ? (
        (gate ?? (
          <Button size="lg" onPress={onSell}>
            Sell
          </Button>
        ))
      ) : canAddToOrder ? (
        <Button size="lg" leftIcon={orderIconLead} onPress={onAddToOrder}>
          Add to order
        </Button>
      ) : (
        <Button size="lg" leftIcon={relocateIconLead} loading={relocating} onPress={onRelocate}>
          Relocate
        </Button>
      )}
      {hasSecondary ? (
        <View style={{ flexDirection: 'row', gap: eng.inline }}>{secondary}</View>
      ) : null}
    </View>
  );
}
