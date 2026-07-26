import type React from "react";

export function Logo({ className = "h-6", ...props }: React.ComponentProps<"div">) {
	return (
		<div className={`flex items-center space-x-2 ${className}`} {...props}>
			<div className="h-8 w-8 rounded-xl bg-gradient-to-tr from-rose-500 via-purple-600 to-indigo-600 flex items-center justify-center text-white font-black text-sm shadow-md shadow-rose-500/20">
				M
			</div>
			<span className="font-bold text-lg text-slate-900 dark:text-white tracking-tight">Marketing OS</span>
		</div>
	);
}
