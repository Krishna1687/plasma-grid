import {expect, test} from '@playwright/test';

test('routes, profile, gallery and resume', async ({page, request}) => {
  const runtimeErrors: string[] = [];
  page.on('pageerror', error => runtimeErrors.push(error.message));
  await page.goto('/');
  await expect(page).toHaveTitle(/PLASMA GRID/);
  await expect(page.getByRole('heading', {level:1})).toContainText('Engineering');
  const resume = await page.getByRole('link', {name:'Resume',exact:true}).first().getAttribute('href');
  const response = await request.get(resume!);
  expect(response.ok()).toBe(true);
  expect((await response.body()).subarray(0,4).toString()).toBe('%PDF');
  await page.getByRole('link', {name:'Explore Work'}).click();
  await expect(page).toHaveURL(/section=projects/);
  await page.getByRole('link', {name:/ALPHABET WAR/}).click();
  await expect(page.getByRole('heading', {name:'ALPHABET WAR'})).toBeVisible();
  await page.reload();
  await expect(page.getByText(/AI-controlled Y-MAN/)).toBeVisible();
  await page.getByRole('link', {name:'Experience',exact:true}).click();
  await page.getByRole('button', {name:/Graduate Engineering Trainee/}).click();
  await expect(page.getByText(/structured training program/)).toBeVisible();
  await page.getByRole('link', {name:'Creative Lab',exact:true}).click();
  await page.getByRole('button', {name:'Digital Art Placeholder'}).click();
  await expect(page.getByRole('dialog')).toBeVisible();
  await page.keyboard.press('ArrowRight');
  await expect(page.getByRole('dialog')).toHaveAccessibleName('Character Design');
  await page.keyboard.press('Escape');
  await expect(page.getByRole('dialog')).toHaveCount(0);
  await expect(page.getByRole('button', {name:'Digital Art Placeholder'})).toBeFocused();
  await page.getByRole('button', {name:'Experiments',exact:true}).click();
  await expect(page.getByRole('button', {name:'Digital Art Placeholder'})).toHaveCount(0);
  await page.goto('/#/?section=certifications');
  const credentials = page.locator('#certifications article');
  await expect(credentials).toHaveCount(5);
  for (const title of ['Dynatrace Essentials','Microsoft Certified: Azure Fundamentals','Microsoft Certified: Azure AI Fundamentals','Certificate of Completion: AI Fluency Framework & Foundations','cribl']) {
    await expect(page.getByRole('heading',{name:title,exact:true})).toBeVisible();
  }
  await page.getByRole('link',{name:'Skills',exact:true}).click();
  await page.getByText('Software Development',{exact:true}).click();
  await expect(page.locator('#skills').getByText('Python',{exact:true})).toBeVisible();
  expect(runtimeErrors).toEqual([]);
});

