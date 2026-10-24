# The Test Plan

## 1. Cover Page

|             |                                                                     |
| ----------- | ------------------------------------------------------------------- |
| **Project** | MangoDB — B2B platform for software service Providers and Receivers |
| **Course**  | 2110423 Software Engineering — Final Deliverable: The Test Plan     |
| **Team**    | 11_พรี่อองรีสั่งลุย                                                 |
| **Date**    | 16 November 2026                                                    |

### Authors

| #   | Name     | Student ID | Role       |
| --- | -------- | ---------- | ---------- |
| 1   | _(name)_ | _(id)_     | **Leader** |
| 2   | _(name)_ | _(id)_     |            |
| 3   | _(name)_ | _(id)_     |            |
| 4   | _(name)_ | _(id)_     |            |
| 5   | _(name)_ | _(id)_     |            |
| 6   | _(name)_ | _(id)_     |            |
| 7   | _(name)_ | _(id)_     |            |
| 8   | _(name)_ | _(id)_     |            |
| 9   | _(name)_ | _(id)_     |            |

### Contribution to this document

| Name     | Contribution                                 |
| -------- | -------------------------------------------- |
| _(name)_ | _(e.g. ECs and test cases for US1-1, US1-2)_ |
| _(name)_ |                                              |

---

## 2. Black-box Test Plan

### 2.1 Scope and method

We test **2 EPICs** and **4 user stories from each EPIC**:

| EPIC                                                | User stories                | How the test cases are run               |
| --------------------------------------------------- | --------------------------- | ---------------------------------------- |
| EPIC 1 — Account and Company Information Management | US1-1, US1-2, US1-5, US1-7  | Manual black-box testing                 |
| EPIC 2 — Service and Job Posting Management         | US2-1, US2-6, US2-8, US2-13 | Automated black-box testing (Playwright) |

Method (input equivalence class partitioning):

1. Each input of a user story is split into **equivalence classes (ECs)**. All values inside one class should give the same kind of result.
2. Each EC is **Valid** or **Invalid**. Each EC ID has a letter for its input, plus a number (for example `E1`, `E2`).
3. **One valid test case** covers all the valid ECs together. Each **invalid test case** covers **one** invalid EC, and every other input in it is valid. So when an invalid test case fails, we know which input caused it.
4. Every EC is covered by at least one test case.

The test system is the MangoDB web app (Next.js frontend + Express API) running locally against the team's test database. "Actual Outputs" is filled in after each test case is run. **P** = actual matches expected, **F** = it does not.

Shared preconditions:

- **Provider account** — a company with account type PROVIDER that owns at least one service.
- **Receiver account** — a company with account type RECEIVER.
- **Both account** — a company with account type BOTH. It is "another company" in US2-13.
- Test data created by a test case has `[e2e]` in its name. After the run, `[e2e]` services are deleted and `[e2e]` jobs are closed (jobs cannot be deleted in MangoDB).

---

### 2.2 EPIC 1 — Account and Company Information Management

#### US1-1 Register an account

> As a Company, I want to register an account and select an account type so that I can access the system according to my company's role.

**Input equivalence classes**

