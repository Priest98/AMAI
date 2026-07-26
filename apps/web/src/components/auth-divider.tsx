import type React from "react";

export function AuthDivider({
	children,
	...props
}: React.ComponentProps<"div">) {
	return (
		<div className="relative flex w-full items-center" {...props}>
			<div className="w-full border-t border-slate-200 dark:border-white/10" />
			<div className="flex w-max justify-center text-nowrap px-2 text-slate-400 dark:text-zinc-500 text-[10px] font-bold tracking-wider">
				{children}
			</div>
			<div className="w-full border-t border-slate-200 dark:border-white/10" />
		</div>
	);
}
