/**
 * Hyper Stats — GMS 2026.
 *
 * Transcribed from `docs/research/formulas.md` §4B §1 "Hyper Stats".
 * Primary sources cited there:
 *   - https://strategywiki.org/wiki/MapleStory/Hyper_Stats  (cost curve, points table, per-stat curves)
 *   - https://mystrange01.github.io/hyperCalc/main.js       (KMS simulator source, corroborating)
 *   - https://codingace.net/statistics/hyper_stat_maplestory.html
 *   - https://orangemushroom.net/2025/12/28/kms-ver-1-2-410-maplestory-crown-kinesis-remaster/
 *
 * System: unlocked at character level 140; 17 stats; 16 cap at level 15 and
 * "DF/TF Increase" caps at 10; the last 5 levels of every stat (and Arcane Force
 * entirely) require the 5th Job Advancement. Reset costs 10,000,000 mesos and
 * there are 3 presets (the preset-switch fee was removed in the CROWN update).
 * There is **no Sacred/Authentic Force hyper stat**.
 */

/* -------------------------------------------------------------------------- */
/* Keys                                                                        */
/* -------------------------------------------------------------------------- */

export type HyperStatKey =
	| 'str'
	| 'dex'
	| 'int'
	| 'luk'
	| 'maxHpPercent'
	| 'maxMpPercent'
	| 'dfTf'
	| 'criticalRate'
	| 'criticalDamage'
	| 'ignoreDefense'
	| 'damage'
	| 'bossDamage'
	| 'normalDamage'
	| 'statusResistance'
	| 'attack'
	| 'bonusExp'
	| 'arcaneForce';

export interface HyperStatSpec {
	key: HyperStatKey;
	label: string;
	maxLevel: number;
	/** Unit of the value `hyperEffect` returns. */
	unit: 'flat' | 'percent';
	note?: string;
}

/** All 17 hyper stats. formulas.md §4B §1.1, §1.4, §1.5. */
export const HYPER_STATS: Record<HyperStatKey, HyperStatSpec> = {
	str: {
		key: 'str',
		label: 'STR',
		maxLevel: 15,
		unit: 'flat',
		note: 'final stat — not affected by %STR / %All Stat'
	},
	dex: {
		key: 'dex',
		label: 'DEX',
		maxLevel: 15,
		unit: 'flat',
		note: 'final stat — not affected by %DEX / %All Stat'
	},
	int: {
		key: 'int',
		label: 'INT',
		maxLevel: 15,
		unit: 'flat',
		note: 'final stat — not affected by %INT / %All Stat'
	},
	luk: {
		key: 'luk',
		label: 'LUK',
		maxLevel: 15,
		unit: 'flat',
		note: 'final stat — not affected by %LUK / %All Stat'
	},
	maxHpPercent: { key: 'maxHpPercent', label: 'Max HP %', maxLevel: 15, unit: 'percent' },
	maxMpPercent: { key: 'maxMpPercent', label: 'Max MP %', maxLevel: 15, unit: 'percent' },
	dfTf: {
		key: 'dfTf',
		label: 'DF/TF Increase',
		maxLevel: 10,
		unit: 'flat',
		note: 'Demon Slayer, Kanna, Kinesis, Zero only. Renamed from "Maximum DF/TF/PP" in the CROWN update.'
	},
	criticalRate: { key: 'criticalRate', label: 'Critical Rate', maxLevel: 15, unit: 'percent' },
	criticalDamage: {
		key: 'criticalDamage',
		label: 'Critical Damage',
		maxLevel: 15,
		unit: 'percent'
	},
	ignoreDefense: {
		key: 'ignoreDefense',
		label: 'Ignore Enemy DEF',
		maxLevel: 15,
		unit: 'percent',
		note: 'nominal IED; stacks multiplicatively — see HYPER_IED_EFFECTIVE_MARGINAL'
	},
	damage: { key: 'damage', label: 'Damage', maxLevel: 15, unit: 'percent' },
	bossDamage: {
		key: 'bossDamage',
		label: 'Damage to Boss Monsters',
		maxLevel: 15,
		unit: 'percent'
	},
	normalDamage: {
		key: 'normalDamage',
		label: 'Damage to Normal Monsters',
		maxLevel: 15,
		unit: 'percent'
	},
	statusResistance: {
		key: 'statusResistance',
		label: 'Abnormal Status Resistance',
		maxLevel: 15,
		unit: 'flat'
	},
	attack: {
		key: 'attack',
		label: 'Weapon and Magic ATT',
		maxLevel: 15,
		unit: 'flat',
		note: 'is affected by %ATT increases'
	},
	bonusExp: { key: 'bonusExp', label: 'Bonus EXP', maxLevel: 15, unit: 'percent' },
	arcaneForce: {
		key: 'arcaneForce',
		label: 'Arcane Force',
		maxLevel: 15,
		unit: 'flat',
		note: 'requires 5th job and an Arcane Symbol; only affects Arcane River map penalties/bonuses'
	}
};

