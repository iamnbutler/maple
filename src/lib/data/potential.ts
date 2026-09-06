/**
 * Potential and Bonus Potential — GMS 2026.
 *
 * Transcribed from `docs/research/formulas.md` §4A §3 "Potential and Bonus Potential".
 * Primary sources cited there:
 *   - https://strategywiki.org/wiki/MapleStory/Potential_System  (the only exhaustive line tables)
 *   - https://maplestorywiki.net/w/Potential                     (system rules, 2025-26 changes)
 *   - https://maplestorywiki.net/w/Cube                          (current GMS cube names and prices)
 *   - http://whackybeanz.com/maple/extras/potential-list         (MapleSEA probability mirror)
 *
 * SOURCE-QUALITY WARNING (from the research): MapleStory Wiki's `Potential/Stat_Tables`
 * page is empty ("Under construction") as of 2026-09-06, so every value below comes
 * from StrategyWiki, which is accurate on values but stale on item names.
 *
 * WORLD SCOPE: this tracker is **Heroic (Reboot) only**.
 *  - Cube prices are the Heroic meso prices; the NX prices are not modelled.
 *  - **Bonus Potential does not exist in Heroic worlds** (formulas.md §4A §3.1). The
 *    bonus-potential tables below are kept for reference/parsing only — never
 *    generate bonus-potential upgrade candidates for a Heroic character.
 */

/* -------------------------------------------------------------------------- */
/* Types                                                                       */
/* -------------------------------------------------------------------------- */

export type PotentialGrade = 'rare' | 'epic' | 'unique' | 'legendary';

export type PotentialCategory =
	'weapon' | 'secondary' | 'emblem' | 'armor' | 'accessory' | 'heart' | 'badge';

/** Slot detail, only needed for the slot-specific lines (hat cooldown, glove crit damage). */
export type PotentialSlot =
	'hat' | 'top' | 'bottom' | 'overall' | 'gloves' | 'shoes' | 'cape' | 'belt' | 'shoulder';

export type PotentialLineKind =
	| 'stat_pct'
	| 'all_stat_pct'
	| 'hp_pct'
	| 'mp_pct'
	| 'def_pct'
	| 'att_pct'
	| 'matt_pct'
	| 'crit_rate'
	| 'crit_dmg'
	| 'damage_pct'
	| 'boss'
	| 'ied'
	| 'meso'
	| 'drop'
	| 'cooldown'
	| 'stat_flat'
	| 'att_flat'
	| 'matt_flat'
	| 'att_per_10_levels'
	| 'matt_per_10_levels';

export type PotentialType = 'main' | 'bonus';

export interface LineValueOptions {
	/** `main` (regular potential) or `bonus` (Bonus Potential — not obtainable in Heroic). */
	potential?: PotentialType;
	/** Needed for hat-only and glove-only lines. */
	slot?: PotentialSlot;
}

/** One documented value for a line, with its roll chance when the research publishes one. */
export interface PotentialLineOption {
	value: number;
	/** Chance on an initial roll, when published. */
	initialChance?: number;
	/** Chance from an in-game (meso) cube, when published. */
	inGameCubeChance?: number;
	/** Chance from a cash cube, when published. */
	cashCubeChance?: number;
	/** Minimum item level for the line to appear. */
	minItemLevel?: number;
	note?: string;
}

/* -------------------------------------------------------------------------- */
/* The master percentage scale                                                 */
/* -------------------------------------------------------------------------- */

/**
 * Rank × item-level percentage scale — drives nearly every `%` potential line.
 *
 * **The GMS/TMS breakpoint is item level 151.** A Lv160 AbsoLab, a Lv200
 * Arcane/Eternal and a Lv250 Genesis all use the same 13% Legendary line.
 * (Other regions use 71-200 / 201+; several secondary guides quote "201+", which
 * is the non-GMS breakpoint — do not use it here.)
 * formulas.md §4A §3.2 · https://strategywiki.org/wiki/MapleStory/Potential_System
 */
