import { describe, expect, it } from 'vitest';

import { add, compose, defenseMultiplier, marginal, remove } from './ied';

describe('IED composition (formulas.md §1.8)', () => {
	it('composes on the complement, not additively', () => {
		// The section's own example: 20% hyper + 20% 5th job = 36%, not 40%.
		expect(compose([0.2, 0.2])).toBeCloseTo(0.36, 10);
	});

	it('composes an arbitrary number of sources', () => {
		expect(compose([0.3, 0.35, 0.4])).toBeCloseTo(1 - 0.7 * 0.65 * 0.6, 10);
	});

	it('returns 0 for no sources', () => {
		expect(compose([])).toBe(0);
	});

	it('add() matches compose()', () => {
		expect(add(compose([0.3, 0.35]), 0.4)).toBeCloseTo(compose([0.3, 0.35, 0.4]), 10);
	});

	it('remove() inverts add()', () => {
		const total = compose([0.3, 0.35, 0.4]);
		expect(remove(total, 0.4)).toBeCloseTo(compose([0.3, 0.35]), 10);
	});

	it('refuses to remove a 100% source', () => {
		expect(() => remove(1, 1)).toThrow(RangeError);
	});

	it('marginal() is the source scaled by the remaining defence', () => {
		expect(marginal(0.89, 0.3)).toBeCloseTo(0.3 * 0.11, 10);
		expect(marginal(1, 0.3)).toBe(0);
	});
});

describe('defenseMultiplier (formulas.md §1.8)', () => {
	it('is 1 - pdr * (1 - ied)', () => {
		expect(defenseMultiplier(3.0, 0.89)).toBeCloseTo(0.67, 10);
		expect(defenseMultiplier(3.8, 0.89)).toBeCloseTo(1 - 3.8 * 0.11, 10);
	});

	it('caps monster DEF at 500%', () => {
		expect(defenseMultiplier(9, 0.9)).toBe(defenseMultiplier(5, 0.9));
	});

	it('floors at 0 (the hit deals 1 damage)', () => {
		expect(defenseMultiplier(3.8, 0.5)).toBe(0);
	});

	it('is 1 at 100% IED regardless of PDR', () => {
		expect(defenseMultiplier(3.8, 1)).toBe(1);
		expect(defenseMultiplier(5, 1)).toBe(1);
	});
});

describe('the §3.3 worked IED example', () => {
	const pdr = 3.0;
	const line = 0.3;

	function gainPct(currentIed: number): number {
		const before = defenseMultiplier(pdr, currentIed);
		const after = defenseMultiplier(pdr, add(currentIed, line));
		return (after / before - 1) * 100;
	}

	it('a 30% line at 89% IED is worth +14.8%', () => {
		// defOld = 0.67 ; iedNew = 0.923 ; defNew = 0.769 ; 0.769/0.67 - 1
		expect(add(0.89, line)).toBeCloseTo(0.923, 10);
		expect(defenseMultiplier(pdr, 0.89)).toBeCloseTo(0.67, 10);
		expect(defenseMultiplier(pdr, add(0.89, line))).toBeCloseTo(0.769, 10);
		expect(gainPct(0.89)).toBeCloseTo(14.8, 1);
	});

	it('the same line at 95% IED is worth +5.3%', () => {
		expect(defenseMultiplier(pdr, 0.95)).toBeCloseTo(0.85, 10);
		expect(defenseMultiplier(pdr, add(0.95, line))).toBeCloseTo(0.895, 10);
		expect(gainPct(0.95)).toBeCloseTo(5.3, 1);
	});

	it('the same line at 100% IED is worth exactly 0', () => {
		expect(gainPct(1)).toBe(0);
	});

	it('is strongly non-linear: the 89% gain is far more than double the 95% gain', () => {
		expect(gainPct(0.89)).toBeGreaterThan(2 * gainPct(0.95));
	});
});
