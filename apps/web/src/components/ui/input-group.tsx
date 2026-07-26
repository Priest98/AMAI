import * as React from "react"
import { cn } from "@/lib/utils"

export function InputGroup({ className, children, ...props }: React.ComponentProps<"div">) {
  return (
    <div className={cn("relative flex items-center w-full", className)} {...props}>
      {children}
    </div>
  )
}

export function InputGroupInput({ className, ...props }: React.ComponentProps<"input">) {
  return (
    <input
      className={cn(
        "w-full h-10 px-4 pl-10 rounded-xl border border-slate-200 dark:border-white/10 bg-slate-50 dark:bg-zinc-950/60 text-xs font-semibold text-slate-900 dark:text-white placeholder:text-slate-400 dark:placeholder:text-zinc-500 focus:outline-none focus:border-rose-500/50 transition-all",
        className
      )}
      {...props}
    />
  )
}

export function InputGroupAddon({ className, children, ...props }: React.ComponentProps<"div"> & { align?: "inline-start" | "inline-end" }) {
  return (
    <div className={cn("absolute left-3 flex items-center text-slate-400 dark:text-zinc-500 pointer-events-none", className)} {...props}>
      {children}
    </div>
  )
}
