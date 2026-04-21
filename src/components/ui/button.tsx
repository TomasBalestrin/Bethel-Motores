import * as React from "react"
import { Slot } from "@radix-ui/react-slot"
import { cva, type VariantProps } from "class-variance-authority"

import { cn } from "@/lib/utils"

const buttonVariants = cva(
  "inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-sm text-sm font-semibold transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background disabled:pointer-events-none disabled:opacity-40 [&_svg]:pointer-events-none [&_svg]:size-4 [&_svg]:shrink-0",
  {
    variants: {
      variant: {
        default:
          "bg-primary text-primary-foreground hover:bg-secondary hover:shadow-md",
        gold:
          "bg-accent text-accent-foreground hover:bg-accent/85 hover:shadow-md",
        outline:
          "border-[1.5px] border-primary/15 bg-transparent text-primary hover:border-primary hover:bg-primary/5",
        "outline-gold":
          "border-[1.5px] border-accent bg-transparent text-accent hover:bg-accent/10",
        secondary:
          "bg-secondary text-secondary-foreground hover:bg-secondary/90",
        ghost: "bg-transparent text-primary hover:bg-primary/5",
        "ghost-gold": "bg-transparent text-accent hover:bg-accent/10",
        destructive:
          "bg-destructive text-destructive-foreground hover:opacity-90",
        success:
          "bg-success text-success-foreground hover:opacity-90",
        link: "text-accent underline-offset-4 hover:underline",
      },
      size: {
        default: "h-10 px-[22px] text-[13.5px]",
        sm: "h-8 px-4 text-xs",
        lg: "h-12 rounded-md px-7 text-[15px]",
        icon: "h-10 w-10 p-0",
        "icon-sm": "h-8 w-8 p-0",
        "icon-lg": "h-12 w-12 rounded-md p-0",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
    },
  }
)

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {
  asChild?: boolean
}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, size, asChild = false, ...props }, ref) => {
    const Comp = asChild ? Slot : "button"
    return (
      <Comp
        className={cn(buttonVariants({ variant, size, className }))}
        ref={ref}
        {...props}
      />
    )
  }
)
Button.displayName = "Button"

export { Button, buttonVariants }
