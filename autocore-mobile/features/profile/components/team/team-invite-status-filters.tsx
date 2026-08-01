import { HorizontalFilterBar } from '@/components/ui';
import { INVITE_STATUS_LABELS, type InviteStatus } from '@autocore/org';

export type InviteStatusFilter = InviteStatus | 'all';

const INVITE_FILTER_OPTIONS: Array<{ value: InviteStatusFilter; label: string }> = [
  { value: 'all', label: 'All' },
  ...(Object.keys(INVITE_STATUS_LABELS) as InviteStatus[]).map((status) => ({
    value: status,
    label: INVITE_STATUS_LABELS[status],
  })),
];

type TeamInviteStatusFiltersProps = {
  value: InviteStatusFilter;
  onChange: (value: InviteStatusFilter) => void;
};

export function TeamInviteStatusFilters({ value, onChange }: TeamInviteStatusFiltersProps) {
  return (
    <HorizontalFilterBar
      options={INVITE_FILTER_OPTIONS}
      value={value}
      onChange={onChange}
    />
  );
}
