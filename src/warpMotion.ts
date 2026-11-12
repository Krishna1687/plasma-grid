import {Euler, IcosahedronGeometry, Quaternion, Vector3} from 'three';

export type XYZ = [number,number,number];
type Rotation = [number,number,number,number];
type Transform = {position:XYZ; quaternion:Rotation; scale:number};
type Triangle = [number,number,number];
export type Shard = {
  id:number; vertices:number[]; shades:number[]; original:Transform; fractured:Transform;
  warp:Transform; drift:XYZ; delay:number;
};
type Anchor = {shard:number; point:XYZ};
export type Connection = {from:number; to:number; gold:boolean};
export const clamp = (value:number) => Math.min(1,Math.max(0,value));
export function ramp(value:number, start:number, end:number) {
  const t = clamp((value-start)/(end-start));
  return t*t*(3-2*t);
}
function seeded(seed:number) {
  return () => {
    seed = (Math.imul(seed,1664525)+1013904223) >>> 0;
    return seed/4294967296;
  };
}
const edgeId = (a:number,b:number) => a < b ? a + ':' + b : b + ':' + a;
const vector = (tuple:XYZ) => new Vector3(...tuple);

export function createSculpture(compact:boolean) {
  const random = seeded(48719);
  const shell = new IcosahedronGeometry(1,1);
  const source = shell.getAttribute('position');
  const vertexIds = new Map<string,number>();
  const points:Vector3[] = [];
  const faces:Triangle[] = [];
  for (let i=0;i<source.count;i+=3) {
    const ids = [i,i+1,i+2].map(index => {
      const position = new Vector3().fromBufferAttribute(source,index);
      const key = position.toArray().map(value => Math.round(value*10000)).join(',');
      const known = vertexIds.get(key);
      if (known !== undefined) return known;
      const angle = position.x*5 + position.y*3 - position.z*4;
      const spike = Math.sin(angle) > .77 ? .32 : 0;
      const radius = 1.48 + (random()-.5)*.77 + spike;
      position.multiplyScalar(radius);
      position.set(position.x*1.03 + position.y*.24,position.y*1.17,position.z*.88 - position.x*.12);
      const id = points.push(position)-1;
      vertexIds.set(key,id);
      return id;
    }) as Triangle;
    faces.push(ids);
  }
  shell.dispose();

  const edges = new Map<string,{a:number;b:number;faces:number[]}>();
  faces.forEach((face,index) => face.forEach((a,i) => {
    const b = face[(i+1)%3], key = edgeId(a,b);
    const edge = edges.get(key);
    if (edge) edge.faces.push(index);
    else edges.set(key,{a,b,faces:[index]});
  }));
  const clusters:number[][] = [];
  const remaining = new Set(faces.keys());
  for (const index of remaining) {
    remaining.delete(index);
    const group = [index];
    const limit = compact ? 3 + (index%3 === 0 ? 1 : 0) : index%4 === 0 ? 1 : 2;
    while (group.length < limit) {
      const neighbor = group.flatMap(faceIndex => faces[faceIndex]
        .flatMap((a,i,face) => edges.get(edgeId(a,face[(i+1)%3]))!.faces))
        .find(candidate => remaining.has(candidate));
      if (neighbor === undefined) break;
      group.push(neighbor);
      remaining.delete(neighbor);
    }
    clusters.push(group);
  }

  const anchors = new Map<number,Anchor>();
  const shards = clusters.map((cluster,id):Shard => {
    const cornerIds = [...new Set(cluster.flatMap(index => faces[index]))];
    const center = cornerIds.reduce((sum,index) => sum.add(points[index]),new Vector3()).divideScalar(cornerIds.length);
    const direction = center.clone().normalize();
    const rotation = new Quaternion().setFromUnitVectors(new Vector3(0,0,1),direction);
    const inverse = rotation.clone().invert();
    const outer = new Map(cornerIds.map(index => [index,points[index].clone().lerp(center,.018)]));
    const inner = new Map(cornerIds.map(index => [index,outer.get(index)!.clone().multiplyScalar(.64 + (index%5)*.035)]));
    const local = (position:Vector3) => position.clone().sub(center).applyQuaternion(inverse);
    for (const index of cornerIds) {
      if (!anchors.has(index)) anchors.set(index,{shard:id,point:local(points[index].clone().multiplyScalar(1.024)).toArray()});
    }
    const vertices:number[] = [], shades:number[] = [];
    function triangle(a:Vector3,b:Vector3,c:Vector3,shade:number) {
      vertices.push(...local(a).toArray(),...local(b).toArray(),...local(c).toArray());
      shades.push(shade);
    }
    for (const face of cluster.map(index => faces[index])) {
      const [a,b,c] = face;
      triangle(outer.get(a)!,outer.get(b)!,outer.get(c)!, .34 + random()*.66);
      triangle(inner.get(c)!,inner.get(b)!,inner.get(a)!, .26 + random()*.22);
      face.forEach((start,i) => {
        const end = face[(i+1)%3];
        if (edges.get(edgeId(start,end))!.faces.every(index => cluster.includes(index))) return;
        const a = outer.get(start)!, b = outer.get(end)!;
        const c = inner.get(start)!, d = inner.get(end)!;
        triangle(b,a,c,.48);
        triangle(b,c,d,.38);
      });
    }
    const randomAxis = new Vector3(random()-.5,random()-.5,random()-.5).normalize();
    const fracturedRotation = rotation.clone().multiply(new Quaternion().setFromAxisAngle(randomAxis,.55+random()*1.65));
    const warpRotation = fracturedRotation.clone().multiply(new Quaternion().setFromEuler(new Euler(random()*2,random()*2,random()*2)));
    const flightDirection = direction.clone().add(new Vector3((random()-.5)*.63,(random()-.5)*.63,(random()-.5)*.85));
    const separated = center.clone().addScaledVector(flightDirection,1.25+random()*1.6);
    const warped = separated.clone().addScaledVector(flightDirection,4+random()*5);
    warped.z += direction.z > .05 ? 2.5 : -4;
    return {
      id,vertices,shades,
      original:{position:center.toArray(),quaternion:rotation.toArray(),scale:1},
      fractured:{position:separated.toArray(),quaternion:fracturedRotation.toArray(),scale:.87+random()*.17},
      warp:{position:warped.toArray(),quaternion:warpRotation.toArray(),scale:.36+random()*.26},
      drift:[direction.y*.36,-direction.x*.35,(random()-.5)*.6],
      delay:.065*clamp((2.05-center.length())/1.28) + random()*.016,
    };
  });

  // One representative anchor per shared shell vertex keeps the graph sparse and tied to real fragments.
  const nodes = points.map((_,index) => anchors.get(index)!);
  const links:Connection[] = [];
  const degrees = nodes.map(() => 0);
  for (const {a,b} of edges.values()) {
    if (degrees[a] >= 3 || degrees[b] >= 3 || random() > (compact ? .68 : .49)) continue;
    links.push({from:a,to:b,gold:random() < .58});
    degrees[a]++;
    degrees[b]++;
  }
  return {shards,nodes,links};
}

