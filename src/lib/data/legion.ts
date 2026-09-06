/**
 * Legion / Maple Union — GMS 2026.
 *
 * Transcribed from `docs/research/formulas.md` §4B §2 "Legion / Maple Union".
 * Primary sources cited there:
 *   - https://maplestorywiki.net/w/Legion_System           (GMS localisation, rank + member + grid tables)
 *   - https://strategywiki.org/wiki/MapleStory/Maple_Union (cross-check, piece geometry)
 *   - https://maplestory.nexon.com/Guide/N23GameInformation/Articles/407 (KMS official, agrees on every shared row)
 *   - https://github.com/Xenogents/LegionSolver             (board geometry, independently verified)
 *
 * ⚠️ GMS still runs the classic Tetris grid. KMS replaced it with point
 * allocation in Overdrive (KMS v.1.2.416, 2026-07-04); GMS is expected to follow
 * in late Nov / Dec 2026. This module models the GRID. See OVERDRIVE_NOTE.
 *
 * ⚠️ THE TWO STAT CHANNELS ARE NOT INTERCHANGEABLE (§4, §5.1):
 *   * MEMBER effects give **final** stat  — not multiplied by %stat → `Delta.mainFinal`
 *   * GRID (board) stats give **base** stat — IS multiplied by %stat → `Delta.mainFlat`
 * Getting this backwards silently misvalues every roster decision.
 */

/* -------------------------------------------------------------------------- */
/* Character ranks                                                            */
/* -------------------------------------------------------------------------- */

/** The five character-card ranks. There is nothing above SSS. §1.1. */
export type CharacterRank = 'B' | 'A' | 'S' | 'SS' | 'SSS';

export const CHARACTER_RANK_ORDER = ['B', 'A', 'S', 'SS', 'SSS'] as const;

export interface CharacterRankSpec {
	rank: CharacterRank;
	/** Minimum character level, every class except Zero. */
	minLevel: number;
	/** Minimum character level for Zero, which advances on a different curve. */
	minLevelZero: number;
	/** Board squares the piece occupies. */
	squares: number;
	/** Legion Points the character would grant under the Overdrive model. */
	overdrivePoints: number;
}

/**
 * §1.1. KMS official wording: "캐릭터가 60/100/140/200/250레벨을 달성할 때 마다
 * 캐릭터카드는 B/A/S/SS/SSS 등급으로 상승 (제로의 경우 130/160/180/200/250레벨)".
 *
 * SSS caps at level 250 — levels 251-300 add nothing to the piece, only to
 * Legion Level and Raid Power.
 */
export const CHARACTER_RANKS: readonly CharacterRankSpec[] = [
	{ rank: 'B', minLevel: 60, minLevelZero: 130, squares: 1, overdrivePoints: 1 },
	{ rank: 'A', minLevel: 100, minLevelZero: 160, squares: 2, overdrivePoints: 2 },
	{ rank: 'S', minLevel: 140, minLevelZero: 180, squares: 3, overdrivePoints: 3 },
	{ rank: 'SS', minLevel: 200, minLevelZero: 200, squares: 4, overdrivePoints: 4 },
	{ rank: 'SSS', minLevel: 250, minLevelZero: 250, squares: 5, overdrivePoints: 5 }
] as const;

/**
 * The rank a character of this level holds, or `null` when it is too low to be
 * a Legion attacker at all (below 60, or below 130 for Zero).
 */
export function characterRank(level: number, isZero = false): CharacterRank | null {
	let found: CharacterRank | null = null;
	for (const spec of CHARACTER_RANKS) {
		const gate = isZero ? spec.minLevelZero : spec.minLevel;
		if (level >= gate) found = spec.rank;
	}
	return found;
}

/** Board squares a character's piece occupies, or 0 when it cannot be placed. */
export function rankSquares(rank: CharacterRank): number {
	return CHARACTER_RANKS.find((r) => r.rank === rank)?.squares ?? 0;
}

/**
 * Levels remaining until this character's piece grows, and what it grows to.
 * Returns `null` at SSS — the piece never improves past level 250.
 */
export function nextRankGate(
	level: number,
	isZero = false
): { rank: CharacterRank; atLevel: number; squaresGained: number } | null {
	const current = characterRank(level, isZero);
	const currentSquares = current ? rankSquares(current) : 0;
	for (const spec of CHARACTER_RANKS) {
		const gate = isZero ? spec.minLevelZero : spec.minLevel;
		if (level < gate) {
			return { rank: spec.rank, atLevel: gate, squaresGained: spec.squares - currentSquares };
		}
	}
	return null;
}

/* -------------------------------------------------------------------------- */
/* Legion ranks                                                               */
/* -------------------------------------------------------------------------- */

export type LegionTier = 'Nameless' | 'Renowned' | 'Heroic' | 'Legendary' | 'Supreme';