export const POTENTIAL_PERCENT_SCALE = [
	{ minLevel: 0, rare: 1, epic: 2, unique: 3, legendary: 6 },
	{ minLevel: 31, rare: 2, epic: 4, unique: 6, legendary: 9 },
	{ minLevel: 71, rare: 3, epic: 6, unique: 9, legendary: 12 },
	{ minLevel: 151, rare: 4, epic: 7, unique: 10, legendary: 13 }
] as const;

/** The GMS/TMS item-level breakpoint for the top row of the percentage scale. */
export const GMS_POTENTIAL_LEVEL_BREAKPOINT = 151;

type PercentScaleRow = (typeof POTENTIAL_PERCENT_SCALE)[number];

function scaleRow(itemLevel: number): PercentScaleRow {
	let row: PercentScaleRow = POTENTIAL_PERCENT_SCALE[0];
	for (const candidate of POTENTIAL_PERCENT_SCALE)
		if (itemLevel >= candidate.minLevel) row = candidate;
	return row;
}

/** Grade one rank below — All Stat % lines are always one rank below the stated rank. */
export function rankBelow(grade: PotentialGrade): PotentialGrade | null {
	switch (grade) {
		case 'legendary':
			return 'unique';
		case 'unique':
			return 'epic';
		case 'epic':
			return 'rare';
		// A rank below Rare is undocumented — All Stat lines effectively do not exist at Rare.
		case 'rare':
			return null;
	}
}

/* -------------------------------------------------------------------------- */
/* Bonus potential scales                                                      */
/* -------------------------------------------------------------------------- */

/**
 * Bonus Potential STR/DEX/INT/LUK % scale (weaker than regular potential).
 * NOTE weapons, secondary weapons and emblems use the *regular* scale instead.
 * formulas.md §4A §3.6.
 */
export const BONUS_POTENTIAL_STAT_SCALE = [
	{ minLevel: 0, rare: 1, epic: 1, unique: 2, legendary: 3 },
	{ minLevel: 21, rare: 1, epic: 2, unique: 3, legendary: 4 },
	{ minLevel: 51, rare: 1, epic: 3, unique: 4, legendary: 5 },
	{ minLevel: 91, rare: 2, epic: 4, unique: 5, legendary: 7 },
	{ minLevel: 151, rare: 3, epic: 5, unique: 6, legendary: 8 }
] as const;

/** Bonus Potential Max HP % scale. formulas.md §4A §3.6. */
export const BONUS_POTENTIAL_HP_SCALE = [
	{ minLevel: 0, rare: 1, epic: 1, unique: 2, legendary: 3 },
	{ minLevel: 21, rare: 1, epic: 2, unique: 3, legendary: 5 },
	{ minLevel: 51, rare: 1, epic: 3, unique: 5, legendary: 7 },
	{ minLevel: 91, rare: 2, epic: 5, unique: 7, legendary: 10 },
	{ minLevel: 151, rare: 3, epic: 6, unique: 8, legendary: 11 }
] as const;

/**
 * Bonus Potential flat STR/DEX/INT/LUK, Legendary (prime) values.
 * Only the Legendary row is published. formulas.md §4A §3.6.
 */
export const BONUS_POTENTIAL_FLAT_STAT_LEGENDARY = [
	{ minLevel: 0, value: 8 },
	{ minLevel: 21, value: 10 },
	{ minLevel: 41, value: 12 },
	{ minLevel: 51, value: 14 },
	{ minLevel: 71, value: 16 },
	{ minLevel: 91, value: 18 },
	{ minLevel: 151, value: 19 }
] as const;

/**
 * Bonus Potential flat Weapon ATT / Magic ATT, Legendary (prime) values.
 * **The headline bonus-potential line: +15 ATT on a Lv151+ armor or accessory,
 * up to 3 per item.** formulas.md §4A §3.6.
 */
