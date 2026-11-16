import { defineConfig, devices } from '@playwright/test';

// E2E tests live in e2e/ so Next does not treat them as routes. Every run
// records a video and a screenshot into test-results/.
//
// Playwright starts this checkout's own API and web servers on 4100 and 3100,
// not the usual 4000 and 3000, so a dev server from another branch is never
// the one under test. The web server proxies /api to API_URL (next.config.ts).
const WEB_PORT = 3100;
const API_PORT = 4100;

export default defineConfig({
    testDir: './e2e',
    timeout: 60_000,
    // The tests share accounts and rows in one database, so they run one at a
    // time, in file order.
    workers: 1,
    reporter: [['list'], ['html', { open: 'never' }]],
    use: {
        baseURL: `http://localhost:${WEB_PORT}`,
        video: 'on',
        screenshot: 'on',
        trace: 'retain-on-failure',
    },
    projects: [{ name: 'chromium', use: { ...devices['Desktop Chrome'] } }],
    webServer: [
        {
            command: 'npm run dev --workspace apps/api',
            cwd: '../..',
            env: { PORT: String(API_PORT) },
            url: `http://localhost:${API_PORT}/categories`,
            reuseExistingServer: true,
            timeout: 120_000,
        },
        {
            command: `npx next dev -p ${WEB_PORT}`,
            env: { API_URL: `http://localhost:${API_PORT}` },
            url: `http://localhost:${WEB_PORT}/login`,
            reuseExistingServer: true,
            timeout: 120_000,
        },
    ],
});