test('dashboard filters, outage, recovery and guided replay', async ({page}) => {
  await page.clock.install();
  await page.goto('/#/?section=observability');
  const lab = page.locator('#observability');
  const chart = lab.locator('.chart .recharts-area-curve');
  await expect(chart).toBeVisible({timeout:15_000});
  const baseline = await chart.getAttribute('d');
  const volume = lab.getByRole('button',{name:/Request volume/});
  const windowText = lab.locator('.chart-window');
  const shortWindow = await windowText.innerText();
  const shortVolume = await volume.innerText();
  await lab.getByRole('button',{name:'6H',exact:true}).click();
  await expect(windowText).not.toHaveText(shortWindow);
  await expect(volume).not.toHaveText(shortVolume);
  await expect(chart).not.toHaveAttribute('d',baseline!);
  await lab.getByRole('button',{name:'24H',exact:true}).click();
  await expect(lab.getByText(/30-minute buckets/)).toBeVisible();
  await lab.getByRole('button',{name:'1H',exact:true}).click();
  await expect(windowText).toHaveText(shortWindow);
  await lab.getByLabel('Service',{exact:true}).selectOption('catalog');
  await expect(lab.getByRole('button',{name:'Catalog Service, Healthy'})).toHaveAttribute('aria-pressed','true');
  await lab.getByRole('button',{name:'Cache, Healthy'}).click();
  await expect(lab.getByLabel('Service',{exact:true})).toHaveValue('cache');

  const metric = lab.getByLabel('Metric',{exact:true});
  for (const [key,label] of [['availability','Availability'],['errors','Error rate'],['requests','Request volume'],['traffic','Network traffic']]) {
    await metric.selectOption(key);
    await expect(lab.locator('.chart')).toHaveAttribute('aria-label',label + ' over time');
  }
  const scenario = lab.getByLabel('Operating scenario');
  await scenario.selectOption('slowdown');
  await expect(lab.getByRole('button',{name:/Database, (Degraded|Critical)/})).toBeVisible();
  await scenario.selectOption('outage');
  await lab.getByRole('button',{name:'Catalog Service, Critical'}).click();
  await expect(lab.getByLabel('Recent service events')).toContainText('Catalog Service outage');
  await expect(lab.locator('.service-detail')).toContainText('0/20 probes passed');
  await lab.getByRole('button',{name:'Apply recovery',exact:true}).click();
  await expect(lab.locator('.sim-state')).toHaveText('Recovering');
  for (let minute=0;minute<6;minute++) await page.clock.fastForward(4250);
  await expect(lab.getByRole('button',{name:'Catalog Service, Healthy'})).toBeVisible();
  await expect(lab.locator('.sim-events')).toContainText('Catalog Service outage');
  await expect(lab.locator('.sim-events')).toContainText('Services recovered');

  const browserTime = await page.evaluate(() => Date.now());
  await page.clock.pauseAt(new Date(browserTime + 1500));
  await lab.getByRole('button',{name:'Replay incident'}).click();
  await lab.getByRole('button',{name:'Pause',exact:true}).click();
  await page.clock.fastForward(2300);
  await expect(lab.locator('[aria-current=step]')).toHaveText('Baseline');
  await lab.getByRole('button',{name:'Resume',exact:true}).click();
  for (const phase of ['Latency spike','Alert triggered','Investigation','Recovery applied','Recovered']) {
    await page.clock.fastForward(2300);
    await expect(lab.locator('[aria-current=step]')).toHaveText(phase);
  }
  await lab.getByRole('button',{name:'Restart',exact:true}).click();
  await expect(lab.locator('[aria-current=step]')).toHaveText('Baseline');
  await lab.getByRole('button',{name:'Exit replay'}).click();
  await expect(lab.getByRole('button',{name:'Replay incident'})).toBeVisible();
});

test('mobile navigation, reduced motion and touch rotation', async ({browser}) => {
  const context = await browser.newContext({viewport:{width:375,height:812},isMobile:true,hasTouch:true,reducedMotion:'reduce'});
  const page = await context.newPage();
  await page.goto('/');
  expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBe(375);
  const core = page.locator('.sculpture-core .scene-canvas');
  await expect(core.locator('canvas')).toBeVisible({timeout:15_000});
  await core.scrollIntoViewIfNeeded();
  const bounds = (await core.boundingBox())!;
  const x = Math.round(bounds.x + bounds.width / 2);
  const y = Math.round(bounds.y + bounds.height / 2);
  const session = await context.newCDPSession(page);
  await session.send('Input.dispatchTouchEvent', {type:'touchStart',touchPoints:[{x,y}]});
  await expect(core).toHaveClass(/dragging/);
  await session.send('Input.dispatchTouchEvent', {type:'touchMove',touchPoints:[{x:x+55,y:y-20}]});
  await session.send('Input.dispatchTouchEvent', {type:'touchEnd',touchPoints:[]});
  await expect(core).not.toHaveClass(/dragging/);
  await page.getByRole('button', {name:'Open navigation'}).tap();
  await page.getByRole('link', {name:'Observability Lab',exact:true}).tap();
  await expect(page).toHaveURL(/section=observability/);
  await expect(page.getByRole('heading', {name:'Observability Lab'})).toBeInViewport();
  await expect(page.getByRole('button', {name:'1H',exact:true})).toBeVisible();
  expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBe(375);
  await expect(page.locator('#warp')).toHaveClass(/warp-static/);
  await expect(page.locator('#warp canvas')).toHaveCount(0);
  await expect(page.locator('#warp .warp-static-crystal')).toHaveJSProperty('complete',true);
  await context.close();
});