export interface LegionRankSpec {
	/** e.g. "Legendary Legion III". */
	label: string;
	tier: LegionTier;
	/** 1-5 within the tier. */
	sub: number;
	/** Legion Level needed to reach this rank. */
	legionLevel: number;
	/** Attacker slots available. */
	members: number;
	/** Board width × height, when this rank unlocks a new size. */
	board?: { width: number; height: number };
	/** Squares available in EACH of the 8 outer stat areas at this rank. */
	outerPerArea: number;
}

/**
 * All 25 ranks. §3. GMS names from maplestorywiki (GMS localisation); the KMS
 * official guide's table (슈프림 12500→45 … 노비스 500→9) is identical.
 *
 * Board size stops growing at Heroic II / Legion Level 6,000. Everything past
 * 6,000 buys more ATTACKERS, not more board.
 */
export const LEGION_RANKS: readonly LegionRankSpec[] = [
	{
		label: 'Nameless Legion I',
		tier: 'Nameless',
		sub: 1,
		legionLevel: 500,
		members: 9,
		board: { width: 12, height: 10 },
		outerPerArea: 0
	},
	{
		label: 'Nameless Legion II',
		tier: 'Nameless',
		sub: 2,
		legionLevel: 1_000,
		members: 10,
		outerPerArea: 0
	},
	{
		label: 'Nameless Legion III',
		tier: 'Nameless',
		sub: 3,
		legionLevel: 1_500,
		members: 11,
		outerPerArea: 0
	},
	{
		label: 'Nameless Legion IV',
		tier: 'Nameless',
		sub: 4,
		legionLevel: 2_000,
		members: 12,
		board: { width: 14, height: 12 },
		outerPerArea: 6
	},
	{
		label: 'Nameless Legion V',
		tier: 'Nameless',
		sub: 5,
		legionLevel: 2_500,
		members: 13,
		outerPerArea: 6
	},
	{
		label: 'Renowned Legion I',
		tier: 'Renowned',
		sub: 1,
		legionLevel: 3_000,
		members: 18,
		board: { width: 16, height: 14 },
		outerPerArea: 13
	},
	{
		label: 'Renowned Legion II',
		tier: 'Renowned',
		sub: 2,
		legionLevel: 3_500,
		members: 19,
		outerPerArea: 13
	},
	{
		label: 'Renowned Legion III',
		tier: 'Renowned',
		sub: 3,
		legionLevel: 4_000,
		members: 20,
		board: { width: 18, height: 16 },
		outerPerArea: 21
	},
	{
		label: 'Renowned Legion IV',
		tier: 'Renowned',
		sub: 4,
		legionLevel: 4_500,
		members: 21,
		outerPerArea: 21
	},
	{
		label: 'Renowned Legion V',
		tier: 'Renowned',
		sub: 5,
		legionLevel: 5_000,
		members: 22,
		board: { width: 20, height: 18 },
		outerPerArea: 30
	},
	{
		label: 'Heroic Legion I',
		tier: 'Heroic',
		sub: 1,
		legionLevel: 5_500,
		members: 27,
		outerPerArea: 30
	},
	{
		label: 'Heroic Legion II',
		tier: 'Heroic',
		sub: 2,
		legionLevel: 6_000,
		members: 28,
		board: { width: 22, height: 20 },
		outerPerArea: 40
	},
	{
		label: 'Heroic Legion III',
		tier: 'Heroic',
		sub: 3,
		legionLevel: 6_500,
		members: 29,
		outerPerArea: 40
	},
	{
		label: 'Heroic Legion IV',
		tier: 'Heroic',
		sub: 4,
		legionLevel: 7_000,
		members: 30,
		outerPerArea: 40
	},
	{
		label: 'Heroic Legion V',
		tier: 'Heroic',
		sub: 5,
		legionLevel: 7_500,
		members: 31,
		outerPerArea: 40
	},
	{
		label: 'Legendary Legion I',
		tier: 'Legendary',
		sub: 1,
		legionLevel: 8_000,
		members: 36,
		outerPerArea: 40
	},
	{
		label: 'Legendary Legion II',
		tier: 'Legendary',
		sub: 2,
		legionLevel: 8_500,
		members: 37,
		outerPerArea: 40
	},
	{
		label: 'Legendary Legion III',
		tier: 'Legendary',
		sub: 3,
		legionLevel: 9_000,
		members: 38,
		outerPerArea: 40
	},
	{
		label: 'Legendary Legion IV',
		tier: 'Legendary',
		sub: 4,
		legionLevel: 9_500,
		members: 39,
		outerPerArea: 40
	},
	{
		label: 'Legendary Legion V',
		tier: 'Legendary',
		sub: 5,
		legionLevel: 10_000,
		members: 40,
		outerPerArea: 40
	},
	{
		label: 'Supreme Legion I',
		tier: 'Supreme',
		sub: 1,
		legionLevel: 10_500,
		members: 41,
		outerPerArea: 40
	},
	{
		label: 'Supreme Legion II',
		tier: 'Supreme',
		sub: 2,
		legionLevel: 11_000,
		members: 42,
		outerPerArea: 40
	},
	{
		label: 'Supreme Legion III',
		tier: 'Supreme',
		sub: 3,
		legionLevel: 11_500,
		members: 43,
		outerPerArea: 40
	},
	{
		label: 'Supreme Legion IV',
		tier: 'Supreme',
		sub: 4,
		legionLevel: 12_000,
		members: 44,
		outerPerArea: 40
	},
	{
		label: 'Supreme Legion V',
		tier: 'Supreme',
		sub: 5,
		legionLevel: 12_500,
		members: 45,
		outerPerArea: 40
	}
] as const;

