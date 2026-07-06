import { InviteAcceptScreen } from "@/components/organization/invite-accept-screen";

type InvitePageProps = {
  params: Promise<{ token: string }>;
};

export default async function InvitePage({ params }: InvitePageProps) {
  const { token } = await params;
  return <InviteAcceptScreen token={token} />;
}
