import {useFrame} from '@react-three/fiber';
import {RoundedBox} from '@react-three/drei';
import {useRef, useState} from 'react';
import type {Group} from 'three';
import {MathUtils} from 'three';

const technologies = [
  {symbol:'cloud', position:[-.76,.24,.22], color:'#b8e47a', base:'#263629', rate:.78, phase:.2},
  {symbol:'monitor', position:[.53,.58,-.17], color:'#91d787', base:'#2b3b30', rate:1.08, phase:1.1},
  {symbol:'react', position:[.60,-.43,.32], color:'#a68be6', base:'#40364f', rate:.64, phase:2.7},
  {symbol:'git', position:[-.42,-.68,-.42], color:'#84bee6', base:'#263d52', rate:1.33, phase:4.9},
] as const;

function Glyph({item,reduced}: {item: typeof technologies[number];reduced:boolean}) {
  const group = useRef<Group>(null);
  const [hover,setHover] = useState(false);
  useFrame(({clock},delta) => {
    const node = group.current!;
    const t = reduced ? 0 : clock.elapsedTime * item.rate;
    node.position.y = item.position[1] + Math.sin(t + item.phase) * (.11 + item.rate * .025);
    node.position.x = item.position[0] + Math.cos(t * .65 + item.phase) * .08;
    node.rotation.set(.19 + Math.sin(t*.6 + item.phase) * .18, item.phase * .13 + Math.sin(t*.53 + item.phase) * .25, -.13 + item.phase * .055);
    node.scale.setScalar(MathUtils.damp(node.scale.x,hover ? 1.17 : 1,9,delta));
  });
  const lit = <meshStandardMaterial color={item.color} emissive={item.color} emissiveIntensity={hover ? .86 : .33} roughness={.44}/>;
  const bar = (x:number,y:number,length:number,angle:number) => <mesh position={[x,y,.24]} rotation-z={angle}><boxGeometry args={[length,.025,.044]}/>{lit}</mesh>;
  return <group ref={group} position={[...item.position]} onPointerOver={() => setHover(true)} onPointerOut={() => setHover(false)}>
    <RoundedBox args={[.84,.75,.40]} radius={.075} smoothness={2}><meshStandardMaterial color={item.base} metalness={.56} roughness={.35}/></RoundedBox>
    <RoundedBox args={[.72,.63,.038]} radius={.043} smoothness={2} position-z={.204}><meshStandardMaterial color={item.base} metalness={.33} roughness={.4}/></RoundedBox>
    {item.symbol === 'cloud' && <group position-z={.245}>
      {[[-.124,-.02,.077],[-.025,.045,.12],[.105,-.009,.091]].map(([x,y,r]) => <mesh key={x} position={[x,y,0]}><sphereGeometry args={[r,12,8]}/>{lit}</mesh>)}
      <RoundedBox args={[.35,.105,.08]} radius={.04} smoothness={2} position-y={-.067}>{lit}</RoundedBox>
    </group>}
    {item.symbol === 'monitor' && <>{bar(-.161,-.035,.105,0)}{bar(-.076,.017,.14,1.07)}{bar(.015,.011,.183,-1.04)}{bar(.10,-.007,.105,.83)}{bar(.166,.032,.069,0)}</>}
    {item.symbol === 'react' && <group position-z={.246}>
      {[0,Math.PI/3,Math.PI*2/3].map(angle => <group key={angle} rotation-z={angle}><mesh scale-y={.49}><torusGeometry args={[.174,.012,5,26]}/>{lit}</mesh></group>)}
      <mesh><sphereGeometry args={[.043,12,8]}/>{lit}</mesh>
    </group>}
    {item.symbol === 'git' && <>
      {bar(-.093,0,.22,Math.PI/2)}{bar(.02,.058,.25,-.48)}
      {[[-.095,.11],[-.095,-.11],[.138,.005]].map(([x,y]) => <mesh key={x+','+y} position={[x,y,.24]}><sphereGeometry args={[.038,12,8]}/>{lit}</mesh>)}
    </>}
  </group>;
}

export default function TechGlyph({reduced}: {reduced:boolean}) {
  return <group rotation={[.12,-.19,-.09]}>{technologies.map(item => <Glyph key={item.symbol} item={item} reduced={reduced}/>)}</group>;
}