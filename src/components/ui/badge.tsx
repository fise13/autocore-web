import { mergeProps } from "@base-ui/react/merge-props"
import { useRender } from "@base-ui/react/use-render"
import { cva, type VariantProps } from "class-variance-authority"

import { cn } from "@/lib/utils"

/**
 * Tone variants read from the pre-composited `*-subtle` / `*-on-subtle` /
 * `*-border` tokens rather than alpha-blending the solid colour. The old
 * `bg-destructive/10 text-destructive` pairing measured 3.45:1 in the light
 * theme; success was 2.45:1. See packages/design-tokens.
 */
const badgeVariants = cva(
  "group/badge inline-flex h-5 w-fit shrink-0 items-center justify-center gap-1 overflow-hidden rounded-4xl border border-transparent px-2 py-0.5 text-xs font-medium whitespace-nowrap transition-all focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/50 has-data-[icon=inline-end]:pr-1.5 has-data-[icon=inline-start]:pl-1.5 aria-invalid:border-destructive aria-invalid:ring-destructive/20 dark:aria-invalid:ring-destructive/40 [&>svg]:pointer-events-none [&>svg]:size-3!",
  {
    variants: {
      variant: {
        default: "bg-primary text-primary-foreground [a]:hover:bg-primary/80",
        secondary:
          "bg-secondary text-secondary-foreground [a]:hover:bg-secondary/80",
        destructive:
          "border-danger-border bg-danger-subtle text-danger-on-subtle focus-visible:ring-destructive/20 dark:focus-visible:ring-destructive/40",
        success:
          "border-success-border bg-success-subtle text-success-on-subtle",
        warning:
          "border-warning-border bg-warning-subtle text-warning-on-subtle",
        info: "border-primary-border bg-primary-subtle text-primary-on-subtle",
        outline:
          "border-border text-foreground [a]:hover:bg-muted [a]:hover:text-muted-foreground",
        ghost:
          "hover:bg-muted hover:text-muted-foreground dark:hover:bg-muted/50",
        link: "text-primary underline-offset-4 hover:underline",
      },
    },
    defaultVariants: {
      variant: "default",
    },
  }
)

function Badge({
  className,
  variant = "default",
  dot = false,
  render,
  children,
  ...props
}: useRender.ComponentProps<"span"> &
  VariantProps<typeof badgeVariants> & {
    /** Leading 6px dot — the category-chip pattern. */
    dot?: boolean
  }) {
  return useRender({
    defaultTagName: "span",
    props: mergeProps<"span">(
      {
        className: cn(badgeVariants({ variant }), dot && "pl-1.5", className),
        children: (
          <>
            {dot ? (
              <span
                aria-hidden="true"
                className="size-1.5 shrink-0 rounded-full bg-current"
              />
            ) : null}
            {children}
          </>
        ),
      },
      props
    ),
    render,
    state: {
      slot: "badge",
      variant,
    },
  })
}

export { Badge, badgeVariants }
