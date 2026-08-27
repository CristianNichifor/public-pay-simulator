import { useMemo, useState } from 'react';

import { payslip } from '../../engine/payslip';
import type { Crosswalk, CrosswalkLink, Regime } from '../../engine/types';

/** Convert into the currency the reader thinks in, at a rate that is on the record. */
export interface Fx {
  dkkToRon: number;
  eurToRon: number;
  date: string;
}

type Unit = 'RON' | 'EUR' | 'native';

const MONTHS_PER_YEAR = 12;

function fmt(amountMinor: number, currency: string): string {
  return (amountMinor / 100).toLocaleString('ro-RO', {
    style: 'currency',
    currency,
    maximumFractionDigits: 0,
  });
}

/**
 * Everything is shown per month. The Danish tables are annual and the Romanian ones
 * monthly, so one of them has to move; dividing the Danish year by twelve is the smaller
 * and more legible transformation.
 */
function toMonthlyRon(minor: number, regime: Regime, fx: Fx): number {
  const monthly = regime.reference.period === 'year' ? minor / MONTHS_PER_YEAR : minor;
  return regime.currency === 'DKK' ? monthly * fx.dkkToRon : monthly;
}

export default function EquivalenceView({
  ro,
  dk,
  crosswalk,
  fx,
}: {
  ro: Regime;
  dk: Regime;
  crosswalk: Crosswalk;
  fx: Fx;
}) {
  const [unit, setUnit] = useState<Unit>('RON');
  const [seniority, setSeniority] = useState(10);

  const rows = useMemo(
    () =>
      crosswalk.links.map((link) => {
        const roCode = link.from[0]?.positionCode;
        const dkCode = link.to[0]?.positionCode;
        const roPos = ro.positions.find((p) => p.code === roCode) ?? null;
        const dkPos = dkCode ? dk.positions.find((p) => p.code === dkCode) ?? null : null;

        const roSlip = roPos
          ? payslip({ positionCode: roPos.code, seniorityYears: seniority }, ro)
          : null;
        const dkSlip = dkPos
          ? payslip({ positionCode: dkPos.code, seniorityYears: seniority }, dk)
          : null;

        return { link, roPos, dkPos, roSlip, dkSlip };
      }),
    [crosswalk, ro, dk, seniority],
  );

  const show = (minor: number, regime: Regime): string => {
    if (unit === 'native') return fmt(regime.reference.period === 'year' ? minor / MONTHS_PER_YEAR : minor, regime.currency);
    const ron = toMonthlyRon(minor, regime, fx);
    return unit === 'RON' ? fmt(ron, 'RON') : fmt(ron / fx.eurToRon, 'EUR');
  };

  return (
    <>
      <header className="masthead">
        <h1>Cum s-ar numi și cât ar fi plătit, în celălalt sistem</h1>
        <p>
          Danemarca numește un post după ce face omul și ce pregătire îi cere: inginer, consultant
          specialist, șef de departament. Proiectul românesc îl numește după instituția care
          plătește și după statutul juridic: funcție publică de execuție, grad profesional superior,
          categoria înalților funcționari publici. Tabelul de mai jos pune funcțiile față în față și,
          unde cele două logici chiar diferă, propune denumirea pe care ar folosi-o piața muncii.
        </p>
      </header>

      <div className="disclaimer">
        <strong>Echivalările sunt judecăți editoriale, nu drepturi.</strong> Nicio autoritate nu le
        recunoaște. Fiecare rând spune pe ce se bazează și cât de sigură este, iar cele nesigure sunt
        marcate ca atare. Sumele sunt convertite la cursul de referință BCE din {fx.date}: 1 DKK ={' '}
        {fx.dkkToRon.toLocaleString('ro-RO', { maximumFractionDigits: 4 })} RON. Cursul spune cât de
        mare este un număr într-o monedă cunoscută, nu cât cumpără — prețurile daneze sunt
        substanțial mai mari, deci un salariu convertit nu înseamnă același trai.
      </div>

      <section>
        <h2>Comparația</h2>
        <div className="card controls equiv-controls">
          <label className="field">
            <span>Afișează sumele în</span>
            <select value={unit} onChange={(e) => setUnit(e.target.value as Unit)}>
              <option value="RON">lei (convertit)</option>
              <option value="EUR">euro (convertit)</option>
              <option value="native">moneda proprie fiecărui sistem</option>
            </select>
          </label>
          <label className="field">
            <span>Vechime presupusă: {seniority} ani</span>
            <input
              type="range"
              min={0}
              max={35}
              value={seniority}
              onChange={(e) => setSeniority(Number(e.target.value))}
            />
          </label>
        </div>

        <div className="equiv-list">
          {rows.map(({ link, roPos, dkPos, roSlip, dkSlip }) => (
            <article key={link.id ?? link.from[0]?.positionCode} className="card equiv">
              <div className="equiv-head">
                <span className={`rel rel-${link.relation}`}>{relationLabel(link.relation)}</span>
                {link.confidence === 'assumed' && <span className="rel rel-warn">echivalare slabă</span>}
                {link.disputed && <span className="rel rel-warn">contestabilă</span>}
              </div>

              <div className="equiv-grid">
                <div className="side ro">
                  <h4>România — proiectul MMFTSS</h4>
                  <p className="posname">{link.from.map((f) => f.title ?? f.positionCode).join(' · ')}</p>
                  {roPos && roSlip ? (
                    <>
                      <p className="amount">{show(roSlip.base, ro)}<span className="per">/lună</span></p>
                      <p className="detail">
                        coeficient {roPos.variants[0].value?.toString().slice(0, 8)} · {roPos.code}
                        {roSlip.seniority.bakedIn && ' · vechimea e inclusă în coeficient'}
                      </p>
                    </>
                  ) : (
                    <p className="detail">funcția nu a putut fi calculată</p>
                  )}
                </div>

                <div className="side dk">
                  <h4>Danemarca — sectorul de stat</h4>
                  {dkPos && dkSlip ? (
                    <>
                      <p className="posname">{dkPos.name}</p>
                      <p className="amount">{show(dkSlip.base, dk)}<span className="per">/lună</span></p>
                      <p className="detail">
                        sumă de bază 31.03.2012 × 1,265085 · {dkPos.code}
                      </p>
                    </>
                  ) : (
                    <>
                      <p className="posname missing">niciun post corespondent publicat</p>
                      <p className="detail">
                        tabelele IDA acoperă ingineri și academici; restul e plătit prin alte
                        contracte colective, care nu apar în această sursă
                      </p>
                    </>
                  )}
                </div>
              </div>

              {link.proposedName && (
                <p className="renamed">
                  <span className="renamed-tag">denumire aliniată pieței muncii</span>
                  {link.proposedName}
                </p>
              )}

              {link.evidence && (
                <ul className="evidence">
                  {link.evidence.map((e, i) => (
                    <li key={i}>{e}</li>
                  ))}
                </ul>
              )}
              {link.note && <p className="equiv-note">{link.note}</p>}
            </article>
          ))}
        </div>
      </section>

      <section>
        <h2>Ce lipsește ca să fie mai mult decât o judecată</h2>
        <ul className="needs">
          {(crosswalk.needs ?? []).map((need) => (
            <li key={need.document}>
              <strong>{need.document}</strong>
              <span>{need.why}</span>
            </li>
          ))}
        </ul>
      </section>
    </>
  );
}

function relationLabel(relation: CrosswalkLink['relation']): string {
  switch (relation) {
    case 'identity':
      return 'același post';
    case 'merge':
      return 'mai multe denumiri românești, un singur post danez';
    case 'split':
      return 'un post românesc, mai multe daneze';
    case 'regrade':
      return 'post apropiat, nu identic';
    case 'abolished':
      return 'fără corespondent în sursa daneză';
    default:
      return relation;
  }
}
