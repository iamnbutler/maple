/**
 * Star Force enhancement — GMS 2026 (30★ system, post-v264 revamp).
 *
 * Every table in this file is transcribed from `docs/research/formulas.md`
 * §4A "Star Force, Flames, and Potential / Bonus Potential" → §1 "Star Force Enhancement".
 * Primary sources cited by that research:
 *   - https://maplestorywiki.net/w/Star_Force_Enhancement
 *   - https://maplestorywiki.net/w/Star_Force_Enhancement/Stat_Tables
 *   - https://strategywiki.org/wiki/MapleStory/Spell_Trace_and_Star_Force
 *   - https://www.nexon.com/maplestory/news/update/32522 (GMS v264 patch notes)
 *   - https://www.nexon.com/maplestory/news/update/41138/updated-6-30-v-269-ride-the-lightning-patch-notes
 *   - https://github.com/masonym/masonym.dev/blob/main/src/lib/equip/starforce.js
 *   - https://github.com/MrReds1324/maplestory_builder/blob/main/lib/constants/equipment/starforce_stats.dart
 *
 * Nothing here is invented. Values the research flags as unverified live behind
 * exports whose names start with `UNVERIFIED_`.
 */

/* -------------------------------------------------------------------------- */
/* Kinds and brackets                                                          */
/* -------------------------------------------------------------------------- */

/**
 * Which stat table an item reads from.
 * - `armor`     — armor and accessories (also the 16★+ table used by gloves)
 * - `weapon`    — weapons (compounding % ATT below 15★, huge 23★ jump)
 * - `glove`     — armor table, but no Max HP and with the extra 5-15★ ATT/MATT block
 * - `badge`     — Ghost Ship Exorcist / Sengoku Hakase (All Stats only, max 22★)
 * - `superior`  — Tyrant / Nova / Elite Heliseum (own table, max 15★)
 *
 * Shoes read the `armor` table but gain no Max HP and additionally gain
 * Speed/Jump — see `SHOES_SPEED_JUMP_CUMULATIVE`.
 * Source: formulas.md §4A §1.3 · https://maplestorywiki.net/w/Star_Force_Enhancement/Stat_Tables
 */
export type StarForceKind = 'armor' | 'weapon' | 'glove' | 'badge' | 'superior';

/** Item-level bracket key used by the 16★-30★ tables. */
export type StarForceLevelBracket =
	'128-137' | '138-149' | '150-159' | '160-199' | '200-249' | '250';

/** Item-level bracket key used by the Superior (Tyrant/Nova/Elite Heliseum) tables. */
export type SuperiorLevelBracket =
	'0-77' | '78-87' | '88-97' | '98-107' | '108-117' | '118-127' | '128-137' | '138-149' | '150+';

/**
 * Max Star Force by item level (non-Superior).
 * formulas.md §4A §1.2 · https://maplestorywiki.net/w/Star_Force_Enhancement
 *
 * NOTE (conflict resolved in the research): masonym.dev encodes `95 → 5★`;
 * MapleStory Wiki and StrategyWiki both give 95-107 → 8★, which is what we use.
 */
export const MAX_STARS_BY_LEVEL = [
	{ minLevel: 0, maxStars: 5 },
	{ minLevel: 95, maxStars: 8 },
	{ minLevel: 108, maxStars: 10 },
	{ minLevel: 118, maxStars: 15 },
	{ minLevel: 128, maxStars: 20 },
	{ minLevel: 138, maxStars: 30 }
] as const;

/**
 * Max Star Force by item level for Superior gear.
 * formulas.md §4A §1.4 "Superior equipment" (read off the delta table's columns).
 * CONFLICT: masonym.dev encodes 0-95 → 3★ / 96-107 → 5★; the wiki's column layout
 * puts the break at 88. Practically irrelevant (Tyrant is Lv150 → 15★).
 */
export const MAX_STARS_BY_LEVEL_SUPERIOR = [
	{ minLevel: 0, maxStars: 3 },
	{ minLevel: 88, maxStars: 5 },
	{ minLevel: 108, maxStars: 8 },
	{ minLevel: 118, maxStars: 10 },
	{ minLevel: 128, maxStars: 12 },
	{ minLevel: 138, maxStars: 15 }
] as const;

/**
 * Per-item exceptions to `maxStars`.
 * formulas.md §4A §1.2 "Exceptions" / "Fixed-star items".
 * Keyed by a lowercase item-name fragment; consumers match on their own item names.
 */
export const MAX_STAR_EXCEPTIONS = [
	{ match: 'sweetwater shoes', maxStars: 15 },
	{ match: 'sweetwater gloves', maxStars: 15 },
	{ match: 'sweetwater cape', maxStars: 15 },
	{ match: 'ghost ship exorcist', maxStars: 22 },
	{ match: 'sengoku hakase', maxStars: 22 },
	{ match: 'genesis', maxStars: 22, fixed: true },
	{ match: 'destiny', maxStars: 22, fixed: true, starforceable: false }
] as const;

/** Max Star Force for an item level. `superior` selects the Tyrant/Nova/Heliseum table. */
export function maxStars(itemLevel: number, superior = false): number {
	const table: readonly { readonly minLevel: number; readonly maxStars: number }[] = superior
		? MAX_STARS_BY_LEVEL_SUPERIOR
		: MAX_STARS_BY_LEVEL;
	let result: number = table[0].maxStars;
	for (const row of table) if (itemLevel >= row.minLevel) result = row.maxStars;
	return result;
}

/** Bracket key for the 16★+ tables; `null` below level 128 (those items cap at 15★). */
export function starForceLevelBracket(itemLevel: number): StarForceLevelBracket | null {
	if (itemLevel < 128) return null;
	if (itemLevel <= 137) return '128-137';
	if (itemLevel <= 149) return '138-149';
	if (itemLevel <= 159) return '150-159';
	if (itemLevel <= 199) return '160-199';
	if (itemLevel <= 249) return '200-249';
	return '250';
}