export const HYPER_STAT_KEYS = Object.keys(HYPER_STATS) as HyperStatKey[];

export const HYPER_STAT_UNLOCK_LEVEL = 140;
export const HYPER_STAT_RESET_COST = 10_000_000;
export const HYPER_STAT_PRESETS = 3;

/* -------------------------------------------------------------------------- */
/* Cost curve                                                                  */
/* -------------------------------------------------------------------------- */

/**
 * Point cost to reach each level, per stat. Index 0 == level 0 (free).
 * Levels 11-15 cost 50/65/80/95/110 — a maxed stat costs **550** points.
 *
 * CONFLICT (resolved in the research): several SEO calculator pages claim
 * "1..10 cost 1,2,3…10 and 11-15 cost 15,20,25,30,35, total 180". That is wrong;
 * StrategyWiki, the KMS simulator source and codingace's embedded data all agree
 * on the curve below. formulas.md §4B §1.2.
 */
export const HYPER_STAT_LEVEL_COST = [
	0, 1, 2, 4, 8, 10, 15, 20, 25, 30, 35, 50, 65, 80, 95, 110
] as const;

/** Cumulative point cost to reach each level from 0. Level 15 = 550. */
export const HYPER_STAT_CUMULATIVE_COST = [
	0, 1, 3, 7, 15, 25, 40, 60, 85, 115, 150, 200, 265, 345, 440, 550
] as const;

/** Points to max a single 15-level stat. The 10-capped DF/TF stat maxes at 150. */
export const HYPER_STAT_MAX_COST = 550;

/**
 * Point cost of raising one hyper stat from level `from` to level `to`.
 * The same curve applies to every stat, including the level-10-capped DF/TF one.
 */
export function hyperCost(from: number, to: number): number {
	if (to <= from) return 0;
	if (from < 0 || to > 15) {
		throw new Error(`Hyper stat levels run 0-15 (got ${from} → ${to}).`);
	}
	return HYPER_STAT_CUMULATIVE_COST[to] - HYPER_STAT_CUMULATIVE_COST[from];
}

/* -------------------------------------------------------------------------- */
/* Points available by character level                                         */
/* -------------------------------------------------------------------------- */

/**
 * Points awarded per level-up, by 10-level bracket, with the closed form for the
 * cumulative total. You get 3 points on reaching level 140 and the award grows by
 * 1 every 10 character levels. formulas.md §4B §1.3.
 */
export const HYPER_POINT_BRACKETS = [
	{ minLevel: 140, maxLevel: 149, perLevel: 3, offset: 417 },
	{ minLevel: 150, maxLevel: 159, perLevel: 4, offset: 566 },
	{ minLevel: 160, maxLevel: 169, perLevel: 5, offset: 725 },
	{ minLevel: 170, maxLevel: 179, perLevel: 6, offset: 894 },
	{ minLevel: 180, maxLevel: 189, perLevel: 7, offset: 1073 },
	{ minLevel: 190, maxLevel: 199, perLevel: 8, offset: 1262 },
	{ minLevel: 200, maxLevel: 209, perLevel: 9, offset: 1461 },
	{ minLevel: 210, maxLevel: 219, perLevel: 10, offset: 1670 },
	{ minLevel: 220, maxLevel: 229, perLevel: 11, offset: 1889 },
	{ minLevel: 230, maxLevel: 239, perLevel: 12, offset: 2118 },
	{ minLevel: 240, maxLevel: 249, perLevel: 13, offset: 2357 },
	{ minLevel: 250, maxLevel: 259, perLevel: 14, offset: 2606 },
	{ minLevel: 260, maxLevel: 269, perLevel: 15, offset: 2865 },
	{ minLevel: 270, maxLevel: 279, perLevel: 16, offset: 3134 },
	{ minLevel: 280, maxLevel: 289, perLevel: 17, offset: 3413 },
	{ minLevel: 290, maxLevel: 299, perLevel: 18, offset: 3702 }
] as const;

/**
 * Total hyper stat points owned at a character level.
 *
 * ⚠️ Level 300 = **1,699** (1,680 at Lv299 plus a one-off 19-point award). That
 * final award is sourced only from StrategyWiki's row-by-row table — the research
 * marks it "lightly UNVERIFIED". (The KMS hyperCalc source has an off-by-one bug
 * at exactly level 300 and returns 1,518.)
 * formulas.md §4B §1.3.
 */
export const HYPER_POINTS_AT_300 = 1699;

export function hyperPointsAt(level: number): number {
	if (level < HYPER_STAT_UNLOCK_LEVEL) return 0;
	if (level >= 300) return HYPER_POINTS_AT_300;
	for (const bracket of HYPER_POINT_BRACKETS) {
		if (level <= bracket.maxLevel) return bracket.perLevel * level - bracket.offset;
	}
	return HYPER_POINTS_AT_300;
}

