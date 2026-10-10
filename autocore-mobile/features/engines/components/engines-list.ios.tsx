import { useCallback, useMemo, useRef, useState, type RefObject } from 'react';
import * as Clipboard from 'expo-clipboard';
import {
  Button,
  ContextMenu,
  HStack,
  Host,
  Image,
  List,
  Picker,
  ProgressView,
  Section,
  Spacer,
  SwipeActions,
  Text,
  TextField,
  VStack,
  useNativeState,
  type TextFieldRef,
} from '@expo/ui/swift-ui';
import { useScrollGeometryChange } from '@expo/ui/swift-ui/modifiers';
import {
  autocorrectionDisabled,
  aspectRatio,
  background,
  clipShape,
  font,
  foregroundStyle,
  frame,
  lineLimit,
  listRowBackground,
  listRowInsets,
  listRowSeparator,
  listSectionMargins,
  listStyle,
  monospacedDigit,
  onAppear,
  onTapGesture,
  padding,
  onSubmit,
  pickerStyle,
  resizable,
  scrollContentBackground,
  scrollDismissesKeyboard,
  shapes,
  submitLabel,
  tag,
  textInputAutocapitalization,
  tint,
} from '@expo/ui/swift-ui/modifiers';
import type { SFSymbol } from 'sf-symbols-typescript';

import { toast } from '@/components/ui';
import { CATALOG_NAV_BAR_ROW } from '@/components/ui/catalog-nav-bar';
import { useSession, useTheme } from '@/hooks';
import { useNativeThumbnail } from '@/lib/swiftui/native-thumbnail';
import { rhythm } from '@/theme/screen';
import { tokens } from '@/theme/tokens';
import type { MotorEntity } from '@/types/motor';

import { ENGINE_THUMB_SIZE } from './engine-thumbnail';
import type { EngineListHeader, EnginesListProps } from './engines-list.types';
import { eng } from '../layout';
import {
  ENGINE_LIST_PAGE,
  groupEngineRowsIntoSections,
  limitEngineSections,
  type EngineUnitRow,
} from '../lib/engine-list-sections';
import { engineQualityLabel } from '../lib/engine-quality';
import {
  engineRowActions,
  engineRowCapabilities,
  engineRowSwipeAction,
  type EngineRowAction,
  type EngineRowActionId,
  type EngineRowCapabilities,
} from '../lib/engine-row-actions';
import {
  engineStatusLabel,
  engineStatusTone,
  engineThumbnailUrl,
  engineUnitLabel,
  engineUnitLocation,
  type EngineStatusTone,
} from '../lib/engine-variants';

export type { EnginesListProps };

/**
 * The Engines list, drawn by UIKit.
 *
 * Every row here is SwiftUI — the same shape Work Orders uses — so holding one
 * produces the *system* context menu: the lift, the blur behind it, the haptic
 * and the dismissal are all UIKit's, not a 400-line reimplementation in
 * JavaScript. Swiping is UIKit's too.
 *
 * That is also why this file exists at all rather than a `Host` wrapped around
 * each React Native row. This app has three separate scars from mounting
 * SwiftUI hosts inside an RN tree — blanked content in `app/orders/_layout.tsx`,
 * frozen sibling taps in `scan-mode-control.tsx`, remounted trees noted in
 * `native-context-menu.tsx`. One host owning a whole native list is the shape
 * that has actually held up in production here.
 *
 * `engines-list.tsx` remains the React Native list for Android and web; Metro
 * picks between the two by filename, so the screen imports one name.
 */

/** Tone → hex, resolved here because SwiftUI wants a concrete colour. */
function toneColor(tone: EngineStatusTone, colors: ReturnType<typeof useTheme>['colors']): string {
  switch (tone) {
    case 'success':
      return colors.successOnSubtle;
    case 'warning':
      return colors.warningOnSubtle;
    case 'danger':
      return colors.dangerOnSubtle;
    case 'progress':
      return colors.primary;
    default:
      return colors.mutedForeground;
  }
}

/** Every header row: full-bleed, no card, no separator. */
function headerRow(top: number, bottom: number) {
  return [
    listRowInsets({ top, bottom, leading: eng.pad, trailing: eng.pad }),
    listRowBackground('transparent'),
    listRowSeparator('hidden'),
  ];
}

