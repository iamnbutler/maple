/**
 * Symbols — Arcane, Sacred (Authentic) and Grand Sacred. GMS 2026.
 *
 * Transcribed from `docs/research/formulas.md` §4B §3 "Symbols (Arcane, Sacred/Authentic,
 * Grand Sacred)". Primary sources cited there:
 *   - https://maplestorywiki.net/w/Arcane_Symbol  (+ the six per-region item pages)
 *   - https://maplestorywiki.net/w/Sacred_Symbol  (+ the six per-region item pages)
 *   - https://maplestorywiki.net/w/Grand_Sacred_Symbol (Tallahart, Geardock)
 *   - https://strategywiki.org/wiki/MapleStory/Arcane_River
 *   - https://strategywiki.org/wiki/MapleStory/Grandis
 *   - https://orangemushroom.net/2026/02/14/kms-ver-1-2-412-maplestory-crown-geardrak-jupiter-guild-castle/
 *
 * GMS names are used throughout ("Sacred", not "Authentic").
 *
 * WORLD SCOPE: Heroic (Reboot) only. Two Heroic-specific notes from the research:
 *   - the Arcane Catalyst (symbol transfer) is **not available in Reboot/Heroic**;
 *   - Sacred/Grand Sacred coupons dropped by mobs are tradable *within the same world*
 *     in Heroic (Arcane coupons are not).
 * The Mentorship System (free Arcane levelling to 15) is CMS/TMS/MSEA only — never
 * applied here.
 *
 * ⚠️ ACQUISITION-RATE CHANGE, 2026-09-09: the research was written 2026-09-06, three
 * days before the GMS *Post-Ride The Lightning* / Frieren update, which doubles Arcane
 * daily and weekly rewards and raises Sacred daily rewards by 50% (bringing GMS in line
 * with every other region). Both rate sets are shipped — see `SYMBOL_RATE_SETS`.
 * A further change lands with Overdrive ("Fall 2026"): Arcane weekly content becomes
 * one clear per week for 240 symbols, and daily kill requirements flatten to 100/area.
 */

/* -------------------------------------------------------------------------- */
/* Arcane symbols                                                              */
/* -------------------------------------------------------------------------- */

export type ArcaneRegion =
	'vanishing_journey' | 'chu_chu_island' | 'lachelein' | 'arcana' | 'morass' | 'esfera';

export const ARCANE_MAX_LEVEL = 20;

/**
 * The six Arcane regions. `mesoBase` is B in the meso formula (§A.4).
 * `dailyCoupons` / `weeklyCoupons` are the *current GMS* values; see
 * `SYMBOL_RATE_SETS` for the post-2026-09-09 numbers.
 * formulas.md §4B §3 A.1, A.4, A.5.
 */
export const ARCANE_REGIONS: Record<
	ArcaneRegion,
	{
		name: string;
		unlockLevel: number;
		mesoBase: number;
		dailyQuest: string;
		weeklyContent: string;
		/** VJ and Chu Chu give 10/day until their side-area quest is done, then 20. */
		dailyCouponsBeforeSideArea?: number;
	}
> = {
	vanishing_journey: {
		name: 'Vanishing Journey',
		unlockLevel: 200,
		mesoBase: 8,
		dailyQuest: 'Vanishing Journey Research',
		weeklyContent: 'Erda Spectrum',
		dailyCouponsBeforeSideArea: 10
	},
	chu_chu_island: {
		name: 'Chu Chu Island',
		unlockLevel: 210,
		mesoBase: 10,
		dailyQuest: "Chu Chu's Finest Cuisine",
		weeklyContent: 'Hungry Muto',
		dailyCouponsBeforeSideArea: 10
	},
	lachelein: {
		name: 'Lachelein',
		unlockLevel: 220,
		mesoBase: 12,
		dailyQuest: "A Night's Peace in Lachelein",
		weeklyContent: 'Midnight Chaser'
	},
	arcana: {
		name: 'Arcana',
		unlockLevel: 225,
		mesoBase: 14,
		dailyQuest: 'Peace in Arcana',
		weeklyContent: 'Spirit Savior'
	},
	morass: {
		name: 'Morass',
		unlockLevel: 230,
		mesoBase: 16,
		dailyQuest: 'Save the Morass',
		weeklyContent: 'Ranheim Defense'
	},
	esfera: {
		name: 'Esfera',
		unlockLevel: 235,
		mesoBase: 18,
		dailyQuest: 'Esfera Research Orders',
		weeklyContent: 'Esfera Guardian'
	}
};

