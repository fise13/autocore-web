import type { ComponentProps } from "react";

export function AuthDivider({ children, ...props }: ComponentProps<"div">) {
  return (
    <div className="relative flex w-full items-center" {...props}>
      <div className="w-full border-t border-border" />
      <div className="flex w-max shrink-0 justify-center text-nowrap px-2 text-xs text-muted-foreground">
        {children}
      </div>
      <div className="w-full border-t border-border" />
    </div>
  );
}
