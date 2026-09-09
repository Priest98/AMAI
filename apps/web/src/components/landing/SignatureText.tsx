"use client";
import { useEffect, useRef } from 'react';
/** One accessible text node; the mask never fragments screen-reader speech. */
export default function SignatureText({ text }: { text: string }) {
  const element = useRef<HTMLSpanElement>(null);
  useEffect(() => {
    let disposed = false;
    let revert = () => {};
    const preference = matchMedia('(prefers-reduced-motion: reduce)');
    if (!preference.matches) void import('./gsap-setup').then(({gsap}) => {
      if(disposed || !element.current || preference.matches) return;
      const context = gsap.context(() => {
        gsap.fromTo(element.current, { yPercent: 105, opacity: 0, filter: 'blur(8px)', letterSpacing: '.015em' }, { yPercent: 0, opacity: 1, filter: 'blur(0px)', letterSpacing: '-.045em', duration: .7, ease: 'power3.out' });
      }, element);
      revert = () => context.revert();
    }).catch(() => {});
    const change = () => { if(preference.matches) revert(); };
    preference.addEventListener('change',change);
    return () => { disposed = true; preference.removeEventListener('change',change); revert(); };
  }, [text]);
  return <span className="oy-signature-mask"><span ref={element} className="oy-signature-word">{text}</span></span>;
}
