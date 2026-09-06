/**
 * Flames / Bonus Stats ("Additional Options") — GMS 2026.
 *
 * Transcribed from `docs/research/formulas.md` §4A §2 "Flames / Bonus Stats".
 * Primary sources cited there:
 *   - https://maplestorywiki.net/w/Bonus_Stats
 *   - https://maplestorywiki.net/w/Bonus_Stats/Stat_Tables   (all value tables + formulas)
 *   - https://strategywiki.org/wiki/MapleStory/Bonus_Stats   (tier/line probabilities, benchmarks)
 *   - https://www.whackybeanz.com/guides/flames              (flame score convention)
 *
 * WORLD SCOPE: this tracker is Heroic (Reboot) only. Where flame economics differ
 * by world type, only the Heroic path is modelled — see `FLAME_SOURCES_HEROIC`.
 *
 * Where the research gives an exact formula we implement the formula and test it
 * against the tabulated values, rather than shipping the table twice.
 */

/* -------------------------------------------------------------------------- */
/* Tiers, flames, probabilities                                                */
/* -------------------------------------------------------------------------- */

/** Flame tiers run 1-7; normal gear can reach 5, flame-advantaged gear 7. */
export type FlameTier = 1 | 2 | 3 | 4 | 5 | 6 | 7;

/**
 * GMS flame items, with their MSEA/whackybeanz names and tier ranges.
 * Flame-advantaged equipment rolls +2 tiers relative to normal gear.
 * formulas.md §4A §2.3 · https://maplestorywiki.net/w/Rebirth_Flame
 */
export const FLAME_TYPES = {
	rebirth_levelled: {
		gmsName: 'Rebirth Flame Lv.100-150',
		altName: 'Resurrection Flame <Level>',
		normalTiers: [1, 4],
		advantagedTiers: [3, 6],
		keepsOldStats: false
	},
	powerful: {
		gmsName: 'Powerful Rebirth Flame',
		altName: 'Crimson Resurrection Flame (CRF)',
		normalTiers: [1, 4],
		advantagedTiers: [3, 6],
		keepsOldStats: false
	},
	blazing: {
		gmsName: 'Blazing Rebirth Flame',
		altName: 'Obsidian Flame',
		normalTiers: [1, 4],
		advantagedTiers: [3, 6],
		keepsOldStats: true
	},
	eternal: {
		gmsName: 'Eternal Rebirth Flame',
		altName: 'Rainbow Resurrection Flame (RRF)',
		normalTiers: [2, 5],
		advantagedTiers: [4, 7],
		keepsOldStats: false
	},
	black: {
		gmsName: 'Black Rebirth Flame',
		altName: 'Black Resurrection Flame (BRF)',
		normalTiers: [2, 5],
		advantagedTiers: [4, 7],
		keepsOldStats: true
	},
	abyssal: {
		gmsName: 'Abyssal Rebirth Flame',
		altName: 'Abyssal Resurrection Flame (ARF)',
		normalTiers: [3, 5],
		advantagedTiers: [5, 7],
		keepsOldStats: true
	}
} as const;

export type FlameTypeKey = keyof typeof FLAME_TYPES;

/**
 * Heroic (Reboot) acquisition. Powerful Rebirth Flames are sold by most town
 * General Stores for 9,500,000 mesos; Eternal Rebirth Flames come from boss
 * rewards only. The Bonus Stats Reset System and the flame Auto Enhancement
 * System are not in GMS at all.
 * formulas.md §4A §2.3, §2.8.
 */
export const FLAME_SOURCES_HEROIC = {
	powerfulRebirthFlameMesoPrice: 9_500_000,
	eternalRebirthFlameSource: 'boss rewards',
	bonusStatsResetSystem: false,
	autoEnhancementSystem: false
} as const;

/**
 * Probability of rolling N bonus-stat lines. Flame-advantaged equipment always
 * gets 4 lines. formulas.md §4A §2.4 · https://strategywiki.org/wiki/MapleStory/Bonus_Stats
 */
