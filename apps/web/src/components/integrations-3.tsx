import { cn } from "@/lib/utils";
import { FullWidthDivider } from "@/components/full-width-divider";
import { GoogleDriveLogo, InstagramLogo, TikTokLogo } from "@/components/icons/platform-logos";

export function IntegrationsBlock() {
	return (
		<div className="relative mx-auto grid max-w-4xl grid-cols-1 gap-8 md:grid-cols-2 md:items-center rounded-[24px] exec-card p-6 my-6 overflow-hidden">
			<FullWidthDivider className="-top-px" />

			{/* Left Content */}
			<div className="p-4 md:p-6 space-y-4">
				<div className="space-y-2">
					<h2 className="font-extrabold text-2xl tracking-tight sm:text-3xl" style={{ color: 'var(--text-primary)' }}>
						Core Automation Platforms
					</h2>
					<p className="text-xs md:text-sm leading-relaxed" style={{ color: 'var(--text-secondary)' }}>
						Google Drive, Instagram, and TikTok power the AMAI AutoPilot engine for automated AI content syncing and publishing.
					</p>
				</div>
				<div className="inline-flex items-center space-x-2 text-xs font-semibold px-3.5 py-1.5 rounded-full border" style={{ backgroundColor: 'var(--bg-surface-raised)', borderColor: 'var(--card-border)', color: 'var(--accent-warning)' }}>
					<span>⚡ Instant OAuth Authorization Active</span>
				</div>
			</div>

			{/* Right Content - 3 Icons */}
			<div className="flex items-center justify-center md:justify-end p-4">
				<div className="flex items-center space-x-4">
					
					{/* 1. Google Drive */}
					<div className="flex flex-col items-center space-y-2 group">
						<div className="h-16 w-16 rounded-2xl bg-white dark:bg-zinc-900 border flex items-center justify-center p-3.5 shadow-lg group-hover:scale-110 transition-transform" style={{ borderColor: 'var(--card-border)' }}>
							<GoogleDriveLogo className="h-9 w-9" />
						</div>
						<span className="text-[11px] font-bold" style={{ color: 'var(--text-secondary)' }}>Google Drive</span>
					</div>

					{/* 2. Instagram */}
					<div className="flex flex-col items-center space-y-2 group -mt-6">
						<div className="h-20 w-20 rounded-2xl bg-white dark:bg-zinc-900 border flex items-center justify-center p-4 shadow-xl group-hover:scale-110 transition-transform ring-2 ring-rose-500/20" style={{ borderColor: 'var(--card-border)' }}>
							<InstagramLogo className="h-12 w-12" />
						</div>
						<span className="text-xs font-bold" style={{ color: 'var(--text-primary)' }}>Instagram</span>
					</div>

					{/* 3. TikTok */}
					<div className="flex flex-col items-center space-y-2 group">
						<div className="h-16 w-16 rounded-2xl bg-white dark:bg-zinc-900 border flex items-center justify-center p-3.5 shadow-lg group-hover:scale-110 transition-transform text-slate-950 dark:text-white" style={{ borderColor: 'var(--card-border)' }}>
							<TikTokLogo className="h-9 w-9" />
						</div>
						<span className="text-[11px] font-bold" style={{ color: 'var(--text-secondary)' }}>TikTok</span>
					</div>

				</div>
			</div>

			<FullWidthDivider className="-bottom-px" />
		</div>
	);
}
