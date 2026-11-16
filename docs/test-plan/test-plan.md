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

| EPIC                                                | User stories               | How the test cases are run               |
| --------------------------------------------------- | -------------------------- | ---------------------------------------- |
| EPIC 1 — Account and Company Information Management | US1-1, US1-2, US1-5, US1-7 | Manual black-box testing                 |
| EPIC 2 — Service and Job Posting Management         | US2-1, US2-6, US2-7, US2-8 | Automated black-box testing (Playwright) |

Method (input equivalence class partitioning):

1. Each input of a user story is split into **equivalence classes (ECs)**. All values inside one class should give the same kind of result.
2. Each EC is **Valid** or **Invalid**. Each EC ID has a letter for its input, plus a number (for example `E1`, `E2`).
3. **One valid test case** covers all the valid ECs together. Each **invalid test case** covers **one** invalid EC, and every other input in it is valid. So when an invalid test case fails, we know which input caused it.
4. Every EC is covered by at least one test case.

The test system is the MangoDB web app (Next.js frontend + Express API) running locally against the team's test database. "Actual Outputs" is filled in after each test case is run. **P** = actual matches expected, **F** = it does not.

Shared preconditions:

- **Provider account** — a company with account type PROVIDER that owns at least one service.
- **Receiver account** — a company with account type RECEIVER.
- **Both account** — a company with account type BOTH (US2-6 TC-2-32, US2-8 TC-2-59).
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

This section is copied from the final test plan (Google Doc, "final" tab). Each test case has one Playwright test whose name starts with its test case ID.

#### US2-1 Create a service listing

> As a Provider, I want to create a service listing so that I can present my expertise and estimates to Receivers.

**Input equivalence classes**

| EC ID | Input                                                     | Valid / Invalid                                                              |
| ----- | --------------------------------------------------------- | ---------------------------------------------------------------------------- |
| 1     | Account type is Provider or Both                          | Valid                                                                        |
| 2     | Account type is Receiver                                  | Invalid; "You need a Provider account to create or manage service listings." |
| 3     | Service title is 1–255 characters                         | Valid                                                                        |
| 4     | Service title is empty                                    | Invalid; "Title is required"                                                 |
| 5     | Service description is 1–10,000 characters                | Valid                                                                        |
| 6     | Service description is empty                              | Invalid; "Description is required"                                           |
| 7     | 1–10 service categories are selected                      | Valid                                                                        |
| 8     | No service category is selected                           | Invalid; "Select at least one category."                                     |
| 9     | 1–20 tech stack items are added                           | Valid                                                                        |
| 10    | No tech stack item is added                               | Invalid; "At least one tech stack item is required."                         |
| 11    | Minimum budget is a whole number ≥ 0 (e.g. min = 10000)   | Valid                                                                        |
| 12    | Minimum budget is negative (min < 0)                      | Invalid; "Minimum budget cannot be negative"                                 |
| 13    | Minimum budget exceeds maximum budget (min > max)         | Invalid; "Minimum budget cannot exceed maximum budget"                       |
| 14    | Maximum budget is zero (max = 0)                          | Invalid; "Maximum budget must be greater than zero"                          |
| 15    | Minimum budget is not a whole number (e.g. min = 100.5)   | Invalid; "Minimum budget must be an integer"                                 |
| 16    | Service title is more than 255 characters                 | Invalid; "Title cannot exceed 255 characters"                                |
| 17    | Service description is more than 10,000 characters        | Invalid; "Description cannot exceed 10000 characters"                        |
| 18    | More than 10 service categories are selected              | Invalid; "Cannot select more than 10 categories"                             |
| 19    | More than 20 tech stack items are added                   | Invalid; "You can select at most 20 tech stack items."                       |
| 20    | Minimum budget is empty (not specified)                   | Valid                                                                        |
| 21    | Maximum budget is not a whole number (e.g. max = 500.5)   | Invalid; "Maximum budget must be an integer"                                 |
| 22    | Maximum budget is a whole number > 0 (e.g. max = 50000)   | Valid                                                                        |
| 23    | Maximum budget is empty (not specified)                   | Valid                                                                        |
| 24    | Minimum budget does not exceed maximum budget (min ≤ max) | Valid                                                                        |

**Test cases**

