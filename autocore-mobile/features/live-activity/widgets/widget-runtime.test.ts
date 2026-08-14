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

const ISLAND_STATES: Record<string, Record<string, unknown>> = {
  syncing: {
    status: 'SYNCING', title: 'Syncing 8 of 18', detail: '10 photos left.', subject: 'Bay 3',
    headline: '8/18', caption: 'photos', symbol: 'icloud.and.arrow.up.fill', accent: '#0A84FF',
    done: 8, total: 18, progress: 0.444, pending: 10, blocked: 0, retryAtMs: 0,
    determinate: true, iconUri: 'file:///icon.png',
  },
  offline: {
    status: 'WAITING_FOR_NETWORK', title: 'Waiting for connection',
    detail: '3 photos are saved on this iPhone.', subject: '', headline: '3', caption: 'queued',
    symbol: 'wifi.slash', accent: '#8E8E93', done: 0, total: 3, progress: 0, pending: 3,
    blocked: 0, retryAtMs: 0, determinate: false, iconUri: '',
  },
  retrying: {
    status: 'RETRYING', title: 'Waiting to retry', detail: '2 photos are safe on this iPhone.',
    subject: '', headline: '0/2', caption: 'retrying', symbol: 'arrow.clockwise',
    accent: '#FF9F0A', done: 0, total: 2, progress: 0, pending: 2, blocked: 0,
    retryAtMs: 1_770_000_030_000, determinate: false, iconUri: 'file:///icon.png',
  },
  blocked: {
    status: 'FAILED', title: '3 photos could not sync', detail: 'They are still on this iPhone.',
    subject: '', headline: '3', caption: 'blocked', symbol: 'exclamationmark.triangle.fill',
    accent: '#FF453A', done: 0, total: 3, progress: 0, pending: 0, blocked: 3, retryAtMs: 0,
    determinate: false, iconUri: '',
  },
  completed: {
    status: 'SYNCED', title: '18 photos synced', detail: 'Everything on this iPhone is backed up.',
    subject: '', headline: 'Done', caption: 'synced', symbol: 'checkmark.circle.fill',
    accent: '#30D158', done: 18, total: 18, progress: 1, pending: 0, blocked: 0, retryAtMs: 0,
    determinate: true, iconUri: 'file:///icon.png',
  },
  // A activity restored from a previous build, or a truncated payload.
  empty: {},
};

const SYNC_WIDGET_STATES: Record<string, Record<string, unknown>> = {
  syncing: {
    status: 'SYNCING', title: 'Syncing 8 of 18', detail: '10 photos left.', short: '8/18',
    caption: 'photos', symbol: 'icloud.and.arrow.up.fill', accent: '#0A84FF', progress: 0.44,
    determinate: true, pending: 10, blocked: 0, updatedAtMs: 1_770_000_000_000,
  },
  blocked: {
    status: 'ACTION_REQUIRED', title: 'Action required', detail: '2 photos need you.', short: '2',
    caption: 'blocked', symbol: 'exclamationmark.circle.fill', accent: '#FF9F0A', progress: 0,
    determinate: false, pending: 0, blocked: 2, updatedAtMs: 0,
  },
  synced: {
    status: 'SYNCED', title: 'Synced', detail: '', short: 'All set', caption: 'synced',
    symbol: 'checkmark.circle.fill', accent: '#30D158', progress: 1, determinate: false,
    pending: 0, blocked: 0, updatedAtMs: 1_770_000_000_000,
  },
  empty: {},
};

const TODAY_WIDGET_STATES: Record<string, Record<string, unknown>> = {
  urgent: {
    openOrders: 12, attentionOrders: 2, engines: 248, awaitingPlacement: 4, lowStock: 7,
    headline: '4', title: '4 items to place', detail: 'Received stock with no location yet.',
    symbol: 'shippingbox.fill', accent: '#FF9F0A', urgent: true, updatedAtMs: 1_770_000_000_000,
    link: 'autocoremobile://scan',
  },
  unknown: {
    openOrders: -1, attentionOrders: -1, engines: -1, awaitingPlacement: -1, lowStock: -1,
    headline: '—', title: 'AutoCore', detail: 'Open the app to refresh.',
    symbol: 'arrow.triangle.2.circlepath', accent: '#8E8E93', urgent: false, updatedAtMs: 0,
  },
  empty: {},
};