/** Bracket key for the Superior tables. */
export function superiorLevelBracket(itemLevel: number): SuperiorLevelBracket {
	if (itemLevel <= 77) return '0-77';
	if (itemLevel <= 87) return '78-87';
	if (itemLevel <= 97) return '88-97';
	if (itemLevel <= 107) return '98-107';
	if (itemLevel <= 117) return '108-117';
	if (itemLevel <= 127) return '118-127';
	if (itemLevel <= 137) return '128-137';
	if (itemLevel <= 149) return '138-149';
	return '150+';
}

/* -------------------------------------------------------------------------- */
/* Stars 1-15 — the item-level-independent scaling tier                        */
/* -------------------------------------------------------------------------- */

/**
 * Cumulative class stat (granted equally to STR/DEX/INT/LUK) at stars 0-15.
 * Armor, accessories and weapons alike. formulas.md §4A §1.3.
 */
export const SUB15_STAT_CUMULATIVE = [
	0, 2, 4, 6, 8, 10, 13, 16, 19, 22, 25, 28, 31, 34, 37, 40
] as const;

/**
 * Cumulative Max HP at stars 0-15. Max MP follows the same numbers on weapons.
 * NOT granted to gloves, shoes, face accessories or eye accessories.
 * formulas.md §4A §1.3.
 */
export const SUB15_MAX_HP_CUMULATIVE = [
	0, 5, 10, 15, 25, 35, 50, 65, 85, 105, 130, 155, 180, 205, 230, 255
] as const;

/**
 * Cumulative Speed and Jump on shoes at stars 0-15.
 * formulas.md §4A §1.3 (the research resolves a wiki delta/cumulative
 * inconsistency in favour of the cumulative table: +18 at 15★).
 */
export const SHOES_SPEED_JUMP_CUMULATIVE = [
	0, 0, 0, 1, 2, 3, 4, 5, 6, 7, 8, 10, 12, 14, 16, 18
] as const;

/**
 * Cumulative ATT/MATT gloves earn from stars 5-15, kept on top of the 16★+ table.
 * formulas.md §4A §1.3 ("Gloves ATT/MATT" column) and the §1.4 note.
 */
export const GLOVE_SUB15_ATT_CUMULATIVE = [0, 0, 0, 0, 0, 1, 1, 2, 2, 3, 3, 4, 4, 5, 6, 7] as const;

/** DEF gain per star, as a percentage of the item's visible DEF, at every star 1-30. */
export const DEF_PERCENT_PER_STAR = 5;

/**
 * Weapon ATT from stars 1-15 — a compounding percentage of the weapon's own base attack.
 *
 * `f(n) = Σ(i=1..n) ⌊att(i−1) × 0.02 + 1⌋` — each star's gain is computed from the
 * attack the weapon has *after* the previous stars. The wiki calls this approximate
 * (off by a single digit in some cases).
 * formulas.md §4A §1.3 · https://maplestorywiki.net/w/Star_Force_Enhancement/Stat_Tables
 *
 * @param baseAttack weapon base ATT *including scrolled attack*, excluding flame/potential
 * @param stars number of stars (only the first 15 contribute here)
 * @returns the added attack (not the total)
 */
export function weaponSub15Attack(baseAttack: number, stars: number): number {
	if (baseAttack <= 0) return 0; // weapons only gain ATT if base ATT is non-zero
	let current = baseAttack;
	const n = Math.min(Math.max(stars, 0), 15);
	for (let i = 0; i < n; i++) current += 1 + Math.floor(current * 0.02);
	return current - baseAttack;
}

/* -------------------------------------------------------------------------- */
/* Stars 16-30 — the flat, item-level tier                                     */
/* -------------------------------------------------------------------------- */

/**
 * Class stat granted per star for stars 16-22 (all slot types, and the All Stats
 * value badges use). Stars 23-30 grant no class stat.
 * formulas.md §4A §1.4 · https://maplestorywiki.net/w/Star_Force_Enhancement/Stat_Tables
 */
export const STAT_PER_STAR_16_22: Record<StarForceLevelBracket, number> = {
	'128-137': 7,
	'138-149': 9,
	'150-159': 11,
	'160-199': 13,
	'200-249': 15,
	'250': 17
};

/** Last star that grants class stat. Stars 23+ grant attack only. */
export const LAST_STAT_STAR = 22;

/**
 * ATT/MATT gained per star, armor & accessories, stars 16-30 (delta).
 * Index 0 == star 16. `null` means the bracket cannot reach that star.
 * formulas.md §4A §1.4 (cross-checked line-for-line against two open-source
 * implementations; all three agree exactly).
 */
export const ARMOR_ATT_DELTA_16_30: Record<StarForceLevelBracket, readonly (number | null)[]> = {
	//         16  17  18  19  20   21   22   23   24   25   26   27   28   29   30
	'128-137': [7, 8, 9, 10, 11, null, null, null, null, null, null, null, null, null, null],
	'138-149': [8, 9, 10, 11, 12, 13, 15, 17, 19, 21, 22, 23, 24, 25, 26],
	'150-159': [9, 10, 11, 12, 13, 14, 16, 18, 20, 22, 23, 24, 25, 26, 27],
	'160-199': [10, 11, 12, 13, 14, 15, 17, 19, 21, 23, 24, 25, 26, 27, 28],
	'200-249': [12, 13, 14, 15, 16, 17, 19, 21, 23, 25, 26, 27, 28, 29, 30],
	'250': [14, 15, 16, 17, 18, 19, 21, 23, 25, 27, 28, 29, 30, 31, 32]
};

