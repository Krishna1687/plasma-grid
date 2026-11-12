import {Suspense, lazy, useEffect, useLayoutEffect, useRef, useState} from 'react';
import type {ReactNode} from 'react';
import {ArrowDown, ArrowLeft, ArrowRight, ArrowUp, ArrowUpRight, Activity, AudioLines, Boxes, BrainCircuit, ChevronLeft, ChevronRight, Cloud, Code2, Download, Github, GraduationCap, Hexagon, Linkedin, Mail, MapPin, Maximize2, Menu, Mouse, Network, Sparkles, Workflow, X} from 'lucide-react';
import {Link, Route, Routes, useLocation, useParams} from 'react-router-dom';
import {motion, useReducedMotion, useScroll, useTransform} from 'motion/react';
import {profile} from './content/profile';
import {experience, education} from './content/experience';
import {certifications} from './content/certifications';
import {skills} from './content/skills';
import {projects} from './content/projects';
import {artworks} from './content/artworks';
import type {SceneKind} from './Scene';
import {SceneBoundary, useWebGL} from './webgl';
import PracticeLab from './PracticeLab';
import WarpZone from './WarpZone';

const Scene = lazy(() => import('./Scene'));
const Observability = lazy(() => import('./Observability'));
const resume = import.meta.env.BASE_URL + 'resume.pdf';
const nav = [['about','About'],['observability','Observability Lab'],['skills','Skills'],['experience','Experience'],['practice','Practice Lab'],['projects','Projects'],['creative','Creative Lab']];

function Brand() {
  return <><img className="brand-mark" src={import.meta.env.BASE_URL + 'favicon.svg'} width={32} height={32} alt=""/>PLASMA GRID</>;
}

function PythonIcon() {
  return <svg aria-hidden="true" width="15" height="15" viewBox="0 0 24 24" fill="none">
    <path fill="#72b8ff" d="M12 2c-4 0-5 1-5 4v2h6v1H5c-2 0-3 2-3 5s2 5 4 5h1v-4c0-2 2-3 4-3h4c2 0 3-1 3-3V6c0-3-2-4-6-4Z"/>
    <path fill="#ffe18a" d="M12 22c4 0 5-1 5-4v-2h-6v-1h8c2 0 3-2 3-5s-2-5-4-5h-1v4c0 2-2 3-4 3H9c-2 0-3 1-3 3v3c0 3 2 4 6 4Z"/>
    <circle cx="10" cy="5.5" r="1.15" fill="#172238"/><circle cx="14" cy="18.5" r="1.15" fill="#42340e"/>
  </svg>;
}

function StaticModel({kind, loading = false}: {kind:SceneKind;loading?:boolean}) {
  return <div className={'static-model static-' + kind} role="img" aria-label={loading ? 'Loading 3D model' : 'Static preview of ' + kind}>
    <div className="static-tiles" aria-hidden="true">{Array.from({length:19},(_,index) => <span key={index} className={[0,2,5,8,9,11,15,18].includes(index) ? 'lit' : ''}/>)}</div>
    {loading && <span className="loading-model" role="status">Loading 3D</span>}
  </div>;
}

function Sculpture({kind, label}: {kind:SceneKind;label:string}) {
  const enabled = useWebGL();
  const ref = useRef<HTMLDivElement>(null);
  const [near,setNear] = useState(kind === 'core');
  useEffect(() => {
    if (near) return;
    const observer = new IntersectionObserver(([entry]) => {if (entry.isIntersecting) {setNear(true);observer.disconnect();}}, {rootMargin:'140px'});
    observer.observe(ref.current!);
    return () => observer.disconnect();
  }, [near]);
  const fallback = <StaticModel kind={kind}/>;
  return <div className={'sculpture sculpture-' + kind} ref={ref}>
    <div className="sculpture-orbit" aria-hidden="true"><span/><span/><span/></div>
    {enabled && near ? <SceneBoundary fallback={fallback}><Suspense fallback={<StaticModel kind={kind} loading/>}><Scene kind={kind}/></Suspense></SceneBoundary> : fallback}
    <div className="scene-caption"><span><Hexagon size={12}/>{label}</span>{enabled && <span><Mouse size={13}/>Drag to rotate</span>}</div>
  </div>;
}

function SectionTitle({label,title,description}: {label:string;title:string;description?:string}) {
  return <div className="section-title"><p className="eyebrow"><span/>{label}</p><h2>{title}</h2>{description && <p>{description}</p>}</div>;
}

