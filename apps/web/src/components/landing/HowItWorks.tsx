import WorkflowPreview from "./WorkflowPreview";
export default function HowItWorks() {
  return (
    <section id="how-it-works" className="oy-section">
      <div className="oy-section-heading">
        <p className="oy-eyebrow">LESS BUSYWORK. MORE CONTROL.</p>
        <h2>One workflow, from idea to TikTok.</h2>
        <p>
          Bring your content. Oyinca helps prepare the post. You decide how it
          goes live.
        </p>
      </div>
      <div className="oy-how-grid">
        <div className="oy-steps">
          <article>
            <span>01</span>
            <h3>Bring your content</h3>
            <p>
              Upload photos and videos, or import from Google Drive. Connect
              TikTok when you are ready to publish.
            </p>
          </article>
          <article>
            <span>02</span>
            <h3>Make it sound like you</h3>
            <p>
              Set your brand preferences. Generate captions and hashtags, then
              review the result.
            </p>
          </article>
          <article>
            <span>03</span>
            <h3>Choose your level of control</h3>
            <p>
              Free uses Assisted mode: approval comes first. Paid plans unlock
              advanced Autopilot, including automatic approval when you enable
              it.
            </p>
          </article>
        </div>
        <WorkflowPreview />
      </div>
      <p className="oy-platform-note">
        Available today: TikTok. More platforms are on the roadmap; they are not
        included as live integrations.
      </p>
    </section>
  );
}
