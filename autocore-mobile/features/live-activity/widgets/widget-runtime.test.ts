/**
 * Renders every widget layout through the real `expo-widgets` JS runtime.
 *
 * A widget body is stringified by Babel and evaluated in an isolated JSContext
 * inside the iOS extension, where module scope does not exist. A helper defined
 * one line above the `'widget'` directive is `undefined` there, and the symptom
 * is a blank black Dynamic Island on a Release device build — nothing in tsc,
 * eslint or a simulator run catches it.
 *
 * This test does what the extension does: transform the source with the same
 * Babel plugin, load the shipped runtime bundle into a VM, and call the
 * serialized function. A missing global throws here instead of on a phone.
 *
 * It skips (loudly) if the prebuilt runtime bundle is absent, so an upstream
 * layout change never fails CI for the wrong reason.
 */
import assert from 'node:assert/strict';
import { existsSync, readFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, it } from 'node:test';
import { createContext, runInContext } from 'node:vm';

const HERE = dirname(fileURLToPath(import.meta.url));
const MOBILE_ROOT = resolve(HERE, '../../..');
const RUNTIME_BUNDLE = resolve(
  MOBILE_ROOT,
  'node_modules/expo-widgets/bundle/build/ExpoWidgets.bundle',
);
const WIDGETS_BABEL_PLUGIN = resolve(
  MOBILE_ROOT,
  'node_modules/babel-preset-expo/build/plugins/widgets-plugin.js',
);

const projectRequire = createRequire(resolve(MOBILE_ROOT, 'package.json'));
const runtimeAvailable = existsSync(RUNTIME_BUNDLE) && existsSync(WIDGETS_BABEL_PLUGIN);

type WidgetNode = {
  type?: unknown;
  props?: Record<string, unknown> & { children?: unknown };
};

function makeRuntime() {
  const context = createContext({ console });
  runInContext('globalThis.global = globalThis;', context);
  runInContext(readFileSync(RUNTIME_BUNDLE, 'utf8'), context, { filename: 'ExpoWidgets.bundle' });
  return context;
}

/** Same transform order the app build uses: types stripped, JSX, then serialize. */
function serializeWidget(relativePath: string): string {
  const file = resolve(MOBILE_ROOT, relativePath);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { transformSync } = projectRequire('@babel/core') as any;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const parser = projectRequire('@babel/parser') as any;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const traverse = (projectRequire('@babel/traverse') as any).default;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { widgetsPlugin } = projectRequire(WIDGETS_BABEL_PLUGIN) as any;

  const { code } = transformSync(readFileSync(file, 'utf8'), {
    filename: file,
    babelrc: false,
    configFile: false,
    presets: [
      [
        projectRequire.resolve('@babel/preset-typescript'),
        { isTSX: true, allExtensions: true },
      ],
    ],
    plugins: [
      [projectRequire.resolve('@babel/plugin-transform-react-jsx'), { runtime: 'automatic' }],
      widgetsPlugin,
    ],
  });

  const layouts: string[] = [];
  traverse(parser.parse(code, { sourceType: 'module' }), {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    TemplateLiteral(path: any) {
      const cooked = path.node.quasis[0]?.value?.cooked ?? '';
      if (path.node.quasis.length === 1 && cooked.startsWith('function(')) layouts.push(cooked);
    },
  });

  assert.equal(
    layouts.length,
    1,
    `${relativePath}: expected exactly one 'widget' function, found ${layouts.length}`,
  );
  return layouts[0];
}

function render(
  context: ReturnType<typeof createContext>,
  layout: string,
  props: Record<string, unknown>,
  environment: Record<string, unknown>,
): Record<string, WidgetNode> {
  const scope = context as Record<string, unknown>;
  scope.__probeLayout = runInContext(`(${layout})`, context);
  scope.__probeProps = props;
  scope.__probeEnv = environment;
  runInContext('globalThis.__expoWidgetLayout = globalThis.__probeLayout;', context);
  return runInContext(
    '__expoWidgetRender(globalThis.__probeProps, globalThis.__probeEnv)',
    context,
  ) as Record<string, WidgetNode>;
}