- The user is logged in as the Provider account and opens the "Add My Service" page (/services/create), unless the test case states otherwise.
- Valid values used when a test case does not mention an input: Title = [e2e] Web App Service, Description = We build web apps., Service Category = the first category chip, Tech Stack = React, Minimum Budget = 10000, Maximum Budget = <empty>.
- After the test run, the [e2e] service created in TC-2-01 is deleted.

| Test Case ID | Inputs                                                                                                                                                                                                                                                                                          | Expected Outputs                                                                                                                                                                                                                                                                                                                  | Actual Outputs  | Classes Covered           |
| ------------ | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | --------------- | ------------------------- |
| TC-2-01      | Log in as the Provider account. Open "Add My Service" (/services/create). Enter all valid values above (Title = [e2e] Web App Service, Description = We build web apps., select the first Category, Tech Stack = React, Minimum Budget = 10000, Maximum Budget = <empty>). Click "Add Service". | A "Service added successfully" popup appears. Opening "My Services" (/services/mine) lists [e2e] Web App Service with all details matching the entered inputs (Title = [e2e] Web App Service, Description = We build web apps., selected Service Category, Tech Stack = React, Minimum Budget = 10000, Maximum Budget = <empty>). | As expected (P) | 1, 3, 5, 7, 9, 11, 22, 24 |
| TC-2-02      | Log in as the Receiver account. Open /services/create.                                                                                                                                                                                                                                          | An access restricted message appears with "You need a Provider account to create or manage service listings." No service creation form or "Add Service" button is shown.                                                                                                                                                          | As expected (P) | 2                         |
| TC-2-03      | Title = <empty>. Fill all other fields with the valid values. Click "Add Service".                                                                                                                                                                                                              | The service is not created. The form shows the error message "Title is required".                                                                                                                                                                                                                                                 | As expected (P) | 1, 4, 5, 7, 9, 11         |
| TC-2-04      | Description = <empty>. Fill all other fields with the valid values. Click "Add Service".                                                                                                                                                                                                        | The service is not created. The form shows the error message "Description is required".                                                                                                                                                                                                                                           | As expected (P) | 1, 3, 6, 7, 9, 11         |
| TC-2-05      | Do not select any Service Category. Fill all other fields with the valid values. Click "Add Service".                                                                                                                                                                                           | The service is not created. The form shows the error message "Select at least one category."                                                                                                                                                                                                                                      | As expected (P) | 1, 3, 5, 8, 9, 11         |
| TC-2-06      | Minimum Budget = -1, Maximum Budget = 50000. Fill all other fields with the valid values. Click "Add Service".                                                                                                                                                                                  | The service is not created. The form shows the error message "Minimum budget cannot be negative".                                                                                                                                                                                                                                 | As expected (P) | 1, 3, 5, 7, 9, 12         |
| TC-2-07      | Minimum Budget = 60000, Maximum Budget = 50000. Fill all other fields with the valid values. Click "Add Service".                                                                                                                                                                               | The service is not created. The form shows the error message "Minimum budget cannot exceed maximum budget".                                                                                                                                                                                                                       | As expected (P) | 1, 3, 5, 7, 9, 13         |
| TC-2-08      | Minimum Budget = <empty>, Maximum Budget = 0. Fill all other fields with the valid values. Click "Add Service".                                                                                                                                                                                 | The service is not created. The form shows the error message "Maximum budget must be greater than zero".                                                                                                                                                                                                                          | As expected (P) | 1, 3, 5, 7, 9, 14         |
| TC-2-09      | Minimum Budget = 100.5, Maximum Budget = 50000. Fill all other fields with the valid values. Click "Add Service".                                                                                                                                                                               | The service is not created. The form shows the error message "Minimum budget must be an integer".                                                                                                                                                                                                                                 | As expected (P) | 1, 3, 5, 7, 9, 15         |
| TC-2-10      | Do not add any Tech Stack item. Fill all other fields with the valid values. Click "Add Service".                                                                                                                                                                                               | The service is not created. The form shows the error message "At least one tech stack item is required."                                                                                                                                                                                                                          | As expected (P) | 1, 3, 5, 7, 10, 11        |
| TC-2-11      | Title = a 256-character string (exceeds 255 characters). Fill all other fields with the valid values. Click "Add Service".                                                                                                                                                                      | The service is not created. The form shows the error message "Title cannot exceed 255 characters".                                                                                                                                                                                                                                | As expected (P) | 1, 5, 7, 9, 11, 16        |
| TC-2-12      | Description = a 10,001-character string (exceeds 10,000 characters). Fill all other fields with the valid values. Click "Add Service".                                                                                                                                                          | The service is not created. The form shows the error message "Description cannot exceed 10000 characters".                                                                                                                                                                                                                        | As expected (P) | 1, 3, 7, 9, 11, 17        |
| TC-2-13      | Select 11 Service Categories (more than 10 categories). Fill all other fields with the valid values. Click "Add Service".                                                                                                                                                                       | The service is not created. The form shows the error message "Cannot select more than 10 categories".                                                                                                                                                                                                                             | As expected (P) | 1, 3, 5, 9, 11, 18        |
| TC-2-14      | Add 20 Tech Stack items (T1–T20), then type a 21st Tech Stack item (T21) and press Enter.                                                                                                                                                                                                       | The 21st item is not added. The form shows the error message "You can select at most 20 tech stack items."                                                                                                                                                                                                                        | As expected (P) | 1, 3, 5, 7, 11, 19        |
| TC-2-15      | Minimum Budget = 10000, Maximum Budget = <empty>. Fill all other fields with the valid values. Click "Add Service".                                                                                                                                                                             | A "Service added successfully" popup appears. Opening "My Services" (/services/mine) lists [e2e] Web App Service with all details matching the entered inputs (Title = [e2e] Web App Service, Description = We build web apps., selected Service Category, Tech Stack = React, Minimum Budget = 10000, Maximum Budget = <empty>). | As expected (P) | 1, 3, 5, 7, 9, 11, 23     |
| TC-2-16      | Minimum Budget = 100, Maximum Budget = 500.5. Fill all other fields with the valid values. Click "Add Service".                                                                                                                                                                                 | The service is not created. The form shows the error message "Maximum budget must be an integer".                                                                                                                                                                                                                                 | As expected (P) | 1, 3, 5, 7, 9, 21         |
| TC-2-17      | Minimum Budget = <empty>, Maximum Budget = <empty>. Fill all other fields with the valid values. Click "Add Service".                                                                                                                                                                           | A "Service added successfully" popup appears. Opening "My Services" (/services/mine) lists [e2e] Web App Service with all details matching the entered inputs (Title = [e2e] Web App Service, Description = We build web apps., selected Service Category, Tech Stack = React, Minimum Budget = 10000, Maximum Budget = <empty>). | As expected (P) | 1, 3, 5, 7, 9, 20, 23     |
| TC-2-18      | Minimum Budget = <empty>, Maximum Budget = 50000. Fill all other fields with the valid values. Click "Add Service".                                                                                                                                                                             | A "Service added successfully" popup appears. Opening "My Services" (/services/mine) lists [e2e] Web App Service with all details matching the entered inputs (Title = [e2e] Web App Service, Description = We build web apps., selected Service Category, Tech Stack = React, Minimum Budget = 10000, Maximum Budget = <empty>). | As expected (P) | 1, 3, 5, 7, 9, 20, 22     |

