import {useEffect, useState} from 'react';
import {Activity, CircleAlert, ClipboardCheck, Pause, Play, RotateCcw, Terminal} from 'lucide-react';
import {advance,createSimulation,eventsFor,formatTime,observe,operatingState,recover,selectScenario,timestamp} from './content/telemetry';

const causes = {
  pool:'Database connection pool exhaustion',
  dependency:'Slow external dependency',
  config:'Catalog configuration error',
  demand:'Increased request traffic',
};
const actions = {
  pool:'Recycle the database connection pool',
  scale:'Scale the API Gateway',
  cache:'Flush the Catalog cache',
  rollback:'Roll back the Catalog configuration',
};
const logs = [
  {service:'database',level:'WARN',message:'connections active=64/64 idle=0 waiting=47'},
  {service:'authentication',level:'ERROR',message:'pool.acquire timed out after 450ms'},
  {service:'catalog',level:'ERROR',message:'db_pool_wait exceeded 450ms; upstream network RTT normal'},
  {service:'api-gateway',level:'INFO',message:'incoming request volume within baseline band'},
];
type Evidence = 'metrics' | 'logs';

export default function PracticeLab() {
  const [simulation,setSimulation] = useState(createSimulation);
  const [started,setStarted] = useState(false);
  const [paused,setPaused] = useState(false);
  const [panel,setPanel] = useState<Evidence>('metrics');
  const [reviewed,setReviewed] = useState<Evidence[]>([]);
  const [cause,setCause] = useState('');
  const [action,setAction] = useState('');
  const [feedback,setFeedback] = useState('');
  const state = operatingState(simulation);
  const completed = started && state === 'healthy';
  const responding = state === 'recovering';
  const evidenceReady = reviewed.length === 2;
  const reading = observe(simulation);
  const alert = eventsFor(simulation).find(event => event.kind === 'alert');
  useEffect(() => {
    if (!started || paused || completed) return;
    const timer = window.setInterval(() => setSimulation(previous => advance(previous)),responding ? 1050 : 3200);
    return () => window.clearInterval(timer);
  },[started,paused,completed,responding]);

  function start() {
    setSimulation(selectScenario(createSimulation(),'slowdown'));
    setStarted(true);
    setPaused(false);
    setPanel('metrics');
    setReviewed(['metrics']);
    setCause('');
    setAction('');
    setFeedback('');
  }
  function show(evidence:Evidence) {
    setPanel(evidence);
    setReviewed(previous => previous.includes(evidence) ? previous : [...previous,evidence]);
  }
  function apply(event:React.FormEvent) {
    event.preventDefault();
    if (paused || state !== 'slowdown' || !evidenceReady || !cause || !action) return;
    if (action !== 'pool') {
      const detail = action === 'scale' ? 'Gateway replicas cannot free connections held in the database pool.' :
        action === 'cache' ? 'Flushing the cache sends more requests to the saturated pool.' :
        'The configuration rollback does not release the occupied database connections.';
      setFeedback(detail + ' The alert is still active.');
      setSimulation(previous => advance(previous));
      return;
    }
    setSimulation(recover);
    setFeedback((cause === 'pool' ? 'Correct diagnosis. ' : 'The action worked. The logs point to connection pool exhaustion. ') +
      'Recycling released stale connections. Queued requests are draining and synthetic probes are passing again.');
  }

  return <section className="section practice" id="practice"><div className="site-width">
    <div className="section-title"><p className="eyebrow"><span/>Hands-on operations</p><h2>Practice Lab</h2><p>Investigate a fictional production alert, identify its cause, and apply a recovery action.</p></div>
    <div className="practice-console">
      <header className="practice-header">
        <div><h3><Terminal size={20}/> Incident Response Simulator</h3><p>Training environment · Synthetic data</p></div>
        <div className="practice-controls">
          {!started ? <button className="button button-primary" onClick={start}><Play size={15}/> Start</button> : <>
            <button className="button button-secondary compact" disabled={completed} onClick={() => setPaused(!paused)}>{paused ? <Play size={14}/> : <Pause size={14}/>} {paused ? 'Resume' : 'Pause'}</button>
            <button className="button button-secondary compact" onClick={start}><RotateCcw size={14}/> Restart</button>
          </>}
        </div>
      </header>
      {!started ? <div className="practice-ready"><Activity size={26}/><p>You're on call for the API Gateway. Start the exercise to receive your first alert.</p></div> : <>
        <div className={'practice-alert ' + (completed ? 'resolved' : responding ? 'recovering' : '')}>
          {completed ? <ClipboardCheck size={21}/> : <CircleAlert size={21}/>}
          <div><strong>{completed ? 'Incident resolved' : responding ? 'Recovery in progress' : 'Alert · API Gateway latency elevated'}</strong><p>{completed ? 'The latest probes and service metrics are back within baseline.' : responding ? 'Observe the latest readings as the queue drains.' : 'Investigate the request path and compare the logs with service telemetry.'}</p></div>
          <time>{paused ? 'Paused · ' : ''}{formatTime(timestamp(simulation.minute))}</time>
        </div>
        <div className="practice-grid">
          <div className="practice-evidence">
            <div className="practice-tabs" aria-label="Evidence">
              <button className="button button-secondary compact" aria-pressed={panel === 'metrics'} onClick={() => show('metrics')}><Activity size={15}/> Investigate</button>
              <button className="button button-secondary compact" aria-pressed={panel === 'logs'} onClick={() => show('logs')}><Terminal size={15}/> View Logs</button>
            </div>
            {panel === 'metrics' ? <div className="practice-table"><table><caption>Latest minute</caption><thead><tr><th scope="col">Service</th><th scope="col">Latency</th><th scope="col">Errors</th></tr></thead>
              <tbody>{([{id:'gateway',label:'API Gateway'},{id:'identity',label:'Authentication'},{id:'database',label:'Database'},{id:'network',label:'Network Gateway'}] as const).map(({id,label}) => {
                const row = reading.get(id)!;
                return <tr key={id}><th scope="row">{label}</th><td>{row.latency.toFixed(0)} ms</td><td>{row.errors.toFixed(1)}%</td></tr>;
              })}</tbody></table></div> :
              <ul className="practice-logs" aria-label="Synthetic incident logs">{logs.map(log => <li key={log.service}><time>{formatTime(timestamp(alert!.minute))}</time> <b>{log.level}</b> <span>{log.service}</span><code>{log.message}</code></li>)}</ul>}
          </div>
          <form className="practice-form" onSubmit={apply}>
            <label htmlFor="practice-cause">Select Root Cause</label>
            <select id="practice-cause" value={cause} disabled={!evidenceReady || paused || responding || completed} onChange={event => setCause(event.target.value)}>
              <option value="">Choose a cause</option>{Object.entries(causes).map(([id,name]) => <option key={id} value={id}>{name}</option>)}
            </select>
            <label htmlFor="practice-action">Recovery action</label>
            <select id="practice-action" value={action} disabled={!cause || paused || responding || completed} onChange={event => setAction(event.target.value)}>
              <option value="">Choose an action</option>{Object.entries(actions).map(([id,name]) => <option key={id} value={id}>{name}</option>)}
            </select>
            <button type="submit" className="button button-primary" disabled={!cause || !action || paused || responding || completed}>Apply Recovery Action</button>
            {!evidenceReady && <p>Review both metrics and logs to unlock the diagnosis.</p>}
            {feedback && <p className="practice-feedback" role="status">{feedback}</p>}
          </form>
        </div>
      </>}
    </div>
  </div></section>;
}
