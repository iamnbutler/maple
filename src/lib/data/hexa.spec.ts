import { describe, expect, it } from 'vitest';

import {
	ERDA_CONVERSION_IS_INCOME,
	EXPECTED_FRAGMENTS_PER_STAT_CORE,
	HEXA_ADDITIONAL_MULTIPLIER,
	HEXA_COST_CURVES,
	HEXA_ENHANCE_FRAGMENT_COST,
	HEXA_MAIN_LINE_CHANCE,
	HEXA_MAIN_MULTIPLIER,
	HEXA_MAIN_STAT_OVERRIDES,
	HEXA_MILESTONE_LEVELS,
	HEXA_NODE_TYPES,
	HEXA_SKILL_3_LIVE_IN_GMS,
	HEXA_SKILL_NODE_COUNT,
	HEXA_STAT_CORES,
	HEXA_STAT_KEYS,
	HEXA_STAT_LINE_MAX_LEVEL,
	HEXA_STAT_NODE_MAX_LEVEL,
	HEXA_UNLOCK_LEVEL,
	SOL_ERDA_CAP,
	costToNextMilestone,
	enhancementChances,
	enhancementCost,
	enhancementFinalDamage,
	hexaCost,
	hexaCostToMax,
	hexaMatrixCostToMax,
	hexaStatCoreLevel,
	hexaStatTotals,
	hexaStatValue,
	originMilestoneBonus,
	validateHexaStatCore,
	type HexaStatCore
} from './hexa';

/* -------------------------------------------------------------------------- */
/* Taxonomy — hexa.md §1                                                       */
/* -------------------------------------------------------------------------- */

describe('node taxonomy', () => {
	it('unlocks at 6th job, character level 260', () => {
		expect(HEXA_UNLOCK_LEVEL).toBe(260);
	});

	it('gives a GMS class 12 skill nodes', () => {
		// 1 Origin + 1 Ascent + 4 Mastery + 4 Enhancement + 2 Common.
		const total = Object.values(HEXA_NODE_TYPES).reduce((n, spec) => n + spec.count, 0);
		expect(total).toBe(HEXA_SKILL_NODE_COUNT);
		expect(total).toBe(12);
	});

	it('caps every node type at 30', () => {
		for (const spec of Object.values(HEXA_NODE_TYPES)) {
			expect(spec.maxLevel, spec.type).toBe(30);
		}
	});

	it('does not have the KMS third skill node', () => {
		expect(HEXA_SKILL_3_LIVE_IN_GMS).toBe(false);
	});
});

/* -------------------------------------------------------------------------- */
/* Cost curves — §2                                                            */
/* -------------------------------------------------------------------------- */

