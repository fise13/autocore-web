/**
 * What remains of the old Overview snapshot after Home became a Dynamic
 * Business Summary. The live Home contract now lives in `./home/types.ts`.
 *
 * `OverviewWeekBar` survives because the week-bar strip (`McWeekBars`) and the
 * accounting hero metrics both speak it — it is a chart shape, not a Home model.
 */
export type OverviewWeekBar = {
  label: string;
  value: number;
};