| EC ID | Input            | Equivalence class                                                    | Valid / Invalid |
| ----- | ---------------- | -------------------------------------------------------------------- | --------------- |
| R1    | Account type     | One of Provider, Receiver, Both is selected                          | Valid           |
| R2    | Account type     | Nothing selected                                                     | Invalid         |
| N1    | Company name     | 1–255 characters                                                     | Valid           |
| N2    | Company name     | Empty                                                                | Invalid         |
| E1    | Email            | Valid format (`name@domain.tld`), not registered yet                 | Valid           |
| E2    | Email            | Empty                                                                | Invalid         |
| E3    | Email            | Wrong format (no `@` or no domain)                                   | Invalid         |
| E4    | Email            | Valid format, already registered                                     | Invalid         |
| P1    | Phone            | Thai number: starts with 0, 9–10 digits (spaces, `-`, `+66` allowed) | Valid           |
| P2    | Phone            | Empty                                                                | Invalid         |
| P3    | Phone            | Not a Thai number format                                             | Invalid         |
| T1    | Company type     | 1–10 types selected                                                  | Valid           |
| T2    | Company type     | None selected                                                        | Invalid         |
| U1    | Username         | 3–50 characters, only letters, digits, `_`, not taken                | Valid           |
| U2    | Username         | Empty                                                                | Invalid         |
| U3    | Username         | Fewer than 3 characters                                              | Invalid         |
| U4    | Username         | Has other characters (space, `-`, `@` …)                             | Invalid         |
| U5    | Username         | Valid format, already taken                                          | Invalid         |
| W1    | Password         | At least 8 characters (at most 72 bytes)                             | Valid           |
| W2    | Password         | Empty                                                                | Invalid         |
| W3    | Password         | Fewer than 8 characters                                              | Invalid         |
| C1    | Confirm password | Same as password                                                     | Valid           |
| C2    | Confirm password | Different from password                                              | Invalid         |
| S1    | Terms of Service | Accepted                                                             | Valid           |
| S2    | Terms of Service | Declined                                                             | Invalid         |

**Test cases**

Valid values used when a test case does not mention an input: account type = Provider, company name = `[e2e] Mango Test Co`, email = `e2e.reg01@example.com`, phone = `0812345678`, company type = `SME`, username = `e2e_reg01`, password = confirm = `Passw0rd!`, ToS = Accept.

| Test Case ID | Inputs                                        | Expected Outputs                                                 | Actual Outputs                                                                               | Classes Covered                    |
| ------------ | --------------------------------------------- | ---------------------------------------------------------------- | -------------------------------------------------------------------------------------------- | ---------------------------------- |
| TC-1-01      | All valid values above                        | Account is created, and the success screen is shown              | Success screen: "Your account has been created successfully." (P)                            | R1, N1, E1, P1, T1, U1, W1, C1, S1 |
| TC-1-02      | No account type selected                      | "Next" button stays disabled; user cannot go on                  | "Next" button is disabled until a role is picked (P)                                         | R2                                 |
| TC-1-03      | Company name = (empty)                        | "Company name is required."                                      | "Company name is required." (P)                                                              | N2                                 |
| TC-1-04      | Email = (empty)                               | "Email is required."                                             | "Email is required." (P)                                                                     | E2                                 |
| TC-1-05      | Email = `mango.example.com`                   | "Please enter a valid email address (e.g., company@domain.com)." | "Please enter a valid email address (e.g., company@domain.com)." (P)                         | E3                                 |
| TC-1-06      | Email = email of an existing account          | "This email is already registered"; no account is created        | "This email is already registered"; no account created (P)                                   | E4                                 |
| TC-1-07      | Phone = (empty)                               | "Phone number is required."                                      | "Phone number is required." (P)                                                              | P2                                 |
| TC-1-08      | Phone = `12345`                               | "Use a Thai phone number, e.g. 0812345678."                      | "Use a Thai phone number, e.g. 0812345678." (P)                                              | P3                                 |
| TC-1-09      | No company type selected                      | "Select at least one company type."                              | "Select at least one company type." (P)                                                      | T2                                 |
| TC-1-10      | Username = (empty)                            | "Username is required."                                          | "Username is required." (P)                                                                  | U2                                 |
| TC-1-11      | Username = `ab`                               | "Username must be at least 3 characters."                        | "Username must be at least 3 characters." (P)                                                | U3                                 |
| TC-1-12      | Username = `mango tester`                     | "Use letters, numbers, and underscores only."                    | "Use letters, numbers, and underscores only." (P)                                            | U4                                 |
| TC-1-13      | Username = username of an existing account    | "This username is already registered"; no account is created     | Sent back to the account step: "This username is already registered"; no account created (P) | U5                                 |
| TC-1-14      | Password = confirm = (empty)                  | "Password is required."                                          | "Password is required." and "Please confirm your password." (P)                              | W2                                 |
| TC-1-15      | Password = confirm = `abc123`                 | "Password must be at least 8 characters."                        | "Password must be at least 8 characters." (P)                                                | W3                                 |
| TC-1-16      | Password = `Passw0rd!`, confirm = `Passw0rd?` | "Passwords do not match."                                        | "Passwords do not match." (P)                                                                | C2                                 |
| TC-1-17      | Decline the Terms of Service                  | No account is created; user is told the Terms must be accepted   | "You must accept the Terms of Service to create an account."; no account created (P)         | S2                                 |

