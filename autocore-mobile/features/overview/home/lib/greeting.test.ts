import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import {
  HOME_GREETINGS,
  HOME_GREETING_MAX_LENGTH,
  homeGreetingSeed,
  resolveHomeGreetingPeriod,
  selectHomeGreeting,
  type HomeGreetingPeriod,
} from './greeting';

/** Local-time constructor — the selector reads local hours, so tests must too. */
function at(year: number, month: number, day: number, hour: number): Date {
  return new Date(year, month - 1, day, hour, 0, 0, 0);
}

describe('resolveHomeGreetingPeriod', () => {
  it('bands the day in local time', () => {
    assert.equal(resolveHomeGreetingPeriod(at(2026, 8, 22, 0)), 'night');
    assert.equal(resolveHomeGreetingPeriod(at(2026, 8, 22, 4)), 'night');
    assert.equal(resolveHomeGreetingPeriod(at(2026, 8, 22, 5)), 'morning');
    assert.equal(resolveHomeGreetingPeriod(at(2026, 8, 22, 11)), 'morning');
    assert.equal(resolveHomeGreetingPeriod(at(2026, 8, 22, 12)), 'afternoon');
    assert.equal(resolveHomeGreetingPeriod(at(2026, 8, 22, 16)), 'afternoon');
    assert.equal(resolveHomeGreetingPeriod(at(2026, 8, 22, 17)), 'evening');
    assert.equal(resolveHomeGreetingPeriod(at(2026, 8, 22, 22)), 'evening');
    assert.equal(resolveHomeGreetingPeriod(at(2026, 8, 22, 23)), 'night');
  });
});

describe('selectHomeGreeting', () => {
  it('returns the same line for every render inside one period', () => {
    const first = selectHomeGreeting({ now: at(2026, 8, 22, 9) });
    for (let minute = 0; minute < 60 * 3; minute += 7) {
      const later = new Date(at(2026, 8, 22, 9).getTime() + minute * 60_000);
      if (resolveHomeGreetingPeriod(later) !== first.period) continue;
      assert.equal(selectHomeGreeting({ now: later }).text, first.text);
    }
  });

  it('is a pure function of the seed — no randomness', () => {
    const runs = Array.from({ length: 50 }, () =>
      selectHomeGreeting({ now: at(2026, 8, 22, 14) }).text,
    );
    assert.equal(new Set(runs).size, 1);
  });

  it('moves on when the day or the period changes', () => {
    const period = new Set<string>();
    const texts = new Set<string>();
    for (let day = 1; day <= 28; day += 1) {
      for (const hour of [8, 14, 20]) {
        const greeting = selectHomeGreeting({ now: at(2026, 9, day, hour) });
        period.add(greeting.period);
        texts.add(greeting.text);
      }
    }
    assert.equal(period.size, 3, 'morning, afternoon and evening all appear');
    assert.ok(texts.size >= 8, `a month of openings produced only ${texts.size} lines`);
  });

  it('never says everything is fine while the brief is still loading', () => {
    const calmLines = new Set(
      Object.values(HOME_GREETINGS)
        .flat()
        .filter((variant) => variant.when === 'calm')
        .map((variant) => variant.text),
    );
    for (let day = 1; day <= 31; day += 1) {
      for (let hour = 0; hour < 24; hour += 1) {
        const greeting = selectHomeGreeting({ now: at(2026, 7, day, hour), signal: 'unknown' });
        assert.ok(!calmLines.has(greeting.text), `"${greeting.text}" leaked into an unknown state`);
      }
    }
  });

  it('only offers an attention line when something needs attention', () => {
    const attentionLines = new Set(
      Object.values(HOME_GREETINGS)
        .flat()
        .filter((variant) => variant.when === 'attention')
        .map((variant) => variant.text),
    );
    for (let day = 1; day <= 31; day += 1) {
      for (let hour = 0; hour < 24; hour += 1) {
        const calm = selectHomeGreeting({ now: at(2026, 6, day, hour), signal: 'calm' });
        assert.ok(!attentionLines.has(calm.text));
      }
    }
  });

  it('reaches the contextual lines when the signal allows them', () => {
    const seen = new Set<string>();
    for (let day = 1; day <= 31; day += 1) {
      for (const hour of [8, 14, 20, 2]) {
        seen.add(selectHomeGreeting({ now: at(2026, 5, day, hour), signal: 'attention' }).text);
      }
    }
    const attentionLines = Object.values(HOME_GREETINGS)
      .flat()
      .filter((variant) => variant.when === 'attention')
      .map((variant) => variant.text);
    assert.ok(
      attentionLines.some((line) => seen.has(line)),
      'a month of attention states never surfaced a contextual line',
    );
  });

  it('drops long lines on a narrow screen instead of wrapping past two lines', () => {
    for (let day = 1; day <= 31; day += 1) {
      for (const hour of [8, 14, 20, 2]) {
        for (const signal of ['attention', 'calm', 'unknown'] as const) {
          const greeting = selectHomeGreeting({
            now: at(2026, 4, day, hour),
            signal,
            charBudget: 16,
          });
          assert.ok(
            greeting.text.length <= 16,
            `"${greeting.text}" (${greeting.text.length}) escaped a 16-char budget`,
          );
        }
      }
    }
  });

  it('still greets when the budget excludes every variant', () => {
    const greeting = selectHomeGreeting({ now: at(2026, 8, 22, 9), charBudget: 1 });
    assert.equal(greeting.text, 'Good morning');
  });

  it('keeps every pool stocked with a plain, always-eligible line', () => {
    const periods: HomeGreetingPeriod[] = ['morning', 'afternoon', 'evening', 'night'];
    for (const period of periods) {
      const unconditional = HOME_GREETINGS[period].filter((variant) => !variant.when);
      assert.ok(unconditional.length >= 1, `${period} has no unconditional greeting`);
      assert.ok(
        unconditional.some((variant) => variant.text.length <= 16),
        `${period} has no short greeting for a narrow screen`,
      );
    }
  });

  it('publishes a seed that changes exactly when the line may change', () => {
    const morning = homeGreetingSeed(at(2026, 8, 22, 9), 'morning');
    assert.equal(morning, homeGreetingSeed(at(2026, 8, 22, 11), 'morning'));
    assert.notEqual(morning, homeGreetingSeed(at(2026, 8, 23, 9), 'morning'));
    assert.notEqual(morning, homeGreetingSeed(at(2026, 8, 22, 14), 'afternoon'));
  });

  it('advertises a max length that matches the pool', () => {
    const longest = Object.values(HOME_GREETINGS)
      .flat()
      .reduce((max, variant) => Math.max(max, variant.text.length), 0);
    assert.equal(HOME_GREETING_MAX_LENGTH, longest);
  });
});
