const { defineConfig, devices } = require('@playwright/test');

module.exports = defineConfig({
  testDir: './tests',
  timeout: 90_000,
  expect: { timeout: 10_000 },
  fullyParallel: false,
  forbidOnly: Boolean(process.env.CI),
  retries: process.env.CI ? 1 : 0,
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
  projects: [
    {
      name: 'desktop-chrome',
      use: { ...devices['Desktop Chrome'] }
    },
    {
      name: 'iphone-webkit',
      use: { ...devices['iPhone 13'] }
    },
    {
      name: 'android-chrome',
      use: { ...devices['Pixel 5'] }
    }
  ]
});