describe('cost curves', () => {
	it('has 30 entries per node type', () => {
		for (const type of Object.keys(HEXA_COST_CURVES) as (keyof typeof HEXA_COST_CURVES)[]) {
			expect(HEXA_COST_CURVES[type].solErda, type).toHaveLength(30);
			expect(HEXA_COST_CURVES[type].fragments, type).toHaveLength(30);
		}
	});

	// Whackybeanz's 6th-job calculator gives these exact totals.
	it('reproduces the cross-checked totals to level 30', () => {
		expect(hexaCostToMax('ascent')).toEqual({ solErda: 150, fragments: 4_500 });
		expect(hexaCostToMax('mastery')).toEqual({ solErda: 83, fragments: 2_252 });
		expect(hexaCostToMax('enhancement')).toEqual({ solErda: 123, fragments: 3_383 });
		expect(hexaCostToMax('common')).toEqual({ solErda: 208, fragments: 6_268 });
	});

	it('gives Origin its first level free', () => {
		// 6th job advancement grants Origin at level 1.
		expect(HEXA_COST_CURVES.origin.solErda[0]).toBe(0);
		expect(HEXA_COST_CURVES.origin.fragments[0]).toBe(0);
		// Which makes Origin exactly the Ascent cost minus the 5/100 activation.
		expect(hexaCostToMax('origin')).toEqual({ solErda: 145, fragments: 4_400 });
	});

	// hexa.md §2.9's whole-character row reads 1,527 / 35,432, but that row does
	// not follow from its own per-node table: 145 + 150 + 4x83 + 4x123 + 2x208 is
	// 1,535, and the fragment column is out by 8,544. The per-node figures are
	// the ones cross-checked against Whackybeanz, so the module derives the total
	// from them and the research doc has been corrected.
	it('derives the whole-class total from the cross-checked per-node costs', () => {
		expect(hexaMatrixCostToMax()).toEqual({ solErda: 1_535, fragments: 43_976 });

		const byHand =
			hexaCostToMax('origin').fragments +
			hexaCostToMax('ascent').fragments +
			4 * hexaCostToMax('mastery').fragments +
			4 * hexaCostToMax('enhancement').fragments +
			2 * hexaCostToMax('common').fragments;
		expect(hexaMatrixCostToMax().fragments).toBe(byHand);
	});

	it('applies the 0.5x and 0.75x multipliers with a per-cell ceil', () => {
		// general Lv1 is 5 Erda / 100 frags.
		expect(HEXA_COST_CURVES.ascent.solErda[0]).toBe(5);
		expect(HEXA_COST_CURVES.mastery.solErda[0]).toBe(Math.ceil(5 * 0.5));
		expect(HEXA_COST_CURVES.enhancement.solErda[0]).toBe(Math.ceil(5 * 0.75));
		// The ceil matters: general Lv2 is 1 Erda, and 1 x 0.5 ceils back to 1.
		expect(HEXA_COST_CURVES.ascent.solErda[1]).toBe(1);
		expect(HEXA_COST_CURVES.mastery.solErda[1]).toBe(1);
	});

	it('spikes at levels 10, 20 and 30', () => {
		const frags = HEXA_COST_CURVES.ascent.fragments;
		expect(frags[9]).toBe(200); // reaching Lv10
		expect(frags[19]).toBe(350); // reaching Lv20
		expect(frags[29]).toBe(500); // reaching Lv30
		// Each spike dwarfs its neighbours.
		expect(frags[9]).toBeGreaterThan(frags[8] * 3);
		expect(frags[19]).toBeGreaterThan(frags[18] * 2);
	});

	it('returns nothing for a non-upgrade and rejects out-of-range levels', () => {
		expect(hexaCost('mastery', 10, 10)).toEqual({ solErda: 0, fragments: 0 });
		expect(hexaCost('mastery', 20, 10)).toEqual({ solErda: 0, fragments: 0 });
		expect(() => hexaCost('mastery', 0, 31)).toThrow(/run 0-30/);
		expect(() => hexaCost('mastery', -1, 5)).toThrow(/run 0-30/);
	});
});

/* -------------------------------------------------------------------------- */
/* Enhancement node effect — §3.1                                              */
/* -------------------------------------------------------------------------- */

describe('enhancement node final damage', () => {
	it('reproduces the cited curve endpoints', () => {
		expect(enhancementFinalDamage(1)).toBe(11);
		expect(enhancementFinalDamage(9)).toBe(19);
		expect(enhancementFinalDamage(10)).toBe(25);
		expect(enhancementFinalDamage(19)).toBe(34);
		expect(enhancementFinalDamage(20)).toBe(40);
		expect(enhancementFinalDamage(29)).toBe(49);
		expect(enhancementFinalDamage(30)).toBe(60);
	});

	it('steps +1 per level except at the three milestones', () => {
		for (let level = 2; level <= 30; level += 1) {
			const step = enhancementFinalDamage(level) - enhancementFinalDamage(level - 1);
			const expected = level === 10 ? 6 : level === 20 ? 6 : level === 30 ? 11 : 1;
			expect(step, `Lv${level - 1} → Lv${level}`).toBe(expected);
		}
	});

	it('is zero at level 0 and rejects out-of-range levels', () => {
		expect(enhancementFinalDamage(0)).toBe(0);
		expect(() => enhancementFinalDamage(31)).toThrow(/run 0-30/);
	});
});