/**
 * Arcane Power (Arcane Force) granted by one symbol at level L: `20 + 10L`.
 * = 30 at Lv1, 220 at Lv20. All six regions share one table.
 * formulas.md §4B §3 A.2.
 */
export function arcaneForce(level: number): number {
	if (level <= 0) return 0;
	return 20 + 10 * level;
}

/** Main stat granted by one Arcane Symbol at level L: `200 + 100L` (300 → 2,200). */
export function arcaneMainStat(level: number): number {
	if (level <= 0) return 0;
	return 200 + 100 * level;
}

/** Demon Avenger gets Max HP instead of main stat: `4200 + 2100L` (6,300 → 46,200). */
export function arcaneDemonAvengerHp(level: number): number {
	if (level <= 0) return 0;
	return 4200 + 2100 * level;
}

/** Xenon gets STR, DEX and LUK each: `96 + 48L` (144 → 1,056 each). */
export function arcaneXenonStatEach(level: number): number {
	if (level <= 0) return 0;
	return 96 + 48 * level;
}

/** Symbols needed to go from level L to L+1: `L² + 11`. formulas.md §4B §3 A.3. */
export function arcaneSymbolsToNextLevel(level: number): number {
	if (level < 1 || level >= ARCANE_MAX_LEVEL) return 0;
	return level * level + 11;
}

/** Cumulative symbols consumed to take one Arcane Symbol from level 1 to `level`. */
export function arcaneSymbolsToReach(level: number): number {
	let total = 0;
	for (let l = 1; l < Math.min(level, ARCANE_MAX_LEVEL); l++) total += arcaneSymbolsToNextLevel(l);
	return total;
}

/**
 * Meso cost of the L → L+1 level-up:
 * `10,000 × ⌊(L² + 11) × (B + 0.1 × L)⌋`, computed in integer arithmetic because
 * `0.1 × L` in IEEE754 produces off-by-10,000 errors at several levels.
 * formulas.md §4B §3 A.4.
 */
export function arcaneMesoToNextLevel(level: number, region: ArcaneRegion): number {
	const symbols = arcaneSymbolsToNextLevel(level);
	if (symbols === 0) return 0;
	const b10 = 10 * ARCANE_REGIONS[region].mesoBase;
	return 10_000 * Math.floor((symbols * (b10 + level)) / 10);
}

/** Cumulative meso to take one Arcane Symbol from level 1 to `level`. */
export function arcaneMesoToReach(level: number, region: ArcaneRegion): number {
	let total = 0;
	for (let l = 1; l < Math.min(level, ARCANE_MAX_LEVEL); l++)
		total += arcaneMesoToNextLevel(l, region);
	return total;
}

/** Symbols needed for one region 1 → 20, and for all six. formulas.md §4B §3 A.3. */
export const ARCANE_SYMBOLS_TO_MAX = 2679;
export const ARCANE_SYMBOLS_TO_MAX_ALL_REGIONS = 16_074;
/** 6 × Lv20 = 1,320 Arcane Force and 13,200 main stat. */
export const ARCANE_FORCE_MAX_FROM_SYMBOLS = 1320;
export const ARCANE_MAIN_STAT_MAX_FROM_SYMBOLS = 13_200;
/** 1,320 symbols + 100 hyper stat + 30 guild skill, excluding event stats. */
export const ARCANE_FORCE_PRACTICAL_MAX = 1450;