/**
 * The header, as list content.
 *
 * These are rows, not chrome. They scroll up and out with the engines under
 * them, which is what makes the screen read as an iOS catalog rather than a
 * page with a toolbar glued to the top — and it means the list is laid out
 * once, at its full height, and never again.
 *
 * The search field is a SwiftUI `TextField` holding its own text natively, so
 * a keystroke does not have to cross into JavaScript and back before the
 * caret moves. React hears about it afterwards, to filter with.
 */
function NativeListHeader({
  header,
  searchRef,
}: {
  header: EngineListHeader;
  searchRef: RefObject<TextFieldRef | null>;
}) {
  const { colors } = useTheme();
  const queryState = useNativeState(header.query);

  return (
    <Section modifiers={[listSectionMargins({ edges: 'top', length: 0 })]}>
      {/* List still applies the status-bar inset. The pinned bar's row
          sits under that (`micro` + 44pt). Work puts `rhythm.headerTop`
          between chrome and the large title — same 8pt here, so Engines
          sits tight under Back/Add instead of a full grouped-section
          below them. `listSectionMargins` strips insetGrouped's extra
          top air so we do not pay that on top of the 8pt. */}
      <Spacer
        modifiers={[
          frame({
            height: tokens.space.micro + CATALOG_NAV_BAR_ROW + rhythm.headerTop,
          }),
          listRowInsets({ top: 0, bottom: 0, leading: 0, trailing: 0 }),
          listRowBackground('transparent'),
          listRowSeparator('hidden'),
        ]}
      />

      <VStack
        alignment="leading"
        spacing={2}
        modifiers={[
          ...headerRow(0, 0),
          onTapGesture(() => {
            void searchRef.current?.blur();
          }),
        ]}
      >
        <Text
          modifiers={[
            font({ textStyle: 'largeTitle', weight: 'bold' }),
            lineLimit(1),
            foregroundStyle(colors.foreground),
          ]}
        >
          {header.title}
        </Text>
        <Text
          modifiers={[
            font({ textStyle: 'subheadline' }),
            lineLimit(1),
            foregroundStyle({ type: 'hierarchical', style: 'secondary' }),
          ]}
        >
          {header.subtitle}
        </Text>
      </VStack>

      <HStack
        spacing={6}
        modifiers={[
          padding({ horizontal: 10, vertical: 8 }),
          background(colors.muted, shapes.roundedRectangle({ cornerRadius: 12 })),
          ...headerRow(12, 0),
        ]}
      >
        <Image
          systemName={'magnifyingglass' satisfies SFSymbol}
          size={16}
          color={colors.mutedForeground}
        />
        <TextField
          ref={searchRef}
          text={queryState}
          placeholder={header.searchPlaceholder}
          onTextChange={header.onQueryChange}
          modifiers={[
            autocorrectionDisabled(),
            textInputAutocapitalization('characters'),
            foregroundStyle(colors.foreground),
            submitLabel('search'),
            onSubmit(() => {
              void searchRef.current?.blur();
            }),
          ]}
        />
        {header.query ? (
          <Button
            systemImage={'xmark.circle.fill' satisfies SFSymbol}
            label=""
            onPress={() => {
              void searchRef.current?.clear();
              header.onQueryChange('');
            }}
            modifiers={[tint(colors.mutedForeground)]}
          />
        ) : null}
      </HStack>

      {header.lanes ? (
        <Picker
          selection={header.lane}
          onSelectionChange={(next) => {
            void searchRef.current?.blur();
            header.onLaneChange(String(next));
          }}
          modifiers={[pickerStyle('segmented'), ...headerRow(10, 0)]}
        >
          {header.lanes.map((option) => (
            <Text key={option.value} modifiers={[tag(option.value)]}>
              {option.label}
            </Text>
          ))}
        </Picker>
      ) : null}

      {header.qualities ? (
        <Picker
          selection={header.quality}
          onSelectionChange={(next) => {
            void searchRef.current?.blur();
            header.onQualityChange(String(next));
          }}
          modifiers={[pickerStyle('segmented'), ...headerRow(8, 4)]}
        >
          {header.qualities.map((option) => (
            <Text key={option.value} modifiers={[tag(option.value)]}>
              {option.label}
            </Text>
          ))}
        </Picker>
      ) : null}
    </Section>
  );
}