describe('costToNextMilestone', () => {
	it('exists because one level ahead is the wrong horizon', () => {
		// A node at 9 looks like +1% FD for a spiked price; it is really +6%.
		const oneLevel = enhancementFinalDamage(10) - enhancementFinalDamage(9);
		expect(oneLevel).toBe(6);
		const next = costToNextMilestone('enhancement', 9);
		expect(next?.level).toBe(10);
		expect(next?.finalDamageGained).toBe(6);
		expect(next?.cost).toEqual(hexaCost('enhancement', 9, 10));
	});

	it('prices the whole haul from a level well below the milestone', () => {
		const next = costToNextMilestone('enhancement', 0);
		expect(next?.level).toBe(10);
		expect(next?.finalDamageGained).toBe(25);
		expect(next?.cost).toEqual(hexaCost('enhancement', 0, 10));
	});

	it('names 20 and 30 as the later milestones', () => {
		expect(costToNextMilestone('enhancement', 10)?.level).toBe(20);
		expect(costToNextMilestone('enhancement', 20)?.level).toBe(30);
		expect(costToNextMilestone('enhancement', 30)).toBeNull();
		expect(HEXA_MILESTONE_LEVELS).toEqual([10, 20, 30]);
	});

	// The research's marginal-value table: 9→10 is the second-cheapest damage in
	// the whole system at 25 fragments per percentage point.
	it('makes 9 to 10 far better value than 20 to 21', () => {
		const cheap = costToNextMilestone('enhancement', 9)!;
		const perPoint = cheap.cost.fragments / cheap.finalDamageGained;
		expect(Math.round(perPoint)).toBe(25);

		const dear = hexaCost('enhancement', 20, 21);
		expect(dear.fragments).toBe(128);
	});
});

describe('origin milestones', () => {
	it('grants IED at 10, boss damage at 20 and both again at 30', () => {
		expect(originMilestoneBonus(9)).toEqual({ ignoreDefensePercent: 0, bossDamagePercent: 0 });
		expect(originMilestoneBonus(10)).toEqual({ ignoreDefensePercent: 20, bossDamagePercent: 0 });
		expect(originMilestoneBonus(20)).toEqual({ ignoreDefensePercent: 20, bossDamagePercent: 20 });
		expect(originMilestoneBonus(30)).toEqual({ ignoreDefensePercent: 50, bossDamagePercent: 50 });
	});
});

/* -------------------------------------------------------------------------- */
/* HEXA Stat — §4                                                              */
/* -------------------------------------------------------------------------- */

describe('HEXA Stat values', () => {
	it('has six stats, the same pool for main and additional', () => {
		expect(HEXA_STAT_KEYS).toHaveLength(6);
	});

	it('scales an additional line linearly', () => {
		expect(HEXA_ADDITIONAL_MULTIPLIER).toEqual([1, 2, 3, 4, 5, 6, 7, 8, 9, 10]);
		expect(hexaStatValue('attack', 10, 'additional')).toBe(50);
		expect(hexaStatValue('mainStat', 8, 'additional')).toBe(800);
		expect(hexaStatValue('criticalDamage', 8, 'additional')).toBe(2.8);
	});

	it('accelerates a main line', () => {
		expect(HEXA_MAIN_MULTIPLIER).toEqual([1, 2, 3, 4, 6, 8, 10, 13, 16, 20]);
		// A main line at 10 is worth exactly twice an additional line at 10.
		for (const key of HEXA_STAT_KEYS) {
			expect(hexaStatValue(key, 10, 'main'), key).toBeCloseTo(
				hexaStatValue(key, 10, 'additional') * 2,
				6
			);
		}
	});

	it('is identical for main and additional through level 4', () => {
		for (let level = 1; level <= 4; level += 1) {
			expect(hexaStatValue('attack', level, 'main')).toBe(
				hexaStatValue('attack', level, 'additional')
			);
		}
		// And diverges from level 5.
		expect(hexaStatValue('attack', 5, 'main')).toBe(30);
		expect(hexaStatValue('attack', 5, 'additional')).toBe(25);
	});

	it('gives 0 at level 0 and rejects out-of-range levels', () => {
		expect(hexaStatValue('attack', 0, 'main')).toBe(0);
		expect(() => hexaStatValue('attack', 11, 'main')).toThrow(/run 0-10/);
		expect(() => hexaStatValue('nope' as never, 1, 'main')).toThrow(/Unknown HEXA stat/);
	});

	it('records the Xenon and Demon Avenger main-stat exceptions', () => {
		expect(HEXA_MAIN_STAT_OVERRIDES.xenon.multiplier).toBe(0.48);
		expect(HEXA_MAIN_STAT_OVERRIDES['demon-avenger'].multiplier).toBe(21);
	});

	it('gates the three cores on character level and the previous core', () => {
		expect(HEXA_STAT_CORES.map((c) => c.characterLevel)).toEqual([260, 265, 270]);
		expect(HEXA_STAT_CORES[1].requiresPreviousAtLevel).toBe(20);
		expect(HEXA_STAT_CORES[2].requiresPreviousAtLevel).toBe(20);
	});
});

