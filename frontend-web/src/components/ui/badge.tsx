import * as React from "react"
import { Slot } from "@radix-ui/react-slot"
import { cva, type VariantProps } from "class-variance-authority"

import { cn } from "@/lib/utils"

const badgeVariants = cva(
  "inline-flex items-center justify-center rounded border-0 px-3 py-1 text-xs font-semibold uppercase tracking-wide w-fit whitespace-nowrap shrink-0 [&>svg]:size-3 gap-1 [&>svg]:pointer-events-none focus-visible:border-ring focus-visible:ring-ring/50 focus-visible:ring-[3px] aria-invalid:ring-destructive/20 dark:aria-invalid:ring-destructive/40 aria-invalid:border-destructive transition-all duration-200 overflow-hidden shadow-sm",
  {
    variants: {
      variant: {
        default:
          "bg-gradient-to-r from-blue-500 to-blue-600 text-white [a&]:hover:from-blue-600 [a&]:hover:to-blue-700",
        secondary:
          "bg-gray-100 text-gray-700 border border-gray-200 [a&]:hover:bg-gray-200",
        destructive:
          "bg-gradient-to-r from-red-500 to-red-600 text-white [a&]:hover:from-red-600 [a&]:hover:to-red-700 focus-visible:ring-destructive/20 dark:focus-visible:ring-destructive/40",
        success:
          "bg-gradient-to-r from-green-500 to-green-600 text-white [a&]:hover:from-green-600 [a&]:hover:to-green-700",
        warning:
          "bg-amber-100 text-amber-700 border border-amber-200 [a&]:hover:bg-amber-200",
        info:
          "bg-blue-50 text-blue-700 border border-blue-200 [a&]:hover:bg-blue-100",
        outline:
          "border border-gray-300 text-gray-700 bg-transparent [a&]:hover:bg-gray-50 [a&]:hover:border-gray-400",
      },
    },
    defaultVariants: {
      variant: "default",
    },
  }
)

function Badge({
  className,
  variant,
  asChild = false,
  ...props
}: React.ComponentProps<"span"> &
  VariantProps<typeof badgeVariants> & { asChild?: boolean }) {
  const Comp = asChild ? Slot : "span"

  return (
    <Comp
      data-slot="badge"
      className={cn(badgeVariants({ variant }), className)}
      {...props}
    />
  )
}

export { Badge, badgeVariants }
