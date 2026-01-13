import * as React from "react"

import { cn } from "@/lib/utils"

function Input({ className, type, ...props }: React.ComponentProps<"input">) {
  return (
    <input
      type={type}
      data-slot="input"
      className={cn(
        "h-10 w-full min-w-0 rounded-md border-2 border-gray-200 bg-white px-4 py-2 text-sm font-medium text-gray-900 shadow-sm transition-all duration-200 outline-none",
        "placeholder:text-gray-400 placeholder:font-normal",
        "hover:border-gray-300",
        "focus:border-blue-500 focus:ring-4 focus:ring-blue-100",
        "disabled:cursor-not-allowed disabled:opacity-50 disabled:bg-gray-50",
        "aria-invalid:border-red-500 aria-invalid:ring-4 aria-invalid:ring-red-100",
        "file:mr-4 file:inline-flex file:h-8 file:items-center file:justify-center file:rounded file:border-0 file:bg-gray-100 file:px-3 file:text-sm file:font-semibold file:text-gray-700 file:hover:bg-gray-200",
        className
      )}
      {...props}
    />
  )
}

export { Input }
