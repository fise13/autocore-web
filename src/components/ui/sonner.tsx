"use client";

import { useTheme } from "next-themes";
import {
  CircleAlert,
  CircleCheck,
  Info,
  LoaderCircle,
} from "lucide-react";
import { Toaster as Sonner, type ToasterProps } from "sonner";
import { userCopy } from "@/lib/user-copy";

import { cn } from "@/lib/utils";

import "sonner/dist/styles.css";

const toastBase = cn(
  "group pointer-events-auto w-[min(100vw-2rem,380px)] rounded-xl border p-3.5 shadow-popover",
  "bg-popover text-popover-foreground border-border",
);

export function Toaster({ ...props }: ToasterProps) {
  const { theme = "system" } = useTheme();

  return (
    <Sonner
      theme={theme as ToasterProps["theme"]}
      position="bottom-right"
      closeButton
      richColors={false}
      offset={16}
      gap={8}
      visibleToasts={5}
      className="toaster group"
      toastOptions={{
        unstyled: true,
        closeButtonAriaLabel: userCopy.commonUi.closeAria,
        classNames: {
          toast: cn(toastBase, "flex items-start gap-2.5"),
          title: "text-sm font-medium tracking-tight text-foreground",
          description: "mt-0.5 text-xs leading-snug text-muted-foreground",
          content: "min-w-0 flex-1 pr-6",
          icon: "mt-0.5 shrink-0 [&_svg]:size-4",
          closeButton: cn(
            "!absolute right-2 top-2 flex size-6 items-center justify-center rounded-md border-0",
            "bg-transparent text-muted-foreground transition-colors",
            "hover:bg-muted/60 hover:text-foreground",
          ),
          success: "border-l-[3px] border-l-success",
          error: "border-l-[3px] border-l-danger",
          default: "border-border",
        },
      }}
      icons={{
        success: <CircleCheck className="text-success-on-subtle" />,
        info: <Info className="text-primary-on-subtle" />,
        error: <CircleAlert className="text-danger-on-subtle" />,
        loading: <LoaderCircle className="animate-spin text-primary" />,
      }}
      style={
        {
          "--width": "min(380px, calc(100vw - 2rem))",
          "--border-radius": "calc(var(--radius) * 1.4)",
        } as React.CSSProperties
      }
      {...props}
    />
  );
}
