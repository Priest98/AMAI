import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { FullWidthDivider } from "@/components/full-width-divider";

type LogoType = {
	src: string;
	alt: string;
};

type TileData = {
	row: number;
	col: number;
	logo?: LogoType;
};

export function IntegrationsBlock({ onExploreClick }: { onExploreClick?: () => void }) {
	return (
		<div className="relative mx-auto grid max-w-4xl grid-cols-1 gap-8 border-x border-slate-200/60 dark:border-white/10 md:grid-cols-2 md:items-center rounded-[22px] soft-card p-6 my-6">
			<FullWidthDivider className="-top-px" />

			{/* Left Content */}
			<div className="p-4 md:p-6 space-y-4">
				<div className="space-y-2">
					<h2 className="font-extrabold text-2xl text-slate-900 dark:text-white tracking-tight sm:text-3xl">
						Connect with your favorite tools
					</h2>
					<p className="text-slate-500 dark:text-zinc-400 text-xs md:text-sm leading-relaxed">
						Connect Google Drive, Instagram, and TikTok with Marketing OS AutoPilot engine for automated AI publishing.
					</p>
				</div>
				<Button size="sm" onClick={onExploreClick}>Explore integrations</Button>
			</div>

			{/* Right Content - Visual */}
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

function IntegrationCard({ row, col, logo }: TileData) {
	return (
		<div
			className={cn(
				"absolute flex size-16 items-center justify-center rounded-xl",
				logo ? "bg-slate-100 dark:bg-white/10 border border-slate-200/60 dark:border-white/10 shadow-sm" : ""
			)}
			style={{
				left: col * 64,
				top: row * 64,
			}}
		>
			{logo && (
				<img
					alt={logo.alt}
					className={cn(
						"pointer-events-none size-8 select-none object-contain p-1"
					)}
					height={40}
					src={logo.src}
					width={40}
				/>
			)}
		</div>
	);
}

const tiles: TileData[] = [
	{
		row: 0,
		col: 1,
		logo: {
			src: "https://storage.efferd.com/logo/vercel.svg",
			alt: "Vercel Logo",
		},
	},
	{
		row: 0,
		col: 3,
		logo: {
			src: "https://storage.efferd.com/logo/openai.svg",
			alt: "OpenAI Logo",
		},
	},

	{ row: 1, col: 0 },
	{
		row: 1,
		col: 2,
		logo: {
			src: "https://storage.efferd.com/logo/cursor.svg",
			alt: "Cursor Logo",
		},
	},
	{
		row: 1,
		col: 4,
		logo: {
			src: "https://storage.efferd.com/logo/v0.svg",
			alt: "V0 Logo",
		},
	},

	{
		row: 2,
		col: 1,
		logo: {
			src: "https://storage.efferd.com/logo/planetscale.svg",
			alt: "Planetscale Logo",
		},
	},
	{ row: 2, col: 3 },

	{ row: 3, col: 0 },
	{
		row: 3,
		col: 2,
		logo: {
			src: "https://storage.efferd.com/logo/base-ui.svg",
			alt: "Base UI Logo",
		},
	},
	{
		row: 3,
		col: 4,
		logo: {
			src: "https://storage.efferd.com/logo/copilot.svg",
			alt: "Copilot Logo",
		},
	},

	{
		row: 4,
		col: 1,
		logo: {
			src: "https://storage.efferd.com/logo/github.svg",
			alt: "GitHub Logo",
		},
	},
	{
		row: 4,
		col: 3,
		logo: {
			src: "https://storage.efferd.com/logo/dub.svg",
			alt: "Dub Logo",
		},
	},
];