/**
 * The non-levelable starter symbol from `[5th Job] A Greater Power`:
 * Arcane Power +40, Main Stat +300 (DA +6,300 HP; Xenon +144 each).
 * Deleted once the Vanishing Journey symbol quest completes.
 * formulas.md §4B §3 A.1.
 */
export const ARCANE_STARTER_SYMBOL = {
	arcaneForce: 40,
	mainStat: 300,
	demonAvengerHp: 6300,
	xenonStatEach: 144
} as const;

/** Arcane Catalyst (symbol transfer) — 300 Union Coins, max 3/char/week, NOT in Heroic. */
export const ARCANE_CATALYST = {
	unionCoinCost: 300,
	maxPerCharacterPerWeek: 3,
	availableInHeroic: false,
	/** Level resets to 1 and total symbol growth drops to 80% of the original (rounded up). */
	growthRetained: 0.8
} as const;

/* -------------------------------------------------------------------------- */
/* Sacred and Grand Sacred symbols                                             */
/* -------------------------------------------------------------------------- */

export type SacredRegion = 'cernium' | 'arcus' | 'odium' | 'shangri_la' | 'arteria' | 'carcion';
export type GrandSacredRegion = 'tallahart' | 'geardock';

export const SACRED_MAX_LEVEL = 11;

/**
 * The six Sacred regions. `mesoBase` is B in the Sacred meso formula (§B.3).
 * `maxLevelBoss` is the boss the Lv11 "+20% damage" bonus applies to.
 * formulas.md §4B §3 B.1, B.2, B.3, B.4.
 */
export const SACRED_REGIONS: Record<
	SacredRegion,
	{
		name: string;
		unlockLevel: number;
		mesoBase: number;
		dailyQuest: string;
		maxLevelBoss: string;
		/** Current GMS daily coupons; Cernium is the only region giving 20. */
		dailyCoupons: number;
	}
> = {
	cernium: {
		name: 'Cernium',
		unlockLevel: 260,
		mesoBase: 13.2,
		dailyQuest: 'Cernium Research',
		maxLevelBoss: 'Chosen Seren',
		dailyCoupons: 20
	},
	arcus: {
		name: 'Hotel Arcus',
		unlockLevel: 265,
		mesoBase: 15.0,
		dailyQuest: 'Clean Up Around Hotel Arcus',
		maxLevelBoss: 'Kalos the Guardian',
		dailyCoupons: 10
	},
	odium: {
		name: 'Odium',
		unlockLevel: 270,
		mesoBase: 16.8,
		dailyQuest: 'Odium Area Expedition',
		maxLevelBoss: 'First Adversary',
		dailyCoupons: 10
	},
	shangri_la: {
		name: 'Shangri-La',
		unlockLevel: 275,
		mesoBase: 18.6,
		dailyQuest: 'Shangri-La Contamination Purification',
		maxLevelBoss: 'Kaling',
		dailyCoupons: 10
	},
	arteria: {
		name: 'Arteria',
		unlockLevel: 280,
		mesoBase: 20.4,
		dailyQuest: 'Defeat the Arteria Remnants',
		maxLevelBoss: 'Malefic Star',
		dailyCoupons: 10
	},
	carcion: {
		name: 'Carcion',
		unlockLevel: 285,
		mesoBase: 22.2,
		dailyQuest: 'Carcion Recovery Support',
		maxLevelBoss: 'Limbo',
		dailyCoupons: 10
	}
};

/**
 * Grand Sacred Symbols (Lv290+ content). They feed the *same* Sacred Power pool —
 * there is no separate "Grand" force — and give **no main stat at all**, only
 * EXP / meso / drop percentages. formulas.md §4B §3 C.1-C.3.
 */
export const GRAND_SACRED_REGIONS: Record<
	GrandSacredRegion,
	{
		name: string;
		unlockLevel: number;
		mesoBase: number;
		dailyQuest: string;
		maxLevelBoss: string;
		dailyCoupons: number;
	}
