import { useMemo } from 'react';

import type { PatchEffect, Proposal } from '../../engine/proposal';
import { structure } from '../../engine/structure';
import type { Regime } from '../../engine/types';

function ro(n: number): string {
  return n.toLocaleString('ro-RO');
}
function pct(n: number): string {
  return `${(n * 100).toLocaleString('ro-RO', { maximumFractionDigits: 1 })}%`;
}

/** A value plus the reading it supports. `null` renders as an explained dash. */
interface Cell {
  value: string | null;
  good?: boolean;
  note?: string;
}

interface Row {
  label: string;
  hint?: string;
  cells: [Cell, Cell, Cell];
}

export default function CompareView({
  ministry,
  ours,
  denmark,
  proposal,
  effects,
  onOpen,
}: {
  ministry: Regime;
  ours: Regime;
  denmark: Regime | null;
  proposal: Proposal;
  effects: PatchEffect[];
  onOpen: (view: 'structure' | 'payslip') => void;
}) {
  const m = useMemo(() => structure(ministry), [ministry]);
  const o = useMemo(() => structure(ours), [ours]);

  // Denmark is a comparator of shape, not of grid arithmetic. Four published positions
  // cannot yield a meaningful count of distinct coefficients or a span, and printing one
  // would invite exactly the comparison this project refuses to make.
  const dkNA = (note: string): Cell => ({ value: null, note });

  const rows: Row[] = [
    {
      label: 'Coeficienți retro-calculați',
      hint: 'valori distincte cu 14 zecimale sau mai multe — reziduul unei împărțiri, nu o decizie',
      cells: [
        { value: pct(m.backSolvedShare) },
        { value: pct(o.backSolvedShare), good: true },
        { value: '0%', note: 'treptele daneze poartă direct suma, la două zecimale' },
      ],
    },
    {
      label: 'Valori distincte în grilă',
      hint: 'câte numere diferite trebuie de fapt decise',
      cells: [
        { value: ro(m.distinctValues) },
        { value: ro(o.distinctValues), good: true, note: `cu ${ro(m.distinctValues - o.distinctValues)} mai puține` },
        { value: '≈23', good: true, note: 'atâtea sume distincte apar în tabelele de stat publicate' },
      ],
    },
    {
      label: 'Coeficienți fără grad salarial',
      hint: 'cad în golurile de o sutime dintre intervalele din Art. 9 alin. (2)',
      cells: [
        { value: ro(m.variantsInGaps) },
        { value: ro(o.variantsInGaps), good: true },
        { value: '0', note: 'fiecare treaptă e o sumă, deci nu există goluri între ele' },
      ],
    },
    {
      label: 'Raportul minim–maxim',
      hint: 'Art. 5 îl fixează la 1 la 8',
      cells: [
        {
          value: `1:${m.spanByPeriod[0]?.ratio.toFixed(2).replace('.', ',') ?? '—'}`,
          note: `în 2027, urcând la 1:${m.span.ratio.toFixed(2).replace('.', ',')} în 2031`,
        },
        {
          // The proposal does not move the span in 2027 — it removes the escalation to
          // it. Marking an identical number as an improvement would be a lie the next
          // row already contradicts.
          value: `1:${o.span.ratio.toFixed(2).replace('.', ',')}`,
          good: Math.abs(o.span.ratio - (m.spanByPeriod[0]?.ratio ?? 0)) > 0.005,
          note: 'același, dar fix — nu se mai schimbă din 2028',
        },
        dkNA('nu există un raport declarat prin lege'),
      ],
    },
    {
      label: 'Ani până la grila finală',
      hint: 'câte coloane anuale trebuie parcurse până se aplică grila declarată',
      cells: [
        { value: ro(m.spanByPeriod.length) },
        { value: '0', good: true },
        dkNA('se renegociază periodic, prin contract colectiv'),
      ],
    },
    {
      label: 'Funcții care comasează denumiri',
      hint: 'câte funcții adună două sau mai multe denumiri anterioare sub un singur cod',
      cells: [
        { value: ro(m.assimilation.mergedPositions) },
        { value: ro(o.assimilation.mergedPositions), note: 'propunerea nu desface comasările' },
        dkNA('nu se pune problema: nu există nomenclator de funcții'),
      ],
    },
  ];

  const columns = [
    { key: 'ministry', title: 'Proiectul MMFTSS', sub: '16.07.2026', cls: 'col-ministry' },
    { key: 'ours', title: 'Propunerea noastră', sub: proposal.id, cls: 'col-ours' },
    { key: 'dk', title: 'Danemarca', sub: denmark ? 'stat, 01.04.2026' : 'nu e încărcat', cls: 'col-dk' },
  ];

  return (
    <>
      <header className="masthead">
        <h1>Trei feluri de a plăti statul</h1>
        <p>
          Ce propune ministerul, ce propunem noi și cum arată sistemul danez — aceleași
          întrebări puse celor trei, una lângă alta. Danemarca este aici pentru formă, nu pentru
          cuantumuri: leii și coroanele nu se compară nicăieri în acest instrument.
        </p>
      </header>

      <div className="disclaimer">
        <strong>Propunerea noastră nu schimbă cine cât ia față de altcineva.</strong>{' '}
        {proposal.notPolicy}
      </div>

      <section>
        <h2>Aceleași șase întrebări, trei răspunsuri</h2>
        <div className="card chart-scroll">
          <table className="data compare">
            <thead>
              <tr>
                <th />
                {columns.map((c) => (
                  <th key={c.key} className={c.cls}>
                    <span className="col-title">{c.title}</span>
                    <span className="col-sub">{c.sub}</span>
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {rows.map((row) => (
                <tr key={row.label}>
                  <td className="rowhead">
                    <strong>{row.label}</strong>
                    {row.hint && <span className="hint">{row.hint}</span>}
                  </td>
                  {row.cells.map((cell, i) => (
                    <td key={i} className={`num ${columns[i].cls}`}>
                      {cell.value === null ? (
                        <span className="na" title={cell.note}>
                          —<span className="na-note">{cell.note}</span>
                        </span>
                      ) : (
                        <>
                          <span className={cell.good ? 'good' : undefined}>{cell.value}</span>
                          {cell.note && <span className="cellnote">{cell.note}</span>}
                        </>
                      )}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      <section>
        <h2>Ce schimbă propunerea, punct cu punct</h2>
        <p className="lede">
          Cinci corecturi. Fiecare repară un defect pe care instrumentul îl arată în datele
          publicate, iar fiecare defect trimite la celula sau articolul din care provine. Nicio
          corectură nu mută un salariu față de altul.
        </p>
        <ol className="patches">
          {proposal.patches.map((patch) => {
            const effect = effects.find((e) => e.patchId === patch.id);
            return (
              <li key={patch.id} className="card patch">
                <h3>{patch.title}</h3>
                <p>{patch.rationale}</p>
                {patch.expectedEffect && <p className="effect">{patch.expectedEffect}</p>}
                {effect && (
                  <p className="touched">
                    {[
                      effect.positionsTouched && `${ro(effect.positionsTouched)} funcții`,
                      effect.variantsTouched && `${ro(effect.variantsTouched)} variante`,
                      effect.gradesTouched && `${ro(effect.gradesTouched)} grade`,
                      effect.supplementsTouched && `${ro(effect.supplementsTouched)} sporuri`,
                    ]
                      .filter(Boolean)
                      .join(' · ') || 'nicio modificare'}
                  </p>
                )}
              </li>
            );
          })}
        </ol>
      </section>

      <section>
        <h2>Verifică singur</h2>
        <p className="lede">
          Fiecare cifră de mai sus vine dintr-un fișier public, iar fiecare număr din{' '}
          <code>data/</code> poartă documentul și celula din care provine.
        </p>
        <div className="tabgroup">
          <button onClick={() => onOpen('structure')}>Forma sistemului, în detaliu</button>
          <button onClick={() => onOpen('payslip')}>Calculează un fluturaș</button>
        </div>
      </section>
    </>
  );
}
