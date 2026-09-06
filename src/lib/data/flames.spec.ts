import { describe, expect, it } from 'vitest';

import {
	DEFAULT_FLAME_SCORE_WEIGHTS,
	FLAME_LINE_COUNT_PROBABILITIES,
	FLAME_SCORE_CONVENTIONS,
	FLAME_TIER_PROBABILITIES_ADVANTAGED,
	FLAME_TIER_PROBABILITIES_NORMAL,
	FLAME_TYPES,
	flameAllStatPercent,
	flameArmorAttack,
	flameBenchmark,
	flameBossDamagePercent,
	flameDamagePercent,
	flameDualStat,
	flameMaxHp,
	flameRequiredLevelReduction,
	flameScore,
	flameSingleStat,
	flameWeaponAttackMultiplier,
	flameWeaponAttackPercent,
	XENON_FLAME_SCORE_WEIGHTS,
	type FlameTier
} from './flames';

const TIERS: FlameTier[] = [1, 2, 3, 4, 5, 6, 7];

describe('single main stat / DEF', () => {
	// formulas.md §4A §2.6 "Single main stat" — full published table
	const table: Array<[number, number[]]> = [
		[0, [1, 2, 3, 4, 5, 6, 7]],
		[20, [2, 4, 6, 8, 10, 12, 14]],
		[40, [3, 6, 9, 12, 15, 18, 21]],
		[60, [4, 8, 12, 16, 20, 24, 28]],
		[80, [5, 10, 15, 20, 25, 30, 35]],
		[100, [6, 12, 18, 24, 30, 36, 42]],
		[120, [7, 14, 21, 28, 35, 42, 49]],
		[140, [8, 16, 24, 32, 40, 48, 56]],
		[160, [9, 18, 27, 36, 45, 54, 63]],
		[180, [10, 20, 30, 40, 50, 60, 70]],
		[200, [11, 22, 33, 44, 55, 66, 77]],
		[230, [12, 24, 36, 48, 60, 72, 84]],
		[250, [12, 24, 36, 48, 60, 72, 84]] // capped from 230
	];
	it.each(table)('item level %i', (level, expected) => {
		expect(TIERS.map((t) => flameSingleStat(level, t))).toEqual(expected);
	});

	it('holds across a whole bracket', () => {
		expect(flameSingleStat(159, 7)).toBe(flameSingleStat(140, 7));
		expect(flameSingleStat(229, 1)).toBe(11);
	});
});

describe('combined two-stat lines', () => {
	// formulas.md §4A §2.6 "Combined two-stat lines"
	const table: Array<[number, number[]]> = [
		[0, [1, 2, 3, 4, 5, 6, 7]],
		[40, [2, 4, 6, 8, 10, 12, 14]],
		[80, [3, 6, 9, 12, 15, 18, 21]],
		[120, [4, 8, 12, 16, 20, 24, 28]],
		[160, [5, 10, 15, 20, 25, 30, 35]],
		[200, [6, 12, 18, 24, 30, 36, 42]],
		[250, [7, 14, 21, 28, 35, 42, 49]]
	];
	it.each(table)('item level %i', (level, expected) => {
		expect(TIERS.map((t) => flameDualStat(level, t))).toEqual(expected);
	});

	it('gives each of the two stats the same amount (Lv200 T7 = +42/+42)', () => {
		expect(flameDualStat(200, 7)).toBe(42);
	});
});

