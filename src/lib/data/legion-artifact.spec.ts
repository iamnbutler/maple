import { describe, expect, it } from 'vitest';

import {
	ARTIFACT_BOSS_MISSION_EXP,
	ARTIFACT_BOSS_WEEKLY_CEILING,
	ARTIFACT_CRYSTAL_MAX_COST,
	ARTIFACT_EFFECT_KEYS,
	ARTIFACT_EFFECT_VALUES,
	ARTIFACT_EXP_TO_NEXT,
	ARTIFACT_MAX_CRYSTALS,
	ARTIFACT_MAX_EFFECT_LEVEL,
	ARTIFACT_NORMAL_WEEKLY_EXP,
	ARTIFACT_TOTAL_EXP_TO_MAX,
	artifactDaysBetween,
	artifactEffectDelta,
	artifactEffectValue,
	artifactExpBetween,
	artifactExpToReach,
	crystalsAt,
	cumulativeAp,
	effectLevelBudget,
	isReachable,
	maxArtifactPoints,
	maxDistinctEffects,
	maxTotalGrades,
	nextMeaningfulLevel,
	weeklyArtifactExp
} from './legion-artifact';

/* -------------------------------------------------------------------------- */
/* Effect values — legion-artifact.md §2                                       */
/* -------------------------------------------------------------------------- */

describe('effect values', () => {
	it('covers 16 effects, each with 10 levels', () => {
		expect(ARTIFACT_EFFECT_KEYS).toHaveLength(16);
		for (const key of ARTIFACT_EFFECT_KEYS) {
			expect(ARTIFACT_EFFECT_VALUES[key], key).toHaveLength(10);
		}
	});

	it('gives the cited level-10 values', () => {
		// These are what formulas.md §8.2 mislabels as "per-stat caps".
		expect(artifactEffectValue('allStat', 10)).toBe(150);
		expect(artifactEffectValue('maxHpMp', 10)).toBe(7_500);
		expect(artifactEffectValue('attack', 10)).toBe(30);
		expect(artifactEffectValue('damage', 10)).toBe(15);
		expect(artifactEffectValue('bossDamage', 10)).toBe(15);
		expect(artifactEffectValue('ignoreDefense', 10)).toBe(20);
		expect(artifactEffectValue('buffDuration', 10)).toBe(20);
		expect(artifactEffectValue('cooldownSkip', 10)).toBe(7.5);
		expect(artifactEffectValue('mesosObtained', 10)).toBe(12);
		expect(artifactEffectValue('itemDropRate', 10)).toBe(12);
		expect(artifactEffectValue('criticalRate', 10)).toBe(20);
		expect(artifactEffectValue('criticalDamage', 10)).toBe(4);
		expect(artifactEffectValue('expObtained', 10)).toBe(12);
		expect(artifactEffectValue('statusResistance', 10)).toBe(12);
		expect(artifactEffectValue('summonDuration', 10)).toBe(20);
		expect(artifactEffectValue('finalAttackDamage', 10)).toBe(30);
	});

	it('is linear for the 12 linear effects', () => {
		for (const key of [
			'allStat',
			'maxHpMp',
			'attack',
			'damage',
			'bossDamage',
			'ignoreDefense',
			'buffDuration',
			'cooldownSkip',
			'criticalRate',
			'criticalDamage',
			'summonDuration',
			'finalAttackDamage'
		] as const) {
			const ten = artifactEffectValue(key, 10);
			for (let level = 1; level <= 10; level += 1) {
				expect(artifactEffectValue(key, level), `${key} Lv${level}`).toBeCloseTo(
					(ten * level) / 10,
					6
				);
			}
		}
	});

	// The whole reason this research pass existed: Lv9 is NOT 0.9 x Lv10 for
	// the four milestone effects, and the Ren capture proves it.
	it('uses the milestone ladder for mesos, drop, EXP and status resistance', () => {
		for (const key of [
			'mesosObtained',
			'itemDropRate',
			'expObtained',
			'statusResistance'
		] as const) {
			expect([...ARTIFACT_EFFECT_VALUES[key]], key).toEqual([1, 2, 3, 4, 6, 7, 8, 9, 10, 12]);
			// Lv9 is 10, not 10.8 — the bump lands at 5 and 10.
			expect(artifactEffectValue(key, 9), key).toBe(10);
			expect(artifactEffectValue(key, 4), key).toBe(4);
			expect(artifactEffectValue(key, 5), key).toBe(6);
		}
	});

	it('gives 0 at level 0 and rejects out-of-range levels', () => {
		expect(artifactEffectValue('bossDamage', 0)).toBe(0);
		expect(() => artifactEffectValue('bossDamage', 11)).toThrow(/run 0-10/);
		expect(() => artifactEffectValue('bossDamage', -1)).toThrow(/run 0-10/);
		expect(() => artifactEffectValue('nope' as never, 1)).toThrow(/Unknown artifact effect/);
	});

	it('measures a level-up delta', () => {
		expect(artifactEffectDelta('bossDamage', 9, 10)).toBe(1.5);
		// The milestone effects jump 2 at level 10, not 1.
		expect(artifactEffectDelta('mesosObtained', 9, 10)).toBe(2);
		expect(artifactEffectDelta('mesosObtained', 8, 9)).toBe(1);
	});
});

