import { describe, expect, it } from 'vitest';

import { damageBreakdown, damageIndex, displayedRange } from './damage';
import { getClass } from '../data/classes';
import {
	ARCANE_TARGET,
	GRANDIS_TARGET,
	LUCID,
	SEREN,
	WIND_ARCHER,
	WIND_ARCHER_INDEX
} from './test-fixtures';
import type { CalcInput } from './types';

describe('damageIndex — hand-checked synthetic character', () => {
	it('reproduces every intermediate factor', () => {
		const b = damageBreakdown(WIND_ARCHER, ARCANE_TARGET);
		expect(b.statMultiplier).toBe(166_100); // 4*41000 + 2100
		expect(b.attack).toBe(1200); // floor(1000 * 1.20)
		expect(b.damageMultiplier).toBeCloseTo(5.0, 10); // 1 + (100 + 300)/100
		expect(b.finalDamageMultiplier).toBeCloseTo(1.5, 10);
		expect(b.criticalFactor).toBeCloseTo(2.35, 10); // 1.35 + 1.00
		expect(b.defenseMultiplier).toBeCloseTo(0.67, 10); // 1 - 3.0*0.11
		expect(b.levelMultiplier).toBeCloseTo(1.1, 10); // same level
		expect(b.forceMultiplier).toBe(1); // no force requirement
	});

	it('multiplies out to the hand-computed index', () => {
		expect(damageIndex(WIND_ARCHER, ARCANE_TARGET)).toBeCloseTo(WIND_ARCHER_INDEX, 3);
	});

	it('scales with PDR exactly as the defence term says', () => {
		const arcane = damageIndex(WIND_ARCHER, ARCANE_TARGET);
		const grandis = damageIndex(WIND_ARCHER, GRANDIS_TARGET);
		expect(grandis / arcane).toBeCloseTo((1 - 3.8 * 0.11) / (1 - 3.0 * 0.11), 10);
	});
});

describe('damageIndex — force and level terms', () => {
	it('applies the Arcane band for an Arcane River boss', () => {
		const under = damageIndex({ ...WIND_ARCHER, arcaneForce: 360, level: 230 }, LUCID);
		const over = damageIndex({ ...WIND_ARCHER, arcaneForce: 540, level: 230 }, LUCID);
		expect(over / under).toBeCloseTo(1.5, 10);
	});

	it('applies the Sacred linear rule for a Grandis boss', () => {
		const at = damageIndex({ ...WIND_ARCHER, sacredForce: 200 }, SEREN);
		const over = damageIndex({ ...WIND_ARCHER, sacredForce: 250 }, SEREN);
		expect(over / at).toBeCloseTo(1.25, 10);
	});

	it('prefers the Sacred requirement when a target somehow declares both', () => {
		const both = { ...SEREN, arcaneReq: 1320 };
		const input = { ...WIND_ARCHER, sacredForce: 250, arcaneForce: 0 };
		expect(damageBreakdown(input, both).forceMultiplier).toBeCloseTo(1.25, 10);
	});

	it('applies the level penalty when under-levelled', () => {
		const b = damageBreakdown({ ...WIND_ARCHER, level: 280 }, GRANDIS_TARGET);
		expect(b.levelMultiplier).toBeCloseTo(0.88, 10); // -5 levels
	});
});

describe('damageIndex — enemy type (formulas.md §1.6)', () => {
	it('adds Normal Monster Damage instead of Boss Damage for normal enemies', () => {
		const input: CalcInput = { ...WIND_ARCHER, normalEnemyDamagePercent: 60 };
		const b = damageBreakdown(input, ARCANE_TARGET, { enemyType: 'normal' });
		expect(b.damageMultiplier).toBeCloseTo(1 + (100 + 60) / 100, 10);
	});

	it('treats a missing Normal Monster Damage as 0, never as Boss Damage', () => {
		const b = damageBreakdown(WIND_ARCHER, ARCANE_TARGET, { enemyType: 'normal' });
		expect(b.damageMultiplier).toBeCloseTo(2.0, 10);
	});
});