#### US1-2 Log in

> As a Company, I want to log in of the system so that I can securely access functions allowed for my account type.

**Input equivalence classes**

| EC ID | Input    | Equivalence class                        | Valid / Invalid |
| ----- | -------- | ---------------------------------------- | --------------- |
| E1    | Email    | Email of an active (not deleted) account | Valid           |
| E2    | Email    | Empty                                    | Invalid         |
| E3    | Email    | Not registered                           | Invalid         |
| E4    | Email    | Email of a deleted account               | Invalid         |
| P1    | Password | Correct password for that email          | Valid           |
| P2    | Password | Empty                                    | Invalid         |
| P3    | Password | Wrong password                           | Invalid         |

**Test cases**

| Test Case ID | Inputs                                                                  | Expected Outputs                                                 | Actual Outputs                                 | Classes Covered |
| ------------ | ----------------------------------------------------------------------- | ---------------------------------------------------------------- | ---------------------------------------------- | --------------- |
| TC-1-18      | Email = Provider account email, password = its correct password         | Logged in; goes to the user's own profile page (`/profile/view`) | Logged in; redirected to /profile/view (P)     | E1, P1          |
| TC-1-19      | Email = (empty), password = correct password                            | "Please enter your email address."                               | "Please enter your email address." (P)         | E2, P1          |
| TC-1-20      | Email = `nobody.e2e@example.com`, password = `Passw0rd!`                | "Invalid email or password"                                      | "Invalid email or password" (P)                | E3              |
| TC-1-21      | Email = email of a deleted account, password = its old correct password | "Invalid email or password"; not logged in                       | "Invalid email or password"; not logged in (P) | E4              |
| TC-1-22      | Email = Provider account email, password = (empty)                      | "Please enter your password."                                    | "Please enter your password." (P)              | E1, P2          |
| TC-1-23      | Email = Provider account email, password = `WrongPass123`               | "Invalid email or password"                                      | "Invalid email or password" (P)                | E1, P3          |

#### US1-5 Edit company information

> As a Company, I want to edit my company information so that my company profile remains up to date.

**Input equivalence classes**

| EC ID | Input         | Equivalence class                                    | Valid / Invalid |
| ----- | ------------- | ---------------------------------------------------- | --------------- |
| N1    | Company name  | 1–255 characters                                     | Valid           |
| N2    | Company name  | Empty                                                | Invalid         |
| M1    | Contact email | Empty, or valid format                               | Valid           |
| M2    | Contact email | Wrong format                                         | Invalid         |
| P1    | Phone         | Thai number: starts with 0, 9–10 digits              | Valid           |
| P2    | Phone         | Empty                                                | Invalid         |
| P3    | Phone         | Not a Thai number format                             | Invalid         |
| W1    | Website       | Empty, or an http/https/`www.` address with a domain | Valid           |
| W2    | Website       | Other scheme (e.g. `ftp://`) or no domain            | Invalid         |
| T1    | Company type  | 1–10 types                                           | Valid           |
| T2    | Company type  | None                                                 | Invalid         |
| A1    | Action        | Save                                                 | Valid           |
| A2    | Action        | Cancel (do not save)                                 | Valid           |

