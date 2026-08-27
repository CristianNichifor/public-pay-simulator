# Data quality: the coefficient grid

What `Proiect-COEFICIENTI-1-8-MMFTSS-16.07.2026-1000.xlsx` actually contains, and which of
its properties the model has to carry rather than clean away.

Reproduce everything here with:

```
uv run --with openpyxl python scripts/probe_workbook.py
```

## Shape

48 sheets, one per annex chapter. 1 474 rows carry a function code of the form
`81.10101002.02.2`. Reading left to right: family, chapter path, position, variant.

## The coefficients are back-solved

1 397 distinct coefficient values. By decimal places:

| decimals | distinct values | share |
| -------- | --------------- | ----- |
| ≤ 2      | 218             | 15,6% |
| 3–13     | 317             | 22,7% |
| 14       | 49              | 3,5%  |
| 15       | 217             | 15,5% |
| 16       | 596             | 42,7% |

A designed grid produces numbers like 2,40 and 3,29 — and 218 of these are exactly that.
The other 1 179 are what you get when you divide one salary by another. `5,189610389610378`
is not a policy choice; it is the residue of a division.

The workbook says so itself. Row 136 of `I CI 4-5-6`, in the columns to the right of the
coefficient, still holds `6282`, `6215` and `0.9893346068131168` — an old monthly figure, a
new one, and their ratio — next to live `#DIV/0!` cells. The working columns were never
removed.

**Why this is not cleaned up.** Rounding these to two decimals would be a policy proposal,
not a data fix, and it would erase the evidence that the grid was reverse-engineered from
existing pay rather than derived from the job evaluation Article 8 describes. The importer
keeps every digit. The decimal histogram is a required feature of the app for the same
reason.

One consequence for the engine: values keep full float precision, and only money is held in
integer minor units.

### Excluded columns

The precision figures above cover columns whose maximum reaches 1,5. Nine columns fall below
that and are excluded: they are the leftover ratio columns, clustering around 1,0. Counting
them would inflate the high-decimal share — the statistic being measured. The single value
below 1,00 anywhere in the workbook, `0,9893…`, is one of these, not a coefficient. **The
grid does not breach its own 1,00 floor.**

## The 1:8 ratio

Article 5 sets the ratio between the lowest and highest base salary at 1 to 8. In the grid:

- lowest coefficient: **1,02** — `Părinte social, îngrijitor la domiciliu, asistent personal`
- highest applicable in 2027: **6,4702** — President of Romania
- highest anywhere in the workbook: **7,6176** — the same position, 2030 column

Annex IX phases dignitary coefficients across five columns (2026/2027, 2028, 2029, 2030,
2031), and the President's reaches exactly 8,00 only in 2031. The span actually in force
during 2027 is **1:6,34**.

Article 5's ratio is a destination, not a description. The model stores dignitary
coefficients as a dated series so the app can show the span moving year by year.

## The top of the grid is outside the grade structure

Annex IX has no salary-grade column, and Article 11(3) exempts public dignities from the
Article 8 evaluation. The 2026/2027 presidential coefficient, 6,4702, sits *below* grade 12's
floor of 6,50 and only enters the band in 2029.

So the twelve grades describe the whole budgetary sector except its apex. Any compression
metric computed over grades silently excludes the best-paid positions — the app computes
dispersion both ways and labels which is which.

## Positions merge by punctuation

Roughly a quarter of coded rows collapse several former job titles onto one code, one
coefficient and one grade:

| separator | rows |
| --------- | ---- |
| `;`       | 219  |
| `,`       | 113  |
| `/`       | 29   |
| **total** | **361 of 1 474 (24,5%)** |

`VIII_CI_A_1` row 17 is nine titles: *Director; șef compartiment; inspector șef; comisar șef
divizie; șef sector la Consiliul Legislativ; comisar șef secție; director executiv; trezorier
șef; șef administrație financiară.*

**No separator is reliable.**

- `;` also separates fragments *within* one title — `tehnician superior de imagistică;
  radiologie; radioterapie şi radiodiagnostic` is one occupation, not three.
- `,` sometimes separates titles (`Inspector şcolar de specialitate, inspector şcolar`) and
  sometimes introduces a qualifier applying to all of them (`Institutor; maistru instructor,
  studii superioare lungă durată grad didactic I`).
- `/` merges in `Secretar general adjunct/comisar general` but is internal in `secretar
  instituție/unitate de învățământ`.

Of the 219 semicolon rows, 117 split cleanly into 413 titles; 87 have at least one fragment
that is not plausibly a job title and are marked `needsReview`. The importer therefore
proposes a split and records `assimilation.parse` and the raw cell verbatim. It never
silently decides.

## Two seniority mechanisms

Article 13(2) states that every execution coefficient in Annexes I–VIII is set at *gradația*
0, to be raised by 7,5 / 5 / 5 / 2,5 / 2,5%.

Annex I does not work that way. It publishes a separate coefficient row per seniority band —
*peste 25 de ani*, *20-25 ani*, *până la 1 an* — each with its own function code.
`11.00501009.02.1` and `.2` are the same job at different seniority. Annex V does the same for
the judiciary.

For those families the seniority is already inside the coefficient, so applying the
*gradații* on top would pay it twice. Which mechanism is intended does not follow from the
text. Positions in these annexes carry `ladder: null` and seniority as a variant dimension,
and the regime records a `blocking` limitation.

## Known unknowns

- The `Nivel I` / `Nivel II` coefficient columns map to code suffixes `.2` / `.1`. The order
  is stated nowhere. Encoded as `assumed`, pending a ruling.
- Article 20 leaves the actual size of working-condition supplements to later government
  decisions. Any figure used before then is a scenario, not an entitlement.
- Article 33's transitional pay difference needs individual November 2026 pay, which is not
  published. It is the largest single gap in any Romanian total this tool produces.
