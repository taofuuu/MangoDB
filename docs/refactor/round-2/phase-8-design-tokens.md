# Phase 8 — Design tokens

**Status: done.** Toa approved the map below on 17 Oct with all six
questions as proposed, and the sweep followed it. The snapshot diff is empty:
only class names and `globals.css` changed.

## Before and after

|                                  | Before | After                        |
| -------------------------------- | -----: | ---------------------------- |
| Hex values outside `globals.css` |     58 | 2, both in a comment         |
| Tailwind palette classes         |    158 | 11, the `bg-black` backdrops |
| Tailwind text sizes              |     34 | 3, the approved exceptions   |
| Brand-coloured rgba shadows      |      5 | 0                            |
| Colour tokens in `globals.css`   |     29 | 27                           |

What stays on purpose: `bg-black/40` behind dialogs and `/75` behind the image
viewer (black is not a palette colour), plain black drop shadows, the 48px
portfolio titles, and the login heading's `sm:!text-[36px]`, which a `type-*`
class cannot say because it takes no breakpoint.

## Decisions Toa made

1. **Greens became brand blue**: the Accept button and the register success
   tick. Brand means "done" everywhere, as on the Accepted badge and
   `SuccessModal`.
2. **Light borders darkened to `line`**, which `globals.css` calls every
   border.
3. **`bg-white` became `surface-white`**, the same value. Whether white cards
   should become the cream `surface` is still a Figma question, left open.
4. **`text-[10px]` grew to 12px** (`type-xs`).
5. **`text-[48px]` stayed** on the two portfolio titles.
6. **`panel` merged into `fill-subtle`, `pagination-border` into `line`.**

## Rules this phase leaves behind

1. **A colour is a token.** No hex, no Tailwind palette shade and no rgba of a
   brand colour outside `globals.css`. A brand-coloured shadow is
   `color-mix(in_srgb,var(--color-brand)_25%,transparent)`.
2. **Greys go by role:** headings and values `ink`, helper lines `ink-soft`,
   placeholders and dates `ink-placeholder`, borders `line`, light fills
   `fill-subtle`.
3. **A size is a `type-*` class.** It sets its own weight and sits outside
   Tailwind's layers, so a different weight beside it is `!font-[n]`.
4. **A dialog backdrop is ModalShell's `bg-black/40`.**

## What is left

- `surface` against `surface-white` (142 and 52 uses) is for the Figma
  owners.
- `type-*` takes no breakpoint prefix, so a responsive size needs
  `!text-[n]`. Moving the scale into Tailwind's `@utility` would fix that and
  let `font-*` work without `!`, but every call site that relies on the baked
  weight has to be checked first.

## The map

### Hex literals

8 values, 58 uses. Every one but one already has a token within a few ΔE.

| Now       | Becomes   |   ΔE | Uses | Note                                                                       |
| --------- | --------- | ---: | ---: | -------------------------------------------------------------------------- |
| `#497b93` | `brand`   |  0.0 |   19 | The same value, written out. Mostly the received-proposal card and detail. |
| `#437788` | `brand`   |  4.8 |   15 | A second brand blue from the received-proposals design.                    |
| `#c5483b` | `danger`  |  0.0 |    9 | The same value, written out.                                               |
| `#c5483e` | `danger`  |  1.7 |    2 | The red globals.css says no longer exists: the warning icon.               |
| `#171717` | `ink`     |  0.0 |    7 | SVG fills in the grid/list toggle. Becomes currentColor with text-ink.     |
| `#fffdf9` | `surface` |  0.0 |    3 | The received-proposals page background and the warning icon stroke.        |
| `#f5c24c` | `accent`  |  6.4 |    1 | Only in a PortfolioDots comment; the dot already reads accent.             |
| `#3da62f` | `brand`   | 81.3 |    2 | The Accept button. There is no green token. (Q1)                           |

### Text colour

Greys map by role, not by nearest colour: gray-700 sits halfway between ink and ink-soft.

