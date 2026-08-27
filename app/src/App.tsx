import { useCallback, useEffect, useState } from 'react';

import { decodeScenario, encodeScenario } from '../../engine/scenario';
import type { Scenario } from '../../engine/scenario';
import type { Regime } from '../../engine/types';
import PayslipView from './PayslipView';
import StructureView from './StructureView';

const AVAILABLE = ['ro-draft-2026-07-16', 'dk-stat-2026'];

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

  const wanted = scenario.regimeIds;

  useEffect(() => {
    const missing = wanted.filter((id) => !regimes[id] && AVAILABLE.includes(id));
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
  }, [wanted, regimes]);

  const loaded = wanted.map((id) => regimes[id]).filter(Boolean);

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
            className={scenario.view === 'structure' ? 'on' : ''}
            onClick={() => setScenario({ ...scenario, view: 'structure' })}
          >
            Forma sistemului
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

      {loaded.length > 0 && scenario.view === 'structure' && (
        <StructureView regime={regimes['ro-draft-2026-07-16'] ?? loaded[0]} />
      )}
      {loaded.length > 0 && scenario.view === 'payslip' && (
        <PayslipView regimes={loaded} scenario={scenario} onChange={setScenario} />
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
