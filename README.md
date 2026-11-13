# PLASMA GRID

A static React and Three.js portfolio for Chowdam Rama Krishna, with three rotatable WebGL models, a scroll-driven Warp Zone, a synthetic Observability Lab, and an incident response Practice Lab.

## Local development

Use Node.js 22.12 or newer.

```sh
npm ci
npm run dev
npm run check
npm run build
npm run preview
```

The production build is written to `dist/`. Browser tests run against the production preview.

```sh
npx playwright install chromium
npm test
```

Set `PLASMA_GRID_BROWSER_PATH` to an installed Chromium executable if needed.

## Content

Edit `src/content/` to update profile details, roles, credentials, skills, projects, and artwork. Project repository and demo links appear when added to the corresponding entries. Set the optional GitHub profile in `src/content/profile.ts`. The public resume is a separate, purpose-built file at `public/resume.pdf`. Replace it when the resume changes.

Both labs use `src/content/telemetry.ts` and keep independent session state. The engine uses a fixed UTC clock and seeded one-minute samples. Service failures and latency propagate through modeled dependencies. Error rate is failed requests divided by total requests. Each service runs 20 modeled probes per minute. The pass count uses request success and a 450 ms latency objective. Traffic is based on modeled successful and failed response byte counts. All-services request totals count observations across services, so one user request can contribute to multiple service totals. The dashboard aggregates exact 1H, 6H, and 24H windows. Recovery appends history, and reloads start a fresh simulation.

In the Practice Lab, select Start, inspect the latest metrics and logs, then choose a root cause and apply a recovery action. Pause freezes the clock and recovery controls. Restart resets the exercise.

The Warp Zone uses a separate Three.js canvas. Scroll progress controls seeded, pre-separated shards, light, camera movement, and the exit fade. The fragment path reverses at the same scroll position. Reduced-motion and WebGL fallback show an assembled still, and smaller screens use fewer shards and streaks.

The contact links use the profile email and open the visitor’s mail client.

## Free static hosting

Create a GitHub repository, push the workspace source to its `main` branch, and commit the npm lockfile. For a new local repository, run the following after creating the remote.

```sh
git init
git add .
git commit -m "Build PLASMA GRID portfolio"
git branch -M main
git remote add origin <your-repository-url>
git push -u origin main
```

**Vercel**. Import the GitHub repository as a Vite project. The checked-in configuration builds with `npm run build` and serves `dist/`. No environment variables are required.

**GitHub Pages**. In the repository’s Pages settings, select GitHub Actions as the source. Run the included workflow manually from the Actions tab. Relative asset paths and hash-based project routes support repository subpaths and direct project links.

Both providers supply HTTPS for their default domain. For a custom domain, add it in your chosen provider’s project settings, set the DNS records it specifies, and wait for domain verification and certificate issuance. Enable Enforce HTTPS on GitHub Pages once the certificate is available.

## Upgrade files

| Area | Files |
| --- | --- |
| Site layout, navigation, and styles | src/App.tsx, src/main.tsx, src/styles.css |
| Observability and Practice labs | src/Observability.tsx, src/PracticeLab.tsx, src/content/telemetry.ts |
| Warp Zone and WebGL fallback | src/WarpZone.tsx, src/WarpScene.tsx, src/warpMotion.ts, src/webgl.tsx |
| Skills and credentials | src/content/skills.ts, src/content/certifications.ts |
| Branding and tooling | index.html, public/favicon.svg, package.json, package-lock.json, .github/workflows/pages.yml |
| Verification and documentation | playwright.config.ts, tests/portfolio.spec.ts, tests/simulation.spec.ts, README.md |

## Verification limits

The dashboard and Practice Lab are local synthetic simulations. Refreshing resets both sessions. The Warp Zone shows a static crystal when WebGL is unavailable or reduced motion is requested. The Three.js library is loaded separately and may trigger a bundle-size warning during the build.

The browser suite uses Chromium, including an emulated touch viewport. Manual compatibility checks on physical mobile devices and Safari remain useful for comparing GPU performance and touch behavior.

## Cloudflare Pages

In Cloudflare, open Workers & Pages, choose Create application, then Pages and Connect to Git. Authorize the GitHub integration for `Krishna1687/plasma-grid`. Use the following build settings.

| Setting | Value |
| --- | --- |
| Production branch | `main` |
| Framework preset | React (Vite) |
| Root directory | Repository root |
| Build command | `npm run build` |
| Build output directory | `dist` |

The portfolio uses hash-based routes and requires no application environment variables. Start the first Cloudflare Pages deployment after publication has been approved.
