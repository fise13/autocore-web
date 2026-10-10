import { cn } from "@/lib/utils"
import { LoaderCircle } from "lucide-react"
import { userCopy } from "@/lib/user-copy"

function Spinner({ className, ...props }: React.ComponentProps<"svg">) {
  return (
    <LoaderCircle data-slot="spinner" role="status" aria-label={userCopy.commonUi.loading} className={cn("size-4 animate-spin", className)} {...props} />
  )
}

export { Spinner }