> = {
	tallahart: {
		name: 'Tallahart',
		unlockLevel: 290,
		mesoBase: 39.8,
		dailyQuest: "Investigate the Tallahart Ancient God's Power",
		maxLevelBoss: 'Baldrix',
		dailyCoupons: 10
	},
	geardock: {
		name: 'Geardock',
		unlockLevel: 295,
		mesoBase: 48.8,
		dailyQuest: 'Cleaning Up Kronos',
		maxLevelBoss: 'Jupiter',
		dailyCoupons: 10
	}
};

/** Sacred Power / Authentic Force from one symbol at level L: `10L` (10 → 110). */
export function sacredForce(level: number): number {
	if (level <= 0) return 0;
	return 10 * level;
}

/** Main stat from one Sacred Symbol at level L: `300 + 200L` (500 → 2,500). Grand gives none. */
export function sacredMainStat(level: number): number {
	if (level <= 0) return 0;
	return 300 + 200 * level;
}

/** Demon Avenger Max HP from one Sacred Symbol: `6300 + 4200L` (10,500 → 52,500). */
export function sacredDemonAvengerHp(level: number): number {
	if (level <= 0) return 0;
	return 6300 + 4200 * level;
}

/** Xenon STR/DEX/LUK each from one Sacred Symbol: `144 + 96L` (240 → 1,200 each). */
export function sacredXenonStatEach(level: number): number {
	if (level <= 0) return 0;
	return 144 + 96 * level;
}

/** Symbols to go from level L to L+1: `9L² + 20L`. Same for Sacred and Grand Sacred. */
export function sacredSymbolsToNextLevel(level: number): number {
	if (level < 1 || level >= SACRED_MAX_LEVEL) return 0;
	return 9 * level * level + 20 * level;
}

export function sacredSymbolsToReach(level: number): number {
	let total = 0;
	for (let l = 1; l < Math.min(level, SACRED_MAX_LEVEL); l++) total += sacredSymbolsToNextLevel(l);
	return total;
}

/**
 * Meso cost of the L → L+1 Sacred level-up:
 * `100,000 × ⌊(9L² + 20L) × (B − 0.6 × L)⌋`, again in integer arithmetic
 * (float math mis-computes Cernium 5→6 and 10→11 by 100,000).
 * formulas.md §4B §3 B.3.
 */
export function sacredMesoToNextLevel(
	level: number,
	region: SacredRegion | GrandSacredRegion
): number {
	const symbols = sacredSymbolsToNextLevel(level);
	if (symbols === 0) return 0;
	const base =
		region in SACRED_REGIONS
			? SACRED_REGIONS[region as SacredRegion].mesoBase
			: GRAND_SACRED_REGIONS[region as GrandSacredRegion].mesoBase;
	const b10 = Math.round(10 * base);
	return 100_000 * Math.floor((symbols * (b10 - 6 * level)) / 10);
}

export function sacredMesoToReach(level: number, region: SacredRegion | GrandSacredRegion): number {
	let total = 0;
	for (let l = 1; l < Math.min(level, SACRED_MAX_LEVEL); l++)
		total += sacredMesoToNextLevel(l, region);
	return total;
}

/** Grand Sacred EXP Obtained %: `6 + 4L` (10% → 50%). */
export function grandSacredExpPercent(level: number): number {
	if (level <= 0) return 0;
	return 6 + 4 * level;
}
/** Grand Sacred Mesos Obtained %: `4 + L` (5% → 15%). */
export function grandSacredMesoPercent(level: number): number {
	if (level <= 0) return 0;
	return 4 + level;
}
/** Grand Sacred Item Drop Rate %: `4 + L` (5% → 15%). */
export function grandSacredDropPercent(level: number): number {
	if (level <= 0) return 0;
	return 4 + level;
}

/**
 * Max-level bonuses, added in the 2026 Crown / Ride The Lightning update:
 * every Sacred Symbol gives +10% EXP at Lv11, and every Sacred *and* Grand Sacred
 * Symbol gives +20% damage against its region's boss at Lv11.
 * formulas.md §4B §3 B.2, C.2.
 */
