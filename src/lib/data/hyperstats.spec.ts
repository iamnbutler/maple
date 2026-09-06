import { describe, expect, it } from 'vitest';

import {
	HYPER_IED_EFFECTIVE_MARGINAL,
	HYPER_POINT_CHECKPOINTS,
	HYPER_POINTS_AT_300,
	HYPER_STAT_CUMULATIVE_COST,
	HYPER_STAT_KEYS,
	HYPER_STAT_LEVEL_COST,
	HYPER_STAT_MAX_COST,
	HYPER_STATS,
	hyperCost,
	hyperEffect,
	hyperEffectDelta,
	hyperPointsAt,
	type HyperStatKey
} from './hyperstats';

describe('the stat list', () => {
	// formulas.md §4B §1.1
	it('has 17 stats, 16 of which cap at 15 and DF/TF at 10', () => {
		expect(HYPER_STAT_KEYS).toHaveLength(17);
		expect(HYPER_STATS.dfTf.maxLevel).toBe(10);
		const capped15 = HYPER_STAT_KEYS.filter((k) => HYPER_STATS[k].maxLevel === 15);
		expect(capped15).toHaveLength(16);
	});

	it('has no Sacred/Authentic Force stat', () => {
		expect(HYPER_STAT_KEYS).not.toContain('sacredForce');
		expect(HYPER_STAT_KEYS).toContain('arcaneForce');
	});
});

describe('cost curve', () => {
	// formulas.md §4B §1.2 — total 550, NOT the widely-repeated 180
	it('matches the published per-level and cumulative costs', () => {
		expect([...HYPER_STAT_LEVEL_COST]).toEqual([
			0, 1, 2, 4, 8, 10, 15, 20, 25, 30, 35, 50, 65, 80, 95, 110
		]);
		expect([...HYPER_STAT_CUMULATIVE_COST]).toEqual([
			0, 1, 3, 7, 15, 25, 40, 60, 85, 115, 150, 200, 265, 345, 440, 550
		]);
		for (let level = 1; level <= 15; level++) {
			expect(HYPER_STAT_CUMULATIVE_COST[level]).toBe(
				HYPER_STAT_CUMULATIVE_COST[level - 1] + HYPER_STAT_LEVEL_COST[level]
			);
		}
	});

	it('charges 50/65/80/95/110 for levels 11-15', () => {
		expect(HYPER_STAT_LEVEL_COST.slice(11)).toEqual([50, 65, 80, 95, 110]);
		expect(hyperCost(10, 15)).toBe(400);
		expect(hyperCost(0, 15)).toBe(HYPER_STAT_MAX_COST);
		expect(HYPER_STAT_MAX_COST).toBe(550);
	});

	it('is a no-op or throws outside the range', () => {
		expect(hyperCost(5, 5)).toBe(0);
		expect(hyperCost(9, 5)).toBe(0);
		expect(() => hyperCost(0, 16)).toThrow();
	});

	it('costs 150 to max the level-10-capped DF/TF stat', () => {
		expect(hyperCost(0, HYPER_STATS.dfTf.maxLevel)).toBe(150);
	});
});

describe('points available by character level', () => {
	// formulas.md §4B §1.3
	it('matches every published checkpoint', () => {
		for (const [level, total] of Object.entries(HYPER_POINT_CHECKPOINTS)) {
			expect(hyperPointsAt(Number(level))).toBe(total);
		}
	});

	it('awards nothing before level 140 and 1,699 at 300', () => {
		expect(hyperPointsAt(139)).toBe(0);
		expect(hyperPointsAt(140)).toBe(3);
		expect(hyperPointsAt(300)).toBe(HYPER_POINTS_AT_300);
		expect(HYPER_POINTS_AT_300).toBe(1699);
		expect(hyperPointsAt(299)).toBe(1680);
	});

	it('increases the award by 1 every 10 character levels', () => {
		expect(hyperPointsAt(149) - hyperPointsAt(148)).toBe(3);
		expect(hyperPointsAt(159) - hyperPointsAt(158)).toBe(4);
		expect(hyperPointsAt(291) - hyperPointsAt(290)).toBe(18);
	});

	it('affords three maxed stats plus change at level 300', () => {
		expect(hyperPointsAt(300)).toBeGreaterThanOrEqual(3 * HYPER_STAT_MAX_COST);
		expect(hyperPointsAt(300)).toBeLessThan(4 * HYPER_STAT_MAX_COST);
	});
});

