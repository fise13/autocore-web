import { PageHeader } from '@/components/ui';

/** Claude-style centered settings title — identity lives in the email pill below. */
export function ProfileHeader() {
  return (
    <PageHeader
      title="Settings"
      align="center"
      titleStyle={{ fontSize: 17, lineHeight: 22, fontWeight: '600', letterSpacing: -0.28 }}
    />
  );
}
