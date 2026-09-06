import { describe, expect, it } from 'vitest';

import { getClass } from '$lib/data/classes';
import { displayedRange } from './damage';
import type { CalcInput } from './types';

/**
 * GOLDEN CAPTURE — a real in-game stat window, not a synthetic fixture.
 *
 * Every other test in this project checks a formula against a table. This one
 * checks the whole assembled pipeline against reality: a genuine capture from
 * Lutoren (Ren, Lv272, Kronos) taken 2026-09-06, whose stat window displayed a
 * maximum damage range of 14,736,287.
 *
 * It is the only evidence that the pieces compose correctly — the stat
 * multiplier, the floor placement, the weapon constant, and the fact that the
 * displayed range applies Damage% and Final Damage% but NOT Boss Damage%
 * (formulas.md §1.13). Get any one of those wrong and this test moves by
 * percent, not by rounding.
 *
 * If this ever fails, do not adjust the tolerance. Something in the damage
 * pipeline changed meaning.
 */
const LUTOREN: CalcInput = {
	level: 272,
	classId: 'ren',
	stats: {
		str: { base: 29216, percent: 0, flat: 0 },
		dex: { base: 3882, percent: 0, flat: 0 },
		int: { base: 2462, percent: 0, flat: 0 },
		luk: { base: 2404, percent: 0, flat: 0 },
		hp: { base: 0, percent: 0, flat: 0 }
	},
	attack: { base: 1772, percent: 0, flat: 0 },
	magicAttack: { base: 478, percent: 0, flat: 0 },
	damagePercent: 102,
	bossDamagePercent: 316,
	finalDamagePercent: 162.27,
	ignoreDefensePercent: 93.14,
	normalEnemyDamagePercent: 17,
	criticalRatePercent: 82,
	criticalDamagePercent: 86.5,
	arcaneForce: 1230,
	sacredForce: 210
};

const DISPLAYED_MAX = 14_736_287;

describe('golden capture: Lutoren (Ren, Lv272) 2026-09-06', () => {
	it('reproduces the real in-game damage range', () => {
		const { upper } = displayedRange(LUTOREN);
		const errorPercent = Math.abs((upper - DISPLAYED_MAX) / DISPLAYED_MAX) * 100;
		expect(errorPercent).toBeLessThan(0.01);
	});

	/**
	 * The weapon constant is the one class value that CANNOT be checked by
	 * comparing upgrades, because it cancels in every ratio. It survives only
	 * here, in the range. Ren postdates the published by-job tables, so this
	 * capture is the actual evidence for 1.30 — the neighbouring constants are
	 * off by percent, which is why the research's UNVERIFIED mark could be
	 * cleared by measurement rather than by finding a better source.
	 */
	it('pins Ren to weapon constant 1.30, ruling out its neighbours', () => {
		expect(getClass('ren')!.weaponConstant).toBe(1.3);

		const errorAt = (weaponConstantOverride: number) => {
			const { upper } = displayedRange({ ...LUTOREN, weaponConstantOverride });
			return Math.abs((upper - DISPLAYED_MAX) / DISPLAYED_MAX) * 100;
		};

		expect(errorAt(1.3)).toBeLessThan(0.01);
		// Nothing else is close: the next constants either way miss by percent.
		for (const wrong of [1.2, 1.24, 1.25, 1.34, 1.35, 1.44, 1.49]) {
			expect(errorAt(wrong)).toBeGreaterThan(1);
		}
	});

	/**
	 * Boss Damage% is 316% here — enormous. If it ever leaked into the displayed
	 * range the number would be over four times too large, so this is a cheap,
	 * very loud guard on the §1.13 rule.
	 */
	it('excludes Boss Damage% from the displayed range', () => {
		const withoutBoss = displayedRange({ ...LUTOREN, bossDamagePercent: 0 }).upper;
		expect(withoutBoss).toBe(displayedRange(LUTOREN).upper);
	});
});