export const FLAME_LINE_COUNT_PROBABILITIES = {
	rebirthFlame: { 1: 0.4, 2: 0.4, 3: 0.16, 4: 0.04 },
	craftingMasterCraftsman: { 1: 0.21, 2: 0.5, 3: 0.25, 4: 0.04 },
	craftingMeister: { 1: 0, 2: 0.56, 3: 0.4, 4: 0.04 },
	other: { 1: 0.41, 2: 0.4, 3: 0.15, 4: 0.04 },
	flameAdvantaged: { 1: 0, 2: 0, 3: 0, 4: 1 }
} as const;

/**
 * Tier probability distribution for **normal** (non-flame-advantage) equipment,
 * keyed by tier 1-5. Flame-advantaged equipment uses the same shape shifted +2
 * tiers — see `FLAME_TIER_PROBABILITIES_ADVANTAGED`.
 * formulas.md §4A §2.5 · https://strategywiki.org/wiki/MapleStory/Bonus_Stats
 */
export const FLAME_TIER_PROBABILITIES_NORMAL = {
	monsterDropOrShop: { 1: 0.25, 2: 0.3, 3: 0.3, 4: 0.14, 5: 0.01 },
	equipmentShardChanceTime: { 1: 0, 2: 0.3, 3: 0.5, 4: 0.19, 5: 0.01 },
	rebirthFlameLevelled: { 1: 0.5, 2: 0.4, 3: 0.09, 4: 0.01, 5: 0 },
	powerfulOrBlazing: { 1: 0.2, 2: 0.3, 3: 0.36, 4: 0.14, 5: 0 },
	eternalOrBlack: { 1: 0, 2: 0.29, 3: 0.45, 4: 0.25, 5: 0.01 },
	craftingOrFusingLv1to10: { 1: 0.5, 2: 0.4, 3: 0.1, 4: 0, 5: 0 },
	craftingMasterCraftsman: { 1: 0.15, 2: 0.3, 3: 0.4, 4: 0.14, 5: 0.01 },
	fusingMasterCraftsman: { 1: 0.25, 2: 0.35, 3: 0.3, 4: 0.1, 5: 0 },
	craftingMeister: { 1: 0, 2: 0.19, 3: 0.5, 4: 0.3, 5: 0.01 },
	fusingMeister: { 1: 0, 2: 0.4, 3: 0.45, 4: 0.14, 5: 0.01 }
} as const;

/**
 * Same distributions on flame-advantaged equipment, keyed by tier 3-7.
 * NOTE the one row that is *not* a pure shift: levelled Rebirth Flames read
 * 97/1/1/1 rather than 50/40/9/1.
 * formulas.md §4A §2.5.
 */
export const FLAME_TIER_PROBABILITIES_ADVANTAGED = {
	monsterDropOrShop: { 3: 0.25, 4: 0.3, 5: 0.3, 6: 0.14, 7: 0.01 },
	equipmentShardChanceTime: { 3: 0, 4: 0.3, 5: 0.5, 6: 0.19, 7: 0.01 },
	rebirthFlameLevelled: { 3: 0.97, 4: 0.01, 5: 0.01, 6: 0.01, 7: 0 },
	powerfulOrBlazing: { 3: 0.2, 4: 0.3, 5: 0.36, 6: 0.14, 7: 0 },
	eternalOrBlack: { 3: 0, 4: 0.29, 5: 0.45, 6: 0.25, 7: 0.01 },
	craftingOrFusingLv1to10: { 3: 0.5, 4: 0.4, 5: 0.1, 6: 0, 7: 0 },
	craftingMasterCraftsman: { 3: 0.15, 4: 0.3, 5: 0.4, 6: 0.14, 7: 0.01 },
	fusingMasterCraftsman: { 3: 0.25, 4: 0.35, 5: 0.3, 6: 0.1, 7: 0 },
	craftingMeister: { 3: 0, 4: 0.19, 5: 0.5, 6: 0.3, 7: 0.01 },
	fusingMeister: { 3: 0, 4: 0.4, 5: 0.45, 6: 0.14, 7: 0.01 }
} as const;