export const BONUS_POTENTIAL_FLAT_ATT_LEGENDARY = [
	{ minLevel: 0, value: 8 },
	{ minLevel: 21, value: 10 },
	{ minLevel: 51, value: 12 },
	{ minLevel: 91, value: 14 },
	{ minLevel: 151, value: 15 }
] as const;

/** Bonus Potential Mesos Obtained % / Item Drop Rate %, Legendary. formulas.md §4A §3.6. */
export const BONUS_POTENTIAL_MESO_DROP_LEGENDARY = [
	{ minLevel: 0, value: 2 },
	{ minLevel: 21, value: 3 },
	{ minLevel: 51, value: 4 },
	{ minLevel: 91, value: 5 }
] as const;

/** Bonus Potential Critical Damage, Legendary prime: +1% (Lv70+, 1 in 31.5). formulas.md §4A §3.6. */
export const BONUS_POTENTIAL_CRIT_DAMAGE = {
	value: 1,
	minItemLevel: 70,
	chance: 0.031746
} as const;

/** Bonus Potential weapon specials — far weaker than regular potential. formulas.md §4A §3.6. */
export const BONUS_POTENTIAL_WEAPON_SPECIALS = {
	boss: { value: 18, minItemLevel: 50, chance: 0.02564, maxPerItem: 2 },
	ied: { value: 5, minItemLevel: 50, chance: 0.02564, maxPerItem: 2 }
} as const;

function bracketValue(
	table: readonly { readonly minLevel: number; readonly value: number }[],
	itemLevel: number
): number {
	let value: number = table[0].value;
	for (const row of table) if (itemLevel >= row.minLevel) value = row.value;
	return value;
}

/* -------------------------------------------------------------------------- */
/* Special lines (main potential)                                              */
/* -------------------------------------------------------------------------- */

/**
 * Boss Damage lines in the regular-potential weapon/secondary/emblem pool.
 * Max 2 per item. Note the asymmetry: on an initial roll `Boss 35%` is twice as
 * likely as `Boss 40%`. Epic and Rare boss lines are not documented in the research.
 * formulas.md §4A §3.3.
 */
export const BOSS_DAMAGE_LINES: Partial<Record<PotentialGrade, readonly PotentialLineOption[]>> = {
	unique: [
		{
			value: 30,
			minItemLevel: 100,
			initialChance: 0.06667,
			inGameCubeChance: 0.06667,
			cashCubeChance: 0.06977
		}
	],
	legendary: [
		{
			value: 35,
			minItemLevel: 100,
			initialChance: 0.08,
			inGameCubeChance: 0.1111,
			cashCubeChance: 0.09756
		},
		{
			value: 40,
			minItemLevel: 100,
			initialChance: 0.04,
			inGameCubeChance: 0.02778,
			cashCubeChance: 0.04878
		}
	]
};

/**
 * Ignore Enemy DEF lines in the regular-potential weapon/secondary/emblem pool.
 * Max 2 per item. `IED 35%` and `IED 40%` are equally likely on an initial roll.
 * formulas.md §4A §3.3.
 */
export const IED_LINES: Partial<Record<PotentialGrade, readonly PotentialLineOption[]>> = {
	unique: [
		{
			value: 30,
			minItemLevel: 50,
			initialChance: 0.06667,
			inGameCubeChance: 0.06667,
			cashCubeChance: 0.06977
		}
	],
	legendary: [
		{
			value: 35,
			minItemLevel: 50,
			initialChance: 0.04,
			inGameCubeChance: 0.05556,
			cashCubeChance: 0.04878
		},
		{
			value: 40,
			minItemLevel: 100,
			initialChance: 0.04,
			inGameCubeChance: 0.02778,
			cashCubeChance: 0.04878
		}
	]
};

/**
 * Mesos Obtained % / Item Drop Rate % on accessories. **These do not scale past
 * item level 71 and have no 151+ bump.** Caps: +100% meso, +200% drop in total
 * across potential + bonus potential. Drop Rate can appear at most twice per item.
 * The research publishes the values by item level only (not by rank); they appear
 * in the Unique and Legendary pools.
 * formulas.md §4A §3.3 "Accessories".
 */