/** Legion Level below this founds nothing — there is no rank at all. §3. */
export const LEGION_MIN_LEVEL = 500;

/** Attacker slots at the highest rank. §3. */
export const LEGION_MAX_MEMBERS = 45;

/**
 * Legion Level is the sum of the highest-level 42 eligible characters. With the
 * level cap at 300 that makes 12,600 the theoretical maximum — 100 past the
 * 12,500 needed for Supreme V, so the last stretch buys only Raid Power. §3.4.
 */
export const LEGION_LEVEL_CONTRIBUTORS = 42;
export const LEGION_LEVEL_MAX = 12_600;

/** The rank held at a Legion Level, or `null` below 500. */
export function legionRankAt(legionLevel: number): LegionRankSpec | null {
	let found: LegionRankSpec | null = null;
	for (const rank of LEGION_RANKS) {
		if (legionLevel >= rank.legionLevel) found = rank;
	}
	return found;
}

/** The next rank up, or `null` at Supreme V. */
export function nextLegionRank(legionLevel: number): LegionRankSpec | null {
	return LEGION_RANKS.find((r) => legionLevel < r.legionLevel) ?? null;
}

/** Attacker slots at a Legion Level. */
export function legionMembersAt(legionLevel: number): number {
	return legionRankAt(legionLevel)?.members ?? 0;
}

/** Squares available in each outer stat area at a Legion Level. */
export function outerSquaresAt(legionLevel: number): number {
	return legionRankAt(legionLevel)?.outerPerArea ?? 0;
}

/** The board dimensions at a Legion Level, carried forward from the last unlock. */
export function boardSizeAt(legionLevel: number): { width: number; height: number } | null {
	let size: { width: number; height: number } | null = null;
	for (const rank of LEGION_RANKS) {
		if (legionLevel >= rank.legionLevel && rank.board) size = rank.board;
	}
	return size;
}

/**
 * §3.1 — a common misconception, encoded so nobody re-adds it. A Legion Rank
 * grants MORE ATTACKERS, a LARGER BOARD and a higher unclaimed coin cap. It
 * grants no direct stat. Every stat comes from member effects or board area.
 */
export const LEGION_RANK_GRANTS_NO_STATS = true;

/** §3.2 — rank-ups became free in Crown (GMS v.269, 2026-06-17). */
export const LEGION_RANKUP_COST_MESOS = 0;
export const LEGION_RANKUP_COST_COINS = 0;

/* -------------------------------------------------------------------------- */
/* Board areas                                                                */
/* -------------------------------------------------------------------------- */

export type LegionInnerArea = 'str' | 'dex' | 'int' | 'luk' | 'maxHp' | 'maxMp' | 'att' | 'matt';

export type LegionOuterArea =
	| 'statusResistance'
	| 'expObtained'
	| 'criticalRate'
	| 'bossDamage'
	| 'normalDamage'
	| 'buffDuration'
	| 'ignoreDefense'
	| 'criticalDamage';

export type LegionAreaKey = LegionInnerArea | LegionOuterArea;

export interface LegionAreaSpec {
	key: LegionAreaKey;
	label: string;
	ring: 'inner' | 'outer';
	/** Value gained per filled square. */
	perSquare: number;
	unit: 'flat' | 'percent';
	/**
	 * Squares in this area at the LARGEST board. Inner areas are always 15 and
	 * are granted in full on founding; outer areas grow 0→40 with Legion Rank.
	 */
	maxSquares: number;
	note?: string;
}

/**
 * Inner grid: 12×10 = 120 squares, 8 areas × 15. Granted in full immediately on
 * founding a Legion; the 8 areas can be REARRANGED by the player. §5.1.
 *
 * These stats ARE affected by % stat bonuses — "These stat bonuses are not final
 * stat bonuses, meaning that they are affected by % stat bonuses."
 * (maplestorywiki.net/w/Legion_System)
 */