function NativeEngineRow({
  unit,
  capabilities,
  thumbUrl,
  uploadRatio,
  uploadLabel,
  onAction,
}: {
  unit: EngineUnitRow;
  capabilities: EngineRowCapabilities;
  thumbUrl: string | null;
  uploadRatio: number | null;
  uploadLabel: string | null;
  onAction: (id: EngineRowActionId, unit: EngineUnitRow) => void;
}) {
  const { colors } = useTheme();
  const motor = unit.motor;
  const label = engineUnitLabel(motor);
  const thumb = useNativeThumbnail(thumbUrl, ENGINE_THUMB_SIZE);
  const incoming = capabilities.incoming;
  const location = engineUnitLocation(motor);
  const tone = toneColor(engineStatusTone(motor), colors);

  const actions = useMemo(() => engineRowActions(capabilities), [capabilities]);
  const swipe = useMemo(() => engineRowSwipeAction(capabilities), [capabilities]);

  const body = (
    <HStack spacing={12} alignment="center" modifiers={[onTapGesture(() => onAction('open', unit))]}>
      {thumb ? (
        <Image
          uiImage={thumb}
          modifiers={[
            // Bare `uiImage` draws at the file's intrinsic size. Intake shots
            // are full-resolution JPEGs, so a 52pt frame without `resizable`
            // clips a few hundred pixels out of the middle — the row looks
            // zoomed in. Fit the whole capture in the tile instead.
            resizable(),
            aspectRatio({ contentMode: 'fit' }),
            frame({ width: eng.thumb, height: eng.thumb }),
            background(
              colors.surfaceElevated,
              shapes.roundedRectangle({ cornerRadius: eng.thumbRadius }),
            ),
            clipShape('roundedRectangle', eng.thumbRadius),
          ]}
        />
      ) : (
        <Image
          systemName={'car.side.fill' satisfies SFSymbol}
          size={Math.round(eng.thumb * 0.5)}
          color={colors.mutedForeground}
          modifiers={[frame({ width: eng.thumb, height: eng.thumb })]}
        />
      )}

      <VStack alignment="leading" spacing={3}>
        <Text
          modifiers={[
            font({ textStyle: 'body', weight: 'semibold' }),
            monospacedDigit(),
            lineLimit(1),
            foregroundStyle(colors.foreground),
          ]}
        >
          {label}
        </Text>

        {/* While photos are going up the bar replaces the status line — two
            progress readouts on one row is one more than anybody reads. */}
        {uploadRatio == null ? (
          <Text
            modifiers={[
              font({ textStyle: 'footnote' }),
              lineLimit(1),
              foregroundStyle(incoming || location ? tone : colors.warningOnSubtle),
            ]}
          >
            {incoming
              ? engineStatusLabel(motor)
              : `${location ?? 'No location'}  ·  ${engineStatusLabel(motor)}`}
          </Text>
        ) : (
          <VStack alignment="leading" spacing={3}>
            <ProgressView value={uploadRatio} modifiers={[tint(colors.primary)]} />
            <Text
              modifiers={[
                font({ textStyle: 'caption2', weight: 'semibold' }),
                lineLimit(1),
                foregroundStyle(colors.primary),
              ]}
            >
              {uploadLabel ?? ''}
            </Text>
          </VStack>
        )}
      </VStack>

      <Spacer />

      {incoming ? null : (
        <Text
          modifiers={[
            font({ textStyle: 'caption', weight: 'semibold' }),
            foregroundStyle({ type: 'hierarchical', style: 'secondary' }),
          ]}
        >
          {engineQualityLabel(motor)}
        </Text>
      )}
    </HStack>
  );

  const menuItem = (action: EngineRowAction) => (
    <Button
      key={action.id}
      label={action.label}
      systemImage={action.systemImage as SFSymbol}
      role={action.destructive ? 'destructive' : undefined}
      onPress={() => onAction(action.id, unit)}
    />
  );

  const withMenu = (
    <ContextMenu>
      <ContextMenu.Trigger>{body}</ContextMenu.Trigger>
      <ContextMenu.Items>{actions.map(menuItem)}</ContextMenu.Items>
    </ContextMenu>
  );

  if (!swipe) return withMenu;

  return (
    <SwipeActions>
      {withMenu}
      <SwipeActions.Actions edge="trailing" allowsFullSwipe>
        <Button
          label={swipe.label}
          systemImage={swipe.systemImage as SFSymbol}
          onPress={() => onAction(swipe.id, unit)}
          modifiers={[tint(colors.primary)]}
        />
      </SwipeActions.Actions>
    </SwipeActions>
  );
}