export const MESO_DROP_LINES = [
	{ minLevel: 0, value: 10 },
	{ minLevel: 31, value: 15 },
	{ minLevel: 71, value: 20 }
] as const;

export const MESO_DROP_CAPS = { mesoPercent: 100, dropPercent: 200 } as const;

/**
 * Skill Cooldown reduction (armor pool). `−1s` needs Lv70+; `−2s` is **hat only**
 * and needs Lv120+. Both are Legendary-prime lines.
 *
 * Mechanics caveat (StrategyWiki, verbatim): if a skill's cooldown after %
 * reductions is 5-10s, `−1s` instead reduces by 5% of the remaining cooldown
 * (min 5s); if the cooldown is >10s but the line would push it under 10s, only
 * half the amount below 10s applies.
 * formulas.md §4A §3.3 "Armor — Hat".
 */
export const COOLDOWN_LINES = {
	minusOneSecond: { value: -1, minItemLevel: 70, slots: null },
	minusTwoSeconds: { value: -2, minItemLevel: 120, slots: ['hat'] as const }
} as const;

/**
 * ⚠️ UNVERIFIED — glove Critical Damage % (regular potential).
 *
 * `formulas.md` §4A §3.3 states only that "gloves get Critical Damage" and gives
 * no value; MapleStory Wiki's Potential stat-table page is empty and StrategyWiki's
 * per-slot pages were not transcribed into the research. **+8% at Legendary is the
 * widely-known community value and is NOT sourced in `formulas.md`.** Confirm from
 * an in-game tooltip before trusting it.
 */
export const UNVERIFIED_GLOVE_CRIT_DAMAGE: Partial<Record<PotentialGrade, number>> = {
	legendary: 8
};

/**
 * Weapon ATT / Magic ATT "+1 per 10 character levels" lines (Legendary prime).
 * = +25 ATT at character level 250. formulas.md §4A §3.3.
 */
export const ATT_PER_10_CHARACTER_LEVELS = {
	perTenLevels: 1,
	initialChance: 0.12,
	inGameCubeChance: 0,
	cashCubeChance: 0.04878
} as const;

/** Bonus-potential "+2 stat per 10 character levels" line (= +50 at Lv250, Lv30+). */
export const BONUS_STAT_PER_10_CHARACTER_LEVELS = { perTenLevels: 2, minItemLevel: 30 } as const;

/* -------------------------------------------------------------------------- */
/* lineValue                                                                   */
/* -------------------------------------------------------------------------- */

const PERCENT_SCALE_KINDS: readonly PotentialLineKind[] = [
	'stat_pct',
	'hp_pct',
	'mp_pct',
	'def_pct',
	'att_pct',
	'matt_pct',
	'crit_rate',
	'damage_pct'
];

const WEAPON_LIKE: readonly PotentialCategory[] = ['weapon', 'secondary', 'emblem'];

/**
 * All documented values for a line, best first.
 * Returns an empty array when the line does not exist for that combination, or
 * when the research does not document it (see the `UNVERIFIED_*` exports).
 */