**Test cases** (logged in as the Provider account, on the profile edit form)

| Test Case ID | Inputs                                                                                                                             | Expected Outputs                                                 | Actual Outputs                                                                                               | Classes Covered        |
| ------------ | ---------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------ | ---------------------- |
| TC-1-24      | Name = `[e2e] Mango Edited`, contact email = `contact@mango.co`, phone = `021234567`, website = `www.mango.co`, type = `SME`; Save | Success message; the profile shows the new values                | "Profile saved successfully."; profile shows the new name, contact email, phone and https://www.mango.co (P) | N1, M1, P1, W1, T1, A1 |
| TC-1-25      | Change name to `[e2e] Not Saved`; Cancel                                                                                           | Form closes; the profile still shows the old name                | Back on the profile page; the name is still the old one (P)                                                  | N1, A2                 |
| TC-1-26      | Name = (empty); Save                                                                                                               | "Company name is required."; nothing is saved                    | "Company name is required." and "Some fields need fixing." (P)                                               | N2                     |
| TC-1-27      | Contact email = `contact@mango`; Save                                                                                              | "Please enter a valid email address (e.g., company@domain.com)." | "Please enter a valid email address (e.g., company@domain.com)." (P)                                         | M2                     |
| TC-1-28      | Phone = (empty); Save                                                                                                              | "Phone number is required."                                      | "Phone number is required." (P)                                                                              | P2                     |
| TC-1-29      | Phone = `0812-ABC`; Save                                                                                                           | "Use a Thai phone number, e.g. 0812345678."                      | "Use a Thai phone number, e.g. 0812345678." (P)                                                              | P3                     |
| TC-1-30      | Website = `ftp://mango.co`; Save                                                                                                   | "Please enter a valid website URL (http or https)."              | "Please enter a valid website URL (http or https)." (P)                                                      | W2                     |
| TC-1-31      | Remove every company type; Save                                                                                                    | "Select at least one company type."                              | "Select at least one company type." (P)                                                                      | T2                     |

#### US1-7 Add a portfolio item

> As a Provider, I want to add portfolio items so that I can present my company's work and experience.

**Input equivalence classes**

| EC ID | Input            | Equivalence class                            | Valid / Invalid |
| ----- | ---------------- | -------------------------------------------- | --------------- |
| N1    | Portfolio name   | 1–255 characters                             | Valid           |
| N2    | Portfolio name   | Empty                                        | Invalid         |
| L1    | Portfolio link   | URL that starts with `http://` or `https://` | Valid           |
| L2    | Portfolio link   | Empty                                        | Invalid         |
| L3    | Portfolio link   | Not an http(s) URL                           | Invalid         |
| D1    | Development date | A valid date                                 | Valid           |
| D2    | Development date | Empty                                        | Invalid         |
| I1    | Image            | PNG, JPEG or WebP, at most 5 MB              | Valid           |
| I2    | Image            | No image                                     | Invalid         |
| I3    | Image            | Other file type (e.g. GIF, PDF)              | Invalid         |
| I4    | Image            | Allowed type, but larger than 5 MB           | Invalid         |

**Test cases** (logged in as the Provider account, Add Portfolio form of one of its services)

Valid values used when a test case does not mention an input: name = `[e2e] Portfolio`, link = `https://example.com/e2e-portfolio`, date = `2026-06-01`, image = `small.png` (100 KB).