function walk(node: unknown, visit: (n: WidgetNode) => void): void {
  if (!node) return;
  if (Array.isArray(node)) {
    node.forEach((child) => walk(child, visit));
    return;
  }
  if (typeof node !== 'object') return;
  const element = node as WidgetNode;
  visit(element);
  walk(element.props?.children, visit);
}

function typeNames(node: unknown): string[] {
  const names: string[] = [];
  walk(node, (element) => {
    if (typeof element.type === 'string') names.push(element.type);
  });
  return names;
}

/** Text with content, or any glyph / shape / indicator. Anything the eye sees. */
function hasVisibleLeaf(node: unknown): boolean {
  let visible = false;
  walk(node, (element) => {
    const type = String(element.type ?? '');
    const props = element.props ?? {};
    if (type.includes('Text')) {
      const text = props.text;
      if (typeof text === 'string' ? text.length > 0 : Boolean(props.timerInterval ?? props.date)) {
        visible = true;
      }
      return;
    }
    if (/Image|Circle|Capsule|Rectangle|Gauge|Progress|AccessoryWidgetBackground/.test(type)) {
      visible = true;
    }
  });
  return visible;
}

const ISLAND_SLOTS = [
  'banner',
  'bannerSmall',
  'compactLeading',
  'compactTrailing',
  'minimal',
  'expandedLeading',
  'expandedCenter',
  'expandedTrailing',
  'expandedBottom',
] as const;

const ISLAND_ENVIRONMENTS: Record<string, unknown>[] = [
  { colorScheme: 'dark' },
  // Always-On display.
  { colorScheme: 'dark', isLuminanceReduced: true },
  // Apple Watch / remote device.
  { colorScheme: 'light', activityFamily: 'small' },
  { colorScheme: 'dark', activityFamily: 'medium', levelOfDetail: 'simplified' },
];

const WIDGET_FAMILIES = [
  'accessoryCircular',
  'accessoryRectangular',
  'accessoryInline',
  'systemSmall',
  'systemMedium',
  'systemLarge',
];

const WIDGET_ENVIRONMENTS: Record<string, unknown>[] = WIDGET_FAMILIES.flatMap((widgetFamily) => [
  { widgetFamily, colorScheme: 'dark', widgetRenderingMode: 'fullColor', timestamp: 1_770_000_000_000 },
  {
    widgetFamily,
    colorScheme: 'light',
    widgetRenderingMode: 'vibrant',
    isLuminanceReduced: true,
    timestamp: 1_770_000_000_000,
  },
]);

/**
 * Every frame the Live Activity can now produce, plus payloads a device may
 * still be holding from an older build.
 *
 * The Island is a sync count. `legacySession` and `empty` stay because
 * ActivityKit can restore an activity started by a previous binary, and the
 * widget body has to survive whatever shape that payload has.
 */
const ISLAND_STATES: Record<string, Record<string, unknown>> = {
  syncing: {
    status: 'SYNCING', title: 'Engine photos', detail: '', subject: '',
    headline: '3/8', caption: '', symbol: 'arrow.triangle.2.circlepath', accent: '#0A84FF',
    done: 3, total: 8, progress: 3 / 8, pending: 5, blocked: 0, retryAtMs: 0,
    determinate: true, iconUri: '', mode: 'sync',
  },
  parked: {
    status: 'SYNCING', title: 'Engine photos', detail: '', subject: '',
    headline: '0/6', caption: '', symbol: 'arrow.triangle.2.circlepath', accent: '#0A84FF',
    done: 0, total: 6, progress: 0, pending: 6, blocked: 0, retryAtMs: 0,
    determinate: true, iconUri: '', mode: 'sync',
  },
  failed: {
    status: 'FAILED', title: 'Photos need you', detail: '', subject: '',
    headline: '4/6', caption: '', symbol: 'exclamationmark.triangle.fill', accent: '#FF453A',
    done: 4, total: 6, progress: 4 / 6, pending: 0, blocked: 2, retryAtMs: 0,
    determinate: true, iconUri: '', mode: 'sync',
  },
  succeeded: {
    status: 'SUCCEEDED', title: 'Sync complete', detail: '', subject: '',
    headline: '3/3', caption: '', symbol: 'checkmark.circle.fill', accent: '#30D158',
    done: 3, total: 3, progress: 1, pending: 0, blocked: 0, retryAtMs: 0,
    determinate: true, iconUri: '', mode: 'sync',
  },
  // Restored from a build that still shipped the documenting session frame.
  legacySession: {
    status: 'SYNCING', title: 'Documenting', detail: 'In session', subject: '1NZ-FE',
    headline: '4/12', caption: 'photos', symbol: 'camera.fill', accent: '#0A84FF',
    done: 4, total: 12, progress: 4 / 12, pending: 0, blocked: 0, retryAtMs: 0,
    determinate: true, iconUri: 'file:///icon.png', mode: 'session',
  },
  empty: {},
};