#### US2-6 Create and publish a job posting

> As a Receiver, I want to create and publish a job posting so that I can receive proposals from suitable Providers.

**Input equivalence classes**

| EC ID | Input                                                                          | Valid / Invalid                                       |
| ----- | ------------------------------------------------------------------------------ | ----------------------------------------------------- |
| 1     | Account type is Receiver or Both                                               | Valid                                                 |
| 2     | Account type is Provider                                                       | Invalid                                               |
| 3     | Job title is 1–255 characters                                                  | Valid                                                 |
| 4     | Job title is empty                                                             | Invalid                                               |
| 5     | Job description is 1–10,000 characters                                         | Valid                                                 |
| 6     | Job description is empty                                                       | Invalid                                               |
| 7     | Maximum budget is a whole number > 0; minimum budget is empty or 0 ≤ min ≤ max | Valid                                                 |
| 8     | Maximum budget is empty                                                        | Invalid                                               |
| 9     | Minimum budget exceeds maximum budget (min > max)                              | Invalid                                               |
| 10    | Deadline is empty, or today or a future date                                   | Valid                                                 |
| 11    | Deadline is a past date                                                        | Invalid                                               |
| 12    | Job title is more than 255 characters                                          | Invalid; "Title cannot exceed 255 characters"         |
| 13    | Job description is more than 10,000 characters                                 | Invalid; "Description cannot exceed 10000 characters" |
| 14    | Maximum budget is zero (max = 0)                                               | Invalid; "Maximum budget must be greater than zero"   |
| 15    | Minimum budget is negative (min < 0)                                           | Invalid; "Minimum budget cannot be negative"          |
| 16    | Budget is not a whole number (e.g. min = 100.5)                                | Invalid; "Minimum budget must be an integer"          |
| 17    | Maximum budget is negative (max < 0)                                           | Invalid; "Maximum budget must be greater than zero"   |
| 18    | Duration is not negative (e.g. "3 months")                                     | Valid                                                 |
| 19    | Duration is negative (e.g. "-2 months")                                        | Invalid; "Duration cannot be negative"                |