| Test Case ID | Inputs                    | Expected Outputs                                             | Actual Outputs                                                                                                                     | Classes Covered |
| ------------ | ------------------------- | ------------------------------------------------------------ | ---------------------------------------------------------------------------------------------------------------------------------- | --------------- |
| TC-1-32      | All valid values above    | Portfolio is saved and shows in the portfolio list           | Saved with the service ("Service updated successfully"); listed under the service with its PNG image (P)                           | N1, L1, D1, I1  |
| TC-1-33      | Name = (empty)            | "Name is required."                                          | "Name is required." (P)                                                                                                            | N2              |
| TC-1-34      | Link = (empty)            | "Portfolio link is required."                                | "Portfolio link is required." (P)                                                                                                  | L2              |
| TC-1-35      | Link = `example.com/work` | "Must be a valid URL starting with http(s)://"               | "Must be a valid URL starting with http(s)://" (P)                                                                                 | L3              |
| TC-1-36      | Date = (empty)            | "Choose a valid development date."                           | Cannot be entered: the date is picked from Day / Month / Year lists that start at today and only offer real dates (N/A — see note) | D2              |
| TC-1-37      | No image                  | "Image is required."                                         | "Image is required." (P)                                                                                                           | I2              |
| TC-1-38      | Image = `animation.gif`   | File is refused: "Only PNG, JPEG or WebP images are allowed" | "Only PNG, JPEG or WebP images are allowed." as soon as the file is chosen; the file is not attached (P)                           | I3              |
| TC-1-39      | Image = `big.png` (6 MB)  | "Image must be 5MB or smaller"; nothing is saved             | "Image must be 5MB or smaller." as soon as the file is chosen; the file is not attached (P)                                        | I4              |

> **Note on TC-1-36.** The rule "the development date is required and must be a real date" exists in the system. But the form picks the date from Day / Month / Year lists. They start at today's date, and the Day list only shows days that exist in the chosen month. So a user cannot enter an empty or impossible date, and this invalid class cannot be produced through the user interface.

**How EPIC 1 was run:** manually, one step at a time in a browser (no test script), against the local app (24 October 2026). A new `[e2e]` account was registered in TC-1-01 and used for US1-5 and US1-7, then deleted for TC-1-21.

---

### 2.3 EPIC 2 — Service and Job Posting Management

#### US2-1 Create a service listing

> As a Provider, I want to create a service listing so that I can present my expertise and estimates to Receivers.

**Input equivalence classes**

| EC ID | Input       | Equivalence class                                           | Valid / Invalid |
| ----- | ----------- | ----------------------------------------------------------- | --------------- |
| A1    | Account     | Provider (or Both) account                                  | Valid           |
| A2    | Account     | Receiver account                                            | Invalid         |
| T1    | Title       | 1–255 characters                                            | Valid           |
| T2    | Title       | Empty                                                       | Invalid         |
| D1    | Description | 1–10,000 characters                                         | Valid           |
| D2    | Description | Empty                                                       | Invalid         |
| C1    | Category    | 1–10 categories                                             | Valid           |
| C2    | Category    | None                                                        | Invalid         |
| K1    | Tech stack  | 1–20 items                                                  | Valid           |
| K2    | Tech stack  | None                                                        | Invalid         |
| B1    | Budget      | Both empty, or whole numbers with 0 ≤ min ≤ max and max > 0 | Valid           |
| B2    | Budget      | Min < 0                                                     | Invalid         |
| B3    | Budget      | Min > max                                                   | Invalid         |
| B4    | Budget      | Max = 0                                                     | Invalid         |
| B5    | Budget      | Not a whole number (e.g. 100.5)                             | Invalid         |

**Test cases**

Valid values used when a test case does not mention an input: Provider account, title = `[e2e] Web App Service`, description = `We build web apps.`, category = the first category, tech stack = `React`, min = `10000`, max = `50000`.

