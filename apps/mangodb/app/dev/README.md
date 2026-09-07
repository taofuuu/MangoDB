# app/dev — throwaway

Scaffolding, not shared code. Nothing outside this folder should import from
it, and nothing in here is a pattern to copy.

`session/page.tsx` is one self-contained file: it carries its own button,
input, API client and token helpers so this route can get an access token
while there is no login page. The real versions of those belong to the login
page (US1-2) and to the shared UI kit.

Delete this folder when the real login lands.