describe('effect per level', () => {
	// formulas.md §4B §1.4 / §1.5 — value at max for every stat
	const maxed: Array<[HyperStatKey, number]> = [
		['str', 450],
		['dex', 450],
		['int', 450],
		['luk', 450],
		['maxHpPercent', 30],
		['maxMpPercent', 30],
		['dfTf', 100],
		['criticalRate', 25],
		['criticalDamage', 15],
		['ignoreDefense', 45],
		['damage', 45],
		['bossDamage', 55],
		['normalDamage', 55],
		['statusResistance', 25],
		['attack', 45],
		['bonusExp', 10],
		['arcaneForce', 100]
	];
	it.each(maxed)('%s maxes at %i', (key, value) => {
		expect(hyperEffect(key, HYPER_STATS[key].maxLevel)).toBe(value);
	});

	it('matches the published tiered curves level by level', () => {
		const critRate = [0, 1, 2, 3, 4, 5, 7, 9, 11, 13, 15, 17, 19, 21, 23, 25];
		const boss = [0, 3, 6, 9, 12, 15, 19, 23, 27, 31, 35, 39, 43, 47, 51, 55];
		const exp = [0, 0.5, 1, 1.5, 2, 2.5, 3, 3.5, 4, 4.5, 5, 6, 7, 8, 9, 10];
		const arcane = [0, 5, 10, 15, 20, 25, 30, 35, 40, 45, 50, 60, 70, 80, 90, 100];
		for (let l = 0; l <= 15; l++) {
			expect(hyperEffect('criticalRate', l)).toBe(critRate[l]);
			expect(hyperEffect('bossDamage', l)).toBe(boss[l]);
			expect(hyperEffect('normalDamage', l)).toBe(boss[l]);
			expect(hyperEffect('statusResistance', l)).toBe(critRate[l]);
			expect(hyperEffect('bonusExp', l)).toBe(exp[l]);
			expect(hyperEffect('arcaneForce', l)).toBe(arcane[l]);
		}
	});

	it('is linear for the flat stats', () => {
		expect(hyperEffect('str', 7)).toBe(210);
		expect(hyperEffect('attack', 7)).toBe(21);
		expect(hyperEffect('ignoreDefense', 10)).toBe(30);
		expect(hyperEffect('damage', 12)).toBe(36);
		expect(hyperEffect('maxHpPercent', 12)).toBe(24);
	});

	it('rejects levels above the cap', () => {
		expect(() => hyperEffect('dfTf', 11)).toThrow(/caps at level 10/);
		expect(() => hyperEffect('bossDamage', 16)).toThrow();
		expect(() => hyperEffect('str', -1)).toThrow();
	});

	it('reports deltas for upgrade candidates', () => {
		expect(hyperEffectDelta('bossDamage', 10, 11)).toBe(4);
		expect(hyperEffectDelta('bossDamage', 4, 5)).toBe(3);
		expect(hyperEffectDelta('criticalRate', 5, 6)).toBe(2);
	});

	it('publishes the effective marginal IED table', () => {
		expect(HYPER_IED_EFFECTIVE_MARGINAL).toHaveLength(15);
		expect(HYPER_IED_EFFECTIVE_MARGINAL[0]).toBe(0.03);
		expect(HYPER_IED_EFFECTIVE_MARGINAL[14]).toBeCloseTo(0.051724, 6);
		// each level is worth more than the last, because IED stacks multiplicatively
		for (let i = 1; i < HYPER_IED_EFFECTIVE_MARGINAL.length; i++) {
			expect(HYPER_IED_EFFECTIVE_MARGINAL[i]).toBeGreaterThan(HYPER_IED_EFFECTIVE_MARGINAL[i - 1]);
		}
	});
});