export const INNER_AREAS: Record<LegionInnerArea, LegionAreaSpec> = {
	str: {
		key: 'str',
		label: 'STR',
		ring: 'inner',
		perSquare: 5,
		unit: 'flat',
		maxSquares: 15,
		note: 'base stat — IS multiplied by %STR / %All Stat'
	},
	dex: {
		key: 'dex',
		label: 'DEX',
		ring: 'inner',
		perSquare: 5,
		unit: 'flat',
		maxSquares: 15,
		note: 'base stat — IS multiplied by %DEX / %All Stat'
	},
	int: {
		key: 'int',
		label: 'INT',
		ring: 'inner',
		perSquare: 5,
		unit: 'flat',
		maxSquares: 15,
		note: 'base stat — IS multiplied by %INT / %All Stat'
	},
	luk: {
		key: 'luk',
		label: 'LUK',
		ring: 'inner',
		perSquare: 5,
		unit: 'flat',
		maxSquares: 15,
		note: 'base stat — IS multiplied by %LUK / %All Stat'
	},
	maxHp: {
		key: 'maxHp',
		label: 'Max HP',
		ring: 'inner',
		perSquare: 250,
		unit: 'flat',
		maxSquares: 15
	},
	maxMp: {
		key: 'maxMp',
		label: 'Max MP',
		ring: 'inner',
		perSquare: 250,
		unit: 'flat',
		maxSquares: 15
	},
	att: {
		key: 'att',
		label: 'Weapon ATT',
		ring: 'inner',
		perSquare: 1,
		unit: 'flat',
		maxSquares: 15
	},
	matt: {
		key: 'matt',
		label: 'Magic ATT',
		ring: 'inner',
		perSquare: 1,
		unit: 'flat',
		maxSquares: 15
	}
};

/**
 * Outer grid: 8 areas × 40 squares at the full 22×20 board. Positions CANNOT be
 * rearranged. §5.2 — maplestorywiki and StrategyWiki carry identical values.
 *
 * ⚠️ There is no "Stance" area and no plain "Damage" area on the current board;
 * AyumiLove's guide lists both and is stale. §5.2 flags this explicitly.
 */
export const OUTER_AREAS: Record<LegionOuterArea, LegionAreaSpec> = {
	statusResistance: {
		key: 'statusResistance',
		label: 'Abnormal Status Resistance',
		ring: 'outer',
		perSquare: 1,
		unit: 'flat',
		maxSquares: 40
	},
	expObtained: {
		key: 'expObtained',
		label: 'Monster EXP',
		ring: 'outer',
		perSquare: 0.25,
		unit: 'percent',
		maxSquares: 40
	},
	criticalRate: {
		key: 'criticalRate',
		label: 'Critical Rate',
		ring: 'outer',
		perSquare: 1,
		unit: 'percent',
		maxSquares: 40
	},
	bossDamage: {
		key: 'bossDamage',
		label: 'Boss Damage',
		ring: 'outer',
		perSquare: 1,
		unit: 'percent',
		maxSquares: 40
	},
	normalDamage: {
		key: 'normalDamage',
		label: 'Damage Against Normal Monsters',
		ring: 'outer',
		perSquare: 1,
		unit: 'percent',
		maxSquares: 40
	},
	buffDuration: {
		key: 'buffDuration',
		label: 'Buff Duration',
		ring: 'outer',
		perSquare: 1,
		unit: 'percent',
		maxSquares: 40
	},
	ignoreDefense: {
		key: 'ignoreDefense',
		label: 'Ignored Enemy Defense',
		ring: 'outer',
		perSquare: 1,
		unit: 'percent',
		maxSquares: 40
	},
	criticalDamage: {
		key: 'criticalDamage',
		label: 'Critical Damage',
		ring: 'outer',
		perSquare: 0.5,
		unit: 'percent',
		maxSquares: 40
	}
};

export const LEGION_AREAS: Record<LegionAreaKey, LegionAreaSpec> = {
	...INNER_AREAS,
	...OUTER_AREAS
};

export const LEGION_AREA_KEYS = Object.keys(LEGION_AREAS) as LegionAreaKey[];

/** Squares available in one area at a Legion Level. Inner is always 15. */
export function areaCapacity(key: LegionAreaKey, legionLevel: number): number {
	const spec = LEGION_AREAS[key];
	if (!spec) throw new Error(`Unknown Legion board area "${key}".`);
	return spec.ring === 'inner' ? spec.maxSquares : outerSquaresAt(legionLevel);
}

/**
 * Value an area gives for `squares` filled, clamped to what the board actually
 * offers at `legionLevel`. Percentages are whole percents (`40` = 40%).
 */
export function areaValue(key: LegionAreaKey, squares: number, legionLevel: number): number {
	if (squares < 0) throw new Error(`Square count must be >= 0 (got ${squares}).`);
	const spec = LEGION_AREAS[key];
	if (!spec) throw new Error(`Unknown Legion board area "${key}".`);
	return Math.min(squares, areaCapacity(key, legionLevel)) * spec.perSquare;
}

/* -------------------------------------------------------------------------- */
/* Board coverage budget                                                      */
/* -------------------------------------------------------------------------- */

/** Event Legion Blocks a GMS player may place; they do NOT consume attacker slots. §1.3. */
export const EVENT_BLOCK_MAX = 2;

/** GMS event blocks are SSS-shaped (5 squares) and give ATT & MATT +35 each. §1.3. */
export const EVENT_BLOCK_SQUARES = 5;
export const EVENT_BLOCK_ATTACK = 35;