**Test cases**

- The user is logged in as the Receiver account and opens the "Post a Job" page (/jobs/create), unless the test case states otherwise.
- Valid values used when a test case does not mention an input: Title = [e2e] Need a Mobile App, Description = iOS and Android app., Minimum Budget = 20000, Maximum Budget = 80000, Deadline = 2026-12-31, Duration = 3 months.
- After the test run, the [e2e] jobs created in TC-2-19, TC-2-31 and TC-2-32 are deleted.

| Test Case ID | Inputs                                                                                                                                                                                                                                                         | Expected Outputs                                                                                                                                                          | Actual Outputs  | Classes Covered     |
| ------------ | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | --------------- | ------------------- |
| TC-2-19      | Log in as the Receiver account. Open "Post a Job" (/jobs/create). Enter all valid values above (Title = [e2e] Need a Mobile App, Description = iOS and Android app., Minimum Budget = 20000, Maximum Budget = 80000, Deadline = 2026-12-31). Click "Post Job". | Job is published as OPEN and shows in "My Jobs". Opening "My Jobs" (/jobs/mine) lists [e2e] Need a Mobile App.                                                            | As expected (P) | 1, 3, 5, 7, 10      |
| TC-2-20      | Log in as the Provider account. Open /jobs/create.                                                                                                                                                                                                             | An access restricted message appears with "You need a Receiver account to create job postings." No job creation form or "Post Job" button is shown.                       | As expected (P) | 2                   |
| TC-2-21      | Title = <empty>. Fill all other fields with the valid values. Click "Post Job".                                                                                                                                                                                | The job is not created. The form shows the error message "Title is required".                                                                                             | As expected (P) | 1, 4, 5, 7, 10      |
| TC-2-22      | Description = <empty>. Fill all other fields with the valid values. Click "Post Job".                                                                                                                                                                          | The job is not created. The form shows the error message "Description is required".                                                                                       | As expected (P) | 1, 3, 6, 7, 10      |
| TC-2-23      | Maximum Budget = <empty>. Fill all other fields with the valid values. Click "Post Job".                                                                                                                                                                       | The job is not created. The form shows the error message "Maximum budget is required".                                                                                    | As expected (P) | 1, 3, 5, 8, 10      |
| TC-2-24      | Minimum Budget = 90000, Maximum Budget = 80000. Fill all other fields with the valid values. Click "Post Job".                                                                                                                                                 | The job is not created. The form shows the error message "Minimum budget cannot exceed maximum budget".                                                                   | As expected (P) | 1, 3, 5, 9, 10      |
| TC-2-25      | Deadline = 2026-01-01 (past date). Fill all other fields with the valid values. Click "Post Job".                                                                                                                                                              | The job is not created. The form shows the error message "Deadline cannot be in the past".                                                                                | As expected (P) | 1, 3, 5, 7, 11      |
| TC-2-26      | Title = 256 characters (exceeds 255). Fill all other fields with the valid values. Click "Post Job".                                                                                                                                                           | The job is not created. The form shows the error message "Title cannot exceed 255 characters".                                                                            | As expected (P) | 1, 12, 5, 7, 10     |
| TC-2-27      | Description = 10,001 characters (exceeds 10,000). Fill all other fields with the valid values. Click "Post Job".                                                                                                                                               | The job is not created. The form shows the error message "Description cannot exceed 10000 characters".                                                                    | As expected (P) | 1, 3, 13, 7, 10     |
| TC-2-28      | Maximum Budget = 0. Fill all other fields with the valid values. Click "Post Job".                                                                                                                                                                             | The job is not created. The form shows the error message "Maximum budget must be greater than zero".                                                                      | As expected (P) | 1, 3, 5, 14, 10     |
| TC-2-29      | Minimum Budget = -1. Fill all other fields with the valid values. Click "Post Job".                                                                                                                                                                            | The job is not created. The form shows the error message "Minimum budget cannot be negative".                                                                             | As expected (P) | 1, 3, 5, 15, 10     |
| TC-2-30      | Minimum Budget = 100.5. Fill all other fields with the valid values. Click "Post Job".                                                                                                                                                                         | The job is not created. The form shows the error message "Minimum budget must be an integer".                                                                             | As expected (P) | 1, 3, 5, 16, 10     |
| TC-2-31      | Deadline = today's date. Fill all other fields with the valid values above (Title = [e2e] Need a Mobile App, Description = iOS and Android app., Minimum Budget = 20000, Maximum Budget = 80000). Click "Post Job".                                            | Job is published as OPEN and shows in "My Jobs". Opening "My Jobs" (/jobs/mine) lists [e2e] Need a Mobile App.                                                            | As expected (P) | 1, 3, 5, 7, 10      |
| TC-2-32      | Log in as the Both account. Open "Post a Job" (/jobs/create). Enter all valid values above (Title = [e2e] Need a Mobile App, Description = iOS and Android app., Minimum Budget = 20000, Maximum Budget = 80000, Deadline = 2026-12-31). Click "Post Job".     | The job creation form is accessible to the Both accounts . Job is published as OPEN and shows in "My Jobs". Opening "My Jobs" (/jobs/mine) lists [e2e] Need a Mobile App. | As expected (P) | 1, 3, 5, 7, 10      |
| TC-2-33      | Maximum Budget = -1. Fill all other fields with the valid values. Click "Post Job".                                                                                                                                                                            | The job is not created. The form shows the error message "Maximum budget must be greater than zero".                                                                      | As expected (P) | 1, 3, 5, 17, 10, 18 |
| TC-2-34      | Duration = -2 months. Fill all other fields with the valid values. Click "Post Job".                                                                                                                                                                           | The job is not created. The form shows the error message "Duration cannot be negative".                                                                                   | As expected (P) | 1, 3, 5, 7, 10, 19  |

