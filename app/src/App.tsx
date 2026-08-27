import { useCallback, useEffect, useMemo, useState } from 'react';

import { applyProposal } from '../../engine/proposal';
import type { AppliedProposal, Proposal } from '../../engine/proposal';
import { decodeScenario, encodeScenario } from '../../engine/scenario';
import type { Scenario } from '../../engine/scenario';
import type { EnvelopeBaseline } from '../../engine/envelope';
import type { Crosswalk, Regime } from '../../engine/types';
import CompareView from './CompareView';
import EnvelopeView from './EnvelopeView';
import EquivalenceView from './EquivalenceView';
import PayslipView from './PayslipView';
import StructureView from './StructureView';

const AVAILABLE = ['ro-draft-2026-07-16', 'dk-stat-2026'];
const PROPOSAL_ID = 'propunere-v1';
const CROSSWALK_ID = 'ro-draft-2026-07-16--dk-stat-2026';
const FX_ID = 'ecb-fx';
const BENCHMARKS_ID = 'benchmarks';
const FISCAL_ID = 'eurostat-compensation-2026-08';
const HEADCOUNT_ID = 'posturi-ocupate-2026-06';

/**
 * The hash is the state. There is no store: every control writes a scenario into
 * location.hash and the app renders whatever the hash says, so the back button works and
 * any view is a link someone can paste into an argument.
 */
function useHashScenario(): [Scenario, (next: Scenario) => void] {
  const [scenario, setScenario] = useState<Scenario>(() => decodeScenario(location.hash));

  useEffect(() => {
    const onHash = () => setScenario(decodeScenario(location.hash));
    addEventListener('hashchange', onHash);
    return () => removeEventListener('hashchange', onHash);
  }, []);

  const update = useCallback((next: Scenario) => {
    const hash = encodeScenario(next);
    if (hash !== location.hash) location.hash = hash;
    setScenario(next);
  }, []);

  return [scenario, update];
}