/**
 * ⚠️ UNVERIFIED — the Abyssal Rebirth Flame has no published numeric tier
 * distribution. The wiki describes it qualitatively only: "lowest tier 3, very
 * rarely tier 5 (5-7 on flame advantage), 3% chance of highest tier".
 * formulas.md §4A §2.5.
 */
export const UNVERIFIED_ABYSSAL_FLAME_DISTRIBUTION = {
	description: 'lowest tier 3; very rarely tier 5 (5-7 on flame advantage); 3% chance of highest tier',
	highestTierChance: 0.03
} as const;

/** Equipment that can never receive bonus stats. formulas.md §4A §2.1. */
export const FLAME_INELIGIBLE = [
	'secondary weapons and shields (incl. Katara)',
	'emblems',
	'badges',
	'medals (except Immortal Legacy)',
	'rings',
	'androids and android/mechanical hearts',
	'shoulders (except Scarlet Shoulder)',
	'totems (except Ancient Slate Replica)'
] as const;

/**
 * Flame-advantaged sets, and the boss-related exceptions that are NOT advantaged.
 * formulas.md §4A §2.2.
 */
export const FLAME_ADVANTAGED = {
	sets: [
		'Dark / Dawn / Pitched / regular Boss Accessory sets',
		'Eternal',
		'Arcane Umbra',
		'AbsoLab',
		'Fafnir',
		'Brilliant Boss set (Lv250)'
	],
	exceptions: [
		'Horntail Necklace',
		'Chaos Horntail Necklace',
		'all Gollux equipment',
		'all Sweetwater equipment',
		'Chaos Root Abyss boss helmets',
		'Zero class weapons',
		'Shiny Red Meister Symbols'
	]
} as const;

/* -------------------------------------------------------------------------- */
/* Value formulas                                                              */
/* -------------------------------------------------------------------------- */

/**
 * Single main stat (STR/DEX/INT/LUK) and flat DEF.
 * `value = tier × (min(⌊itemLevel / 20⌋, 11) + 1)` — the tier-1 value steps up by
 * 1 every 20 item levels, capped at 12 from item level 230.
 * formulas.md §4A §2.6 "Single main stat".
 */
export function flameSingleStat(itemLevel: number, tier: FlameTier): number {
	return tier * (Math.min(Math.floor(itemLevel / 20), 11) + 1);
}

/** Flat DEF uses the same table as a single main stat. formulas.md §4A §2.6. */
export const flameDefense = flameSingleStat;

/**
 * Combined two-stat lines (STR&DEX, STR&INT, …). Each of the two stats gets this
 * amount. `value = tier × (⌊itemLevel / 40⌋ + 1)`.
 * formulas.md §4A §2.6 "Combined two-stat lines".
 */
export function flameDualStat(itemLevel: number, tier: FlameTier): number {
	return tier * (Math.floor(itemLevel / 40) + 1);
}

/**
 * ATT / MATT on **non-weapons** (armor, accessories): flat, item-level
 * independent, `= tier`. Maximum possible attack flame on any armor/accessory is +7.
 * formulas.md §4A §2.6.
 */
export function flameArmorAttack(tier: FlameTier): number {
	return tier;
}

/**
 * ATT / MATT on **weapons**, as a percentage of the weapon's *base* attack.
 *
 * Normal weapons:            `(⌊lvl/40⌋ + 1) × tier × 1.1^(tier − 1)`
 * Flame-advantaged weapons:  `(⌊lvl/40⌋ + 1) × tier × 1.1^(tier − 3)`
 *
 * The advantaged curve is *lower per tier* but reaches tiers 6-7. A Lv200
 * flame-advantaged weapon at T7 = +61.49% of base ATT.
 * formulas.md §4A §2.6 "Attack Power / Magic Attack — WEAPONS".
 *
 * @returns the added percentage (e.g. 61.49), not a multiplier
 */
