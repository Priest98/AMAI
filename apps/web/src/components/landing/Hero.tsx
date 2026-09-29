import Link from 'next/link';
import { ArrowRight, CalendarDays, Check, Play, Upload, WandSparkles } from 'lucide-react';

export type HeroStyle = 'editorial' | 'product' | 'cinematic' | 'sculptural';

export default function Hero(props: { variant?: HeroStyle }) {
  return (
    <section id="product" className="oy-v2-hero" aria-labelledby="hero-title" data-variant={props.variant ?? 'product'}>
      <div className="oy-v2-hero-copy">
        <p className="oy-v2-kicker">Your TikTok content, managed</p>
        <h1 id="hero-title">Your social media manager. <em>Working in the background.</em></h1>
        <p className="oy-v2-lead">Upload your photos or videos. Oyinca prepares your caption, hashtags, timing and publishing plan for TikTok.</p>
        <div className="oy-v2-actions">
          <Link href="/register?plan=FREE" className="oy-v2-primary">Start free <ArrowRight aria-hidden="true" /></Link>
          <a href="#how-it-works" className="oy-v2-secondary"><Play aria-hidden="true" /> Watch Oyinca work</a>
        </div>
        <p className="oy-v2-trust">No credit card required. Review every post before it goes live.</p>
      </div>
      <div className="oy-v2-product" aria-label="Example Oyinca workflow from uploaded content to an approved TikTok post">
        <div className="oy-v2-product-bar"><span className="oy-v2-product-brand"><i aria-hidden="true" /> Oyinca</span><span className="oy-v2-status"><i aria-hidden="true" /> Assisted mode</span></div>
        <div className="oy-v2-product-body">
          <div className="oy-v2-upload-card">
            <div className="oy-v2-video-frame"><span>00:18</span><Play aria-hidden="true" /></div><small>UPLOADED CONTENT</small><strong>studio-process.mp4</strong><span><Upload aria-hidden="true" /> Ready for Oyinca</span>
          </div>
          <div className="oy-v2-flow-line" aria-hidden="true"><i /><i /><i /></div>
          <div className="oy-v2-draft-card">
            <div className="oy-v2-draft-head"><span><WandSparkles aria-hidden="true" /> Prepared for TikTok</span><small>Draft</small></div>
            <p>Small steps make the best behind-the-scenes stories. Here is how today&apos;s studio work came together.</p>
            <div className="oy-v2-tags"><span>#smallbusiness</span><span>#creativeprocess</span><span>#buildinpublic</span></div>
            <div className="oy-v2-schedule"><CalendarDays aria-hidden="true" /><span>Suggested time<strong>Today, 6:15 PM</strong></span></div>
            <div className="oy-v2-review"><span><Check aria-hidden="true" /> Ready for your review</span><button type="button" tabIndex={-1}>Review post</button></div>
          </div>
        </div>
      </div>
    </section>
  );
}