export const SACRED_MAX_LEVEL_BONUS = { expPercent: 10, bossDamagePercent: 20 } as const;

export const SACRED_SYMBOLS_TO_MAX = 4565;
export const SACRED_SYMBOLS_TO_MAX_ALL_REGIONS = 27_390;
/** 6 Sacred @ Lv11 = 660 SAC; + 2 Grand @ Lv11 = 880. No hyper stat or guild skill exists. */
export const SACRED_FORCE_MAX_FROM_SACRED = 660;
export const SACRED_FORCE_PRACTICAL_MAX = 880;
export const SACRED_MAIN_STAT_MAX = 15_000;

/* -------------------------------------------------------------------------- */
/* Acquisition rates                                                           */
/* -------------------------------------------------------------------------- */

export type SymbolRateSetKey = 'gms_pre_2026_09_09' | 'gms_post_2026_09_09' | 'post_overdrive';

export interface SymbolRateSet {
	label: string;
	/** Arcane daily coupons once the region's side-area quest is done. */
	arcaneDaily: number;
	/** Arcane daily coupons before the side-area quest (VJ / Chu Chu only). */
	arcaneDailyBeforeSideArea: number;
	/** Arcane weekly Special Content: coupons per clear × clears per week. */
	arcaneWeeklyPerClear: number;
	arcaneWeeklyClears: number;
	/** Sacred daily coupons (Cernium gets the `sacredDailyCernium` value instead). */
	sacredDaily: number;
	sacredDailyCernium: number;
	/** Grand Sacred daily coupons. */
	grandSacredDaily: number;
}

/**
 * The three known GMS rate regimes.
 *
 * ⚠️ `gms_post_2026_09_09` is the *Post-Ride The Lightning* / 23rd-Anniversary pass
 * that doubles Arcane rewards and raises Sacred dailies by 50%. As of the research
 * date (2026-09-06) it had not shipped in GMS; the wiki's daily-quest pages
 * pre-annotate these as the "Non-GMS" values. Verify after 2026-09-09.
 * `post_overdrive` (GMS "Fall 2026") keeps the same weekly total but collapses
 * Arcane weekly content to one 240-symbol clear.
 * formulas.md §4B §3 A.5, B.4, C.3, E.
 */
export const SYMBOL_RATE_SETS: Record<SymbolRateSetKey, SymbolRateSet> = {
	gms_pre_2026_09_09: {
		label: 'GMS, before the 2026-09-09 Post-Ride The Lightning update',
		arcaneDaily: 20,
		arcaneDailyBeforeSideArea: 10,
		arcaneWeeklyPerClear: 40,
		arcaneWeeklyClears: 3,
		sacredDaily: 10,
		sacredDailyCernium: 20,
		grandSacredDaily: 10
	},
	gms_post_2026_09_09: {
		label: 'GMS from 2026-09-09 (matches KMS / other regions)',
		arcaneDaily: 40,
		arcaneDailyBeforeSideArea: 20,
		arcaneWeeklyPerClear: 80,
		arcaneWeeklyClears: 3,
		sacredDaily: 15,
		sacredDailyCernium: 30,
		grandSacredDaily: 15
	},
	post_overdrive: {
		label: 'GMS after Overdrive ("Fall 2026"): one weekly clear worth 240',
		arcaneDaily: 40,
		arcaneDailyBeforeSideArea: 20,
		arcaneWeeklyPerClear: 240,
		arcaneWeeklyClears: 1,
		sacredDaily: 15,
		sacredDailyCernium: 30,
		grandSacredDaily: 15
	}
};

export const DEFAULT_SYMBOL_RATE_SET: SymbolRateSetKey = 'gms_pre_2026_09_09';

export interface SymbolRateOptions {
	rateSet?: SymbolRateSetKey;
	/** VJ / Chu Chu: whether the Reverse City / Yum Yum side-area quest is done. */
	sideAreaUnlocked?: boolean;
	/** Include the Arcane weekly Special Content (3 clears/week, or 1 post-Overdrive). */
	includeWeekly?: boolean;
}