export function lineValues(
	grade: PotentialGrade,
	itemLevel: number,
	category: PotentialCategory,
	kind: PotentialLineKind,
	opts: LineValueOptions = {}
): PotentialLineOption[] {
	const potential = opts.potential ?? 'main';
	const weaponLike = WEAPON_LIKE.includes(category);

	if (potential === 'bonus') return bonusLineValues(grade, itemLevel, category, kind, opts);

	if (PERCENT_SCALE_KINDS.includes(kind)) {
		// %ATT / %MATT / crit rate / damage% only exist on weapon-like items.
		if (
			(kind === 'att_pct' ||
				kind === 'matt_pct' ||
				kind === 'damage_pct' ||
				kind === 'crit_rate') &&
			!weaponLike
		) {
			return [];
		}
		return [{ value: scaleRow(itemLevel)[grade] }];
	}

	if (kind === 'all_stat_pct') {
		const below = rankBelow(grade);
		return below ? [{ value: scaleRow(itemLevel)[below] }] : [];
	}

	if (kind === 'boss') {
		if (!weaponLike) return [];
		return [...(BOSS_DAMAGE_LINES[grade] ?? [])].filter((o) => itemLevel >= (o.minItemLevel ?? 0));
	}

	if (kind === 'ied') {
		if (!weaponLike) return [];
		return [...(IED_LINES[grade] ?? [])].filter((o) => itemLevel >= (o.minItemLevel ?? 0));
	}

	if (kind === 'meso' || kind === 'drop') {
		if (category !== 'accessory') return [];
		if (grade === 'rare' || grade === 'epic') return [];
		return [{ value: bracketValue(MESO_DROP_LINES, itemLevel) }];
	}

	if (kind === 'cooldown') {
		if (category !== 'armor' || grade !== 'legendary') return [];
		const out: PotentialLineOption[] = [];
		if (opts.slot === 'hat' && itemLevel >= COOLDOWN_LINES.minusTwoSeconds.minItemLevel) {
			out.push({
				value: COOLDOWN_LINES.minusTwoSeconds.value,
				minItemLevel: 120,
				note: 'hat only'
			});
		}
		if (itemLevel >= COOLDOWN_LINES.minusOneSecond.minItemLevel) {
			out.push({ value: COOLDOWN_LINES.minusOneSecond.value, minItemLevel: 70 });
		}
		return out;
	}

	if (kind === 'crit_dmg') {
		if (opts.slot !== 'gloves') return [];
		const value = UNVERIFIED_GLOVE_CRIT_DAMAGE[grade];
		return value === undefined
			? []
			: [{ value, note: 'UNVERIFIED — not sourced in formulas.md; community value' }];
	}

	if (kind === 'att_per_10_levels' || kind === 'matt_per_10_levels') {
		if (!weaponLike || grade !== 'legendary') return [];
		return [
			{
				value: ATT_PER_10_CHARACTER_LEVELS.perTenLevels,
				initialChance: ATT_PER_10_CHARACTER_LEVELS.initialChance,
				inGameCubeChance: ATT_PER_10_CHARACTER_LEVELS.inGameCubeChance,
				cashCubeChance: ATT_PER_10_CHARACTER_LEVELS.cashCubeChance,
				note: 'per 10 character levels'
			}
		];
	}

	// Flat stat / flat ATT lines only exist in bonus potential.
	return [];
}

