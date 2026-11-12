import {useEffect, useMemo, useState} from 'react';
import {Activity, ArrowRight, ArrowUpRight, CircleAlert, Clock3, Globe2, Network, Pause, Play, RotateCcw, Server, X, Zap} from 'lucide-react';
import {Area, AreaChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis} from 'recharts';
import {advance, createSimulation, eventsFor, formatDate, formatTime, metrics, observe, operatingState, ranges, recover, scenarios, selectScenario, serviceById, services, telemetry, timestamp} from './content/telemetry';
import type {Metric, Range, Scenario, Scope, ServiceId} from './content/telemetry';

const integer = new Intl.NumberFormat('en-US');
const replayStages = ['Baseline','Latency spike','Alert triggered','Investigation','Recovery applied','Recovered'];

export default function Observability() {
  const [simulation,setSimulation] = useState(createSimulation);
  const [range,setRange] = useState<Range>('1H');
  const [service,setService] = useState<Scope>('all');
  const [metric,setMetric] = useState<Metric>('latency');
  const [details,setDetails] = useState(false);
  const [replay,setReplay] = useState<number | null>(null);
  const [paused,setPaused] = useState(false);
  const [replayRun,setReplayRun] = useState(0);
  const state = operatingState(simulation);
  const {points,summary,from,to,bucket} = useMemo(() => telemetry(simulation,service,range),[simulation,service,range]);
  const current = useMemo(() => observe(simulation),[simulation]);
  const selected = service === 'all' ? undefined : serviceById.get(service);
  const latest = selected && current.get(selected.id);
  const events = eventsFor(simulation,service).slice(-4).reverse();
  const incident = state === 'slowdown' || state === 'outage';
  const healthy = services.filter(item => current.get(item.id)!.health === 'Healthy').length;
  const config = metrics[metric];
  const related = selected ? services.filter(item => item.dependencies.some(edge => edge.id === selected.id) || selected.dependencies.some(edge => edge.id === item.id)) : [];
  const protocols = [
    {name:'TCP',color:'var(--cyan)',bytes:summary.tcp},
    {name:'UDP',color:'var(--violet)',bytes:summary.udp},
    {name:'Other',color:'#8697a9',bytes:summary.bytes-summary.tcp-summary.udp},
  ];
  const tcp = summary.tcp / summary.bytes * 100;
  const udpEnd = (summary.tcp + summary.udp) / summary.bytes * 100;

  useEffect(() => {
    if (replay === null || paused || replay >= replayStages.length - 1) return;
    const timer = window.setTimeout(() => {
      setSimulation(previous => {
        if (replay === 0) return selectScenario(previous,'slowdown');
        if (replay === 3) return recover(previous);
        return advance(previous,replay === 4 ? 6 : 2);
      });
      setReplay(replay + 1);
    }, 2200);
    return () => window.clearTimeout(timer);
  },[paused,replay,replayRun]);
  useEffect(() => {
    if (replay !== null || state === 'healthy') return;
    const timer = window.setInterval(() => setSimulation(previous => advance(previous)), 4200);
    return () => window.clearInterval(timer);
  },[replay,state]);

  function choose(id:Scope) {
    setService(id);
    setDetails(id !== 'all');
  }
  function changeScenario(scenario:Scenario) {
    setReplay(null);
    setSimulation(previous => selectScenario(previous,scenario));
  }
  function restartReplay() {
    setSimulation(previous => operatingState(previous) === 'healthy' ? previous : advance(recover(previous),6));
    setReplay(0);
    setReplayRun(run => run + 1);
    setPaused(false);
    choose('all');
    setMetric('latency');
  }

  const stats = [
    {key:'availability',icon:Activity,value:summary.availability.toFixed(2),unit:'%',note:integer.format(summary.passed) + ' / ' + integer.format(summary.checks) + ' probes passed'},
    {key:'latency',icon:Zap,value:summary.latency.toFixed(1),unit:'ms',note:'Request-weighted mean'},
    {key:'requests',icon:Server,value:integer.format(summary.requests),unit:'',note:'Total requests in window'},
    {key:'errors',icon:CircleAlert,value:summary.errors.toFixed(2),unit:'%',note:integer.format(summary.failures) + ' failed requests'},
  ] as const;
  return <div className="dashboard">
    <div className="dash-toolbar">
      <div className="dash-name"><span className="dash-icon"><Activity size={18}/></span><div><strong>Plasma Grid Operations</strong><span>Interactive Observability Demo — Synthetic Data</span></div></div>
      <div className="dash-filters">
        <label className="sr-only" htmlFor="service-filter">Service</label>
        <select id="service-filter" value={service} onChange={event => choose(event.target.value as Scope)}><option value="all">All services</option>{services.map(item => <option key={item.id} value={item.id}>{item.name}</option>)}</select>
        <div className="segment" aria-label="Time range"><Clock3 size={14}/>{(Object.keys(ranges) as Range[]).map(value => <button key={value} aria-pressed={range === value} onClick={() => setRange(value)}>{value}</button>)}</div>
      </div>
    </div>
    <div className="sim-controls">
      <label htmlFor="scenario-filter">Operating scenario</label>
      <select id="scenario-filter" value={replay !== null ? (replay === 0 ? 'healthy' : 'slowdown') : state === 'recovering' ? 'healthy' : state} onChange={event => changeScenario(event.target.value as Scenario)}>
        {Object.entries(scenarios).map(([id,name]) => <option key={id} value={id}>{name}</option>)}
      </select>
      <span className={'sim-state ' + state} role="status">{state === 'recovering' ? 'Recovering' : state === 'healthy' ? 'Stable' : scenarios[state]}</span>
      <button className="button button-secondary compact" disabled={!incident} onClick={() => {setReplay(null);setSimulation(recover);}}>Apply recovery</button>
      <time dateTime={new Date(to).toISOString()}><Clock3 size={14}/> Simulation clock · {formatDate(to)}</time>
    </div>
    <div className="stat-grid">{stats.map(({key,value,unit,icon:Icon,note}) => <button key={key} className="stat" aria-pressed={metric === key} onClick={() => setMetric(key)}><span><Icon size={14}/>{metrics[key].label}</span><strong>{value}<small>{unit}</small></strong><span className="stat-note">{note}</span></button>)}</div>
    <div className="dash-grid">
      <div className="dash-panel trend">
        <div className="panel-head"><div><h3>Performance trends</h3><p>{selected?.name ?? 'All services'} · {bucket}-minute buckets</p></div><label className="sr-only" htmlFor="metric-filter">Metric</label><select id="metric-filter" value={metric} onChange={event => setMetric(event.target.value as Metric)}>{Object.entries(metrics).map(([key,item]) => <option key={key} value={key}>{item.label}</option>)}</select></div>
        <p className="chart-window">{formatDate(from)} → {formatDate(to)}</p>
        <div className="chart" aria-label={config.label + ' over time'}><ResponsiveContainer width="100%" height="100%">
          <AreaChart data={points} margin={{top:12,right:14,bottom:0,left:1}}>
            <defs><linearGradient id="trend-fill" x1="0" x2="0" y1="0" y2="1"><stop offset="0%" stopColor={config.color} stopOpacity={.29}/><stop offset="100%" stopColor={config.color} stopOpacity={.015}/></linearGradient></defs>
            <CartesianGrid vertical={false} stroke="#363e47" strokeDasharray="3 4"/>
            <XAxis dataKey="time" type="number" domain={['dataMin','dataMax']} tickFormatter={value => formatTime(value).slice(0,5)} tickLine={false} axisLine={false} tick={{fill:'#aab6b5',fontSize:10}} minTickGap={29}/>
            <YAxis width={70} tickLine={false} axisLine={false} tick={{fill:'#aab6b5',fontSize:10}} domain={metric === 'availability' ? [0,100] : [0,'auto']} tickFormatter={value => Number(value).toLocaleString('en-US',{maximumFractionDigits:1}) + (config.unit === 'requests' ? '' : ' ' + config.unit)}/>
            <Tooltip labelFormatter={value => 'Bucket ending ' + formatDate(Number(value))} contentStyle={{background:'#20252c',border:'1px solid #444d51',borderRadius:8}} itemStyle={{color:config.color}} formatter={value => [Number(value).toLocaleString('en-US',{maximumFractionDigits:2}) + ' ' + config.unit,config.series]}/>
            <Area type="linear" dataKey={metric} stroke={config.color} fill="url(#trend-fill)" strokeWidth={2} isAnimationActive={false}/>
          </AreaChart>
        </ResponsiveContainer></div>
      </div>
      <div className="dash-panel infra">
        <div className="panel-head"><div><h3>Infrastructure health</h3><p>{healthy} of {services.length} nodes healthy · latest minute</p></div><Network size={19}/></div>
        <div className="hex-grid">{services.map(item => {
          const health = current.get(item.id)!.health;
          return <button key={item.id} className={'hex-node ' + health.toLowerCase() + (related.includes(item) ? ' related' : '')} aria-label={item.name + ', ' + health} aria-pressed={item.id === service} title={item.name} onClick={() => choose(item.id)}><span>{item.code}</span></button>;
        })}</div>
        <div className="hex-legend"><span>Healthy</span><span>Degraded</span><span>Critical</span></div>
      </div>
      <div className="dash-panel network-panel">
        <div className="panel-head"><div><h3>Network overview</h3><p>Average throughput · {range}</p></div><button className="text-button" onClick={() => setMetric('traffic')}>Traffic trend <ArrowUpRight size={14}/></button></div>
        <div className="network-layout">
          <div className="donut" aria-hidden="true" style={{background:'conic-gradient(var(--cyan) 0 ' + tcp + '%, var(--violet) ' + tcp + '% ' + udpEnd + '%, #8697a9 0)'}}><span><Globe2 size={20}/></span></div>
          <div className="protocols">{protocols.map(item => <span key={item.name} style={{color:item.color}}>{item.name} <b>{(item.bytes / summary.bytes * 100).toFixed(1)}%</b></span>)}</div>
          <div className="network-flow">
            <span>Source <b>{selected?.name ?? 'API Gateway'}</b></span>
            <span>Destination <b>{selected ? selected.dependencies.map(edge => serviceById.get(edge.id)!.name).join(', ') || 'Direct service traffic' : 'Authentication, Catalog, Network Gateway'}</b></span>
            <span>Traffic <b>{summary.traffic.toFixed(2)} Mb/s</b></span>
          </div>
        </div>
      </div>
      <div className="dash-panel service-panel">
        <div className="panel-head"><div><h3>Service overview</h3><p>{selected?.group ?? 'Fictional service mesh'}</p></div>{selected && <button className="text-button" onClick={() => setDetails(!details)} aria-expanded={details}>{details ? 'Hide details' : 'Open details'}</button>}</div>
        {selected && latest ? <>
          <div className="service-current"><span className={'service-dot ' + latest.health.toLowerCase()}/><strong>{selected.name}</strong><span>{latest.health}</span></div>
          {details && <div className="service-detail">
            <span>Latest minute · {latest.latency.toFixed(1)} ms · {latest.errors.toFixed(2)}% errors · {latest.passed}/{latest.checks} probes passed</span>
            <div className="dependency-list"><span>Related services</span>{related.length ? related.map(item => <button key={item.id} onClick={() => choose(item.id)}>{item.name} <ArrowRight size={12}/></button>) : <span>None</span>}</div>
            {events.length ? <ul className="service-events" aria-label="Recent service events">{events.slice(0,3).map(event =>
              <li key={event.minute + '-' + event.kind}>{formatTime(timestamp(event.minute))} · {event.title}</li>)}</ul> :
              <span>No synthetic incidents recorded for this service.</span>}
          </div>}
        </> : <div className="service-shortcuts">{(['gateway','database','catalog'] as ServiceId[]).map(id => <button key={id} onClick={() => choose(id)}><span className={'service-dot ' + current.get(id)!.health.toLowerCase()}/>{serviceById.get(id)!.name}<ArrowRight size={13}/></button>)}</div>}
      </div>
    </div>
    <div className={'replay ' + (incident ? 'sim-incident' : '')}>
      <div><strong><CircleAlert size={16}/> Incident timeline</strong><p>{replay === null ? 'Scenario changes and recoveries are recorded on the simulation clock.' : 'Guided replay · Database Slowdown'}</p></div>
      <div className="replay-actions">{replay === null ? <button className="button button-secondary compact" onClick={restartReplay}><Play size={15}/> Replay incident</button> : <>
        {replay < replayStages.length - 1 && <button className="button button-secondary compact" onClick={() => setPaused(!paused)}>{paused ? <Play size={15}/> : <Pause size={15}/>} {paused ? 'Resume' : 'Pause'}</button>}
        <button className="button button-secondary compact" onClick={restartReplay}><RotateCcw size={15}/> Restart</button>
        <button className="button button-secondary compact" onClick={() => {setReplay(null);setSimulation(recover);}}><X size={15}/> Exit replay</button>
      </>}</div>
      {replay !== null && <div className="incident-timeline" aria-live="polite">{replayStages.map((label,index) => <span key={label} className={index <= replay ? 'reached' : ''} aria-current={index === replay ? 'step' : undefined}>{label}</span>)}</div>}
      {events.length > 0 && <ol className="sim-events" aria-live="polite">{events.map(event => <li key={event.minute + '-' + event.kind} data-kind={event.kind}><time>{formatTime(timestamp(event.minute))}</time><div><strong>{event.title}</strong><p>{event.detail}</p></div></li>)}</ol>}
    </div>
  </div>;
}