describe('attack flames', () => {
	it('is flat and item-level independent on non-weapons, capped at +7', () => {
		expect(TIERS.map((t) => flameArmorAttack(t))).toEqual([1, 2, 3, 4, 5, 6, 7]);
	});

	// formulas.md §4A §2.6 "WEAPONS" — both published multiplier tables, to 4 dp
	const normal: Array<[number, number[]]> = [
		[0, [1.01, 1.022, 1.0363, 1.0532, 1.0732]],
		[40, [1.02, 1.044, 1.0726, 1.1065, 1.1464]],
		[80, [1.03, 1.066, 1.1089, 1.1597, 1.2196]],
		[120, [1.04, 1.088, 1.1452, 1.213, 1.2928]],
		[160, [1.05, 1.11, 1.1815, 1.2662, 1.366]],
		[200, [1.06, 1.132, 1.2178, 1.3194, 1.4392]],
		[250, [1.07, 1.154, 1.2541, 1.3727, 1.5124]]
	];
	it.each(normal)('non-flame-advantage weapon at level %i', (level, expected) => {
		const tiers: FlameTier[] = [1, 2, 3, 4, 5];
		const actual = tiers.map((t) => Number(flameWeaponAttackMultiplier(level, t, false).toFixed(4)));
		expect(actual).toEqual(expected);
	});

	const advantaged: Array<[number, number[]]> = [
		[0, [1.03, 1.044, 1.0605, 1.0799, 1.1025]],
		[40, [1.06, 1.088, 1.121, 1.1597, 1.205]],
		[80, [1.09, 1.132, 1.1815, 1.2396, 1.3075]],
		[120, [1.12, 1.176, 1.242, 1.3194, 1.4099]],
		[160, [1.15, 1.22, 1.3025, 1.3993, 1.5124]],
		[200, [1.18, 1.264, 1.363, 1.4792, 1.6149]],
		[250, [1.21, 1.308, 1.4235, 1.559, 1.7174]]
	];
	it.each(advantaged)('flame-advantage weapon at level %i', (level, expected) => {
		const tiers: FlameTier[] = [3, 4, 5, 6, 7];
		const actual = tiers.map((t) => Number(flameWeaponAttackMultiplier(level, t, true).toFixed(4)));
		expect(actual).toEqual(expected);
	});

	it('gives a Lv200 flame-advantaged weapon +61.49% base ATT at T7', () => {
		expect(flameWeaponAttackPercent(200, 7, true)).toBeCloseTo(61.49, 2);
	});
});

describe('Max HP / Max MP', () => {
	// formulas.md §4A §2.6 "Max HP / Max MP" — spot rows across the whole table
	const rows: Array<[number, number]> = [
		[0, 3],
		[10, 30],
		[50, 150],
		[100, 300],
		[150, 450],
		[200, 600],
		[210, 620],
		[220, 640],
		[230, 660],
		[240, 680],
		[250, 700],
		[300, 700]
	];
	it.each(rows)('item level %i has a per-tier step of %i', (level, perTier) => {
		expect(flameMaxHp(level, 1)).toBe(perTier);
		expect(flameMaxHp(level, 7)).toBe(perTier * 7);
	});

	it('matches published T7 cells', () => {
		expect(flameMaxHp(160, 7)).toBe(3360);
		expect(flameMaxHp(250, 7)).toBe(4900);
	});
});

describe('percentage and special lines', () => {
	// formulas.md §4A §2.6 "Percentage and special lines" — all item-level independent
	it('scales linearly with tier', () => {
		expect(TIERS.map(flameAllStatPercent)).toEqual([1, 2, 3, 4, 5, 6, 7]);
		expect(TIERS.map(flameBossDamagePercent)).toEqual([2, 4, 6, 8, 10, 12, 14]);
		expect(TIERS.map(flameDamagePercent)).toEqual([1, 2, 3, 4, 5, 6, 7]);
		expect(TIERS.map(flameRequiredLevelReduction)).toEqual([-5, -10, -15, -20, -25, -30, -35]);
	});
});

