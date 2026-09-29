import Link from "next/link";
export default function FinalCTA() {
  return (
    <section className="oy-section oy-final">
      <p className="oy-eyebrow">YOUR NEXT POST</p>
      <h2>Give Oyinca your next post.</h2>
      <p>Upload your content and let Oyinca prepare the rest. No credit card required. You approve before publishing.</p>
      <Link href="/register?plan=FREE" className="lp-btn-primary oy-button">
        Start free →
      </Link>
    </section>
  );
}
