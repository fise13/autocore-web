import { SettingsRow } from '@/features/settings/components/settings-row';

type OrganizationSwitchButtonProps = {
  companyName: string;
  onPress: () => void;
};

/**
 * Switch-organization row for SettingsGroup.
 * Kept for reuse outside Company (e.g. profile hub) — no Surface wrapper.
 */
export function OrganizationSwitchButton({ companyName, onPress }: OrganizationSwitchButtonProps) {
  return (
    <SettingsRow
      label="Switch organization"
      subtitle={companyName}
      icon="store"
      onPress={onPress}
    />
  );
}