#### US2-7 View another company's listings

> As a Company, I want to view another company's listings so that I can see what it offers or what work it needs.

**Input equivalence classes**
**Test cases**

- The Receiver creates tagged OPEN and CLOSED jobs during setup.
- The Provider creates one tagged OPEN service during setup.
- Temporary BOTH accounts are used for the empty-profile and deleted-owner cases.

| Test Case ID | Inputs                                                                                                                                                             | Expected Outputs                                                                                                                         | Actual Outputs  | Classes Covered |
| ------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------ | ---------------------------------------------------------------------------------------------------------------------------------------- | --------------- | --------------- |
| TC-2-35      | Open Search Jobs while logged out.                                                                                                                                 | The app redirects to the unauthorized access / login-required page.                                                                      | As expected (P) | 2               |
| TC-2-36      | Log in as Provider. Open Search Jobs.                                                                                                                              | The Receiver’s tagged OPEN job card is displayed.                                                                                        | As expected (P) | 1, 6            |
| TC-2-37      | Log in as Provider. Open Search Jobs.                                                                                                                              | The Receiver’s tagged CLOSED job card is not displayed.                                                                                  | As expected (P) | 1, 7            |
| TC-2-38      | Log in as Provider. Open Search Jobs and select View Detail on the tagged OPEN job.                                                                                | The job detail panel shows the tagged OPEN job and its Receiver owner.                                                                   | As expected (P) | 1, 6            |
| TC-2-39      | Log in as the Provider account. Open the Receiver account’s tagged CLOSED job directly using its saved URL (/jobs/<closedJobId>).                                  | The tagged CLOSED job cannot be opened from the public Jobs page because it is not displayed.                                            | As expected (P) | 1, 7            |
| TC-2-40      | Log in as Receiver. Open My Jobs and select the CLOSED filter.                                                                                                     | The Receiver’s tagged CLOSED job card is displayed.                                                                                      | As expected (P) | 1, 9            |
| TC-2-41      | Log in as Receiver. Open the Provider public profile.                                                                                                              | The public profile shows the Provider’s company information (name, description, contact details) and no private account settings.        | As expected (P) | 1, 3            |
| TC-2-42      | Log in as Provider. Open an unknown company profile URL.                                                                                                           | The page shows the company not-found message.                                                                                            | As expected (P) | 1, 4            |
| TC-2-43      | Log in as the Receiver account. Open the Provider account’s public profile (/companies/<id>) and select the “Services” tab.                                        | The Provider account’s tagged OPEN service card is displayed. No edit controls are shown.                                                | As expected (P) | 1, 5            |
| TC-2-44      | Log in as Receiver. Open the Provider public profile and select its service.                                                                                       | The service detail shows its Provider; no edit control is available.                                                                     | As expected (P) | 1, 3, 5         |
| TC-2-45      | Log in as the Provider account. Open the Receiver account’s public profile (/companies/<id>). Open "Job Listing", then click "Details" on the tagged OPEN job.     | Only the tagged OPEN job is displayed; its detail shows the Receiver and no edit control.                                                | As expected (P) | 1, 3, 6, 7      |
| TC-2-46      | Log in as Provider. Open a temporary BOTH company profile with no OPEN listings.                                                                                   | The Services and Job Listing tabs show their empty-state messages.                                                                       | As expected (P) | 1, 8            |
| TC-2-47      | Delete a temporary BOTH account that owns an OPEN job and service. Log in as the Provider account and open the deleted account’s public profile (/companies/<id>). | The page shows "This company could not be found. It may have deleted its account." The deleted account’s job and service are not listed. | As expected (P) | 1, 10           |
| TC-2-48      | Log in as another company account. Open a known CLOSED service owner’s public profile, then attempt to open the CLOSED service.                                    | The CLOSED service is not listed in "Services". Its details cannot be opened.                                                            | As expected (P) | 1, 11           |

