"use client";
import Link from 'next/link';
import { useEffect, useRef, useState } from 'react';
import SignatureText from './SignatureText';
import '@/styles/hero-film.css';
export type HeroStyle = 'editorial' | 'product' | 'cinematic' | 'sculptural';
const beats = [
  { at: 0, lead: 'You create.', word: 'We take it from here.' },
  { at: 2, lead: 'Your content.', word: 'Understood.' },
  { at: 4, lead: 'We handle', word: 'Captions.' },
  { at: 6, lead: 'We handle', word: 'Scheduling.' },
  { at: 8, lead: 'We handle', word: 'Posting.' },
  { at: 10, lead: 'We track', word: 'Performance.' },
  { at: 12, lead: 'You create. We handle', word: 'The rest.' },
];
export default function Hero(_props: { variant?: HeroStyle }) {
  const film = useRef<HTMLVideoElement>(null);
  const root = useRef<HTMLElement>(null);
  const [beat, setBeat] = useState(-1);
  const [playing, setPlaying] = useState(false);
  const [ready, setReady] = useState(false);
  const [reduced, setReduced] = useState(true);
  const stopped = useRef(false);
  const seekOpening = useRef<(time: number) => void>(() => {});
  useEffect(() => {
    let disposed = false;
    let revert = () => {};
    const preference = matchMedia('(prefers-reduced-motion: reduce)');
    if (!preference.matches) void import('./gsap-setup').then(({gsap,ensureGsapPlugins}) => {
      if (disposed || preference.matches) return;
      ensureGsapPlugins();
      const context = gsap.context(() => {
        // A paused introduction seeks against the media clock, including replay.
        const timeline = gsap.timeline({paused:true});
        timeline.fromTo('.oy-film-kicker',{opacity:.2,y:8},{opacity:1,y:0,duration:.55,ease:'power2.out'},0)
          .fromTo('#film-title',{clipPath:'inset(0 0 100% 0)',filter:'blur(8px)',opacity:.2},{clipPath:'inset(0 0 0% 0)',filter:'blur(0px)',opacity:1,duration:1,ease:'power3.out'},.15);
        // Static fallback must be complete even if autoplay is blocked.
        timeline.seek(2);
        seekOpening.current = (time) => timeline.seek(Math.min(time,2));
        gsap.to('.oy-film-copy',{y:-26,ease:'none',scrollTrigger:{trigger:root.current,start:'top top',end:'bottom top',scrub:true}});
      },root);
      revert = () => { context.revert(); seekOpening.current = () => {}; };
    }).catch(() => {});
    const changed = () => { if (preference.matches) revert(); };
    preference.addEventListener('change',changed);
    return () => { disposed=true;preference.removeEventListener('change',changed);revert(); };
  },[]);
  useEffect(() => {
    const video = film.current;
    const section = root.current;
    if (!video || !section) return;
    const preference = matchMedia('(prefers-reduced-motion: reduce)');
    let visible = true;
    const sync = () => {
      setReduced(preference.matches);
      if (preference.matches) { video.pause(); setBeat(-1); return; }
      if (!video.src) video.src = `/hero-film/${matchMedia('(max-width: 700px)').matches ? 'mobile' : 'desktop'}/oyinca-film.mp4`;
      if (visible && !document.hidden && !stopped.current && !video.ended) {
        void video.play().catch(() => { setBeat(-1); setPlaying(false); });
      } else video.pause();
    };
    const observer = new IntersectionObserver(([entry]) => { visible = entry.isIntersecting; sync(); }, { threshold: .1 });
    observer.observe(section);
    preference.addEventListener('change', sync);
    document.addEventListener('visibilitychange', sync);
    sync();
    return () => { observer.disconnect(); preference.removeEventListener('change', sync); document.removeEventListener('visibilitychange', sync); video.pause(); };
  }, []);
  const finish = () => { stopped.current = true; film.current?.pause(); seekOpening.current(2); setReady(false); setPlaying(false); setBeat(-1); };
  const replay = () => {
    const video = film.current;
    if (!video || reduced) return;
    stopped.current = false; video.currentTime = 0; setBeat(0);
    void video.play().catch(finish);
  };
  const toggle = () => {
    if (playing) { stopped.current = true; film.current?.pause(); }
    else if (beat === -1) replay();
    else { stopped.current = false; void film.current?.play().catch(finish); }
  };
  return (
    <section ref={root} id="product" className="oy-film-hero" aria-labelledby="film-title">
      <div className="oy-film-copy">
        <p className="oy-film-kicker">OYINCA / YOUR SOCIAL MEDIA MANAGER</p>
        <h1 id="film-title" className={beat < 2 ? 'oy-film-headline' : 'sr-only'}>You create.<br /><em>Oyinca manages<br />the rest.</em></h1>
        {beat >= 2 && <div className="oy-film-headline oy-film-transient" aria-hidden="true"><span className="oy-film-lead">{beats[beat].lead}</span><SignatureText text={beats[beat].word} /></div>}
        <p className="oy-film-intro">From ideas to captions, scheduling, posting and performance — all in one place.</p>
        <div className="oy-film-actions"><Link className="lp-btn-primary oy-film-cta" href="/register?plan=FREE">Meet Oyinca <span aria-hidden="true">→</span></Link>{!reduced && <button type="button" className="oy-film-watch" onClick={replay}><span aria-hidden="true">▶</span>Watch the experience</button>}</div>
        <p className="oy-film-free">Start free. No credit card required.</p>
      </div>
      <figure className="oy-film-stage">
        <div className="oy-film-frame">
          <picture className={ready ? 'oy-film-poster is-covered' : 'oy-film-poster'}><source media="(max-width: 700px)" srcSet="/hero-film/posters/mobile.jpg" /><img src="/hero-film/posters/desktop.jpg" alt="Oyinca's real scheduled-post interface showing three example posts queued for TikTok." width="1440" height="950" fetchPriority="high" /></picture>
          <video ref={film} muted playsInline preload="none" aria-hidden="true" className={ready ? 'is-ready' : ''}
            onPlaying={() => { setReady(true); setPlaying(true); }} onPause={() => setPlaying(false)}
            onTimeUpdate={() => { const t = film.current?.currentTime ?? 0; seekOpening.current(t); setBeat(t >= 14 ? -1 : Math.max(0,beats.filter(b => t >= b.at).length-1)); }}
            onEnded={finish} onError={() => { setReady(false); finish(); }} />
        </div>
      </figure>
      {!reduced && <div className="oy-film-controls"><button type="button" onClick={toggle}>{playing ? 'Pause film' : beat === -1 ? 'Replay film' : 'Resume film'}</button>{beat !== -1 && <button type="button" onClick={finish}>Skip intro →</button>}</div>}
      <ol className="oy-film-story" aria-hidden="true">{['Captions','Scheduling','Posting','Performance','The rest'].map((label,i)=><li key={label} className={beat === i + 2 || (beat === -1 && i === 4) ? 'is-active' : ''}>{label}</li>)}</ol>
      <a className="oy-film-scroll" href="#how-it-works"><span aria-hidden="true">↓</span>Scroll to explore</a>
    </section>
  );
}
