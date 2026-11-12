import {expect,test} from '@playwright/test';
import {advance,createSimulation,eventsFor,observe,operatingState,ranges,recover,selectScenario,services,telemetry} from '../src/content/telemetry';
import {Vector3} from 'three';
import {cameraPose,createSculpture,networkPoint,warpPose} from '../src/warpMotion';

test('time ranges use exact minutes and metrics reconcile with sample totals', () => {
  const simulation = createSimulation();
  for (const range of Object.keys(ranges) as (keyof typeof ranges)[]) {
    const view = telemetry(simulation,'all',range);
    const {minutes,bucket} = ranges[range];
    expect(view.points).toHaveLength(minutes / bucket);
    expect(view.to-view.from).toBe((minutes-1)*60_000);
    expect(view.summary.checks).toBe(20 * minutes * services.length);
    expect(view.points.reduce((total,point) => total + point.requests,0)).toBe(view.summary.requests);
    expect(view.summary.errors).toBe(view.summary.failures / view.summary.requests * 100);
    expect(view.summary.availability).toBe(view.summary.passed / view.summary.checks * 100);
    expect(view.summary.traffic).toBe(view.summary.bytes * 8 / (minutes * 60_000_000));
    const catalog = telemetry(simulation,'catalog',range);
    expect(catalog.summary.checks).toBe(20 * minutes);
    expect(catalog.summary.requests).toBeLessThan(view.summary.requests);
  }
  expect(observe(simulation)).toEqual(observe(createSimulation()));
  expect([...observe(simulation).values()].every(sample => sample.health === 'Healthy')).toBe(true);
});

test('incident propagation and recovery preserve prior observations and events', () => {
  const initial = createSimulation();
  const slowdown = selectScenario(initial,'slowdown');
  const slower = observe(slowdown);
  const baseline = observe(initial,slowdown.minute);
  expect(slower.get('database')!.latency).toBeGreaterThan(baseline.get('database')!.latency);
  expect(slower.get('identity')!.errors).toBeGreaterThan(baseline.get('identity')!.errors);
  expect(slower.get('network')).toEqual(baseline.get('network'));

  const outage = selectScenario(slowdown,'outage');
  const failed = observe(outage);
  expect(failed.get('catalog')!.failures).toBe(failed.get('catalog')!.requests);
  expect(failed.get('catalog')!.health).toBe('Critical');
  expect(failed.get('gateway')!.health).toBe('Critical');
  expect(failed.get('identity')!.health).toBe('Healthy');
  const recovering = recover(outage);
  expect(operatingState(recovering)).toBe('recovering');
  expect(observe(recovering).get('catalog')!.errors).toBeLessThan(failed.get('catalog')!.errors);
  const restored = advance(recovering,6);
  expect(operatingState(restored)).toBe('healthy');
  expect(observe(restored).get('catalog')!.health).toBe('Healthy');
  expect(observe(restored,outage.minute)).toEqual(failed);
  expect(eventsFor(restored,'catalog').map(event => event.kind)).toEqual(['alert','recovery','resolved','alert','recovery','resolved']);
  expect(eventsFor(restored,'network')).toEqual([]);
  expect(telemetry(restored,'catalog','1H').summary.availability).toBeLessThan(100);
});

test('Quantum Fracture restores positions, quaternions, scale, network endpoints and camera', () => {
  const checkpoints = [0,.2,.4,.65,.85,1];
  let seed = 1229;
  const intermediate = Array.from({length:24},() => {
    seed = (Math.imul(seed,1664525)+1013904223) >>> 0;
    return seed / 4294967296;
  });
  for (const compact of [false,true]) {
    const sculpture = createSculpture(compact);
    expect(createSculpture(compact)).toEqual(sculpture);
    expect(sculpture.shards.length).toBeGreaterThanOrEqual(compact ? 15 : 35);
    expect(sculpture.shards.length).toBeLessThanOrEqual(compact ? 30 : 70);
    expect(sculpture.links.length).toBeGreaterThan(sculpture.nodes.length / 2);
    function snapshot(progress:number) {
      const poses = sculpture.shards.map(shard => warpPose(shard,progress));
      const transforms = poses.map(pose => ({
        position:pose.position.toArray(),
        quaternion:pose.quaternion.toArray(),
        scale:pose.scale,
      }));
      const endpoints = sculpture.nodes.map(node => networkPoint(node,poses,new Vector3()).toArray());
      return {transforms,endpoints,camera:cameraPose(progress,compact)};
    }
    const samples = [...checkpoints,...intermediate,.30,.75,.45];
    const expected = new Map(samples.map(progress => [progress,snapshot(progress)]));
    const initial = expected.get(0)!;
    expect(initial.transforms).toEqual(sculpture.shards.map(shard => shard.original));
    expect(expected.get(.2)!.transforms).toEqual(initial.transforms);
    expect(expected.get(.65)!.transforms).not.toEqual(initial.transforms);
    expect(expected.get(.65)!.endpoints).not.toEqual(initial.endpoints);
    expect(expected.get(.85)!.camera.position[2]).toBeLessThan(initial.camera.position[2]);
    for (const progress of [0,.30,.75,.45,1,0,.65,.65,...intermediate,...intermediate.toReversed(),0]) {
      const actual = snapshot(progress);
      expect(actual).toEqual(expected.get(progress));
      for (const transform of actual.transforms) {
        expect([...transform.position,...transform.quaternion,transform.scale].every(Number.isFinite)).toBe(true);
        expect(Math.hypot(...transform.quaternion)).toBeCloseTo(1,9);
        expect(Math.hypot(...transform.position)).toBeLessThan(22);
        expect(transform.scale).toBeGreaterThan(.3);
        expect(transform.scale).toBeLessThan(1.1);
      }
      expect(actual.endpoints.flat().every(Number.isFinite)).toBe(true);
      expect([...actual.camera.position,...actual.camera.target].every(Number.isFinite)).toBe(true);
    }
  }
});