const INTAKE_WIDGET_STATES: Record<string, Record<string, unknown>> = {
  ready: {
    active: 1, ready: 3, syncing: 0, headline: '3', title: '3 engines ready for review',
    detail: '1 engine documenting', eyebrow: 'Intake', readyLabel: 'Ready', activeLabel: 'Active',
    openReadyLabel: 'Open Ready', continueLabel: 'Continue intake',
    link: 'autocoremobile://intake?filter=ready', symbol: 'checkmark.seal.fill',
    accent: '#30D158', urgent: true, updatedAtMs: 1_770_000_000_000,
  },
  unknown: {
    active: -1, ready: -1, syncing: -1, headline: '—', title: 'AutoCore',
    detail: 'Open the app to refresh.', eyebrow: 'Intake', readyLabel: 'Ready',
    activeLabel: 'Active', openReadyLabel: 'Open Ready', continueLabel: 'Continue intake',
    link: 'autocoremobile://intake', symbol: 'arrow.triangle.2.circlepath',
    accent: '#8E8E93', urgent: false, updatedAtMs: 0,
  },
  empty: {},
};

const WORK_WIDGET_STATES: Record<string, Record<string, unknown>> = {
  attention: {
    openOrders: 12, attentionOrders: 3, headline: '3', title: '3 orders waiting on parts',
    detail: '12 open in total.', eyebrow: 'Orders', openLabel: 'Open', attentionLabel: 'Waiting',
    actionLabel: 'Open orders', link: 'autocoremobile://orders',
    symbol: 'exclamationmark.triangle.fill', accent: '#FF9F0A', urgent: true,
    updatedAtMs: 1_770_000_000_000,
  },
  unknown: {
    openOrders: -1, attentionOrders: -1, headline: '—', title: 'AutoCore',
    detail: 'Open the app to refresh.', eyebrow: 'Orders', openLabel: 'Open',
    attentionLabel: 'Waiting', actionLabel: 'Open orders', link: 'autocoremobile://orders',
    symbol: 'arrow.triangle.2.circlepath', accent: '#8E8E93', urgent: false, updatedAtMs: 0,
  },
  empty: {},
};