/* -------------------------------------------------------------------------- */
/* Ground truth — legion-artifact.md §7                                        */
/* -------------------------------------------------------------------------- */

describe('the captured Ren artifact', () => {
	// Artifact Level 39, nine effect lines read off the Bonuses panel.
	const captured = {
		bossDamage: 10,
		ignoreDefense: 10,
		buffDuration: 10,
		mesosObtained: 9,
		itemDropRate: 10,
		criticalDamage: 10,
		expObtained: 9,
		summonDuration: 10,
		finalAttackDamage: 9
	} as const;

	it('reproduces every displayed value', () => {
		expect(artifactEffectValue('bossDamage', 10)).toBe(15); // "+15.00%"
		expect(artifactEffectValue('ignoreDefense', 10)).toBe(20); // "+20%"
		expect(artifactEffectValue('buffDuration', 10)).toBe(20); // "+20%"
		expect(artifactEffectValue('mesosObtained', 9)).toBe(10); // "+10%" — NOT 10.8
		expect(artifactEffectValue('itemDropRate', 10)).toBe(12); // "+12%"
		expect(artifactEffectValue('criticalDamage', 10)).toBe(4); // "+4.00%"
		expect(artifactEffectValue('expObtained', 9)).toBe(10); // "+10%"
		expect(artifactEffectValue('summonDuration', 10)).toBe(20); // "+20%"
		expect(artifactEffectValue('finalAttackDamage', 9)).toBe(27); // "+27%"
	});

	it('spends exactly the budget Artifact Level 39 affords', () => {
		const spent = Object.values(captured).reduce((sum, level) => sum + level, 0);
		expect(spent).toBe(87);
		expect(effectLevelBudget(39)).toBe(87);
	});

	it('is a reachable allocation', () => {
		expect(isReachable(captured, 39)).toEqual({ ok: true });
	});

	// 6 crystals x 3 slots = 18 slots, but the panel lists one line per DISTINCT
	// stat, and 12 grade-5 slots pair as (5+5) into 6 capped stats while the
	// remaining 3 grade-5s pair with 3 grade-4s into 3 Lv9 stats. Hence 9 lines.
	it('explains the nine lines at Artifact Level 39', () => {
		expect(crystalsAt(39)).toBe(6);
		// 18 stat slots, but only 16 effects exist to put in them, and the panel
		// lists one line per DISTINCT stat — so 9 lines is 9 stats, not 9 slots.
		expect(crystalsAt(39) * 3).toBe(18);
		expect(maxDistinctEffects(39)).toBe(16);
		expect(Object.keys(captured)).toHaveLength(9);
		expect(cumulativeAp(39)).toBe(46);
		expect(maxTotalGrades(39)).toBe(29);
	});
});

/* -------------------------------------------------------------------------- */
/* Crystals, AP and budget — §1, §3, §4                                        */
/* -------------------------------------------------------------------------- */

