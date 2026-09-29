import Link from 'next/link';
import { ArrowRight, BarChart3, CalendarClock, CheckCircle2, FileText, Pause, PencilLine, ShieldCheck, Sparkles, UploadCloud, Users, Video } from 'lucide-react';

const workflow = [
  [UploadCloud, 'Upload', 'Bring a photo or video from your device or connected library.'],
  [Sparkles, 'Prepare', 'Oyinca reads the content and applies your brand context.'],
  [FileText, 'Draft', 'Caption, focused hashtags and a posting time arrive together.'],
  [CheckCircle2, 'Approve', 'Review and edit the post before anything leaves Oyinca.'],
  [CalendarClock, 'Schedule', 'Send it to TikTok now or place it on your content calendar.'],
  [BarChart3, 'Learn', 'Published results return to analytics and improve future direction.'],
] as const;

export default function LandingStory() {
  return <>
    <section className="oy-v2-problem" aria-labelledby="problem-title">
      <div><p className="oy-v2-kicker">The work behind every post</p><h2 id="problem-title">Posting should not consume your entire day.</h2></div>
      <div className="oy-v2-problem-copy"><p>Ideas, captions, hashtags, timing, scheduling, publishing and performance checks turn one post into seven separate jobs.</p><p>Oyinca organises that repetitive work into one managed flow, while you keep control of the final decision.</p></div>
      <div className="oy-v2-task-line" aria-label="Repetitive social media tasks">{['Find an idea', 'Write the caption', 'Choose hashtags', 'Pick a time', 'Publish', 'Check results'].map((item, index) => <span key={item}><small>{String(index + 1).padStart(2, '0')}</small>{item}</span>)}</div>
    </section>

    <section id="how-it-works" className="oy-v2-workflow" aria-labelledby="workflow-title">
      <div className="oy-v2-section-head"><div><p className="oy-v2-kicker">See Oyinca working</p><h2 id="workflow-title">From raw content to a post you can approve.</h2></div><p>The full TikTok workflow is visible in one place. Each step has a clear status, owner and next action.</p></div>
      <ol className="oy-v2-steps">{workflow.map(([Icon, title, body], index) => <li key={title}><span className="oy-v2-step-number">{String(index + 1).padStart(2, '0')}</span><Icon aria-hidden="true" /><h3>{title}</h3><p>{body}</p></li>)}</ol>
      <div className="oy-v2-proof">
        <div className="oy-v2-proof-sidebar"><strong>Oyinca</strong>{['Dashboard', 'Create', 'Approval queue', 'Calendar', 'Analytics'].map((item, index) => <span key={item} className={index === 2 ? 'active' : ''}>{item}</span>)}</div>
        <div className="oy-v2-proof-main">
          <div className="oy-v2-proof-heading"><div><small>APPROVAL QUEUE</small><h3>One post is ready for you.</h3></div><span>Assisted</span></div>
          <div className="oy-v2-proof-post"><div className="oy-v2-proof-media"><Video aria-hidden="true" /><span>studio-process.mp4</span></div><div className="oy-v2-proof-content"><small>CAPTION</small><p>Small steps make the best behind-the-scenes stories. Here is how today&apos;s studio work came together.</p><small>HASHTAGS</small><p className="tags">#smallbusiness &nbsp; #creativeprocess &nbsp; #buildinpublic</p><div><span><CalendarClock aria-hidden="true" /> Today at 6:15 PM</span><button type="button" tabIndex={-1}>Approve post</button></div></div></div>
        </div>
      </div>
      <p className="oy-v2-platform-note">TikTok publishing is supported today. Until TikTok Direct Post approval is active, Oyinca sends content to TikTok for you to finish from the TikTok inbox.</p>
    </section>

    <section className="oy-v2-brain" aria-labelledby="brain-title">
      <div className="oy-v2-brain-copy"><p className="oy-v2-kicker">Oyinca Brain</p><h2 id="brain-title">Oyinca learns how your brand communicates.</h2><p>Add the facts that make your business distinct. Oyinca uses them as context for future drafts, instead of starting from a blank prompt every time.</p><ul>{['Brand voice and preferred tone', 'Audience and offers', 'Content themes and calls to action', 'Posting preferences and past approvals'].map(item => <li key={item}><CheckCircle2 aria-hidden="true" />{item}</li>)}</ul></div>
      <div className="oy-v2-brain-panel"><div className="oy-v2-brain-input"><small>BRAND CONTEXT</small><strong>Warm, practical and direct</strong><span>Audience: first-time business owners</span><span>Offer: small-batch studio products</span><span>CTA: show the process, invite questions</span></div><ArrowRight aria-hidden="true" /><div className="oy-v2-brain-output"><small>NEXT DRAFT</small><strong>A useful process story</strong><p>Clear language, three relevant hashtags and a gentle invitation to ask about the work.</p></div></div>
    </section>

    <section className="oy-v2-control" aria-labelledby="control-title">
      <div className="oy-v2-section-head"><div><p className="oy-v2-kicker">Approval and control</p><h2 id="control-title">Automation without losing control.</h2></div><p>Start in Assisted mode. Review the caption, edit hashtags, change timing and approve every post. Autopilot can be adjusted or paused on eligible plans.</p></div>
      <div className="oy-v2-control-grid"><article><ShieldCheck aria-hidden="true" /><h3>Approval comes first</h3><p>Free uses Assisted mode, so Oyinca does not publish without your decision.</p></article><article><PencilLine aria-hidden="true" /><h3>Everything stays editable</h3><p>Change the words, tags or timing before the post moves forward.</p></article><article><Pause aria-hidden="true" /><h3>Pause when you need to</h3><p>Adjust Autopilot and see clear errors when a publishing attempt fails.</p></article></div>
    </section>

    <section className="oy-v2-audience" aria-labelledby="audience-title">
      <div className="oy-v2-section-head"><div><p className="oy-v2-kicker">Built for your way of working</p><h2 id="audience-title">One manager. Three operating rhythms.</h2></div><p>Choose the path that matches the number of brands, people and approvals you manage.</p></div>
      <div className="oy-v2-audience-list"><article><span>01</span><div><h3>Creators</h3><p>Keep a reliable posting rhythm without living inside a content calendar.</p><Link href="/register?plan=FREE">Start on Free <ArrowRight aria-hidden="true" /></Link></div><Video aria-hidden="true" /></article><article><span>02</span><div><h3>Businesses</h3><p>Turn everyday product content into reviewed TikTok drafts with a consistent brand voice.</p><Link href="/register?plan=PRO">Explore Pro <ArrowRight aria-hidden="true" /></Link></div><Sparkles aria-hidden="true" /></article><article><span>03</span><div><h3>Agencies</h3><p>Separate client workspaces, approvals and brand context without mixing accounts.</p><Link href="/register?plan=AGENCY">Explore Agency <ArrowRight aria-hidden="true" /></Link></div><Users aria-hidden="true" /></article></div>
    </section>
    <section className="oy-v2-trust-proof" aria-label="Product trust and support"><p>Product proof, not promises.</p><ul><li>Real approval states</li><li>TikTok connection controls</li><li>Encrypted OAuth tokens</li><li>Clear publish failures</li><li>Contact and legal routes</li></ul></section>
  </>;
}
