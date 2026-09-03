import Link from "next/link";

export default function SculpturalHero() {
  return (
    <section
      id="product"
      className="oy-sculpture"
      aria-label="Oyinca AI social media manager"
    >
      <div className="oy-sculpture-art" aria-hidden="true">
        <img
          src="/hero/oyinca-sculpture-v1.webp"
          alt=""
          width="1672"
          height="941"
          fetchPriority="high"
        />
      </div>
      <div className="oy-sculpture-shade" aria-hidden="true" />
      <div className="oy-sculpture-grid" aria-hidden="true">
        <span />
        <i />
        <b>+</b>
      </div>
      <div className="oy-sculpture-copy">
        <p className="oy-sculpture-kicker">
          <span aria-hidden="true" />
          MEET OYINCA
        </p>
        <h1>
          Your AI social
          <br />
          <span>media manager.</span>
        </h1>
        <p className="oy-sculpture-intro">
          Turn your photos and videos into TikTok posts. Oyinca writes captions
          and handles scheduling. You stay in control.
        </p>
        <div className="oy-sculpture-actions">
          <Link href="/register?plan=FREE" className="oy-sculpture-primary">
            Start free <span aria-hidden="true">&#8599;</span>
          </Link>
          <a href="#how-it-works" className="oy-sculpture-secondary">
            See how it works <span aria-hidden="true">&#8599;</span>
          </a>
        </div>
        <p className="oy-sculpture-note">
          No credit card. Your approval comes first on Free.
        </p>
      </div>
      <div className="oy-sculpture-caption" aria-hidden="true">
        <span>YOUR CONTENT.</span>
        <span>READY FOR TIKTOK.</span>
      </div>
      <div className="oy-sculpture-bottom">
        <p className="oy-sculpture-platform">
          <span aria-hidden="true" />
          TIKTOK FIRST.
          <br />
          <span>Built around your creativity.</span>
        </p>
        <ol className="oy-sculpture-flow" aria-label="Your content workflow">
          <li>
            <span>01</span>Bring your content
          </li>
          <li>
            <span>02</span>Prepare with AI
          </li>
          <li>
            <span>03</span>Review &amp; publish
          </li>
        </ol>
        <a
          href="#how-it-works"
          className="oy-sculpture-scroll"
          aria-label="Discover how Oyinca works"
        >
          &#8595;
        </a>
      </div>
    </section>
  );
}