/**
 * ATT/MATT gained per star, weapons, stars 16-25 (delta).
 * Index 0 == star 16. Stars 26-30 are undocumented — see `UNVERIFIED_WEAPON_26_30`.
 * formulas.md §4A §1.4. The research corrects a wiki transcription error at 17★
 * (the delta table repeats the 16★ value; the cumulative table and both
 * open-source implementations give +7/+8/+9).
 */
export const WEAPON_ATT_DELTA_16_25: Record<StarForceLevelBracket, readonly (number | null)[]> = {
	//         16  17  18  19  20   21   22   23   24   25
	'128-137': [6, 7, 7, 8, 9, null, null, null, null, null],
	'138-149': [7, 8, 8, 9, 10, 11, 12, 30, 31, 32],
	'150-159': [8, 9, 9, 10, 11, 12, 13, 31, 32, 33],
	'160-199': [9, 9, 10, 11, 12, 13, 14, 32, 33, 34],
	'200-249': [13, 13, 14, 14, 15, 16, 17, 34, 35, 36],
	// No Level-250 weapon column exists on the wiki; Destiny weapons are locked at 22★.
	'250': [null, null, null, null, null, null, null, null, null, null]
};

/**
 * ⚠️ UNVERIFIED — weapon ATT/MATT for stars 26-30.
 *
 * No public source documents this. MapleStory Wiki's weapon table still ends at
 * 25★. The numbers below are one community implementation's straight `+1/star`
 * extrapolation (masonym.dev, itself sourced from the misaomaki simulator):
 *   https://github.com/masonym/masonym.dev/blob/main/src/lib/equip/starforce.js
 *   https://misaomaki.github.io/starforce.html
 * The armor table *decelerates* from +2/star to +1/star at 26★, so a flat +1/star
 * continuation is plausible but unproven. Index 0 == star 26.
 * formulas.md §4A §1.4 "⚠️ The weapon 26★-30★ gap".
 *
 * Consumers must opt in explicitly (`allowUnverifiedWeapon26to30`).
 */
export const UNVERIFIED_WEAPON_26_30: Record<StarForceLevelBracket, readonly (number | null)[]> = {
	//         26  27  28  29  30
	'128-137': [null, null, null, null, null],
	'138-149': [33, 34, 35, 36, 37],
	'150-159': [34, 35, 36, 37, 38],
	'160-199': [35, 36, 37, 38, 39],
	'200-249': [37, 38, 39, 40, 41],
	'250': [38, null, null, null, null]
};

/**
 * Badges (Ghost Ship Exorcist, Sengoku Hakase). All Stats only — no ATT, MATT,
 * Max HP or DEF. Stars 1-5 give +2, stars 6-15 give +3, stars 16-22 give
 * `STAT_PER_STAR_16_22`. formulas.md §4A §1.4 "Badges".
 *
 * The research flags two apparent transcription errors in the wiki's badge
 * cumulative table (16★/250 showing 59 where the deltas imply 57, and
 * 21★/150-159 showing 104 where the chain implies 106) and instructs using
 * `40 + perStar × (★ − 15)`, which is what `cumulativeStarStats` does.
 */
export const BADGE_MAX_STARS = 22;

/**
 * Superior (Tyrant / Nova / Elite Heliseum) delta table, stars 1-15.
 * `allStat` applies on stars 1-5, `att` (both ATT and MATT) on stars 6-15.
 * Every star also gives DEF +5%. Index 0 == star 1.
 * formulas.md §4A §1.4 "Superior equipment".
 */
export const SUPERIOR_DELTAS: Record<
	SuperiorLevelBracket,
	{ readonly allStat: readonly number[]; readonly att: readonly number[] }
> = {
	'0-77': { allStat: [1, 2, 4], att: [] },
	'78-87': { allStat: [2, 3, 5], att: [] },
	'88-97': { allStat: [4, 5, 7, 10, 14], att: [] },
	'98-107': { allStat: [7, 8, 10, 13, 17], att: [] },
	'108-117': { allStat: [9, 10, 12, 15, 19], att: [5, 6, 7] },
	'118-127': { allStat: [12, 13, 15, 18, 22], att: [6, 7, 8, 9, 10] },
	'128-137': { allStat: [14, 15, 17, 20, 24], att: [7, 8, 9, 10, 11, 13, 15] },
	'138-149': { allStat: [17, 18, 20, 23, 27], att: [8, 9, 10, 11, 12, 14, 16, 18, 20, 22] },
	'150+': { allStat: [19, 20, 22, 25, 29], att: [9, 10, 11, 12, 13, 15, 17, 19, 21, 23] }
};

/* -------------------------------------------------------------------------- */
/* Stat gain API                                                               */
/* -------------------------------------------------------------------------- */

/**
 * One star's worth of gain. `stat` is granted equally to STR/DEX/INT/LUK
 * (the wiki's "Class Stats" column); `allStat` is the badge/Superior "All Stats"
 * column, which behaves identically but is reported separately so callers can
 * keep the tooltip wording straight.
 */
export interface StarStats {
	/** Class stat (STR/DEX/INT/LUK each). */
	stat: number;
	/** All Stats (badges and Superior gear). */
	allStat: number;
	att: number;
	matt: number;
	maxHp: number;
	maxMp: number;
	speed: number;
	jump: number;
	/** DEF gained, as a percentage of the item's visible DEF. */
	defPercent: number;
}

export interface StarStatArgs {
	itemLevel: number;
	/** Current star; the returned block is the gain from `fromStar` → `fromStar + 1`. */
	fromStar: number;
	kind: StarForceKind;
	/**
	 * Weapon base ATT including scrolled attack (excluding flames/potential).
	 * Required to compute weapon ATT below 15★, which compounds.
	 */
	baseAttack?: number;
	/** Weapon base MATT. Weapons with 0 base MATT never gain MATT. */
	baseMagicAttack?: number;
	/** Opt in to the unverified weapon 26-30★ extrapolation. */
	allowUnverifiedWeapon26to30?: boolean;
}