| Test Case ID | Inputs                                                          | Expected Outputs                                                             | Actual Outputs                                                                   | Classes Covered        |
| ------------ | --------------------------------------------------------------- | ---------------------------------------------------------------------------- | -------------------------------------------------------------------------------- | ---------------------- |
| TC-2-01      | All valid values above                                          | Service is created and shows in "My Services"                                | Service is created and shows in "My Services" (P)                                | A1, T1, D1, C1, K1, B1 |
| TC-2-02      | Logged in as the Receiver account; open the create-service page | "You need a Provider account to create or manage service listings."; no form | "You need a Provider account to create or manage service listings."; no form (P) | A2                     |
| TC-2-03      | Title = (empty)                                                 | "Title is required"                                                          | "Title is required" (P)                                                          | T2                     |
| TC-2-04      | Description = (empty)                                           | "Description is required"                                                    | "Description is required" (P)                                                    | D2                     |
| TC-2-05      | No category                                                     | "Select at least one category."                                              | "Select at least one category." (P)                                              | C2                     |
| TC-2-06      | Min = `-1`, max = `50000`                                       | "Minimum budget cannot be negative"                                          | "Minimum budget cannot be negative" (P)                                          | B2                     |
| TC-2-07      | Min = `60000`, max = `50000`                                    | "Minimum budget cannot exceed maximum budget"                                | "Minimum budget cannot exceed maximum budget" (P)                                | B3                     |
| TC-2-08      | Min = empty, max = `0`                                          | "Maximum budget must be greater than zero"                                   | "Maximum budget must be greater than zero" (P)                                   | B4                     |
| TC-2-09      | Min = `100.5`, max = `50000`                                    | "Minimum budget must be an integer"                                          | "Minimum budget must be an integer" (P)                                          | B5                     |
| TC-2-10      | No tech stack                                                   | "At least one tech stack item is required."                                  | "At least one tech stack item is required." (P)                                  | K2                     |

#### US2-6 Create and publish a job posting

> As a Receiver, I want to create and publish a job posting so that I can receive proposals from suitable Providers.

**Input equivalence classes**

| EC ID | Input       | Equivalence class                                        | Valid / Invalid |
| ----- | ----------- | -------------------------------------------------------- | --------------- |
| A1    | Account     | Receiver (or Both) account                               | Valid           |
| A2    | Account     | Provider account                                         | Invalid         |
| T1    | Title       | 1–255 characters                                         | Valid           |
| T2    | Title       | Empty                                                    | Invalid         |
| D1    | Description | 1–10,000 characters                                      | Valid           |
| D2    | Description | Empty                                                    | Invalid         |
| B1    | Budget      | Max is a whole number > 0; min is empty or 0 ≤ min ≤ max | Valid           |
| B2    | Budget      | Max is empty                                             | Invalid         |
| B3    | Budget      | Min > max                                                | Invalid         |
| L1    | Deadline    | Empty, or today or a future date                         | Valid           |
| L2    | Deadline    | A past date                                              | Invalid         |

**Test cases**

Valid values used when a test case does not mention an input: Receiver account, title = `[e2e] Need a Mobile App`, description = `iOS and Android app.`, min = `20000`, max = `80000`, deadline = `2026-12-31`.

| Test Case ID | Inputs                                                      | Expected Outputs                                               | Actual Outputs                                                     | Classes Covered    |
| ------------ | ----------------------------------------------------------- | -------------------------------------------------------------- | ------------------------------------------------------------------ | ------------------ |
| TC-2-11      | All valid values above                                      | Job is published as OPEN and shows in "My Jobs"                | Job is published as OPEN and shows in "My Jobs" (P)                | A1, T1, D1, B1, L1 |
| TC-2-12      | Logged in as the Provider account; open the create-job page | "You need a Receiver account to create job postings."; no form | "You need a Receiver account to create job postings."; no form (P) | A2                 |
| TC-2-13      | Title = (empty)                                             | "Title is required"                                            | "Title is required" (P)                                            | T2                 |
| TC-2-14      | Description = (empty)                                       | "Description is required"                                      | "Description is required" (P)                                      | D2                 |
| TC-2-15      | Max = (empty)                                               | "Maximum budget is required"                                   | "Maximum budget is required" (P)                                   | B2                 |
| TC-2-16      | Min = `90000`, max = `80000`                                | "Minimum budget cannot exceed maximum budget"                  | "Minimum budget cannot exceed maximum budget" (P)                  | B3                 |
| TC-2-17      | Deadline = `2026-01-01`                                     | "Deadline cannot be in the past"                               | "Deadline cannot be in the past" (P)                               | L2                 |

