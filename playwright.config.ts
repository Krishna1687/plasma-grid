import {defineConfig, devices} from '@playwright/test';

export default defineConfig({
  testDir: './tests',
  timeout: 55_000,
  use: {
    baseURL: 'http://127.0.0.1:4173',
    launchOptions: {
      executablePath: process.env.PLASMA_GRID_BROWSER_PATH,
      args: ['--enable-webgl', '--use-angle=swiftshader', '--enable-unsafe-swiftshader'],
    },
  },
  projects: [{name: 'chromium', use: {...devices['Desktop Chrome'], viewport: {width: 1440, height: 900}}}],
  webServer: {command: 'npm run preview -- --host 127.0.0.1 --port 4173 --strictPort', url:'http://127.0.0.1:4173', reuseExistingServer: !process.env.CI},
});