function bonusLineValues(
	grade: PotentialGrade,
	itemLevel: number,
	category: PotentialCategory,
	kind: PotentialLineKind,
	opts: LineValueOptions
): PotentialLineOption[] {
	const weaponLike = WEAPON_LIKE.includes(category);

	// Weapons, secondary weapons and emblems use the REGULAR potential scale for %.
	if (weaponLike) {
		if (PERCENT_SCALE_KINDS.includes(kind)) return [{ value: scaleRow(itemLevel)[grade] }];
		if (kind === 'all_stat_pct') {
			const below = rankBelow(grade);
			return below ? [{ value: scaleRow(itemLevel)[below] }] : [];
		}
		if (kind === 'boss') {
			if (grade !== 'legendary' || itemLevel < BONUS_POTENTIAL_WEAPON_SPECIALS.boss.minItemLevel)
				return [];
			const spec = BONUS_POTENTIAL_WEAPON_SPECIALS.boss;
			return [{ value: spec.value, initialChance: spec.chance, minItemLevel: spec.minItemLevel }];
		}
		if (kind === 'ied') {
			if (grade !== 'legendary' || itemLevel < BONUS_POTENTIAL_WEAPON_SPECIALS.ied.minItemLevel)
				return [];
			const spec = BONUS_POTENTIAL_WEAPON_SPECIALS.ied;
			return [{ value: spec.value, initialChance: spec.chance, minItemLevel: spec.minItemLevel }];
		}
		return [];
	}

	// Armor / accessories / heart / badge.
	if (kind === 'stat_pct') {
		let row: (typeof BONUS_POTENTIAL_STAT_SCALE)[number] = BONUS_POTENTIAL_STAT_SCALE[0];
		for (const candidate of BONUS_POTENTIAL_STAT_SCALE)
			if (itemLevel >= candidate.minLevel) row = candidate;
		return [{ value: row[grade] }];
	}
	if (kind === 'hp_pct') {
		let row: (typeof BONUS_POTENTIAL_HP_SCALE)[number] = BONUS_POTENTIAL_HP_SCALE[0];
		for (const candidate of BONUS_POTENTIAL_HP_SCALE)
			if (itemLevel >= candidate.minLevel) row = candidate;
		return [{ value: row[grade] }];
	}
	if (kind === 'all_stat_pct') {
		const below = rankBelow(grade);
		if (!below) return [];
		let row: (typeof BONUS_POTENTIAL_STAT_SCALE)[number] = BONUS_POTENTIAL_STAT_SCALE[0];
		for (const candidate of BONUS_POTENTIAL_STAT_SCALE)
			if (itemLevel >= candidate.minLevel) row = candidate;
		return [{ value: row[below] }];
	}
	if (kind === 'stat_flat') {
		if (grade !== 'legendary') return []; // only the Legendary row is published
		return [{ value: bracketValue(BONUS_POTENTIAL_FLAT_STAT_LEGENDARY, itemLevel) }];
	}
	if (kind === 'att_flat' || kind === 'matt_flat') {
		if (grade !== 'legendary') return [];
		return [
			{
				value: bracketValue(BONUS_POTENTIAL_FLAT_ATT_LEGENDARY, itemLevel),
				note: 'up to 3 per item'
			}
		];
	}
	if (kind === 'meso' || kind === 'drop') {
		if (grade !== 'legendary') return [];
		return [{ value: bracketValue(BONUS_POTENTIAL_MESO_DROP_LEGENDARY, itemLevel) }];
	}
	if (kind === 'crit_dmg') {
		if (grade !== 'legendary' || itemLevel < BONUS_POTENTIAL_CRIT_DAMAGE.minItemLevel) return [];
		// +1% Critical Damage is a general armor/accessory bonus-potential line.
		return [
			{
				value: BONUS_POTENTIAL_CRIT_DAMAGE.value,
				initialChance: BONUS_POTENTIAL_CRIT_DAMAGE.chance
			}
		];
	}
	return [];
}

/**
 * The best documented value for a potential line, or `null` when the line does
 * not exist for that grade/level/category (or is not documented in the research).
 *
 * "Best" matters for Boss Damage and IED, which have two Legendary values
 * (35% and 40%); use `lineValues` when you need both and their roll chances.
 *
 * @example lineValue('legendary', 160, 'armor', 'stat_pct')       // 13
 * @example lineValue('legendary', 200, 'weapon', 'boss')          // 40
 * @example lineValue('legendary', 160, 'armor', 'cooldown', { slot: 'hat' })  // -2
 */
export function lineValue(
	grade: PotentialGrade,
	itemLevel: number,
	category: PotentialCategory,
	kind: PotentialLineKind,
	opts: LineValueOptions = {}
): number | null {
	const options = lineValues(grade, itemLevel, category, kind, opts);
	if (options.length === 0) return null;
	// Cooldown values are negative; "best" is the largest magnitude reduction.
	if (kind === 'cooldown') return Math.min(...options.map((o) => o.value));
	return Math.max(...options.map((o) => o.value));
}

/* -------------------------------------------------------------------------- */
/* Prime-line and rank-up rates                                                */
/* -------------------------------------------------------------------------- */

/**
 * Line-count on a fresh potential roll: 2 lines 75% / 3 lines 25%. Since the
 * stamp retirement, using a Cube on an item with fewer than 3 lines
 * automatically brings it to 3 lines. formulas.md §4A §3.1.
 */
export const POTENTIAL_LINE_COUNT = { two: 0.75, three: 0.25 } as const;

