import {Canvas, useFrame} from '@react-three/fiber';
import {ContactShadows} from '@react-three/drei';
import {useEffect, useMemo, useRef, useState} from 'react';
import type {PointerEvent as ReactPointerEvent, RefObject} from 'react';
import {Group, ExtrudeGeometry, Shape, Vector3, Quaternion, MathUtils} from 'three';
import {useReducedMotion} from 'motion/react';
import TechGlyph from './TechGlyph';

export type SceneKind = 'core' | 'network' | 'stack';
type Drag = {pointer: number | null; x: number; y: number; dx: number; dy: number; vx: number; vy: number; time: number; distance: number; hoverX: number; hoverY: number};
const ambient = [
  {position: [-2.9, 1.05, -.2], size:.28, speed:.73, phase:.4, amplitude:.18, color:'#b8ff62', shape:'hex'},
  {position: [2.7, .92, -.4], size:.34, speed:1.17, phase:1.3, amplitude:.22, color:'#83a768', shape:'cube'},
  {position: [2.35, -1.05, .7], size:.22, speed:1.43, phase:3.8, amplitude:.27, color:'#d5ffa6', shape:'hex'},
  {position: [-2.15, -1.47, .5], size:.31, speed:.91, phase:2.2, amplitude:.17, color:'#88ad57', shape:'diamond'},
  {position: [.55, 2.07, -.5], size:.18, speed:1.06, phase:4.2, amplitude:.21, color:'#d4fca9', shape:'diamond'},
  {position: [-1.66, .46, -1.4], size:.18, speed:.63, phase:4.9, amplitude:.21, color:'#b8ff62', shape:'cube'},
  {position: [1.94, 1.43, -1.3], size:.21, speed:.79, phase:5.5, amplitude:.31, color:'#7ba853', shape:'hex'},
] as const;

function hexGeometry(radius: number, depth: number, bevel: number) {
  const shape = new Shape();
  for (let i=0; i<6; i++) {
    const angle = Math.PI * i / 3;
    const x = radius * Math.cos(angle), y = radius * Math.sin(angle);
    if (i === 0) shape.moveTo(x,y);
    else shape.lineTo(x,y);
  }
  shape.closePath();
  const geometry = new ExtrudeGeometry(shape, {depth, bevelEnabled:true, bevelThickness:bevel, bevelSize:bevel, bevelSegments:2, steps:1, curveSegments:1});
  geometry.translate(0,0,-depth/2);
  return geometry;
}

const tilePositions = [
  [0,0], [0,1], [1,0], [1,-1], [0,-1], [-1,0], [-1,1],
  [1,1], [2,-1], [2,-2], [1,-2], [-1,-1], [-2,0], [-2,1], [-1,2], [0,2],
];
const litTiles = new Set([0,1,3,5,7,10,13,15]);

