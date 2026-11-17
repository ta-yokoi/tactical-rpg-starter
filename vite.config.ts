import { defineConfig } from 'vitest/config';

export default defineConfig({
  // GitHub Pages project URLs have the form /<repository>/.
  base: process.env.GITHUB_PAGES === 'true'
    ? `/${process.env.GITHUB_REPOSITORY?.split('/')[1] ?? 'tactical-rpg-starter'}/`
    : '/',
  test: { include: ['tests/**/*.test.ts'] },
});
