import { CollectionRow } from '@/components/ui';
import { StoreIcon } from '@/assets/icons';

type OrganizationSwitchButtonProps = {
  companyName: string;
  onPress: () => void;
};

/** Switch-organization row for ListSection islands. */
export function OrganizationSwitchButton({ companyName, onPress }: OrganizationSwitchButtonProps) {
  return (
    <CollectionRow
      title="Switch organization"
      subtitle={companyName}
      icon={StoreIcon}
      onPress={onPress}
    />
  );
}
