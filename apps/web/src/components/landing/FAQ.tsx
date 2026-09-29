const items = [
  [
    "Can I start for free?",
    "Yes. Free includes a limited monthly allowance for posts and AI generations. The plan cards show current limits. No credit card is required to create an account.",
  ],
  [
    "Will Oyinca publish without my approval?",
    "Free uses Assisted mode and requires your approval. Advanced Autopilot is available on paid plans, and automatic approval only applies when you deliberately enable it in settings.",
  ],
  [
    "Which platforms are currently supported?",
    "TikTok is the currently supported publishing platform. Oyinca can upload content to TikTok for you to complete in the TikTok app. Direct publishing will only be enabled after TikTok approves that separate capability.",
  ],
  [
    "What happens when I reach a limit?",
    "You will need to wait for the applicable monthly allowance to reset or upgrade for more capacity. Storage and account limits depend on your plan.",
  ],
  [
    "What if a generation or publishing attempt fails?",
    "Check the status and error in your workspace. Fix any content or connection issue before retrying. A scheduled post is not confirmation that TikTok has published it.",
  ],
  [
    "Can I pause Autopilot?",
    "Yes. Eligible plans can adjust or pause Autopilot in the workspace. Assisted mode remains available when you want every post to wait for approval.",
  ],
  [
    "Can I change or cancel my plan?",
    "Manage your subscription in Settings under Billing. Review the price and billing interval before confirming payment. Cancellation and access follow the billing terms shown for your subscription.",
  ],
  [
    "How does Oyinca use my TikTok data?",
    "Oyinca uses the permissions you grant to identify your connected account, prepare or send content, and retrieve supported publishing results. Tokens are encrypted, and you can disconnect TikTok at any time. See the Privacy Policy for full details.",
  ],
];
export default function FAQ() {
  return (
    <section id="faq" className="oy-section oy-faq">
      <div className="oy-section-heading">
        <p className="oy-eyebrow">A FEW THINGS TO KNOW</p>
        <h2>Questions, answered.</h2>
      </div>
      {items.map(([q, a]) => (
        <details key={q}>
          <summary>{q}</summary>
          <p>{a}</p>
        </details>
      ))}
    </section>
  );
}
