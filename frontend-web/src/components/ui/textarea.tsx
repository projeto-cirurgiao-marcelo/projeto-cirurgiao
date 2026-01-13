import * as React from "react"

import { cn } from "@/lib/utils"

function Textarea({ className, ...props }: React.ComponentProps<"textarea">) {
  return (
    <textarea
      data-slot="textarea"
      className={cn(
        "min-h-24 w-full rounded-md border-2 border-gray-200 bg-white px-4 py-3 text-sm font-medium text-gray-900 shadow-sm transition-all duration-200 outline-none resize-y",
        "placeholder:text-gray-400 placeholder:font-normal",
        "hover:border-gray-300",
        "focus:border-blue-500 focus:ring-4 focus:ring-blue-100",
        "disabled:cursor-not-allowed disabled:opacity-50 disabled:bg-gray-50",
        "aria-invalid:border-red-500 aria-invalid:ring-4 aria-invalid:ring-red-100",
        className
      )}
      {...props}
    />
  )
}

export { Textarea }