function emptyStats(): StarStats {
	return {
		stat: 0,
		allStat: 0,
		att: 0,
		matt: 0,
		maxHp: 0,
		maxMp: 0,
		speed: 0,
		jump: 0,
		defPercent: 0
	};
}

function requireBracket(itemLevel: number): StarForceLevelBracket {
	const bracket = starForceLevelBracket(itemLevel);
	if (!bracket) {
		throw new Error(
			`Star Force 16★+ tables start at item level 128 (got ${itemLevel}); items below that cap at 15★.`
		);
	}
	return bracket;
}

/** Gain from `fromStar` → `fromStar + 1`. Zero-filled block when the star grants nothing. */
export function starStatGain(args: StarStatArgs): StarStats {
	const { itemLevel, fromStar, kind } = args;
	const target = fromStar + 1;
	const out = emptyStats();
	if (fromStar < 0) throw new Error(`fromStar must be >= 0 (got ${fromStar})`);

	if (kind === 'superior') {
		const bracket = superiorLevelBracket(itemLevel);
		const rows = SUPERIOR_DELTAS[bracket];
		if (target <= 5) out.allStat = rows.allStat[target - 1] ?? 0;
		else if (target <= 15) {
			const att = rows.att[target - 6] ?? 0;
			out.att = att;
			out.matt = att;
		}
		out.defPercent = target <= 15 ? DEF_PERCENT_PER_STAR : 0;
		return out;
	}

	// DEF +5% per star applies at every star 1-30 on non-badge gear.
	if (kind !== 'badge') out.defPercent = DEF_PERCENT_PER_STAR;

	if (target <= 15) {
		if (kind === 'badge') {
			out.allStat = target <= 5 ? 2 : 3;
			out.defPercent = 0;
			return out;
		}
		out.stat = SUB15_STAT_CUMULATIVE[target] - SUB15_STAT_CUMULATIVE[target - 1];
		if (kind === 'armor') {
			out.maxHp = SUB15_MAX_HP_CUMULATIVE[target] - SUB15_MAX_HP_CUMULATIVE[target - 1];
		} else if (kind === 'weapon') {
			out.maxHp = SUB15_MAX_HP_CUMULATIVE[target] - SUB15_MAX_HP_CUMULATIVE[target - 1];
			out.maxMp = out.maxHp;
			const base = args.baseAttack ?? 0;
			const baseMatt = args.baseMagicAttack ?? 0;
			out.att = weaponSub15Attack(base, target) - weaponSub15Attack(base, fromStar);
			out.matt = weaponSub15Attack(baseMatt, target) - weaponSub15Attack(baseMatt, fromStar);
		} else if (kind === 'glove') {
			// Gloves gain no Max HP; they do gain the 5-15★ ATT/MATT block.
			const att = GLOVE_SUB15_ATT_CUMULATIVE[target] - GLOVE_SUB15_ATT_CUMULATIVE[target - 1];
			out.att = att;
			out.matt = att;
		}
		return out;
	}

	// 16★ and up.
	const bracket = requireBracket(itemLevel);
	const perStar = STAT_PER_STAR_16_22[bracket];

	if (kind === 'badge') {
		if (target > BADGE_MAX_STARS) return out;
		out.allStat = perStar;
		return out;
	}

	if (target <= LAST_STAT_STAR) out.stat = perStar;

	if (kind === 'weapon') {
		if (target <= 25) {
			out.att = WEAPON_ATT_DELTA_16_25[bracket][target - 16] ?? 0;
		} else {
			if (!args.allowUnverifiedWeapon26to30) {
				throw new Error(
					`Weapon ATT for ${target}★ is undocumented in every public source. ` +
						`Pass allowUnverifiedWeapon26to30 to use UNVERIFIED_WEAPON_26_30.`
				);
			}
			out.att = UNVERIFIED_WEAPON_26_30[bracket][target - 26] ?? 0;
		}
		// Weapons only gain MATT if their base MATT is non-zero.
		out.matt = (args.baseMagicAttack ?? 0) > 0 || args.baseMagicAttack === undefined ? out.att : 0;
		return out;
	}

	// armor, accessories and gloves share the 16★+ attack table
	out.att = ARMOR_ATT_DELTA_16_30[bracket][target - 16] ?? 0;
	out.matt = out.att;
	return out;
}

export interface CumulativeStarArgs extends Omit<StarStatArgs, 'fromStar'> {
	/** Total stars on the item. */
	stars: number;
}

/**
 * Total stat granted by `stars` stars.
 *
 * Handles the two rules that are not simple table sums:
 *  - weapon ATT/MATT below 15★ compounds off the weapon's own base attack
 *    (`weaponSub15Attack`), so it needs `baseAttack` / `baseMagicAttack`;
 *  - gloves keep the +7 ATT/+7 MATT they earned from stars 5-15 *on top of*
 *    the 16★+ armor table.
 * formulas.md §4A §1.3-§1.4.
 */
