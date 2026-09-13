const { defineConfig, devices } = require('@playwright/test');

const availableProjects = {
  'desktop-chrome': { name: 'desktop-chrome', use: { ...devices['Desktop Chrome'] } },
  'iphone-webkit': { name: 'iphone-webkit', use: { ...devices['iPhone 13'] } },
  'android-chrome': { name: 'android-chrome', use: { ...devices['Pixel 5'] } }
};

const requestedDevices = String(process.env.LRF_DEVICES || Object.keys(availableProjects).join(','))
  .split(',')
  .map((value) => value.trim())
  .filter((value) => availableProjects[value]);

const repeatEach = Math.min(20, Math.max(1, Number.parseInt(process.env.LRF_RUNS || '1', 10) || 1));

module.exports = defineConfig({
  testDir: './tests',
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
  projects: (requestedDevices.length ? requestedDevices : Object.keys(availableProjects))
    .map((name) => availableProjects[name])
});
