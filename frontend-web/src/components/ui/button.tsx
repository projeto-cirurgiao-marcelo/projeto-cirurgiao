import * as React from "react"
import { Slot } from "@radix-ui/react-slot"
import { cva, type VariantProps } from "class-variance-authority"

import { cn } from "@/lib/utils"

const buttonVariants = cva(
  "inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-md text-sm font-semibold tracking-tight transition-all duration-200 disabled:pointer-events-none disabled:opacity-50 [&_svg]:pointer-events-none [&_svg:not([class*='size-'])]:size-4 shrink-0 [&_svg]:shrink-0 outline-none focus-visible:border-ring focus-visible:ring-ring/50 focus-visible:ring-[3px] aria-invalid:ring-destructive/20 dark:aria-invalid:ring-destructive/40 aria-invalid:border-destructive active:scale-[0.98]",
  {
    variants: {
      variant: {
        default:
          "bg-gradient-to-r from-blue-600 to-blue-700 text-white hover:from-blue-700 hover:to-blue-800 shadow-primary hover:shadow-lg hover:-translate-y-0.5 active:translate-y-0 active:shadow-primary",
        destructive:
          "bg-gradient-to-r from-red-600 to-red-700 text-white hover:from-red-700 hover:to-red-800 shadow-error hover:shadow-lg hover:-translate-y-0.5 active:translate-y-0 active:shadow-error focus-visible:ring-destructive/20 dark:focus-visible:ring-destructive/40",
        outline:
          "border-2 border-[rgb(var(--primary-500))] bg-background text-[rgb(var(--primary-500))] hover:bg-[rgb(var(--primary-50))] dark:hover:bg-[rgb(var(--primary-900))]/20 shadow-sm hover:shadow-md",
        secondary:
          "bg-[rgb(var(--bg-secondary))] text-[rgb(var(--text-primary))] hover:bg-[rgb(var(--bg-tertiary))] hover:shadow-sm",
        ghost:
          "hover:bg-[rgb(var(--primary-50))] hover:text-[rgb(var(--primary-700))] dark:hover:bg-[rgb(var(--primary-900))]/20",
        link:
          "text-[rgb(var(--primary-500))] underline-offset-4 hover:underline hover:text-[rgb(var(--primary-700))]",
        success:
          "bg-gradient-to-r from-green-500 to-green-600 text-white hover:from-green-600 hover:to-green-700 shadow-success hover:shadow-lg hover:-translate-y-0.5 active:translate-y-0",
        warning:
          "bg-gradient-to-r from-amber-500 to-amber-600 text-white hover:from-amber-600 hover:to-amber-700 hover:shadow-lg hover:-translate-y-0.5 active:translate-y-0",
      },
      size: {
        default: "h-10 px-6 py-2.5 text-base has-[>svg]:px-4",
        sm: "h-8 rounded-md gap-1.5 px-4 py-1.5 text-sm has-[>svg]:px-3",
        lg: "h-12 rounded-lg px-8 py-3 text-lg has-[>svg]:px-6",
        icon: "size-10",
        "icon-sm": "size-8",
        "icon-lg": "size-12",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
    },
  }
)

function Button({
  className,
  variant,
  size,
  asChild = false,
  ...props
}: React.ComponentProps<"button"> &
  VariantProps<typeof buttonVariants> & {
    asChild?: boolean
  }) {
  const Comp = asChild ? Slot : "button"

  return (
    <Comp
      data-slot="button"
      className={cn(buttonVariants({ variant, size, className }))}
      {...props}
    />
  )
}

export { Button, buttonVariants }
