"use client";
import { useEffect } from 'react';
import 'lenis/dist/lenis.css';

/** One scroll owner on acquisition only. Essential content stays server-visible. */
export default function AcquisitionMotion() {
  useEffect(() => {
    const preference = window.matchMedia('(prefers-reduced-motion: no-preference) and (min-width: 1024px) and (pointer: fine)');
    let generation = 0;
    let dispose = () => {};
    const sync = async () => {
      const current = ++generation;
      dispose();
      dispose = () => {};
      if (!preference.matches) return;
      try {
        const [{ default: Lenis }, { gsap, ScrollTrigger, ensureGsapPlugins }] = await Promise.all([import('lenis'), import('./gsap-setup')]);
        if (current !== generation || !preference.matches) return;
        ensureGsapPlugins();
        const lenis = new Lenis({ duration: 0.8, smoothWheel: true, syncTouch: false, anchors: true });
        const tick = (time: number) => lenis.raf(time * 1000);
        lenis.on('scroll', ScrollTrigger.update);
        gsap.ticker.add(tick);
        const context = gsap.context(() => {
          gsap.utils.toArray<HTMLElement>('.oy-story-step').forEach((element) => {
            gsap.from(element, { y: 18, duration: 0.65, ease: 'power2.out', scrollTrigger: { trigger: element, start: 'top 90%', once: true } });
          });
        });
        dispose = () => { context.revert(); gsap.ticker.remove(tick); lenis.destroy(); };
      } catch { /* Optional enhancement: retain native scrolling on import failure. */ }
    };
    void sync();
    preference.addEventListener('change', sync);
    return () => { generation++; preference.removeEventListener('change', sync); dispose(); };
  }, []);
  return null;
}