/**
 * Prime-line rates for in-game (meso/drop) cubes: the 1st line is always prime,
 * and lines 2 and 3 each independently have this chance. Old cube names in
 * parentheses; GMS names are the keys.
 * formulas.md §4A §3.4 · https://strategywiki.org/wiki/MapleStory/Potential_System
 */
export const IN_GAME_CUBE_PRIME_RATES = {
	/** Occult / Suspicious Cube */
	mystical: { rare: 0.000999, epic: 0.0099, unique: null, legendary: null },
	/** Master Craftsman's / Yellow Cube */
	hard: { rare: 0.16667, epic: 0.04762, unique: 0.01186, legendary: null },
	/** Meister's / Purple Cube */
	solid: { rare: 0.16667, epic: 0.07999, unique: 0.01696, legendary: 0.001996 }
} as const;

/** Cash cubes: the rate depends on the cube only, and lines 2 and 3 differ. */
export const CASH_CUBE_PRIME_RATES = {
	/** RED Cube */
	glowing: { secondLine: 0.1, thirdLine: 0.01 },
	/** Black Cube */
	bright: { secondLine: 0.2, thirdLine: 0.05 }
} as const;

/** Hexa / Violet Cube — choose 3 of 6 lines. TMS values differ (noted in the research). */
export const HEXA_CUBE_PRIME_RATES = [1, 0.1, 0.01, 0.01, 0.1, 0.01] as const;

/** Equality Cube: all 3 lines guaranteed prime (Rare → Epic only). */
export const EQUALITY_CUBE_ALL_PRIME = true;

/** Resulting odds at Legendary. formulas.md §4A §3.4. */
export const LEGENDARY_PRIME_ODDS = {
	solid: { doublePrimeOrBetter: 0.003988, triplePrime: 0.00000398 },
	glowing: { doublePrimeOrBetter: 0.109, triplePrime: 0.001 },
	bright: { doublePrimeOrBetter: 0.24, triplePrime: 0.01 },
	hexa: { doublePrimeOrBetter: 0.21406, triplePrime: 0.01559 },
	equality: { doublePrimeOrBetter: 1, triplePrime: 1 }
} as const;

/**
 * GMS rank-up rates.
 *
 * ⚠️ UNVERIFIED for the current patch: these figures predate the v239 cube
 * renaming, and MapleStory Wiki notes that v239 also changed tier-up
 * probabilities. Confirm against in-game tooltips before trusting them.
 * formulas.md §4A §3.5 (and its open question #5).
 */
export const UNVERIFIED_GMS_RANK_UP_RATES = {
	mystical: { rareToEpic: 0.01, epicToUnique: null, uniqueToLegendary: null },
	hard: { rareToEpic: 0.118, epicToUnique: 0.038, uniqueToLegendary: null },
	solid: { rareToEpic: 0.141, epicToUnique: 0.06, uniqueToLegendary: 0.024 },
	glowing: { rareToEpic: 0.141, epicToUnique: 0.06, uniqueToLegendary: 0.024 },
	bright: { rareToEpic: 0.16, epicToUnique: 0.11, uniqueToLegendary: 0.047 }
} as const;

/** KMS rank-up rates, for comparison. formulas.md §4A §3.5. */
export const KMS_RANK_UP_RATES = {
	occult: { rareToEpic: 0.0099, epicToUnique: null, uniqueToLegendary: null },
	masterCraftsman: { rareToEpic: 0.04762, epicToUnique: 0.01186, uniqueToLegendary: null },
	meister: { rareToEpic: 0.07999, epicToUnique: 0.01696, uniqueToLegendary: 0.001996 },
	red: { rareToEpic: 0.06, epicToUnique: 0.018, uniqueToLegendary: 0.003 },
	black: { rareToEpic: 0.15, epicToUnique: 0.035, uniqueToLegendary: 0.012 }
} as const;