/** Symbols gained per week for one Arcane region at the given rate set. */
export function arcaneSymbolsPerWeek(region: ArcaneRegion, opts: SymbolRateOptions = {}): number {
	const rates = SYMBOL_RATE_SETS[opts.rateSet ?? DEFAULT_SYMBOL_RATE_SET];
	const hasSideArea = ARCANE_REGIONS[region].dailyCouponsBeforeSideArea !== undefined;
	const daily =
		hasSideArea && opts.sideAreaUnlocked === false
			? rates.arcaneDailyBeforeSideArea
			: rates.arcaneDaily;
	const weekly =
		opts.includeWeekly === false ? 0 : rates.arcaneWeeklyPerClear * rates.arcaneWeeklyClears;
	return daily * 7 + weekly;
}

/** Symbols gained per week for one Sacred or Grand Sacred region (dailies only — no weekly content). */
export function sacredSymbolsPerWeek(
	region: SacredRegion | GrandSacredRegion,
	opts: SymbolRateOptions = {}
): number {
	const rates = SYMBOL_RATE_SETS[opts.rateSet ?? DEFAULT_SYMBOL_RATE_SET];
	if (region === 'cernium') return rates.sacredDailyCernium * 7;
	if (region in GRAND_SACRED_REGIONS) return rates.grandSacredDaily * 7;
	return rates.sacredDaily * 7;
}

/** Days of perfect play to take an Arcane Symbol from `fromLevel` to `toLevel`. */
export function arcaneDaysToReach(
	region: ArcaneRegion,
	fromLevel: number,
	toLevel: number,
	opts: SymbolRateOptions = {}
): number {
	const needed = arcaneSymbolsToReach(toLevel) - arcaneSymbolsToReach(fromLevel);
	if (needed <= 0) return 0;
	const perWeek = arcaneSymbolsPerWeek(region, opts);
	return Math.ceil((needed / perWeek) * 7);
}

/** Days of perfect play to take a Sacred / Grand Sacred Symbol from `fromLevel` to `toLevel`. */
export function sacredDaysToReach(
	region: SacredRegion | GrandSacredRegion,
	fromLevel: number,
	toLevel: number,
	opts: SymbolRateOptions = {}
): number {
	const needed = sacredSymbolsToReach(toLevel) - sacredSymbolsToReach(fromLevel);
	if (needed <= 0) return 0;
	const perWeek = sacredSymbolsPerWeek(region, opts);
	return Math.ceil((needed / perWeek) * 7);
}

/**
 * Arcane weekly Special Content per region (the PQ that pays symbols).
 * formulas.md §4B §3 A.5.
 */
export const ARCANE_WEEKLY_CONTENT: Record<ArcaneRegion, string> = {
	vanishing_journey: 'Erda Spectrum',
	chu_chu_island: 'Hungry Muto',
	lachelein: 'Midnight Chaser',
	arcana: 'Spirit Savior',
	morass: 'Ranheim Defense',
	esfera: 'Esfera Guardian'
};

/**
 * Symbol Express Pass ("Quick Pass"): Maple Point costs to auto-complete quests.
 * 1,000 MP per daily, −400 MP per 200-kill reduction (twice → 200 MP at 100 kills);
 * 2,000 MP per weekly entry. Becomes a flat 200/2,000 in Overdrive.
 * formulas.md §4B §3 A.5 "Other sources".
 */
export const SYMBOL_EXPRESS_PASS = {
	dailyBase: 1000,
	dailyReductionPerKillCut: 400,
	dailyMinimum: 200,
	weekly: 2000
} as const;

/** Regions that require Arcane Force but grant no symbol of their own. formulas.md §4B §3 C.4. */
export const ARCANE_REGIONS_WITHOUT_SYMBOLS = [
	'Reverse City (→ Vanishing Journey)',
	'Yum Yum Island (→ Chu Chu Island)',
	'Sellas / Celestars',
	'Tenebris: Moonbridge, Labyrinth of Suffering, Limina'
] as const;
