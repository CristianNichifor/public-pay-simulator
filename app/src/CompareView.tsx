import { useMemo } from 'react';

import type { PatchEffect, Proposal } from '../../engine/proposal';
import { structure } from '../../engine/structure';
import type { StructureMetrics } from '../../engine/structure';
import type { Regime } from '../../engine/types';

function ro(n: number): string {
  return n.toLocaleString('ro-RO');
}
function pct(n: number): string {
  return `${(n * 100).toLocaleString('ro-RO', { maximumFractionDigits: 1 })}%`;
}
function ratio(n: number): string {
  return `1:${n.toLocaleString('ro-RO', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

type Col = 'ministry' | 'ours' | 'dk';

interface Cell {
  /** What the bar is drawn from. null renders as an explained dash, never as zero. */
  n: number | null;
  text: string;
  note?: string;
}
interface Row {
  label: string;
  hint: string;
  /** Which direction is an improvement, for the one mark of emphasis per row. */
  better: 'lower' | 'higher' | 'none';
  cells: Record<Col, Cell>;
}

const COLUMNS: Array<{ key: Col; title: string; sub: string }> = [
  { key: 'ministry', title: 'Proiectul MMFTSS', sub: '16.07.2026' },
  { key: 'ours', title: 'Propunerea alternativă', sub: 'cinci corecturi' },
  { key: 'dk', title: 'Danemarca', sub: 'sectorul de stat' },
];

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
  onOpen: (view: 'structure' | 'payslip' | 'echivalente') => void;
}) {
  const m = useMemo(() => structure(ministry), [ministry]);
  const o = useMemo(() => structure(ours), [ours]);
  const d: StructureMetrics | null = useMemo(
    () => (denmark ? structure(denmark) : null),
    [denmark],
  );

  // Denmark's figures are computed from its own imported tables, not typed in by hand,
  // so they move if the import changes and cannot quietly go stale.
  const dkCell = (n: number | null, text: string, note?: string): Cell =>
    d ? { n, text, note } : { n: null, text: '—', note: 'regimul danez nu e încărcat' };

  const rows: Row[] = [
    {
      label: 'Coeficienți retro-calculați',
      hint: 'valori cu 14 zecimale sau mai multe — reziduul unei împărțiri, nu o decizie',
      better: 'lower',
      cells: {
        ministry: { n: m.backSolvedShare, text: pct(m.backSolvedShare) },
        ours: { n: o.backSolvedShare, text: pct(o.backSolvedShare) },
        dk: dkCell(d?.backSolvedShare ?? 0, pct(d?.backSolvedShare ?? 0), 'treptele poartă direct suma'),
      },
    },
    {
      label: 'Câte numere trebuie decise',
      hint: 'valori distincte în toată grila',
      better: 'lower',
      cells: {
        ministry: { n: m.distinctValues, text: ro(m.distinctValues) },
        ours: {
          n: o.distinctValues,
          text: ro(o.distinctValues),
          note: `cu ${ro(m.distinctValues - o.distinctValues)} mai puține`,
        },
        dk: dkCell(d?.distinctValues ?? null, ro(d?.distinctValues ?? 0), 'atâtea sume distincte apar în tabele'),
      },
    },
    {
      label: 'Posturi numite în grilă',
      hint: 'câte denumiri distincte de post apar în documentul oficial',
      better: 'none',
      cells: {
        ministry: {
          n: m.positions,
          text: ro(m.positions),
          note: `${ro(m.assimilation.mergedPositions)} comasează mai multe denumiri`,
        },
        ours: { n: o.positions, text: ro(o.positions) },
        dk: dkCell(d?.positions ?? null, ro(d?.positions ?? 0), 'documentul IDA numește circa 20'),
      },
    },
    {
      label: 'Coeficienți fără grad salarial',
      hint: 'cad în golurile dintre intervalele din Art. 9 alin. (2)',
      better: 'lower',
      cells: {
        ministry: { n: m.variantsInGaps, text: ro(m.variantsInGaps) },
        ours: { n: o.variantsInGaps, text: ro(o.variantsInGaps) },
        dk: dkCell(0, '0', 'fiecare treaptă e o sumă — deși scara sare peste treapta 3'),
      },
    },
    {
      label: 'Distanța dintre cel mai mic și cel mai mare',
      hint: 'Art. 5 o fixează la 1 la 8',
      better: 'none',
      cells: {
        ministry: {
          n: m.spanByPeriod[0]?.ratio ?? m.span.ratio,
          text: ratio(m.spanByPeriod[0]?.ratio ?? m.span.ratio),
          note: `urcă la ${ratio(m.span.ratio)} în 2031`,
        },
        ours: { n: o.span.ratio, text: ratio(o.span.ratio), note: 'fix, nu se mai schimbă' },
        dk: dkCell(d?.span.ratio ?? null, ratio(d?.span.ratio ?? 0), 'nu e declarat în lege, rezultă din tabele'),
      },
    },
    {
      label: 'Ani până se aplică grila declarată',
      hint: 'câte coloane anuale trebuie parcurse',
      better: 'lower',
      cells: {
        ministry: { n: m.spanByPeriod.length, text: ro(m.spanByPeriod.length) },
        ours: { n: 0, text: '0' },
        dk: dkCell(0, '0', 'treptele se renegociază, nu se eșalonează în lege'),
      },
    },
  ];

  return (
    <>
      <header className="masthead">
        <h1>Trei feluri de a plăti statul</h1>
        <p>
          Ce propune ministerul, ce s-ar schimba cu cinci corecturi, și cum arată sistemul danez.
          Aceleași șase întrebări puse tuturor.
        </p>
      </header>

      <section className="hero">
        <div className="hero-figure">
          <span className="from">{ro(m.distinctValues)}</span>
          <span className="arrow">→</span>
          <span className="to">{ro(o.distinctValues)}</span>
        </div>
        <p className="hero-text">
          Atâtea numere distincte are grila acum, și atâtea i-ar rămâne dacă ar fi rotunjită la două
          zecimale. Restul de {ro(m.distinctValues - o.distinctValues)} nu sunt decizii de politică
          salarială, ci resturi ale unei împărțiri: grila a fost dedusă din salariile existente.
        </p>
      </section>

      <section>
        <div className="cmp">
          <div className="cmp-head">
            <div />
            {COLUMNS.map((c) => (
              <div key={c.key} className={`cmp-col col-${c.key}`}>
                <span className="col-title">{c.title}</span>
                <span className="col-sub">{c.sub}</span>
              </div>
            ))}
          </div>

          {rows.map((row) => {
            const values = COLUMNS.map((c) => row.cells[c.key].n).filter(
              (n): n is number => n !== null,
            );
            const max = Math.max(...values, 1e-9);
            const best =
              row.better === 'none'
                ? null
                : row.better === 'lower'
                  ? Math.min(...values)
                  : Math.max(...values);

            return (
              <div key={row.label} className="cmp-row">
                <div className="cmp-label">
                  <strong>{row.label}</strong>
                  <span className="hint">{row.hint}</span>
                </div>
                {COLUMNS.map((c) => {
                  const cell = row.cells[c.key];
                  const isBest = best !== null && cell.n !== null && cell.n === best;
                  return (
                    <div key={c.key} className={`cmp-cell col-${c.key}`}>
                      <div className="cmp-track">
                        <div
                          className={`cmp-fill fill-${c.key}`}
                          style={{
                            width: cell.n === null ? 0 : `${Math.max((cell.n / max) * 100, 2)}%`,
                          }}
                        />
                      </div>
                      <span className={`cmp-value${isBest ? ' best' : ''}`}>{cell.text}</span>
                      {cell.note && <span className="cmp-note">{cell.note}</span>}
                    </div>
                  );
                })}
              </div>
            );
          })}
        </div>
        <p className="cmp-foot">
          Barele din fiecare rând sunt proporționale între ele, nu între rânduri. Unde nu există
          cifră, scrie de ce.
        </p>
      </section>

      <section>
        <h2>Cele cinci corecturi</h2>
        <p className="lede">{proposal.notPolicy}</p>
        <ol className="patches">
          {proposal.patches.map((patch) => {
            const effect = effects.find((e) => e.patchId === patch.id);
            const touched = effect
              ? [
                  effect.positionsTouched && `${ro(effect.positionsTouched)} funcții`,
                  effect.variantsTouched && `${ro(effect.variantsTouched)} variante`,
                  effect.gradesTouched && `${ro(effect.gradesTouched)} grade`,
                  effect.supplementsTouched && `${ro(effect.supplementsTouched)} sporuri`,
                ]
                  .filter(Boolean)
                  .join(' · ')
              : '';
            return (
              <li key={patch.id} className="card patch">
                <div className="patch-head">
                  <h3>{patch.title}</h3>
                  {touched && <span className="touched">{touched}</span>}
                </div>
                {patch.expectedEffect && <p className="effect">{patch.expectedEffect}</p>}
                <details>
                  <summary>De ce</summary>
                  <p>{patch.rationale}</p>
                </details>
              </li>
            );
          })}
        </ol>
      </section>

      <section>
        <h2>Mai departe</h2>
        <div className="next-grid">
          <button className="next" onClick={() => onOpen('echivalente')}>
            <strong>Echivalențe RO–DK</strong>
            <span>Cât valorează fiecare post față de salariul mediu din țara lui</span>
          </button>
          <button className="next" onClick={() => onOpen('structure')}>
            <strong>Forma sistemului</strong>
            <span>Distribuția zecimalelor, golurile dintre grade, comasarea funcțiilor</span>
          </button>
          <button className="next" onClick={() => onOpen('payslip')}>
            <strong>Fluturaș comparat</strong>
            <span>Un om anume, calculat sub fiecare regim, cu linkul scenariului</span>
          </button>
        </div>
      </section>
    </>
  );
}