#### US2-8 Submit a proposal to an open job posting

> As a Provider, I want to submit a proposal to an open job posting so that I can offer my service, estimated price, and delivery duration to the Receiver.

**Input equivalence classes**

| EC ID | Input             | Equivalence class                                            | Valid / Invalid |
| ----- | ----------------- | ------------------------------------------------------------ | --------------- |
| J1    | Job posting       | OPEN job of another company, no pending proposal from me yet | Valid           |
| J2    | Job posting       | CLOSED job                                                   | Invalid         |
| J3    | Job posting       | I already have a PENDING proposal on it                      | Invalid         |
| M1    | Terms             | 1–10,000 characters                                          | Valid           |
| M2    | Terms             | Empty                                                        | Invalid         |
| B1    | Proposed budget   | Number > 0 (at most 9,999,999,999.99)                        | Valid           |
| B2    | Proposed budget   | Empty                                                        | Invalid         |
| B3    | Proposed budget   | ≤ 0                                                          | Invalid         |
| U1    | Duration (months) | 0.5–120, in steps of 0.5                                     | Valid           |
| U2    | Duration (months) | ≤ 0                                                          | Invalid         |
| U3    | Duration (months) | More than 120                                                | Invalid         |
| U4    | Duration (months) | Not a step of 0.5 (e.g. 1.3)                                 | Invalid         |

**Test cases** (logged in as the Provider account; the Receiver account owns one OPEN and one CLOSED `[e2e]` job)

Valid values used when a test case does not mention an input: job = the Receiver's OPEN job, terms = `[e2e] We can deliver in phases.`, budget = `45000`, duration = `2.5`.

| Test Case ID | Inputs                                   | Expected Outputs                                                                                                     | Actual Outputs                                                                                                           | Classes Covered |
| ------------ | ---------------------------------------- | -------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------ | --------------- |
| TC-2-18      | All valid values above                   | Proposal is sent; it shows as PENDING in "My Proposals"                                                              | Proposal is sent; it shows as PENDING in "My Proposals" (P)                                                              | J1, M1, B1, U1  |
| TC-2-19      | Job = the Receiver's CLOSED job          | The job has no "Add Proposal" button; sending a proposal anyway is refused with "This job is not open for proposals" | The job has no "Add Proposal" button; sending a proposal anyway is refused with "This job is not open for proposals" (P) | J2              |
| TC-2-20      | Same OPEN job again, right after TC-2-18 | "You already have a pending proposal on this job"                                                                    | "You already have a pending proposal on this job" (P)                                                                    | J3              |
| TC-2-21      | Terms = (empty)                          | "Proposal terms are required"                                                                                        | "Proposal terms are required" (P)                                                                                        | M2              |
| TC-2-22      | Budget = (empty)                         | "Proposal budget is required"                                                                                        | "Proposal budget is required" (P)                                                                                        | B2              |
| TC-2-23      | Budget = `0`                             | "Proposal budget must be greater than zero"                                                                          | "Proposal budget must be greater than zero" (P)                                                                          | B3              |
| TC-2-24      | Duration = `0`                           | "Duration must be greater than zero"                                                                                 | "Duration must be greater than zero" (P)                                                                                 | U2              |
| TC-2-25      | Duration = `121`                         | "Duration cannot exceed 120 months"                                                                                  | "Duration cannot exceed 120 months" (P)                                                                                  | U3              |
| TC-2-26      | Duration = `1.3`                         | "Duration must be in half-month increments (e.g. 0.5, 1, 1.5)"                                                       | "Duration must be in half-month increments (e.g. 0.5, 1, 1.5)" (P)                                                       | U4              |

#### US2-13 Edit a job posting

> As a Receiver, I want to edit my job posting so that its requirements stay accurate for Providers.