/**
 * Board squares available at a Legion Level, assuming every attacker is at the
 * given rank plus the two GMS event blocks.
 *
 * ⚠️ DERIVED, not cited — `members × squares + blocks`. §2.1 marks the max-coverage
 * figure as computed rather than quoted. It also ignores the CONNECTIVITY TAX:
 * pieces must chain back to the 4 centre squares, so reaching an outer area
 * costs squares spent traversing the inner grid. Community estimate for maxing
 * Boss + Crit Damage + IED together is ~132 squares (120 outer + ~12 of path).
 * Exact packing needs a solver — https://xenogents.github.io/LegionSolver/
 */
export function coverageBudget(
	legionLevel: number,
	rank: CharacterRank = 'SSS',
	eventBlocks = EVENT_BLOCK_MAX
): number {
	const members = legionMembersAt(legionLevel);
	const blocks = Math.min(eventBlocks, EVENT_BLOCK_MAX);
	return members * rankSquares(rank) + blocks * EVENT_BLOCK_SQUARES;
}

/**
 * §2.1 / §5.3 — community estimate of the squares needed to max Boss Damage,
 * Critical Damage and IED at once, path included. Not an exact figure.
 * https://forums.maplestory.nexon.net/discussion/18849
 */
export const UNVERIFIED_TRIPLE_MAX_SQUARES = 132;

/* -------------------------------------------------------------------------- */
/* Member effects                                                             */
/* -------------------------------------------------------------------------- */

/**
 * What a placed attacker grants. Keys are deliberately narrower than the board
 * areas: a member effect and a board area that both say "Critical Rate" are
 * genuinely the same stat, but member STR and board STR are NOT — see
 * `MemberEffectSpec.finalStat`.
 */
export type MemberEffectStat =
	| 'str'
	| 'dex'
	| 'int'
	| 'luk'
	| 'allStat'
	| 'maxHpFlat'
	| 'maxHpPercent'
	| 'maxMpPercent'
	| 'criticalRate'
	| 'criticalDamage'
	| 'bossDamage'
	| 'ignoreDefense'
	| 'abnormalStatusDamage'
	| 'statusResistance'
	| 'buffDuration'
	| 'summonDuration'
	| 'cooldownReduction'
	| 'mesosObtained'
	| 'expObtained'
	| 'moveSpeed'
	| 'hpRecoveryOnHit'
	| 'mpRecoveryOnHit'
	| 'chanceDamage';

export interface MemberEffectSpec {
	/** `classId` from src/lib/data/classes.ts. */
	classId: string;
	stat: MemberEffectStat;
	label: string;
	/** Value at B / A / S / SS / SSS, in that order. */
	values: readonly [number, number, number, number, number];
	unit: 'flat' | 'percent';
	/**
	 * True for STR/DEX/INT/LUK/All Stat effects, which are **final** stat and are
	 * therefore NOT multiplied by %stat — `Delta.mainFinal`, never `mainFlat`.
	 * "The stat bonuses (STR, DEX, INT, and LUK) are final stat bonuses and are
	 * therefore not affected by % stat bonuses." — maplestorywiki.net/w/Legion_System
	 */
	finalStat?: boolean;
	/** True when the effect is a proc / conditional and cannot be taken at face value. */
	conditional?: boolean;
	note?: string;
}

const STAT_LADDER = [10, 20, 40, 80, 100] as const;
const PCT_LADDER = [1, 2, 3, 5, 6] as const;

/**
 * Every GMS job's Legion member effect. §4.1-§4.6.
 *
 * Rules the consumer must apply (§4):
 *   * Each job's effect applies ONCE. Two Bishops give one Bishop effect (the
 *     higher rank). Different jobs granting the same stat DO stack.
 *   * Effects apply account-wide within the world, but only while the character
 *     is PLACED on the board. (Overdrive changes this — see OVERDRIVE_NOTE.)
 *
 * Note the 1 / 2 / 3 / 5 / 6 ladder on the percent effects — SS is 5, not 4.
 * That irregularity is in every source and is not a typo.
 */
