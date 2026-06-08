import * as React from "react";

import { cn } from "@/lib/utils";

import { Input } from "./input";

function InputGroup({ className, ...props }: React.ComponentProps<"div">) {
  return <div data-slot="input-group" className={cn("relative flex w-full items-center", className)} {...props} />;
}

function InputGroupAddon({
  className,
  align = "inline-start",
  ...props
}: React.ComponentProps<"div"> & { align?: "inline-start" | "inline-end" }) {
  return (
    <div
      data-slot="input-group-addon"
      className={cn(
        "pointer-events-none absolute inset-y-0 flex items-center text-muted-foreground",
        align === "inline-start" ? "left-0 pl-3" : "right-0 pr-3",
        className,
      )}
      {...props}
    />
  );
}

function InputGroupInput({ className, ...props }: React.ComponentProps<typeof Input>) {
  return (
    <Input
      data-slot="input-group-input"
      className={cn("h-10 pl-9", className)}
      {...props}
    />
  );
}

export { InputGroup, InputGroupAddon, InputGroupInput };