describe('HEXA Stat cores', () => {
	const core: HexaStatCore = {
		main: { key: 'attack', level: 6 },
		additional: [
			{ key: 'criticalDamage', level: 8 },
			{ key: 'mainStat', level: 6 }
		]
	};

	it('reads a core level as the sum of its three lines', () => {
		expect(hexaStatCoreLevel(core)).toBe(20);
		expect(HEXA_STAT_NODE_MAX_LEVEL).toBe(20);
		expect(HEXA_STAT_LINE_MAX_LEVEL).toBe(10);
	});

	it('accepts a legal core', () => {
		expect(validateHexaStatCore(core)).toEqual({ ok: true });
	});

	it('rejects duplicate stats on one core', () => {
		const dup: HexaStatCore = {
			main: { key: 'attack', level: 5 },
			additional: [
				{ key: 'attack', level: 5 },
				{ key: 'mainStat', level: 5 }
			]
		};
		expect(validateHexaStatCore(dup).reason).toMatch(/distinct/);
	});

	it('rejects a line above 10 and a core summing above 20', () => {
		expect(
			validateHexaStatCore({
				main: { key: 'attack', level: 11 },
				additional: [
					{ key: 'criticalDamage', level: 1 },
					{ key: 'mainStat', level: 1 }
				]
			}).reason
		).toMatch(/cap at 10/);

		expect(
			validateHexaStatCore({
				main: { key: 'attack', level: 10 },
				additional: [
					{ key: 'criticalDamage', level: 10 },
					{ key: 'mainStat', level: 10 }
				]
			}).reason
		).toMatch(/sum to 30/);
	});
});

/* -------------------------------------------------------------------------- */
/* Ground truth — §7                                                           */
/* -------------------------------------------------------------------------- */

describe('the captured Ren HEXA Stat', () => {
	// Both cores read off the HEXA Stat panel, Ren Lv272, 2026-09-06.
	//
	// Core numbering follows the in-game hex diagram: IMG_7994 has core I
	// selected, IMG_7995 core II. Note the `06 / 20` counter in IMG_7994 belongs
	// to the UNCHECKED saved node in the left tile — the displayed lines are the
	// checked 20-level node's, and they sum to 20. See hexa.md §7.7.
	const nodeI: HexaStatCore = {
		main: { key: 'criticalDamage', level: 2 },
		additional: [
			{ key: 'attack', level: 10 },
			{ key: 'mainStat', level: 8 }
		]
	};
	const nodeII: HexaStatCore = {
		main: { key: 'attack', level: 6 },
		additional: [
			{ key: 'criticalDamage', level: 8 },
			{ key: 'mainStat', level: 6 }
		]
	};

	it('reproduces every displayed line value on core I', () => {
		expect(hexaStatValue('criticalDamage', 2, 'main')).toBe(0.7); // "+0.70%", LEVEL 2
		expect(hexaStatValue('attack', 10, 'additional')).toBe(50); // "Attack Power +50", LEVEL 10
		expect(hexaStatValue('mainStat', 8, 'additional')).toBe(800); // "STR +800", LEVEL 8
		expect(hexaStatCoreLevel(nodeI)).toBe(20);
	});

	it('reproduces every displayed line value on core II', () => {
		expect(hexaStatValue('attack', 6, 'main')).toBe(40); // "Attack Power +40", LEVEL 6
		expect(hexaStatValue('criticalDamage', 8, 'additional')).toBe(2.8); // "+2.80%", LEVEL 8
		expect(hexaStatValue('mainStat', 6, 'additional')).toBe(600); // "STR +600", LEVEL 6
		expect(hexaStatCoreLevel(nodeII)).toBe(20);
	});

	it('reproduces the Current Applied Stats panel by summing the cores', () => {
		expect(hexaStatTotals([nodeI, nodeII])).toEqual({
			attack: 90, // 40 + 50
			criticalDamage: 3.5, // 2.80 + 0.70
			mainStat: 1_400 // 600 + 800
		});
	});

	it('satisfies every documented cross-node constraint', () => {
		expect(validateHexaStatCore(nodeI)).toEqual({ ok: true });
		expect(validateHexaStatCore(nodeII)).toEqual({ ok: true });
		// No duplicate MAIN stats across cores.
		expect(nodeI.main.key).not.toBe(nodeII.main.key);
	});

	it('reproduces every displayed enhancement rate', () => {
		// Core I is the strongest confirmation in the whole capture: the 0.00% /
		// 65.00% pair is only producible by the capped-line rule, with the main
		// chance read off main level 2.
		expect(enhancementChances(nodeI)).toEqual({ main: 35, additional: [0, 65] });

		// Core II: main at level 6 -> 20%, the two additional lines split the rest.
		expect(enhancementChances(nodeII)).toEqual({ main: 20, additional: [40, 40] });
	});

	it('confirms the Sol Erda cap the panel shows as 01/20', () => {
		expect(SOL_ERDA_CAP).toBe(20);
	});
});

