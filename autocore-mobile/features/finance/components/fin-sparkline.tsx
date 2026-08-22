import { memo } from 'react';

import { FinInlineChart } from './charts/fin-inline-chart';

/**
 * Row-scale shape — delegates to the Skia inline charts with a line variant.
 */
export const FinSparkline = memo(function FinSparkline({
  values,
  color,
}: {
  values: number[];
  color: string;
  width?: number;
  height?: number;
}) {
  return <FinInlineChart values={values} color={color} variant="line" />;
});