export const LEGION_MEMBER_EFFECTS: Record<string, MemberEffectSpec> = {
	/* --- §4.1 Explorers --- */
	hero: {
		classId: 'hero',
		stat: 'str',
		label: 'Final STR',
		values: STAT_LADDER,
		unit: 'flat',
		finalStat: true
	},
	paladin: {
		classId: 'paladin',
		stat: 'str',
		label: 'Final STR',
		values: STAT_LADDER,
		unit: 'flat',
		finalStat: true
	},
	'dark-knight': {
		classId: 'dark-knight',
		stat: 'maxHpPercent',
		label: 'Max HP %',
		values: [2, 3, 4, 5, 6],
		unit: 'percent'
	},
	'arch-mage-fp': {
		classId: 'arch-mage-fp',
		stat: 'maxMpPercent',
		label: 'Max MP %',
		values: [2, 3, 4, 5, 6],
		unit: 'percent'
	},
	'arch-mage-il': {
		classId: 'arch-mage-il',
		stat: 'int',
		label: 'Final INT',
		values: STAT_LADDER,
		unit: 'flat',
		finalStat: true
	},
	bishop: {
		classId: 'bishop',
		stat: 'int',
		label: 'Final INT',
		values: STAT_LADDER,
		unit: 'flat',
		finalStat: true
	},
	'bow-master': {
		classId: 'bow-master',
		stat: 'dex',
		label: 'Final DEX',
		values: STAT_LADDER,
		unit: 'flat',
		finalStat: true
	},
	marksman: {
		classId: 'marksman',
		stat: 'criticalRate',
		label: 'Critical Rate',
		values: [1, 2, 3, 4, 5],
		unit: 'percent'
	},
	pathfinder: {
		classId: 'pathfinder',
		stat: 'dex',
		label: 'Final DEX',
		values: STAT_LADDER,
		unit: 'flat',
		finalStat: true
	},
	'night-lord': {
		classId: 'night-lord',
		stat: 'criticalRate',
		label: 'Critical Rate',
		values: [1, 2, 3, 4, 5],
		unit: 'percent'
	},
	shadower: {
		classId: 'shadower',
		stat: 'luk',
		label: 'Final LUK',
		values: STAT_LADDER,
		unit: 'flat',
		finalStat: true
	},
	'dual-blade': {
		classId: 'dual-blade',
		stat: 'luk',
		label: 'Final LUK',
		values: STAT_LADDER,
		unit: 'flat',
		finalStat: true
	},
	buccaneer: {
		classId: 'buccaneer',
		stat: 'str',
		label: 'Final STR',
		values: STAT_LADDER,
		unit: 'flat',
		finalStat: true
	},
	corsair: {
		classId: 'corsair',
		stat: 'summonDuration',
		label: 'Summon Duration',
		values: [4, 6, 8, 10, 12],
		unit: 'percent'
	},
	cannoneer: {
		classId: 'cannoneer',
		stat: 'str',
		label: 'Final STR',
		values: STAT_LADDER,
		unit: 'flat',
		finalStat: true
	},

	/* --- §4.2 Cygnus Knights --- */
	'dawn-warrior': {
		classId: 'dawn-warrior',
		stat: 'maxHpFlat',
		label: 'Max HP',
		values: [250, 500, 1000, 2000, 2500],
		unit: 'flat'
	},
	mihile: {
		classId: 'mihile',
		stat: 'maxHpFlat',
		label: 'Max HP',
		values: [250, 500, 1000, 2000, 2500],
		unit: 'flat'
	},
	'blaze-wizard': {
		classId: 'blaze-wizard',
		stat: 'int',
		label: 'Final INT',
		values: STAT_LADDER,
		unit: 'flat',
		finalStat: true
	},
	'wind-archer': {
		classId: 'wind-archer',
		stat: 'dex',
		label: 'Final DEX',
		values: STAT_LADDER,
		unit: 'flat',
		finalStat: true
	},
	'night-walker': {
		classId: 'night-walker',
		stat: 'luk',
		label: 'Final LUK',
		values: STAT_LADDER,
		unit: 'flat',
		finalStat: true
	},
	'thunder-breaker': {
		classId: 'thunder-breaker',
		stat: 'str',
		label: 'Final STR',
		values: STAT_LADDER,
		unit: 'flat',
		finalStat: true
	},

	/* --- §4.3 Heroes --- */
	aran: {
		classId: 'aran',
		stat: 'hpRecoveryOnHit',
		label: '70% chance to recover % Max HP on attack',
		values: [2, 4, 6, 8, 10],
		unit: 'percent',
		conditional: true
	},
	evan: {
		classId: 'evan',
		stat: 'mpRecoveryOnHit',
		label: '70% chance to recover % Max MP on attack',
		values: [2, 4, 6, 8, 10],
		unit: 'percent',
		conditional: true
	},
	luminous: {
		classId: 'luminous',
		stat: 'int',
		label: 'Final INT',
		values: STAT_LADDER,
		unit: 'flat',
		finalStat: true
	},
	mercedes: {
		classId: 'mercedes',
		stat: 'cooldownReduction',
		label: 'Skill Cooldown reduction',
		values: [-2, -3, -4, -5, -6],
		unit: 'percent',
		note: 'takes priority over equipment potential; cooldown cannot go below 1s; does not apply to certain skills'
	},
	phantom: {
		classId: 'phantom',
		stat: 'mesosObtained',
		label: 'Mesos Obtained',
		values: [1, 2, 3, 4, 5],
		unit: 'percent'
	},
	shade: {
		classId: 'shade',
		stat: 'criticalDamage',
		label: 'Critical Damage',
		values: PCT_LADDER,
		unit: 'percent'
	},

	/* --- §4.4 Resistance / Demon --- */
	blaster: {
		classId: 'blaster',
		stat: 'ignoreDefense',
		label: 'Ignored Enemy Defense',
		values: PCT_LADDER,
		unit: 'percent'
	},
	'battle-mage': {
		classId: 'battle-mage',
		stat: 'int',
		label: 'Final INT',
		values: STAT_LADDER,
		unit: 'flat',
		finalStat: true
	},
	'wild-hunter': {
		classId: 'wild-hunter',
		stat: 'chanceDamage',
		label: '20% chance on attack to deal extra damage',
		values: [4, 8, 12, 16, 20],
		unit: 'percent',
		conditional: true,
		note: '20% proc — expected value is one fifth of the listed number, and only on the procking hit'
	},
	mechanic: {
		classId: 'mechanic',
		stat: 'buffDuration',
		label: 'Buff Duration',
		values: [5, 10, 15, 20, 25],
		unit: 'percent'
	},
	xenon: {
		classId: 'xenon',
		stat: 'allStat',
		label: 'Final STR, DEX and LUK',
		values: [5, 10, 20, 40, 50],
		unit: 'flat',
		finalStat: true,
		note: 'grants all three of STR/DEX/LUK at this value — not "all stat" in the %All Stat sense'
	},
	'demon-slayer': {
		classId: 'demon-slayer',
		stat: 'statusResistance',
		label: 'Abnormal Status Resistance',
		values: [1, 2, 3, 4, 5],
		unit: 'flat'
	},
	'demon-avenger': {
		classId: 'demon-avenger',
		stat: 'bossDamage',
		label: 'Boss Damage',
		values: PCT_LADDER,
		unit: 'percent'
	},

	/* --- §4.5 Nova --- */
	kaiser: {
		classId: 'kaiser',
		stat: 'str',
		label: 'Final STR',
		values: STAT_LADDER,
		unit: 'flat',
		finalStat: true
	},
	kain: {
		classId: 'kain',
		stat: 'dex',
		label: 'Final DEX',
		values: STAT_LADDER,
		unit: 'flat',
		finalStat: true
	},
	cadena: {
		classId: 'cadena',
		stat: 'luk',
		label: 'Final LUK',
		values: STAT_LADDER,
		unit: 'flat',
		finalStat: true
	},
	'angelic-buster': {
		classId: 'angelic-buster',
		stat: 'dex',
		label: 'Final DEX',
		values: STAT_LADDER,
		unit: 'flat',
		finalStat: true
	},

	/* --- §4.6 Transcendent / Friends World / Flora / Anima / Sengoku / Jianghu / Shine --- */
	zero: {
		classId: 'zero',
		stat: 'expObtained',
		label: 'EXP Obtained',
		values: [4, 6, 8, 10, 12],
		unit: 'percent'
	},
	kinesis: {
		classId: 'kinesis',
		stat: 'int',
		label: 'Final INT',
		values: STAT_LADDER,
		unit: 'flat',
		finalStat: true
	},
	adele: {
		classId: 'adele',
		stat: 'str',
		label: 'Final STR',
		values: STAT_LADDER,
		unit: 'flat',
		finalStat: true
	},
	illium: {
		classId: 'illium',
		stat: 'int',
		label: 'Final INT',
		values: STAT_LADDER,
		unit: 'flat',
		finalStat: true
	},
	khali: {
		classId: 'khali',
		stat: 'luk',
		label: 'Final LUK',
		values: STAT_LADDER,
		unit: 'flat',
		finalStat: true
	},
	ark: {
		classId: 'ark',
		stat: 'str',
		label: 'Final STR',
		values: STAT_LADDER,
		unit: 'flat',
		finalStat: true
	},
	lara: {
		classId: 'lara',
		stat: 'int',
		label: 'Final INT',
		values: STAT_LADDER,
		unit: 'flat',
		finalStat: true
	},
	hoyoung: {
		classId: 'hoyoung',
		stat: 'luk',
		label: 'Final LUK',
		values: STAT_LADDER,
		unit: 'flat',
		finalStat: true
	},
	ren: {
		classId: 'ren',
		stat: 'moveSpeed',
		label: 'Movement Speed and Max Move Speed',
		values: [2, 4, 6, 8, 10],
		unit: 'percent'
	},
	hayato: {
		classId: 'hayato',
		stat: 'criticalDamage',
		label: 'Critical Damage',
		values: PCT_LADDER,
		unit: 'percent'
	},
	kanna: {
		classId: 'kanna',
		stat: 'bossDamage',
		label: 'Boss Damage',
		values: PCT_LADDER,
		unit: 'percent'
	},
	lynn: {
		classId: 'lynn',
		stat: 'ignoreDefense',
		label: 'Ignored Enemy Defense',
		values: PCT_LADDER,
		unit: 'percent'
	},
	'mo-xuan': {
		classId: 'mo-xuan',
		stat: 'criticalDamage',
		label: 'Critical Damage',
		values: PCT_LADDER,
		unit: 'percent'
	},
	'sia-astelle': {
		classId: 'sia-astelle',
		stat: 'abnormalStatusDamage',
		label: 'Abnormal Status Damage',
		values: PCT_LADDER,
		unit: 'percent'
	},
	'erel-light': {
		classId: 'erel-light',
		stat: 'bossDamage',
		label: 'Boss Damage',
		values: PCT_LADDER,
		unit: 'percent'
	}
};