function Reveal({children}: {children:ReactNode}) {
  const reduced = useReducedMotion();
  return <motion.div initial={false} whileInView={reduced ? undefined : {opacity:1,y:0}} viewport={{amount:.13}} variants={{hidden:{opacity:.65,y:20},visible:{opacity:1,y:0}}} animate={reduced ? 'visible' : 'hidden'} transition={{duration:.55,ease:'easeOut'}}>{children}</motion.div>;
}

function Header() {
  const [menu,setMenu] = useState(false);
  const [active,setActive] = useState('');
  const {pathname} = useLocation();
  useEffect(() => {
    if (pathname !== '/') return;
    const anchors = [...nav.map(([id]) => id),'warp','certifications','contact']
      .map(id => document.getElementById(id)).filter((node): node is HTMLElement => Boolean(node));
    let frame = 0;
    function update() {
      const marker = Math.min(190,window.innerHeight * .25);
      const current = anchors.find(node => {
        const bounds = node.getBoundingClientRect();
        return bounds.top <= marker && bounds.bottom > marker;
      });
      setActive(current?.id ?? '');
    }
    function schedule() {
      cancelAnimationFrame(frame);
      frame = requestAnimationFrame(update);
    }
    update();
    window.addEventListener('scroll',schedule,{passive:true});
    window.addEventListener('resize',schedule);
    return () => {
      cancelAnimationFrame(frame);
      window.removeEventListener('scroll',schedule);
      window.removeEventListener('resize',schedule);
    };
  },[pathname]);
  useEffect(() => {
    if (!menu) return;
    const escape = (event:KeyboardEvent) => {if (event.key === 'Escape') setMenu(false);};
    window.addEventListener('keydown',escape);
    return () => window.removeEventListener('keydown',escape);
  },[menu]);
  return <header className="header"><div className="site-width header-inner">
    <Link to="/" className="brand" aria-label="Plasma Grid home" onClick={() => {setMenu(false);window.scrollTo({top:0,behavior:'instant'});}}><Brand/></Link>
    <button className="menu-toggle icon-button" aria-label={menu ? 'Close navigation' : 'Open navigation'} aria-expanded={menu} aria-controls="primary-nav" onClick={() => setMenu(!menu)}>{menu ? <X/> : <Menu/>}</button>
    <nav id="primary-nav" className={menu ? 'nav open' : 'nav'} aria-label="Primary navigation">{nav.map(([id,label]) => <Link key={id} to={'/?section=' + id} aria-current={pathname === '/' && active === id ? 'location' : undefined} onClick={() => setMenu(false)}>{label}</Link>)}<Link className="button contact-nav" to="/?section=contact" aria-current={pathname === '/' && active === 'contact' ? 'location' : undefined} onClick={() => setMenu(false)}>Contact <ArrowUpRight size={15}/></Link></nav>
  </div></header>;
}

function RouteScroll() {
  const {pathname,search,key} = useLocation();
  const previousPath = useRef<string | null>(null);
  useLayoutEffect(() => {
    const id = new URLSearchParams(search).get('section');
    const target = pathname === '/' && id ? document.getElementById(id) : null;
    const nearby = target && Math.abs(target.getBoundingClientRect().top) < window.innerHeight * 1.8;
    const smooth = nearby && previousPath.current === pathname && !window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    previousPath.current = pathname;
    if (target) target.scrollIntoView({behavior:smooth ? 'smooth' : 'instant'});
    else window.scrollTo({top:0,behavior:'instant'});
  }, [pathname,search,key]);
  return null;
}

function SocialLinks() {
  return <div className="social-links"><a href={profile.linkedin} target="_blank" rel="noreferrer" aria-label="LinkedIn"><Linkedin size={17}/></a>{profile.github && <a href={profile.github} target="_blank" rel="noreferrer" aria-label="GitHub"><Github size={17}/></a>}<a href={'mailto:' + profile.email} aria-label="Email"><Mail size={17}/></a></div>;
}

