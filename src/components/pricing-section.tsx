"use client";

import NumberFlow from "@number-flow/react";
import { CheckCircleIcon } from "lucide-react";
import { useReducedMotion } from "motion/react";
import type { ComponentProps, ReactNode } from "react";

import { type FREQUENCY } from "@/components/frequency-toggle";
import { cn } from "@/lib/utils";

type PricingSectionProps = {
  title: ReactNode;
  titleId?: string;
  titleAs?: "h1" | "h2";
  description?: ReactNode;
  toggle?: ReactNode;
  children: ReactNode;
  className?: string;
};

/** Header + frequency toggle + plan card. Visual language from @efferd/pricing-4. */
export function PricingSection({
  title,
  titleId,
  titleAs: TitleTag = "h2",
  description,
  toggle,
  children,
  className,
}: PricingSectionProps) {
  return (
    <div className={cn("flex w-full flex-col items-center justify-center gap-7", className)}>
      <div className="mx-auto flex max-w-xl flex-col gap-2">
        <TitleTag
          id={titleId}
          className="text-center text-2xl font-semibold tracking-tight md:text-3xl lg:text-4xl"
        >
          {title}
        </TitleTag>
        {description ? (
          <p className="text-center text-sm text-muted-foreground md:text-base">{description}</p>
        ) : null}
      </div>
      {toggle}
      <div className="mx-auto w-full max-w-md">{children}</div>
    </div>
  );
}

export type PricingCardModel = {
  name: string;
  info: string;
  highlighted?: boolean;
  features: readonly string[];
  billedLabel: string;
  saveLabel?: string;
  price: number;
  currency?: string;
  suffix: string;
};

type PricingCardProps = ComponentProps<"div"> & {
  plan: PricingCardModel;
  frequency: FREQUENCY;
  footer: ReactNode;
};

export function PricingCard({ plan, frequency, footer, className, ...props }: PricingCardProps) {
  const reduced = useReducedMotion();
  const showSave = frequency === "yearly" && Boolean(plan.saveLabel);

  return (
    <div
      className={cn(
        "relative flex w-full flex-col overflow-hidden rounded-lg border bg-transparent text-left",
        className,
      )}
      {...props}
    >
      <div className="relative border-b bg-transparent p-4">
        {showSave ? (
          <div className="absolute top-2 right-2 flex items-center gap-1 rounded-md border bg-primary px-2 py-0.5 text-xs text-primary-foreground">
            {plan.saveLabel}
          </div>
        ) : null}

        <div className="pr-24 font-medium text-lg">{plan.name}</div>
        <p className="font-normal text-sm text-muted-foreground">{plan.info}</p>
        <h3 className="mt-6 mb-1 flex w-max items-end gap-1">
          <NumberFlow
            isolate
            className="text-4xl font-semibold tracking-tight [&::part(suffix)]:text-base [&::part(suffix)]:font-normal [&::part(suffix)]:text-muted-foreground"
            format={{
              style: "currency",
              currency: plan.currency ?? "USD",
              maximumFractionDigits: 0,
            }}
            suffix={plan.suffix}
            value={plan.price}
            animated={!reduced}
            transformTiming={{ duration: 180, easing: "ease-out" }}
            spinTiming={{ duration: 180, easing: "ease-out" }}
          />
        </h3>
        <p className="mb-2 text-xs font-normal text-muted-foreground">{plan.billedLabel}</p>
      </div>

      <ul className="flex flex-col gap-3 bg-transparent px-4 pt-6 pb-8 text-sm text-muted-foreground">
        {plan.features.map((feature) => (
          <li className="flex items-center gap-2" key={feature}>
            <CheckCircleIcon className="size-3.5 shrink-0 text-foreground" />
            <span>{feature}</span>
          </li>
        ))}
      </ul>

      <div className="mt-auto flex w-full flex-col gap-2 border-t bg-transparent p-3">{footer}</div>
    </div>
  );
}
