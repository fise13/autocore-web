import { Divider, SectionHeader } from '@/components/ui';

export function AcSectionTitle({
  title,
  actionLabel,
  onAction,
}: {
  title: string;
  actionLabel?: string;
  onAction?: () => void;
}) {
  return <SectionHeader title={title} actionLabel={actionLabel} onAction={onAction} />;
}

export function AcDivider({ inset = 44 }: { inset?: number }) {
  return <Divider inset={inset} />;
}
