const { defineConfig, devices } = require('@playwright/test');

const availableProjects = {
  'desktop-chrome': { name: 'desktop-chrome', use: { ...devices['Desktop Chrome'] } },
  'desktop-webkit': { name: 'desktop-webkit', use: { ...devices['Desktop Safari'] } },
  'iphone-webkit': { name: 'iphone-webkit', use: { ...devices['iPhone 13'] } },
  'android-chrome': { name: 'android-chrome', use: { ...devices['Pixel 5'] } }
};

const defaultProjects = ['desktop-chrome', 'iphone-webkit', 'android-chrome'];
const requestedDevices = String(process.env.LRF_DEVICES || defaultProjects.join(','))
  .split(',')
  .map((value) => value.trim())
  .filter((value) => availableProjects[value]);

const repeatEach = Math.min(20, Math.max(1, Number.parseInt(process.env.LRF_RUNS || '1', 10) || 1));

module.exports = defineConfig({
  testDir: './tests',
  // Node's .test files have their own runner and must not execute at collection time.
  testMatch: '**/*.spec.{js,cjs,mjs,ts}',
  timeout: 90_000,
  expect: { timeout: 10_000 },
  fullyParallel: false,
  forbidOnly: Boolean(process.env.CI),
  retries: process.env.CI ? 1 : 0,
  repeatEach,
  workers: 1,
  reporter: [
    ['list'],
    ['html', { outputFolder: 'playwright-report', open: 'never' }]
  ],
  use: {
    baseURL: process.env.BASE_URL || 'https://leroyfactory.fr',
    ignoreHTTPSErrors: true,
    actionTimeout: 12_000,
    navigationTimeout: 35_000,
    screenshot: 'only-on-failure',
    trace: 'retain-on-failure',
    video: 'retain-on-failure'
  },
  projects: (requestedDevices.length ? requestedDevices : defaultProjects)
    .map((name) => availableProjects[name])
});