export function EnginesList({
  rows,
  header,
  emptyMessage,
  onUnitPress,
  actions,
  incomingActions,
  uploadProgressByJobId,
  previewUriByJobId,
  onScrollOffset,
  bottomInset,
}: EnginesListProps) {
  const { colors, isDark } = useTheme();
  /**
   * SwiftUI emits nothing React Native's `onScroll` would recognise, so the
   * collapsing header went permanently expanded the moment this list replaced
   * the `FlashList`. This is the native equivalent, reported as a plain offset.
   *
   * Not a worklet: the callback ends in `setState`, the screen ignores every
   * update that does not flip the threshold, and React bails out of a render
   * that returns the same value — so a JS hop per frame costs about what the
   * `FlashList` path already cost at `scrollEventThrottle={16}`.
   *
   * Returns null below iOS 18, where the header simply stays expanded.
   */
  const scrollGeometry = useScrollGeometryChange((geometry) => {
    onScrollOffset?.(geometry.contentOffsetY);
  });
  const searchRef = useRef<TextFieldRef>(null);
  const { can } = useSession();
  const sections = useMemo(() => groupEngineRowsIntoSections(rows), [rows]);

  // One page at a time; a new search, lane or grade starts again from the top page.
  const [limit, setLimit] = useState(ENGINE_LIST_PAGE);
  const filterKey = `${header.lane}|${header.quality}|${header.query}`;
  const [pagedFor, setPagedFor] = useState(filterKey);
  if (pagedFor !== filterKey) {
    setPagedFor(filterKey);
    setLimit(ENGINE_LIST_PAGE);
  }
  const page = useMemo(() => limitEngineSections(sections, limit), [sections, limit]);

  const permissions = useMemo(
    () => ({
      canInventoryEdit: can('inventory_edit'),
      canWorkOrdersEdit: can('work_orders_edit'),
      canAccountingEdit: can('accounting_edit'),
      canIntakeExecute: can('engine_intake_execute'),
      canIntakeVerify: can('engine_intake_verify'),
      hasIncomingHandlers: Boolean(incomingActions),
    }),
    [can, incomingActions],
  );

  const copySerial = useCallback(async (motor: MotorEntity) => {
    const label = engineUnitLabel(motor);
    await Clipboard.setStringAsync(label);
    toast({ title: `${label} copied`, variant: 'success' });
  }, []);

  const handleAction = useCallback(
    (id: EngineRowActionId, unit: EngineUnitRow) => {
      void searchRef.current?.blur();
      // The lane travels with the row. Re-deriving it from the motor got it
      // wrong for an incoming engine whose job only exists locally, because
      // those carry no `intakeJobId` yet.
      const motor = unit.motor;
      switch (id) {
        case 'open':
          onUnitPress(motor, unit.lane);
          return;
        case 'copySerial':
          void copySerial(motor);
          return;
        case 'photograph':
          incomingActions?.onContinue(motor);
          return;
        case 'accept':
          incomingActions?.onAccept(motor);
          return;
        case 'edit':
          incomingActions?.onEdit(motor);
          return;
        case 'cancel':
          incomingActions?.onCancel(motor);
          return;
        case 'relocate':
          actions.onRelocate(motor);
          return;
        case 'addToOrder':
          actions.onAddToOrder(motor);
          return;
        case 'sell':
          actions.onSell(motor);
      }
    },
    [actions, copySerial, incomingActions, onUnitPress],
  );

  return (
    // `ignoreSafeArea` because this list owns its own insets: the first row is
    // the pinned bar's height and the last is the floating dock's. Left to
    // itself SwiftUI would add the window's insets on top of both.
    <Host
      style={{ flex: 1 }}
      ignoreSafeArea="container"
      colorScheme={isDark ? 'dark' : 'light'}
      seedColor={colors.primary}
    >
      <List
        modifiers={[
          listStyle('insetGrouped'),
          listSectionMargins({ edges: 'top', length: 0 }),
          scrollContentBackground('hidden'),
          scrollDismissesKeyboard('immediately'),
          ...(scrollGeometry ? [scrollGeometry] : []),
        ]}
      >
        <NativeListHeader header={header} searchRef={searchRef} />

        {sections.length === 0 && emptyMessage ? (
          <Section>
            <VStack
              spacing={8}
              modifiers={[
                frame({ height: 200 }),
                listRowBackground('transparent'),
                listRowSeparator('hidden'),
              ]}
            >
              <Image
                systemName={'car.side' satisfies SFSymbol}
                size={28}
                color={colors.mutedForeground}
              />
              <Text
                modifiers={[
                  font({ textStyle: 'headline' }),
                  foregroundStyle(colors.foreground),
                ]}
              >
                {emptyMessage.title}
              </Text>
              <Text
                modifiers={[
                  font({ textStyle: 'subheadline' }),
                  foregroundStyle({ type: 'hierarchical', style: 'secondary' }),
                ]}
              >
                {emptyMessage.hint}
              </Text>
            </VStack>
          </Section>
        ) : null}

        {page.sections.map((section) => (
          <Section
            key={section.key}
            header={
              section.title ? (
                <HStack>
                  <Text
                    modifiers={[
                      font({ textStyle: 'headline', weight: 'bold' }),
                      foregroundStyle(colors.foreground),
                    ]}
                  >
                    {section.title}
                  </Text>
                  <Spacer />
                  {section.meta ? (
                    <Text
                      modifiers={[
                        font({ textStyle: 'subheadline' }),
                        monospacedDigit(),
                        foregroundStyle({ type: 'hierarchical', style: 'secondary' }),
                      ]}
                    >
                      {section.meta}
                    </Text>
                  ) : null}
                </HStack>
              ) : undefined
            }
          >
            {section.units.map((unit) => {
              const jobId = unit.motor.intakeJobId;
              const bar = jobId ? uploadProgressByJobId.get(jobId) : undefined;
              return (
                <NativeEngineRow
                  key={unit.key}
                  unit={unit}
                  capabilities={engineRowCapabilities(unit.motor, permissions)}
                  thumbUrl={
                    (jobId ? previewUriByJobId.get(jobId) : null) ??
                    engineThumbnailUrl(unit.motor)
                  }
                  uploadRatio={bar ? bar.ratio : null}
                  uploadLabel={bar ? bar.label : null}
                  onAction={handleAction}
                />
              );
            })}
          </Section>
        ))}

        {/* Lazy native rows: this one is only created when scrolled near, and
            asks for the next page. Keyed by the limit so each page gets a
            fresh onAppear instead of SwiftUI reusing the fired one. */}
        {page.hasMore ? (
          <Section key={`more-${limit}`}>
            <HStack
              modifiers={[
                frame({ height: 44 }),
                listRowBackground('transparent'),
                listRowSeparator('hidden'),
                onAppear(() => setLimit((current) => current + ENGINE_LIST_PAGE)),
              ]}
            >
              <Spacer />
              <ProgressView />
              <Spacer />
            </HStack>
          </Section>
        ) : null}

        {/* The floating tab bar sits over the list, and SwiftUI exposes no
            `contentMargins` binding here — so the inset is a last row made
            invisible. `insetGrouped` would otherwise draw it as an empty card:
            the row needs a clear background and no separator, not just height. */}
        <Section>
          <Spacer
            modifiers={[
              frame({ height: bottomInset }),
              listRowBackground('transparent'),
              listRowSeparator('hidden'),
            ]}
          />
        </Section>
      </List>
    </Host>
  );
}