export function cumulativeStarStats(args: CumulativeStarArgs): StarStats {
	const { stars, kind, itemLevel } = args;
	if (stars < 0) throw new Error(`stars must be >= 0 (got ${stars})`);
	const total = emptyStats();

	if (kind === 'superior') {
		for (let s = 1; s <= Math.min(stars, 15); s++) {
			const gain = starStatGain({ ...args, fromStar: s - 1 });
			total.allStat += gain.allStat;
			total.att += gain.att;
			total.matt += gain.matt;
			total.defPercent += gain.defPercent;
		}
		return total;
	}

	const capped = Math.min(stars, 30);

	if (kind === 'badge') {
		const sub15 = SUB15_STAT_CUMULATIVE[Math.min(capped, 15)];
		total.allStat = sub15;
		if (capped > 15) {
			const bracket = requireBracket(itemLevel);
			total.allStat += STAT_PER_STAR_16_22[bracket] * (Math.min(capped, BADGE_MAX_STARS) - 15);
		}
		return total;
	}

	// class stat
	total.stat = SUB15_STAT_CUMULATIVE[Math.min(capped, 15)];
	if (capped > 15) {
		const bracket = requireBracket(itemLevel);
		total.stat += STAT_PER_STAR_16_22[bracket] * (Math.min(capped, LAST_STAT_STAR) - 15);
	}

	// HP / MP
	if (kind === 'armor' || kind === 'weapon') {
		total.maxHp = SUB15_MAX_HP_CUMULATIVE[Math.min(capped, 15)];
		if (kind === 'weapon') total.maxMp = total.maxHp;
	}

	// DEF
	total.defPercent = DEF_PERCENT_PER_STAR * capped;

	// attack
	if (kind === 'weapon') {
		const base = args.baseAttack ?? 0;
		const baseMatt = args.baseMagicAttack ?? 0;
		let att = weaponSub15Attack(base, capped);
		let matt = weaponSub15Attack(baseMatt, capped);
		if (capped > 15) {
			const bracket = requireBracket(itemLevel);
			let flat = 0;
			for (let s = 16; s <= capped; s++) {
				flat += starStatGain({ ...args, fromStar: s - 1 }).att;
			}
			att += flat;
			// Weapons only gain MATT if base MATT is non-zero; when the caller did
			// not tell us, assume the item does gain MATT (mirrors the wiki table).
			if (baseMatt > 0 || args.baseMagicAttack === undefined) matt += flat;
		}
		total.att = att;
		total.matt = matt;
		return total;
	}

	if (kind === 'glove') {
		total.att = GLOVE_SUB15_ATT_CUMULATIVE[Math.min(capped, 15)];
		total.matt = total.att;
	}
	if (capped > 15) {
		const bracket = requireBracket(itemLevel);
		let flat = 0;
		for (let s = 16; s <= capped; s++) flat += ARMOR_ATT_DELTA_16_30[bracket][s - 16] ?? 0;
		total.att += flat;
		total.matt += flat;
	}
	return total;
}

/* -------------------------------------------------------------------------- */
/* Success / maintain / destroy rates                                          */
/* -------------------------------------------------------------------------- */

export interface StarRates {
	success: number;
	maintain: number;
	destroy: number;
}

/**
 * Official GMS rates, v264 (unchanged through v269 at Enhancement Mode 1).
 * Index == current star; row describes the `star → star + 1` attempt.
 * Failure never reduces stars for non-Superior gear (KMS 2025-03-20 / GMS 2025-11-12).
 * formulas.md §4A §1.5 · https://www.nexon.com/maplestory/news/update/32522
 */
export const STAR_RATES: readonly StarRates[] = [
	{ success: 0.95, maintain: 0.05, destroy: 0 }, // 0 → 1
	{ success: 0.9, maintain: 0.1, destroy: 0 },
	{ success: 0.85, maintain: 0.15, destroy: 0 },
	{ success: 0.85, maintain: 0.15, destroy: 0 },
	{ success: 0.8, maintain: 0.2, destroy: 0 },
	{ success: 0.75, maintain: 0.25, destroy: 0 },
	{ success: 0.7, maintain: 0.3, destroy: 0 },
	{ success: 0.65, maintain: 0.35, destroy: 0 },
	{ success: 0.6, maintain: 0.4, destroy: 0 },
	{ success: 0.55, maintain: 0.45, destroy: 0 },
	{ success: 0.5, maintain: 0.5, destroy: 0 }, // 10 → 11
	{ success: 0.45, maintain: 0.55, destroy: 0 },
	{ success: 0.4, maintain: 0.6, destroy: 0 },
	{ success: 0.35, maintain: 0.65, destroy: 0 },
	{ success: 0.3, maintain: 0.7, destroy: 0 }, // 14 → 15
	{ success: 0.3, maintain: 0.679, destroy: 0.021 }, // 15 → 16
	{ success: 0.3, maintain: 0.679, destroy: 0.021 },
	{ success: 0.15, maintain: 0.782, destroy: 0.068 },
	{ success: 0.15, maintain: 0.782, destroy: 0.068 },
	{ success: 0.15, maintain: 0.765, destroy: 0.085 },
	{ success: 0.3, maintain: 0.595, destroy: 0.105 }, // 20 → 21
	{ success: 0.15, maintain: 0.7225, destroy: 0.1275 },
	{ success: 0.15, maintain: 0.68, destroy: 0.17 },
	{ success: 0.1, maintain: 0.72, destroy: 0.18 },
	{ success: 0.1, maintain: 0.72, destroy: 0.18 },
	{ success: 0.1, maintain: 0.72, destroy: 0.18 }, // 25 → 26
	{ success: 0.07, maintain: 0.744, destroy: 0.186 },
	{ success: 0.05, maintain: 0.76, destroy: 0.19 },
	{ success: 0.03, maintain: 0.776, destroy: 0.194 },
	{ success: 0.01, maintain: 0.792, destroy: 0.198 } // 29 → 30
];

/** Stars at which Safeguard can be used (i.e. up to reaching 18★). */
export const SAFEGUARD_STARS = [15, 16, 17] as const;

/** Safeguard costs +200% of the base meso cost (triple total) and blocks destruction only. */
export const SAFEGUARD_COST_SURCHARGE = 2;

/** Star Catch (and the Guild Enhancement Altar) multiply the success rate by 1.05. */
export const STAR_CATCH_MULTIPLIER = 1.05;

