import { defineConfig } from '@playwright/test';

const pages = process.env.GITHUB_PAGES === 'true';
const server = 'http://127.0.0.1:4173';
const repository = process.env.GITHUB_REPOSITORY?.split('/')[1] ?? 'tactical-rpg-starter';
const url = pages ? `${server}/${repository}/` : `${server}/`;
const command = pages ? 'npm exec -- vite preview' : 'npm run dev --';

export default defineConfig({
  testDir: './e2e',
  reporter: [['list'], ['html', { outputFolder: 'playwright-report', open: 'never' }]],
  use: { baseURL: url, screenshot: 'on', trace: 'retain-on-failure',
    launchOptions: { executablePath: process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE } },
  webServer: { command: `${command} --host 127.0.0.1 --port 4173 --strictPort`, url, reuseExistingServer: !pages && !process.env.CI },
});
