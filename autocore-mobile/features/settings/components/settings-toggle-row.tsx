import { CollectionSwitchRow } from '@/components/ui';

type SettingsToggleRowProps = {
  label: string;
  subtitle?: string;
  value: boolean;
  onValueChange: (value: boolean) => void;
  disabled?: boolean;
};

/** @deprecated Prefer CollectionSwitchRow inside ListSection. */
export function SettingsToggleRow({
  label,
  subtitle,
  value,
  onValueChange,
  disabled,
}: SettingsToggleRowProps) {
  return (
    <CollectionSwitchRow
      title={label}
      subtitle={subtitle}
      value={value}
      onValueChange={onValueChange}
      disabled={disabled}
    />
  );
}
