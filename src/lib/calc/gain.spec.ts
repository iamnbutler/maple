import { describe, expect, it } from 'vitest';

import { applyDelta, measureGain, measureGainBatch } from './gain';
import { damageIndex } from './damage';
import { statMultiplier } from './stats';
import { ARCANE_TARGET, WIND_ARCHER } from './test-fixtures';
import type { CalcInput, Delta } from './types';

const T = ARCANE_TARGET;

describe('applyDelta', () => {
	it('never mutates the input', () => {
		const before = JSON.stringify(WIND_ARCHER);
		applyDelta(WIND_ARCHER, { mainFlat: 100, iedAdd: [30], fd: 5 });
		expect(JSON.stringify(WIND_ARCHER)).toBe(before);
	});

	it('routes mainFlat into base (percent-applied) and mainFinal into flat', () => {
		// formulas.md §1.2 / §3.3: gear & flames are multiplied by %stat,
		// hyper stats / symbols / legion are not.
		const gear = applyDelta(WIND_ARCHER, { mainFlat: 100 });
		const symbol = applyDelta(WIND_ARCHER, { mainFinal: 100 });
		expect(gear.stats.dex.base).toBe(WIND_ARCHER.stats.dex.base + 100);
		expect(symbol.stats.dex.flat).toBe(WIND_ARCHER.stats.dex.flat + 100);
		// At +100% DEX the gear line is worth twice the symbol line.
		expect(statMultiplier(gear) - statMultiplier(WIND_ARCHER)).toBe(4 * 200);
		expect(statMultiplier(symbol) - statMultiplier(WIND_ARCHER)).toBe(4 * 100);
	});

	it('applies mainPct to the class primary and subPct to the secondary', () => {
		const next = applyDelta(WIND_ARCHER, { mainPct: 3, subPct: 2 });
		expect(next.stats.dex.percent).toBe(103);
		expect(next.stats.str.percent).toBe(102);
	});

	it('applies allStatPct to STR/DEX/INT/LUK but not Max HP', () => {
		const next = applyDelta(WIND_ARCHER, { allStatPct: 9 });
		expect(next.stats.str.percent).toBe(109);
		expect(next.stats.dex.percent).toBe(109);
		expect(next.stats.int.percent).toBe(9);
		expect(next.stats.luk.percent).toBe(9);
		expect(next.stats.hp.percent).toBe(0);
	});

	it('applies all three of Xenon primary stats', () => {
		const xenon: CalcInput = { ...WIND_ARCHER, classId: 'xenon' };
		const next = applyDelta(xenon, { mainFinal: 50 });
		expect(next.stats.str.flat).toBe(WIND_ARCHER.stats.str.flat + 50);
		expect(next.stats.dex.flat).toBe(WIND_ARCHER.stats.dex.flat + 50);
		expect(next.stats.luk.flat).toBe(WIND_ARCHER.stats.luk.flat + 50);
	});

	it('routes att to Magic ATT for magicians', () => {
		const mage: CalcInput = { ...WIND_ARCHER, classId: 'battle-mage' };
		const next = applyDelta(mage, { att: 15, attPct: 3 });
		expect(next.magicAttack.base).toBe(WIND_ARCHER.magicAttack.base + 15);
		expect(next.magicAttack.percent).toBe(3);
		expect(next.attack.base).toBe(WIND_ARCHER.attack.base);
	});

	it('composes Final Damage multiplicatively (formulas.md §1.6)', () => {
		const next = applyDelta(WIND_ARCHER, { fd: 10 });
		// (1 + 0.50) * (1 + 0.10) - 1 = 0.65
		expect(next.finalDamagePercent).toBeCloseTo(65, 10);
	});

	it('composes IED multiplicatively, never additively (formulas.md §1.8)', () => {
		const next = applyDelta(WIND_ARCHER, { iedAdd: [30] });
		expect(next.ignoreDefensePercent).toBeCloseTo(92.3, 10);
		expect(next.ignoreDefensePercent).not.toBeCloseTo(119, 6);
	});

	it('removes an IED source by dividing it back out', () => {
		const swapped = applyDelta(WIND_ARCHER, { iedRemove: [30], iedAdd: [35] });
		// 89% total minus a 30% line, then plus a 35% line.
		const withoutLine = 1 - (1 - 0.89) / (1 - 0.3);
		const expected = 1 - (1 - withoutLine) * (1 - 0.35);
		expect(swapped.ignoreDefensePercent).toBeCloseTo(expected * 100, 8);
	});

	it('caps critical rate at 100% (formulas.md §1.7)', () => {
		expect(applyDelta(WIND_ARCHER, { critRate: 12 }).criticalRatePercent).toBe(100);
	});

	it('adds force points', () => {
		const next = applyDelta(WIND_ARCHER, { arcane: 60, sacred: 30 });
		expect(next.arcaneForce).toBe(60);
		expect(next.sacredForce).toBe(30);
	});
});

