import { cn } from "@/lib/utils";
import { FullWidthDivider } from "@/components/full-width-divider";
import { GoogleDriveLogo, InstagramLogo, TikTokLogo } from "@/components/icons/platform-logos";

type TileData = {
	row: number;
	col: number;
	type?: "google-drive" | "instagram" | "tiktok" | "empty";
};

export function IntegrationsBlock({ onExploreClick }: { onExploreClick?: () => void }) {
	return (
		<div className="relative mx-auto grid max-w-4xl grid-cols-1 gap-8 border-x border-slate-200/60 dark:border-white/10 md:grid-cols-2 md:items-center rounded-[24px] exec-card p-6 my-6 overflow-hidden">
			<FullWidthDivider className="-top-px" />

			{/* Left Content */}
			<div className="p-4 md:p-6 space-y-4">
				<div className="space-y-2">
					<h2 className="font-extrabold text-2xl text-slate-900 dark:text-white tracking-tight sm:text-3xl">
						Core Automation Platforms
					</h2>
					<p className="text-slate-500 dark:text-zinc-400 text-xs md:text-sm leading-relaxed">
						Google Drive, Instagram, and TikTok power the AMAI AutoPilot engine for automated AI content syncing and publishing.
					</p>
				</div>
				<div className="inline-flex items-center space-x-2 text-xs font-semibold text-rose-500 bg-rose-500/10 px-3 py-1.5 rounded-full border border-rose-500/20">
					<span>⚡ Instant OAuth Authorization Active</span>
				</div>
			</div>

			{/* Right Content - Scattered Grid Visual with ONLY Google Drive, Instagram, and TikTok */}
			<div className="place-items-end flex justify-center md:justify-end">
				<div className="relative size-80 overflow-hidden rounded-2xl">
					{/* Grid Background */}
					<div
						className={cn(
							"absolute inset-0 size-full",
							"bg-[linear-gradient(to_right,rgba(148,163,184,0.2)_1px,transparent_1px),linear-gradient(to_bottom,rgba(148,163,184,0.2)_1px,transparent_1px)]",
							"bg-[size:64px_64px]",
							"mask-[radial-gradient(ellipse_at_center,black,black,transparent)]"
						)}
					/>

					{tiles.map((tile) => (
						<IntegrationCard key={`${tile.row}_${tile.col}`} {...tile} />
					))}
				</div>
			</div>

			<FullWidthDivider className="-bottom-px" />
		</div>
	);
}

function IntegrationCard({ row, col, type }: TileData) {
	return (
		<div
			className={cn(
				"absolute flex size-16 items-center justify-center rounded-2xl transition-transform hover:scale-110",
				type && type !== "empty" ? "bg-white dark:bg-zinc-900 border border-slate-200/80 dark:border-white/10 shadow-md" : ""
			)}
			style={{
				left: col * 64,
				top: row * 64,
			}}
		>
			{type === "google-drive" && (
				<GoogleDriveLogo className="h-8 w-8" />
			)}

			{type === "instagram" && (
				<InstagramLogo className="h-8 w-8" />
			)}

			{type === "tiktok" && (
				<TikTokLogo className="h-8 w-8 text-slate-950 dark:text-white" />
			)}
		</div>
	);
}

// Scattered Grid featuring ONLY Google Drive, Instagram, and TikTok
const tiles: TileData[] = [
	// Row 0
	{ row: 0, col: 1, type: "google-drive" },
	{ row: 0, col: 3, type: "instagram" },

	// Row 1
	{ row: 1, col: 0, type: "empty" },
	{ row: 1, col: 2, type: "tiktok" },
	{ row: 1, col: 4, type: "google-drive" },

	// Row 2
	{ row: 2, col: 1, type: "instagram" },
	{ row: 2, col: 3, type: "tiktok" },

	// Row 3
	{ row: 3, col: 0, type: "empty" },
	{ row: 3, col: 2, type: "google-drive" },
	{ row: 3, col: 4, type: "instagram" },

	// Row 4
	{ row: 4, col: 1, type: "tiktok" },
	{ row: 4, col: 3, type: "google-drive" },
];