const TODAY_WIDGET_STATES: Record<string, Record<string, unknown>> = {
  urgent: {
    openOrders: 12, attentionOrders: 2, engines: 248, awaitingPlacement: 4, lowStock: 7,
    headline: '4', title: '4 items to place', detail: 'Received stock with no location yet.',
    eyebrow: 'Needs you', ordersLabel: 'Open', placeLabel: 'To place', enginesLabel: 'Engines',
    symbol: 'shippingbox.fill', accent: '#FF9F0A', urgent: true, updatedAtMs: 1_770_000_000_000,
    link: 'autocoremobile://scan',
  },
  unknown: {
    openOrders: -1, attentionOrders: -1, engines: -1, awaitingPlacement: -1, lowStock: -1,
    headline: '—', title: 'AutoCore', detail: 'Open the app to refresh.',
    eyebrow: 'Floor', ordersLabel: 'Open', placeLabel: 'To place', enginesLabel: 'Engines',
    symbol: 'arrow.triangle.2.circlepath', accent: '#8E8E93', urgent: false, updatedAtMs: 0,
  },
  empty: {},
};

const INTAKE_WIDGET_STATES: Record<string, Record<string, unknown>> = {
  ready: {
    active: 1, ready: 3, syncing: 0, headline: '3', title: '3 engines ready for review',
    detail: '1 engine documenting', eyebrow: 'Intake', readyLabel: 'Ready', activeLabel: 'Active',
    lockLine: '3 Ready · 1 documenting', openReadyLabel: 'Open Ready', continueLabel: 'Continue',
    link: 'autocoremobile://intake?filter=ready', symbol: 'checkmark.seal.fill',
    accent: '#30D158', urgent: true, updatedAtMs: 1_770_000_000_000,
  },
  syncing: {
    active: 2, ready: 0, syncing: 4, headline: '2', title: '2 engines documenting',
    detail: '2 engines documenting', eyebrow: 'Intake', readyLabel: 'Ready', activeLabel: 'Active',
    lockLine: '0 Ready · 2 documenting', openReadyLabel: 'Open Ready', continueLabel: 'Continue',
    link: 'autocoremobile://intake', symbol: 'arrow.triangle.2.circlepath',
    accent: '#0A84FF', urgent: true, updatedAtMs: 1_770_000_000_000,
  },
  unknown: {
    active: -1, ready: -1, syncing: -1, headline: '—', title: 'AutoCore',
    detail: 'Open the app to refresh.', eyebrow: 'Intake', readyLabel: 'Ready',
    activeLabel: 'Active', lockLine: 'Open the app to refresh.',
    openReadyLabel: 'Open Ready', continueLabel: 'Continue',
    link: 'autocoremobile://intake', symbol: 'arrow.triangle.2.circlepath',
    accent: '#8E8E93', urgent: false, updatedAtMs: 0,
  },
  empty: {},
};