/** Published checkpoint values, used as test fixtures. formulas.md §4B §1.3. */
export const HYPER_POINT_CHECKPOINTS: Record<number, number> = {
	140: 3,
	150: 34,
	160: 75,
	170: 126,
	180: 187,
	190: 258,
	200: 339,
	210: 430,
	220: 531,
	230: 642,
	240: 763,
	250: 894,
	260: 1035,
	270: 1186,
	280: 1347,
	290: 1518,
	299: 1680,
	300: 1699
};

/* -------------------------------------------------------------------------- */
/* Effect per level                                                            */
/* -------------------------------------------------------------------------- */

type EffectFn = (level: number) => number;

/**
 * Cumulative effect at each level, per stat. Curves match the KMS simulator's
 * `increasedStat` formulas exactly. formulas.md §4B §1.4.
 */
const EFFECTS: Record<HyperStatKey, EffectFn> = {
	// +30 final stat per level → 450 at 15
	str: (l) => l * 30,
	dex: (l) => l * 30,
	int: (l) => l * 30,
	luk: (l) => l * 30,
	// +2% per level → 30% at 15
	maxHpPercent: (l) => l * 2,
	maxMpPercent: (l) => l * 2,
	// +10 per level, capped at level 10 → 100
	dfTf: (l) => Math.min(l, 10) * 10,
	// +1%/lv for 1-5, +2%/lv for 6-15 → 25% at 15
	criticalRate: (l) => (l <= 5 ? l : (l - 5) * 2 + 5),
	// +1%/level → 15% at 15
	criticalDamage: (l) => l,
	// +3 percentage points of nominal IED per level → 45% at 15
	ignoreDefense: (l) => l * 3,
	// +3%/level → 45% at 15
	damage: (l) => l * 3,
	// +3%/lv for 1-5, +4%/lv for 6-15 → 55% at 15
	bossDamage: (l) => (l <= 5 ? l * 3 : (l - 5) * 4 + 15),
	normalDamage: (l) => (l <= 5 ? l * 3 : (l - 5) * 4 + 15),
	// +1/lv for 1-5, +2/lv for 6-15 → 25 at 15
	statusResistance: (l) => (l <= 5 ? l : (l - 5) * 2 + 5),
	// +3 ATT and MATT per level → 45 at 15
	attack: (l) => l * 3,
	// +0.5%/lv for 1-10, +1%/lv for 11-15 → 10% at 15
	bonusExp: (l) => (l <= 10 ? l * 0.5 : l - 10 + 5),
	// +5/lv for 1-10, +10/lv for 11-15 → 100 at 15
	arcaneForce: (l) => (l <= 10 ? l * 5 : (l - 10) * 10 + 50)
};

/**
 * Cumulative effect of a hyper stat at a level (not the per-level delta).
 * Percentages are returned as whole percents (`45` = 45%).
 */
export function hyperEffect(key: HyperStatKey, level: number): number {
	const spec = HYPER_STATS[key];
	if (!spec) throw new Error(`Unknown hyper stat "${key}".`);
	if (level < 0) throw new Error(`Hyper stat level must be >= 0 (got ${level}).`);
	if (level > spec.maxLevel) {
		throw new Error(`${spec.label} caps at level ${spec.maxLevel} (got ${level}).`);
	}
	return EFFECTS[key](level);
}

/** Effect gained by going from `from` to `to` on one stat. */
export function hyperEffectDelta(key: HyperStatKey, from: number, to: number): number {
	return hyperEffect(key, to) - hyperEffect(key, from);
}

/**
 * StrategyWiki's *effective* marginal IED gain per hyper stat level — the relative
 * reduction in remaining enemy DEF, assuming the hyper stat is your only IED source.
 * Index 0 == level 1. Because IED stacks as `1 − Π(1 − IEDᵢ)`, each level is worth
 * more than the last. formulas.md §4B §1.4 "Ignore Enemy DEF".
 */
export const HYPER_IED_EFFECTIVE_MARGINAL = [
	0.03, 0.030927, 0.031914, 0.032967, 0.03409, 0.035294, 0.036585, 0.037974, 0.039473, 0.041095,
	0.042857, 0.044776, 0.046875, 0.04918, 0.051724
] as const;

/** Value and cost of every stat at max level. formulas.md §4B §1.5. */
export const HYPER_STAT_MAXED = HYPER_STAT_KEYS.map((key) => ({
	key,
	maxLevel: HYPER_STATS[key].maxLevel,
	value: hyperEffect(key, HYPER_STATS[key].maxLevel),
	cost: hyperCost(0, HYPER_STATS[key].maxLevel)
}));

/**
 * Things that are NOT hyper stats, listed because stale guides claim they are:
 * Knockback Resistance / Stance, Speed, Jump, Elemental Resistance, All Stat,
 * Damage Absorption (all pre-2016), and Sacred/Authentic Force (never existed).
 * formulas.md §4B §1.6.
 */
export const NOT_HYPER_STATS = [
	'Knockback Resistance / Stance',
	'Speed',
	'Jump',
	'Elemental Resistance',
	'All Stat',
	'Damage Absorption',
	'Sacred / Authentic Force'
] as const;