export const LEGION_MEMBER_CLASS_IDS = Object.keys(LEGION_MEMBER_EFFECTS);

/**
 * §4.10 — 53 GMS jobs carry a Legion effect but only 45 attacker slots exist,
 * so even at Supreme V you cannot place every job. A roster is a CHOICE.
 */
export const LEGION_JOBS_WITH_EFFECTS = LEGION_MEMBER_CLASS_IDS.length;

/** The value one placed attacker of this class and rank grants. */
export function memberEffectValue(classId: string, rank: CharacterRank): number {
	const spec = LEGION_MEMBER_EFFECTS[classId];
	if (!spec) throw new Error(`No Legion member effect for class "${classId}".`);
	return spec.values[CHARACTER_RANK_ORDER.indexOf(rank)];
}

/** Like {@link memberEffectValue} but returns `undefined` for an unknown class. */
export function tryMemberEffectValue(classId: string, rank: CharacterRank): number | undefined {
	const spec = LEGION_MEMBER_EFFECTS[classId];
	return spec?.values[CHARACTER_RANK_ORDER.indexOf(rank)];
}

/** One entry in a Legion roster. */
export interface LegionMember {
	classId: string;
	level: number;
}

/**
 * Total member-effect contribution of a roster, per stat.
 *
 * Implements §4's dedupe rule: **one effect per job, higher rank wins**. Classes
 * without a known Legion effect and characters below the rank-B gate are dropped
 * and reported in `ignored`.
 */