**Input equivalence classes**

| EC ID | Input       | Equivalence class                   | Valid / Invalid |
| ----- | ----------- | ----------------------------------- | --------------- |
| J1    | Job posting | My own job, status OPEN             | Valid           |
| J2    | Job posting | My own job, status CLOSED           | Invalid         |
| J3    | Job posting | Another company's job               | Invalid         |
| T1    | Title       | 1–255 characters                    | Valid           |
| T2    | Title       | Empty                               | Invalid         |
| B1    | Budget      | Max > 0; min empty or 0 ≤ min ≤ max | Valid           |
| B2    | Budget      | Min > max                           | Invalid         |
| L1    | Deadline    | Empty, or today or a future date    | Valid           |
| L2    | Deadline    | A past date                         | Invalid         |

**Test cases** (logged in as the Receiver account, which owns an OPEN `[e2e]` job and a CLOSED `[e2e]` job; the Both account owns another OPEN `[e2e]` job)

| Test Case ID | Inputs                                                                                                          | Expected Outputs                                                 | Actual Outputs                                                       | Classes Covered |
| ------------ | --------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------- | -------------------------------------------------------------------- | --------------- |
| TC-2-27      | Own OPEN job: title = `[e2e] Need a Mobile App v2`, min = `30000`, max = `90000`, deadline = `2026-12-31`; Save | Changes are saved; the job detail shows the new values           | Changes are saved; the job detail shows the new values (P)           | J1, T1, B1, L1  |
| TC-2-28      | Open the edit page of my own CLOSED job                                                                         | "Only open job postings can be edited."; no edit form            | "Only open job postings can be edited."; no edit form (P)            | J2              |
| TC-2-29      | Open the edit page of the Both account's OPEN job                                                               | "You are not authorized to edit this job posting."; no edit form | "You are not authorized to edit this job posting."; no edit form (P) | J3              |
| TC-2-30      | Own OPEN job: title = (empty); Save                                                                             | "Title is required"; nothing changes                             | "Title is required"; nothing changes (P)                             | T2              |
| TC-2-31      | Own OPEN job: min = `95000`, max = `90000`; Save                                                                | "Minimum budget cannot exceed maximum budget"                    | "Minimum budget cannot exceed maximum budget" (P)                    | B2              |
| TC-2-32      | Own OPEN job: deadline = `2026-01-01`; Save                                                                     | "Deadline cannot be in the past"                                 | "Deadline cannot be in the past" (P)                                 | L2              |

---

**How EPIC 2 was run:** automatically with Playwright (`apps/mangodb/e2e/epic2/`, one test per test case), against the local app (24 October 2026). Each test's name starts with its test case ID.

---

### 2.4 Test Coverage Matrix

| User Story ID | Test Cases ID     | Status                                            |
| ------------- | ----------------- | ------------------------------------------------- |
| US1-1         | TC-1-01 – TC-1-17 | P, P, P, P, P, P, P, P, P, P, P, P, P, P, P, P, P |
| US1-2         | TC-1-18 – TC-1-23 | P, P, P, P, P, P                                  |
| US1-5         | TC-1-24 – TC-1-31 | P, P, P, P, P, P, P, P                            |
| US1-7         | TC-1-32 – TC-1-39 | P, P, P, P, N/A, P, P, P                          |
| US2-1         | TC-2-01 – TC-2-10 | P, P, P, P, P, P, P, P, P, P                      |
| US2-6         | TC-2-11 – TC-2-17 | P, P, P, P, P, P, P                               |
| US2-8         | TC-2-18 – TC-2-26 | P, P, P, P, P, P, P, P, P                         |
| US2-13        | TC-2-27 – TC-2-32 | P, P, P, P, P, P                                  |

Total: 71 test cases (39 for EPIC 1, 32 for EPIC 2). Passed: 70. Failed: 0. Not executable: 1 (TC-1-36).
