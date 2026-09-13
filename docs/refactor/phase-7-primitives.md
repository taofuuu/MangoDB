# Phase 7 — Frontend: one set of primitives

**Status: partly done.** The components are consolidated and the bugs in them
are fixed. Converting the remaining raw `<button>` and `<input>` elements to use
them is **not** done — see "What is left" below.

Snapshot diff empty: nothing here touches the API.

## Why this phase exists

Sprint 2's 34 frontend tasks are: 3 forms with validation and a result banner, 3
list views with cards and empty states, 2 confirmation modals, a prefilled edit
form, a filter panel and a sort control. **Every one is a copy of something that
already exists here.** If there are seven modal shells when those tasks start,
there will be ten when they finish.

## What got merged

| Was                                        | Now                                 |
| ------------------------------------------ | ----------------------------------- |
| 7 modal shells, 3 with no lifecycle at all | `ui/ModalShell`, adopted by 4       |
| 2 Button components                        | `ui/Button` with `isLoading`        |
| 2 file uploads, one validating             | `sm-detail/FileUpload`, validating  |
| 4 `alert()` calls                          | an error line like every other form |

## Three real bugs, not tidying

**Escape did nothing on three modals.** `AddCertificateForm`,
`EditCertificateForm` and `EditPortfolioForm` had no `useEffect` around the
overlay: no Escape, no scroll lock, no focus restore. The page behind kept
scrolling, and closing the dialog dropped focus to the top of the document.

**None of the seven trapped focus.** Tab past the last control walked straight
out of the dialog into the page underneath, which the user cannot see and cannot
be sure they are not typing into.

**`MonthDropdown`'s option buttons had no `type`.** A `<button>` inside a form
defaults to `type="submit"`, so picking a month submitted the form around it.
`YearDropdown`, in the same folder, sets `type="button"` — the two had opposite
behaviour and looked identical.

Plus: `sm-detail/Button` hardcoded the label `'Logging in…'` for its loading
state, so it could never be anything but a login button. And `FileUpload`'s
default `accept` offered `.pdf`, which the API refuses — only
`EditPortfolioForm` checked the type and size, and it did so in the caller.

## `ui/ModalShell`

Takes the lifecycle, leaves the appearance to you — the modals in this app are
different sizes and shapes, and that is fine.

```tsx
<ModalShell
    isOpen
    onClose={handleClose}
    isBusy={isSubmitting}
    labelledBy={titleId}
    panelClassName="… whatever this dialog looks like …"
>
    …
</ModalShell>
```

Two details worth not undoing:

- **It unmounts when closed.** That is what makes a reopened dialog start with
  an empty form and no stale error, instead of the last attempt's state.
- **The mount effect and the keydown effect are separate, deliberately.** The
  keydown listener has to see the current `isBusy`; the mount effect must not
  re-run when `isBusy` changes, because its cleanup hands focus back to whatever
  opened the dialog — so clicking Confirm would throw focus out of the dialog it
  was confirming.

## Rules this phase leaves behind

1. **A new modal uses `ui/ModalShell`.** Not a `fixed inset-0` div. Everything
   an overlay has to do is already in there and none of it is obvious.
2. **A `<button>` inside a `<form>` needs `type="button"` unless it submits.**
   That is the default this language got wrong and it bites silently.
3. **`ui/Button`, not a second Button.** If it cannot do what you need, add a
   prop — a label baked into a component is how the last one became unusable.
4. **File rules live in `FileUpload`, not in the caller.** The server enforces
   them for real; the client checks so the user finds out before the upload.
5. **Never `alert()`.** It blocks the page, cannot be styled, and is not
   announced in context. Every form here has an error line — use it.
6. **`isBusy` on a modal while a submit is in flight.** Closing halfway through
   leaves the user unsure whether it happened.

## What is left

Honest list, so nobody assumes this phase covered it:

- **62 raw `<button>` and 27 raw `<input>`** still bypass `ui/Button` and
  `ui/Input`. Converting them is a large diff with real visual risk and no way
  to verify it beyond looking at every page, so it was not done blind. Do it a
  page at a time, with the page open.
- **3 more modal shells** — `CompanyDetailModal`, `EditAccountModal` and the
  inline one in `account-settings` — have not adopted `ModalShell`.
  `CompanyDetailModal` has its own `useEffect`s, so it is the least urgent.
- **5 dropdowns, no two alike.** Only the inline one in `app/companies/page.tsx`
  has `aria-expanded` and outside-click handling. The `type` bug is fixed; the
  consolidation is not.
- **`ui/Textarea` has zero adopters** against 9 raw `<textarea>`.
- **`ui/StatusMessage` has two adopters** against 6 hand-rolled red `<p>`s.

Sprint 2 will add to these counts. The primitives exist and the bugs in them are
fixed, so a new task that uses them is now cheaper than one that does not —
which is the part that had to be true before the sprint started.
