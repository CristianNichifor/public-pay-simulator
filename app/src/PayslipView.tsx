import { useMemo, useState } from 'react';

import { payslip } from '../../engine/payslip';
import type { Payslip, Person } from '../../engine/payslip';
import type { Scenario } from '../../engine/scenario';
import type { Position, Regime } from '../../engine/types';

function money(minor: number, currency: string): string {
  return (minor / 100).toLocaleString('ro-RO', {
    style: 'currency',
    currency,
    maximumFractionDigits: 0,
  });
}
function pct(n: number, digits = 1): string {
  return `${(n * 100).toLocaleString('ro-RO', { maximumFractionDigits: digits })}%`;
}

const PERIOD_LABEL: Record<string, string> = { month: 'pe lună', year: 'pe an' };

export default function PayslipView({
  regimes,
  scenario,
  onChange,
}: {
  regimes: Regime[];
  scenario: Scenario;
  onChange: (next: Scenario) => void;
}) {
  const primary = regimes[0];
  const [query, setQuery] = useState('');

  const matches = useMemo(() => {
    if (!primary) return [];
    const q = query.trim().toLowerCase();
    if (!q) return primary.positions.slice(0, 40);
    return primary.positions
      .filter(
        (p) =>
          p.name.toLowerCase().includes(q) ||
          p.code.toLowerCase().includes(q) ||
          p.titles?.some((t) => t.name.toLowerCase().includes(q)),
      )
      .slice(0, 40);
  }, [primary, query]);

  const options = useMemo(() => {
    if (!primary || !scenario.positionCode) return matches;
    if (matches.some((p) => p.code === scenario.positionCode)) return matches;
    const selected = primary.positions.find((p) => p.code === scenario.positionCode);
    return selected ? [selected, ...matches] : matches;
  }, [matches, primary, scenario.positionCode]);

  const person: Person | null = scenario.positionCode
    ? {
        positionCode: scenario.positionCode,
        seniorityYears: scenario.seniorityYears ?? 0,
        dims: scenario.dims,
        claims: scenario.claims,
      }
    : null;

  const slips = useMemo(
    () =>
      person
        ? regimes.map((regime) => ({
            regime,
            position: regime.positions.find((p) => p.code === person.positionCode) ?? null,
            slip: payslip(person, regime),
          }))
        : [],
    [person, regimes],
  );

  const chosen: Position | undefined = primary?.positions.find(
    (p) => p.code === scenario.positionCode,
  );

  // Absolute amounts are only ever compared inside one currency and one period. Two
  // regimes denominated differently get their own columns and no delta — the comparison
  // that remains is the dimensionless one below.
  const priced = slips.filter((s) => s.position !== null);
  const comparable =
    slips.length > 1 &&
    new Set(slips.map((s) => `${s.regime.currency}|${s.slip.period}`)).size === 1;

  const set = (patch: Partial<Scenario>) => onChange({ ...scenario, ...patch });

  const toggleClaim = (id: string) => {
    const claims = scenario.claims ?? [];
    const exists = claims.some((c) => c.supplementId === id);
    set({
      claims: exists
        ? claims.filter((c) => c.supplementId !== id)
        : [...claims, { supplementId: id }],
    });
  };

  return (
    <>
      <header className="masthead">
        <h1>Același om, sub mai multe regimuri</h1>
        <p>
          Alege o funcție, o vechime și sporurile revendicate. Fiecare regim calculează separat,
          din propriile lui reguli. Tot scenariul stă în adresa paginii, deci linkul de mai jos
          este scenariul — nu există server și nu se salvează nimic.
        </p>
      </header>

      <div className="disclaimer">
        <strong>Cifrele sunt ce spune legea, nu ce încasează cineva.</strong> Diferența salarială
        tranzitorie de la Art. 33 — care menține venitul din noiembrie 2026 și în primii ani
        domină factura reală — nu poate fi calculată fără date individuale, pe care România nu le
        publică. Orice sumă de aici este un prag, nu o prognoză.
      </div>

      <section>
        <h2>Persoana</h2>
        <div className="card controls">
          <label className="field">
            <span>Funcția</span>
            <input
              type="search"
              value={query}
              placeholder="caută după denumire sau cod — ex. auditor, director, 81.101"
              onChange={(e) => setQuery(e.target.value)}
            />
            <select
              size={8}
              value={scenario.positionCode ?? ''}
              onChange={(e) => set({ positionCode: e.target.value, dims: undefined })}
            >
              {options.map((p) => (
                <option key={p.code} value={p.code}>
                  {p.name}
                  {p.assimilation && p.assimilation.fanIn && p.assimilation.fanIn > 1
                    ? ` (+${p.assimilation.fanIn - 1} denumiri)`
                    : ''}{' '}
                  — {p.code}
                </option>
              ))}
            </select>
          </label>

          <label className="field">
            <span>Vechime în muncă: {scenario.seniorityYears ?? 0} ani</span>
            <input
              type="range"
              min={0}
              max={40}
              value={scenario.seniorityYears ?? 0}
              onChange={(e) => set({ seniorityYears: Number(e.target.value) })}
            />
          </label>

          {chosen && chosen.variants.length > 1 && chosen.variants[0].dims && (
            <label className="field">
              <span>Varianta</span>
              <select
                value={JSON.stringify(scenario.dims ?? chosen.variants[0].dims)}
                onChange={(e) => set({ dims: JSON.parse(e.target.value) })}
              >
                {chosen.variants.map((v, i) => (
                  <option key={i} value={JSON.stringify(v.dims ?? {})}>
                    {Object.entries(v.dims ?? {}).map(([k, val]) => `${k}: ${val}`).join(' · ') ||
                      `varianta ${i + 1}`}
                  </option>
                ))}
              </select>
            </label>
          )}

          {primary && (
            <fieldset className="field">
              <legend>Sporuri revendicate</legend>
              <div className="claims">
                {primary.supplements.map((s) => (
                  <label key={s.id} className="claim">
                    <input
                      type="checkbox"
                      checked={(scenario.claims ?? []).some((c) => c.supplementId === s.id)}
                      onChange={() => toggleClaim(s.id)}
                    />
                    <span>
                      {s.name}
                      {s.mode === 'upTo' && <em> (până la)</em>}
                      {s.countsToCap === false && <em> · exceptat de la plafon</em>}
                      {s.countsToCap === 'partial' && <em> · parțial în plafon</em>}
                    </span>
                  </label>
                ))}
              </div>
            </fieldset>
          )}
        </div>
      </section>

      {!person && (
        <section>
          <p className="lede">Alege o funcție ca să vezi calculul.</p>
        </section>
      )}

      {person && (
        <section>
          <h2>Calculul, regim cu regim</h2>
          {!comparable && slips.length > 1 && (
            <div className="disclaimer">
              <strong>Nu se compară cuantumuri între monede.</strong> Regimurile alese sunt
              exprimate în monede sau perioade diferite ({slips
                .map((s) => `${s.regime.currency} ${PERIOD_LABEL[s.slip.period]}`)
                .join(', ')}
              ). Coloanele stau una lângă alta, dar nu se scad. Comparația care rămâne validă este
              cea fără unități, de mai jos.
            </div>
          )}
          <div className="slips">
            {slips.map(({ regime, position, slip }) => (
              <PayslipCard key={regime.id} regime={regime} position={position} slip={slip} />
            ))}
          </div>
        </section>
      )}

      {person && priced.length > 1 && (
        <section>
          <h2>Comparație fără unități</h2>
          <p className="lede">
            Singura comparație validă între regimuri exprimate în monede diferite: proporții, nu
            sume. Ce parte din brut e salariul de bază, cât adaugă sporurile, cât rămâne net, cât
            costă angajatorul peste brut.
          </p>
          <div className="card chart-scroll">
            <table className="data">
              <thead>
                <tr>
                  <th>Raport</th>
                  {priced.map((s) => (
                    <th key={s.regime.id}>{s.regime.name.split('(')[0].trim()}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                <tr>
                  <td>Salariul de bază din brut</td>
                  {priced.map((s) => (
                    <td key={s.regime.id} className="num">
                      {s.slip.gross ? pct(s.slip.base / s.slip.gross) : '—'}
                    </td>
                  ))}
                </tr>
                <tr>
                  <td>Sporuri din brut</td>
                  {priced.map((s) => (
                    <td key={s.regime.id} className="num">
                      {s.slip.gross
                        ? pct(s.slip.supplements.reduce((a, l) => a + l.amount, 0) / s.slip.gross)
                        : '—'}
                    </td>
                  ))}
                </tr>
                <tr>
                  <td>Net din brut</td>
                  {priced.map((s) => (
                    <td key={s.regime.id} className="num">
                      {s.slip.net === null ? 'nu se poate calcula' : pct(s.slip.net / s.slip.gross)}
                    </td>
                  ))}
                </tr>
                <tr>
                  <td>Costul angajatorului peste brut</td>
                  {priced.map((s) => (
                    <td key={s.regime.id} className="num">
                      {s.slip.gross ? pct(s.slip.employerCost / s.slip.gross - 1) : '—'}
                    </td>
                  ))}
                </tr>
                <tr>
                  <td>Sporul de vechime față de gradația 0</td>
                  {priced.map((s) => (
                    <td key={s.regime.id} className="num">
                      {s.slip.seniority.bakedIn ? 'inclus în coeficient' : pct(s.slip.seniority.factor - 1)}
                    </td>
                  ))}
                </tr>
              </tbody>
            </table>
          </div>
        </section>
      )}
    </>
  );
}

function PayslipCard({
  regime,
  position,
  slip,
}: {
  regime: Regime;
  position: Position | null;
  slip: Payslip;
}) {
  const cur = (m: number) => money(m, slip.currency);
  const supplements = slip.supplements.filter((l) => l.amount > 0 || l.suppressedBy);

  if (!position) {
    return (
      <div className="card slip">
        <h3>{regime.name.split('(')[0].trim()}</h3>
        <p className="missing">
          Funcția nu există în acest regim. Ca să fie calculată aici ar trebui un crosswalk care să
          spună cu ce funcție se asimilează — iar între jurisdicții diferite un asemenea crosswalk
          este o judecată editorială, nu un drept.
        </p>
      </div>
    );
  }

  return (
    <div className="card slip">
      <h3>{regime.name.split('(')[0].trim()}</h3>
      <p className="slip-meta">
        {position.name} · {slip.currency} {PERIOD_LABEL[slip.period]}
      </p>

      <table className="data">
        <tbody>
          <tr>
            <td>Salariu de bază</td>
            <td className="num">{cur(slip.base)}</td>
          </tr>
          {!slip.seniority.bakedIn && slip.seniority.amount !== 0 && (
            <tr className="sub">
              <td>din care vechime ({slip.seniority.stepId})</td>
              <td className="num">{cur(slip.seniority.amount)}</td>
            </tr>
          )}
          {supplements.map((line) => (
            <tr key={line.id} className={line.suppressedBy ? 'struck' : undefined}>
              <td>
                {line.name}
                {line.allowedRate !== null && <> · {pct(line.allowedRate, 1)}</>}
                {line.suppressedBy && <em> — exclus de „{line.suppressedBy}”</em>}
              </td>
              <td className="num">{cur(line.amount)}</td>
            </tr>
          ))}
          <tr className="total">
            <td>Brut</td>
            <td className="num">{cur(slip.gross)}</td>
          </tr>
          <tr>
            <td>Net</td>
            <td className="num">
              {slip.net === null ? <span className="missing-inline">nu se calculează</span> : cur(slip.net)}
            </td>
          </tr>
          <tr>
            <td>Cost total angajator</td>
            <td className="num">{cur(slip.employerCost)}</td>
          </tr>
          {slip.pensionSplit && (
            <tr className="sub">
              <td>pensie: angajat / angajator</td>
              <td className="num">
                {cur(slip.pensionSplit.employee)} / {cur(slip.pensionSplit.employer)}
              </td>
            </tr>
          )}
        </tbody>
      </table>

      {slip.capUtilisation.map((cap) => (
        <div key={cap.capId} className="cap">
          <div className="cap-head">
            <span>Plafonul de {pct(cap.limit, 0)}</span>
            <strong>{pct(cap.ratio)}</strong>
          </div>
          <div className="meter" role="img" aria-label={`utilizare ${pct(cap.ratio)}`}>
            <div
              className="meter-fill"
              style={{ width: `${Math.min((cap.ratio / Math.max(cap.limit, 0.0001)) * 100, 100)}%` }}
            />
          </div>
          <p className="cap-note">
            {cap.authoritative ? '' : 'Cifră notională. '}
            {cap.scopeNote}
          </p>
        </div>
      ))}

      {slip.diagnostics.length > 0 && (
        <details className="diags">
          <summary>{slip.diagnostics.length} observații despre acest calcul</summary>
          <ul>
            {slip.diagnostics.map((d, i) => (
              <li key={i} className={d.severity}>
                <span className="sev">{d.severity}</span> {d.message}
              </li>
            ))}
          </ul>
        </details>
      )}
    </div>
  );
}