function Core() {
  const geometries = useMemo(() => ({
    base:hexGeometry(.408,.26,.045),
    face:hexGeometry(.351,.033,.021),
    inset:hexGeometry(.16,.014,.009),
  }), []);
  useEffect(() => () => Object.values(geometries).forEach(geometry => geometry.dispose()), [geometries]);
  return <group rotation={[.09,-.21,-.08]}>
    {tilePositions.map(([q,r],index) => {
      const x = .705 * q;
      const y = .814 * (r + q / 2);
      const lit = litTiles.has(index);
      const depth = .60 - .20 * (x*x + y*y);
      return <group key={index} position={[x,y,depth]} rotation={[y * -.18,x * .19,index % 3 * .018]} scale={index > 6 ? .94 : 1}>
        <mesh geometry={geometries.base}><meshStandardMaterial color={index % 3 ? '#303a31' : '#4b554a'} metalness={.73} roughness={.36}/></mesh>
        <mesh geometry={geometries.face} position-z={.172}><meshStandardMaterial color={lit ? (index === 0 ? '#e4ffad' : '#98cf50') : '#171f18'} emissive={lit ? '#78d335' : '#182914'} emissiveIntensity={lit ? (index === 0 ? 1.1 : .36) : .14} metalness={lit ? .24 : .65} roughness={.36}/></mesh>
        {index % 2 === 0 && <mesh geometry={geometries.inset} position={[.057,-.035,.204]}><meshStandardMaterial color={lit ? '#d8ff9f' : '#4b6449'} emissive={lit ? '#b8ff61' : '#243e20'} emissiveIntensity={lit ? .48 : .24} metalness={.4} roughness={.4}/></mesh>}
        <mesh geometry={geometries.face} position-z={-.168}><meshStandardMaterial color={lit ? '#668d44' : '#202b21'} emissive={lit ? '#527d2d' : '#000000'} emissiveIntensity={.22} metalness={.57} roughness={.41}/></mesh>
      </group>;
    })}
    <mesh rotation={[Math.PI/2,0,0]} position-z={-.32}><cylinderGeometry args={[1.43,1.43,.35,6]}/><meshStandardMaterial color="#202823" metalness={.67} roughness={.35}/></mesh>
    <mesh rotation={[Math.PI/2,0,0]} position-z={-.53}><cylinderGeometry args={[1.12,1.12,.11,6]}/><meshStandardMaterial color="#394335" emissive="#2d451e" emissiveIntensity={.24} metalness={.63} roughness={.38}/></mesh>
    <group position-z={-.593} rotation-y={Math.PI}>
      {[.64,.93].map(radius => <mesh key={radius} rotation-z={Math.PI/6}><ringGeometry args={[radius-.027,radius,6]}/><meshStandardMaterial color="#a1d66d" emissive="#6ab337" emissiveIntensity={radius < .8 ? .53 : .24} metalness={.44}/></mesh>)}
      <mesh geometry={geometries.face} scale={1.05}><meshStandardMaterial color="#a2c67b" emissive="#6bb435" emissiveIntensity={.58} metalness={.44} roughness={.37}/></mesh>
      {Array.from({length:6},(_,index) => {
        const angle = index * Math.PI / 3;
        return <mesh key={index} position={[.79*Math.cos(angle),.79*Math.sin(angle),.008]} geometry={geometries.inset} scale={.33}><meshStandardMaterial color="#d0ecb1" emissive="#89b659" emissiveIntensity={.55}/></mesh>;
      })}
    </group>
  </group>;
}

const meshNodes = [[0,0,.55],[-1.13,.7,0],[1.2,.73,-.3],[-1,-.83,.25],[.86,-.9,-.4],[.16,.94,-.75],[.15,-.95,-.8]] as const;
const meshLinks = [[0,1],[0,2],[0,3],[0,4],[0,5],[0,6],[1,5],[2,5],[3,6],[4,6]] as const;
function Topology() {
  return <group>
    {meshLinks.map(([a,b]) => {
      const start = new Vector3(...meshNodes[a]), end = new Vector3(...meshNodes[b]);
      const direction = end.clone().sub(start);
      const mid = start.clone().addScaledVector(direction,.5);
      const rotation = new Quaternion().setFromUnitVectors(new Vector3(0,1,0), direction.clone().normalize());
      return <mesh key={a+'-'+b} position={mid} quaternion={rotation}><cylinderGeometry args={[.019,.019,direction.length(),8]}/><meshStandardMaterial color="#76b169" emissive="#446a2b" emissiveIntensity={.8}/></mesh>;
    })}
    {meshNodes.map((point,index) => <mesh key={index} position={[...point]} rotation={[Math.PI / 2,0,.35]}><cylinderGeometry args={[index ? .19 : .4,index ? .22 : .44,.29,6]}/><meshStandardMaterial color={index === 2 ? '#80afdf' : '#9be34d'} emissive={index === 2 ? '#417ab0' : '#76bc3e'} emissiveIntensity={.44} metalness={.5} roughness={.36}/></mesh>)}
  </group>;
}

