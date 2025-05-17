import { defineConfig, devices } from '@playwright/experimental-ct-react';
import path from 'path';

export default defineConfig({
  testDir: './tests/components',
  use: {
    ctPort: 3100,
    ctTemplateDir: path.join(__dirname, 'playwright'),
  },
  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] },
    },
  ],
});
