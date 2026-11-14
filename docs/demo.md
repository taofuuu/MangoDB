# Demo: accounts and click path

R.3. One login per role, and the clicks for each flow, for the final
presentation.

## Accounts

`npm run db:seed -w api` creates them. The password is `SEED_PASSWORD` in
`apps/api/.env` (or `.env.hosted` for the hosted database). It is never written
here.

| Role     | Email                 | Signs in at    |
| -------- | --------------------- | -------------- |
| Provider | `provider@demo.local` | `/login`       |
| Receiver | `receiver@demo.local` | `/login`       |
| Admin    | `admin@demo.local`    | `/admin/login` |

The seed also gives the Provider and Receiver ten "Demo project:" projects, at
least one in every status, so any project screen can be shown without walking
the whole flow first. To put them back the way they started:

```bash
npm run db:seed -w api -- --reset-demo
```

The seed refuses to run with `NODE_ENV=production`.

## Before you start

- Open the hosted API once a minute or two early. Render's free plan sleeps
  after 15 idle minutes, and the first request takes about a minute.
- Use two browsers (or a normal and a private window), one per company, so you
  don't have to sign out between steps.
- Every step below rings the other company's bell in the navbar. Open it once
  to show the notice.

## Flow 1: job → proposal → project → review

| #   | Who      | Where                                        | Click                                                         |
| --- | -------- | -------------------------------------------- | ------------------------------------------------------------- |
| 1   | Receiver | Profile → My Jobs (`/jobs/mine`)             | **Add Job**, fill in title, budget and deadline, publish      |
| 2   | Provider | **JOBS** (`/jobs`)                           | Find the job, **View Detail** → **Add Proposal** → **Submit** |
| 3   | Receiver | My Jobs → the job's **Proposals**            | Open the proposal → **Accept proposal** → **Open project**    |
| 4   | Provider | **PROJECTS** → the project                   | Quotation card → upload a PDF → **Submit Quotation**          |
| 5   | Receiver | the project                                  | **View Quotation** → **Accept** (or reject, and go back to 4) |
| 6   | Receiver | the project → Deposit                        | **Report Deposit Payment**                                    |
| 7   | Provider | the project → Deposit                        | **Yes, I’ve Received it** → **Confirm**                       |
| 8   | Provider | the project                                  | **Add Update** for progress, then **Submit Project**          |
| 9   | Receiver | the project                                  | **Accept Work** (or **Reject Work** with a reason, back to 8) |
| 10  | Receiver | the project → Review                         | Four scores and a comment → **Submit review**                 |
| 11  | Anyone   | the Provider's profile → **Completed Works** | The project shows with its rating                             |

## Flow 2: service → hire request → project → review

| #    | Who      | Where                                     | Click                                                         |
| ---- | -------- | ----------------------------------------- | ------------------------------------------------------------- |
| 1    | Provider | Profile → My Services (`/services/mine`)  | **Add Service**, fill it in, publish                          |
| 2    | Receiver | **SERVICES** (`/services`)                | Open the service → **Send Hire Request** → **Submit**         |
| 3    | Provider | My Services → the service's **Proposals** | Open the request → **Accept hire request** → **Open project** |
| 4–11 | —        | —                                         | Same as Flow 1, steps 4 to 11                                 |

Accepting a hire request keeps the service open (ADR 0016), so step 2 can be
repeated by another Receiver.

## Side paths worth showing

- **Cancel:** while a project waits for a quotation or the deposit, either
  company can **Cancel Project** (ADR 0015).
- **Your proposals:** **PROPOSALS** in the navbar lists what you sent, with
  Pending / Accepted / Rejected counts.
- **Explore companies:** **COMPANIES** → a company → its services, jobs,
  portfolio, certificates and reviews.
- **Admin:** `/admin/login` → the company list → search, filter by type, open a
  company to edit or delete it.
