import {Canvas,useFrame} from '@react-three/fiber';
import type {MotionValue} from 'motion/react';
import {useEffect,useMemo,useRef} from 'react';
import {BufferGeometry, Color, DynamicDrawUsage, Float32BufferAttribute, Group, LineBasicMaterial, Mesh, MeshStandardMaterial, PointsMaterial, Vector3} from 'three';
import {cameraPose,createSculpture,makePose,networkPoint,ramp,warpPose} from './warpMotion';
import type {Shard} from './warpMotion';

type SceneProps = {progress:MotionValue<number>;compact:boolean};
const graphite = new Color('#555963');
const obsidian = new Color('#202127');
const gold = new Color('#E9C985');
const silver = new Color('#BFC3CC');
const pale = new Color('#FFF0C5');

function fragmentGeometry(shard:Shard) {
  const geometry = new BufferGeometry();
  geometry.setAttribute('position',new Float32BufferAttribute(shard.vertices,3));
  const colors = shard.shades.flatMap(shade => {
    const tint = obsidian.clone().lerp(graphite,shade).toArray();
    return [...tint,...tint,...tint];
  });
  geometry.setAttribute('color',new Float32BufferAttribute(colors,3));
  geometry.computeVertexNormals();
  return geometry;
}

function QuantumSculpture({progress,compact}:SceneProps) {
  const model = useRef<Group>(null);
  const meshes = useRef<Mesh[]>([]);
  const sculpture = useMemo(() => createSculpture(compact),[compact]);
  const poses = useMemo(() => sculpture.shards.map(makePose),[sculpture]);
  const nodes = useMemo(() => sculpture.nodes.map(() => new Vector3()),[sculpture]);
  const fragments = useMemo(() => sculpture.shards.map(fragmentGeometry),[sculpture]);
  const surface = useMemo(() => new MeshStandardMaterial({
    vertexColors:true, roughness:.41, metalness:.25, flatShading:true,
  }),[]);
  const graph = useMemo(() => {
    const lines = new BufferGeometry();
    const linePositions = new Float32BufferAttribute(sculpture.links.length*6,3).setUsage(DynamicDrawUsage);
    const colors = sculpture.links.flatMap(link => {
      const tint = (link.gold ? gold : silver).clone().multiplyScalar(link.gold ? .96 : .38).toArray();
      return [...tint,...tint];
    });
    lines.setAttribute('position',linePositions);
    lines.setAttribute('color',new Float32BufferAttribute(colors,3));
    const dots = new BufferGeometry();
    const dotPositions = new Float32BufferAttribute(sculpture.nodes.length*3,3).setUsage(DynamicDrawUsage);
    dots.setAttribute('position',dotPositions);
    return {lines,linePositions,dots,dotPositions};
  },[sculpture]);
  const linesMaterial = useRef<LineBasicMaterial>(null);
  const dotsMaterial = useRef<PointsMaterial>(null);

  useEffect(() => () => {
    fragments.forEach(geometry => geometry.dispose());
    graph.lines.dispose();
    graph.dots.dispose();
  },[fragments,graph]);
  useEffect(() => () => surface.dispose(),[surface]);

  useFrame(({clock}) => {
    const p = progress.get();
    const idle = 1-ramp(p,.075,.20);
    const time = clock.elapsedTime;
    const fracture = ramp(p,.19,.59);
    const acceleration = ramp(p,.65,.84);
    const fade = 1-ramp(p,.81,.97);
    model.current!.rotation.set(.12 + .19*fracture,.18 + .64*fracture + Math.sin(time*.37)*.3*idle,-.13 + .22*fracture);
    model.current!.position.y = .11 + Math.sin(time*.8)*.11*idle;
    model.current!.visible = fade > .001;
    const translucent = fade < 1;
    if (surface.transparent !== translucent) {
      surface.transparent = translucent;
      surface.needsUpdate = true;
    }
    surface.opacity = fade;
    sculpture.shards.forEach((shard,index) => {
      const mesh = meshes.current[index];
      const pose = warpPose(shard,p,poses[index]);
      mesh.position.copy(pose.position);
      mesh.quaternion.copy(pose.quaternion);
      mesh.scale.setScalar(pose.scale);
    });
    const wireFade = 1-ramp(p,.39,.66);
    const charge = ramp(p,.01,.36);
    linesMaterial.current!.opacity = (.64+.29*charge)*wireFade;
    dotsMaterial.current!.opacity = (.65+.22*charge + Math.sin(time*2.1)*.11*idle)*wireFade;
    dotsMaterial.current!.size = .024 + .021*charge + .012*acceleration;
    sculpture.nodes.forEach((anchor,index) => {
      const point = networkPoint(anchor,poses,nodes[index]);
      graph.dotPositions.setXYZ(index,point.x,point.y,point.z);
    });
    sculpture.links.forEach(({from,to},index) => {
      const a = nodes[from], b = nodes[to];
      graph.linePositions.setXYZ(index*2,a.x,a.y,a.z);
      graph.linePositions.setXYZ(index*2+1,b.x,b.y,b.z);
    });
    graph.linePositions.needsUpdate = graph.dotPositions.needsUpdate = true;
  });

  return <group ref={model}>
    {sculpture.shards.map((shard,index) => <mesh key={shard.id} ref={node => {if (node) meshes.current[index] = node;}} geometry={fragments[index]} material={surface} position={shard.original.position} quaternion={shard.original.quaternion} dispose={null}/>)}
    <lineSegments geometry={graph.lines} frustumCulled={false}>
      <lineBasicMaterial ref={linesMaterial} vertexColors transparent depthWrite={false} toneMapped={false}/>
    </lineSegments>
    <points geometry={graph.dots} frustumCulled={false}>
      <pointsMaterial ref={dotsMaterial} color="#FFF0C5" size={.035} transparent depthWrite={false} toneMapped={false}/>
    </points>
  </group>;
}

