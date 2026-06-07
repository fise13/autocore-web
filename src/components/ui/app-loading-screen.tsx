import { AppLoadingLogo } from "@/components/brand/app-loading-logo";
import { userCopy } from "@/lib/user-copy";

type AppLoadingScreenProps = {
  compact?: boolean;
  message?: string;
};

export function AppLoadingScreen({
  compact = false,
  message = userCopy.auth.loading,
}: AppLoadingScreenProps) {
  return (
    <div
      className={
        compact
          ? "flex flex-col items-center justify-center gap-3 py-16"
          : "flex min-h-screen flex-col items-center justify-center gap-5 bg-background"
      }
      role="status"
      aria-live="polite"
      aria-label={message}
      suppressHydrationWarning
    >
      <AppLoadingLogo size={compact ? 56 : 80} />
      <div className="flex flex-col items-center gap-1.5 animate-autocore-fade-in-up motion-reduce:animate-none">
        <p className="text-sm font-medium tracking-tight text-foreground">{userCopy.appName}</p>
        <p className="text-xs text-muted-foreground" suppressHydrationWarning>
          {message}
        </p>
      </div>
    </div>
  );
}
