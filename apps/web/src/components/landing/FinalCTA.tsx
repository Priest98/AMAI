import Link from "next/link";
export default function FinalCTA() {
  return (
    <section className="oy-section oy-final">
      <p className="oy-eyebrow">YOUR SOCIAL MEDIA. HANDLED.</p>
      <h2>Meet your new social media manager.</h2>
      <p>
        Bring the content. Oyinca will take it from there.
      </p>
      <Link href="/register?plan=FREE" className="lp-btn-primary oy-button">
        Meet Oyinca →
      </Link>
    </section>
  );
}
