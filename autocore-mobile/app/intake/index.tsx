import { Redirect, useLocalSearchParams } from 'expo-router';

import { parseEngineListFilter } from '@/features/engines/lib/engine-lane';
import { enginesListHref, newEngineHref } from '@/features/engines/navigation';

function pickParam(value: string | string[] | undefined): string | undefined {
  return Array.isArray(value) ? value[0] : value;
}

/**
 * The intake bay is Engines Incoming. Camera sessions stay at `/intake/[jobId]`.
 */
export default function IntakeBayRedirect() {
  const params = useLocalSearchParams<{ filter?: string | string[]; new?: string | string[] }>();
  if (pickParam(params.new) === '1') {
    return <Redirect href={newEngineHref()} />;
  }
  const filter = parseEngineListFilter(pickParam(params.filter)) ?? 'incoming';
  return <Redirect href={enginesListHref(filter)} />;
}