test('three independent WebGL models render, with stable drag input', async ({page}) => {
  await page.goto('/');
  const core = page.locator('.sculpture-core .scene-canvas');
  await expect(core.locator('canvas[data-renderer=webgl]')).toBeVisible({timeout:15_000});
  const bounds = (await core.boundingBox())!;
  const x = bounds.x + bounds.width / 2, y = bounds.y + bounds.height / 2;
  await page.mouse.move(x,y);
  await page.mouse.down();
  await expect(core).toHaveClass(/dragging/);
  await page.mouse.move(x+100,y-45,{steps:6});
  await page.mouse.up();
  await expect(core).not.toHaveClass(/dragging/);
  await core.focus();
  await page.keyboard.press('ArrowLeft');
  for (const [kind, name] of [['network','Observability Lab'],['stack','Skills']]) {
    await page.getByRole('link',{name,exact:true}).click();
    const canvas = page.locator('.sculpture-' + kind + ' canvas[data-renderer=webgl]');
    await expect(canvas).toBeInViewport({timeout:16_000});
  }
});

test('usable fallback when WebGL is unavailable', async ({page}) => {
  await page.addInitScript(() => {
    const getContext = HTMLCanvasElement.prototype.getContext;
    HTMLCanvasElement.prototype.getContext = function (this: HTMLCanvasElement, type: string, ...args: unknown[]) {
      if (type.startsWith('webgl')) return null;
      return Reflect.apply(getContext,this,[type,...args]);
    } as typeof getContext;
  });
  await page.goto('/');
  await expect(page.getByRole('img', {name:'Static preview of core'})).toBeVisible();
  await expect(page.getByRole('link', {name:'Explore Work'})).toBeEnabled();
  await page.goto('/#/?section=warp');
  await expect(page.locator('#warp')).toHaveClass(/warp-static/);
  await expect(page.locator('#warp .warp-static-crystal')).toBeInViewport();
  await expect(page.locator('#warp canvas')).toHaveCount(0);
});

test('hero animation and scroll-linked background work in both directions', async ({page}) => {
  await page.goto('/');
  const canvas = page.locator('.sculpture-core canvas[data-renderer=webgl]');
  await expect(canvas).toBeVisible({timeout:15_000});
  const firstFrame = await canvas.screenshot();
  await expect.poll(async () => (await canvas.screenshot()).equals(firstFrame), {timeout:12_000}).toBe(false);

  const grid = page.locator('.hero-grid-bg');
  const opacity = () => grid.evaluate(element => Number(getComputedStyle(element).opacity));
  await expect.poll(opacity).toBeCloseTo(1, 2);
  await page.evaluate(() => window.scrollTo(0, 310));
  await expect.poll(opacity).toBeLessThan(.90);
  await page.evaluate(() => window.scrollTo(0, 0));
  await expect.poll(opacity).toBeCloseTo(1, 2);
});

test('practice diagnosis and recovery are isolated from the dashboard', async ({page}) => {
  await page.clock.install();
  await page.goto('/#/?section=observability');
  const scenario = page.getByLabel('Operating scenario');
  await expect(scenario).toHaveValue('healthy',{timeout:18_000});
  await page.getByRole('link',{name:'Practice Lab',exact:true}).click();
  const lab = page.locator('#practice');
  await lab.getByRole('button',{name:'Start',exact:true}).click();
  await expect(lab.getByText(/API Gateway latency elevated/)).toBeVisible();
  await expect(lab.getByRole('table')).toContainText('Database');
  const cause = lab.getByLabel('Select Root Cause');
  await expect(cause).toBeDisabled();
  await lab.getByRole('button',{name:'View Logs'}).click();
  await expect(lab.getByLabel('Synthetic incident logs')).toContainText('active=64/64');
  await lab.getByRole('button',{name:'Investigate'}).click();
  await lab.getByRole('button',{name:'Pause',exact:true}).click();
  const time = lab.locator('.practice-alert time');
  const pausedAt = await time.innerText();
  await page.clock.fastForward(5500);
  await expect(time).toHaveText(pausedAt);
  await expect(cause).toBeDisabled();
  await lab.getByRole('button',{name:'Resume',exact:true}).click();
  await cause.selectOption('pool');
  const action = lab.getByLabel('Recovery action',{exact:true});
  await action.selectOption('scale');
  await lab.getByRole('button',{name:'Apply Recovery Action'}).click();
  await expect(lab.getByRole('status')).toContainText('alert is still active');
  await action.selectOption('pool');
  await lab.getByRole('button',{name:'Apply Recovery Action'}).click();
  await expect(lab.getByRole('status')).toContainText('Correct diagnosis');
  for (let minute=0;minute<6;minute++) await page.clock.fastForward(1100);
  await expect(lab.getByText('Incident resolved',{exact:true})).toBeVisible();
  await lab.getByRole('button',{name:'Restart',exact:true}).click();
  await expect(lab.getByText(/API Gateway latency elevated/)).toBeVisible();
  await expect(cause).toHaveValue('');
  await page.getByRole('link',{name:'Observability Lab',exact:true}).click();
  await expect(page.getByRole('heading',{name:'Observability Lab'})).toBeInViewport();
  await expect(scenario).toHaveValue('healthy');
  await expect(page.locator('#observability .sim-events')).toHaveCount(0);
});

