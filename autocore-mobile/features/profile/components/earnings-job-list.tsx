import { View } from 'react-native';

import { CatalogRow, Text, catalogRowPosition } from '@/components/ui';

import type { EarningsJobPreview } from '../lib/build-earnings-snapshot';
import { EarningsSectionHeader } from './earnings-section-header';

type EarningsJobListProps = {
  title: string;
  meta: string;
  jobs: EarningsJobPreview[];
  onOpenJob: (id: string) => void;
  onOpenAll?: () => void;
};

export function EarningsJobList({ title, meta, jobs, onOpenJob, onOpenAll }: EarningsJobListProps) {
  const total = jobs.length + (onOpenAll ? 1 : 0);

  return (
    <View>
      <EarningsSectionHeader title={title} meta={meta} />
      {jobs.map((job, index) => (
        <CatalogRow
          key={job.id}
          position={catalogRowPosition(index, total)}
          title={`#${job.number}`}
          monoTitle
          subtitle={
            <Text variant="caption" color="muted" numberOfLines={1}>
              {job.title} · {job.detail}
            </Text>
          }
          value={job.statusLabel}
          accessibilityLabel={`Work order ${job.number}, ${job.title}, ${job.statusLabel}`}
          onPress={() => onOpenJob(job.id)}
        />
      ))}
      {onOpenAll ? (
        <CatalogRow
          position={jobs.length === 0 ? 'only' : 'last'}
          title="All work orders"
          accessibilityLabel="All work orders"
          onPress={onOpenAll}
        />
      ) : null}
    </View>
  );
}