/**
 * Star Force Enhancement Mode (GMS only, v269 — 2026-06-17), selectable when
 * enhancing 15★ → 21★.
 *
 * ⚠️ Nexon published only a qualitative description; **no per-level rates or cost
 * multipliers exist in any primary source**. Mode 1 is the standard table.
 * Mode 4's numbers come from a namu.wiki search snippet the research could not
 * fetch directly ("stage 4 has a destruction probability of 0%, but the cost is
 * 6.5× higher and the success probability is 8%") and are **UNVERIFIED**.
 * Modes 2 and 3 have no published numbers at all and are `null`.
 *
 * Level 4 is not available for 15★ → 17★ (it would duplicate Safeguard).
 * Enabling Safeguard at Mode 2 or 3 resets the mode to 1.
 * formulas.md §4A §1.5 "Star Force Enhancement Mode (GMS only, v269)" ·
 * https://www.nexon.com/maplestory/news/update/41138/updated-6-30-v-269-ride-the-lightning-patch-notes
 */
export type EnhancementMode = 1 | 2 | 3 | 4;

export interface EnhancementModeSpec {
	/** Absolute success probability, when the source states one. */
	success?: number;
	/** Absolute destruction probability, when the source states one. */
	destroy?: number;
	/** Multiplier on the base meso cost. */
	costMultiplier: number;
	verified: boolean;
	note: string;
}

export const ENHANCEMENT_MODE_MIN_STAR = 15;
export const ENHANCEMENT_MODE_MAX_STAR = 21;

export const UNVERIFIED_ENHANCEMENT_MODES: Record<EnhancementMode, EnhancementModeSpec | null> = {
	1: {
		costMultiplier: 1,
		verified: true,
		note: 'Standard rates and cost — the default, and the only verified mode.'
	},
	2: null, // UNVERIFIED: no published rates or cost multiplier
	3: null, // UNVERIFIED: no published rates or cost multiplier
	4: {
		success: 0.08,
		destroy: 0,
		costMultiplier: 6.5,
		verified: false,
		note:
			'UNVERIFIED — namu.wiki search snippet only; not available for 15★→17★. ' +
			'Nexon published no numbers.'
	}
};

/** Star Force at which a destroyed item's Equipment Trace is restored (GMS). */
export const TRACE_RECOVERY = [
	{ minStar: 15, maxStar: 19, recovered: 12 },
	{ minStar: 20, maxStar: 20, recovered: 15 },
	{ minStar: 21, maxStar: 22, recovered: 17 },
	{ minStar: 23, maxStar: 25, recovered: 19 },
	{ minStar: 26, maxStar: 30, recovered: 20 }
] as const;

/**
 * Star level an Equipment Trace is restored at after a boom at `star`.
 * formulas.md §4A §1.6 · https://www.nexon.com/maplestory/news/update/32522
 */
export function getRecoveredStars(star: number): number {
	for (const row of TRACE_RECOVERY) {
		if (star >= row.minStar && star <= row.maxStar) return row.recovered;
	}
	// Below 15★ nothing can be destroyed, so the item simply stays where it is.
	return star;
}

/** Apply Star Catch: success × 1.05, with the remainder redistributed proportionally. */
export function applyStarCatch(rates: StarRates): StarRates {
	const success = Math.min(rates.success * STAR_CATCH_MULTIPLIER, 1);
	const rest = 1 - success;
	const oldRest = rates.maintain + rates.destroy;
	if (oldRest <= 0) return { success, maintain: 0, destroy: 0 };
	return {
		success,
		maintain: (rates.maintain / oldRest) * rest,
		destroy: (rates.destroy / oldRest) * rest
	};
}

export interface StarforceOptions {
	/** Safeguard (15★-17★ only): destruction becomes Maintain, +200% base cost. */
	safeguard?: boolean;
	/** Star Catch minigame / Guild Enhancement Altar. */
	starCatch?: boolean;
	/** MVP / VIP discount on the base cost only: 3, 5 or 10 (percent). */
	mvpDiscountPercent?: number;
	/** GMS v269 Enhancement Mode (15★-21★). Defaults to 1. */
	enhancementMode?: EnhancementMode;
	/** Required to use any Enhancement Mode above 1 (their data is UNVERIFIED). */
	allowUnverifiedEnhancementModes?: boolean;
	/** Cost of replacing a destroyed item, used by `expectedCostToReach`. Defaults to 0. */
	replacementCost?: number;
}

function resolveMode(star: number, opts: StarforceOptions): EnhancementModeSpec {
	const mode = opts.enhancementMode ?? 1;
	if (mode === 1) return UNVERIFIED_ENHANCEMENT_MODES[1] as EnhancementModeSpec;
	if (star < ENHANCEMENT_MODE_MIN_STAR || star > ENHANCEMENT_MODE_MAX_STAR) {
		throw new Error(
			`Enhancement Mode ${mode} only exists for ${ENHANCEMENT_MODE_MIN_STAR}★-${ENHANCEMENT_MODE_MAX_STAR}★ (got ${star}★).`
		);
	}
	if (mode === 4 && star < 18) {
		throw new Error(
			'Enhancement Mode 4 is not available for 15★→17★ (it would duplicate Safeguard).'
		);
	}
	if (!opts.allowUnverifiedEnhancementModes) {
		throw new Error(
			`Enhancement Mode ${mode} has no published rates or cost multiplier. ` +
				'Pass allowUnverifiedEnhancementModes to use UNVERIFIED_ENHANCEMENT_MODES.'
		);
	}
	const spec = UNVERIFIED_ENHANCEMENT_MODES[mode];
	if (!spec) {
		throw new Error(
			`Enhancement Mode ${mode}: Nexon published no rates or cost multiplier, and no ` +
				'secondary source gives numbers. Nothing to model.'
		);
	}
	return spec;
}

