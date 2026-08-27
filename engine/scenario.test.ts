import { describe, expect, it } from 'vitest';

import { decodeScenario, encodeScenario, personFrom } from './scenario';
import type { Scenario } from './scenario';

describe('scenario codec', () => {
  const scenario: Scenario = {
    view: 'payslip',
    regimeIds: ['ro-draft-2026-07-16', 'dk-stat-2026'],
    positionCode: '81.10104001.01',
    seniorityYears: 12,
    dims: { institutionLevel: 'II' },
    claims: [
      { supplementId: 'cfp' },
      { supplementId: 'fonduri-externe', rate: 0.4, externallyFundedShare: 0.85 },
    ],
  };

  it('round-trips a full scenario', () => {
    expect(decodeScenario(encodeScenario(scenario))).toEqual(scenario);
  });

  it('stays legible in the address bar', () => {
    // A link used in a public argument has to be readable and hand-editable. An opaque
    // base64 blob would be shorter and useless for that.
    const hash = encodeScenario(scenario);
    expect(hash).toContain('#/payslip?');
    expect(hash).toContain('p=81.10104001.01');
    expect(hash).toContain('y=12');
    expect(decodeURIComponent(hash)).toContain('s=cfp,fonduri-externe:0.4:0.85');
  });

  it('falls back to a valid scenario rather than throwing on rubbish', () => {
    const result = decodeScenario('#/nonsense?r=&y=abc');
    expect(result.view).toBe('structure');
    expect(result.regimeIds).toEqual(['ro-draft-2026-07-16']);
    expect(result.seniorityYears).toBeUndefined();
  });

  it('handles an empty hash', () => {
    expect(decodeScenario('')).toEqual({
      view: 'structure',
      regimeIds: ['ro-draft-2026-07-16'],
      positionCode: undefined,
      seniorityYears: undefined,
      dims: undefined,
      claims: undefined,
      asOf: undefined,
      extra: undefined,
    });
  });

  it('preserves parameters it does not understand', () => {
    // A link produced by a later version must not silently lose information when an
    // older build reads it and writes it back.
    const decoded = decodeScenario('#/payslip?r=ro-draft-2026-07-16&zz=future');
    expect(decoded.extra).toEqual({ zz: 'future' });
    expect(encodeScenario(decoded)).toContain('zz=future');
  });

  it('keeps seniority zero distinguishable from unset', () => {
    expect(decodeScenario('#/payslip?y=0').seniorityYears).toBe(0);
    expect(decodeScenario('#/payslip').seniorityYears).toBeUndefined();
  });

  it('builds a person, or nothing when no position is chosen', () => {
    expect(personFrom(scenario)).toMatchObject({
      positionCode: '81.10104001.01',
      seniorityYears: 12,
    });
    expect(personFrom({ view: 'payslip', regimeIds: [] })).toBeNull();
  });
});