export function flameWeaponAttackPercent(
	weaponLevel: number,
	tier: FlameTier,
	flameAdvantaged: boolean
): number {
	const levelFactor = Math.floor(weaponLevel / 40) + 1;
	const exponent = flameAdvantaged ? tier - 3 : tier - 1;
	return levelFactor * tier * Math.pow(1.1, exponent);
}

/** The same number as a multiplier on base attack (1.6149 for the example above). */
export function flameWeaponAttackMultiplier(
	weaponLevel: number,
	tier: FlameTier,
	flameAdvantaged: boolean
): number {
	return 1 + flameWeaponAttackPercent(weaponLevel, tier, flameAdvantaged) / 100;
}

/**
 * Max HP / Max MP (identical tables).
 *
 * Per-tier base by item level: 3 below Lv10; `30 × ⌊lvl/10⌋` from Lv10 to Lv209;
 * then +20 per 10 levels (620 at 210, 640 at 220 …) capping at 700 from Lv250.
 * Derived from — and tested against — the published table in
 * formulas.md §4A §2.6 "Max HP / Max MP".
 */
export function flameMaxHp(itemLevel: number, tier: FlameTier): number {
	const decade = Math.floor(itemLevel / 10);
	let perTier: number;
	if (decade < 1) perTier = 3;
	else if (decade <= 20) perTier = 30 * decade;
	else perTier = 600 + 20 * Math.min(decade - 20, 5);
	return perTier * tier;
}

/** Max MP uses the identical table. */
export const flameMaxMp = flameMaxHp;

/**
 * Percentage and special lines — all item-level independent.
 * formulas.md §4A §2.6 "Percentage and special lines".
 *
 * There is **no IED, crit rate, crit damage, drop rate or meso rate** in the flame pool.
 */
export const FLAME_SPECIAL_LINES = {
	/** All Stats %: non-weapons must be Lv70+, weapons any level. */
	allStatPercent: { perTier: 1, restriction: 'non-weapons Lv70+; weapons any level' },
	/** Boss Damage %: weapons Lv90+ only. */
	bossDamagePercent: { perTier: 2, restriction: 'weapons Lv90+ only' },
	/** Damage %: weapons only. */
	damagePercent: { perTier: 1, restriction: 'weapons only' },
	speed: { perTier: 1, restriction: 'armor / accessories only' },
	jump: { perTier: 1, restriction: 'armor / accessories only' },
	/** Required Level reduction, expressed as a negative number. */
	requiredLevel: { perTier: -5, restriction: 'any' }
} as const;

export function flameAllStatPercent(tier: FlameTier): number {
	return FLAME_SPECIAL_LINES.allStatPercent.perTier * tier;
}
export function flameBossDamagePercent(tier: FlameTier): number {
	return FLAME_SPECIAL_LINES.bossDamagePercent.perTier * tier;
}
export function flameDamagePercent(tier: FlameTier): number {
	return FLAME_SPECIAL_LINES.damagePercent.perTier * tier;
}
export function flameSpeed(tier: FlameTier): number {
	return FLAME_SPECIAL_LINES.speed.perTier * tier;
}
export function flameJump(tier: FlameTier): number {
	return FLAME_SPECIAL_LINES.jump.perTier * tier;
}
/** Required-level reduction, returned negative (T7 = −35). */
export function flameRequiredLevelReduction(tier: FlameTier): number {
	return FLAME_SPECIAL_LINES.requiredLevel.perTier * tier;
}

/* -------------------------------------------------------------------------- */
/* Flame score                                                                 */
/* -------------------------------------------------------------------------- */

export type FlameStatKey = 'str' | 'dex' | 'int' | 'luk';

/** A rolled flame block, in the same field names the character schema uses. */
export interface FlameBlock {
	str?: number;
	dex?: number;
	int?: number;
	luk?: number;
	att?: number;
	matt?: number;
	allStatPct?: number;
	maxHp?: number;
	maxMp?: number;
	def?: number;
	speed?: number;
	jump?: number;
	bossDmgPct?: number;
	dmgPct?: number;
}

