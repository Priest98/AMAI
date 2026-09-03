const items = [
  [
    "Can I start for free?",
    "Yes. Free includes a limited monthly allowance for posts and AI generations. The plan cards show current limits. No credit card is required to create an account.",
  ],
  [
    "Will Oyinca publish without my approval?",
    "Free uses Assisted mode and requires your approval. Advanced Autopilot is available on paid plans; automatic approval only applies when you enable it in your settings.",
  ],
  [
    "Which platforms can I connect?",
    "TikTok is the currently supported publishing platform. You must connect your account and grant the required permissions. Available publishing options depend on TikTok permissions and account eligibility.",
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
    "Can I change or cancel my plan?",
    "Manage your subscription in Settings under Billing. Review the price and billing interval before confirming payment. Cancellation and access follow the billing terms shown for your subscription.",
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
