import Link from "next/link";
export default function FinalCTA() {
  return (
    <section className="oy-section oy-final">
      <p className="oy-eyebrow">YOUR NEXT POST IS A GOOD PLACE TO START</p>
      <h2>Give your content a little backup.</h2>
      <p>
        Start with AI captions and a workflow you control. Add more automation
        when you are ready.
      </p>
      <Link href="/register" className="lp-btn-primary oy-button">
        Start free with Oyinca ↗
      </Link>
    </section>
  );
}
