import {Suspense, lazy, useEffect, useLayoutEffect, useRef, useState} from 'react';
import {ArrowDown} from 'lucide-react';
import {motion, useMotionValue, useMotionValueEvent, useReducedMotion, useTransform} from 'motion/react';
import {warpStage,warpStages} from './warpProgress';
import './WarpZone.css';
import {useWebGL, SceneBoundary} from './webgl';

const WarpScene = lazy(() => import('./WarpScene'));

export default function WarpZone() {
  const section = useRef<HTMLElement>(null);
  const reduced = useReducedMotion();
  const supported = useWebGL();
  const [active,setActive] = useState(false);
  const [compact,setCompact] = useState(() => window.matchMedia('(max-width: 650px)').matches);
  const [stage,setStage] = useState(0);
  const scrollYProgress = useMotionValue(0);
  const staticMode = Boolean(reduced) || supported === false;
  const exit = useTransform(scrollYProgress,[.86,1],[0,1]);
  useMotionValueEvent(scrollYProgress,'change',value => setStage(warpStage(value)));
  useLayoutEffect(() => {
    if (staticMode || !active) return;
    const element = section.current!;
    let frame = 0;
    function measure() {
      const bounds = element.getBoundingClientRect();
      scrollYProgress.set(Math.min(1,Math.max(0,-bounds.top / Math.max(1,bounds.height - window.innerHeight))));
    }
    function schedule() {
      cancelAnimationFrame(frame);
      frame = requestAnimationFrame(measure);
    }
    measure();
    const observer = new ResizeObserver(schedule);
    observer.observe(document.body);
    observer.observe(element);
    window.addEventListener('scroll',schedule,{passive:true});
    window.addEventListener('resize',schedule);
    return () => {
      cancelAnimationFrame(frame);
      observer.disconnect();
      window.removeEventListener('scroll',schedule);
      window.removeEventListener('resize',schedule);
    };
  },[active,scrollYProgress,staticMode]);
  useEffect(() => {
    const element = section.current!;
    const observer = new IntersectionObserver(([entry]) => setActive(entry.isIntersecting),{rootMargin:'180px'});
    observer.observe(element);
    const viewport = window.matchMedia('(max-width: 650px)');
    const update = () => setCompact(viewport.matches);
    update();
    viewport.addEventListener('change',update);
    return () => {observer.disconnect();viewport.removeEventListener('change',update);};
  },[]);
  const fallback = <img className="warp-static-crystal" src={import.meta.env.BASE_URL + 'quantum-fracture.svg'} alt=""/>;
  return <section className={'warp-zone ' + (staticMode ? 'warp-static' : '')} ref={section} aria-labelledby="warp-title" id="warp">
    <div className="warp-sticky">
      <div className="warp-background" aria-hidden="true"/>
      <div className="warp-canvas">{!staticMode && supported && active ?
        <SceneBoundary fallback={fallback}><Suspense fallback={fallback}><WarpScene progress={scrollYProgress} compact={compact}/></Suspense></SceneBoundary> : fallback}
      </div>
      {!staticMode && <motion.div className="warp-exit" aria-hidden="true" style={{opacity:exit}}/>}
      <div className="site-width warp-copy"><p className="eyebrow"><span/>Scroll experiment / Quantum Fracture</p><h2 id="warp-title">Quantum Fracture</h2><p>{staticMode ? 'An assembled view of the faceted sculpture.' : 'Scroll to break the structure and travel through the void. Scroll back to restore it.'}</p></div>
      {!staticMode && <div className="site-width warp-controls"><div className="warp-steps" aria-label="Warp stages">{warpStages.map((label,index) => <span key={label} aria-current={index === stage ? 'step' : undefined}>{label}</span>)}</div><ArrowDown size={18} aria-hidden="true"/></div>}
    </div>
  </section>;
}