const SCAN_WIDGET_STATES: Record<string, Record<string, unknown>> = {
  placing: {
    awaitingPlacement: 4, headline: '4', title: 'Scan in', detail: '4 items to place',
    eyebrow: 'Scan', actionLabel: 'Scan in', link: 'autocoremobile://scan',
    symbol: 'shippingbox.fill', accent: '#FF9F0A', urgent: true, updatedAtMs: 1_770_000_000_000,
  },
  clear: {
    awaitingPlacement: 0, headline: '', title: 'Scan in', detail: 'Open camera',
    eyebrow: 'Scan', actionLabel: 'Scan in', link: 'autocoremobile://scan',
    symbol: 'barcode.viewfinder', accent: '#0A84FF', urgent: false, updatedAtMs: 0,
  },
  empty: {},
};

const PAY_WIDGET_STATES: Record<string, Record<string, unknown>> = {
  pending: {
    pending: 2, claimable: 1, access: 'allowed', headline: '2', title: '2 payouts waiting',
    detail: '1 job to claim', eyebrow: 'Pay', link: 'autocoremobile://earnings',
    symbol: 'banknote.fill', accent: '#FF9F0A', urgent: true, updatedAtMs: 1_770_000_000_000,
  },
  denied: {
    pending: -1, claimable: -1, access: 'denied', headline: '—', title: "Pay isn’t on for you",
    detail: 'Pay for completed work.', eyebrow: 'Pay', link: 'autocoremobile://earnings',
    symbol: 'banknote.fill', accent: '#8E8E93', urgent: false, updatedAtMs: 0,
  },
  empty: {},
};

