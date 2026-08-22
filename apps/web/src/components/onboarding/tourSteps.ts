export interface TourStep {
  step: number;
  route: string | null;
  target: string | null;
  title: string;
  body: string;
}

/**
 * The 7-step guided product tour. `route` is auto-navigated to when a step
 * becomes active; `target` is a `data-tour="..."` attribute the spotlight
 * looks for in the DOM (nav links in dashboard/layout.tsx, or specific
 * page sections). Step 7 has neither — it's the completion screen.
 */
export const TOUR_STEPS: TourStep[] = [
  {
    step: 1,
    route: '/dashboard/integrations',
    target: 'nav-integrations',
    title: 'Connect Your Social Accounts',
    body: 'Connect your Instagram and TikTok accounts so Oyinca can publish content on your behalf.',
  },
  {
    step: 2,
    route: '/dashboard/media',
    target: 'nav-media',
    title: 'Choose Your Media Source',
    body: 'Upload media directly, or connect Google Drive. This is where all content enters Oyinca.',
  },
  {
    step: 3,
    route: '/dashboard/media',
    target: 'tour-upload-dropzone',
    title: 'Upload Your First Post',
    body: 'Upload your first image or video to see Oyinca in action.',
  },
  {
    step: 4,
    route: '/dashboard/engine',
    target: 'tour-engine-activity',
    title: 'Watch Oyinca',
    body: 'After uploading, Oyinca automatically detects new media, analyzes it, generates a caption and hashtags, finds the best publishing time, then moves the post to the Approval Queue or Scheduled Posts depending on your settings. You can monitor every step here in real time.',
  },
  {
    step: 5,
    route: '/dashboard/approval-queue',
    target: 'nav-approval-queue',
    title: 'Review Your Approval Queue',
    body: 'Review AI-generated captions, hashtags, and publishing time. You can edit the caption, hashtags, publishing date, and publishing time before approving.',
  },
  {
    step: 6,
    route: '/dashboard/engine',
    target: 'tour-engine-mode',
    title: 'Configure Oyinca',
    body: 'Manual Approval means every post requires your review before publishing. Automatic Approval means Oyinca schedules and publishes content on its own. We recommend starting with Manual Approval until you’re confident in the AI.',
  },
  {
    step: 7,
    route: null,
    target: null,
    title: "You're all set!",
    body: 'Oyinca is now ready to automate your social media workflow. Upload content, let the AI do the heavy lifting, and grow your online presence while you focus on creating.',
  },
];

export const TOTAL_STEPS = TOUR_STEPS.length;
