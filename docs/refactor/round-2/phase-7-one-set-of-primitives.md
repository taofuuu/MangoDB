# Phase 7 — Frontend: one set of primitives

**Status: the structural part is done.** Folders, names, modals, the shared
pieces and the merges have landed, and the snapshot diff is empty (the API was
not touched). The per-page sweep of the remaining raw `<button>` and `<input>`
elements trails, as the plan allows; the numbers are under What is left.

## Folders and names

| Was                                                                              | Now                                                                                                  |
| -------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------- |
| `service/` and `searchservices/`                                                 | `services/`                                                                                          |
| `viewprofile/` and `profile/`                                                    | `profile/`                                                                                           |
| `job/`, `portfolio/`, `proposals/view/`                                          | `jobs/`, `portfolios/`, `proposals/`                                                                 |
| `forms/` and `sm-detail/`                                                        | the feature that uses each file; `FileUpload` in `ui/`                                               |
| feature modals in `ui/` (delete account, logout, delete portfolio, admin delete) | their feature folders                                                                                |
| `Companycard`, `Decorate`, `AccountStep`, `JobBox`, `PortfolioList`              | `ProviderCompanyCard`, `DecorativePattern`, `AccountInfoStep`, `JobCard`, `PortfolioCertificateList` |
| `ProposalCard`, `ProposalDetail` (received)                                      | `ReceivedProposalCard`, `ReceivedProposalDetail`, after the shared type                              |
| named exports and `React.FC`                                                     | one default export per file, named after it                                                          |

## One of each

| Was                                                                                                                                     | Now                                                                   |
| --------------------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------- |
| `DeleteConfirmationModal`, `AcceptProposalModal`, `RejectProposalModal`                                                                 | `ui/ConfirmModal`                                                     |
| `services/SuccessModal` and the inline Account Deleted dialog                                                                           | `ui/SuccessModal`                                                     |
| `CompanyDetailModal`, `EditAccountModal`, the account-settings dialog on their own overlay code                                         | all on `ModalShell`                                                   |
| 7 hand-written pick-one lists (`CompanyOrderDropdown`, services order, admin filter, certificate month and year, the two `/jobs` boxes) | `ui/Dropdown`                                                         |
| 4 keyword boxes, 3 with their own debounce                                                                                              | `ui/SearchBar`                                                        |
| 4 `EmptyState` copies and 7 inline empty messages                                                                                       | `ui/EmptyState`                                                       |
| `ProposalStatusBadge` styles, coloured "Accepted" / "Rejected" text                                                                     | `ui/StatusBadge`; `ProposalStatusBadge` maps statuses onto its tones  |
| 3 status filters (Your Proposals, My Jobs, received proposals)                                                                          | `ui/StatusTabs`                                                       |
| `TextField`, `SimpleTextInput`                                                                                                          | `ui/Input`; the login card keeps its own sizes with `variant="login"` |

## Merged

| Was                                                                                             | Now                                                                  |
| ----------------------------------------------------------------------------------------------- | -------------------------------------------------------------------- |
| `ServiceDetailPanel` + `OtherCompanyServiceDetailPanel` + `OtherCompanyPortfolioCard`           | `ServiceDetailPanel`                                                 |
| `JobDetailModal`'s own copy of the job detail                                                   | `JobDetailModal` is `ModalShell` + `JobDetailPanel`                  |
| `AddPortfolioModal` + `EditPortfolioForm`                                                       | `PortfolioForm` with `mode`                                          |
| `AddCertificateForm` + `EditCertificateForm`, and the page's `CertificateData` copy of each row | `CertificateForm` over the API's `Certificate`                       |
| `ServiceForm`, 941 lines with hardcoded category ids                                            | 751 lines, `listCategories()`, `TechStackInput`, `ServicePortfolios` |

**Kept two on purpose:** the company card and the company detail. The admin
grid card and modal show account data with admin actions; the search card and
panel show the public profile. Different designs over different data. What
they did duplicate, the Provider and Receiver chips, now comes from
`RoleTags`.

The service card went back to two after the PR review: the search results
show initials on a yellow disc and the company name (`ServiceCard`), and a
company's own services page shows a briefcase and leaves the name to the page
title (`CompanyServiceCard`). Two designs, so two cards.

## Real bugs found

1. **One bad photo URL took down the received-proposals page.** The card and
   detail passed `companyPhoto` straight to `next/image`, which throws for a
   host it was not told about, and asked for a 50vw image for a 48px circle.
   They use `CompanyAvatar` now.
2. **Accept and reject failures were `alert()`s.** They show inside the
   dialog.
3. **The certificate edit form used a bare `<img>`** for the current image.
4. **Two modals had no focus trap**, so Tab walked out of them into the page
   (`CompanyDetailModal`, `EditAccountModal`).
5. **Most dropdowns had no keyboard support.** The certificate month and year
   lists did not even close on a click outside.
6. **Two more dates and amounts went around `lib/`:** the job detail panel
   printed its deadline as `2027-01-19`, and the proposal receipt formatted
   money and months by hand.
7. **Nothing linked to a job's received proposals.** My Jobs cards now have a
   Proposals button.

## Decisions Toa made for this phase

1. The received-proposals link is a Proposals button on every My Jobs card,
   for every status.
2. The `/jobs` filter and order controls stay, although they reach no API.
   They are recorded below for Sprint 3.
3. The visual changes were approved from screenshots before the merges.

## Rules this phase leaves behind

1. **A component lives in the folder of its API noun**, `ui/` only when it
   knows no resource. One default export per file, named after it.
2. **A dialog sits on `ModalShell`.** A question is `ConfirmModal`, a result
   is `SuccessModal`.
3. **A pick-one box is `Dropdown`, a keyword box is `SearchBar`, an empty list
   is `EmptyState`, a status is `StatusBadge`, a status filter is
   `StatusTabs`.** A feature maps its own values onto them, as
   `ProposalStatusBadge` does; Sprint 3's project statuses go the same way.
4. **Add and edit are one form with a mode**, mounted only while open.
5. **A component takes the API's type**, not a form-shaped copy of it.

## What is left

- **The sweep.** Outside `ui/` there are still 90 `<button>`, 31 `<input>`,
  3 `<textarea>` and 3 `<select>` elements (124, 42, 4 and 6 before). They
  move to `ui/*` one page at a time, with the page open.
- **`/jobs` filters reach no API.** Category, budget, deadline and order are
  read only on screen. Sprint 3: give `GET /jobs` the filters `GET /services`
  has, then send them.
- **There is no Edit link for your own services.** The only way to
  `/services/[id]/edit` is the temporary `/dev/services/edit` picker, so it
  stays. Where the link goes is a design call for Toa.
- A portfolio item is drawn twice: `PortfolioCard` on the portfolio pages and
  an inline row in `ServiceDetailPanel`.
- Hex colours and Tailwind palette classes are Phase 8's.
