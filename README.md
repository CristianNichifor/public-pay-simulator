# Public Pay Simulator (Romania)

Compare Romanian public-sector pay regimes against each other and against the Danish
model — the 2017 framework law, the July 2026 unified draft, and your own proposal, side
by side. Everything runs in the browser; a scenario is a URL.

> **This is a tool for public debate, not a payroll calculator.**
> It computes what a law *says*, not what anyone is actually paid. No figure here is an
> entitlement, and no scenario is a recommendation.

## Status

Design stage. The schema is settled and validates; the engine is a contract, not yet an
implementation.

- [x] Read the draft law and the annexes
- [x] `schema/regime.schema.json` — one document type for every regime, RO and DK alike
- [x] `schema/crosswalk.schema.json` — position assimilation between regimes
- [x] `engine/types.ts` — engine contract and type signatures
- [x] Two hand-written regimes, validating, arithmetic checked against published figures
- [x] CI: schema validation gate + engine typecheck; Pages deploy wired
- [ ] `scripts/import_coeficienti.py` — 48 sheets → `data/regimes/ro-draft-2026-07-16.json`
- [ ] `ro-153-2017.json` — blocked on the consolidated 153/2017 annexes
- [ ] Engine + vitest suite
- [ ] The three views. UI last, deliberately.

Deploys to <https://cristiannichifor.github.io/public-pay-simulator/> once `app/` exists.
Until then the deploy job skips rather than publishing an empty site — the frontend is not
scaffolded until the coefficient import and the engine are verified, for the same reason the
map in `administrative-reform-simulator` waited on its adjacency graph.

## Two constraints that shape everything

1. **The law is data, not code.** Every regime is a JSON document validated against one
   schema. The engine is a pure function. Changing a coefficient means editing JSON — never
   TypeScript. If the schema cannot express a system without special-casing it, the schema
   is wrong and gets fixed.
2. **Never compare Romanian and Danish pay levels.** RON and DKK amounts are never placed
   side by side. Denmark is in here to compare *shape*: how a ladder is built, who sets what,
   how much of pay is base and how much is supplement, how far apart the top and bottom sit.

## What the same schema had to swallow

Romania and Denmark turn out to be the same multiplication:

```
base = positionValue × reference.amount × reference.factor
```

Romania freezes a coefficient and moves the reference value (4 100 lei, Art. 36(2)).
Denmark freezes a 2012 basic amount and moves the *reguleringsprocent* (1,265085). Same
arithmetic, opposite halves held still. The Danish figures reproduce exactly: 261 000 ×
1,265085 = 330 187 as published, pension 59 665, gross 389 852.

Where the schema had to grow past the obvious design:

- **Seniority is two different mechanisms.** Romanian *gradații* compound (+7,5/5/5/2,5/2,5%);
  Danish scale grades each name their own absolute amount, and a Danish bachelor walks
  grades 1, 2, 4, 4, 5 — a path with a repeat. So a ladder has typed steps and a position
  carries its own path through them.
- **`countsToCap` cannot be a boolean.** Art. 15(18) exempts the EU-funds supplement from the
  20% ceiling *to the extent it is settled from external funds*, and 15(19) puts the
  co-financed share back in. It is a proportion.
- **Coefficients are dated.** Annex IX phases dignitary coefficients across 2026/2027 → 2031.
  The same primitive carries the Danish regulation factor and the annual Romanian reference.
- **Caps are plural and of three different kinds** — share of base, share of headcount, and a
  growth bound on the reference value itself.

Full reasoning: [`docs/METHODOLOGY.md`](docs/METHODOLOGY.md).

## What reading the sources actually turned up

- **The coefficients are back-solved, not designed.** 1 397 distinct values; 862 of them
  (61,7%) carry 14 or more decimal places and 596 sit at 16. Only 218 are rounded to two.
  The workbook still has the working columns visible — old-lei and new-lei amounts side by
  side, ratio columns, live `#DIV/0!` cells.
- **The 1:8 ratio is a destination, not a description.** The lowest coefficient in the grid is
  1,02; the highest applicable in 2027 is 6,4702. That is 1:6,34. The value 8,00 appears only
  in Annex IX's 2031 column.
- **The law merges jobs with punctuation.** Roughly a quarter of coded positions collapse two
  or more former titles into one code and one coefficient — `Director; șef compartiment;
  inspector șef; comisar șef divizie; …` is nine. No assimilation table is published.
- **Two seniority systems coexist.** Art. 13(2) says every execution coefficient is set at
  *gradația* 0, but Annex I publishes a separate coefficient row per seniority band. For
  teaching staff, applying the *gradații* on top would pay seniority twice.

Each of these is recorded as a `limitations` entry inside the regime document, keyed to the
output it affects, so the caveat travels with the number instead of living in a footnote.

## Position assimilation

The draft abrogates Law 153/2017 (Art. 37) and requires everyone to be reassigned onto a new
position (Art. 32) — but publishes no mapping, leaving each *ordonator de credite* to decide.
The same former title can therefore land differently in two institutions.

The model splits this in two, on purpose:

- **Within a regime**, `position.titles[]` records the titles the source itself merged into one
  row, alongside the raw cell verbatim and how much to trust the split. The merge is a fact of
  the source.
- **Between regimes**, `data/crosswalks/` holds the mapping as a separate document with its own
  provenance. A regime never depends on another regime to be read, and deleting a crosswalk
  never changes what a law says.

Crosswalks are typed by cardinality — `merge`, `split`, `abolished`, `new` — because a
nine-to-one merge and a rename are different claims. `abolished` is the one worth watching:
a former title with no destination.

## Layout

```
schema/     regime.schema.json, crosswalk.schema.json — the contract
engine/     Pure TypeScript, zero runtime dependencies, vitest
app/        Thin UI over the engine. Built last.
scripts/    Python importers and probes. Committed and re-runnable.
data/       regimes/, crosswalks/, headcount/ — every number carries provenance
sources/    The Romanian documents. The Danish PDF is gitignored; see .gitignore.
docs/       METHODOLOGY.md, DATA_QUALITY_COEFFICIENTS.md
```

## Data honesty rules

1. Every number in `data/` names its source document and article or sheet cell, and declares
   whether it is `verbatim`, `derived`, or `assumed`. Nothing publishes while `assumed`.
2. Romania publishes no per-person microdata. Aggregation runs on filled-post counts, and the
   UI says so where the totals appear — not in a footnote.
3. Where a source has no answer, the output is `null` with a stated reason. Danish net pay is
   `null`: IDA's tables carry no tax schedule, and inventing one would break rule 1.

## Licence

Apache-2.0. The source documents in `sources/` are Romanian government publications and carry
their own terms.
