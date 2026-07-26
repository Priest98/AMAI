import * as React from "react"
import { cn } from "@/lib/utils"

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: "default" | "destructive" | "outline" | "secondary" | "ghost" | "link"
  size?: "default" | "sm" | "lg" | "icon"
}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant = "default", size = "default", ...props }, ref) => {
    const baseStyles = "inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-xl text-xs font-bold transition-all focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:pointer-events-none disabled:opacity-50 active:scale-95 cursor-pointer"
    
    const variants = {
      default: "bg-rose-600 text-white shadow hover:bg-rose-700 dark:bg-rose-500 dark:hover:bg-rose-600 border border-white/10",
      destructive: "bg-red-600 text-white shadow-sm hover:bg-red-700",
      outline: "border border-slate-200 dark:border-white/10 bg-white dark:bg-white/5 hover:bg-slate-100 dark:hover:bg-white/10 text-slate-900 dark:text-white shadow-sm",
      secondary: "bg-slate-100 text-slate-900 shadow-sm hover:bg-slate-200 dark:bg-zinc-800 dark:text-zinc-50",
      ghost: "hover:bg-slate-100 dark:hover:bg-white/5 text-slate-700 dark:text-zinc-300",
      link: "text-rose-600 underline-offset-4 hover:underline dark:text-rose-400",
    }

    const sizes = {
      default: "h-10 px-4 py-2",
      sm: "h-8 rounded-lg px-3 text-xs",
      lg: "h-12 rounded-xl px-8 text-sm",
      icon: "h-9 w-9",
    }

    return (
      <button
        className={cn(baseStyles, variants[variant], sizes[size], className)}
        ref={ref}
        {...props}
      />
    )
  }
)
Button.displayName = "Button"

export { Button }
