# Production readiness

Status: `todo`, `done`, `blocked`, `needs-human`.

| ID | Item | Status |
| --- | --- | --- |
| R2 | README links readers to the projects hub paths | done |

## R2 README links to the hub

The simulator now lives in the projects hub at
`https://projects.cristian-nichifor.com/romania-reforms/public-pay/`. The redirect target in
`redirect/index.html` is out of scope here; it follows romania-reforms' promotion.

- Given a reader opens the README,
  when they look for the live application,
  then every "live" link points to `https://projects.cristian-nichifor.com/romania-reforms/public-pay/`
  and the hub itself is linked; the old GitHub Pages URL appears only as the address that redirects.
- Test: `tests/redirect.test.cjs` › "README sends readers to the hub, not the old Pages URL".
