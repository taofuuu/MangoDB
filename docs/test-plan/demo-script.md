# Project Demonstration Script — 17 November 2026

The three parts of the demo, in order. Test case IDs refer to [test-plan.md](test-plan.md).

## Before the demo

1. Fill `scripts/.env.snapshot` with the Provider, Receiver and Both test accounts (copy `scripts/.env.snapshot.example`).
2. Install once:

```bash
npm install
```

```bash
npx --prefix apps/mangodb playwright install chromium
```

3. Start the app for the manual part. The API runs on 4000, the web app on 3000:

```bash
npm run dev --workspace apps/api
```

```bash
npm run dev --workspace apps/mangodb
```

## Part 1 — Manual black-box testing (EPIC 1)

Open http://localhost:3000 and run these 3 test cases by hand. Read the inputs out loud, then show the output next to "Expected Outputs" in the document.

| Test case | Story          | What to do                                                                                                           | What the audience should see                |
| --------- | -------------- | -------------------------------------------------------------------------------------------------------------------- | ------------------------------------------- |
| TC-1-18   | US1-2 Log in   | Log in with the Provider account's email and correct password                                                        | Lands on the company's own profile page     |
| TC-1-23   | US1-2 Log in   | Same email, password `WrongPass123`                                                                                  | "Invalid email or password"                 |
| TC-1-08   | US1-1 Register | Sign Up → Provider → Next → a new username + password → Next → fill company info with phone `12345` → Create Account | "Use a Thai phone number, e.g. 0812345678." |

These three show one valid class and two different invalid classes.

## Part 2 — Automated black-box testing with Playwright (EPIC 2)

Playwright starts its own API and web app on ports 4100/3100, so the manual servers can keep running.

The whole suite (32 tests, one per test case TC-2-01 … TC-2-32) takes about 5 minutes. Run it before the demo. Live, run one story, which takes under a minute:

```bash
cd apps/mangodb && npx playwright test e2e/epic2/us2-6-create-job.spec.ts --headed
```

The full run, for before the demo:

```bash
cd apps/mangodb && npx playwright test e2e/epic2
```

- Each test's name starts with its test case ID.
- Then show the HTML report: each test has a video and a screenshot.
- If a test fails with a Next.js "404 This page could not be found", run it again. The dev server sometimes answers 404 while it is still compiling a page; we saw this once, on the edit-job page.

```bash
cd apps/mangodb && npx playwright show-report
```

## Part 3 — Unit testing one backend function (Jest, 100% statement coverage)

_Not set up yet: waiting for the team's decision on installing Jest._
