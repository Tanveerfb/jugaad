import * as React from "react"
import { cn } from "cn"
import { ChaseFrame } from "./chase-frame"

type InputProps = React.ComponentProps<"input"> & {
  /** Classes for the frame around the input (width, margins). `className` styles the input. */
  frameClassName?: string
}

/**
 * Text input in a chase frame (component round 1b). Errors come from `aria-invalid` on the
 * input — pair it with a message linked by `aria-describedby`.
 */
function Input({ className, frameClassName, type, ...props }: InputProps) {
  return (
    <div data-slot="input-frame" className={cn("group/field relative w-full bg-background", frameClassName)}>
      <ChaseFrame />
      <input
        type={type}
        data-slot="input"
        className={cn(
          "relative h-10 w-full min-w-0 bg-transparent px-3.5 text-base outline-none placeholder:text-muted-foreground md:text-sm",
          "file:inline-flex file:h-6 file:border-0 file:bg-transparent file:text-sm file:font-medium file:text-foreground",
          "disabled:cursor-not-allowed disabled:opacity-50",
          className
        )}
        {...props}
      />
    </div>
  )
}

export { Input }
