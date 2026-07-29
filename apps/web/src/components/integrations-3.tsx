import { cn } from "@/lib/utils";
import { FullWidthDivider } from "@/components/full-width-divider";
import { InstagramLogo, TikTokLogo } from "@/components/icons/platform-logos";

export function IntegrationsBlock() {
	return (
		<div className="relative mx-auto grid max-w-4xl grid-cols-1 gap-8 md:grid-cols-2 md:items-center rounded-xl exec-card p-6 my-6 overflow-hidden">
			<FullWidthDivider className="-top-px" />

			{/* Left Content */}
			<div className="p-4 md:p-6 space-y-3">
				<div className="space-y-2">
					<h2 className="font-extrabold text-xl tracking-tight sm:text-2xl" style={{ color: 'var(--text-primary)' }}>
						Core Publishing Platforms
					</h2>
					<p className="text-xs md:text-sm leading-relaxed" style={{ color: 'var(--text-secondary)' }}>
						Instagram and TikTok power the AMAI AutoPilot engine for automated publishing. Connecting a Google Drive folder for media sync lives in the Media Library.
					</p>
				</div>
			</div>

			{/* Right Content - 3 Icons */}
			<div className="flex items-center justify-center md:justify-end p-4">
				<div className="flex items-center space-x-4">

					{/* 1. Instagram */}
					<div className="flex flex-col items-center space-y-2 group">
						<div className="h-16 w-16 rounded-xl bg-white dark:bg-zinc-900 border flex items-center justify-center p-3.5 shadow-lg group-hover:scale-105 transition-transform ring-2 ring-rose-500/20" style={{ borderColor: 'var(--card-border)' }}>
							<InstagramLogo className="h-10 w-10" />
						</div>
						<span className="text-xs font-bold" style={{ color: 'var(--text-primary)' }}>Instagram</span>
					</div>

					{/* 2. TikTok */}
					<div className="flex flex-col items-center space-y-2 group">
						<div className="h-14 w-14 rounded-xl bg-white dark:bg-zinc-900 border flex items-center justify-center p-3 shadow-md group-hover:scale-105 transition-transform text-slate-950 dark:text-white" style={{ borderColor: 'var(--card-border)' }}>
							<TikTokLogo className="h-8 w-8" />
						</div>
						<span className="text-[11px] font-bold" style={{ color: 'var(--text-secondary)' }}>TikTok</span>
					</div>

				</div>
			</div>

			<FullWidthDivider className="-bottom-px" />
		</div>
	);
}
