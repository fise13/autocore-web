/**
 * The line at the top of Home.
 *
 * It replaces the company name, and the difference is the whole point: a title
 * tells you which app you opened, a greeting tells you the workspace knows what
 * time it is and roughly how the day is going. So it varies — but never while
 * the reader is looking at it.
 *
 * Two rules hold the variation in check:
 *
 *  - **Deterministic.** The choice is a hash of the local calendar day plus the
 *    part of day, so every render inside that window returns the same line. No
 *    `Math.random`, no state to persist, nothing that can shuffle under a
 *    re-render or a pull-to-refresh.
 *  - **Local time.** Day and hour are read in the device's own timezone. A UTC
 *    day key would roll the greeting over at 1pm in Auckland.
 *
 * Context is used sparingly. A greeting that recites the numbers is not a
 * greeting — the numbers are directly below it, set much larger.
 *
 * Pure module — no React, no react-native imports, so `node --test` can run it.
 */

export type HomeGreetingPeriod = 'night' | 'morning' | 'afternoon' | 'evening';

/**
 * What the brief underneath is about to say, compressed to the only two states
 * a greeting may honestly react to.
 *
 * `unknown` covers the first frames before listeners land: a greeting must not
 * claim everything is under control while the screen is still a skeleton.
 */
export type HomeGreetingSignal = 'attention' | 'calm' | 'unknown';

type GreetingVariant = {
  text: string;
  /** Omitted = always eligible. Otherwise gated on the brief's state. */
  when?: Exclude<HomeGreetingSignal, 'unknown'>;
};

/**
 * Hour boundaries, local time. Night is its own band rather than an extension
 * of evening: "Good evening" at 3am reads as a bug.
 */
const PERIOD_BOUNDS = { morning: 5, afternoon: 12, evening: 17, night: 23 } as const;

/**
 * The variant pools.
 *
 * Kept short and human on purpose. Anything longer than a sentence stops being
 * a greeting and starts being a summary, and Home already has one of those.
 * Order is irrelevant — selection is by hash, not by position.
 */
export const HOME_GREETINGS: Record<HomeGreetingPeriod, readonly GreetingVariant[]> = {
  morning: [
    { text: 'Good morning' },
    { text: 'Morning' },
    { text: 'A new day, ready to go.' },
    { text: "Good morning. Let's get things moving." },
    { text: "Morning. Here's what's happening today." },
    { text: "Good morning. Here's your day at a glance." },
    { text: 'A few things need your attention.', when: 'attention' },
    { text: 'Good morning. Everything looks under control.', when: 'calm' },
  ],
  afternoon: [
    { text: 'Good afternoon' },
    { text: "How's the day going?" },
    { text: 'A productive afternoon ahead.' },
    { text: "Here's where things stand." },
    { text: "Let's see what's moving." },
    { text: 'A few things need your attention.', when: 'attention' },
    { text: 'Everything looks under control.', when: 'calm' },
  ],
  evening: [
    { text: 'Good evening' },
    { text: 'Evening' },
    { text: 'A look back at today.' },
    { text: 'The day in review.' },
    { text: "Winding down? Here's where things stand." },
    { text: "Good evening. Here's how today went.", when: 'calm' },
    { text: 'A few things still need you.', when: 'attention' },
  ],
  night: [
    { text: 'Good night' },
    { text: 'Late shift' },
    { text: 'Quiet hours' },
    { text: "Still going? Here's where things stand.", when: 'attention' },
  ],
} as const;

/** Longest line the pool can offer, for callers sizing a container. */
export const HOME_GREETING_MAX_LENGTH = Object.values(HOME_GREETINGS)
  .flat()
  .reduce((longest, variant) => Math.max(longest, variant.text.length), 0);

/** Never falls back to nothing: every pool's first entry is a plain greeting. */
const FALLBACK: Record<HomeGreetingPeriod, string> = {
  morning: 'Good morning',
  afternoon: 'Good afternoon',
  evening: 'Good evening',
  night: 'Good night',
};

export function resolveHomeGreetingPeriod(date: Date): HomeGreetingPeriod {
  const hour = date.getHours();
  if (hour < PERIOD_BOUNDS.morning) return 'night';
  if (hour < PERIOD_BOUNDS.afternoon) return 'morning';
  if (hour < PERIOD_BOUNDS.evening) return 'afternoon';
  if (hour < PERIOD_BOUNDS.night) return 'evening';
  return 'night';
}

/**
 * Local calendar day + part of day. Local getters, not `toISOString`: the key
 * must turn over at the reader's midnight, not at UTC's.
 */
export function homeGreetingSeed(date: Date, period: HomeGreetingPeriod): string {
  const year = date.getFullYear();
  const month = `${date.getMonth() + 1}`.padStart(2, '0');
  const day = `${date.getDate()}`.padStart(2, '0');
  return `${year}-${month}-${day}:${period}`;
}

/** FNV-1a, 32-bit. Any stable string hash would do; this one is short and even. */
function hash(seed: string): number {
  let value = 0x811c9dc5;
  for (let index = 0; index < seed.length; index += 1) {
    value ^= seed.charCodeAt(index);
    value = Math.imul(value, 0x01000193);
  }
  return value >>> 0;
}

export type SelectHomeGreetingInput = {
  now: Date;
  /** What the brief below is about to say. */
  signal?: HomeGreetingSignal;
  /**
   * Roughly how many characters fit on the greeting's allowed lines at display
   * size. Long editorial lines drop out of the pool on a narrow iPhone rather
   * than wrapping to a third line or shrinking to a second type scale.
   */
  charBudget?: number;
};

export type HomeGreeting = {
  text: string;
  period: HomeGreetingPeriod;
  /** Exposed so a caller can key an animation on "the line actually changed". */
  seed: string;
};

export function selectHomeGreeting({
  now,
  signal = 'unknown',
  charBudget = Number.POSITIVE_INFINITY,
}: SelectHomeGreetingInput): HomeGreeting {
  const period = resolveHomeGreetingPeriod(now);
  const seed = homeGreetingSeed(now, period);

  const eligible = HOME_GREETINGS[period].filter(
    (variant) =>
      (variant.when === undefined || variant.when === signal) &&
      variant.text.length <= charBudget,
  );

  // A budget tight enough to exclude everything still gets a greeting.
  const text = eligible.length === 0 ? FALLBACK[period] : eligible[hash(seed) % eligible.length].text;

  return { text, period, seed };
}