function Hero() {
  const ref = useRef<HTMLElement>(null);
  const reduced = useReducedMotion();
  const {scrollYProgress} = useScroll({target:ref,offset:['start start','end start']});
  const gridY = useTransform(scrollYProgress,[0,1],[0,125]);
  const gridOpacity = useTransform(scrollYProgress,[0,1],[1,.16]);
  return <section className="hero" id="home" ref={ref}>
    <motion.div className="hero-grid-bg" aria-hidden="true" style={reduced ? undefined : {y:gridY,opacity:gridOpacity}}/>
    <div className="site-width hero-inner">
      <div className="hero-copy">
        <p className="eyebrow"><span/>{profile.name}</p>
        <h1>Engineering<br/>Reliability.<br/><em>Creating<br className="hero-break"/> Experiences.</em></h1>
        <p className="hero-role">{profile.headline.split(' | ').map(role => <span key={role}>{role}</span>)}</p>
        <p className="hero-summary">{profile.role} at {profile.employer}. {profile.introduction}</p>
        <div className="hero-actions"><Link to="/?section=projects" className="button button-primary">Explore Work <ArrowUpRight size={17}/></Link><a className="button button-secondary" href={resume} download>Resume <Download size={16}/></a></div>
        <SocialLinks/>
      </div>
      <Sculpture kind="core" label="Plasma Grid core"/>
      <div className="hero-bottom"><Link to="/?section=about" aria-label="Scroll to About"><ArrowDown size={14}/> Scroll to explore</Link><span><i/> {profile.location}</span></div>
    </div>
  </section>;
}

function About() {
  return <section className="site-width section about" id="about"><Reveal><div className="about-grid">
    <div>
      <SectionTitle label="About me" title={'Hi, I’m ' + profile.shortName + '.'}/>
      <p className="lead">{profile.summary}</p>
      <div className="tags">{profile.interests.map(item => <span key={item}>{item}</span>)}</div>
      <div className="inline-actions"><a className="text-button" href={profile.linkedin} target="_blank" rel="noreferrer">LinkedIn <ArrowUpRight size={15}/></a><a className="text-button" href={resume} download>Download resume <Download size={15}/></a></div>
    </div>
    <div className="identity-card tilt"><div className="portrait-placeholder" role="img" aria-label="Profile image placeholder"><Hexagon size={112} strokeWidth={.55}/><span>{profile.initials}</span></div><div><strong>{profile.name}</strong><span>{profile.role} · {profile.employer}</span><span className="profile-location"><MapPin size={13}/> {profile.location}</span></div></div>
  </div></Reveal></section>;
}

function Lab() {
  const ref = useRef<HTMLElement>(null);
  const [ready,setReady] = useState(false);
  useEffect(() => {
    const observer = new IntersectionObserver(([entry]) => {if (entry.isIntersecting) {setReady(true);observer.disconnect();}}, {rootMargin:'500px'});
    observer.observe(ref.current!);
    return () => observer.disconnect();
  },[]);
  return <section className="lab section" id="observability" ref={ref}><div className="site-width">
    <Reveal><div className="lab-intro"><SectionTitle label="Reliability engineering" title="Observability Lab" description="Explore a synthetic service mesh. Follow requests, inspect service health, and replay an incident from first alert to recovery."/><Sculpture kind="network" label="Service topology"/></div></Reveal>
    {ready ? <Suspense fallback={<div className="dashboard dashboard-loading" role="status">Loading observability lab…</div>}><Observability/></Suspense> : <div className="dashboard dashboard-loading" aria-hidden="true"/>}
    <div className="lab-next"><Link to="/?section=warp" className="text-button">Explore Warp Zone <ArrowDown size={15}/></Link></div>
  </div></section>;
}

const skillIcons = [AudioLines, Cloud, Network, Code2, Boxes];
function Skills() {
  return <section className="site-width section skills" id="skills"><Reveal>
    <div className="lab-intro"><SectionTitle label="Technical skills" title="Tools and disciplines" description="Explore skills from my professional profile and the development tools behind my projects and interests."/><Sculpture kind="stack" label="Technology stack"/></div>
    <div className="skills-grid">{skills.map((skill,index) => {
      const Icon = skillIcons[index];
      return <details key={skill.name} className="skill-card" open={index < 3}><summary><span className="skill-icon"><Icon size={20}/></span><span><small>{skill.source}</small><strong>{skill.name}</strong></span><span className="skill-expand" aria-hidden="true">+</span></summary><div className="tags">{skill.items.map(item => <span key={item}>{item === 'Python' && <PythonIcon/>}{item}</span>)}</div></details>;
    })}</div>
  </Reveal></section>;
}

