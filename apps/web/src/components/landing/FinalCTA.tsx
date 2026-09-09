import Link from "next/link";
export default function FinalCTA() {
  return (
    <section className="oy-section oy-final">
      <p className="oy-eyebrow">YOUR SOCIAL MEDIA. HANDLED.</p>
      <h2>You create.<br />Oyinca keeps it moving.</h2>
      <p>Bring the content. Leave the captions, timing and consistency to Oyinca.</p>
      <Link href="/register?plan=FREE" className="lp-btn-primary oy-button">
        Meet Oyinca →
      </Link>
    </section>
  );
}
