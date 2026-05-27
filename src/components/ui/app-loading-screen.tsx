import { AppLogo } from "@/components/brand/app-logo";
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
      <div className="relative">
        <div className="absolute inset-0 animate-ping rounded-2xl bg-primary/10 motion-reduce:animate-none" />
        <AppLogo
          size={compact ? 56 : 80}
          className="relative animate-autocore-logo-enter motion-reduce:animate-none"
          priority
        />
      </div>
      <div className="flex flex-col items-center gap-2 animate-autocore-fade-in-up motion-reduce:animate-none">
        <p className="text-sm font-medium tracking-tight text-foreground">{userCopy.appName}</p>
        <p className="text-xs text-muted-foreground" suppressHydrationWarning>
          {message}
        </p>
        <div className="h-1 w-28 overflow-hidden rounded-full bg-muted">
          <div className="autocore-loading-bar h-full rounded-full bg-primary" />
        </div>
      </div>
    </div>
  );
}