function Fragment({item,index,reduced}: {item: typeof ambient[number];index:number;reduced:boolean}) {
  const group = useRef<Group>(null);
  const [hover,setHover] = useState(false);
  useFrame(({clock},delta) => {
    const node = group.current!;
    const time = reduced ? 0 : clock.elapsedTime * item.speed;
    node.position.y = item.position[1] + Math.sin(time + item.phase) * item.amplitude;
    node.position.x = item.position[0] + Math.cos(time * .62 + item.phase) * item.amplitude * (index % 2 ? 1.4 : .27);
    node.rotation.set(.5 + time * .26, item.phase + time * (index % 2 ? -.4 : .32), time * .19);
    node.scale.setScalar(MathUtils.damp(node.scale.x, hover ? 1.22 : 1, 8, delta));
  });
  return <group ref={group} position={[...item.position]} onPointerOver={() => setHover(true)} onPointerOut={() => setHover(false)}>
    <mesh>
      {item.shape === 'hex' ? <cylinderGeometry args={[item.size,item.size,.14,6]}/> : item.shape === 'cube' ? <boxGeometry args={[item.size * 1.4,item.size * 1.4,item.size * 1.4]}/> : <octahedronGeometry args={[item.size]}/>}
      <meshStandardMaterial color={item.color} emissive={item.color} emissiveIntensity={hover ? .52 : .13} metalness={.64} roughness={.35}/>
    </mesh>
  </group>;
}

function Model({kind,drag,reduced,compact,scrollTarget}: {kind:SceneKind;drag:RefObject<Drag>;reduced:boolean;compact:boolean;scrollTarget:RefObject<number>}) {
  const model = useRef<Group>(null);
  const stage = useRef<Group>(null);
  const rotation = useRef({x:.18,y:-.38,idle:0});
  useFrame(({clock},delta) => {
    const dt = Math.min(.045, delta);
    const input = drag.current, view = rotation.current;
    view.x += input.dy;
    view.y += input.dx;
    input.dx = input.dy = 0;
    if (input.pointer === null && !reduced) {
      view.x += input.vy * dt;
      view.y += input.vx * dt;
      input.vx = MathUtils.damp(input.vx,0,4.5,dt);
      input.vy = MathUtils.damp(input.vy,0,4.5,dt);
      view.idle = MathUtils.damp(view.idle,.19,2.5,dt);
      view.y += view.idle * dt;
    } else {
      view.idle = 0;
    }
    const scroll = reduced ? 0 : scrollTarget.current;
    const t = reduced ? 0 : clock.elapsedTime;
    model.current!.rotation.set(view.x + (reduced ? 0 : input.hoverY * .105), view.y + (reduced ? 0 : input.hoverX * .13), -.085);
    model.current!.position.y = .11 * Math.sin(t * 1.4) + .12;
    stage.current!.position.y = MathUtils.damp(stage.current!.position.y, -.38 * scroll, 5, dt);
    stage.current!.scale.setScalar(MathUtils.damp(stage.current!.scale.x, 1 - scroll * .19, 5, dt));
  });
  return <group ref={stage}>
    <group ref={model}>{kind === 'core' ? <Core/> : kind === 'network' ? <Topology/> : <TechGlyph reduced={reduced}/>}</group>
    {kind === 'core' && <group scale-x={compact ? .73 : 1}>{ambient.slice(0,compact ? 4 : ambient.length).map((item,index) => <Fragment key={index} item={item} index={index} reduced={reduced}/>)}</group>}
  </group>;
}

