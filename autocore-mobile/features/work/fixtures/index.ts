export * from './orders/catalog';
export * from './intake/catalog';
export * from './charts/series';

import day00 from './days/day-00.json';
import day01 from './days/day-01.json';
import day02 from './days/day-02.json';
import day03 from './days/day-03.json';
import day04 from './days/day-04.json';
import day05 from './days/day-05.json';
import day06 from './days/day-06.json';
import day07 from './days/day-07.json';
import day08 from './days/day-08.json';
import day09 from './days/day-09.json';
import day10 from './days/day-10.json';
import day11 from './days/day-11.json';
import day12 from './days/day-12.json';
import day13 from './days/day-13.json';

export const WORK_OS_DAY_FIXTURES = [
  day00, day01, day02, day03, day04, day05, day06,
  day07, day08, day09, day10, day11, day12, day13,
] as const;

export function getWorkOsDayFixture(offset = 0) {
  return WORK_OS_DAY_FIXTURES[Math.abs(offset) % WORK_OS_DAY_FIXTURES.length]!;
}