function Experience() {
  const [active,setActive] = useState(0);
  const job = experience[active];
  return <section className="experience section" id="experience"><div className="site-width"><Reveal>
    <SectionTitle label="Professional experience" title={'Experience at ' + profile.employer}/>
    <div className="timeline-grid"><div className="timeline-options" aria-label={profile.employer + ' roles'}>{experience.map((item,index) => <button key={item.role} aria-pressed={active === index} onClick={() => setActive(index)}><span>{item.dates}</span><strong>{item.role}</strong></button>)}</div>
    <div className="job-card" aria-live="polite"><span className="eyebrow"><span/>{job.company}</span><h3>{job.role}</h3><p>{job.dates}{job.location ? ' · ' + job.location : ''}</p><ul>{job.details.map(item => <li key={item}>{item}</li>)}</ul></div></div>
    <div className="qualifications"><div><h3>Education</h3><div className="credential"><GraduationCap size={23}/><div><strong>{education.institution}</strong><p>{education.degree} · {education.dates}</p></div></div></div></div>
  </Reveal></div></section>;
}

const credentialIcons = {activity:Activity,cloud:Cloud,brain:BrainCircuit,spark:Sparkles,workflow:Workflow};

function Certifications() {
  return <section className="site-width section certifications" id="certifications"><Reveal>
    <SectionTitle label="Professional development" title="Featured Certifications"/>
    <div className="certificate-grid">{certifications.map(item => {
      const Icon = credentialIcons[item.symbol];
      return <article className={'certificate certificate-' + item.accent} key={item.title}>
        <span className="certificate-mark" aria-hidden="true"><Hexagon size={51} strokeWidth={1}/><Icon size={23}/></span>
        <h3>{item.title}</h3>
        {'issuer' in item && <p>{item.issuer}</p>}
      </article>;
    })}</div>
  </Reveal></section>;
}

function ProjectArt({id}: {id:string}) {
  return <div className={'project-art art-' + id} aria-hidden="true">
    {id === 'classroom-management' ? <div className="mock-window"><div className="mock-top"><i/><i/><i/></div><div className="mock-content"><div className="mock-sidebar"><i/><i/><i/></div><div className="mock-main"><b/><i/><div>{[1,2,3,4].map(item => <span key={item}/>)}</div></div></div></div>
      : id === 'alphabet-war' ? <><div className="game-moon"/><div className="game-mountains"/><div className="game-platform p1"/><div className="game-platform p2"/><span className="game-x">X</span><span className="game-y">Y</span></>
        : <div className="project-hex"><Hexagon size={103} strokeWidth={.65}/><Boxes size={36} strokeWidth={1.15}/></div>}
  </div>;
}

function Projects() {
  return <section className="site-width section" id="projects"><Reveal>
    <SectionTitle label="Selected work" title="Featured projects" description="A classroom organizer, a browser fighter concept, and space for what comes next."/>
    <div className="projects-grid">{projects.map(item => <Link className="project-card tilt" to={'/projects/' + item.id} key={item.id}>
      <ProjectArt id={item.id}/><div className="project-body"><div className="project-meta"><span>{item.category}</span><span>{item.status}</span></div><h3>{item.title}</h3><p>{item.summary}</p><span className="project-link">View project <ArrowUpRight size={16}/></span></div>
    </Link>)}</div>
  </Reveal></section>;
}

function ProjectDetail() {
  const {id} = useParams();
  const item = projects.find(project => project.id === id);
  if (!item) return <NotFound/>;
  return <main id="main-content" className="site-width section project-detail">
    <Link className="text-button" to="/?section=projects"><ArrowLeft size={16}/> All projects</Link>
    <p className="eyebrow"><span/>{item.category} · {item.status}</p><h1>{item.title}</h1><p className="lead">{item.summary}</p>
    <ProjectArt id={item.id}/>
    <div className="detail-grid"><div><h2>My contribution</h2><p>{item.contribution}</p>{item.features.length > 0 && <ul>{item.features.map(feature => <li key={feature}>{feature}</li>)}</ul>}</div>
      <div><h2>Technologies</h2>{item.technologies.length ? <div className="tags">{item.technologies.map(tech => <span key={tech}>{tech}</span>)}</div> : <p>Technology details pending.</p>}{item.github && <a href={item.github}>GitHub <ArrowUpRight size={15}/></a>}{item.demo && <a href={item.demo}>Live demo <ArrowUpRight size={15}/></a>}</div></div>
  </main>;
}