describe('crystals and AP', () => {
	it('unlocks a crystal at Lv10 and every 10 after, to 9 at Lv60', () => {
		expect(crystalsAt(1)).toBe(3);
		expect(crystalsAt(9)).toBe(3);
		expect(crystalsAt(10)).toBe(4);
		expect(crystalsAt(20)).toBe(5);
		expect(crystalsAt(30)).toBe(6);
		expect(crystalsAt(40)).toBe(7);
		expect(crystalsAt(50)).toBe(8);
		expect(crystalsAt(60)).toBe(ARTIFACT_MAX_CRYSTALS);
	});

	it('awards 1 AP per level plus 1 every 5th', () => {
		expect(cumulativeAp(1)).toBe(1);
		expect(cumulativeAp(5)).toBe(6);
		expect(cumulativeAp(14)).toBe(16); // the cited "two grade-5 crystals at Lv14" note
		expect(cumulativeAp(39)).toBe(46);
	});

	it('reaches exactly enough AP at Lv60 to max all 9 crystals', () => {
		expect(cumulativeAp(60)).toBe(72);
		expect(ARTIFACT_MAX_CRYSTALS * ARTIFACT_CRYSTAL_MAX_COST).toBe(72);
		expect(maxTotalGrades(60)).toBe(45); // 9 x grade 5
	});

	// The regression values the research asked for.
	it('reproduces the cited effect-level budgets', () => {
		expect(effectLevelBudget(10)).toBe(36);
		expect(effectLevelBudget(20)).toBe(57);
		expect(effectLevelBudget(30)).toBe(78);
		expect(effectLevelBudget(39)).toBe(87);
		expect(effectLevelBudget(40)).toBe(96);
		expect(effectLevelBudget(47)).toBe(105);
		expect(effectLevelBudget(50)).toBe(114);
		expect(effectLevelBudget(54)).toBe(120);
		expect(effectLevelBudget(60)).toBe(135);
	});

	it('grants nothing at all for levels 55-59', () => {
		for (const level of [55, 56, 57, 58, 59]) {
			expect(effectLevelBudget(level), `Lv${level}`).toBe(120);
		}
		expect(effectLevelBudget(54)).toBe(120);
	});

	it('is AP-bound below Lv47 and slot-bound at 47-49 and 54+', () => {
		// "You can max every crystal you own only at Lv47-49 and Lv54+."
		const allMaxed = (level: number) => maxTotalGrades(level) === crystalsAt(level) * 5;
		expect(allMaxed(46)).toBe(false);
		expect(allMaxed(47)).toBe(true);
		expect(allMaxed(49)).toBe(true);
		// The 8th crystal at Lv50 outruns AP again.
		expect(allMaxed(50)).toBe(false);
		expect(allMaxed(53)).toBe(false);
		expect(allMaxed(54)).toBe(true);
		expect(allMaxed(60)).toBe(true);
	});

	it('never exceeds 5 grades per crystal', () => {
		for (let level = 1; level <= 60; level += 1) {
			expect(maxTotalGrades(level), `Lv${level}`).toBeLessThanOrEqual(crystalsAt(level) * 5);
			expect(maxTotalGrades(level), `Lv${level}`).toBeGreaterThanOrEqual(crystalsAt(level));
		}
	});

	it('never decreases with level', () => {
		for (let level = 2; level <= 60; level += 1) {
			expect(effectLevelBudget(level), `Lv${level}`).toBeGreaterThanOrEqual(
				effectLevelBudget(level - 1)
			);
		}
	});
});

describe('isReachable', () => {
	it('rejects an allocation that overspends the budget', () => {
		const result = isReachable({ bossDamage: 10, ignoreDefense: 10, criticalDamage: 10 }, 1);
		expect(result.ok).toBe(false);
		expect(result.reason).toMatch(/affords 12/);
	});

	it('rejects an effect above level 10', () => {
		expect(isReachable({ bossDamage: 11 }, 60).ok).toBe(false);
	});

	it('rejects an unknown effect', () => {
		expect(isReachable({ stance: 5 } as never, 60).reason).toMatch(/unknown effect/);
	});

	it('rejects using more effects than there are slots', () => {
		// Lv1 has 3 crystals = 9 slots. Ten 1-level effects will not fit.
		const spread = Object.fromEntries(ARTIFACT_EFFECT_KEYS.slice(0, 10).map((k) => [k, 1]));
		const result = isReachable(spread, 1);
		expect(result.ok).toBe(false);
		expect(result.reason).toMatch(/only 9 slots/);
	});

	it('accepts a maxed Lv60 allocation', () => {
		// 135 budget over 14 effects: 13 at 10 plus one at 5.
		const alloc: Record<string, number> = {};
		for (const key of ARTIFACT_EFFECT_KEYS.slice(0, 13)) alloc[key] = ARTIFACT_MAX_EFFECT_LEVEL;
		alloc[ARTIFACT_EFFECT_KEYS[13]] = 5;
		expect(isReachable(alloc, 60)).toEqual({ ok: true });
	});
});

/* -------------------------------------------------------------------------- */
/* Levels and EXP — §4                                                         */
/* -------------------------------------------------------------------------- */