/** Whether Safeguard is usable at this star. */
export function safeguardAvailable(star: number): boolean {
	return (SAFEGUARD_STARS as readonly number[]).includes(star);
}

/**
 * Effective rates for the `star → star + 1` attempt with the given options.
 * Order of operations: Enhancement Mode override → Star Catch → Safeguard.
 */
export function starRates(star: number, opts: StarforceOptions = {}): StarRates {
	const base = STAR_RATES[star];
	if (!base) throw new Error(`No rate row for ${star}★ → ${star + 1}★ (valid: 0-29).`);
	let rates: StarRates = { ...base };

	const mode = opts.enhancementMode ?? 1;
	if (mode !== 1) {
		const spec = resolveMode(star, opts);
		if (spec.success !== undefined || spec.destroy !== undefined) {
			const success = spec.success ?? rates.success;
			const destroy = spec.destroy ?? rates.destroy;
			rates = { success, destroy, maintain: Math.max(0, 1 - success - destroy) };
		}
	}

	if (opts.starCatch) rates = applyStarCatch(rates);

	if (opts.safeguard && safeguardAvailable(star)) {
		rates = { success: rates.success, maintain: rates.maintain + rates.destroy, destroy: 0 };
	}
	return rates;
}

/* -------------------------------------------------------------------------- */
/* Meso cost                                                                   */
/* -------------------------------------------------------------------------- */

/**
 * GMS meso-cost divisors, keyed by the *current* star. Cost is
 * `1000 + round(L³ × factor / divisor)`, then rounded to the nearest 100, where
 * `L` is the item level rounded **down** to the nearest 10 and the factor is
 * `(star + 1)` for 0-9★ and `(star + 1)^2.7` from 10★ up.
 * formulas.md §4A §1.7 · https://maplestorywiki.net/w/Star_Force_Enhancement
 *
 * The research flags the 0★-15★ GMS divisors as needing an in-game double-check:
 * Nexon's v264 notes say costs were "adjusted to scale based on both equipment
 * level and enhancement level" without publishing a formula.
 */
export const STARFORCE_COST_DIVISORS: Record<number, number> = {
	0: 25,
	1: 25,
	2: 25,
	3: 25,
	4: 25,
	5: 25,
	6: 25,
	7: 25,
	8: 25,
	9: 25,
	10: 400,
	11: 220,
	12: 150,
	13: 110,
	14: 75,
	15: 200,
	16: 200,
	17: 150,
	18: 70,
	19: 45,
	20: 200,
	21: 125,
	22: 200,
	23: 200,
	24: 200,
	25: 200,
	26: 200,
	27: 200,
	28: 200,
	29: 200
};

/** MVP / VIP discounts on the base meso cost (never on the Safeguard surcharge). */
export const MVP_DISCOUNTS = [
	{ mvp: 'Silver', vip: 'Gold', percent: 3 },
	{ mvp: 'Gold', vip: 'Diamond', percent: 5 },
	{ mvp: 'Diamond+', vip: 'Royal+', percent: 10 }
] as const;

/** The raw formula cost of one `star → star + 1` attempt, before any modifier. */
export function starforceBaseCost(itemLevel: number, star: number): number {
	const divisor = STARFORCE_COST_DIVISORS[star];
	if (divisor === undefined)
		throw new Error(`No cost row for ${star}★ → ${star + 1}★ (valid: 0-29).`);
	const l = Math.floor(itemLevel / 10) * 10;
	const factor = star < 10 ? star + 1 : Math.pow(star + 1, 2.7);
	const raw = 1000 + Math.round((Math.pow(l, 3) * factor) / divisor);
	return Math.round(raw / 100) * 100;
}

/**
 * Meso cost of one `star → star + 1` attempt.
 *
 * - MVP/VIP discounts apply to the base cost only.
 * - Safeguard adds +200% of the *undiscounted* base cost (triple total).
 * - Enhancement Mode multiplies the base cost (mode 1 = ×1).
 */
export function starforceCost(
	itemLevel: number,
	star: number,
	opts: StarforceOptions = {}
): number {
	const base = starforceBaseCost(itemLevel, star);
	const mode = opts.enhancementMode ?? 1;
	const modeMultiplier = mode === 1 ? 1 : resolveMode(star, opts).costMultiplier;
	const discount = (opts.mvpDiscountPercent ?? 0) / 100;
	let cost = base * modeMultiplier * (1 - discount);
	if (opts.safeguard && safeguardAvailable(star)) cost += base * SAFEGUARD_COST_SURCHARGE;
	return cost;
}

/* -------------------------------------------------------------------------- */
/* Expected cost                                                               */
/* -------------------------------------------------------------------------- */

/**
 * Expected total meso cost to take an item from `from`★ to `to`★.
 *
 * Solved as an absorbing Markov chain over star levels:
 *   E[s] = c(s) + p·E[s+1] + q·E[s] + d·(replacementCost + E[r(s)]),  E[to] = 0
 * where `c` is the per-attempt cost, `p/q/d` are success/maintain/destroy and
 * `r(s)` is `getRecoveredStars(s)`. Stars never decrease on failure (GMS 2025-11-12),
 * so the only backward move is a boom, which restarts from the recovered star.
 * Because a boom sends you *below* the current star, the equations are mutually
 * recursive and are solved as a small dense linear system.
 *
 * Superior gear is out of scope here — it still loses a star on failure and has
 * Chance Time (formulas.md §4A §1.4).
 */