export default function Scene({kind}: {kind:SceneKind}) {
  const reduced = Boolean(useReducedMotion());
  const wrapper = useRef<HTMLDivElement>(null);
  const [visible,setVisible] = useState(true);
  const [compact,setCompact] = useState(() => window.matchMedia('(max-width: 720px)').matches);
  const drag = useRef<Drag>({pointer:null,x:0,y:0,dx:0,dy:0,vx:0,vy:0,time:0,distance:0,hoverX:0,hoverY:0});
  const scrollTarget = useRef(0);
  useEffect(() => {
    const media = window.matchMedia('(max-width: 720px)');
    const resize = () => setCompact(media.matches);
    media.addEventListener('change',resize);
    const observer = new IntersectionObserver(entries => setVisible(entries[0].isIntersecting));
    observer.observe(wrapper.current!);
    const scroll = () => {
      const element = wrapper.current;
      if (element) scrollTarget.current = Math.max(0,Math.min(1, -element.getBoundingClientRect().top / innerHeight));
    };
    if (kind === 'core') window.addEventListener('scroll',scroll,{passive:true});
    return () => {observer.disconnect(); media.removeEventListener('change',resize); window.removeEventListener('scroll',scroll);};
  },[kind]);
  function move(event:ReactPointerEvent<HTMLDivElement>) {
    const input = drag.current;
    const bounds = event.currentTarget.getBoundingClientRect();
    input.hoverX = (event.clientX - bounds.x) / bounds.width - .5;
    input.hoverY = (event.clientY - bounds.y) / bounds.height - .5;
    if (input.pointer !== event.pointerId) return;
    const x = event.clientX - input.x, y = event.clientY - input.y;
    const seconds = Math.max(.008,(performance.now()-input.time)/1000);
    input.distance += Math.hypot(x,y);
    if (input.distance > 4) {
      input.dx += x * .009;
      input.dy += y * .009;
      input.vx = MathUtils.clamp(x * .009 / seconds,-5,5);
      input.vy = MathUtils.clamp(y * .009 / seconds,-5,5);
    }
    input.x = event.clientX;
    input.y = event.clientY;
    input.time = performance.now();
  }
  function release(event:ReactPointerEvent<HTMLDivElement>) {
    const input = drag.current;
    if (input.pointer !== event.pointerId) return;
    if (performance.now()-input.time > 100 || input.distance <= 4 || event.type === 'pointercancel') input.vx = input.vy = 0;
    input.pointer = null;
    if (event.currentTarget.hasPointerCapture(event.pointerId)) event.currentTarget.releasePointerCapture(event.pointerId);
    event.currentTarget.classList.remove('dragging');
  }
  return <div ref={wrapper} className="scene-canvas" role="group" aria-label="Interactive 3D model. Drag or use arrow keys to rotate." tabIndex={0}
    onPointerDown={event => {
      const input = drag.current;
      if (input.pointer !== null || event.button !== 0) return;
      Object.assign(input,{pointer:event.pointerId,x:event.clientX,y:event.clientY,time:performance.now(),distance:0,vx:0,vy:0});
      event.currentTarget.setPointerCapture(event.pointerId);
      event.currentTarget.classList.add('dragging');
    }}
    onPointerMove={move} onPointerUp={release} onPointerCancel={release} onLostPointerCapture={release}
    onPointerLeave={() => {drag.current.hoverX = drag.current.hoverY = 0;}}
    onKeyDown={event => {
      const key = event.key;
      if (!['ArrowLeft','ArrowRight','ArrowUp','ArrowDown'].includes(key)) return;
      event.preventDefault();
      drag.current.dx += key === 'ArrowLeft' ? -.19 : key === 'ArrowRight' ? .19 : 0;
      drag.current.dy += key === 'ArrowUp' ? -.19 : key === 'ArrowDown' ? .19 : 0;
    }}>
    <Canvas frameloop={visible ? 'always' : 'never'} dpr={[1,compact ? 1.25 : 1.65]} camera={{position:[0,.18,7.65],fov:kind === 'core' ? (compact ? 42 : 39) : 29}} gl={{antialias:!compact,alpha:true,powerPreference:'low-power'}} onCreated={({gl}) => {gl.domElement.dataset.renderer = 'webgl';}}>
      <ambientLight intensity={1.4} color="#c8d5cc"/>
      <directionalLight position={[-3,5,5]} intensity={3.35} color="#e6ffca"/>
      <directionalLight position={[4,-1,-2]} intensity={2.3} color="#83d458"/>
      <pointLight position={[1,1,4]} intensity={10} color="#92bfac" distance={10}/>
      <Model kind={kind} drag={drag} reduced={reduced} compact={compact} scrollTarget={scrollTarget}/>
      {!compact && kind === 'core' && <ContactShadows position={[0,-2.03,0]} opacity={.48} scale={7} blur={2.3} far={4} resolution={128} frames={1} color="#8bc54b"/>}
    </Canvas>
  </div>;
}