export interface FlameScoreWeights {
	/** Weight of the class's main stat (always 1 by definition of the score). */
	main: number;
	/** Weight of a secondary stat point. */
	secondary: number;
	/** Weight of 1 ATT. */
	att: number;
	/** Weight of 1 MATT. */
	matt: number;
	/** Weight of 1% All Stat. */
	allStatPct: number;
}

/**
 * The three flame-score conventions in circulation. "Flame score" is a community
 * convention, not a game mechanic, and they give materially different answers.
 * formulas.md §4A §2.7 (see also its open question #8).
 *
 * DEFAULT: **whackybeanz**. Chosen because (a) it is the most widely quoted set,
 * (b) it is the only one the research reproduces with a worked example we can
 * regression-test (Lv200 armor `+44 STR, +85 INT, +30 LUK, +3% All Stat` on a
 * Magician → 118.75), and (c) its ÷8 secondary weight matches the ratio most
 * in-game secondary-stat contributions actually have. Override via `weights`.
 */
export const FLAME_SCORE_CONVENTIONS = {
	/** https://www.whackybeanz.com/guides/flames */
	whackybeanz: { main: 1, secondary: 0.125, att: 4, matt: 4, allStatPct: 10 },
	/** https://strategywiki.org/wiki/MapleStory/Bonus_Stats */
	strategywiki: { main: 1, secondary: 0.1, att: 4, matt: 4, allStatPct: 15 },
	/** https://gms-upgrade-tracker.vercel.app/tools/flame-calculator */
	gmsUpgradeTracker: { main: 1, secondary: 1 / 12, att: 3, matt: 3, allStatPct: 10 }
} as const satisfies Record<string, FlameScoreWeights>;

export const DEFAULT_FLAME_SCORE_WEIGHTS: FlameScoreWeights = FLAME_SCORE_CONVENTIONS.whackybeanz;

/**
 * Xenon's class-specific variant: 1 ATT = 8 primary, 1% All Stat = 20 primary,
 * and STR = DEX = LUK = 1 primary each (Xenon uses all three).
 * formulas.md §4A §2.7 "Class-specific variants".
 */
export const XENON_FLAME_SCORE_WEIGHTS: FlameScoreWeights = {
	main: 1,
	secondary: 1,
	att: 8,
	matt: 8,
	allStatPct: 20
};

/** Which stats count as "secondary" for each main stat, when the caller does not say. */
export const DEFAULT_SECONDARY_STATS: Record<FlameStatKey, readonly FlameStatKey[]> = {
	str: ['dex'],
	dex: ['str'],
	int: ['luk'],
	luk: ['dex']
};

export interface FlameClassStats {
	main: FlameStatKey;
	/** Defaults to `DEFAULT_SECONDARY_STATS[main]`. Xenon should pass all three. */
	secondary?: readonly FlameStatKey[];
}

/**
 * Flame score of a rolled block, in "main-stat-equivalent" points.
 *
 * Stats that are neither main nor secondary for the class contribute 0
 * (a Magician's STR is worthless), matching the whackybeanz worked example.
 *
 * ⚠️ Weapons: the ATT line on a weapon is a *percentage of base attack*, not a
 * flat +N, so a raw `ATT × 4` term is meaningless there. StrategyWiki says flame
 * score is "generally used on non-weapons". Compare weapon flames directly with
 * `flameWeaponAttackPercent × baseATT` instead. formulas.md §4A §2.7.
 *
 * Demon Avenger has no flame score at all — count tiers (2 weapon ATT ≈ 1 tier of HP).
 */
