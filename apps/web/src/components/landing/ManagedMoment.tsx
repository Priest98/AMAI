"use client";
import { useEffect, useRef, useState } from 'react';
import SignatureText from './SignatureText';
const words = ['Idea.', 'Caption.', 'Schedule.', 'Post.', 'Analyze.', 'Managed.'];
export default function ManagedMoment() {
  const root = useRef<HTMLElement>(null);
  const [word, setWord] = useState(5);
  useEffect(() => {
    let disposed = false;
    let revert = () => {};
    void import('./gsap-setup').then(({gsap,ensureGsapPlugins})=>{
      if(disposed) return;
      ensureGsapPlugins();
      const media=gsap.matchMedia();
      media.add('(prefers-reduced-motion: no-preference)',()=>{
        const context=gsap.context(()=>{
          gsap.timeline({scrollTrigger:{trigger:root.current,start:'top 65%',end:'bottom 90%',scrub:true,onUpdate:self=>setWord(Math.min(5,Math.floor(self.progress*6)))}}).to('.oy-managed-tasks',{opacity:.1,scale:.92,ease:'none'});
        },root);
        return ()=>{context.revert();setWord(5);};
      });
      revert=()=>media.revert();
    }).catch(()=>{});
    return ()=>{disposed=true;revert();};
  },[]);
  return <section ref={root} className="oy-managed" aria-labelledby="managed-title"><div className="oy-managed-sticky"><p className="oy-film-kicker">LESS ON YOUR MIND. MORE IN MOTION.</p><p className="oy-managed-tasks">Idea. Caption. Schedule. Post. Analyze.</p><h2 id="managed-title" className="sr-only">Your social media. Managed.</h2><div className="oy-managed-word" aria-hidden="true"><SignatureText text={words[word]} /></div><p>Meet Oyinca.<br />Your social media manager.</p><a href="#pricing" className="oy-managed-link">Find your pace <span aria-hidden="true">→</span></a></div></section>;
}
