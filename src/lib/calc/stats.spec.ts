import { describe, expect, it } from 'vitest';

import {
	applyTriple,
	attackTerm,
	criticalFactor,
	demonAvengerPureHp,
	demonAvengerStatValue,
	floorGuarded,
	statMultiplier
} from './stats';
import { emptyStats, type CalcInput } from './types';

function baseInput(classId: string): CalcInput {
	return {
		level: 285,
		classId,
		stats: emptyStats(),
		attack: { base: 0, percent: 0, flat: 0 },
		magicAttack: { base: 0, percent: 0, flat: 0 },
		damagePercent: 0,
		bossDamagePercent: 0,
		finalDamagePercent: 0,
		ignoreDefensePercent: 0,
		criticalRatePercent: 100,
		criticalDamagePercent: 0
	};
}

describe('applyTriple (formulas.md §1.2)', () => {
	it('floors the percent product before adding the final stat', () => {
		// floor(1000 * 1.135) = 1135 exactly, + 250 final.
		expect(applyTriple({ base: 1000, percent: 13.5, flat: 250 })).toBe(1385);
	});

	it('floors, it does not round', () => {
		// floor(999 * 1.001) = floor(999.999) = 999
		expect(applyTriple({ base: 999, percent: 0.1, flat: 0 })).toBe(999);
	});

	it('guards against IEEE-754 representation error', () => {
		// 4.35 * 100 is 434.99999999999994 in binary floating point; the guard
		// must not floor it to 434.
		expect(floorGuarded(4.35 * 100)).toBe(435);
		expect(applyTriple({ base: 435, percent: 0, flat: 0 })).toBe(435);
		// 2077 * 1.29 -> 2679.3299999999995; floor is genuinely 2679.
		expect(applyTriple({ base: 2077, percent: 29, flat: 0 })).toBe(2679);
	});

	it('handles a zero triple', () => {
		expect(applyTriple({ base: 0, percent: 0, flat: 0 })).toBe(0);
	});
});

describe('statMultiplier (formulas.md §1.2)', () => {
	it('is 4*main + secondary for an ordinary class', () => {
		const input = baseInput('wind-archer'); // DEX primary, STR secondary
		input.stats.dex = { base: 10000, percent: 50, flat: 500 };
		input.stats.str = { base: 1000, percent: 50, flat: 100 };
		// dex = floor(15000) + 500 = 15500 ; str = 1500 + 100 = 1600
		expect(statMultiplier(input)).toBe(4 * 15500 + 1600);
	});

	it('ignores stats the class does not use', () => {
		const input = baseInput('hero'); // STR primary, DEX secondary
		input.stats.str = { base: 10000, percent: 0, flat: 0 };
		input.stats.dex = { base: 1000, percent: 0, flat: 0 };
		input.stats.int = { base: 99999, percent: 0, flat: 0 };
		input.stats.luk = { base: 99999, percent: 0, flat: 0 };
		expect(statMultiplier(input)).toBe(4 * 10000 + 1000);
	});

	it('adds BOTH secondaries for Shadower / Dual Blade / Cadena', () => {
		for (const classId of ['shadower', 'dual-blade', 'cadena']) {
			const input = baseInput(classId);
			input.stats.luk = { base: 10000, percent: 0, flat: 0 };
			input.stats.dex = { base: 1000, percent: 0, flat: 0 };
			input.stats.str = { base: 700, percent: 0, flat: 0 };
			expect(statMultiplier(input)).toBe(4 * 10000 + 1000 + 700);
		}
	});

	it('is 4*(STR+DEX+LUK) with no secondary term for Xenon', () => {
		const input = baseInput('xenon');
		input.stats.str = { base: 5000, percent: 0, flat: 0 };
		input.stats.dex = { base: 4000, percent: 0, flat: 0 };
		input.stats.luk = { base: 3000, percent: 0, flat: 0 };
		input.stats.int = { base: 9999, percent: 0, flat: 0 }; // must be ignored
		expect(statMultiplier(input)).toBe(4 * (5000 + 4000 + 3000));
	});

	it('uses the HP formula for Demon Avenger', () => {
		const input = baseInput('demon-avenger');
		input.level = 200;
		input.stats.hp = { base: 500000, percent: 0, flat: 0 };
		input.stats.str = { base: 1500, percent: 0, flat: 0 };

		const pureHp = demonAvengerPureHp(200); // 545 + 90*200
		expect(pureHp).toBe(18545);
		// floor(18545/3.5) + 0.8*floor(481455/3.5) + 1500
		const expected = Math.floor(18545 / 3.5) + 0.8 * Math.floor(481455 / 3.5) + 1500;
		expect(statMultiplier(input)).toBeCloseTo(expected, 10);
		expect(demonAvengerStatValue(500000, 18545, 1500)).toBeCloseTo(expected, 10);
	});

	it('floors the two Demon Avenger HP groups independently', () => {
		// 1-3 HP may not move the stat value at all (formulas.md §1.2).
		const a = demonAvengerStatValue(500000, 18545, 0);
		const b = demonAvengerStatValue(500001, 18545, 0);
		expect(b).toBe(a);
	});

	it('exposes every Demon Avenger pure-HP job step', () => {
		expect(demonAvengerPureHp(100, 1)).toBe(220 + 9000);
		expect(demonAvengerPureHp(100, 2)).toBe(395 + 9000);
		expect(demonAvengerPureHp(100, 3)).toBe(470 + 9000);
		expect(demonAvengerPureHp(100, 4)).toBe(545 + 9000);
	});
});

describe('attackTerm (formulas.md §1.4)', () => {
	it('uses Attack Power for non-magicians', () => {
		const input = baseInput('wind-archer');
		input.attack = { base: 1000, percent: 20, flat: 7 };
		input.magicAttack = { base: 9999, percent: 0, flat: 0 };
		expect(attackTerm(input)).toBe(1207);
	});

	it('uses Magic ATT for magicians', () => {
		const input = baseInput('battle-mage');
		input.attack = { base: 9999, percent: 0, flat: 0 };
		input.magicAttack = { base: 1000, percent: 20, flat: 7 };
		expect(attackTerm(input)).toBe(1207);
	});
});

describe('criticalFactor (formulas.md §1.7)', () => {
	it('is 1.35 + critDmg at 100% crit rate', () => {
		expect(criticalFactor(100, 85)).toBeCloseTo(2.2, 10);
	});

	it('blends with non-crits below 100%', () => {
		// 0.5 * 2.2 + 0.5 * 1
		expect(criticalFactor(50, 85)).toBeCloseTo(1.6, 10);
	});

	it('caps crit rate at 100%', () => {
		expect(criticalFactor(140, 85)).toBe(criticalFactor(100, 85));
	});

	it('is 1 at 0% crit rate', () => {
		expect(criticalFactor(0, 85)).toBe(1);
	});
});