function Creative() {
  const categories = ['All',...new Set(artworks.map(item => item.category))];
  const [category,setCategory] = useState('All');
  const [selected,setSelected] = useState<number|null>(null);
  const dialog = useRef<HTMLDialogElement>(null);
  const trigger = useRef<HTMLButtonElement | null>(null);
  const filtered = category === 'All' ? artworks : artworks.filter(item => item.category === category);
  const artwork = selected === null ? null : filtered[selected];
  useEffect(() => {
    const element = dialog.current!;
    if (selected !== null && !element.open) element.showModal();
    if (selected === null && element.open) element.close();
  },[selected]);
  function step(direction:number) {
    setSelected(index => index === null ? null : (index + direction + filtered.length) % filtered.length);
  }
  return <section className="creative section" id="creative"><div className="site-width"><Reveal>
    <SectionTitle label="Creative work" title="Creative Lab" description="A gallery for future digital art, character studies, game concepts, and visual experiments."/>
    <div className="gallery-filters" aria-label="Artwork category">{categories.map(value => <button key={value} className="filter" aria-pressed={value === category} onClick={() => setCategory(value)}>{value}</button>)}</div>
    <div className="gallery-grid">{filtered.map((item,index) => <button key={item.title} className="art-card" onClick={event => {trigger.current = event.currentTarget;setSelected(index);}}><div className={'art-preview ' + item.style}><span/><Maximize2 size={16}/></div><div><strong>{item.title}</strong><small>Placeholder</small></div></button>)}</div>
    <dialog ref={dialog} className="gallery-dialog" aria-label={artwork?.title ?? 'Artwork preview'} onClose={() => {setSelected(null);trigger.current?.focus();}} onKeyDown={event => {
      if (event.key === 'ArrowLeft' || event.key === 'ArrowRight') {event.preventDefault();step(event.key === 'ArrowLeft' ? -1 : 1);}
    }} onClick={event => {if (event.target === event.currentTarget) setSelected(null);}}>
      {artwork && <div className="dialog-inner"><button className="icon-button dialog-close" aria-label="Close preview" onClick={() => setSelected(null)} autoFocus><X/></button><div className={'art-preview ' + artwork.style}><span/></div><div className="dialog-footer"><div aria-live="polite"><h3>{artwork.title}</h3><p>{artwork.description}</p></div><div><button className="icon-button" aria-label="Previous artwork" disabled={filtered.length < 2} onClick={() => step(-1)}><ChevronLeft/></button><button className="icon-button" aria-label="Next artwork" disabled={filtered.length < 2} onClick={() => step(1)}><ChevronRight/></button></div></div></div>}
    </dialog>
  </Reveal></div></section>;
}

function Contact() {
  return <section className="contact section" id="contact"><div className="site-width"><Reveal><div className="contact-panel">
    <div className="contact-geometry" aria-hidden="true">{Array.from({length:8},(_,index) => <Hexagon key={index} size={75 + index * 31} strokeWidth={.48}/>)}</div>
    <SectionTitle label="Contact" title="Let’s connect." description="Get in touch about site reliability, observability, or creative development."/>
    <a className="contact-email" href={'mailto:' + profile.email}>{profile.email}</a>
    <div className="inline-actions"><a className="button button-primary" href={'mailto:' + profile.email}>Send an email <ArrowUpRight size={16}/></a><a className="button button-secondary" href={profile.linkedin} target="_blank" rel="noreferrer">LinkedIn <Linkedin size={15}/></a>{profile.github && <a className="button button-secondary" href={profile.github} target="_blank" rel="noreferrer">GitHub <Github size={15}/></a>}<a className="button button-secondary" href={resume} download>Resume <Download size={15}/></a></div>
  </div></Reveal></div></section>;
}

function Footer() {
  return <footer><div className="site-width footer-inner"><Link to="/" className="brand" aria-label="Plasma Grid home"><Brand/></Link><span>© {new Date().getFullYear()} {profile.name}</span><Link to="/" className="text-button" onClick={() => window.scrollTo({top:0,behavior:'instant'})}>Back to top <ArrowUp size={15}/></Link></div></footer>;
}

function NotFound() {
  return <main className="site-width section" id="main-content"><SectionTitle label="404" title="Page not found"/><Link className="button button-primary" to="/">Back to Plasma Grid <ArrowRight size={16}/></Link></main>;
}

export default function App() {
  return <><a href="#main-content" className="skip" onClick={event => {event.preventDefault();const main = document.getElementById('main-content');main?.setAttribute('tabindex','-1');main?.focus();}}>Skip to content</a><Header/><RouteScroll/>
    <Routes><Route path="/" element={<main id="main-content"><Hero/><About/><Lab/><WarpZone/><Skills/><Experience/><Certifications/><PracticeLab/><Projects/><Creative/><Contact/></main>}/><Route path="/projects/:id" element={<ProjectDetail/>}/><Route path="*" element={<NotFound/>}/></Routes>
    <Footer/></>;
}