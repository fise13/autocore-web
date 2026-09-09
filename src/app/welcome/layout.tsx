import { GoogleAdsSubscriptionEventSnippet } from "@/components/analytics/google-ads-subscription-event-snippet";

export default function WelcomeLayout({ children }: { children: React.ReactNode }) {
  return (
    <>
      <GoogleAdsSubscriptionEventSnippet />
      {children}
    </>
  );
}