describe('flame types and probabilities', () => {
	// formulas.md §4A §2.3, §2.4, §2.5
	it('knows the GMS flame names and tier ranges', () => {
		expect(FLAME_TYPES.eternal.gmsName).toBe('Eternal Rebirth Flame');
		expect(FLAME_TYPES.eternal.normalTiers).toEqual([2, 5]);
		expect(FLAME_TYPES.eternal.advantagedTiers).toEqual([4, 7]);
		expect(FLAME_TYPES.blazing.keepsOldStats).toBe(true);
		expect(FLAME_TYPES.powerful.keepsOldStats).toBe(false);
	});

	it('has line-count and tier distributions that sum to 1', () => {
		for (const dist of Object.values(FLAME_LINE_COUNT_PROBABILITIES)) {
			const total = Object.values(dist).reduce((a, b) => a + b, 0);
			expect(total).toBeCloseTo(1, 10);
		}
		for (const dist of Object.values(FLAME_TIER_PROBABILITIES_NORMAL)) {
			expect(Object.values(dist).reduce((a, b) => a + b, 0)).toBeCloseTo(1, 10);
		}
		for (const dist of Object.values(FLAME_TIER_PROBABILITIES_ADVANTAGED)) {
			expect(Object.values(dist).reduce((a, b) => a + b, 0)).toBeCloseTo(1, 10);
		}
	});

	it('shifts the advantaged distribution +2 tiers (except levelled Rebirth Flames)', () => {
		expect(FLAME_TIER_PROBABILITIES_ADVANTAGED.eternalOrBlack[4]).toBe(
			FLAME_TIER_PROBABILITIES_NORMAL.eternalOrBlack[2]
		);
		expect(FLAME_TIER_PROBABILITIES_ADVANTAGED.rebirthFlameLevelled[3]).toBe(0.97);
	});

	it('always gives flame-advantaged equipment 4 lines', () => {
		expect(FLAME_LINE_COUNT_PROBABILITIES.flameAdvantaged[4]).toBe(1);
	});
});

describe('flameScore', () => {
	// formulas.md §4A §2.7 — whackybeanz worked example
	it('reproduces the published Magician example (118.75)', () => {
		const block = { str: 44, int: 85, luk: 30, allStatPct: 3 };
		expect(flameScore(block, 'int')).toBe(118.75);
	});

	it('ignores stats the class cannot use', () => {
		expect(flameScore({ str: 1000 }, 'int')).toBe(0);
	});

	it('accepts an explicit secondary list', () => {
		expect(flameScore({ dex: 40 }, { main: 'int', secondary: ['dex'] })).toBe(5);
	});

	it('weights ATT and All Stat % per the default convention', () => {
		expect(flameScore({ att: 7 }, 'str')).toBe(7 * DEFAULT_FLAME_SCORE_WEIGHTS.att);
		expect(flameScore({ allStatPct: 3 }, 'str')).toBe(30);
	});

	it('supports the other two conventions', () => {
		const block = { str: 44, int: 85, luk: 30, allStatPct: 3 };
		// StrategyWiki: main 85, no secondary (LUK is not DEX), All Stat ×15
		expect(flameScore(block, 'int', FLAME_SCORE_CONVENTIONS.strategywiki)).toBe(85 + 30 * 0.1 + 3 * 15);
		expect(flameScore({ att: 7 }, 'str', FLAME_SCORE_CONVENTIONS.gmsUpgradeTracker)).toBe(21);
	});

	it('uses Xenon weights when supplied', () => {
		expect(
			flameScore({ str: 10, dex: 10, luk: 10, att: 5 }, { main: 'str', secondary: ['dex', 'luk'] }, XENON_FLAME_SCORE_WEIGHTS)
		).toBe(10 + 10 + 10 + 5 * 8);
	});
});

describe('benchmarks', () => {
	// formulas.md §4A §2.7 "Target flame scores"
	it('picks the right row per item level', () => {
		expect(flameBenchmark(200, true)?.average).toBe(125);
		expect(flameBenchmark(250, true)?.minmax).toBe(200);
		expect(flameBenchmark(160, false)?.starters).toBe(20);
		expect(flameBenchmark(250, true, true)?.average).toBe(245);
		expect(flameBenchmark(100, false)).toBeNull();
	});
});
