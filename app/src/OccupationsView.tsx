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
  const [showLegal, setShowLegal] = useState(false);
  const [withCap, setWithCap] = useState(true);

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
      withCap && r.roCapped ? r.roCapped.q3 / 100 / benchmarks.roMedianBase : 0,
      r.roQ3 !== null ? r.roQ3 / 100 / benchmarks.roMedianBase : 0,
      r.dkRatio?.q3 ?? 0,
    ]);
    return Math.max(...all, 2.5) * 1.04;
  }, [resolved, benchmarks.roMedianBase, showLegal, withCap]);

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
        <strong>Cifra daneză include sporurile. Cea românească, doar dacă bifezi.</strong> Pentru
        medici, asistenți sau profesori Danemarca nu are grilă — salariul se negociază peste un
        minim din contractul colectiv, iar ce se publică sunt câștiguri efective. Ca să fie o
        comparație corectă, partea românească trebuie să primească și ea sporurile.
        <details>
          <summary>Ce spune de fapt plafonul de 20%</summary>
          <p>
            Art. 21 alin. (2) plafonează suma sporurilor la 20% din suma salariilor de bază —{' '}
            <strong>pe ordonator principal de credite și pe sursă de finanțare, nu pe persoană</strong>.
            Este o medie a instituției: un om poate trece binișor peste 20%, dacă altul stă sub.
          </p>
          <p>
            În plus, legea scoate din plafon o listă lungă: munca de noapte (25%), orele
            suplimentare (75–100%), sporul pentru handicap (15% din valoarea de referință), turele
            din sănătate (15%), izolarea în Delta Dunării (15%), administrarea fondurilor europene
            (până la 40%) și premiul de performanță (10–20%, cu plafonul lui separat de 4%). Sporul
            pentru proiecte europene intră doar cu partea cofinanțată din buget. Practic, în plafon
            rămân trei: controlul financiar preventiv, condițiile periculoase și capacitatea
            fiscal-bugetară locală.
          </p>
          <p>
            Bara „cu sporuri în plafon” de mai jos adaugă exact 20% peste bază. Este o ilustrare a
            ce implică plafonul, nu un drept al nimănui — iar sporurile exceptate pot urca peste ea.
          </p>
        </details>
      </div>

      <section>
        <div className="card controls occ-controls">
          <label className="claim">
            <input type="checkbox" checked={withCap} onChange={() => setWithCap((v) => !v)} />
            <span>
              Adaugă sporurile în plafon la partea românească (+20%) — altfel se compară baza
              românească cu câștigul danez cu tot cu sporuri
            </span>
          </label>
          <label className="claim">
            <input type="checkbox" checked={showLegal} onChange={() => setShowLegal((v) => !v)} />
            <span>Arată și intervalul legal complet al bazei (bara palidă)</span>
          </label>
          <div className="occ-key">
            <span><i className="k-ro-solid" /> România, salariul de bază</span>
            {withCap && <span><i className="k-ro-cap" /> + sporuri în plafon (20%)</span>}
            {showLegal && <span><i className="k-ro-faint" /> tot ce permite legea, la bază</span>}
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
                             withCap={withCap} benchmarks={benchmarks} rates={rates} />
            ))}
          </div>
        </section>
      ))}

      <section>
        <h2>Din ce e făcut salariul</h2>
        <p className="lede">
          Danemarca plătește spor de condiții acolo unde munca chiar diferă — ture, îngrijire,
          poliție — și aproape deloc la birou. România pune același plafon de 20% peste toată
          lumea. Nu e o diferență de mărime, ci de proiectare.
        </p>
        <div className="card chart-scroll">
          <table className="data">
            <thead>
              <tr>
                <th>Meseria</th>
                <th className="num">Spor de condiții, Danemarca</th>
                <th className="num">Plafon românesc</th>
              </tr>
            </thead>
            <tbody>
              {resolved
                .filter((r) => r.dkComposition?.conditions !== undefined)
                .sort((a, b) => (b.dkComposition!.conditions ?? 0) - (a.dkComposition!.conditions ?? 0))
                .map((r) => {
                  const cond = r.dkComposition!.conditions ?? 0;
                  return (
                    <tr key={r.group.id}>
                      <td>{r.group.label}</td>
                      <td className="num">
                        <div className="mini-track">
                          <div className="mini-fill dk" style={{ width: `${(cond / 0.2) * 100}%` }} />
                        </div>
                        {(cond * 100).toLocaleString('ro-RO', { maximumFractionDigits: 1 })}%
                      </td>
                      <td className="num">
                        <div className="mini-track">
                          <div className="mini-fill ro" style={{ width: '100%' }} />
                        </div>
                        până la 20%
                      </td>
                    </tr>
                  );
                })}
            </tbody>
          </table>
        </div>
        <p className="cmp-foot">
          Partea daneză e cât se plătește efectiv; cea românească e cât permite legea. România nu
          publică defalcarea salariu de bază / sporuri pentru sectorul bugetar, deci nu poate fi
          măsurată la fel — iar asta e în sine o diferență între cele două sisteme.
        </p>
      </section>

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
  withCap,
  benchmarks,
  rates,
}: {
  row: ResolvedGroup;
  axisMax: number;
  showLegal: boolean;
  withCap: boolean;
  benchmarks: OccupationBenchmarks;
  rates: Rates;
}) {
  const pos = (v: number) => `${Math.min((v / axisMax) * 100, 100)}%`;
  const span = (a: number, b: number) => ({ left: pos(a), width: `${Math.max(((b - a) / axisMax) * 100, 0.6)}%` });

  const roQ1 = row.roQ1 !== null ? row.roQ1 / 100 / benchmarks.roMedianBase : null;
  const roQ3 = row.roQ3 !== null ? row.roQ3 / 100 / benchmarks.roMedianBase : null;
  const roMed = row.roMedian !== null ? row.roMedian / 100 / benchmarks.roMedianBase : null;
  const roCapQ1 = row.roCapped ? row.roCapped.q1 / 100 / benchmarks.roMedianBase : null;
  const roCapQ3 = row.roCapped ? row.roCapped.q3 / 100 / benchmarks.roMedianBase : null;
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
          {row.bandedPositions > 0 && (
            <span className="badge">±15% pe categoria unității</span>
          )}
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
            {withCap && roCapQ1 !== null && roCapQ3 !== null && (
              <div className="occ-cap" style={span(roCapQ1, roCapQ3)} />
            )}
            {roQ1 !== null && roQ3 !== null && <div className="occ-solid ro" style={span(roQ1, roQ3)} />}
            {roMed !== null && <span className="occ-tick" style={{ left: pos(roMed) }} />}
          </div>
          <span className="occ-value">
            {withCap && roCapQ1 !== null && roCapQ3 !== null
              ? `${times(roCapQ1)}–${times(roCapQ3)}`
              : roQ1 !== null && roQ3 !== null
                ? `${times(roQ1)}–${times(roQ3)}`
                : '—'}
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
            ? amountRange(
                (withCap && row.roCapped ? row.roCapped.q1 : row.roQ1) / 100,
                (withCap && row.roCapped ? row.roCapped.q3 : row.roQ3) / 100,
                'RON',
                rates,
              )
            : '—'}
          {withCap && <em className="occ-caphint"> cu sporuri în plafon</em>}
        </span>
        <span>
          <b>DK</b> {row.dk ? amountRange(row.dk.q1, row.dk.q3, 'DKK', rates) : '—'}
        </span>
      </div>

      <details className="why">
        <summary>Ce intră în grupă și de ce</summary>
        <p className="equiv-note">{row.group.basis}</p>
        {row.bandedPositions > 0 && (
          <p className="equiv-note">
            <strong>Coeficientul publicat e un mijloc, nu o sumă.</strong> Pentru{' '}
            {row.bandedPositions} dintre funcțiile din grupă, Anexa II Cap. II Art. 10 stabilește
            nivelul între −15% și +15% față de cifra din anexă, în funcție de categoria unității —
            diminuat la unitățile medico-sociale și ambulatorii, majorat la medicina legală.
            Categoriile se stabilesc prin hotărâre de Guvern, care încă nu există, deci salariul nu
            se poate calcula din lege: doar intervalul. Barele de mai sus includ banda.
          </p>
        )}
        <p className="equiv-note">
          <strong>În afara plafonului de 20%:</strong>{' '}
          {row.exemptSupplements
            .map((e) => `${e.name}${e.rate !== null ? ` (${Math.round(e.rate * 100)}%)` : ''}`)
            .join('; ')}
          . Acestea se adaugă peste bara de mai sus, dacă persoana le îndeplinește condițiile.
        </p>
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