const WAREHOUSE_WIDGET_STATES: Record<string, Record<string, unknown>> = {
  placing: {
    awaitingPlacement: 4, lowStock: 7, engines: 248, headline: '4', title: '4 items to place',
    detail: 'Received stock with no location yet.', eyebrow: 'Warehouse', placeLabel: 'To place',
    lowLabel: 'Low stock', enginesLabel: 'Engines', actionLabel: 'Scan in',
    actionTarget: 'openScan', link: 'autocoremobile://scan', symbol: 'shippingbox.fill',
    accent: '#FF9F0A', urgent: true, updatedAtMs: 1_770_000_000_000,
  },
  unknown: {
    awaitingPlacement: -1, lowStock: -1, engines: -1, headline: '—', title: 'AutoCore',
    detail: 'Open the app to refresh.', eyebrow: 'Warehouse', placeLabel: 'To place',
    lowLabel: 'Low stock', enginesLabel: 'Engines', actionLabel: 'Open warehouse',
    actionTarget: 'openWarehouse', link: 'autocoremobile://warehouse',
    symbol: 'arrow.triangle.2.circlepath', accent: '#8E8E93', urgent: false, updatedAtMs: 0,
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

    it('draws a real progress ring only when there is progress to draw', () => {
      const syncing = render(context, layout, ISLAND_STATES.syncing, { colorScheme: 'dark' });
      assert.ok(typeNames(syncing.expandedLeading).includes('GaugeView'));

      const parked = render(context, layout, ISLAND_STATES.offline, { colorScheme: 'dark' });
      assert.ok(
        !typeNames(parked.expandedLeading).includes('GaugeView'),
        'a ring parked at zero reads as a stalled upload',
      );
    });

    it('never spins a bar for a queue that is deliberately parked', () => {
      const parked = render(context, layout, ISLAND_STATES.offline, { colorScheme: 'dark' });
      assert.ok(
        !typeNames(parked.banner).includes('ProgressView'),
        'an indeterminate bar claims work is happening while offline',
      );
      assert.ok(typeNames(parked.banner).includes('CapsuleView'), 'expected a flat rail instead');
    });

    it('hands the retry countdown to SwiftUI as an ascending epoch range', () => {
      const result = render(context, layout, ISLAND_STATES.retrying, { colorScheme: 'dark' });
      let range: { lower?: unknown; upper?: unknown } | null = null;
      walk(result.compactTrailing, (element) => {
        const candidate = element.props?.timerInterval as { lower: number; upper: number } | undefined;
        if (candidate) range = candidate;
      });

      assert.ok(range, 'the retry state must render a live timer, not a frozen string');
      const { lower, upper } = range as { lower: number; upper: number };
      assert.equal(typeof lower, 'number');
      assert.equal(typeof upper, 'number');
      assert.ok(lower < upper, 'SwiftUI drops a timer whose range is not ascending');
      assert.equal(upper, ISLAND_STATES.retrying.retryAtMs);
    });

    it('drops colour on the Always-On display instead of burning an accent in', () => {
      const normal = render(context, layout, ISLAND_STATES.blocked, { colorScheme: 'dark' });
      const dimmed = render(context, layout, ISLAND_STATES.blocked, {
        colorScheme: 'dark',
        isLuminanceReduced: true,
      });
      assert.match(JSON.stringify(normal.minimal), /#FF453A/);
      assert.doesNotMatch(JSON.stringify(dimmed.minimal), /#FF453A/);
    });
  });

  describe('AutoCoreSync widget', () => {
    const layout = serializeWidget('features/live-activity/widgets/sync-widget.tsx');

    for (const [name, props] of Object.entries(SYNC_WIDGET_STATES)) {
      for (const environment of WIDGET_ENVIRONMENTS) {
        it(`renders ${name} on ${String(environment.widgetFamily)}${environment.isLuminanceReduced ? ' dimmed' : ''}`, () => {
          const result = render(context, layout, props, environment) as unknown as WidgetNode;
          assert.ok(result && typeof result.type === 'string', 'must return a single element');
          assert.ok(hasVisibleLeaf(result), 'widget rendered nothing visible');
        });
      }
    }

    it('gives Home Screen families a container background — iOS 17 requires one', () => {
      const small = render(context, layout, SYNC_WIDGET_STATES.syncing, {
        widgetFamily: 'systemSmall',
        colorScheme: 'dark',
      });
      assert.match(JSON.stringify(small), /containerBackground/);
    });

    it('deep links every family into intake', () => {
      for (const widgetFamily of WIDGET_FAMILIES) {
        const result = render(context, layout, SYNC_WIDGET_STATES.syncing, {
          widgetFamily,
          colorScheme: 'dark',
        });
        assert.match(
          JSON.stringify(result),
          /autocoremobile:\/\/intake/,
          `${widgetFamily} has no widgetURL — tapping it would just open the app`,
        );
      }
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

    it('draws the same three stats on systemLarge / StandBy', () => {
      const large = render(context, layout, TODAY_WIDGET_STATES.urgent, {
        widgetFamily: 'systemLarge',
        colorScheme: 'dark',
      });
      const serialized = JSON.stringify(large);
      assert.match(serialized, /containerBackground/);
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
  });

  describe('AutoCoreWork widget', () => {
    const layout = serializeWidget('features/live-activity/widgets/work-orders-widget.tsx');

    for (const [name, props] of Object.entries(WORK_WIDGET_STATES)) {
      for (const environment of WIDGET_ENVIRONMENTS) {
        it(`renders ${name} on ${String(environment.widgetFamily)}${environment.isLuminanceReduced ? ' dimmed' : ''}`, () => {
          const result = render(context, layout, props, environment) as unknown as WidgetNode;
          assert.ok(result && typeof result.type === 'string', 'must return a single element');
          assert.ok(hasVisibleLeaf(result), 'widget rendered nothing visible');
        });
      }
    }

    it('shows open and waiting counts on the medium family', () => {
      const medium = render(context, layout, WORK_WIDGET_STATES.attention, {
        widgetFamily: 'systemMedium',
        colorScheme: 'dark',
      });
      const serialized = JSON.stringify(medium);
      assert.match(serialized, /"text":"12"/);
      assert.match(serialized, /"text":"3"/);
      assert.match(serialized, /autocoremobile:\/\/orders/);
    });
  });

  describe('AutoCoreWarehouse widget', () => {
    const layout = serializeWidget('features/live-activity/widgets/warehouse-widget.tsx');

    for (const [name, props] of Object.entries(WAREHOUSE_WIDGET_STATES)) {
      for (const environment of WIDGET_ENVIRONMENTS) {
        it(`renders ${name} on ${String(environment.widgetFamily)}${environment.isLuminanceReduced ? ' dimmed' : ''}`, () => {
          const result = render(context, layout, props, environment) as unknown as WidgetNode;
          assert.ok(result && typeof result.type === 'string', 'must return a single element');
          assert.ok(hasVisibleLeaf(result), 'widget rendered nothing visible');
        });
      }
    }

    it('shows place, low, and engines on the medium family', () => {
      const medium = render(context, layout, WAREHOUSE_WIDGET_STATES.placing, {
        widgetFamily: 'systemMedium',
        colorScheme: 'dark',
      });
      const serialized = JSON.stringify(medium);
      assert.match(serialized, /"text":"4"/);
      assert.match(serialized, /"text":"7"/);
      assert.match(serialized, /"text":"248"/);
      assert.match(serialized, /autocoremobile:\/\/scan/);
    });
  });
});