export default function App() {
  const [scenario, setScenario] = useHashScenario();
  const [regimes, setRegimes] = useState<Record<string, Regime>>({});
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [proposal, setProposal] = useState<Proposal | null>(null);
  const [crosswalk, setCrosswalk] = useState<Crosswalk | null>(null);
  const [fx, setFx] = useState<{ dkkToRon: number; eurToRon: number; date: string } | null>(null);
  const [benchmarks, setBenchmarks] = useState<{
    avgRo: number; avgDk: number; govRo: number; govDk: number;
    floorRo: number; floorDk: number; year: string;
  } | null>(null);
  const [envelopeBaseline, setEnvelopeBaseline] = useState<EnvelopeBaseline | null>(null);

  const wanted = scenario.regimeIds;

  useEffect(() => {
    fetch(`${import.meta.env.BASE_URL}data/proposals/${PROPOSAL_ID}.json`)
      .then((r) => (r.ok ? r.json() : Promise.reject(new Error(`proposal: ${r.status}`))))
      .then(setProposal)
      .catch((e: Error) => setError(e.message));
  }, []);

  useEffect(() => {
    const base = import.meta.env.BASE_URL;
    fetch(`${base}data/crosswalks/${CROSSWALK_ID}.json`)
      .then((r) => (r.ok ? r.json() : Promise.reject(new Error(`crosswalk: ${r.status}`))))
      .then(setCrosswalk)
      .catch((e: Error) => setError(e.message));

    // The rate is read from the committed ECB document rather than hard-coded, so a
    // converted figure can always be traced to the day it was taken.
    fetch(`${base}data/fiscal/${FX_ID}.json`)
      .then((r) => (r.ok ? r.json() : Promise.reject(new Error(`fx: ${r.status}`))))
      .then((doc) => {
        const rate = (id: string) =>
          doc.series.find((s: { id: string }) => s.id === id)?.observations.at(-1)?.value;
        setFx({ dkkToRon: rate('dkk-ron'), eurToRon: rate('eur-ron'), date: doc.retrieved });
      })
      .catch((e: Error) => setError(e.message));

    fetch(`${base}data/fiscal/${BENCHMARKS_ID}.json`)
      .then((r) => (r.ok ? r.json() : Promise.reject(new Error(`benchmarks: ${r.status}`))))
      .then((doc) => {
        const val = (id: string) =>
          doc.series.find((s: { id: string }) => s.id === id)?.observations.at(-1)?.value;
        setBenchmarks({
          avgRo: val('avg-gross-monthly-ro'),
          avgDk: val('avg-gross-monthly-dk'),
          govRo: val('avg-gross-monthly-gov-ro'),
          govDk: val('avg-gross-monthly-gov-dk'),
          floorRo: val('floor-monthly-ro'),
          floorDk: val('floor-monthly-dk'),
          year: doc.retrieved,
        });
      })
      .catch((e: Error) => setError(e.message));

    // The envelope baseline is assembled from two published documents rather than stored:
    // the wage bill by COFOG function, and the count of filled posts behind it.
    Promise.all([
      fetch(`${base}data/fiscal/${FISCAL_ID}.json`).then((r) => r.json()),
      fetch(`${base}data/headcount/${HEADCOUNT_ID}.json`).then((r) => r.json()),
    ])
      .then(([fiscal, headcount]) => {
        const cash = (id: string) =>
          fiscal.series.find((s: { id: string }) => s.id === id)?.observations.at(-1)?.value ?? 0;
        // Millions of lei in the source; minor units in the engine.
        const toMinor = (millionsOfLei: number) => Math.round(millionsOfLei * 1e6 * 100);

        const families = fiscal.series.filter(
          (s: { dims?: Record<string, string>; geo: string }) =>
            s.geo === 'RO' && s.dims?.measure === 'cash' && s.dims?.family,
        );
        const byFamily = new Map<string, number>();
        for (const s of families) {
          const value = s.observations.at(-1)?.value ?? 0;
          byFamily.set(s.dims.family, (byFamily.get(s.dims.family) ?? 0) + value);
        }

        setEnvelopeBaseline({
          currency: 'RON',
          period: 'year',
          total: toMinor(cash('d1-total-mnac-ro')),
          byFamily: [...byFamily.entries()].map(([family, value]) => ({
            family,
            label: family,
            amount: toMinor(value),
          })),
          posts: headcount.totalPosts,
          gdp: toMinor(cash('gdp-nominal-ro')),
        });
      })
      .catch((e: Error) => setError(e.message));
  }, []);

  useEffect(() => {
    const needed = scenario.view === 'echivalente' ? AVAILABLE : wanted;
    const missing = needed.filter((id) => !regimes[id] && AVAILABLE.includes(id));
    if (missing.length === 0) return;
    Promise.all(
      missing.map((id) =>
        fetch(`${import.meta.env.BASE_URL}data/regimes/${id}.json`)
          .then((r) => (r.ok ? r.json() : Promise.reject(new Error(`${id}: ${r.status}`))))
          .then((doc: Regime) => [id, doc] as const),
      ),
    )
      .then((pairs) => setRegimes((prev) => ({ ...prev, ...Object.fromEntries(pairs) })))
      .catch((e: Error) => setError(e.message));
  }, [wanted, regimes, scenario.view]);

  const loaded = wanted.map((id) => regimes[id]).filter(Boolean);
  const ministry = regimes['ro-draft-2026-07-16'] ?? null;

  // The proposal is derived, never stored: applying five patches to the ministry's grid
  // is cheap, and keeping it derived means it cannot drift from the data it edits.
  const ours: AppliedProposal | null = useMemo(
    () => (ministry && proposal ? applyProposal(ministry, proposal) : null),
    [ministry, proposal],
  );

  const share = async () => {
    await navigator.clipboard?.writeText(location.href);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const toggleRegime = (id: string) => {
    const next = wanted.includes(id) ? wanted.filter((r) => r !== id) : [...wanted, id];
    setScenario({ ...scenario, regimeIds: next.length ? next : [AVAILABLE[0]] });
  };

  return (
    <div className="wrap">
      <nav className="tabs">
        <div className="tabgroup">
          <button
            className={scenario.view === 'compare' ? 'on' : ''}
            onClick={() => setScenario({ ...scenario, view: 'compare' })}
          >
            Comparație
          </button>
          <button
            className={scenario.view === 'echivalente' ? 'on' : ''}
            onClick={() => setScenario({ ...scenario, view: 'echivalente' })}
          >
            Echivalențe RO–DK
          </button>
          <button
            className={scenario.view === 'structure' ? 'on' : ''}
            onClick={() => setScenario({ ...scenario, view: 'structure' })}
          >
            Forma sistemului
          </button>
          <button
            className={scenario.view === 'envelope' ? 'on' : ''}
            onClick={() => setScenario({ ...scenario, view: 'envelope' })}
          >
            Plicul
          </button>
          <button
            className={scenario.view === 'payslip' ? 'on' : ''}
            onClick={() => setScenario({ ...scenario, view: 'payslip' })}
          >
            Fluturaș comparat
          </button>
        </div>
        {scenario.view === 'payslip' && (
          <div className="tabgroup regimes">
            {AVAILABLE.map((id) => (
              <label key={id} className="regime-toggle">
                <input
                  type="checkbox"
                  checked={wanted.includes(id)}
                  onChange={() => toggleRegime(id)}
                />
                <span>{id}</span>
              </label>
            ))}
            <button className="share" onClick={share}>
              {copied ? 'link copiat' : 'copiază linkul scenariului'}
            </button>
          </div>
        )}
      </nav>

      {error && <p className="loading">Nu s-au putut încărca datele: {error}</p>}
      {!error && loaded.length === 0 && <p className="loading">Se încarcă grila…</p>}

      {scenario.view === 'compare' && ministry && ours && proposal && (
        <CompareView
          ministry={ministry}
          ours={ours.regime}
          denmark={regimes['dk-stat-2026'] ?? null}
          proposal={proposal}
          effects={ours.effects}
          onOpen={(view) => setScenario({ ...scenario, view })}
        />
      )}
      {scenario.view === 'echivalente' &&
        ministry &&
        regimes['dk-stat-2026'] &&
        crosswalk &&
        fx &&
        benchmarks && (
          <EquivalenceView
            ro={ministry}
            dk={regimes['dk-stat-2026']}
            crosswalk={crosswalk}
            fx={fx}
            benchmarks={benchmarks}
          />
        )}
      {loaded.length > 0 && scenario.view === 'structure' && (
        <StructureView regime={regimes['ro-draft-2026-07-16'] ?? loaded[0]} />
      )}
      {scenario.view === 'envelope' && fx && (
        <EnvelopeView baseline={envelopeBaseline} rates={fx} />
      )}
      {loaded.length > 0 && scenario.view === 'payslip' && fx && (
        <PayslipView
          regimes={ours ? [...loaded, ours.regime] : loaded}
          scenario={scenario}
          onChange={setScenario}
          rates={fx}
        />
      )}

      <footer>
        Sursă: proiectul de lege MMFTSS din 16.07.2026 și anexele de coeficienți; pentru Danemarca,
        tabelele IDA din 01.04.2026. Fiecare număr din <code>data/</code> poartă documentul și
        articolul sau celula din care provine.{' '}
        <a href="https://github.com/CristianNichifor/public-pay-simulator">Cod și date</a>. Licență
        Apache-2.0.
      </footer>
    </div>
  );
}
