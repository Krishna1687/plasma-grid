export const services = [
  {id:'network', name:'Network Gateway', group:'Edge', code:'NET', base:15, load:820, bytes:8200, tcp:.68, udp:.29, dependencies:[]},
  {id:'database', name:'Database', group:'Data', code:'DB', base:29, load:520, bytes:4600, tcp:.98, udp:.01, dependencies:[]},
  {id:'cache', name:'Cache', group:'Data', code:'CAC', base:10, load:620, bytes:1600, tcp:.97, udp:.02, dependencies:[]},
  {id:'identity', name:'Authentication Service', group:'Application', code:'AUT', base:37, load:310, bytes:2500, tcp:.98, udp:.01, dependencies:[{id:'database',share:.87}]},
  {id:'catalog', name:'Catalog Service', group:'Application', code:'CAT', base:46, load:480, bytes:6200, tcp:.97, udp:.02, dependencies:[{id:'database',share:.81},{id:'cache',share:.62}]},
  {id:'worker', name:'Worker Service', group:'Application', code:'WRK', base:44, load:145, bytes:5700, tcp:.86, udp:.12, dependencies:[{id:'database',share:.72}]},
  {id:'gateway', name:'API Gateway', group:'Edge', code:'API', base:28, load:760, bytes:7300, tcp:.91, udp:.08, dependencies:[{id:'network',share:1},{id:'identity',share:.83},{id:'catalog',share:.68}]},
  {id:'collector', name:'Telemetry Collector', group:'Observability', code:'COL', base:31, load:475, bytes:3200, tcp:.31, udp:.66, dependencies:[{id:'network',share:1}]},
] as const;
export type ServiceId = typeof services[number]['id'];
export type Scope = ServiceId | 'all';
export const serviceById = new Map(services.map(service => [service.id, service]));
export const scenarios = {healthy:'Healthy Operations', slowdown:'Database Slowdown', outage:'Service Outage'} as const;
export type Scenario = keyof typeof scenarios;
type Incident = Exclude<Scenario,'healthy'>;
type EventKind = 'alert' | 'recovery' | 'resolved';
export type SimulationEvent = {minute:number; kind:EventKind; scenario:Incident; title:string; detail:string};
type Episode = {scenario:Incident; start:number; recovery?:number};
export type Simulation = {minute:number; episodes:readonly Episode[]};
export const ranges = {'1H':{minutes:60,bucket:2}, '6H':{minutes:360,bucket:10}, '24H':{minutes:1440,bucket:30}} as const;
export type Range = keyof typeof ranges;
export const metrics = {
  latency:{label:'Latency', unit:'ms', color:'var(--lime)', series:'Mean response latency'},
  requests:{label:'Request volume', unit:'requests', color:'var(--electric-blue)', series:'Requests per bucket'},
  errors:{label:'Error rate', unit:'%', color:'var(--coral)', series:'Failed requests'},
  availability:{label:'Availability', unit:'%', color:'var(--violet)', series:'Passing probes'},
  traffic:{label:'Network traffic', unit:'Mb/s', color:'var(--cyan)', series:'Mean network traffic'},
};
export type Metric = keyof typeof metrics;
export type Health = 'Healthy' | 'Degraded' | 'Critical';
const startTime = Date.UTC(2026,0,15,12);
export const timestamp = (minute:number) => startTime + minute * 60_000;
export const formatTime = (value:number) => new Date(value).toISOString().slice(11,16) + ' UTC';
export const formatDate = (value:number) => new Date(value).toISOString().slice(0,10) + ' ' + formatTime(value);
const recoveryMinutes = 6;
const zero = {requests:0, failures:0, checks:0, passed:0, latencyMs:0, bytes:0, tcp:0, udp:0};
type Counts = typeof zero;
export type Observation = Counts & {latency:number; errors:number; availability:number; traffic:number; health:Health};
export const createSimulation = ():Simulation => ({minute:0,episodes:[]});
export const advance = (simulation:Simulation, minutes=1):Simulation => ({...simulation,minute:simulation.minute + minutes});
export const latestEpisode = (simulation:Simulation) => simulation.episodes.at(-1);
export function operatingState(simulation:Simulation): 'healthy' | 'recovering' | Incident {
  const episode = latestEpisode(simulation);
  if (!episode) return 'healthy';
  if (episode.recovery === undefined) return episode.scenario;
  return simulation.minute < episode.recovery + recoveryMinutes ? 'recovering' : 'healthy';
}
export function recover(simulation:Simulation):Simulation {
  const episode = latestEpisode(simulation);
  if (!episode || episode.recovery !== undefined) return simulation;
  return {...simulation,episodes:[...simulation.episodes.slice(0,-1),{...episode,recovery:simulation.minute + 1}],minute:simulation.minute + 1};
}
export function selectScenario(simulation:Simulation, scenario:Scenario):Simulation {
  const state = operatingState(simulation);
  if (scenario === 'healthy') return recover(simulation);
  if (state === scenario) return simulation;
  const settled = recover(simulation);
  const prior = latestEpisode(settled);
  const start = Math.max(settled.minute + 1, prior?.recovery === undefined ? 0 : prior.recovery + recoveryMinutes);
  return {...settled,minute:start,episodes:[...settled.episodes,{scenario,start}]};
}
export function incidentRoot(scenario:Incident):ServiceId {
  return scenario === 'slowdown' ? 'database' : 'catalog';
}
function dependsOn(id:ServiceId, root:ServiceId):boolean {
  return id === root || serviceById.get(id)!.dependencies.some(dependency => dependsOn(dependency.id,root));
}
export function eventsFor(simulation:Simulation, scope:Scope = 'all'):SimulationEvent[] {
  return simulation.episodes.flatMap(({scenario,start,recovery}) => {
    if (scope !== 'all' && !dependsOn(scope,incidentRoot(scenario))) return [];
    const root = serviceById.get(incidentRoot(scenario))!.name;
    const events:SimulationEvent[] = [{
      minute:start,scenario,kind:'alert',title:scenario === 'slowdown' ? 'Database latency alert' : 'Catalog Service outage',
      detail:scenario === 'slowdown' ? 'Connection pool saturated. Requests are queuing across database clients.' : 'Catalog is refusing requests. API routes that require Catalog are failing.',
    }];
    if (recovery !== undefined) {
      events.push({minute:recovery,scenario,kind:'recovery',title:'Recovery applied',detail:scenario === 'slowdown' ? 'Released stale connections and recycled the pool. The backlog is draining.' : 'Restored Catalog instances. Traffic is returning as probes pass.'});
      if (recovery + recoveryMinutes <= simulation.minute) events.push({minute:recovery + recoveryMinutes,scenario,kind:'resolved',title:'Services recovered',detail:root + ' and its dependents have returned to baseline.'});
    }
    return events;
  });
}
function noise(minute:number, seed:number) {
  const mixed = Math.imul((minute + 24913) ^ seed, 0x45d9f3b);
  return ((Math.imul(mixed ^ (mixed >>> 16), 0x45d9f3b) >>> 0) / 4294967296) - .5;
}
function incidentAt(episodes:readonly Episode[], minute:number) {
  let index = episodes.length - 1;
  while (index >= 0 && episodes[index].start > minute) index--;
  const episode = episodes[index];
  if (!episode) return null;
  if (episode.recovery === undefined || minute < episode.recovery) return {scenario:episode.scenario, strength:1};
  const strength = Math.max(0, (recoveryMinutes - 1 - (minute - episode.recovery)) / recoveryMinutes);
  return {scenario:episode.scenario, strength};
}
export function observe(simulation:Simulation, minute = simulation.minute) {
  const incident = incidentAt(simulation.episodes,minute);
  const rows = new Map<ServiceId, Observation>();
  for (const [index,service] of services.entries()) {
    const seed = index + 1;
    const demand = 1 + .15 * Math.sin(minute / 23) + .14 * noise(minute,seed) + .05 * Math.sin(minute / 6 + seed);
    const requests = Math.round(service.load * demand);
    let latency = service.base * (1 + .15 * noise(minute,seed * 3));
    let success = 1 - (.001 + .001 * (noise(minute,seed * 7) + .5));
    for (const {id,share} of service.dependencies) {
      const child = rows.get(id)!;
      latency += child.latency * share * .6;
      success *= 1 - (child.errors / 100) * share;
    }
    if (incident?.scenario === 'slowdown' && service.id === 'database') {
      latency += 620 * incident.strength;
      success *= 1 - .19 * incident.strength;
    }
    if (incident?.scenario === 'outage' && service.id === 'catalog') {
      latency += 1_050 * incident.strength;
      success *= 1 - incident.strength;
    }
    const failures = Math.round(requests * (1 - success));
    // Twenty probes per service per minute. Each succeeds only if the request succeeds
    // and meets the 450 ms synthetic availability objective.
    const checks = 20;
    const passed = Math.round(checks * (requests - failures) / requests * Math.min(1,450 / latency));
    const bytes = (requests - failures) * service.bytes + failures * 720;
    const errors = failures / requests * 100;
    const health = errors >= 45 || passed <= checks * .4 ? 'Critical' :
      errors >= 5 || latency >= 180 || passed < checks * .95 ? 'Degraded' : 'Healthy';
    rows.set(service.id,{requests,failures,checks,passed,latencyMs:latency * requests,bytes,
      tcp:Math.round(bytes * service.tcp),udp:Math.round(bytes * service.udp),latency,errors,availability:passed / checks * 100,
      traffic:bytes * 8 / 60_000_000,health});
  }
  return rows;
}
function combine(total:Counts, observation:Counts) {
  for (const key of Object.keys(zero) as (keyof Counts)[]) total[key] += observation[key];
}
function summarize(counts:Counts, minutes:number) {
  return {...counts,latency:counts.latencyMs / counts.requests, errors:counts.failures / counts.requests * 100,
    availability:counts.passed / counts.checks * 100,traffic:counts.bytes * 8 / (minutes * 60_000_000)};
}
export function telemetry(simulation:Simulation, scope:Scope, range:Range) {
  const {minutes,bucket} = ranges[range];
  const start = simulation.minute - minutes + 1;
  const totals = {...zero};
  const points = [];
  for (let minute=start;minute<=simulation.minute;minute+=bucket) {
    const counts = {...zero};
    for (let offset=0;offset<bucket;offset++) {
      const rows = observe(simulation,minute + offset);
      if (scope === 'all') rows.forEach(row => combine(counts,row));
      else combine(counts,rows.get(scope)!);
    }
    combine(totals,counts);
    points.push({time:timestamp(minute + bucket - 1),...summarize(counts,bucket)});
  }
  return {points,summary:summarize(totals,minutes),from:timestamp(start),to:timestamp(simulation.minute),bucket};
}
