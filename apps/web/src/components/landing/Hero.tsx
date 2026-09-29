"use client";

import { useEffect, useRef, useState } from 'react';
import '@/styles/hero-film.css';

export type HeroStyle = 'editorial' | 'product' | 'cinematic' | 'sculptural';

export default function Hero(_props: { variant?: HeroStyle }) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const rootRef = useRef<HTMLElement>(null);
  const [ready, setReady] = useState(false);
  const [playing, setPlaying] = useState(false);

  useEffect(() => {
    const video = videoRef.current;
    const root = rootRef.current;
    if (!video || !root) return;
    const reduced = matchMedia('(prefers-reduced-motion: reduce)');
    let visible = true;
    Object.assign(video, { autoplay: true, defaultMuted: true, muted: true, loop: true, playsInline: true, controls: false, preload: 'metadata' });
    const sync = () => {
      if (reduced.matches || !visible || document.hidden) return void video.pause();
      if (!video.src) video.src = `/hero-film/${matchMedia('(max-width: 700px)').matches ? 'mobile' : 'desktop'}/oyinca-film.mp4`;
      void video.play().catch(() => setPlaying(false));
    };
    const observer = new IntersectionObserver(([entry]) => { visible = entry.isIntersecting; sync(); }, { threshold: .08 });
    observer.observe(root); reduced.addEventListener('change', sync); document.addEventListener('visibilitychange', sync); sync();
    return () => { observer.disconnect(); reduced.removeEventListener('change', sync); document.removeEventListener('visibilitychange', sync); video.pause(); };
  }, []);

  const togglePlayback = () => {
    const video = videoRef.current;
    if (!video) return;
    if (video.paused) void video.play(); else video.pause();
  };

  return <section ref={rootRef} id="product" className="oy-film-hero" aria-labelledby="film-title">
    <div className="oy-film-media" aria-hidden="true">
      <picture className={ready ? 'oy-film-poster is-covered' : 'oy-film-poster'}><source media="(max-width: 700px)" srcSet="/hero-film/posters/mobile.jpg" /><img src="/hero-film/posters/desktop.jpg" alt="" width="1440" height="950" fetchPriority="high" /></picture>
      <video ref={videoRef} autoPlay muted loop playsInline preload="metadata" className={ready ? 'is-ready' : ''} onCanPlay={() => setReady(true)} onPlaying={() => setPlaying(true)} onPause={() => setPlaying(false)} />
    </div>
    <div className="oy-film-atmosphere" aria-hidden="true" />
    <div className="oy-film-copy">
      <p className="oy-film-kicker"><span /> Our vision</p>
      <h1 id="film-title" className="oy-film-headline"><span>Social media</span><em>without limits</em></h1>
      <p className="oy-film-intro">We&apos;re building a world where creativity flows freely, and AI handles the rest. Oyinca turns your ideas into impact, so you can focus on what matters most.</p>
      <a className="oy-film-explore" href="#how-it-works"><span className="oy-film-arrow" aria-hidden="true">→</span><span>Explore Oyinca</span></a>
    </div>
    <div className="oy-film-progress" aria-hidden="true"><span>01</span><i /><span>03</span></div>
    <p className="oy-film-mantra" aria-hidden="true">Imagination<br />drives<br />possibility</p>
    <p className="oy-film-credit">Powered by Turaab Technology <span aria-hidden="true" /></p>
    <button type="button" className="oy-film-pause" onClick={togglePlayback} aria-label={playing ? 'Pause background film' : 'Play background film'}><span aria-hidden="true">{playing ? 'Ⅱ' : '▶'}</span>{playing ? 'Pause film' : 'Play film'}</button>
  </section>;
}