export function rosterEffects(members: readonly LegionMember[]): {
	totals: Partial<Record<MemberEffectStat, number>>;
	/** The rank actually counted for each job, after dedupe. */
	counted: { classId: string; rank: CharacterRank; stat: MemberEffectStat; value: number }[];
	ignored: { classId: string; level: number; reason: string }[];
} {
	const best = new Map<string, CharacterRank>();
	const ignored: { classId: string; level: number; reason: string }[] = [];

	for (const member of members) {
		const spec = LEGION_MEMBER_EFFECTS[member.classId];
		if (!spec) {
			ignored.push({ ...member, reason: 'no Legion member effect for this class' });
			continue;
		}
		const rank = characterRank(member.level, member.classId === 'zero');
		if (!rank) {
			ignored.push({ ...member, reason: 'below the rank-B level gate' });
			continue;
		}
		const current = best.get(member.classId);
		if (current === undefined) {
			best.set(member.classId, rank);
		} else {
			// Duplicate job: keep the higher rank, report the loser.
			const keep =
				CHARACTER_RANK_ORDER.indexOf(rank) > CHARACTER_RANK_ORDER.indexOf(current) ? rank : current;
			best.set(member.classId, keep);
			ignored.push({
				...member,
				reason: `duplicate job — only the highest-ranked ${member.classId} counts`
			});
		}
	}

	const totals: Partial<Record<MemberEffectStat, number>> = {};
	const counted: { classId: string; rank: CharacterRank; stat: MemberEffectStat; value: number }[] =
		[];

	for (const [classId, rank] of best) {
		const spec = LEGION_MEMBER_EFFECTS[classId];
		const value = memberEffectValue(classId, rank);
		totals[spec.stat] = (totals[spec.stat] ?? 0) + value;
		counted.push({ classId, rank, stat: spec.stat, value });
	}

	counted.sort((a, b) => a.classId.localeCompare(b.classId));
	return { totals, counted, ignored };
}

/* -------------------------------------------------------------------------- */
/* Forward compatibility                                                      */
/* -------------------------------------------------------------------------- */

/**
 * §7 — KMS replaced the grid with point allocation in Overdrive (v.1.2.416,
 * 2026-07-04): raid map removed, ALL rank-B-and-above characters grant their
 * effects whether placed or not, 10 named presets. GMS is expected to follow in
 * late Nov / Dec 2026, but that date is sourced only from a third-party
 * aggregator and is **UNVERIFIED** against an official Nexon roadmap post.
 *
 * When it lands, `CHARACTER_RANKS[].overdrivePoints` becomes the currency and
 * `INNER_AREAS`/`OUTER_AREAS` are replaced wholesale. Nothing else in this
 * module survives unchanged, so treat it as a rewrite rather than a migration.
 */
export const OVERDRIVE_NOTE =
	'GMS runs the Tetris grid as of 2026-09-06. KMS Overdrive (2026-07-04) replaced it ' +
	'with point allocation; GMS is expected to follow in late Nov / Dec 2026 (UNVERIFIED).';

export const OVERDRIVE_LIVE_IN_GMS = false;
