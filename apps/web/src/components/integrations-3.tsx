import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { FullWidthDivider } from "@/components/full-width-divider";
import { GoogleDriveLogo, InstagramLogo, TikTokLogo } from "@/components/icons/platform-logos";

type TileData = {
	row: number;
	col: number;
	type?: "google-drive" | "instagram" | "tiktok" | "openai" | "vercel" | "github" | "empty";
};

export function IntegrationsBlock({ onExploreClick }: { onExploreClick?: () => void }) {
	return (
		<div className="relative mx-auto grid max-w-4xl grid-cols-1 gap-8 border-x border-slate-200/60 dark:border-white/10 md:grid-cols-2 md:items-center rounded-[24px] exec-card p-6 my-6 overflow-hidden">
			<FullWidthDivider className="-top-px" />

			{/* Left Content */}
			<div className="p-4 md:p-6 space-y-4">
				<div className="space-y-2">
					<h2 className="font-extrabold text-2xl text-slate-900 dark:text-white tracking-tight sm:text-3xl">
						Connect with your favorite tools
					</h2>
					<p className="text-slate-500 dark:text-zinc-400 text-xs md:text-sm leading-relaxed">
						Seamlessly connect Google Drive, Instagram, and TikTok with AMAI AutoPilot engine for automated AI publishing.
					</p>
				</div>
				<Button size="sm" onClick={onExploreClick}>Explore integrations</Button>
			</div>

			{/* Right Content - Scattered Grid Visual */}
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

			{type === "openai" && (
				<img
					alt="OpenAI"
					className="size-7 object-contain dark:invert"
					src="https://storage.efferd.com/logo/openai.svg"
				/>
			)}

			{type === "github" && (
				<img
					alt="GitHub"
					className="size-7 object-contain dark:invert"
					src="https://storage.efferd.com/logo/github.svg"
				/>
			)}

			{type === "vercel" && (
				<img
					alt="Vercel"
					className="size-7 object-contain dark:invert"
					src="https://storage.efferd.com/logo/vercel.svg"
				/>
			)}
		</div>
	);
}

// Scattered Grid (6x5) containing authentic Google Drive, Instagram, and TikTok SVGs
const tiles: TileData[] = [
	// Row 0
	{ row: 0, col: 1, type: "google-drive" },
	{ row: 0, col: 3, type: "openai" },

	// Row 1
	{ row: 1, col: 0, type: "empty" },
	{ row: 1, col: 2, type: "instagram" },
	{ row: 1, col: 4, type: "vercel" },

	// Row 2
	{ row: 2, col: 1, type: "tiktok" },
	{ row: 2, col: 3, type: "google-drive" },

	// Row 3
	{ row: 3, col: 0, type: "empty" },
	{ row: 3, col: 2, type: "github" },
	{ row: 3, col: 4, type: "instagram" },

	// Row 4
	{ row: 4, col: 1, type: "tiktok" },
	{ row: 4, col: 3, type: "google-drive" },
];