export function expectedCostToReach(
	itemLevel: number,
	from: number,
	to: number,
	opts: StarforceOptions = {}
): number {
	if (to <= from) return 0;
	const replacementCost = opts.replacementCost ?? 0;

	// Stars whose expected cost we need: everything a boom can drop us to, up to `to - 1`.
	let low = from;
	for (let s = Math.max(from, 15); s < to; s++) low = Math.min(low, getRecoveredStars(s));
	const stars: number[] = [];
	for (let s = low; s < to; s++) stars.push(s);
	const n = stars.length;
	const index = new Map<number, number>(stars.map((s, i) => [s, i]));

	// Augmented matrix, row i: coefficients for E[stars[i]] ... | rhs
	const m: number[][] = Array.from({ length: n }, () => new Array<number>(n + 1).fill(0));
	for (let i = 0; i < n; i++) {
		const s = stars[i];
		const attemptOpts: StarforceOptions = {
			...opts,
			safeguard: opts.safeguard === true && safeguardAvailable(s)
		};
		const r = starRates(s, attemptOpts);
		const c = starforceCost(itemLevel, s, attemptOpts);
		m[i][i] += 1 - r.maintain;
		const next = index.get(s + 1);
		if (next !== undefined) m[i][next] -= r.success; // E[to] is 0, so no column for it
		if (r.destroy > 0) {
			const recovered = index.get(getRecoveredStars(s));
			if (recovered !== undefined) m[i][recovered] -= r.destroy;
		}
		m[i][n] = c + r.destroy * replacementCost;
	}

	// Gaussian elimination with partial pivoting.
	for (let col = 0; col < n; col++) {
		let pivot = col;
		for (let row = col + 1; row < n; row++) {
			if (Math.abs(m[row][col]) > Math.abs(m[pivot][col])) pivot = row;
		}
		if (Math.abs(m[pivot][col]) < 1e-12) {
			throw new Error(
				`Singular star-force expectation system at ${stars[col]}★ (unreachable target?).`
			);
		}
		[m[col], m[pivot]] = [m[pivot], m[col]];
		const p = m[col][col];
		for (let j = col; j <= n; j++) m[col][j] /= p;
		for (let row = 0; row < n; row++) {
			if (row === col) continue;
			const f = m[row][col];
			if (f === 0) continue;
			for (let j = col; j <= n; j++) m[row][j] -= f * m[col][j];
		}
	}

	const i = index.get(from);
	if (i === undefined) throw new Error(`from=${from} is not inside the solved range.`);
	return m[i][n];
}

/**
 * Expected number of booms taken on the way from `from`★ to `to`★.
 * Same chain as `expectedCostToReach`, with a cost of 1 per destruction.
 */
export function expectedBooms(from: number, to: number, opts: StarforceOptions = {}): number {
	if (to <= from) return 0;
	// Reuse the cost solver with a synthetic "cost" of 1 per boom: pass an item
	// level of 0 (base cost 1000 → we subtract it out) is fragile, so solve directly.
	let low = from;
	for (let s = Math.max(from, 15); s < to; s++) low = Math.min(low, getRecoveredStars(s));
	const stars: number[] = [];
	for (let s = low; s < to; s++) stars.push(s);
	const n = stars.length;
	const index = new Map<number, number>(stars.map((s, i) => [s, i]));
	const m: number[][] = Array.from({ length: n }, () => new Array<number>(n + 1).fill(0));
	for (let i = 0; i < n; i++) {
		const s = stars[i];
		const attemptOpts: StarforceOptions = {
			...opts,
			safeguard: opts.safeguard === true && safeguardAvailable(s)
		};
		const r = starRates(s, attemptOpts);
		m[i][i] += 1 - r.maintain;
		const next = index.get(s + 1);
		if (next !== undefined) m[i][next] -= r.success;
		if (r.destroy > 0) {
			const recovered = index.get(getRecoveredStars(s));
			if (recovered !== undefined) m[i][recovered] -= r.destroy;
		}
		m[i][n] = r.destroy;
	}
	for (let col = 0; col < n; col++) {
		let pivot = col;
		for (let row = col + 1; row < n; row++) {
			if (Math.abs(m[row][col]) > Math.abs(m[pivot][col])) pivot = row;
		}
		if (Math.abs(m[pivot][col]) < 1e-12) throw new Error('Singular boom-expectation system.');
		[m[col], m[pivot]] = [m[pivot], m[col]];
		const p = m[col][col];
		for (let j = col; j <= n; j++) m[col][j] /= p;
		for (let row = 0; row < n; row++) {
			if (row === col) continue;
			const f = m[row][col];
			if (f === 0) continue;
			for (let j = col; j <= n; j++) m[row][j] -= f * m[col][j];
		}
	}
	const i = index.get(from);
	if (i === undefined) throw new Error(`from=${from} is not inside the solved range.`);
	return m[i][n];
}

/**
 * Star Force hunting-map damage multipliers (your SF vs the map's requirement).
 * formulas.md §4A §1.8 · https://maplestorywiki.net/w/Star_Force_Enhancement
 */
export const STAR_FORCE_MAP_TIERS = [
	{ minPercent: 100, damageDealt: 1.0, damageTaken: 1.0 },
	{ minPercent: 70, damageDealt: 0.7, damageTaken: 1.6 },
	{ minPercent: 50, damageDealt: 0.5, damageTaken: 2.0 },
	{ minPercent: 30, damageDealt: 0.3, damageTaken: 2.4 },
	{ minPercent: 10, damageDealt: 0.1, damageTaken: 2.8 },
	{ minPercent: 0, damageDealt: 0, damageTaken: 3.0 } // deals literally 1 damage
] as const;

/**
 * Star Force Conversion for Xenon: +7 STR/DEX/LUK per 10 equipped Star Force,
 * capped at 100 equipped Star Force (max +70 each).
 * formulas.md §4A §1.9 · https://strategywiki.org/wiki/MapleStory/Spell_Trace_and_Star_Force
 */
export const XENON_STARFORCE_CONVERSION = { perStarForce: 10, statEach: 7, cap: 100 } as const;