describe('measureGain (formulas.md §3.3)', () => {
	it('+1% final damage is exactly x1.01, independent of the current state', () => {
		for (const fdNow of [0, 50, 300, 1200.75]) {
			const input: CalcInput = { ...WIND_ARCHER, finalDamagePercent: fdNow };
			const gain = measureGain(input, { fd: 1 }, T);
			expect(gain.after / gain.before).toBeCloseTo(1.01, 12);
			expect(gain.gainPct).toBeCloseTo(1, 10);
		}
	});

	it('+1% boss damage equals +1% damage against a boss', () => {
		const boss = measureGain(WIND_ARCHER, { boss: 1 }, T);
		const dmg = measureGain(WIND_ARCHER, { dmg: 1 }, T);
		expect(boss.gainPct).toBeCloseTo(dmg.gainPct, 12);
		// and both equal (1 + dmg + bd + 0.01) / (1 + dmg + bd)
		expect(1 + boss.gainPct / 100).toBeCloseTo(5.01 / 5.0, 12);
	});

	it('+1% crit rate is worth exactly 0 at 100% crit rate', () => {
		expect(measureGain(WIND_ARCHER, { critRate: 1 }, T).gainPct).toBe(0);
	});

	it('+1% crit rate is worth something below 100% crit rate', () => {
		const input: CalcInput = { ...WIND_ARCHER, criticalRatePercent: 80 };
		const gain = measureGain(input, { critRate: 1 }, T);
		expect(gain.gainPct).toBeGreaterThan(0);
		// (0.81*2.35 + 0.19) / (0.80*2.35 + 0.20) - 1
		const expected = ((0.81 * 2.35 + 0.19) / (0.8 * 2.35 + 0.2) - 1) * 100;
		expect(gain.gainPct).toBeCloseTo(expected, 10);
	});

	it('+1% crit damage at 100% crit is (1.35 + cd + 0.01)/(1.35 + cd)', () => {
		const gain = measureGain(WIND_ARCHER, { critDmg: 1 }, T);
		expect(1 + gain.gainPct / 100).toBeCloseTo(2.36 / 2.35, 12);
	});

	it('reproduces the §3.3 IED worked example', () => {
		const at89 = measureGain(WIND_ARCHER, { iedAdd: [30] }, { ...T, pdr: 3.0 });
		expect(at89.gainPct).toBeCloseTo(14.8, 1);

		const input95: CalcInput = { ...WIND_ARCHER, ignoreDefensePercent: 95 };
		const at95 = measureGain(input95, { iedAdd: [30] }, { ...T, pdr: 3.0 });
		expect(at95.gainPct).toBeCloseTo(5.3, 1);

		const input100: CalcInput = { ...WIND_ARCHER, ignoreDefensePercent: 100 };
		expect(measureGain(input100, { iedAdd: [30] }, { ...T, pdr: 3.0 }).gainPct).toBe(0);
	});

	it('IED is non-linear: two 30% lines are worth less than twice one', () => {
		const one = measureGain(WIND_ARCHER, { iedAdd: [30] }, T).gainPct;
		const two = measureGain(WIND_ARCHER, { iedAdd: [30, 30] }, T).gainPct;
		expect(two).toBeGreaterThan(one);
		expect(two).toBeLessThan(2 * one);
	});

	it('reports before/after damage indexes alongside the gain', () => {
		const gain = measureGain(WIND_ARCHER, { dmg: 10 }, T);
		expect(gain.before).toBeCloseTo(damageIndex(WIND_ARCHER, T), 6);
		expect(gain.after).toBeGreaterThan(gain.before);
	});
});

describe('measureGainBatch (formulas.md §3.4)', () => {
	const deltas: Delta[] = [{ iedAdd: [30] }, { iedAdd: [35] }, { boss: 20 }];

	it('evaluates the set jointly, not as a sum of individual gains', () => {
		const joint = measureGainBatch(WIND_ARCHER, deltas, T).gainPct;
		const summed = deltas.reduce((acc, d) => acc + measureGain(WIND_ARCHER, d, T).gainPct, 0);
		expect(joint).not.toBeCloseTo(summed, 3);
		// The two IED lines interact sub-additively; the boss line interacts
		// multiplicatively, so the joint result is not simply below the sum.
		expect(joint).toBeGreaterThan(0);
	});

	it('is order independent for these deltas', () => {
		const forward = measureGainBatch(WIND_ARCHER, deltas, T).gainPct;
		const backward = measureGainBatch(WIND_ARCHER, [...deltas].reverse(), T).gainPct;
		expect(forward).toBeCloseTo(backward, 9);
	});

	it('an empty batch is a 0% gain', () => {
		expect(measureGainBatch(WIND_ARCHER, [], T).gainPct).toBe(0);
	});
});
