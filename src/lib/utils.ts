import { clsx, type ClassValue } from "clsx"
import { extendTailwindMerge } from "tailwind-merge"

/**
 * Custom @theme scales from globals.css. Without them tailwind-merge reads
 * `text-micro` as a text colour and drops it next to `text-muted-foreground`.
 */
const twMerge = extendTailwindMerge({
  extend: {
    theme: {
      text: ["micro", "grid", "metric"],
      shadow: ["popover", "dialog", "pin"],
    },
  },
})

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}
