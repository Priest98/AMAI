import Image from "next/image";
import Link from "next/link";

export default function SculpturalHero() {
  return (
    <section id="product" className="oy-cinematic-hero" aria-labelledby="hero-title">
      <div className="oy-cinematic-image" aria-hidden="true">
        <Image
          src="/hero/oyinca-humanoid-v1.webp"
          alt=""
          fill
          priority
          sizes="100vw"
          quality={90}
        />
      </div>
      <div className="oy-cinematic-atmosphere" aria-hidden="true"><i /><i /><i /></div>
      <div className="oy-cinematic-copy">
        <p className="oy-cinematic-label"><span /> OYINCA / AI SOCIAL MEDIA MANAGER</p>
        <h1 id="hero-title">
          Welcome to the <em>Future</em>
          <br />{' '}of Social Media Management.
        </h1>
        <Link href="/register?plan=FREE" className="oy-meet-cta">
          Meet Oyinca <span aria-hidden="true">→</span>
        </Link>
      </div>
      <a href="#how-it-works" className="oy-discover">
        Discover Oyinca <span aria-hidden="true">↓</span>
      </a>
      <p className="oy-cinematic-micro" aria-hidden="true">YOUR SOCIAL MEDIA. HANDLED.</p>
    </section>
  );
}