describe('artifact levels', () => {
	it('has an EXP step for each of levels 1-59', () => {
		expect(ARTIFACT_EXP_TO_NEXT).toHaveLength(59);
	});

	it('sums to the cited total for Lv60', () => {
		expect(artifactExpToReach(60)).toBe(ARTIFACT_TOTAL_EXP_TO_MAX);
		expect(artifactExpToReach(1)).toBe(0);
	});

	it('reproduces the cited cumulative checkpoints', () => {
		expect(artifactExpToReach(10)).toBe(24_300);
		expect(artifactExpToReach(20)).toBe(56_050);
		expect(artifactExpToReach(30)).toBe(95_050);
		expect(artifactExpToReach(39)).toBe(162_550);
		expect(artifactExpToReach(40)).toBe(172_550);
		expect(artifactExpToReach(50)).toBe(382_550);
	});

	it('rejects a level outside 1-60', () => {
		expect(() => artifactExpToReach(0)).toThrow(/run 1-60/);
		expect(() => artifactExpToReach(61)).toThrow(/run 1-60/);
	});

	it('prices the Ren capture at 1,180,000 EXP remaining', () => {
		expect(artifactExpBetween(39, 60)).toBe(1_180_000);
	});

	it('reproduces the Max Points column at its three breakpoints', () => {
		expect(maxArtifactPoints(1)).toBe(10_100);
		expect(maxArtifactPoints(30)).toBe(13_000);
		expect(maxArtifactPoints(50)).toBe(17_000);
		expect(maxArtifactPoints(60)).toBe(20_000);
	});
});

describe('nextMeaningfulLevel', () => {
	it('names the x10 cliff and what it is worth', () => {
		expect(nextMeaningfulLevel(39)).toEqual({ level: 40, exp: 10_000, budgetGained: 9 });
		expect(nextMeaningfulLevel(9)).toEqual({ level: 10, exp: 2_900, budgetGained: 9 });
	});

	it('skips the dead zone and prices 54 to 60 as one step', () => {
		const next = nextMeaningfulLevel(54);
		expect(next?.level).toBe(60);
		expect(next?.budgetGained).toBe(15);
		expect(next?.exp).toBe(730_000);
	});

	it('returns null at max level', () => {
		expect(nextMeaningfulLevel(60)).toBeNull();
	});

	it('never proposes a level that buys nothing', () => {
		for (let level = 1; level < 60; level += 1) {
			const next = nextMeaningfulLevel(level);
			if (next) expect(next.budgetGained, `from Lv${level}`).toBeGreaterThan(0);
		}
	});
});

/* -------------------------------------------------------------------------- */
/* Income — §6                                                                 */
/* -------------------------------------------------------------------------- */

describe('income', () => {
	it('counts only the three highest-valued boss missions', () => {
		const many = [
			'Extreme Kaling', // 4500
			'Hard Jupiter', // 4000
			'Hard Baldrix', // 4000
			'Normal Lotus', // 250 — should not count
			'Chaos Zakum' // 150 — should not count
		];
		expect(weeklyArtifactExp(many)).toBe(ARTIFACT_NORMAL_WEEKLY_EXP + 12_500);
	});

	it('reaches the cited weekly ceiling', () => {
		expect(ARTIFACT_BOSS_WEEKLY_CEILING).toBe(12_500);
		expect(weeklyArtifactExp(['Extreme Kaling', 'Hard Jupiter', 'Hard Baldrix'])).toBe(14_500);
	});

	it('still pays the normal missions with no bosses cleared', () => {
		expect(weeklyArtifactExp([])).toBe(2_000);
	});

	it('ignores a boss with no artifact mission', () => {
		expect(weeklyArtifactExp(['Normal Zakum'])).toBe(2_000);
	});

	it('has the cited boss values', () => {
		expect(ARTIFACT_BOSS_MISSION_EXP['Extreme Kaling']).toBe(4_500);
		expect(ARTIFACT_BOSS_MISSION_EXP['Normal Chosen Seren']).toBe(1_200);
		expect(ARTIFACT_BOSS_MISSION_EXP['Chaos Zakum']).toBe(150);
	});

	// The headline the UI has to respect: this is a multi-year track.
	it('prices Lv39 to Lv60 at roughly 570 days even at the ceiling', () => {
		const days = artifactDaysBetween(39, 60, 14_500);
		expect(Math.round(days)).toBe(570);
	});

	it('returns Infinity at zero income rather than dividing by zero', () => {
		expect(artifactDaysBetween(39, 60, 0)).toBe(Infinity);
	});
});