#### US2-8 Submit a proposal to an open job posting

> As a Provider, I want to submit a proposal to an open job posting so that I can offer my service, estimated price, and delivery duration to the Receiver.

**Input equivalence classes**
**Test cases**

- The Receiver account creates one [e2e] OPEN job and one [e2e] CLOSED job during automated setup.
- The Provider account [Both account] belongs to a different company from the Receiver account and owns one [e2e] OPEN job.
- The black-box boundary is the Next.js web application UI (/jobs with modal selectors #proposal-terms, #proposal-budget, #proposal-estimated-duration-months) and the backend API (POST /api/jobs/:jobId/proposals).
- Default valid values used when an input is not specified: Account = Provider, Job = Receiver's OPEN job, Terms = [e2e] We can deliver in phases., Budget = 45000, Duration = 2.5.

| Test Case ID | Inputs                                                                                                                                                                            | Expected Outputs                                                                                                                                                                                                | Actual Outputs  | Classes Covered |
| ------------ | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | --------------- | --------------- |
| TC-2-49      | Log in as the Provider account. Open Receiver's OPEN job. Click "Add Proposal", fill terms = [e2e] We can deliver in phases., budget = 45000, duration = 2.5, and click "Submit". | "Proposal submitted" notification appears; proposal is sent and shows as PENDING in "My Proposals".                                                                                                             | As expected (P) | 1, 3, 7, 10, 14 |
| TC-2-50      | Log in as the Provider account. Search for and view Receiver's CLOSED job. Attempt to submit a proposal via API to POST /api/jobs/:closedJobId/proposals.                         | The Receiver's CLOSED job is not shown in the search results (no job card appears / cannot be opened); sending a proposal directly via API returns HTTP 409 Conflict with "This job is not open for proposals". | As expected (P) | 4               |
| TC-2-51      | Log in as the Provider account. View the same Receiver's OPEN job immediately after TC-2-49 and attempt to submit a second proposal with valid inputs.                            | Error message "You already have a pending proposal on this job" is displayed; no duplicate proposal is created.                                                                                                 | As expected (P) | 5               |
| TC-2-52      | Log in as the Provider account. Open Receiver's OPEN job. Fill terms = (empty), budget = 45000, duration = 2.5, and click "Submit".                                               | Error message "Proposal terms are required" is displayed; form submission is prevented.                                                                                                                         | As expected (P) | 8               |
| TC-2-53      | Log in as the Provider account. Open Receiver's OPEN job. Fill terms = [e2e] Valid terms, budget = (empty), duration = 2.5, and click "Submit".                                   | Error message "Proposal budget is required" is displayed; form submission is prevented.                                                                                                                         | As expected (P) | 11              |
| TC-2-54      | Log in as the Provider account. Open Receiver's OPEN job. Fill terms = [e2e] Valid terms, budget = 0, duration = 2.5, and click "Submit".                                         | Error message "Proposal budget must be greater than zero" is displayed; form submission is prevented.                                                                                                           | As expected (P) | 12              |
| TC-2-55      | Log in as the Provider account. Open Receiver's OPEN job. Fill terms = [e2e] Valid terms, budget = 45000, duration = 0, and click "Submit".                                       | Error message "Duration must be greater than zero" is displayed; form submission is prevented.                                                                                                                  | As expected (P) | 15              |
| TC-2-56      | Log in as the Provider account. Open Receiver's OPEN job. Fill terms = [e2e] Valid terms, budget = 45000, duration = 121, and click "Submit".                                     | Error message "Duration cannot exceed 120 months" is displayed; form submission is prevented.                                                                                                                   | As expected (P) | 16              |
| TC-2-57      | Log in as the Provider account. Open Receiver's OPEN job. Fill terms = [e2e] Valid terms, budget = 45000, duration = 1.3, and click "Submit".                                     | Error message "Duration must be in half-month increments (e.g. 0.5, 1, 1.5)" is displayed; form submission is prevented.                                                                                        | As expected (P) | 17              |
| TC-2-58      | Log in as the Receiver account. Search for and open an OPEN job. Attempt to submit a proposal via API to POST /api/jobs/:openJobId/proposals.                                     | The job detail panel does not display the "Add Proposal" button; sending a proposal directly to the API returns HTTP 403 Forbidden.                                                                             | As expected (P) | 2               |
| TC-2-59      | Log in as the Provider account. Open the Provider's own OPEN job posting. Attempt to submit a proposal via API to POST /api/jobs/:ownJobId/proposals.                             | The job detail panel does not display the "Add Proposal" button; sending a proposal directly to the API returns HTTP 403 Forbidden with "You cannot send a proposal to your own job".                           | As expected (P) | 6               |
| TC-2-60      | Log in as the Provider account. Open Receiver's OPEN job. Fill terms = [e2e] Valid terms, budget = 45000, duration = (empty), and click "Submit".                                 | Error message "Duration is required" is displayed; form submission is prevented.                                                                                                                                | As expected (P) | 18              |

---

**How EPIC 2 was run:** automatically with Playwright (`apps/mangodb/e2e/epic2/`, one file per user story, one test per test case), against the local app. The full suite was run on 16 November 2026, and all 60 test cases passed. TC-2-13 sends 11 categories to the API, because the form has only 9 categories to pick. TC-2-48 uses a CLOSED service that already exists in the database, because the app has no way to close a service.

---

### 2.4 Test Coverage Matrix

| User Story ID | Test Cases ID     | Status                                            |
| ------------- | ----------------- | ------------------------------------------------- |
| US1-1         | TC-1-01 – TC-1-17 | P, P, P, P, P, P, P, P, P, P, P, P, P, P, P, P, P |
| US1-2         | TC-1-18 – TC-1-23 | P, P, P, P, P, P                                  |
| US1-5         | TC-1-24 – TC-1-31 | P, P, P, P, P, P, P, P                            |
| US1-7         | TC-1-32 – TC-1-39 | P, P, P, P, N/A, P, P, P                          |
| US2-1         | TC-2-01 – TC-2-18 | P × 18                                            |
| US2-6         | TC-2-19 – TC-2-34 | P × 16                                            |
| US2-7         | TC-2-35 – TC-2-48 | P × 14                                            |
| US2-8         | TC-2-49 – TC-2-60 | P × 12                                            |

Total: 99 test cases (39 for EPIC 1, 60 for EPIC 2). Passed: 98. Failed: 0. Not executable: 1 (TC-1-36).