test('Quantum Fracture renders and reverses all five scroll stages', async ({page},testInfo) => {
  const errors:string[] = [];
  page.on('pageerror',error => errors.push(error.message));
  page.on('console',message => {if (message.type() === 'error' && /WebGL|Three|React/i.test(message.text())) errors.push(message.text());});
  await page.goto('/#/?section=warp');
  const warp = page.locator('#warp');
  await expect(warp.locator('canvas[data-renderer=warp]')).toBeVisible({timeout:15_000});
  const current = warp.locator('[aria-current=step]');
  await expect(warp.getByRole('heading',{name:'Quantum Fracture'})).toBeVisible();
  for (const [progress,label] of [[.08,'Intact'],[.31,'Fracture'],[.53,'Disintegration'],[.81,'Acceleration'],[.97,'Arrival'],[.81,'Acceleration'],[.53,'Disintegration'],[.31,'Fracture'],[.08,'Intact']] as const) {
    await warp.evaluate((section,value) => {
      const top = section.getBoundingClientRect().top + window.scrollY;
      window.scrollTo(0,top + (section.offsetHeight - innerHeight)*value);
    },progress);
    await expect(current).toHaveText(label);
    await page.screenshot({path:testInfo.outputPath(label.toLowerCase() + '.png')});
  }
  expect(errors).toEqual([]);
});

test('Quantum Fracture supports a compact touch viewport without trapping scroll', async ({browser},testInfo) => {
  const context = await browser.newContext({viewport:{width:390,height:844},isMobile:true,hasTouch:true});
  try {
    const page = await context.newPage();
    await page.goto('/#/?section=warp');
    const warp = page.locator('#warp');
    const canvas = warp.locator('canvas[data-renderer=warp]');
    await expect(canvas).toBeInViewport({timeout:20_000});
    const title = await warp.getByRole('heading',{name:'Quantum Fracture'}).boundingBox();
    const image = await canvas.boundingBox();
    expect(image!.y).toBeGreaterThan(title!.y + title!.height);
    expect(await canvas.evaluate(element => getComputedStyle(element).pointerEvents)).toBe('none');
    expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBe(390);
    await page.screenshot({path:testInfo.outputPath('mobile.png')});
    const scrollStart = await page.evaluate(() => scrollY);
    const touch = await context.newCDPSession(page);
    const x = Math.round(image!.x + image!.width / 2);
    const y = Math.round(image!.y + image!.height * .76);
    await touch.send('Input.dispatchTouchEvent',{type:'touchStart',touchPoints:[{x,y}]});
    for (let step=1;step<=6;step++) {
      await touch.send('Input.dispatchTouchEvent',{type:'touchMove',touchPoints:[{x,y:y-step*26}]});
    }
    await touch.send('Input.dispatchTouchEvent',{type:'touchEnd',touchPoints:[]});
    await expect.poll(() => page.evaluate(() => scrollY)).toBeGreaterThan(scrollStart + 40);
    await warp.evaluate(section => window.scrollTo(0,section.getBoundingClientRect().bottom + scrollY - innerHeight*.42));
    await expect(page.getByRole('heading',{name:'Tools and disciplines'})).toBeInViewport();
  } finally {
    await context.close();
  }
});