export function flameScore(
	flameBlock: FlameBlock,
	classPrimary: FlameStatKey | FlameClassStats,
	weights: Partial<FlameScoreWeights> = {}
): number {
	const spec: FlameClassStats = typeof classPrimary === 'string' ? { main: classPrimary } : classPrimary;
	const secondary = spec.secondary ?? DEFAULT_SECONDARY_STATS[spec.main];
	const w: FlameScoreWeights = { ...DEFAULT_FLAME_SCORE_WEIGHTS, ...weights };

	let score = 0;
	const stats: FlameStatKey[] = ['str', 'dex', 'int', 'luk'];
	for (const stat of stats) {
		const value = flameBlock[stat] ?? 0;
		if (!value) continue;
		if (stat === spec.main) score += value * w.main;
		else if (secondary.includes(stat)) score += value * w.secondary;
		// otherwise: worthless to this class, contributes 0
	}
	score += (flameBlock.att ?? 0) * w.att;
	score += (flameBlock.matt ?? 0) * w.matt;
	score += (flameBlock.allStatPct ?? 0) * w.allStatPct;
	return score;
}

/**
 * StrategyWiki flame-score benchmarks, per item, assuming Eternal/Black Rebirth
 * Flames. NOTE these were published using the *StrategyWiki* ratios
 * (÷10 secondary / ×4 ATT / ×15 All Stat), not the default whackybeanz ones —
 * score with `FLAME_SCORE_CONVENTIONS.strategywiki` before comparing.
 * Percentiles: starters ≈ 80th, average ≈ 95th, above average ≈ 99th, minmax ≈ 99.9th.
 * formulas.md §4A §2.7 · https://strategywiki.org/wiki/MapleStory/Bonus_Stats
 */
export const FLAME_SCORE_BENCHMARKS = {
	convention: 'strategywiki',
	flameAdvantaged: [
		{ minItemLevel: 250, starters: 95, average: 135, aboveAverage: 170, minmax: 200 },
		{ minItemLevel: 200, starters: 85, average: 125, aboveAverage: 155, minmax: 190 },
		{ minItemLevel: 160, starters: 80, average: 115, aboveAverage: 145, minmax: 170 },
		{ minItemLevel: 140, starters: 75, average: 110, aboveAverage: 135, minmax: 160 }
	],
	normal: [
		{ minItemLevel: 160, starters: 20, average: 45, aboveAverage: 70, minmax: 95 },
		{ minItemLevel: 140, starters: 20, average: 45, aboveAverage: 70, minmax: 90 },
		{ minItemLevel: 120, starters: 20, average: 45, aboveAverage: 65, minmax: 85 }
	],
	xenonFlameAdvantaged: [
		{ minItemLevel: 250, starters: 175, average: 245, aboveAverage: 275, minmax: 310 },
		{ minItemLevel: 200, starters: 165, average: 225, aboveAverage: 255, minmax: 290 },
		{ minItemLevel: 160, starters: 150, average: 200, aboveAverage: 225, minmax: 260 },
		{ minItemLevel: 140, starters: 140, average: 180, aboveAverage: 205, minmax: 240 }
	],
	xenonNormal: [
		{ minItemLevel: 160, starters: 60, average: 80, aboveAverage: 105, minmax: 145 },
		{ minItemLevel: 140, starters: 50, average: 75, aboveAverage: 96, minmax: 135 },
		{ minItemLevel: 120, starters: 45, average: 70, aboveAverage: 90, minmax: 130 }
	],
	/** Rough flame counts to hit each band, in Eternal/Black flames (Powerful in brackets). */
	flamesToReach: { starters: 5, average: 20, aboveAverage: 100, minmax: 1000 },
	flamesToReachPowerful: { starters: 10, average: 50, aboveAverage: 300, minmax: null }
} as const;

/** Benchmark row for an item level, or `null` when the level is below the table. */
export function flameBenchmark(
	itemLevel: number,
	flameAdvantaged: boolean,
	xenon = false
): { starters: number; average: number; aboveAverage: number; minmax: number } | null {
	const rows = xenon
		? flameAdvantaged
			? FLAME_SCORE_BENCHMARKS.xenonFlameAdvantaged
			: FLAME_SCORE_BENCHMARKS.xenonNormal
		: flameAdvantaged
			? FLAME_SCORE_BENCHMARKS.flameAdvantaged
			: FLAME_SCORE_BENCHMARKS.normal;
	for (const row of rows) if (itemLevel >= row.minItemLevel) return row;
	return null;
}