function makeOrbits(compact:boolean) {
  const positions:number[] = [], colors:number[] = [];
  const ringCount = compact ? 4 : 7;
  for (let ring=0;ring<ringCount;ring++) {
    const radius = .62+ring*.46;
    const depth = -8.6+ring*.96;
    const segments = 96;
    const phase = ring*1.81;
    for (let step=0;step<segments;step++) {
      if ((step + ring*9)%24 > 18 && step%4 !== 0) continue;
      const start = step/segments*Math.PI*2 + phase;
      const end = start + Math.PI*2/segments;
      const tick = step%6 === 0;
      const endRadius = tick ? radius*1.04 : radius;
      const tint = (tick ? pale : gold).clone().multiplyScalar(tick ? .8 : .34+.22*(ring%3)).toArray();
      positions.push(Math.cos(start)*radius,Math.sin(start)*radius,depth,
        Math.cos(tick ? start : end)*endRadius,Math.sin(tick ? start : end)*endRadius,depth);
      colors.push(...tint,...tint);
    }
  }
  const geometry = new BufferGeometry();
  geometry.setAttribute('position',new Float32BufferAttribute(positions,3));
  geometry.setAttribute('color',new Float32BufferAttribute(colors,3));
  return geometry;
}

function QuantumSpace({progress,compact}:SceneProps) {
  const orbits = useMemo(() => makeOrbits(compact),[compact]);
  const orbitGroup = useRef<Group>(null);
  const orbitMaterial = useRef<LineBasicMaterial>(null);
  const trailMaterial = useRef<LineBasicMaterial>(null);
  const dustMaterial = useRef<PointsMaterial>(null);
  const effects = useMemo(() => {
    const count = compact ? 57 : 145;
    const particles = Array.from({length:count},(_,index) => ({
      angle:index*2.399963,
      radius:.13 + (index*37%101)*.043,
      depth:-14+(index*19%89)*.16,
      speed:.64+(index%13)*.062,
    }));
    const trails = new BufferGeometry(), dust = new BufferGeometry();
    const trailPositions = new Float32BufferAttribute(count*6,3).setUsage(DynamicDrawUsage);
    const dustPositions = new Float32BufferAttribute(count*3,3).setUsage(DynamicDrawUsage);
    trails.setAttribute('position',trailPositions);
    trails.setAttribute('color',new Float32BufferAttribute(particles.flatMap((_,index) => [
      ...gold.clone().multiplyScalar(index%5 === 0 ? .93 : .48).toArray(),...gold.clone().multiplyScalar(.08).toArray(),
    ]),3));
    dust.setAttribute('position',dustPositions);
    return {particles,trails,dust,trailPositions,dustPositions};
  },[compact]);

  useEffect(() => () => {
    orbits.dispose();
    effects.trails.dispose();
    effects.dust.dispose();
  },[effects,orbits]);

  useFrame(({camera,clock}) => {
    const p = progress.get(), view = cameraPose(p,compact);
    camera.position.set(...view.position);
    camera.lookAt(...view.target);
    const fly = Math.pow(ramp(p,.62,.89),1.4);
    const fade = 1-ramp(p,.84,1);
    const dust = ramp(p,.35,.66);
    const idle = 1-ramp(p,.04,.2);
    const orbit = orbitGroup.current!;
    orbit.rotation.z = -.15 + fly*.88;
    orbit.position.z = fly*4.4;
    orbit.scale.setScalar(.84+fly*.28);
    orbitMaterial.current!.opacity = ramp(p,.56,.76)*fade*.72;
    trailMaterial.current!.opacity = ramp(p,.60,.77)*fade*.82;
    dustMaterial.current!.opacity = (.22+.38*dust)*fade;
    effects.particles.forEach(({angle,radius,depth,speed},index) => {
      const phase = angle + fly*.31 + Math.sin(clock.elapsedTime*.34 + index)*.013*idle;
      const x = Math.cos(phase), y = Math.sin(phase);
      const r = radius*(.87+fly*.49) + dust*.31*speed;
      const z = depth + fly*(6.4+speed*2.4);
      effects.dustPositions.setXYZ(index,x*r,y*r,z);
      effects.trailPositions.setXYZ(index*2,x*r,y*r,z);
      effects.trailPositions.setXYZ(index*2+1,x*r*(1-.33*fly),y*r*(1-.33*fly),z - (.13+fly*4.2)*speed);
    });
    effects.trailPositions.needsUpdate = effects.dustPositions.needsUpdate = true;
  });

  return <>
    <group ref={orbitGroup}>
      <lineSegments geometry={orbits} frustumCulled={false}><lineBasicMaterial ref={orbitMaterial} vertexColors transparent depthWrite={false} toneMapped={false}/></lineSegments>
    </group>
    <lineSegments geometry={effects.trails} frustumCulled={false}><lineBasicMaterial ref={trailMaterial} vertexColors transparent depthWrite={false} toneMapped={false}/></lineSegments>
    <points geometry={effects.dust} frustumCulled={false}><pointsMaterial ref={dustMaterial} color="#E9C985" size={.021} transparent depthWrite={false} toneMapped={false}/></points>
  </>;
}

export default function WarpScene(props:SceneProps) {
  const {compact} = props;
  return <Canvas aria-hidden="true" style={{pointerEvents:'none'}} dpr={[1,compact ? 1.1 : 1.45]} camera={{fov:compact ? 34 : 36,near:.12,far:40,position:[.24,.29,compact ? 9.9 : 8.9]}} gl={{antialias:true,alpha:true,powerPreference:'low-power'}} onCreated={({gl}) => {gl.domElement.dataset.renderer = 'warp';}}>
    <ambientLight intensity={1.32} color="#BFC3CC"/>
    <directionalLight position={[-3,5,5]} color="#FFF0C5" intensity={2.7}/>
    <directionalLight position={[5,-1,-2]} color="#BFC3CC" intensity={1.75}/>
    <QuantumSculpture {...props}/>
    <QuantumSpace {...props}/>
  </Canvas>;
}
