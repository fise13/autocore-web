import { useState, type ReactNode } from 'react';
import { Pressable, View } from 'react-native';
import * as Clipboard from 'expo-clipboard';

import { ChevronRightIcon, CopyIcon } from '@/assets/icons';
import { Text, toast } from '@/components/ui';
import { useTheme } from '@/hooks';
import { fontFamily, haptics } from '@/theme';
import { withAlpha } from '@/theme/color-utils';
import type { MotorEntity } from '@/types/motor';

import { EngineGlyph } from './engine-glyph';
import { EngineQualityPill } from './engine-quality-mark';
import { EngineStatusPill } from './engine-status-mark';
import { EngineInkButton, EngineLineButton, engineFrameStyle } from './engine-surface';
import { eng, engFontCap, engType } from '../layout';
import { engineQualityGrade } from '../lib/engine-quality';
import type { DocumentationLine, EngineSpecRow } from '../lib/engine-facts';

/**
 * Identity — the motor it files under, the serial stamped on the block, and
 * the two states a person asks about before anything else.
 *
 * The kicker/serial pairing is the same shape the catalog uses for its section
 * headings, so arriving here from the list feels like opening the row rather
 * than landing on a different screen.
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
  const pressedFill = withAlpha(colors.muted, isDark ? 0.55 : 0.85);

  const copySerial = async () => {
    await Clipboard.setStringAsync(serial);
    haptics.success();
    toast({ title: `${serial} copied`, variant: 'success' });
  };

  return (
    <View style={{ gap: eng.stack }}>
      <View style={{ gap: eng.micro }}>
        <Text
          variant="subheadline"
          color="muted"
          numberOfLines={1}
          maxFontSizeMultiplier={engFontCap.title}
          style={{ fontWeight: '500', letterSpacing: -0.1 }}
        >
          {title}
        </Text>

        <Pressable
          accessibilityRole="button"
          accessibilityLabel={`Copy serial ${serial}`}
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
            variant="identifier"
            maxFontSizeMultiplier={engFontCap.serial}
            numberOfLines={1}
            adjustsFontSizeToFit
            style={{
              ...engType.serial,
              fontFamily: fontFamily.mono,
              flexShrink: 1,
              color: colors.foreground,
              letterSpacing: -0.6,
            }}
          >
            {serial}
          </Text>
          <EngineGlyph
            sf="doc.on.doc"
            fallback={CopyIcon}
            size={15}
            color={withAlpha(colors.mutedForeground, 0.85)}
            weight="medium"
          />
        </Pressable>
      </View>

      <View style={{ flexDirection: 'row', alignItems: 'center', flexWrap: 'wrap', gap: eng.inline }}>
        <EngineStatusPill motor={motor} />
        <EngineQualityPill grade={grade} />
      </View>
    </View>
  );
}

/**
 * Specs, as one ruled sheet.
 *
 * The label states the question, the value answers it, and the rules belong
 * to the frame rather than floating on the page. Codes stay in the identifier
 * face so a shelf still reads like something printed on a shelf.
 */
export function EngineSpecList({ rows }: { rows: EngineSpecRow[] }) {
  const { colors } = useTheme();

  if (rows.length === 0) return null;

  return (
    <View style={engineFrameStyle(colors)}>
      {rows.map((row, index) => (
        <View
          key={row.id}
          style={{
            minHeight: eng.rowMin,
            paddingVertical: eng.stack,
            paddingHorizontal: eng.stack + 2,
            flexDirection: 'row',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: eng.stack,
            borderTopWidth: index === 0 ? 0 : eng.rule,
            borderTopColor: colors.border,
          }}
        >
          <Text variant="subheadline" color="muted" style={engType.specLabel}>
            {row.label}
          </Text>
          <Text
            variant={row.mono ? 'identifier' : 'callout'}
            numberOfLines={1}
            style={{
              flexShrink: 1,
              textAlign: 'right',
              fontVariant: ['tabular-nums'],
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

/** Section label over a block — sentence case, quiet, never a stamp. */
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

/** Free text the shop wrote — a ruled quote, not a caption. */
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
 * Documentation — a count and a name, never a percentage bar.
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
        padding: eng.stack + 2,
        backgroundColor: pressed ? colors.muted : colors.card,
        flexDirection: 'row',
        alignItems: 'center',
        gap: eng.stack,
      }}
    >
      <View style={{ flex: 1, gap: 4, minWidth: 0 }}>
        <Text variant="callout" style={{ fontWeight: '600', fontVariant: ['tabular-nums'] }}>
          {line.headline}
        </Text>
        <Text variant="footnote" numberOfLines={2} style={{ color: chrome.fg }}>
          {line.detail}
        </Text>
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
      accessibilityLabel={`Documentation, ${line.headline}, ${line.detail}`}
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
 * The verbs, as a document row under the identity.
 *
 * One charcoal primary, the rest hairline. Nothing is drawn disabled: a greyed
 * button on a permission boundary only teaches people to tap it twice.
 */
export function EngineActionCluster({
  canSell,
  canAddToOrder,
  canRelocate,
  relocating,
  onSell,
  onAddToOrder,
  onRelocate,
}: {
  canSell: boolean;
  canAddToOrder: boolean;
  canRelocate: boolean;
  relocating: boolean;
  onSell: () => void;
  onAddToOrder: () => void;
  onRelocate: () => void;
}) {
  if (!canSell && !canAddToOrder && !canRelocate) return null;

  const lineButtons = (
    <>
      {canAddToOrder && canSell ? (
        <EngineLineButton label="Add to order" flex onPress={onAddToOrder} />
      ) : null}
      {canRelocate && (canSell || canAddToOrder) ? (
        <EngineLineButton
          label="Relocate"
          flex
          loading={relocating}
          onPress={onRelocate}
        />
      ) : null}
    </>
  );

  const extras =
    (canSell && canAddToOrder) || (canSell && canRelocate) || (!canSell && canAddToOrder && canRelocate);

  return (
    <View style={{ gap: eng.inline }}>
      {canSell ? (
        <EngineInkButton label="Sell" onPress={onSell} />
      ) : canAddToOrder ? (
        <EngineInkButton label="Add to order" onPress={onAddToOrder} />
      ) : (
        <EngineInkButton label="Relocate" loading={relocating} onPress={onRelocate} />
      )}
      {extras ? (
        <View style={{ flexDirection: 'row', gap: eng.inline }}>{lineButtons}</View>
      ) : null}
    </View>
  );
}
