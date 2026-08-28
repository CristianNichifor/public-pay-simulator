import { useMemo, useState } from 'react';

import { resolveGroups } from '../../engine/occupations';
import type { DkOccupation, GroupsDocument, ResolvedGroup } from '../../engine/occupations';
import type { Regime } from '../../engine/types';
import { amountLine, amountRange } from './money';
import type { Rates } from './money';

const times = (n: number) =>
  `${n.toLocaleString('ro-RO', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}×`;

export interface OccupationBenchmarks {
  /** Median base salary across the Romanian grid — the middle of its own system. */
  roMedianBase: number;
  /** Median earnings of all Danish public employees — the middle of its own system. */
  dkMedian: number;
}

export default function OccupationsView({
  regime,
  groups,
  danish,
  benchmarks,
  rates,
}: {
  regime: Regime;
  groups: GroupsDocument;
  danish: DkOccupation[];
  benchmarks: OccupationBenchmarks;
  rates: Rates;
}) {
  const [showLegal, setShowLegal] = useState(true);

  const resolved = useMemo(
    () =>
      resolveGroups(regime, groups, danish, {
        roPublicAverage: benchmarks.roMedianBase,
        dkPublicMedian: benchmarks.dkMedian,
      }),
    [regime, groups, danish, benchmarks],
  );

  const bySector = useMemo(() => {
    const map = new Map<string, ResolvedGroup[]>();
    for (const r of resolved) {
      const list = map.get(r.group.sector) ?? [];
      list.push(r);
      map.set(r.group.sector, list);
    }
    return [...map.entries()];
  }, [resolved]);

  // One axis for the whole page, so a bar in health is directly comparable with one in
  // administration. Per-row scaling would make every occupation look the same width.
  const axisMax = useMemo(() => {
    const all = resolved.flatMap((r) => [
      showLegal && r.roMax !== null ? r.roMax / 100 / benchmarks.roMedianBase : 0,
      r.dkRatio?.q3 ?? 0,
    ]);
    return Math.max(...all, 2.5) * 1.04;
  }, [resolved, benchmarks.roMedianBase, showLegal]);

  return (
    <>
      <header className="masthead">
        <h1>Aceeași meserie, două sisteme</h1>
        <p>
          Funcțiile din proiect, regrupate după meserie și nu după anexă, apoi puse lângă ce
          câștigă aceeași meserie în sectorul public danez. Fiecare bară e raportată la mijlocul
          propriului sistem, deci se pot compara direct.
        </p>
      </header>

      <div className="disclaimer">
        <strong>România arată ce permite legea, Danemarca ce câștigă oamenii.</strong> Pentru medici,
        asistenți sau profesori Danemarca nu are grilă — salariul se negociază peste un minim din
        contractul colectiv, iar cifrele publicate sunt câștiguri efective, cu sporuri. Partea
        românească e salariul de bază, înainte de sporuri. Asimetria nu e o eroare de date: e chiar
        deosebirea dintre cele două sisteme.
      </div>

      <section>
        <div className="card controls occ-controls">
          <label className="claim">
            <input type="checkbox" checked={showLegal} onChange={() => setShowLegal((v) => !v)} />
            <span>Arată și intervalul legal complet al României (bara palidă)</span>
          </label>
          <div className="occ-key">
            <span><i className="k-ro-solid" /> România, jumătatea din mijloc a funcțiilor</span>
            {showLegal && <span><i className="k-ro-faint" /> tot ce permite legea</span>}
            <span><i className="k-dk" /> Danemarca, cuartilele angajaților</span>
            <span><i className="k-mid" /> mijlocul fiecărui sistem</span>
          </div>
        </div>
      </section>

      {bySector.map(([sector, rows]) => (
        <section key={sector}>
          <h2>{sector}</h2>
          <div className="occ-list">
            {rows.map((r) => (
              <OccupationRow key={r.group.id} row={r} axisMax={axisMax} showLegal={showLegal}
                             benchmarks={benchmarks} rates={rates} />
            ))}
          </div>
        </section>
      ))}

      <section>
        <h2>Cum au fost făcute grupele</h2>
        <div className="card readme-grid">
          <p>
            Proiectul împarte funcțiile pe anexe, care urmează angajatorul și statutul juridic.
            Statistica daneză le împarte pe meserii, ca piața muncii. Grupele de aici urmează
            meseria, iar fiecare spune ce regulă a folosit și câte funcții a prins — ca să poată fi
            contestată gruparea, nu doar cifra.
          </p>
          <p>
            Reperul românesc este mediana salariului de bază din toată grila,{' '}
            {amountLine(benchmarks.roMedianBase, 'RON', rates)}. Cel danez este mediana câștigului
            tuturor angajaților publici, {amountLine(benchmarks.dkMedian, 'DKK', rates)}. Fiecare
            sistem e măsurat cu propria lui unitate, iar raportul e ce se compară.
          </p>
        </div>
      </section>
    </>
  );
}