describe('damageIndex — absolute mode (formulas.md §1.1, §1.9, §1.10)', () => {
	it('multiplies in 0.01, the weapon constant, average mastery and the elemental 0.5', () => {
		const cls = getClass('wind-archer');
		const relative = damageIndex(WIND_ARCHER, ARCANE_TARGET);
		const absolute = damageIndex(WIND_ARCHER, ARCANE_TARGET, { absolute: true });
		const masteryAvg = 0.5 * (1 + cls.masteryPercent / 100); // 0.5 * 1.85 = 0.925
		expect(absolute).toBeCloseTo(relative * 0.01 * cls.weaponConstant * masteryAvg * 0.5, 3);
		expect(absolute).toBeCloseTo(15_566_915.98, 1);
	});

	it('honours weaponConstantOverride and masteryPercent', () => {
		const input: CalcInput = {
			...WIND_ARCHER,
			weaponConstantOverride: 1.75,
			masteryPercent: 99
		};
		const b = damageBreakdown(input, ARCANE_TARGET, { absolute: true });
		expect(b.weaponConstant).toBe(1.75);
		expect(b.masteryMultiplier).toBeCloseTo(0.995, 10);
	});

	it('lets the elemental multiplier be overridden (neutral / weak monsters)', () => {
		const strong = damageIndex(WIND_ARCHER, ARCANE_TARGET, { absolute: true });
		const neutral = damageIndex(WIND_ARCHER, ARCANE_TARGET, {
			absolute: true,
			elementalMultiplier: 1
		});
		expect(neutral / strong).toBeCloseTo(2, 10);
	});

	it('cancels out of a ratio, which is why relative mode omits it', () => {
		const delta: CalcInput = { ...WIND_ARCHER, damagePercent: 110 };
		const relativeRatio =
			damageIndex(delta, ARCANE_TARGET) / damageIndex(WIND_ARCHER, ARCANE_TARGET);
		const absoluteRatio =
			damageIndex(delta, ARCANE_TARGET, { absolute: true }) /
			damageIndex(WIND_ARCHER, ARCANE_TARGET, { absolute: true });
		expect(absoluteRatio).toBeCloseTo(relativeRatio, 12);
	});
});

describe('displayedRange (formulas.md §1.13)', () => {
	it('reproduces the four published expressions', () => {
		const r = displayedRange(WIND_ARCHER);
		// UpperActual = 1.3 * 166100 * 1200 / 100
		expect(r.upperActual).toBe(2_591_160);
		// LowerActual = UpperActual * 85 / 100
		expect(r.lowerActual).toBe(2_202_486);
		// shown scale = (1 + 100/100) * (1 + 50/100) = 3.0 — NO boss damage
		expect(r.upper).toBe(7_773_480);
		expect(r.lower).toBe(6_607_459); // floor(1 + lowerActual * 3)
	});

	it('deliberately excludes Boss Damage %', () => {
		const withBoss = displayedRange({ ...WIND_ARCHER, bossDamagePercent: 999 });
		expect(withBoss).toEqual(displayedRange(WIND_ARCHER));
	});

	it('uses Magic ATT for magicians', () => {
		const battleMage: CalcInput = {
			...WIND_ARCHER,
			classId: 'battle-mage',
			stats: {
				...WIND_ARCHER.stats,
				int: { base: 20000, percent: 100, flat: 1000 },
				luk: { base: 1000, percent: 100, flat: 100 }
			},
			attack: { base: 99999, percent: 0, flat: 0 },
			magicAttack: { base: 1000, percent: 20, flat: 0 }
		};
		const cls = getClass('battle-mage');
		// stat multiplier is identical to the fixture (4*41000 + 2100)
		expect(displayedRange(battleMage).upperActual).toBe(
			Math.round((cls.weaponConstant * 166_100 * 1200) / 100)
		);
	});

	it("uses the class's weapon constant, which for Hero is 1.44 (2H only)", () => {
		const hero: CalcInput = { ...WIND_ARCHER, classId: 'hero' };
		// Hero primary STR / secondary DEX => 4*2100 + 41000 = 49400.
		expect(displayedRange(hero).upperActual).toBe(Math.round((1.44 * 49_400 * 1200) / 100));
	});

	it('honours an explicit weaponConstantOverride (Paladin 1H vs 2H)', () => {
		const paladin: CalcInput = { ...WIND_ARCHER, classId: 'paladin' };
		const twoHanded = displayedRange(paladin); // class default is the 2H constant, 1.34
		const oneHanded = displayedRange({ ...paladin, weaponConstantOverride: 1.24 });
		expect(twoHanded.upperActual / oneHanded.upperActual).toBeCloseTo(1.34 / 1.24, 4);
	});
});