| Now                                                                                                         | Becomes           |   ΔE | Uses | Note                                                   |
| ----------------------------------------------------------------------------------------------------------- | ----------------- | ---: | ---: | ------------------------------------------------------ |
| `text-gray-800, text-gray-900, text-gray-700, text-slate-900, text-slate-800, text-slate-700, border-black` | `ink`             | 14.6 |   29 | Headings, names and values.                            |
| `text-gray-600, text-gray-500, text-slate-600, text-slate-500`                                              | `ink-soft`        | 13.0 |   14 | Helper lines and inactive tabs.                        |
| `text-gray-400`                                                                                             | `ink-placeholder` |  8.7 |   10 | Dates and empty-card notes.                            |
| `text-red-600, text-red-500`                                                                                | `danger`          | 35.6 |    3 | Error lines on register, login and the proposals page. |
| `text-green-600`                                                                                            | `brand`           | 78.6 |    1 | The tick on the register success screen. (Q1)          |
| `text-white, outline-white`                                                                                 | `surface-white`   |  0.0 |   12 | The same #ffffff, through the token.                   |

### Fills

| Now                                     | Becomes         |   ΔE | Uses | Note                                                        |
| --------------------------------------- | --------------- | ---: | ---: | ----------------------------------------------------------- |
| `bg-white`                              | `surface-white` |  0.0 |   39 | The same #ffffff. No visible change. (Q3)                   |
| `bg-gray-100, bg-slate-100, bg-gray-50` | `fill-subtle`   |  0.0 |   17 | Hover rows and tab tracks. fill-subtle is gray-100 exactly. |
| `bg-slate-200, bg-slate-300`            | `fill-muted`    |  6.8 |    2 | A disabled button and the timeline dot.                     |
| `bg-red-50`                             | `danger-wash`   |  1.3 |    4 | Error boxes.                                                |
| `bg-green-100, bg-emerald-50`           | `brand-tint`    | 15.3 |    2 | The register success circle and the Accept hover. (Q1)      |

### Borders

| Now                                                                   | Becomes       |  ΔE | Uses | Note                                                                            |
| --------------------------------------------------------------------- | ------------- | --: | ---: | ------------------------------------------------------------------------------- |
| `border-gray-200, border-gray-100, divide-gray-100, border-slate-200` | `line`        | 6.4 |   12 | globals.css says every border is line. These were lighter, so they darken. (Q2) |
| `border-red-200`                                                      | `danger-tint` | 9.6 |    2 | Error box borders.                                                              |

### Text sizes

| Now                     | Becomes   | Size        | Uses | Note                                                                         |
| ----------------------- | --------- | ----------- | ---: | ---------------------------------------------------------------------------- |
| `text-xs, text-[12px]`  | `type-xs` | 12px → 12px |   19 | A weight set beside it moves to !font-_, because type-_ sets its own weight. |
| `text-sm`               | `type-sm` | 14px → 14px |    3 |                                                                              |
| `text-2xl`              | `type-lg` | 24px → 24px |    3 |                                                                              |
| `text-4xl, text-[36px]` | `type-hd` | 36px → 36px |    2 |                                                                              |
| `text-3xl`              | `type-hd` | 30px → 36px |    2 | The register success heading.                                                |
| `text-base`             | `type-md` | 16px → 18px |    1 | The job title under "Submitted Proposals".                                   |
| `text-[10px]`           | `type-xs` | 10px → 12px |    2 | Two labels in the received-proposal detail. (Q4)                             |
| `text-[48px]`           | `stays`   | 48px        |    2 | The portfolio page titles. No 48px step in the scale. (Q5)                   |

### Backdrops and shadows

| Now                                           | Becomes                                                   | Why                                                             |
| --------------------------------------------- | --------------------------------------------------------- | --------------------------------------------------------------- |
| `bg-black/35, bg-black/50 (dialog backdrops)` | `bg-black/40`                                             | ModalShell already defaults to /40. The image viewer keeps /75. |
| `rgba(73,123,147,0.25) shadows`               | `color-mix(in srgb, var(--color-brand) 25%, transparent)` | brand at 25%, as JobCard already writes it.                     |
| `rgb(30 67 83 / …) shadows`                   | `color-mix with var(--color-brand-deep)`                  | brand-deep, written out.                                        |
| `rgba(0,0,0,…) drop shadows`                  | `stay`                                                    | Neutral black. Not a colour in the palette.                     |
