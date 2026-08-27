import { readFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

import { describe, expect, it } from 'vitest';

import { applyProposal } from './proposal';
import type { Proposal } from './proposal';
import { structure } from './structure';
import type { Regime } from './types';

const here = dirname(fileURLToPath(import.meta.url));
const BASE: Regime = JSON.parse(
  readFileSync(resolve(here, '../data/regimes/ro-draft-2026-07-16.json'), 'utf8'),
);
const PROPOSAL: Proposal = JSON.parse(
  readFileSync(resolve(here, '../data/proposals/propunere-v1.json'), 'utf8'),
);

const applied = applyProposal(BASE, PROPOSAL);
const before = structure(BASE);
const after = structure(applied.regime);

describe('the proposal is auditable', () => {
  it('every patch names a defect the base regime actually declares', () => {
    // A patch that fixes nothing recorded is a policy preference wearing a repair's
    // clothes. This test is what keeps the proposal honest as it grows.
    const declared = new Set(BASE.limitations.map((l) => l.id));
    for (const patch of PROPOSAL.patches) {
      expect(patch.fixes, `${patch.id} must name what it fixes`).toBeTruthy();
      expect(declared, `${patch.id} fixes an unknown limitation`).toContain(patch.fixes!);
    }
  });

  it('leaves the base regime untouched', () => {
    expect(BASE.id).toBe('ro-draft-2026-07-16');
    expect(before.distinctValues).toBeGreaterThan(1000);
    expect(applied.regime.positions).not.toBe(BASE.positions);
  });

  it('reports what each patch touched', () => {
    expect(applied.effects.map((e) => e.patchId)).toEqual(PROPOSAL.patches.map((p) => p.id));
    expect(applied.effects.some((e) => e.variantsTouched > 0)).toBe(true);
  });
});

describe('each patch fixes its stated defect', () => {
  it('rounding collapses the back-solved coefficients', () => {
    expect(before.backSolvedShare).toBeGreaterThan(0.6);
    expect(after.backSolvedShare).toBe(0);
    expect(after.roundedShare).toBe(1);
    expect(after.distinctValues).toBeLessThan(before.distinctValues);
  });

  it('contiguous bands leave no coefficient without a grade', () => {
    expect(before.variantsInGaps).toBeGreaterThan(0);
    expect(after.variantsInGaps).toBe(0);
  });

  it('collapsing the schedule makes the declared ratio the ratio in force', () => {
    // The base grid reaches 1:8 only in 2031; the proposal holds the top at its first-year
    // value, so there is one span rather than five.
    expect(before.spanByPeriod.length).toBeGreaterThan(1);
    expect(after.spanByPeriod.length).toBe(0);
    expect(after.span.max).toBeLessThan(before.span.max);
  });

  it('closing the loopholes makes the ceiling bind', () => {
    const cap = applied.regime.caps.find((c) => c.id === 'cap-sporuri-20')!;
    const exempt = new Set(cap.numerator?.exclude ?? []);
    for (const id of ['administrare-resurse-europene', 'izolare-delta', 'capacitate-fiscal-bugetara']) {
      expect(exempt.has(id), `${id} should no longer be exempt`).toBe(false);
      expect(applied.regime.supplements.find((s) => s.id === id)!.countsToCap).toBe(true);
    }
    // Time actually worked outside hours stays exempt: it compensates hours, not status.
    expect(exempt.has('noapte')).toBe(true);
  });

  it('unifying seniority puts every execution position on one ladder', () => {
    const banded = (r: Regime) =>
      r.positions.filter((p) => p.variants.some((v) => v.dims?.vechime !== undefined)).length;
    expect(banded(BASE)).toBeGreaterThan(0);
    expect(banded(applied.regime)).toBeLessThan(banded(BASE));
  });
});

describe('the proposal does not quietly change pay policy', () => {
  it('keeps the same positions and the same reference value', () => {
    expect(applied.regime.positions.length).toBe(BASE.positions.length);
    expect(applied.regime.reference.amount).toEqual(BASE.reference.amount);
    expect(applied.regime.grades.length).toBe(BASE.grades.length);
  });

  it('every variant is uniquely addressable', () => {
    // Without this the next assertion silently compares the wrong pair, and worse,
    // payslip() picks the first match: 233 positions once carried indistinguishable
    // variants, including four tiers of local authority spanning 4,47 down to 2,47 under
    // one code. A director in the smallest commune would have been priced at the
    // largest city's rate.
    for (const regime of [BASE, applied.regime]) {
      for (const position of regime.positions) {
        const signatures = position.variants.map((v) => JSON.stringify(v.dims ?? {}));
        expect(new Set(signatures).size, `${regime.id} ${position.code} has ambiguous variants`)
          .toBe(signatures.length);
      }
    }
  });

  it('moves no coefficient by more than rounding', () => {
    // Rounding to two decimals is the only edit that touches a value, so nothing may
    // move by more than half a hundredth. A larger move would be a pay decision.
    const baseByCode = new Map(BASE.positions.map((p) => [p.code, p]));
    let worst = 0;
    for (const position of applied.regime.positions) {
      const original = baseByCode.get(position.code)!;
      for (const variant of position.variants) {
        if (typeof variant.value !== 'number') continue;
        const match = original.variants.find(
          (v) => JSON.stringify(v.dims ?? {}) === JSON.stringify(variant.dims ?? {}),
        );
        if (!match || typeof match.value !== 'number') continue;
        worst = Math.max(worst, Math.abs(match.value - variant.value));
      }
    }
    // Half of the last retained decimal is exactly 0,005, which binary floating point
    // cannot represent — hence the epsilon. The bound is the rounding rule, not a fudge.
    expect(worst).toBeLessThanOrEqual(0.005 + 1e-9);
  });

  it('keeps the floor of the grid exactly where it was', () => {
    expect(after.span.min).toBe(before.span.min);
  });
});