describe('widget runtime', { skip: runtimeAvailable ? false : 'expo-widgets runtime bundle not built' }, () => {
  const context = makeRuntime();

  describe('operations Live Activity', () => {
    const layout = serializeWidget('features/live-activity/operations-live-activity.tsx');

    for (const [name, props] of Object.entries(ISLAND_STATES)) {
      for (const environment of ISLAND_ENVIRONMENTS) {
        const label = String(environment.activityFamily ?? 'default');
        const dim = environment.isLuminanceReduced ? ' dimmed' : '';

        it(`renders every slot for ${name} (${label}${dim})`, () => {
          const result = render(context, layout, props, environment);
          for (const slot of ISLAND_SLOTS) {
            assert.ok(slot in result, `missing slot ${slot}`);
            assert.ok(result[slot], `slot ${slot} rendered nothing`);
            assert.ok(
              hasVisibleLeaf(result[slot]),
              `slot ${slot} has no text, glyph or indicator — it would look empty on device`,
            );
          }
        });
      }
    }

    it('leads with the synced fraction, never Documenting', () => {
      const syncing = render(context, layout, ISLAND_STATES.syncing, {
        colorScheme: 'dark',
      });
      assert.match(JSON.stringify(syncing.compactTrailing), /3\/8/);
      assert.match(JSON.stringify(syncing.expandedTrailing), /3\/8/);
      assert.doesNotMatch(JSON.stringify(syncing), /Documenting/);
      assert.ok(
        !typeNames(syncing.expandedLeading).includes('GaugeView'),
        'compact Island must not spend a slot on a progress ring',
      );
      assert.ok(typeNames(syncing.banner).includes('ProgressView'));
      assert.ok(typeNames(syncing.expandedBottom).includes('ProgressView'));
    });

    it('prints the count once when the Island is expanded', () => {
      // Leading glyph, centre subject, trailing count. The centre used to
      // repeat the trailing numeral, which read as a rendering bug.
      const syncing = render(context, layout, ISLAND_STATES.syncing, {
        colorScheme: 'dark',
      });
      const expanded = [
        syncing.expandedLeading,
        syncing.expandedCenter,
        syncing.expandedTrailing,
        syncing.expandedBottom,
      ];
      const counts = expanded.filter((slot) => /3\/8/.test(JSON.stringify(slot)));
      assert.equal(counts.length, 1);
      assert.match(JSON.stringify(syncing.expandedCenter), /Engine photos/);
    });

    it('names the subject on the Lock Screen so the numeral means something', () => {
      const syncing = render(context, layout, ISLAND_STATES.syncing, {
        colorScheme: 'dark',
      });
      assert.match(JSON.stringify(syncing.banner), /Engine photos/);
      assert.match(JSON.stringify(syncing.banner), /3\/8/);

      const failed = render(context, layout, ISLAND_STATES.failed, { colorScheme: 'dark' });
      assert.match(JSON.stringify(failed.banner), /Photos need you/);

      const succeeded = render(context, layout, ISLAND_STATES.succeeded, {
        colorScheme: 'dark',
      });
      assert.match(JSON.stringify(succeeded.banner), /Sync complete/);
      assert.match(JSON.stringify(succeeded.expandedCenter), /Sync complete/);
      assert.match(JSON.stringify(succeeded.compactLeading), /checkmark\.circle\.fill/);
      assert.match(JSON.stringify(succeeded.banner), /3\/3/);
    });

    it('keeps text out of the slots too small to hold it', () => {
      // `minimal` is roughly a 20pt circle when two activities share the
      // Island; `3/8` was scaled through it into a smear.
      const syncing = render(context, layout, ISLAND_STATES.syncing, {
        colorScheme: 'dark',
      });
      assert.ok(!typeNames(syncing.minimal).some((name) => name.includes('Text')));
      assert.ok(typeNames(syncing.minimal).some((name) => name.includes('Image')));
      assert.doesNotMatch(JSON.stringify(syncing.compactLeading), /Engine photos/);
      assert.doesNotMatch(JSON.stringify(syncing.compactTrailing), /Engine photos/);
    });

    it('refuses the abandoned session copy carried by a restored activity', () => {
      const legacy = render(context, layout, ISLAND_STATES.legacySession, {
        colorScheme: 'dark',
      });
      assert.doesNotMatch(JSON.stringify(legacy), /Documenting|1NZ-FE|In session/);
      assert.match(JSON.stringify(legacy.banner), /Engine photos/);
    });

    it('never renders a countdown — the count is not a timer', () => {
      for (const props of Object.values(ISLAND_STATES)) {
        const result = render(context, layout, props, { colorScheme: 'dark' });
        let range: unknown = null;
        walk(result.compactTrailing, (element) => {
          if (element.props?.timerInterval) range = element.props.timerInterval;
        });
        assert.equal(range, null);
      }
    });

    it('drops colour on the Always-On display instead of burning an accent in', () => {
      const normal = render(context, layout, ISLAND_STATES.failed, {
        colorScheme: 'dark',
      });
      const dimmed = render(context, layout, ISLAND_STATES.failed, {
        colorScheme: 'dark',
        isLuminanceReduced: true,
      });
      assert.match(JSON.stringify(normal.minimal), /#FF453A/);
      assert.doesNotMatch(JSON.stringify(dimmed.minimal), /#FF453A/);
    });
  });

  describe('AutoCoreToday widget', () => {
    const layout = serializeWidget('features/live-activity/widgets/today-widget.tsx');

    for (const [name, props] of Object.entries(TODAY_WIDGET_STATES)) {
      for (const environment of WIDGET_ENVIRONMENTS) {
        it(`renders ${name} on ${String(environment.widgetFamily)}${environment.isLuminanceReduced ? ' dimmed' : ''}`, () => {
          const result = render(context, layout, props, environment) as unknown as WidgetNode;
          assert.ok(result && typeof result.type === 'string', 'must return a single element');
          assert.ok(hasVisibleLeaf(result), 'widget rendered nothing visible');
        });
      }
    }

    it('shows three stats on the medium family', () => {
      const medium = render(context, layout, TODAY_WIDGET_STATES.urgent, {
        widgetFamily: 'systemMedium',
        colorScheme: 'dark',
      });
      const serialized = JSON.stringify(medium);
      assert.match(serialized, /"text":"12"/);
      assert.match(serialized, /"text":"4"/);
      assert.match(serialized, /"text":"248"/);
      assert.match(serialized, /autocoremobile:\/\/scan/);
    });

    it('renders an em dash, never a fabricated zero, before counts load', () => {
      const blank = render(context, layout, TODAY_WIDGET_STATES.unknown, {
        widgetFamily: 'systemMedium',
        colorScheme: 'dark',
      });
      const serialized = JSON.stringify(blank);
      assert.match(serialized, /"text":"—"/);
      assert.doesNotMatch(serialized, /"text":"0"/);
    });

    it('draws the hottest fact as the hero on systemLarge / StandBy', () => {
      const large = render(context, layout, TODAY_WIDGET_STATES.urgent, {
        widgetFamily: 'systemLarge',
        colorScheme: 'dark',
      });
      const serialized = JSON.stringify(large);
      assert.match(serialized, /containerBackground/);
      assert.match(serialized, /4 items to place/);
      assert.match(serialized, /"text":"12"/);
      assert.match(serialized, /"text":"4"/);
      assert.match(serialized, /"text":"248"/);
    });
  });

  describe('AutoCoreIntake widget', () => {
    const layout = serializeWidget('features/live-activity/widgets/intake-bay-widget.tsx');

    for (const [name, props] of Object.entries(INTAKE_WIDGET_STATES)) {
      for (const environment of WIDGET_ENVIRONMENTS) {
        it(`renders ${name} on ${String(environment.widgetFamily)}${environment.isLuminanceReduced ? ' dimmed' : ''}`, () => {
          const result = render(context, layout, props, environment) as unknown as WidgetNode;
          assert.ok(result && typeof result.type === 'string', 'must return a single element');
          assert.ok(hasVisibleLeaf(result), 'widget rendered nothing visible');
        });
      }
    }

    it('deep links Ready into the bay filter', () => {
      const result = render(context, layout, INTAKE_WIDGET_STATES.ready, {
        widgetFamily: 'systemSmall',
        colorScheme: 'dark',
      });
      assert.match(JSON.stringify(result), /autocoremobile:\/\/intake\?filter=ready/);
    });

    it('spends the Lock circular numeral on Ready, not on engines still open', () => {
      const circular = render(context, layout, INTAKE_WIDGET_STATES.syncing, {
        widgetFamily: 'accessoryCircular',
        colorScheme: 'dark',
      });
      const serialized = JSON.stringify(circular);
      assert.match(serialized, /"text":"0"/);
      assert.doesNotMatch(serialized, /"text":"4"/);
    });
  });

  describe('AutoCoreScan widget', () => {
    const layout = serializeWidget('features/live-activity/widgets/scan-widget.tsx');

    for (const [name, props] of Object.entries(SCAN_WIDGET_STATES)) {
      for (const environment of WIDGET_ENVIRONMENTS) {
        it(`renders ${name} on ${String(environment.widgetFamily)}${environment.isLuminanceReduced ? ' dimmed' : ''}`, () => {
          const result = render(context, layout, props, environment) as unknown as WidgetNode;
          assert.ok(result && typeof result.type === 'string', 'must return a single element');
          assert.ok(hasVisibleLeaf(result), 'widget rendered nothing visible');
        });
      }
    }

    it('deep links Home small into scan', () => {
      const result = render(context, layout, SCAN_WIDGET_STATES.placing, {
        widgetFamily: 'systemSmall',
        colorScheme: 'dark',
      });
      assert.match(JSON.stringify(result), /autocoremobile:\/\/scan/);
      assert.match(JSON.stringify(result), /containerBackground/);
    });
  });

  describe('AutoCorePay widget', () => {
    const layout = serializeWidget('features/live-activity/widgets/pay-widget.tsx');

    for (const [name, props] of Object.entries(PAY_WIDGET_STATES)) {
      it(`renders ${name} on systemSmall`, () => {
        const result = render(context, layout, props, {
          widgetFamily: 'systemSmall',
          colorScheme: 'dark',
        }) as unknown as WidgetNode;
        assert.ok(result && typeof result.type === 'string', 'must return a single element');
        assert.ok(hasVisibleLeaf(result), 'widget rendered nothing visible');
      });
    }

    it('deep links into earnings', () => {
      const result = render(context, layout, PAY_WIDGET_STATES.pending, {
        widgetFamily: 'systemSmall',
        colorScheme: 'dark',
      });
      assert.match(JSON.stringify(result), /autocoremobile:\/\/earnings/);
    });
  });
});
