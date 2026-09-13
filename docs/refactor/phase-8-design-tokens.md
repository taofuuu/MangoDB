# Phase 8 — Design tokens

**Status: done, in the half that is safe to do mechanically.** The colours have
names. Deciding that four spellings of one red should be one red is **not**
done — see "The decision this leaves you" below.

Snapshot diff empty: nothing here touches the API.

## What happened

| Was                                            | Now                             |
| ---------------------------------------------- | ------------------------------- |
| 444 hex literals in 44 `.tsx` files            | tokens in `globals.css`         |
| 51 distinct colours, 2 named variables         | 51 named tokens                 |
| `.text-lg` etc. shadowing Tailwind's classes   | `.type-lg` etc.                 |
| 2 scrollbar utilities, one a copy of the other | one, with the colour a variable |
| 10 `w-[..vw]` classes beside a `w-full`        | gone                            |

```css
@theme {
    --color-brand: #497b93;
    --color-brand-dark: #3f6b80;
    --color-danger: #c5483b;
    --color-surface: #fffdf9;
    --color-ink: #171717;
    …
}
```

Tailwind v4 generates a utility for each, so `bg-[#497B93]` became `bg-brand`,
`text-[#171717]` became `text-ink`, and the `/opacity` suffix still works:
`bg-brand/10`.

## The split, and why

The plan called for collapsing 12 reds into 3 roles, 12 blues into 2, 8
off-whites into 2, and 17 greys into about 5. **That part is not done, on
purpose.**

Naming a colour changes nothing anyone can see. Merging `#C5483B` into
`#C5483E` changes what people see, which makes it a design decision — and
`CLAUDE.md` says to ask before making one of those. It is also the kind of
decision that is much easier to make once the colours have names and you can
count them.

So the order is: name them (done, verifiable, zero risk), then merge them (one
line each, with whoever owns the design).

**Verified rather than assumed.** With the app running:

```
panel background  rgb(255, 253, 249)  = #FFFDF9   surface
input border      rgb(73, 123, 147)   = #497B93   brand
save button       rgb(63, 107, 128)   = #3F6B80   brand-dark
h2                24px / 600          = the old .text-lg
```

## The decision this leaves you

Open `apps/mangodb/app/globals.css` and look at the token list. The duplicates
are obvious now that they are next to each other:

- **`danger`, `danger-2`, `danger-3`, `danger-4`** are `#C5483B`, `#C5483E`,
  `#CE473E`, `#C6473A` — four spellings of one red, and they appear in the same
  flow: the delete modal uses one, the button that opens it uses a second, and
  the warning text inside it uses a third.
- **`brand-alt-1` through `brand-alt-4`** are four one-off hover shades of the
  teal, plus `#4F7B99`/`#446B86` which came from the Button component that Phase
  7 deleted.
- **`surface-white` (`#FFFFFF`) is used 15 times** while `surface` (`#FFFDF9`)
  is the actual page colour.
- **Five `ink-placeholder*` tokens** exist because placeholder text is a
  different grey in every form.

Each merge is one line: point the duplicate at the canonical value, or delete it
and sweep its name. That is the whole reason this phase went first.

## Rules this phase leaves behind

1. **No hex literals in a component.** `bg-brand`, not `bg-[#497B93]`. If the
   colour you want has no token, add one — a literal is a colour nobody can
   find later.
2. **`type-*` for the project's type scale, `text-*` for Tailwind's.** Never
   define a class that shadows a framework's — which one wins depends on
   stylesheet order, and nobody reading the call site can tell.
3. **A second copy of a utility with one value changed means the value should
   be a variable.** That is what `.certificate-scrollbar` was.
4. **Two classes setting the same property is a bug, not a fallback.** Which
   one wins depends on Tailwind's output order, not the order you wrote them.

## Still hardcoded

17 hex values sit outside Tailwind classes — SVG `fill`/`stroke` attributes and
a couple of inline `style` objects. They need `var(--color-…)` rather than a
class, so they were left for the same pass that merges the duplicates.