function OccupationRow({
  row,
  axisMax,
  showLegal,
  benchmarks,
  rates,
}: {
  row: ResolvedGroup;
  axisMax: number;
  showLegal: boolean;
  benchmarks: OccupationBenchmarks;
  rates: Rates;
}) {
  const pos = (v: number) => `${Math.min((v / axisMax) * 100, 100)}%`;
  const span = (a: number, b: number) => ({ left: pos(a), width: `${Math.max(((b - a) / axisMax) * 100, 0.6)}%` });

  const roQ1 = row.roQ1 !== null ? row.roQ1 / 100 / benchmarks.roMedianBase : null;
  const roQ3 = row.roQ3 !== null ? row.roQ3 / 100 / benchmarks.roMedianBase : null;
  const roMed = row.roMedian !== null ? row.roMedian / 100 / benchmarks.roMedianBase : null;
  const roLo = row.roMin !== null ? row.roMin / 100 / benchmarks.roMedianBase : null;
  const roHi = row.roMax !== null ? row.roMax / 100 / benchmarks.roMedianBase : null;

  const weak = row.group.confidence === 'assumed' || row.group.disputed;

  return (
    <article className="card occ-row">
      <header className="occ-head">
        <div>
          <h3>{row.group.label}</h3>
          <p className="occ-proposed">{row.group.proposedName}</p>
        </div>
        <div className="badges">
          <span className="badge">{row.matched.length} funcții</span>
          {weak && <span className="badge weak">echivalare slabă</span>}
        </div>
      </header>

      <div className="occ-bars">
        <div className="occ-line">
          <span className="occ-label">România</span>
          <div className="occ-track">
            <span className="occ-mid" style={{ left: pos(1) }} />
            {showLegal && roLo !== null && roHi !== null && (
              <div className="occ-faint" style={span(roLo, roHi)} />
            )}
            {roQ1 !== null && roQ3 !== null && <div className="occ-solid ro" style={span(roQ1, roQ3)} />}
            {roMed !== null && <span className="occ-tick" style={{ left: pos(roMed) }} />}
          </div>
          <span className="occ-value">
            {roQ1 !== null && roQ3 !== null ? `${times(roQ1)}–${times(roQ3)}` : '—'}
          </span>
        </div>

        <div className="occ-line">
          <span className="occ-label">Danemarca</span>
          <div className="occ-track">
            <span className="occ-mid" style={{ left: pos(1) }} />
            {row.dkRatio && <div className="occ-solid dk" style={span(row.dkRatio.q1, row.dkRatio.q3)} />}
            {row.dkRatio && <span className="occ-tick" style={{ left: pos(row.dkRatio.median) }} />}
          </div>
          <span className="occ-value">
            {row.dkRatio ? `${times(row.dkRatio.q1)}–${times(row.dkRatio.q3)}` : '—'}
          </span>
        </div>
      </div>

      <div className="occ-money">
        <span>
          <b>RO</b>{' '}
          {row.roQ1 !== null && row.roQ3 !== null
            ? amountRange(row.roQ1 / 100, row.roQ3 / 100, 'RON', rates)
            : '—'}
        </span>
        <span>
          <b>DK</b> {row.dk ? amountRange(row.dk.q1, row.dk.q3, 'DKK', rates) : '—'}
        </span>
      </div>

      <details className="why">
        <summary>Ce intră în grupă și de ce</summary>
        <p className="equiv-note">{row.group.basis}</p>
        <ul className="matched">
          {row.matched.slice(0, 14).map((m) => (
            <li key={m.code}>
              {m.name} <code>{m.code}</code>
            </li>
          ))}
          {row.matched.length > 14 && <li className="more">…și încă {row.matched.length - 14}</li>}
        </ul>
      </details>
    </article>
  );
}