/**
 * Bonus Potential rank-up and prime rates (KMS-published).
 * ⚠️ GMS rates are stated to be higher; no GMS numbers are published — UNVERIFIED for GMS.
 * Irrelevant for a Heroic-only tracker (bonus potential does not exist in Heroic).
 * formulas.md §4A §3.6.
 */
export const UNVERIFIED_BONUS_POTENTIAL_RATES = {
	rankUp: { rareToEpic: 0.04762, epicToUnique: 0.01961, uniqueToLegendary: 0.006 },
	primeLine: { rare: 0.01961, epic: 0.04762, unique: 0.01961, legendary: 0.004975 },
	legendaryTriplePrime: (1 / 201) ** 2
} as const;

/* -------------------------------------------------------------------------- */
/* Cubes (Heroic prices)                                                       */
/* -------------------------------------------------------------------------- */

/**
 * Current GMS cube inventory. **Heroic (Reboot) worlds buy cash cubes with mesos**,
 * which is the only pricing path this tracker models: Glowing 12,000,000 and
 * Bright 22,000,000. NX prices (Interactive worlds) are deliberately omitted.
 * Bonus-potential cubes are irrelevant here — bonus potential does not exist in Heroic.
 * formulas.md §4A §3.7 · https://maplestorywiki.net/w/Cube
 */
export const CUBES = {
	mystical: { oldName: 'Occult / Suspicious Cube', maxGrade: 'epic', source: 'in-game' },
	hard: { oldName: "Master Craftsman's / Yellow Cube", maxGrade: 'unique', source: 'in-game' },
	solid: { oldName: "Meister's / Purple Cube", maxGrade: 'legendary', source: 'in-game' },
	glowing: {
		oldName: 'RED Cube',
		maxGrade: 'legendary',
		source: 'cash',
		heroicMesoPrice: 12_000_000
	},
	bright: {
		oldName: 'Black Cube',
		maxGrade: 'legendary',
		source: 'cash',
		heroicMesoPrice: 22_000_000,
		note: 'choose before/after'
	}
} as const;

export const HEROIC_CUBE_PRICES = { glowing: 12_000_000, bright: 22_000_000 } as const;

/* -------------------------------------------------------------------------- */
/* "Useful line" templates                                                     */
/* -------------------------------------------------------------------------- */

/**
 * Editorial: which lines count as "useful" per category when generating
 * "3 useful lines at this grade" upgrade candidates.
 *
 * This is a **judgement call, not a sourced game table** — it encodes what a
 * boss-damage-oriented Heroic character wants, derived from the pools in
 * formulas.md §4A §3.3. Change it freely; nothing else depends on the ordering.
 */
export const USEFUL_LINES: Record<PotentialCategory, readonly PotentialLineKind[]> = {
	weapon: ['boss', 'ied', 'att_pct', 'matt_pct', 'stat_pct', 'damage_pct', 'crit_rate'],
	secondary: ['boss', 'ied', 'att_pct', 'matt_pct', 'stat_pct', 'damage_pct'],
	emblem: ['boss', 'ied', 'att_pct', 'matt_pct', 'stat_pct', 'damage_pct'],
	armor: ['stat_pct', 'all_stat_pct', 'cooldown', 'crit_dmg', 'hp_pct'],
	accessory: ['stat_pct', 'all_stat_pct', 'drop', 'meso'],
	heart: ['stat_pct', 'all_stat_pct'],
	badge: ['stat_pct', 'all_stat_pct']
};

/** Items that never receive potential at all. formulas.md §4A §3.1. */
export const NEVER_GETS_POTENTIAL = [
	'medals',
	'badges (except Ghost Ship Exorcist, Sengoku Hakase Badge and Shackles of Resentment)',
	'pocket items',
	'androids (android hearts can)',
	'totems',
	'certain special rings (Dark Angelic Blessing, Adventure Deep Dark Critical Ring, skill rings)'
] as const;

/** Bonus Potential is unobtainable in Heroic/Reboot worlds. formulas.md §4A §3.1. */
export const BONUS_POTENTIAL_AVAILABLE_IN_HEROIC = false;