/* -------------------------------------------------------------------------- */
/* The enhancement roll — §4.6                                                 */
/* -------------------------------------------------------------------------- */

describe('enhancement rates', () => {
	it('is driven by the main line level alone', () => {
		expect(HEXA_MAIN_LINE_CHANCE).toEqual([35, 35, 35, 20, 20, 20, 20, 15, 10, 5, 0]);
	});

	it('drops the main line to 0% once it is capped', () => {
		const capped: HexaStatCore = {
			main: { key: 'attack', level: 10 },
			additional: [
				{ key: 'criticalDamage', level: 5 },
				{ key: 'mainStat', level: 5 }
			]
		};
		expect(enhancementChances(capped)).toEqual({ main: 0, additional: [50, 50] });
	});

	it('gives the whole remainder to the surviving additional line', () => {
		const oneCapped: HexaStatCore = {
			main: { key: 'attack', level: 0 },
			additional: [
				{ key: 'criticalDamage', level: 10 },
				{ key: 'mainStat', level: 3 }
			]
		};
		expect(enhancementChances(oneCapped)).toEqual({ main: 35, additional: [0, 65] });
	});

	it('always sums to 100%', () => {
		for (let main = 0; main <= 10; main += 1) {
			const core: HexaStatCore = {
				main: { key: 'attack', level: main },
				additional: [
					{ key: 'criticalDamage', level: 0 },
					{ key: 'mainStat', level: 0 }
				]
			};
			const chances = enhancementChances(core);
			expect(chances.main + chances.additional[0] + chances.additional[1], `main ${main}`).toBe(
				100
			);
		}
	});

	it('prices the next enhancement off the main line level', () => {
		expect(HEXA_ENHANCE_FRAGMENT_COST).toEqual([10, 10, 10, 20, 20, 20, 20, 30, 40, 50, 50]);
		// The level-8 row is the one Whackybeanz gets wrong; the wiki and the
		// simulator both say 40.
		expect(HEXA_ENHANCE_FRAGMENT_COST[8]).toBe(40);
		expect(
			enhancementCost({
				main: { key: 'attack', level: 6 },
				additional: [
					{ key: 'criticalDamage', level: 8 },
					{ key: 'mainStat', level: 6 }
				]
			})
		).toBe(20);
	});

	it('never gets cheaper as the main line rises', () => {
		for (let level = 1; level <= 10; level += 1) {
			expect(HEXA_ENHANCE_FRAGMENT_COST[level]).toBeGreaterThanOrEqual(
				HEXA_ENHANCE_FRAGMENT_COST[level - 1]
			);
		}
	});

	it('keeps the expected 0 to 20 cost between its floor and its worst case', () => {
		expect(EXPECTED_FRAGMENTS_PER_STAT_CORE).toBeGreaterThan(200);
		expect(EXPECTED_FRAGMENTS_PER_STAT_CORE).toBeLessThan(730);
	});
});

describe('erda conversion', () => {
	it('is not income', () => {
		// It converts Sol Erda you already hold, at a 70% loss.
		expect(ERDA_CONVERSION_IS_INCOME).toBe(false);
	});
});
