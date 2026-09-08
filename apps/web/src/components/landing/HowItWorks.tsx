const duties = [
  ["01", "Understands", "Your voice, offers and audience become the context behind every post."],
  ["02", "Prepares", "Captions, hashtags and publishing details arrive ready for review."],
  ["03", "Keeps moving", "A clear content plan turns scattered files into consistent publishing."],
];

export default function HowItWorks() {
  return (
    <>
      <section className="oy-manifesto oy-story-step" aria-labelledby="manifesto-title">
        <p className="oy-signal-label"><span /> THE WORK BEHIND EVERY POST</p>
        <h2 id="manifesto-title">Social media asks for your attention <em>every day.</em></h2>
        <p>Ideas, captions, timing, publishing and follow-up add up. Oyinca turns that repeated work into one calm, managed flow.</p>
        <div className="oy-duty-grid">
          {duties.map(([n,title,body]) => <article key={n}><span>{n}</span><div className="oy-duty-symbol" aria-hidden="true"><i /><i /></div><h3>{title}</h3><p>{body}</p></article>)}
        </div>
      </section>
      <section id="how-it-works" className="oy-operating" aria-labelledby="operating-title">
        <div className="oy-operating-head oy-story-step">
          <div><p className="oy-signal-label"><span /> HOW OYINCA WORKS</p><h2 id="operating-title">A manager for the whole content loop.</h2></div>
          <p>Bring the raw material. Oyinca handles the repetitive middle and keeps you at the final decision.</p>
        </div>
        <p className="oy-demo-label">Illustrative workflow · Your posts stay yours to review</p>
        <div className="oy-operating-board">
          <div className="oy-board-rail" aria-label="Workflow stages" ><span className="active">01 Content</span><span>02 Direction</span><span>03 Prepare</span><span>04 Publish</span></div>
          <div className="oy-board-canvas">
            <div className="oy-source-card"><small>NEW CONTENT</small><div className="oy-source-visual" aria-hidden="true"><i /><i /><i /></div><strong>Studio process.mp4</strong><span>18 sec · Vertical</span></div>
            <div className="oy-board-path" aria-hidden="true"><i /><i /><i /></div>
            <div className="oy-thinking-card"><small>OYINCA IS PREPARING</small><strong>A useful process story</strong><p>Writing in your voice, selecting focused hashtags and finding the next open slot.</p><div><span>Voice</span><span>Timing</span><span>Format</span></div></div>
            <div className="oy-approval-card"><div><small>READY FOR YOU</small><span>Assisted mode</span></div><h3>Small steps make the best behind-the-scenes stories.</h3><p>#smallbusiness &nbsp; #creativeprocess &nbsp; #buildinpublic</p><div className="oy-approval-actions"><span>Suggested time · 6:15 PM</span><span className="oy-demo-approve">Review & approve <span aria-hidden="true">→</span></span></div></div>
          </div>
        </div>
        <p className="oy-platform-note">Publishing is available for TikTok today. More platforms are planned.</p>
      </section>
      <section className="oy-understanding oy-story-step" aria-labelledby="understanding-title">
        <div><p className="oy-signal-label">BUILT AROUND YOUR BRAND</p><h2 id="understanding-title">Your voice.<br />A clearer direction.</h2></div>
        <div className="oy-context-list">
          <article><span>01</span><div><h3>Teach Oyinca what matters.</h3><p>Add your audience, offers and tone to your Business Brain. Give every draft the right starting point.</p></div></article>
          <article><span>02</span><div><h3>Review before it goes out.</h3><p>Check the caption and timing, edit the details, then approve. Assisted mode keeps you in the decision.</p></div></article>
          <article><span>03</span><div><h3>Choose your pace.</h3><p>Start with approvals. When you are ready, eligible plans offer Autopilot controls you can pause or adjust.</p></div></article>
        </div>
      </section>
    </>
  );
}