export function makePose() {
  return {position:new Vector3(),quaternion:new Quaternion(),scale:1};
}
const startRotation = new Quaternion();
const endRotation = new Quaternion();
export function warpPose(shard:Shard, progress:number, out = makePose()) {
  const separation = ramp(progress,.2+shard.delay,.65);
  const flight = Math.pow(ramp(progress,.65,.89),1.45);
  const from = flight > 0 ? shard.fractured : shard.original;
  const to = flight > 0 ? shard.warp : shard.fractured;
  const weight = flight > 0 ? flight : separation;
  out.position.fromArray(from.position);
  out.quaternion.fromArray(from.quaternion);
  out.scale = from.scale;
  if (weight > 0) {
    for (let axis=0;axis<3;axis++) {
      const curve = shard.drift[axis] * Math.sin(Math.PI*weight) * (flight > 0 ? 2.1 : 1);
      out.position.setComponent(axis,from.position[axis] + (to.position[axis]-from.position[axis])*weight + curve);
    }
    startRotation.fromArray(from.quaternion);
    endRotation.fromArray(to.quaternion);
    out.quaternion.slerpQuaternions(startRotation,endRotation,weight);
    out.scale += (to.scale-from.scale)*weight;
  }
  return out;
}

export function networkPoint(anchor:Anchor, poses:ReturnType<typeof makePose>[], out:Vector3) {
  const pose = poses[anchor.shard];
  return out.fromArray(anchor.point).multiplyScalar(pose.scale).applyQuaternion(pose.quaternion).add(pose.position);
}

export function cameraPose(progress:number,compact:boolean): {position:XYZ;target:XYZ} {
  const drift = ramp(progress,.2,.66);
  const flight = Math.pow(ramp(progress,.63,.91),1.55);
  return {
    position:[.24 + .34*drift - .39*flight,.29 + .18*drift - .34*flight,(compact ? 9.9 : 8.9)+.64*drift-6.2*flight],
    target:[0,-.03,-2.5*flight],
  };
}
