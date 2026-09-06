/**
 * Potential LINE POOLS — GMS, per slot, per rank.
 *
 * `potential.ts` answers "what is a Legendary %STR line worth on this item?".
 * This module answers the much harder question the ranker actually needs:
 * **"how many cubes does it take to roll the three lines I want?"**
 *
 * That cost is NOT `1 / triplePrime`. `triplePrime` is the chance that all three
 * lines are *prime* (any prime line). The chance of three *specific* lines is
 * `triplePrime` divided by the size of the line pool, three times over — which is
 * three to six orders of magnitude smaller. Worked examples are in
 * `docs/research/potential-lines.md`.
 *
 * ## The pools are PER SLOT
 *
 * `potential.ts` keys "useful lines" by category (weapon / armor / accessory / …).
 * That is structurally too coarse: **hats roll Skill Cooldown, gloves roll
 * Critical Damage, and neither rolls the other** even though both are "armor".
 * Emblems cannot roll Boss Damage at all even though weapons and secondaries can.
 * Every table below is therefore keyed by the wiki's slot *group*.
 *
 * ## Provenance
 *
 * Every line, value and probability in `POTENTIAL_LINE_POOLS` is transcribed from
 * the "Potentials List" section of
 *   <https://strategywiki.org/wiki/MapleStory/Potential_System>
 * (Wayback snapshot 2026-07-08:
 *   <https://web.archive.org/web/20260708180530/https://strategywiki.org/wiki/MapleStory/Potential_System>
 * — the live site 403s automated fetches). That page is the only public source
 * that publishes the **full per-slot, per-rank** line list *with GMS-specific
 * values*: it carries an explicit `(GMS) 151+` row on the lines that get the GMS
 * level-151 bump, which is exactly the breakpoint `potential.ts` already models.
 *
 * Structure of the source: `<Slot>` → one of five rank sections → per line, a
 * `Equip level | Stat value` table and an `Item Level | Initial | In-game cube |
 * Cash cube` table. Both tables are reproduced verbatim below; the extraction was
 * validated by checking that **every one of the 60 (slot × rank) pools sums to
 * 100.0000% in all three probability columns** (see `potential-lines.spec.ts`).
 *
 * ## Reconciliation against the reference calculator
 *
 * The probability engine below is checked against MathBro's Cubing Calculator
 * (<https://brendonmay.github.io/cubingCalculator/>), whose rate tables are
 * scraped from Nexon KR's own disclosure pages. Run on the **same pool data**
 * (`poolVariant: 'kms'`), the two agree to **five significant figures** on all 13
 * reconciliation cases in `potential-lines.spec.ts` — across weapon, hat, gloves
 * and accessory, two item levels, both cash cubes, and stat / %ATT / boss /
 * crit-damage targets. That pins the mixing of prime and non-prime pools, the
 * cap re-normalisation, the value tables and the target semantics.
 *
 * On the **default** (`'gms'`) pool data, weapon-group answers are identical and
 * armour/accessory answers are ~1.34× more pessimistic. That entire gap is one
 * disputed line — see `UNVERIFIED_HIGH_RANK_DEF_PERCENT_LINE` below. The other
 * known GMS/KMS wording difference (GMS "Weapon ATT +1 per 10 character levels"
 * vs the KMS page's flat "+32 ATT") occupies the same pool slot and does not
 * change any probability.
 *
 * ## Version context — the GMS v239 cube rework
 *
 * v239 renamed every cube (RED → Glowing, Black → Bright, Meister's → Solid, …)
 * and, per MapleStory Wiki, also changed **tier-up** probabilities. It did **not**
 * change line pools: no potential line was added or removed in GMS v264-v271
 * (`formulas.md` §4A §3). So:
 *   - the pools and per-line probabilities here are **current**;
 *   - the **prime-line** rates here (10%/1% Glowing, 20%/5% Bright) are the
 *     pre-v239 published figures and are what every public calculator still uses;
 *   - **rank-up** rates are deliberately NOT re-exported here — use
 *     `UNVERIFIED_GMS_RANK_UP_RATES` in `potential.ts` and treat them as suspect.
 *
 * ## World scope
 *
 * ## Asking for the right thing
 *
 * Use `mainStatPercent(stat, total)` for "N %+ stat" and `attackPercent(total)`
 * for "N %+ ATT" — they encode what those phrases mean everywhere else (All Stat
 * lines count toward a stat total; they do not count toward an attack total).
 * A hand-built stat requirement that does not name a `stat` is **rejected**: see
 * `LineRequirement.anyStat` for the ~40× trap that guard exists to stop.
 *
 * Heroic (Reboot) only. Cube prices are the Heroic meso prices. **Bonus Potential
 * does not exist in Heroic worlds**, so no bonus-potential pool is modelled here —
 * see `BONUS_POTENTIAL_POOLS_NOT_MODELLED` at the bottom of this file for what a
 * future Interactive-world build would need.
 */

/* -------------------------------------------------------------------------- */
/* Types                                                                       */
/* -------------------------------------------------------------------------- */

/**
 * The slot groups StrategyWiki publishes pools for. These are the real
 * granularity of the game's line pools — finer than `PotentialCategory` in
 * `potential.ts`, coarser than the tracker's `Slot` union.
 */
export type PotentialPoolGroup =
	| 'hat'
	| 'topOverall'
	| 'bottom'
	| 'gloves'
	| 'shoes'
	| 'capeBeltShoulder'
	| 'accessory'
	| 'weapon'
	| 'secondary'
	| 'shieldSoulRing'
	| 'emblem'
	| 'heartBadge';

/** Item potential rank. Structurally identical to `PotentialGrade` in `potential.ts`. */
export type PoolGrade = 'rare' | 'epic' | 'unique' | 'legendary';

/**
 * A pool identity. `legendary` is the pool a Legendary **prime** line rolls from;
 * it is also the pool a *non-prime* line on a Legendary item does NOT roll from —
 * that one is `unique`. `belowRare` is the non-prime pool of a Rare item.
 */
export type PoolRank = 'belowRare' | 'rare' | 'epic' | 'unique' | 'legendary';

export type PoolStat = 'str' | 'dex' | 'int' | 'luk';

/**
 * Which probability column to read. `initial` = the first reveal, `inGameCube` =
 * Mystical / Hard / Solid, `cashCube` = Glowing / Bright (the only two a Heroic
 * character buys). A `0` in a column means that cube **cannot roll that line**.
 */
export type ChanceSource = 'initial' | 'inGameCube' | 'cashCube';

export type CubeId = 'mystical' | 'hard' | 'solid' | 'glowing' | 'bright';

/**
 * Which transcription of the **Unique and Legendary armour / accessory** pools to use.
 *
 * `'gms'` (default) is StrategyWiki's GMS tables — the source of record for this
 * tracker. `'kms'` reproduces Nexon KR's own disclosure as scraped by MathBro's
 * calculator. See `UNVERIFIED_HIGH_RANK_DEF_PERCENT_LINE`: the two differ by
 * exactly one line and nothing else.
 */
export type PoolVariant = 'gms' | 'kms';

/**
 * Line kinds present in the regular-potential pools.
 *
 * These are pool-level kinds, deliberately finer than `PotentialKind` in
 * `src/lib/calc/potential-parse.ts` (which is a *tooltip parser* vocabulary).
 * `POOL_KIND_TO_PARSED_KIND` maps between them.
 */
export type PoolLineKind =
	// damage-relevant
	| 'stat_pct'
	| 'all_stat_pct'
	| 'att_pct'
	| 'matt_pct'
	| 'damage_pct'
	| 'boss'
	| 'ied'
	| 'crit_rate'
	| 'crit_dmg'
	| 'hp_pct'
	| 'att_per_10_levels'
	| 'matt_per_10_levels'
	| 'stat_per_10_levels'
	// flat lines (only appear at the lower ranks in regular potential)
	| 'stat_flat'
	| 'all_stat_flat'
	| 'att_flat'
	| 'matt_flat'
	| 'hp_flat'
	| 'mp_flat'
	| 'def_flat'
	// utility
	| 'meso'
	| 'drop'
	| 'cooldown'
	| 'mp_pct'
	| 'def_pct'
	| 'mp_cost'
	| 'hp_recovery'
	| 'auto_steal'
	| 'speed'
	| 'jump'
	// restricted "junk" lines — worthless to us, but they occupy pool weight AND
	// they cap out, which re-normalises the pool for the following lines
	| 'ignore_damage'
	| 'invincible_chance'
	| 'invincible_time'
	| 'decent_skill'
	| 'other';

/** One line in one pool. */
export interface PoolLine {
	/** Line kind. */
	readonly kind: PoolLineKind;
	/** Set on `stat_pct` / `stat_flat` / `stat_per_10_levels`. */
	readonly stat?: PoolStat;
	/** A value that does not scale with item level (Boss +35%, IED 40%, −2s …). */
	readonly value?: number;
	/** `[minItemLevel, value]` rows, ascending. The GMS 151 row is included where the source has one. */
	readonly values?: readonly (readonly [number, number])[];
	/** Item level at which the source's probability table for this pool starts. */
	readonly minItemLevel: number;
	/** `[initial, inGameCube, cashCube]`, whole percents exactly as published. */
	readonly chance: readonly [number, number, number];
	/** The source's own "can only appear up to N times on a single cube" note, verbatim. See `MAX_LINES_PER_ITEM`. */
	readonly maxPerItem?: number;
	/** The StrategyWiki heading for this line, verbatim — the audit trail. */
	readonly label: string;
}

type PoolTable = Readonly<
	Record<PotentialPoolGroup, Readonly<Record<PoolRank, readonly PoolLine[]>>>
>;

/* -------------------------------------------------------------------------- */
/* Slot → pool group                                                           */
/* -------------------------------------------------------------------------- */

/**
 * The tracker's `Slot` union → the wiki's pool group.
 *
 * `null` means the slot never receives potential (`NEVER_GETS_POTENTIAL` in
 * `potential.ts`). Note `badge`: only three badges in GMS can hold potential, and
 * they share the Mechanical Heart pool.
 */
export const SLOT_TO_POOL_GROUP: Readonly<Record<string, PotentialPoolGroup | null>> = {
	weapon: 'weapon',
	secondary: 'secondary',
	emblem: 'emblem',
	hat: 'hat',
	top: 'topOverall',
	overall: 'topOverall',
	bottom: 'bottom',
	shoes: 'shoes',
	gloves: 'gloves',
	cape: 'capeBeltShoulder',
	shoulder: 'capeBeltShoulder',
	belt: 'capeBeltShoulder',
	pendant1: 'accessory',
	pendant2: 'accessory',
	ring1: 'accessory',
	ring2: 'accessory',
	ring3: 'accessory',
	ring4: 'accessory',
	earrings: 'accessory',
	face: 'accessory',
	eye: 'accessory',
	heart: 'heartBadge',
	badge: 'heartBadge',
	pocket: null,
	medal: null,
	android: null,
	totem1: null,
	totem2: null,
	totem3: null
};

/** `poolGroupForSlot('gloves') === 'gloves'`; unknown or potential-less slots give `null`. */
export function poolGroupForSlot(slot: string): PotentialPoolGroup | null {
	return SLOT_TO_POOL_GROUP[slot] ?? null;
}

/**
 * Secondary weapons split: Demon Aegis and Soul Rings have their own pool.
 * Pass `true` for those two item families.
 */
export function secondaryPoolGroup(isAegisOrSoulRing: boolean): PotentialPoolGroup {
	return isAegisOrSoulRing ? 'shieldSoulRing' : 'secondary';
}

/* -------------------------------------------------------------------------- */
/* THE POOLS                                                                   */
/* -------------------------------------------------------------------------- */

/**
 * Every regular-potential line pool, keyed `[slot group][pool rank]`.
 *
 * Transcribed from StrategyWiki "Potentials List" (see the file header for the
 * exact snapshot). Section → `PoolRank` mapping:
 *
 * | StrategyWiki section                     | key         |
 * |------------------------------------------|-------------|
 * | Rare (Non-prime)                         | `belowRare` |
 * | Rare (Prime) / Epic (Non-prime)          | `rare`      |
 * | Epic (Prime) / Unique (Non-prime)        | `epic`      |
 * | Unique (Prime) / Legendary (Non-prime)   | `unique`    |
 * | Legendary (Prime)                        | `legendary` |
 *
 * So a Legendary item's prime lines come from `legendary` and its non-prime lines
 * from `unique` — that is the whole reason a "3 × Critical Damage" glove is
 * astronomically expensive: Critical Damage is **only** in the `gloves.legendary`
 * pool, so all three lines must be prime *and* all three must hit a 1-in-11 slot.
 *
 * `chance` is `[initial, inGameCube, cashCube]` in whole percents, verbatim.
 * A `0` means that cube cannot roll that line (e.g. cash cubes never roll Auto
 * Steal or the +40% "Skills and Potion HP Recovery" line).
 *
 * NOTE the table is `// prettier-ignore`d: it is generated, and one line per pool
 * entry keeps it diffable against the source page.
 */
// prettier-ignore
export const POTENTIAL_LINE_POOLS: PoolTable = {
	hat: {
		belowRare: [
			{ kind: 'stat_flat', stat: 'str', values: [[0, 1], [21, 2], [41, 3], [51, 4], [71, 5], [91, 6]], minItemLevel: 0, chance: [6.25, 6.25, 14.2857], label: 'STR Increase' },
			{ kind: 'stat_flat', stat: 'dex', values: [[0, 1], [21, 2], [41, 3], [51, 4], [71, 5], [91, 6]], minItemLevel: 0, chance: [6.25, 6.25, 14.2857], label: 'DEX Increase' },
			{ kind: 'stat_flat', stat: 'int', values: [[0, 1], [21, 2], [41, 3], [51, 4], [71, 5], [91, 6]], minItemLevel: 0, chance: [6.25, 6.25, 14.2857], label: 'INT Increase' },
			{ kind: 'stat_flat', stat: 'luk', values: [[0, 1], [21, 2], [41, 3], [51, 4], [71, 5], [91, 6]], minItemLevel: 0, chance: [6.25, 6.25, 14.2857], label: 'LUK Increase' },
			{ kind: 'hp_flat', values: [[0, 5], [11, 10], [21, 15], [31, 20], [41, 25], [51, 30], [61, 35], [71, 40], [81, 45], [91, 50], [101, 55], [111, 60]], minItemLevel: 0, chance: [9.375, 9.375, 14.2857], label: 'MaxHP Increase' },
			{ kind: 'mp_flat', values: [[0, 5], [11, 10], [21, 15], [31, 20], [41, 25], [51, 30], [61, 35], [71, 40], [81, 45], [91, 50], [101, 55], [111, 60]], minItemLevel: 0, chance: [9.375, 9.375, 14.2857], label: 'MaxMP Increase' },
			{ kind: 'def_flat', values: [[0, 5], [11, 10], [21, 15], [31, 20], [41, 25], [51, 30], [61, 35], [71, 40], [81, 45], [91, 50], [101, 55], [111, 60]], minItemLevel: 0, chance: [9.375, 9.375, 14.2857], label: 'DEF Increase' },
			{ kind: 'other', minItemLevel: 0, chance: [9.375, 9.375, 0], label: '10% chance to show rage for 10 seconds when being attacked' },
			{ kind: 'other', minItemLevel: 0, chance: [9.375, 9.375, 0], label: '10% chance to show happy for 10 seconds when being attacked' },
			{ kind: 'other', minItemLevel: 0, chance: [9.375, 9.375, 0], label: '10% chance to fall in love for 10 seconds when being attacked' },
			{ kind: 'other', minItemLevel: 0, chance: [9.375, 9.375, 0], label: '10% chance to feel deeply moved for 10 seconds when being attacked' },
			{ kind: 'other', minItemLevel: 0, chance: [9.375, 9.375, 0], label: '10% chance to show angry for 10 seconds when being attacked' },
		],
		rare: [
			{ kind: 'stat_flat', stat: 'str', values: [[0, 2], [21, 4], [41, 6], [51, 8], [71, 10], [91, 12], [151, 13]], minItemLevel: 0, chance: [5.5555, 5.5555, 7.5], label: 'STR Increase' },
			{ kind: 'stat_flat', stat: 'dex', values: [[0, 2], [21, 4], [41, 6], [51, 8], [71, 10], [91, 12], [151, 13]], minItemLevel: 0, chance: [5.5555, 5.5555, 7.5], label: 'DEX Increase' },
			{ kind: 'stat_flat', stat: 'int', values: [[0, 2], [21, 4], [41, 6], [51, 8], [71, 10], [91, 12], [151, 13]], minItemLevel: 0, chance: [5.5555, 5.5555, 7.5], label: 'INT Increase' },
			{ kind: 'stat_flat', stat: 'luk', values: [[0, 2], [21, 4], [41, 6], [51, 8], [71, 10], [91, 12], [151, 13]], minItemLevel: 0, chance: [5.5555, 5.5555, 7.5], label: 'LUK Increase' },
			{ kind: 'hp_flat', values: [[0, 10], [11, 20], [21, 30], [31, 40], [41, 50], [51, 60], [61, 70], [71, 80], [81, 90], [91, 100], [101, 110], [111, 120], [151, 125]], minItemLevel: 0, chance: [8.3333, 8.3333, 7.5], label: 'MaxHP Increase' },
			{ kind: 'mp_flat', values: [[0, 10], [11, 20], [21, 30], [31, 40], [41, 50], [51, 60], [61, 70], [71, 80], [81, 90], [91, 100], [101, 110], [111, 120], [151, 125]], minItemLevel: 0, chance: [8.3333, 8.3333, 7.5], label: 'MaxMP Increase' },
			{ kind: 'def_flat', values: [[0, 10], [11, 20], [21, 30], [31, 40], [41, 50], [51, 60], [61, 70], [71, 80], [81, 90], [91, 100], [101, 110], [111, 120], [151, 125]], minItemLevel: 0, chance: [8.3333, 8.3333, 5], label: 'DEF Increase' },
			{ kind: 'stat_pct', stat: 'str', values: [[0, 1], [31, 2], [71, 3], [151, 4]], minItemLevel: 0, chance: [5.5555, 5.5555, 7.5], label: 'STR % Increase' },
			{ kind: 'stat_pct', stat: 'dex', values: [[0, 1], [31, 2], [71, 3], [151, 4]], minItemLevel: 0, chance: [5.5555, 5.5555, 7.5], label: 'DEX % Increase' },
			{ kind: 'stat_pct', stat: 'int', values: [[0, 1], [31, 2], [71, 3], [151, 4]], minItemLevel: 0, chance: [5.5555, 5.5555, 7.5], label: 'INT % Increase' },
			{ kind: 'stat_pct', stat: 'luk', values: [[0, 1], [31, 2], [71, 3], [151, 4]], minItemLevel: 0, chance: [5.5555, 5.5555, 7.5], label: 'LUK % Increase' },
			{ kind: 'hp_pct', values: [[0, 1], [31, 2], [71, 3], [151, 4]], minItemLevel: 0, chance: [8.3333, 8.3333, 5], label: 'MaxHP % Increase' },
			{ kind: 'mp_pct', values: [[0, 1], [31, 2], [71, 3], [151, 4]], minItemLevel: 0, chance: [8.3333, 8.3333, 5], label: 'MaxMP % Increase' },
			{ kind: 'def_pct', values: [[0, 1], [31, 2], [71, 3], [151, 4]], minItemLevel: 0, chance: [8.3333, 8.3333, 5], label: 'DEF % Increase' },
			{ kind: 'all_stat_flat', values: [[0, 1], [21, 2], [41, 3], [61, 4], [81, 5], [151, 6]], minItemLevel: 0, chance: [5.5555, 5.5555, 5], label: 'All Stats Increase' },
		],
		epic: [
			{ kind: 'stat_pct', stat: 'str', values: [[0, 2], [31, 4], [71, 6], [151, 7]], minItemLevel: 0, chance: [7.4074, 7.4074, 14.2857], label: 'STR % Increase' },
			{ kind: 'stat_pct', stat: 'dex', values: [[0, 2], [31, 4], [71, 6], [151, 7]], minItemLevel: 0, chance: [7.4074, 7.4074, 14.2857], label: 'DEX % Increase' },
			{ kind: 'stat_pct', stat: 'int', values: [[0, 2], [31, 4], [71, 6], [151, 7]], minItemLevel: 0, chance: [7.4074, 7.4074, 14.2857], label: 'INT % Increase' },
			{ kind: 'stat_pct', stat: 'luk', values: [[0, 2], [31, 4], [71, 6], [151, 7]], minItemLevel: 0, chance: [7.4074, 7.4074, 14.2857], label: 'LUK % Increase' },
			{ kind: 'hp_pct', values: [[0, 2], [31, 4], [71, 6], [151, 7]], minItemLevel: 0, chance: [11.1111, 11.1111, 14.2857], label: 'MaxHP % Increase' },
			{ kind: 'mp_pct', values: [[0, 2], [31, 4], [71, 6], [151, 7]], minItemLevel: 0, chance: [11.1111, 11.1111, 14.2857], label: 'MaxMP % Increase' },
			{ kind: 'def_pct', values: [[0, 2], [31, 4], [71, 6], [151, 7]], minItemLevel: 0, chance: [11.1111, 11.1111, 8.5714], label: 'DEF % Increase' },
			{ kind: 'all_stat_pct', values: [[0, 1], [31, 2], [71, 3], [151, 4]], minItemLevel: 0, chance: [3.7037, 3.7037, 5.7142], label: 'All Stats % Increase' },
			{ kind: 'ignore_damage', values: [[0, 3], [11, 5], [21, 7], [31, 9], [41, 11], [51, 13], [61, 15], [71, 17], [81, 19], [91, 21], [101, 23], [111, 25], [151, 26]], minItemLevel: 0, chance: [11.1111, 11.1111, 0], label: '20% chance to ignore monster damage dealt' },
			{ kind: 'ignore_damage', values: [[0, 5], [11, 8], [21, 11], [31, 14], [41, 17], [51, 20], [61, 23], [71, 26], [81, 29], [91, 32], [101, 35], [111, 38], [151, 39]], minItemLevel: 0, chance: [11.1111, 11.1111, 0], label: '20% chance to ignore monster damage dealt' },
			{ kind: 'ignore_damage', values: [[0, 7], [11, 11], [21, 15], [31, 19], [41, 23], [51, 27], [61, 31], [71, 35], [81, 39], [91, 43], [101, 47], [111, 51], [151, 53]], minItemLevel: 0, chance: [11.1111, 11.1111, 0], label: '30% chance to ignore monster damage dealt' },
		],
		unique: [
			{ kind: 'stat_pct', stat: 'str', values: [[0, 3], [31, 6], [71, 9], [151, 10]], minItemLevel: 70, chance: [6.8965, 6.8965, 8.9285], label: 'STR % Increase' },
			{ kind: 'stat_pct', stat: 'dex', values: [[0, 3], [31, 6], [71, 9], [151, 10]], minItemLevel: 70, chance: [6.8965, 6.8965, 8.9285], label: 'DEX % Increase' },
			{ kind: 'stat_pct', stat: 'int', values: [[0, 3], [31, 6], [71, 9], [151, 10]], minItemLevel: 70, chance: [6.8965, 6.8965, 8.9285], label: 'INT % Increase' },
			{ kind: 'stat_pct', stat: 'luk', values: [[0, 3], [31, 6], [71, 9], [151, 10]], minItemLevel: 70, chance: [6.8965, 6.8965, 8.9285], label: 'LUK % Increase' },
			{ kind: 'hp_pct', values: [[0, 3], [31, 6], [71, 9]], minItemLevel: 70, chance: [10.3448, 10.3448, 10.7142], label: 'MaxHP % Increase' },
			{ kind: 'mp_pct', values: [[0, 3], [31, 6], [71, 9]], minItemLevel: 70, chance: [10.3448, 10.3448, 10.7142], label: 'MaxMP % Increase' },
			{ kind: 'def_pct', values: [[0, 3], [31, 6], [71, 9]], minItemLevel: 70, chance: [10.3448, 10.3448, 7.1428], label: 'DEF % Increase' },
			{ kind: 'all_stat_pct', values: [[0, 2], [31, 4], [71, 6], [151, 7]], minItemLevel: 70, chance: [3.4482, 3.4482, 7.1428], label: 'All Stats % Increase' },
			{ kind: 'ignore_damage', minItemLevel: 70, chance: [10.3448, 10.3448, 7.1428], maxPerItem: 2, label: '5% chance to ignore 20% of monster damage dealt' },
			{ kind: 'ignore_damage', minItemLevel: 70, chance: [10.3448, 10.3448, 7.1428], maxPerItem: 2, label: '5% chance to ignore 40% of monster damage dealt' },
			{ kind: 'hp_recovery', values: [[0, 10], [31, 20], [71, 30]], minItemLevel: 70, chance: [10.3448, 10.3448, 7.1428], label: 'Skills and Potion HP Recovery % Increase' },
			{ kind: 'decent_skill', minItemLevel: 70, chance: [6.8965, 6.8965, 7.1428], maxPerItem: 1, label: 'Decent Mystic Door enabled' },
		],
		legendary: [
			{ kind: 'stat_pct', stat: 'str', values: [[0, 6], [31, 9], [71, 12], [151, 13]], minItemLevel: 120, chance: [5.5555, 5.5555, 8.8888], label: 'STR % Increase' },
			{ kind: 'stat_pct', stat: 'dex', values: [[0, 6], [31, 9], [71, 12], [151, 13]], minItemLevel: 120, chance: [5.5555, 5.5555, 8.8888], label: 'DEX % Increase' },
			{ kind: 'stat_pct', stat: 'int', values: [[0, 6], [31, 9], [71, 12], [151, 13]], minItemLevel: 120, chance: [5.5555, 5.5555, 8.8888], label: 'INT % Increase' },
			{ kind: 'stat_pct', stat: 'luk', values: [[0, 6], [31, 9], [71, 12], [151, 13]], minItemLevel: 120, chance: [5.5555, 5.5555, 8.8888], label: 'LUK % Increase' },
			{ kind: 'hp_pct', values: [[0, 6], [31, 9], [71, 12]], minItemLevel: 120, chance: [8.3333, 8.3333, 8.8888], label: 'MaxHP % Increase' },
			{ kind: 'mp_pct', values: [[0, 6], [31, 9], [71, 12]], minItemLevel: 120, chance: [8.3333, 8.3333, 8.8888], label: 'MaxMP % Increase' },
			{ kind: 'def_pct', values: [[0, 6], [31, 9], [71, 12]], minItemLevel: 120, chance: [8.3333, 8.3333, 8.8888], label: 'DEF % Increase' },
			{ kind: 'all_stat_pct', values: [[0, 3], [31, 6], [71, 9], [151, 10]], minItemLevel: 120, chance: [5.5555, 5.5555, 6.6666], label: 'All Stats % Increase' },
			{ kind: 'ignore_damage', minItemLevel: 120, chance: [8.3333, 8.3333, 6.6666], maxPerItem: 2, label: '10% chance to ignore 20% of monster damage dealt' },
			{ kind: 'ignore_damage', minItemLevel: 120, chance: [8.3333, 8.3333, 6.6666], maxPerItem: 2, label: '10% chance to ignore 40% of monster damage dealt' },
			{ kind: 'hp_recovery', values: [[0, 20], [31, 30], [71, 40]], minItemLevel: 120, chance: [8.3333, 8.3333, 0], label: 'Skills and Potion HP Recovery % Increase' },
			{ kind: 'cooldown', value: -1, minItemLevel: 120, chance: [8.3333, 8.3333, 6.6666], label: 'Skill Cooldown -1 second' },
			{ kind: 'cooldown', value: -2, minItemLevel: 120, chance: [5.5555, 5.5555, 4.4444], label: 'Skill Cooldown -2 seconds' },
			{ kind: 'decent_skill', minItemLevel: 120, chance: [8.3333, 8.3333, 6.6666], maxPerItem: 1, label: 'Decent Advanced Bless enabled' },
		],
	},
	topOverall: {
		belowRare: [
			{ kind: 'stat_flat', stat: 'str', values: [[0, 1], [21, 2], [41, 3], [51, 4], [71, 5], [91, 6]], minItemLevel: 0, chance: [11.7647, 11.7647, 14.2857], label: 'STR Increase' },
			{ kind: 'stat_flat', stat: 'dex', values: [[0, 1], [21, 2], [41, 3], [51, 4], [71, 5], [91, 6]], minItemLevel: 0, chance: [11.7647, 11.7647, 14.2857], label: 'DEX Increase' },
			{ kind: 'stat_flat', stat: 'int', values: [[0, 1], [21, 2], [41, 3], [51, 4], [71, 5], [91, 6]], minItemLevel: 0, chance: [11.7647, 11.7647, 14.2857], label: 'INT Increase' },
			{ kind: 'stat_flat', stat: 'luk', values: [[0, 1], [21, 2], [41, 3], [51, 4], [71, 5], [91, 6]], minItemLevel: 0, chance: [11.7647, 11.7647, 14.2857], label: 'LUK Increase' },
			{ kind: 'hp_flat', values: [[0, 5], [11, 10], [21, 15], [31, 20], [41, 25], [51, 30], [61, 35], [71, 40], [81, 45], [91, 50], [101, 55], [111, 60]], minItemLevel: 0, chance: [17.647, 17.647, 14.2857], label: 'MaxHP Increase' },
			{ kind: 'mp_flat', values: [[0, 5], [11, 10], [21, 15], [31, 20], [41, 25], [51, 30], [61, 35], [71, 40], [81, 45], [91, 50], [101, 55], [111, 60]], minItemLevel: 0, chance: [17.647, 17.647, 14.2857], label: 'MaxMP Increase' },
			{ kind: 'def_flat', values: [[0, 5], [11, 10], [21, 15], [31, 20], [41, 25], [51, 30], [61, 35], [71, 40], [81, 45], [91, 50], [101, 55], [111, 60]], minItemLevel: 0, chance: [17.647, 17.647, 14.2857], label: 'DEF Increase' },
		],
		rare: [
			{ kind: 'stat_flat', stat: 'str', values: [[0, 2], [21, 4], [41, 6], [51, 8], [71, 10], [91, 12], [151, 13]], minItemLevel: 0, chance: [5.5555, 5.5555, 7.5], label: 'STR Increase' },
			{ kind: 'stat_flat', stat: 'dex', values: [[0, 2], [21, 4], [41, 6], [51, 8], [71, 10], [91, 12], [151, 13]], minItemLevel: 0, chance: [5.5555, 5.5555, 7.5], label: 'DEX Increase' },
			{ kind: 'stat_flat', stat: 'int', values: [[0, 2], [21, 4], [41, 6], [51, 8], [71, 10], [91, 12], [151, 13]], minItemLevel: 0, chance: [5.5555, 5.5555, 7.5], label: 'INT Increase' },
			{ kind: 'stat_flat', stat: 'luk', values: [[0, 2], [21, 4], [41, 6], [51, 8], [71, 10], [91, 12], [151, 13]], minItemLevel: 0, chance: [5.5555, 5.5555, 7.5], label: 'LUK Increase' },
			{ kind: 'hp_flat', values: [[0, 10], [11, 20], [21, 30], [31, 40], [41, 50], [51, 60], [61, 70], [71, 80], [81, 90], [91, 100], [101, 110], [111, 120], [151, 125]], minItemLevel: 0, chance: [8.3333, 8.3333, 7.5], label: 'MaxHP Increase' },
			{ kind: 'mp_flat', values: [[0, 10], [11, 20], [21, 30], [31, 40], [41, 50], [51, 60], [61, 70], [71, 80], [81, 90], [91, 100], [101, 110], [111, 120], [151, 125]], minItemLevel: 0, chance: [8.3333, 8.3333, 7.5], label: 'MaxMP Increase' },
			{ kind: 'def_flat', values: [[0, 10], [11, 20], [21, 30], [31, 40], [41, 50], [51, 60], [61, 70], [71, 80], [81, 90], [91, 100], [101, 110], [111, 120], [151, 125]], minItemLevel: 0, chance: [8.3333, 8.3333, 5], label: 'DEF Increase' },
			{ kind: 'stat_pct', stat: 'str', values: [[0, 1], [31, 2], [71, 3], [151, 4]], minItemLevel: 0, chance: [5.5555, 5.5555, 7.5], label: 'STR % Increase' },
			{ kind: 'stat_pct', stat: 'dex', values: [[0, 1], [31, 2], [71, 3], [151, 4]], minItemLevel: 0, chance: [5.5555, 5.5555, 7.5], label: 'DEX % Increase' },
			{ kind: 'stat_pct', stat: 'int', values: [[0, 1], [31, 2], [71, 3], [151, 4]], minItemLevel: 0, chance: [5.5555, 5.5555, 7.5], label: 'INT % Increase' },
			{ kind: 'stat_pct', stat: 'luk', values: [[0, 1], [31, 2], [71, 3], [151, 4]], minItemLevel: 0, chance: [5.5555, 5.5555, 7.5], label: 'LUK % Increase' },
			{ kind: 'hp_pct', values: [[0, 1], [31, 2], [71, 3], [151, 4]], minItemLevel: 0, chance: [8.3333, 8.3333, 5], label: 'MaxHP % Increase' },
			{ kind: 'mp_pct', values: [[0, 1], [31, 2], [71, 3], [151, 4]], minItemLevel: 0, chance: [8.3333, 8.3333, 5], label: 'MaxMP % Increase' },
			{ kind: 'def_pct', values: [[0, 1], [31, 2], [71, 3], [151, 4]], minItemLevel: 0, chance: [8.3333, 8.3333, 5], label: 'DEF % Increase' },
			{ kind: 'all_stat_flat', values: [[0, 1], [21, 2], [41, 3], [61, 4], [81, 5], [151, 6]], minItemLevel: 0, chance: [5.5555, 5.5555, 5], label: 'All Stats Increase' },
		],
		epic: [
			{ kind: 'stat_pct', stat: 'str', values: [[0, 2], [31, 4], [71, 6], [151, 7]], minItemLevel: 0, chance: [6.6666, 6.6666, 13.1578], label: 'STR % Increase' },
			{ kind: 'stat_pct', stat: 'dex', values: [[0, 2], [31, 4], [71, 6], [151, 7]], minItemLevel: 0, chance: [6.6666, 6.6666, 13.1578], label: 'DEX % Increase' },
			{ kind: 'stat_pct', stat: 'int', values: [[0, 2], [31, 4], [71, 6], [151, 7]], minItemLevel: 0, chance: [6.6666, 6.6666, 13.1578], label: 'INT % Increase' },
			{ kind: 'stat_pct', stat: 'luk', values: [[0, 2], [31, 4], [71, 6], [151, 7]], minItemLevel: 0, chance: [6.6666, 6.6666, 13.1578], label: 'LUK % Increase' },
			{ kind: 'hp_pct', values: [[0, 2], [31, 4], [71, 6], [151, 7]], minItemLevel: 0, chance: [10, 10, 13.1578], label: 'MaxHP % Increase' },
			{ kind: 'mp_pct', values: [[0, 2], [31, 4], [71, 6], [151, 7]], minItemLevel: 0, chance: [10, 10, 13.1578], label: 'MaxMP % Increase' },
			{ kind: 'def_pct', values: [[0, 2], [31, 4], [71, 6], [151, 7]], minItemLevel: 0, chance: [10, 10, 7.8947], label: 'DEF % Increase' },
			{ kind: 'all_stat_pct', values: [[0, 1], [31, 2], [71, 3], [151, 4]], minItemLevel: 0, chance: [3.3333, 3.3333, 5.2631], label: 'All Stats % Increase' },
			{ kind: 'ignore_damage', values: [[0, 3], [11, 5], [21, 7], [31, 9], [41, 11], [51, 13], [61, 15], [71, 17], [81, 19], [91, 21], [101, 23], [111, 25], [151, 26]], minItemLevel: 0, chance: [10, 10, 0], label: '20% chance to ignore monster damage dealt' },
			{ kind: 'ignore_damage', values: [[0, 5], [11, 8], [21, 11], [31, 14], [41, 17], [51, 20], [61, 23], [71, 26], [81, 29], [91, 32], [101, 35], [111, 38], [151, 39]], minItemLevel: 0, chance: [10, 10, 0], label: '20% chance to ignore monster damage dealt' },
			{ kind: 'ignore_damage', values: [[0, 7], [11, 11], [21, 15], [31, 19], [41, 23], [51, 27], [61, 31], [71, 35], [81, 39], [91, 43], [101, 47], [111, 51], [151, 53]], minItemLevel: 0, chance: [10, 10, 0], label: '30% chance to ignore monster damage dealt' },
			{ kind: 'invincible_time', value: 1, minItemLevel: 0, chance: [10, 10, 7.8947], maxPerItem: 1, label: 'Invincibility Time +1 second' },
		],
		unique: [
			{ kind: 'stat_pct', stat: 'str', values: [[0, 3], [31, 6], [71, 9], [151, 10]], minItemLevel: 40, chance: [5.1282, 6.0606, 7.5757], label: 'STR % Increase' },
			{ kind: 'stat_pct', stat: 'dex', values: [[0, 3], [31, 6], [71, 9], [151, 10]], minItemLevel: 40, chance: [5.1282, 6.0606, 7.5757], label: 'DEX % Increase' },
			{ kind: 'stat_pct', stat: 'int', values: [[0, 3], [31, 6], [71, 9], [151, 10]], minItemLevel: 40, chance: [5.1282, 6.0606, 7.5757], label: 'INT % Increase' },
			{ kind: 'stat_pct', stat: 'luk', values: [[0, 3], [31, 6], [71, 9], [151, 10]], minItemLevel: 40, chance: [5.1282, 6.0606, 7.5757], label: 'LUK % Increase' },
			{ kind: 'hp_pct', values: [[0, 3], [31, 6], [71, 9]], minItemLevel: 40, chance: [7.6923, 9.0909, 9.0909], label: 'MaxHP % Increase' },
			{ kind: 'mp_pct', values: [[0, 3], [31, 6], [71, 9]], minItemLevel: 40, chance: [7.6923, 9.0909, 9.0909], label: 'MaxMP % Increase' },
			{ kind: 'def_pct', values: [[0, 3], [31, 6], [71, 9]], minItemLevel: 40, chance: [7.6923, 9.0909, 6.0606], label: 'DEF % Increase' },
			{ kind: 'all_stat_pct', values: [[0, 2], [31, 4], [71, 6], [151, 7]], minItemLevel: 40, chance: [2.5641, 3.0303, 6.0606], label: 'All Stats % Increase' },
			{ kind: 'ignore_damage', minItemLevel: 40, chance: [7.6923, 9.0909, 6.0606], maxPerItem: 2, label: '5% chance to ignore 20% of monster damage dealt' },
			{ kind: 'ignore_damage', minItemLevel: 40, chance: [7.6923, 9.0909, 6.0606], maxPerItem: 2, label: '5% chance to ignore 40% of monster damage dealt' },
			{ kind: 'invincible_time', value: 2, minItemLevel: 40, chance: [7.6923, 9.0909, 6.0606], maxPerItem: 1, label: 'Invincibility Time +2 seconds' },
			{ kind: 'invincible_chance', values: [[0, 5], [41, 6], [81, 7]], minItemLevel: 40, chance: [7.6923, 9.0909, 6.0606], maxPerItem: 2, label: '2% chance to be invincible when attacked' },
			{ kind: 'other', values: [[0, 10], [31, 10], [51, 20], [70, 20], [101, 30]], minItemLevel: 40, chance: [7.6923, 0, 6.0606], label: 'Reflect damage at a chance' },
			{ kind: 'other', values: [[0, 10], [31, 10], [51, 20], [70, 20], [101, 30]], minItemLevel: 40, chance: [7.6923, 0, 3.0303], label: 'Reflect damage at a chance' },
			{ kind: 'hp_recovery', values: [[0, 10], [31, 20], [71, 30]], minItemLevel: 40, chance: [7.6923, 9.0909, 6.0606], label: 'Skills and Potion HP Recovery % Increase' },
		],
		legendary: [
			{ kind: 'stat_pct', stat: 'str', values: [[0, 6], [31, 9], [71, 12], [151, 13]], minItemLevel: 70, chance: [5.8823, 5.8823, 9.3023], label: 'STR % Increase' },
			{ kind: 'stat_pct', stat: 'dex', values: [[0, 6], [31, 9], [71, 12], [151, 13]], minItemLevel: 70, chance: [5.8823, 5.8823, 9.3023], label: 'DEX % Increase' },
			{ kind: 'stat_pct', stat: 'int', values: [[0, 6], [31, 9], [71, 12], [151, 13]], minItemLevel: 70, chance: [5.8823, 5.8823, 9.3023], label: 'INT % Increase' },
			{ kind: 'stat_pct', stat: 'luk', values: [[0, 6], [31, 9], [71, 12], [151, 13]], minItemLevel: 70, chance: [5.8823, 5.8823, 9.3023], label: 'LUK % Increase' },
			{ kind: 'hp_pct', values: [[0, 6], [31, 9], [71, 12]], minItemLevel: 70, chance: [8.8235, 8.8235, 9.3023], label: 'MaxHP % Increase' },
			{ kind: 'mp_pct', values: [[0, 6], [31, 9], [71, 12]], minItemLevel: 70, chance: [8.8235, 8.8235, 9.3023], label: 'MaxMP % Increase' },
			{ kind: 'def_pct', values: [[0, 6], [31, 9], [71, 12]], minItemLevel: 70, chance: [8.8235, 8.8235, 9.3023], label: 'DEF % Increase' },
			{ kind: 'all_stat_pct', values: [[0, 3], [31, 6], [71, 9], [151, 10]], minItemLevel: 70, chance: [5.8823, 5.8823, 6.9767], label: 'All Stats % Increase' },
			{ kind: 'ignore_damage', minItemLevel: 70, chance: [8.8235, 8.8235, 6.9767], maxPerItem: 2, label: '10% chance to ignore 20% of monster damage dealt' },
			{ kind: 'ignore_damage', minItemLevel: 70, chance: [8.8235, 8.8235, 6.9767], maxPerItem: 2, label: '10% chance to ignore 40% of monster damage dealt' },
			{ kind: 'invincible_time', value: 3, minItemLevel: 70, chance: [8.8235, 8.8235, 6.9767], maxPerItem: 1, label: 'Invincibility Time +3 seconds' },
			{ kind: 'invincible_chance', values: [[0, 5], [41, 6], [81, 7]], minItemLevel: 70, chance: [8.8235, 8.8235, 6.9767], maxPerItem: 2, label: '4% chance to become invincible when attacked' },
			{ kind: 'hp_recovery', values: [[0, 20], [31, 30], [71, 40]], minItemLevel: 70, chance: [8.8235, 8.8235, 0], label: 'Skills and Potion HP Recovery % Increase' },
		],
	},
	bottom: {
		belowRare: [
			{ kind: 'stat_flat', stat: 'str', values: [[0, 1], [21, 2], [41, 3], [51, 4], [71, 5], [91, 6]], minItemLevel: 0, chance: [11.7647, 11.7647, 14.2857], label: 'STR Increase' },
			{ kind: 'stat_flat', stat: 'dex', values: [[0, 1], [21, 2], [41, 3], [51, 4], [71, 5], [91, 6]], minItemLevel: 0, chance: [11.7647, 11.7647, 14.2857], label: 'DEX Increase' },
			{ kind: 'stat_flat', stat: 'int', values: [[0, 1], [21, 2], [41, 3], [51, 4], [71, 5], [91, 6]], minItemLevel: 0, chance: [11.7647, 11.7647, 14.2857], label: 'INT Increase' },
			{ kind: 'stat_flat', stat: 'luk', values: [[0, 1], [21, 2], [41, 3], [51, 4], [71, 5], [91, 6]], minItemLevel: 0, chance: [11.7647, 11.7647, 14.2857], label: 'LUK Increase' },
			{ kind: 'hp_flat', values: [[0, 5], [11, 10], [21, 15], [31, 20], [41, 25], [51, 30], [61, 35], [71, 40], [81, 45], [91, 50], [101, 55], [111, 60]], minItemLevel: 0, chance: [17.647, 17.647, 14.2857], label: 'MaxHP Increase' },
			{ kind: 'mp_flat', values: [[0, 5], [11, 10], [21, 15], [31, 20], [41, 25], [51, 30], [61, 35], [71, 40], [81, 45], [91, 50], [101, 55], [111, 60]], minItemLevel: 0, chance: [17.647, 17.647, 14.2857], label: 'MaxMP Increase' },
			{ kind: 'def_flat', values: [[0, 5], [11, 10], [21, 15], [31, 20], [41, 25], [51, 30], [61, 35], [71, 40], [81, 45], [91, 50], [101, 55], [111, 60]], minItemLevel: 0, chance: [17.647, 17.647, 14.2857], label: 'DEF Increase' },
		],
		rare: [
			{ kind: 'stat_flat', stat: 'str', values: [[0, 2], [21, 4], [41, 6], [51, 8], [71, 10], [91, 12], [151, 13]], minItemLevel: 0, chance: [5.5555, 5.5555, 7.5], label: 'STR Increase' },
			{ kind: 'stat_flat', stat: 'dex', values: [[0, 2], [21, 4], [41, 6], [51, 8], [71, 10], [91, 12], [151, 13]], minItemLevel: 0, chance: [5.5555, 5.5555, 7.5], label: 'DEX Increase' },
			{ kind: 'stat_flat', stat: 'int', values: [[0, 2], [21, 4], [41, 6], [51, 8], [71, 10], [91, 12], [151, 13]], minItemLevel: 0, chance: [5.5555, 5.5555, 7.5], label: 'INT Increase' },
			{ kind: 'stat_flat', stat: 'luk', values: [[0, 2], [21, 4], [41, 6], [51, 8], [71, 10], [91, 12], [151, 13]], minItemLevel: 0, chance: [5.5555, 5.5555, 7.5], label: 'LUK Increase' },
			{ kind: 'hp_flat', values: [[0, 10], [11, 20], [21, 30], [31, 40], [41, 50], [51, 60], [61, 70], [71, 80], [81, 90], [91, 100], [101, 110], [111, 120], [151, 125]], minItemLevel: 0, chance: [8.3333, 8.3333, 7.5], label: 'MaxHP Increase' },
			{ kind: 'mp_flat', values: [[0, 10], [11, 20], [21, 30], [31, 40], [41, 50], [51, 60], [61, 70], [71, 80], [81, 90], [91, 100], [101, 110], [111, 120], [151, 125]], minItemLevel: 0, chance: [8.3333, 8.3333, 7.5], label: 'MaxMP Increase' },
			{ kind: 'def_flat', values: [[0, 10], [11, 20], [21, 30], [31, 40], [41, 50], [51, 60], [61, 70], [71, 80], [81, 90], [91, 100], [101, 110], [111, 120], [151, 125]], minItemLevel: 0, chance: [8.3333, 8.3333, 5], label: 'DEF Increase' },
			{ kind: 'stat_pct', stat: 'str', values: [[0, 1], [31, 2], [71, 3], [151, 4]], minItemLevel: 0, chance: [5.5555, 5.5555, 7.5], label: 'STR % Increase' },
			{ kind: 'stat_pct', stat: 'dex', values: [[0, 1], [31, 2], [71, 3], [151, 4]], minItemLevel: 0, chance: [5.5555, 5.5555, 7.5], label: 'DEX % Increase' },
			{ kind: 'stat_pct', stat: 'int', values: [[0, 1], [31, 2], [71, 3], [151, 4]], minItemLevel: 0, chance: [5.5555, 5.5555, 7.5], label: 'INT % Increase' },
			{ kind: 'stat_pct', stat: 'luk', values: [[0, 1], [31, 2], [71, 3], [151, 4]], minItemLevel: 0, chance: [5.5555, 5.5555, 7.5], label: 'LUK % Increase' },
			{ kind: 'hp_pct', values: [[0, 1], [31, 2], [71, 3], [151, 4]], minItemLevel: 0, chance: [8.3333, 8.3333, 5], label: 'MaxHP % Increase' },
			{ kind: 'mp_pct', values: [[0, 1], [31, 2], [71, 3], [151, 4]], minItemLevel: 0, chance: [8.3333, 8.3333, 5], label: 'MaxMP % Increase' },
			{ kind: 'def_pct', values: [[0, 1], [31, 2], [71, 3], [151, 4]], minItemLevel: 0, chance: [8.3333, 8.3333, 5], label: 'DEF % Increase' },
			{ kind: 'all_stat_flat', values: [[0, 1], [21, 2], [41, 3], [61, 4], [81, 5], [151, 6]], minItemLevel: 0, chance: [5.5555, 5.5555, 5], label: 'All Stats Increase' },
		],
		epic: [
			{ kind: 'stat_pct', stat: 'str', values: [[0, 2], [31, 4], [71, 6], [151, 7]], minItemLevel: 0, chance: [7.4074, 7.4074, 14.2857], label: 'STR % Increase' },
			{ kind: 'stat_pct', stat: 'dex', values: [[0, 2], [31, 4], [71, 6], [151, 7]], minItemLevel: 0, chance: [7.4074, 7.4074, 14.2857], label: 'DEX % Increase' },
			{ kind: 'stat_pct', stat: 'int', values: [[0, 2], [31, 4], [71, 6], [151, 7]], minItemLevel: 0, chance: [7.4074, 7.4074, 14.2857], label: 'INT % Increase' },
			{ kind: 'stat_pct', stat: 'luk', values: [[0, 2], [31, 4], [71, 6], [151, 7]], minItemLevel: 0, chance: [7.4074, 7.4074, 14.2857], label: 'LUK % Increase' },
			{ kind: 'hp_pct', values: [[0, 2], [31, 4], [71, 6], [151, 7]], minItemLevel: 0, chance: [11.1111, 11.1111, 14.2857], label: 'MaxHP % Increase' },
			{ kind: 'mp_pct', values: [[0, 2], [31, 4], [71, 6], [151, 7]], minItemLevel: 0, chance: [11.1111, 11.1111, 14.2857], label: 'MaxMP % Increase' },
			{ kind: 'def_pct', values: [[0, 2], [31, 4], [71, 6], [151, 7]], minItemLevel: 0, chance: [11.1111, 11.1111, 8.5714], label: 'DEF % Increase' },
			{ kind: 'all_stat_pct', values: [[0, 1], [31, 2], [71, 3], [151, 4]], minItemLevel: 0, chance: [3.7037, 3.7037, 5.7142], label: 'All Stats % Increase' },
			{ kind: 'ignore_damage', values: [[0, 3], [11, 5], [21, 7], [31, 9], [41, 11], [51, 13], [61, 15], [71, 17], [81, 19], [91, 21], [101, 23], [111, 25], [151, 26]], minItemLevel: 0, chance: [11.1111, 11.1111, 0], label: '20% chance to ignore monster damage dealt' },
			{ kind: 'ignore_damage', values: [[0, 5], [11, 8], [21, 11], [31, 14], [41, 17], [51, 20], [61, 23], [71, 26], [81, 29], [91, 32], [101, 35], [111, 38], [151, 39]], minItemLevel: 0, chance: [11.1111, 11.1111, 0], label: '20% chance to ignore monster damage dealt' },
			{ kind: 'ignore_damage', values: [[0, 7], [11, 11], [21, 15], [31, 19], [41, 23], [51, 27], [61, 31], [71, 35], [81, 39], [91, 43], [101, 47], [111, 51], [151, 53]], minItemLevel: 0, chance: [11.1111, 11.1111, 0], label: '30% chance to ignore monster damage dealt' },
		],
		unique: [
			{ kind: 'stat_pct', stat: 'str', values: [[0, 3], [31, 6], [71, 9], [151, 10]], minItemLevel: 70, chance: [6.8965, 6.8965, 8.9285], label: 'STR % Increase' },
			{ kind: 'stat_pct', stat: 'dex', values: [[0, 3], [31, 6], [71, 9], [151, 10]], minItemLevel: 70, chance: [6.8965, 6.8965, 8.9285], label: 'DEX % Increase' },
			{ kind: 'stat_pct', stat: 'int', values: [[0, 3], [31, 6], [71, 9], [151, 10]], minItemLevel: 70, chance: [6.8965, 6.8965, 8.9285], label: 'INT % Increase' },
			{ kind: 'stat_pct', stat: 'luk', values: [[0, 3], [31, 6], [71, 9], [151, 10]], minItemLevel: 70, chance: [6.8965, 6.8965, 8.9285], label: 'LUK % Increase' },
			{ kind: 'hp_pct', values: [[0, 3], [31, 6], [71, 9]], minItemLevel: 70, chance: [10.3448, 10.3448, 10.7142], label: 'MaxHP % Increase' },
			{ kind: 'mp_pct', values: [[0, 3], [31, 6], [71, 9]], minItemLevel: 70, chance: [10.3448, 10.3448, 10.7142], label: 'MaxMP % Increase' },
			{ kind: 'def_pct', values: [[0, 3], [31, 6], [71, 9]], minItemLevel: 70, chance: [10.3448, 10.3448, 7.1428], label: 'DEF % Increase' },
			{ kind: 'all_stat_pct', values: [[0, 2], [31, 4], [71, 6], [151, 7]], minItemLevel: 70, chance: [3.4482, 3.4482, 7.1428], label: 'All Stats % Increase' },
			{ kind: 'ignore_damage', minItemLevel: 70, chance: [10.3448, 10.3448, 7.1428], maxPerItem: 2, label: '5% chance to ignore 20% of monster damage dealt' },
			{ kind: 'ignore_damage', minItemLevel: 70, chance: [10.3448, 10.3448, 7.1428], maxPerItem: 2, label: '5% chance to ignore 40% of monster damage dealt' },
			{ kind: 'hp_recovery', values: [[0, 10], [31, 20], [71, 30]], minItemLevel: 70, chance: [10.3448, 10.3448, 7.1428], label: 'Skills and Potion HP Recovery % Increase' },
			{ kind: 'decent_skill', minItemLevel: 70, chance: [6.8965, 6.8965, 7.1428], label: 'Decent Hyper Body enabled' },
		],
		legendary: [
			{ kind: 'stat_pct', stat: 'str', values: [[0, 6], [31, 9], [71, 12], [151, 13]], minItemLevel: 70, chance: [5.8823, 5.8823, 10.8108], label: 'STR % Increase' },
			{ kind: 'stat_pct', stat: 'dex', values: [[0, 6], [31, 9], [71, 12], [151, 13]], minItemLevel: 70, chance: [5.8823, 5.8823, 10.8108], label: 'DEX % Increase' },
			{ kind: 'stat_pct', stat: 'int', values: [[0, 6], [31, 9], [71, 12], [151, 13]], minItemLevel: 70, chance: [5.8823, 5.8823, 10.8108], label: 'INT % Increase' },
			{ kind: 'stat_pct', stat: 'luk', values: [[0, 6], [31, 9], [71, 12], [151, 13]], minItemLevel: 70, chance: [5.8823, 5.8823, 10.8108], label: 'LUK % Increase' },
			{ kind: 'hp_pct', values: [[0, 6], [31, 9], [71, 12]], minItemLevel: 70, chance: [8.8235, 8.8235, 10.8108], label: 'MaxHP % Increase' },
			{ kind: 'mp_pct', values: [[0, 6], [31, 9], [71, 12]], minItemLevel: 70, chance: [8.8235, 8.8235, 10.8108], label: 'MaxMP % Increase' },
			{ kind: 'def_pct', values: [[0, 6], [31, 9], [71, 12]], minItemLevel: 70, chance: [8.8235, 8.8235, 10.8108], label: 'DEF % Increase' },
			{ kind: 'all_stat_pct', values: [[0, 3], [31, 6], [71, 9], [151, 10]], minItemLevel: 70, chance: [5.8823, 5.8823, 8.1081], label: 'All Stats % Increase' },
			{ kind: 'ignore_damage', minItemLevel: 70, chance: [8.8235, 8.8235, 8.1081], maxPerItem: 2, label: '10% chance to ignore 20% of monster damage dealt' },
			{ kind: 'ignore_damage', minItemLevel: 70, chance: [8.8235, 8.8235, 8.1081], maxPerItem: 2, label: '10% chance to ignore 40% of monster damage dealt' },
			{ kind: 'other', values: [[0, 10], [31, 10], [51, 20], [70, 20], [101, 30]], minItemLevel: 70, chance: [8.8235, 8.8235, 0], label: 'Reflect damage at a chance' },
			{ kind: 'other', values: [[0, 10], [31, 10], [51, 20], [70, 20], [101, 30]], minItemLevel: 70, chance: [8.8235, 8.8235, 0], label: 'Reflect damage at a chance' },
			{ kind: 'hp_recovery', values: [[0, 20], [31, 30], [71, 40]], minItemLevel: 70, chance: [8.8235, 8.8235, 0], label: 'Skills and Potion HP Recovery % Increase' },
		],
	},
	gloves: {
		belowRare: [
			{ kind: 'stat_flat', stat: 'str', values: [[0, 1], [21, 2], [41, 3], [51, 4], [71, 5], [91, 6]], minItemLevel: 0, chance: [11.7647, 11.7647, 14.2857], label: 'STR Increase' },
			{ kind: 'stat_flat', stat: 'dex', values: [[0, 1], [21, 2], [41, 3], [51, 4], [71, 5], [91, 6]], minItemLevel: 0, chance: [11.7647, 11.7647, 14.2857], label: 'DEX Increase' },
			{ kind: 'stat_flat', stat: 'int', values: [[0, 1], [21, 2], [41, 3], [51, 4], [71, 5], [91, 6]], minItemLevel: 0, chance: [11.7647, 11.7647, 14.2857], label: 'INT Increase' },
			{ kind: 'stat_flat', stat: 'luk', values: [[0, 1], [21, 2], [41, 3], [51, 4], [71, 5], [91, 6]], minItemLevel: 0, chance: [11.7647, 11.7647, 14.2857], label: 'LUK Increase' },
			{ kind: 'hp_flat', values: [[0, 5], [11, 10], [21, 15], [31, 20], [41, 25], [51, 30], [61, 35], [71, 40], [81, 45], [91, 50], [101, 55], [111, 60]], minItemLevel: 0, chance: [17.647, 17.647, 14.2857], label: 'MaxHP Increase' },
			{ kind: 'mp_flat', values: [[0, 5], [11, 10], [21, 15], [31, 20], [41, 25], [51, 30], [61, 35], [71, 40], [81, 45], [91, 50], [101, 55], [111, 60]], minItemLevel: 0, chance: [17.647, 17.647, 14.2857], label: 'MaxMP Increase' },
			{ kind: 'def_flat', values: [[0, 5], [11, 10], [21, 15], [31, 20], [41, 25], [51, 30], [61, 35], [71, 40], [81, 45], [91, 50], [101, 55], [111, 60]], minItemLevel: 0, chance: [17.647, 17.647, 14.2857], label: 'DEF Increase' },
		],
		rare: [
			{ kind: 'stat_flat', stat: 'str', values: [[0, 2], [21, 4], [41, 6], [51, 8], [71, 10], [91, 12], [151, 13]], minItemLevel: 0, chance: [5.5555, 5.5555, 7.5], label: 'STR Increase' },
			{ kind: 'stat_flat', stat: 'dex', values: [[0, 2], [21, 4], [41, 6], [51, 8], [71, 10], [91, 12], [151, 13]], minItemLevel: 0, chance: [5.5555, 5.5555, 7.5], label: 'DEX Increase' },
			{ kind: 'stat_flat', stat: 'int', values: [[0, 2], [21, 4], [41, 6], [51, 8], [71, 10], [91, 12], [151, 13]], minItemLevel: 0, chance: [5.5555, 5.5555, 7.5], label: 'INT Increase' },
			{ kind: 'stat_flat', stat: 'luk', values: [[0, 2], [21, 4], [41, 6], [51, 8], [71, 10], [91, 12], [151, 13]], minItemLevel: 0, chance: [5.5555, 5.5555, 7.5], label: 'LUK Increase' },
			{ kind: 'hp_flat', values: [[0, 10], [11, 20], [21, 30], [31, 40], [41, 50], [51, 60], [61, 70], [71, 80], [81, 90], [91, 100], [101, 110], [111, 120], [151, 125]], minItemLevel: 0, chance: [8.3333, 8.3333, 7.5], label: 'MaxHP Increase' },
			{ kind: 'mp_flat', values: [[0, 10], [11, 20], [21, 30], [31, 40], [41, 50], [51, 60], [61, 70], [71, 80], [81, 90], [91, 100], [101, 110], [111, 120], [151, 125]], minItemLevel: 0, chance: [8.3333, 8.3333, 7.5], label: 'MaxMP Increase' },
			{ kind: 'def_flat', values: [[0, 10], [11, 20], [21, 30], [31, 40], [41, 50], [51, 60], [61, 70], [71, 80], [81, 90], [91, 100], [101, 110], [111, 120], [151, 125]], minItemLevel: 0, chance: [8.3333, 8.3333, 5], label: 'DEF Increase' },
			{ kind: 'stat_pct', stat: 'str', values: [[0, 1], [31, 2], [71, 3], [151, 4]], minItemLevel: 0, chance: [5.5555, 5.5555, 7.5], label: 'STR % Increase' },
			{ kind: 'stat_pct', stat: 'dex', values: [[0, 1], [31, 2], [71, 3], [151, 4]], minItemLevel: 0, chance: [5.5555, 5.5555, 7.5], label: 'DEX % Increase' },
			{ kind: 'stat_pct', stat: 'int', values: [[0, 1], [31, 2], [71, 3], [151, 4]], minItemLevel: 0, chance: [5.5555, 5.5555, 7.5], label: 'INT % Increase' },
			{ kind: 'stat_pct', stat: 'luk', values: [[0, 1], [31, 2], [71, 3], [151, 4]], minItemLevel: 0, chance: [5.5555, 5.5555, 7.5], label: 'LUK % Increase' },
			{ kind: 'hp_pct', values: [[0, 1], [31, 2], [71, 3], [151, 4]], minItemLevel: 0, chance: [8.3333, 8.3333, 5], label: 'MaxHP % Increase' },
			{ kind: 'mp_pct', values: [[0, 1], [31, 2], [71, 3], [151, 4]], minItemLevel: 0, chance: [8.3333, 8.3333, 5], label: 'MaxMP % Increase' },
			{ kind: 'def_pct', values: [[0, 1], [31, 2], [71, 3], [151, 4]], minItemLevel: 0, chance: [8.3333, 8.3333, 5], label: 'DEF % Increase' },
			{ kind: 'all_stat_flat', values: [[0, 1], [21, 2], [41, 3], [61, 4], [81, 5], [151, 6]], minItemLevel: 0, chance: [5.5555, 5.5555, 5], label: 'All Stats Increase' },
		],
		epic: [
			{ kind: 'stat_pct', stat: 'str', values: [[0, 2], [31, 4], [71, 6], [151, 7]], minItemLevel: 0, chance: [6.0606, 6.0606, 12.1951], label: 'STR % Increase' },
			{ kind: 'stat_pct', stat: 'dex', values: [[0, 2], [31, 4], [71, 6], [151, 7]], minItemLevel: 0, chance: [6.0606, 6.0606, 12.1951], label: 'DEX % Increase' },
			{ kind: 'stat_pct', stat: 'int', values: [[0, 2], [31, 4], [71, 6], [151, 7]], minItemLevel: 0, chance: [6.0606, 6.0606, 12.1951], label: 'INT % Increase' },
			{ kind: 'stat_pct', stat: 'luk', values: [[0, 2], [31, 4], [71, 6], [151, 7]], minItemLevel: 0, chance: [6.0606, 6.0606, 12.1951], label: 'LUK % Increase' },
			{ kind: 'hp_pct', values: [[0, 2], [31, 4], [71, 6], [151, 7]], minItemLevel: 0, chance: [9.0909, 9.0909, 12.1951], label: 'MaxHP % Increase' },
			{ kind: 'mp_pct', values: [[0, 2], [31, 4], [71, 6], [151, 7]], minItemLevel: 0, chance: [9.0909, 9.0909, 12.1951], label: 'MaxMP % Increase' },
			{ kind: 'def_pct', values: [[0, 2], [31, 4], [71, 6], [151, 7]], minItemLevel: 0, chance: [9.0909, 9.0909, 7.317], label: 'DEF % Increase' },
			{ kind: 'all_stat_pct', values: [[0, 1], [31, 2], [71, 3], [151, 4]], minItemLevel: 0, chance: [3.0303, 3.0303, 4.878], label: 'All Stats % Increase' },
			{ kind: 'ignore_damage', values: [[0, 3], [11, 5], [21, 7], [31, 9], [41, 11], [51, 13], [61, 15], [71, 17], [81, 19], [91, 21], [101, 23], [111, 25], [151, 26]], minItemLevel: 0, chance: [9.0909, 9.0909, 0], label: '20% chance to ignore monster damage dealt' },
			{ kind: 'ignore_damage', values: [[0, 5], [11, 8], [21, 11], [31, 14], [41, 17], [51, 20], [61, 23], [71, 26], [81, 29], [91, 32], [101, 35], [111, 38], [151, 39]], minItemLevel: 0, chance: [9.0909, 9.0909, 0], label: '20% chance to ignore monster damage dealt' },
			{ kind: 'ignore_damage', values: [[0, 7], [11, 11], [21, 15], [31, 19], [41, 23], [51, 27], [61, 31], [71, 35], [81, 39], [91, 43], [101, 47], [111, 51], [151, 53]], minItemLevel: 0, chance: [9.0909, 9.0909, 0], label: '30% chance to ignore monster damage dealt' },
			{ kind: 'other', values: [[0, 40], [11, 45], [21, 50], [31, 55], [41, 60], [51, 65], [61, 70], [71, 75], [81, 80], [91, 85], [101, 90], [111, 95], [151, 97]], minItemLevel: 0, chance: [9.0909, 9.0909, 7.317], label: '15% chance to recover HP when you killed a monster' },
			{ kind: 'other', values: [[0, 40], [11, 45], [21, 50], [31, 55], [41, 60], [51, 65], [61, 70], [71, 75], [81, 80], [91, 85], [101, 90], [111, 95], [151, 97]], minItemLevel: 0, chance: [9.0909, 9.0909, 7.317], label: '15% chance to recover MP when you killed a monster' },
		],
		unique: [
			{ kind: 'stat_pct', stat: 'str', values: [[0, 3], [31, 6], [71, 9], [151, 10]], minItemLevel: 120, chance: [4.2553, 5.7142, 8.3333], label: 'STR % Increase' },
			{ kind: 'stat_pct', stat: 'dex', values: [[0, 3], [31, 6], [71, 9], [151, 10]], minItemLevel: 120, chance: [4.2553, 5.7142, 8.3333], label: 'DEX % Increase' },
			{ kind: 'stat_pct', stat: 'int', values: [[0, 3], [31, 6], [71, 9], [151, 10]], minItemLevel: 120, chance: [4.2553, 5.7142, 8.3333], label: 'INT % Increase' },
			{ kind: 'stat_pct', stat: 'luk', values: [[0, 3], [31, 6], [71, 9], [151, 10]], minItemLevel: 120, chance: [4.2553, 5.7142, 8.3333], label: 'LUK % Increase' },
			{ kind: 'hp_pct', values: [[0, 3], [31, 6], [71, 9]], minItemLevel: 120, chance: [6.3829, 8.5714, 10], label: 'MaxHP % Increase' },
			{ kind: 'mp_pct', values: [[0, 3], [31, 6], [71, 9]], minItemLevel: 120, chance: [6.3829, 8.5714, 10], label: 'MaxMP % Increase' },
			{ kind: 'def_pct', values: [[0, 3], [31, 6], [71, 9]], minItemLevel: 120, chance: [6.3829, 8.5714, 6.6666], label: 'DEF % Increase' },
			{ kind: 'all_stat_pct', values: [[0, 2], [31, 4], [71, 6], [151, 7]], minItemLevel: 120, chance: [2.1276, 2.8571, 6.6666], label: 'All Stats % Increase' },
			{ kind: 'stat_per_10_levels', stat: 'str', value: 1, minItemLevel: 120, chance: [6.3829, 0, 1.6666], label: 'STR +1 per 10 Character Levels' },
			{ kind: 'stat_per_10_levels', stat: 'dex', value: 1, minItemLevel: 120, chance: [6.3829, 0, 1.6666], label: 'DEX +1 per 10 Character Levels' },
			{ kind: 'stat_per_10_levels', stat: 'int', value: 1, minItemLevel: 120, chance: [6.3829, 0, 1.6666], label: 'INT +1 per 10 Character Levels' },
			{ kind: 'stat_per_10_levels', stat: 'luk', value: 1, minItemLevel: 120, chance: [6.3829, 0, 1.6666], label: 'LUK +1 per 10 Character Levels' },
			{ kind: 'ignore_damage', minItemLevel: 120, chance: [6.3829, 8.5714, 6.6666], maxPerItem: 2, label: '5% chance to ignore 20% of monster damage dealt' },
			{ kind: 'ignore_damage', minItemLevel: 120, chance: [6.3829, 8.5714, 6.6666], maxPerItem: 2, label: '5% chance to ignore 40% of monster damage dealt' },
			{ kind: 'hp_recovery', values: [[0, 10], [31, 20], [71, 30]], minItemLevel: 120, chance: [6.3829, 8.5714, 6.6666], label: 'Skills and Potion HP Recovery % Increase' },
			{ kind: 'auto_steal', value: 1, minItemLevel: 120, chance: [6.3829, 8.5714, 0], label: '1% Auto Steal Chance' },
			{ kind: 'auto_steal', value: 2, minItemLevel: 120, chance: [6.3829, 8.5714, 0], label: '2% Auto Steal Chance' },
			{ kind: 'decent_skill', minItemLevel: 120, chance: [4.2553, 5.7142, 6.6666], label: 'Decent Sharp Eyes enabled' },
		],
		legendary: [
			{ kind: 'stat_pct', stat: 'str', values: [[0, 6], [31, 9], [71, 12], [151, 13]], minItemLevel: 120, chance: [4.5454, 4.5454, 9.0909], label: 'STR % Increase' },
			{ kind: 'stat_pct', stat: 'dex', values: [[0, 6], [31, 9], [71, 12], [151, 13]], minItemLevel: 120, chance: [4.5454, 4.5454, 9.0909], label: 'DEX % Increase' },
			{ kind: 'stat_pct', stat: 'int', values: [[0, 6], [31, 9], [71, 12], [151, 13]], minItemLevel: 120, chance: [4.5454, 4.5454, 9.0909], label: 'INT % Increase' },
			{ kind: 'stat_pct', stat: 'luk', values: [[0, 6], [31, 9], [71, 12], [151, 13]], minItemLevel: 120, chance: [4.5454, 4.5454, 9.0909], label: 'LUK % Increase' },
			{ kind: 'hp_pct', values: [[0, 6], [31, 9], [71, 12]], minItemLevel: 120, chance: [6.8181, 6.8181, 9.0909], label: 'MaxHP % Increase' },
			{ kind: 'mp_pct', values: [[0, 6], [31, 9], [71, 12]], minItemLevel: 120, chance: [6.8181, 6.8181, 9.0909], label: 'MaxMP % Increase' },
			{ kind: 'def_pct', values: [[0, 6], [31, 9], [71, 12]], minItemLevel: 120, chance: [6.8181, 6.8181, 9.0909], label: 'DEF % Increase' },
			{ kind: 'crit_dmg', values: [[50, 5], [61, 6], [81, 8]], minItemLevel: 120, chance: [9.0909, 9.0909, 9.0909], label: 'Critical Damage % Increase' },
			{ kind: 'all_stat_pct', values: [[0, 3], [31, 6], [71, 9], [151, 10]], minItemLevel: 120, chance: [4.5454, 4.5454, 6.8181], label: 'All Stats % Increase' },
			{ kind: 'ignore_damage', minItemLevel: 120, chance: [6.8181, 6.8181, 6.8181], maxPerItem: 2, label: '10% chance to ignore 20% of monster damage dealt' },
			{ kind: 'ignore_damage', minItemLevel: 120, chance: [6.8181, 6.8181, 6.8181], maxPerItem: 2, label: '10% chance to ignore 40% of monster damage dealt' },
			{ kind: 'hp_recovery', values: [[0, 20], [31, 30], [71, 40]], minItemLevel: 120, chance: [6.8181, 6.8181, 0], label: 'Skills and Potion HP Recovery % Increase' },
			{ kind: 'auto_steal', value: 3, minItemLevel: 120, chance: [6.8181, 6.8181, 0], label: '3% Auto Steal Chance' },
			{ kind: 'auto_steal', value: 5, minItemLevel: 120, chance: [6.8181, 6.8181, 0], label: '5% Auto Steal Chance' },
			{ kind: 'auto_steal', value: 7, minItemLevel: 120, chance: [6.8181, 6.8181, 0], label: '7% Auto Steal Chance' },
			{ kind: 'decent_skill', minItemLevel: 120, chance: [6.8181, 6.8181, 6.8181], label: 'Decent Speed Infusion enabled' },
		],
	},
	shoes: {
		belowRare: [
			{ kind: 'stat_flat', stat: 'str', values: [[0, 1], [21, 2], [41, 3], [51, 4], [71, 5], [91, 6]], minItemLevel: 0, chance: [8.6956, 8.6956, 12], label: 'STR Increase' },
			{ kind: 'stat_flat', stat: 'dex', values: [[0, 1], [21, 2], [41, 3], [51, 4], [71, 5], [91, 6]], minItemLevel: 0, chance: [8.6956, 8.6956, 12], label: 'DEX Increase' },
			{ kind: 'stat_flat', stat: 'int', values: [[0, 1], [21, 2], [41, 3], [51, 4], [71, 5], [91, 6]], minItemLevel: 0, chance: [8.6956, 8.6956, 12], label: 'INT Increase' },
			{ kind: 'stat_flat', stat: 'luk', values: [[0, 1], [21, 2], [41, 3], [51, 4], [71, 5], [91, 6]], minItemLevel: 0, chance: [8.6956, 8.6956, 12], label: 'LUK Increase' },
			{ kind: 'hp_flat', values: [[0, 5], [11, 10], [21, 15], [31, 20], [41, 25], [51, 30], [61, 35], [71, 40], [81, 45], [91, 50], [101, 55], [111, 60]], minItemLevel: 0, chance: [13.0434, 13.0434, 12], label: 'MaxHP Increase' },
			{ kind: 'mp_flat', values: [[0, 5], [11, 10], [21, 15], [31, 20], [41, 25], [51, 30], [61, 35], [71, 40], [81, 45], [91, 50], [101, 55], [111, 60]], minItemLevel: 0, chance: [13.0434, 13.0434, 12], label: 'MaxMP Increase' },
			{ kind: 'speed', values: [[0, 1], [31, 2], [71, 3], [111, 4]], minItemLevel: 0, chance: [13.0434, 13.0434, 8], label: 'Speed Increase' },
			{ kind: 'jump', values: [[0, 1], [31, 2], [71, 3], [111, 4]], minItemLevel: 0, chance: [13.0434, 13.0434, 8], label: 'Jump Increase' },
			{ kind: 'def_flat', values: [[0, 5], [11, 10], [21, 15], [31, 20], [41, 25], [51, 30], [61, 35], [71, 40], [81, 45], [91, 50], [101, 55], [111, 60]], minItemLevel: 0, chance: [13.0434, 13.0434, 12], label: 'DEF Increase' },
		],
		rare: [
			{ kind: 'stat_flat', stat: 'str', values: [[0, 2], [21, 4], [41, 6], [51, 8], [71, 10], [91, 12], [151, 13]], minItemLevel: 0, chance: [4.7619, 4.7619, 6.8181], label: 'STR Increase' },
			{ kind: 'stat_flat', stat: 'dex', values: [[0, 2], [21, 4], [41, 6], [51, 8], [71, 10], [91, 12], [151, 13]], minItemLevel: 0, chance: [4.7619, 4.7619, 6.8181], label: 'DEX Increase' },
			{ kind: 'stat_flat', stat: 'int', values: [[0, 2], [21, 4], [41, 6], [51, 8], [71, 10], [91, 12], [151, 13]], minItemLevel: 0, chance: [4.7619, 4.7619, 6.8181], label: 'INT Increase' },
			{ kind: 'stat_flat', stat: 'luk', values: [[0, 2], [21, 4], [41, 6], [51, 8], [71, 10], [91, 12], [151, 13]], minItemLevel: 0, chance: [4.7619, 4.7619, 6.8181], label: 'LUK Increase' },
			{ kind: 'hp_flat', values: [[0, 10], [11, 20], [21, 30], [31, 40], [41, 50], [51, 60], [61, 70], [71, 80], [81, 90], [91, 100], [101, 110], [111, 120], [151, 125]], minItemLevel: 0, chance: [7.1428, 7.1428, 6.8181], label: 'MaxHP Increase' },
			{ kind: 'mp_flat', values: [[0, 10], [11, 20], [21, 30], [31, 40], [41, 50], [51, 60], [61, 70], [71, 80], [81, 90], [91, 100], [101, 110], [111, 120], [151, 125]], minItemLevel: 0, chance: [7.1428, 7.1428, 6.8181], label: 'MaxMP Increase' },
			{ kind: 'speed', values: [[0, 2], [31, 4], [71, 6], [111, 8]], minItemLevel: 0, chance: [7.1428, 7.1428, 4.5454], label: 'Speed Increase' },
			{ kind: 'jump', values: [[0, 2], [31, 4], [71, 6], [111, 8]], minItemLevel: 0, chance: [7.1428, 7.1428, 4.5454], label: 'Jump Increase' },
			{ kind: 'def_flat', values: [[0, 10], [11, 20], [21, 30], [31, 40], [41, 50], [51, 60], [61, 70], [71, 80], [81, 90], [91, 100], [101, 110], [111, 120], [151, 125]], minItemLevel: 0, chance: [7.1428, 7.1428, 4.5454], label: 'DEF Increase' },
			{ kind: 'stat_pct', stat: 'str', values: [[0, 1], [31, 2], [71, 3], [151, 4]], minItemLevel: 0, chance: [4.7619, 4.7619, 6.8181], label: 'STR % Increase' },
			{ kind: 'stat_pct', stat: 'dex', values: [[0, 1], [31, 2], [71, 3], [151, 4]], minItemLevel: 0, chance: [4.7619, 4.7619, 6.8181], label: 'DEX % Increase' },
			{ kind: 'stat_pct', stat: 'int', values: [[0, 1], [31, 2], [71, 3], [151, 4]], minItemLevel: 0, chance: [4.7619, 4.7619, 6.8181], label: 'INT % Increase' },
			{ kind: 'stat_pct', stat: 'luk', values: [[0, 1], [31, 2], [71, 3], [151, 4]], minItemLevel: 0, chance: [4.7619, 4.7619, 6.8181], label: 'LUK % Increase' },
			{ kind: 'hp_pct', values: [[0, 1], [31, 2], [71, 3], [151, 4]], minItemLevel: 0, chance: [7.1428, 7.1428, 4.5454], label: 'MaxHP % Increase' },
			{ kind: 'mp_pct', values: [[0, 1], [31, 2], [71, 3], [151, 4]], minItemLevel: 0, chance: [7.1428, 7.1428, 4.5454], label: 'MaxMP % Increase' },
			{ kind: 'def_pct', values: [[0, 1], [31, 2], [71, 3], [151, 4]], minItemLevel: 0, chance: [7.1428, 7.1428, 4.5454], label: 'DEF % Increase' },
			{ kind: 'all_stat_flat', values: [[0, 1], [21, 2], [41, 3], [61, 4], [81, 5], [151, 6]], minItemLevel: 0, chance: [4.7619, 4.7619, 4.5454], label: 'All Stats Increase' },
		],
		epic: [
			{ kind: 'stat_pct', stat: 'str', values: [[0, 2], [31, 4], [71, 6], [151, 7]], minItemLevel: 0, chance: [7.4074, 7.4074, 14.2857], label: 'STR % Increase' },
			{ kind: 'stat_pct', stat: 'dex', values: [[0, 2], [31, 4], [71, 6], [151, 7]], minItemLevel: 0, chance: [7.4074, 7.4074, 14.2857], label: 'DEX % Increase' },
			{ kind: 'stat_pct', stat: 'int', values: [[0, 2], [31, 4], [71, 6], [151, 7]], minItemLevel: 0, chance: [7.4074, 7.4074, 14.2857], label: 'INT % Increase' },
			{ kind: 'stat_pct', stat: 'luk', values: [[0, 2], [31, 4], [71, 6], [151, 7]], minItemLevel: 0, chance: [7.4074, 7.4074, 14.2857], label: 'LUK % Increase' },
			{ kind: 'hp_pct', values: [[0, 2], [31, 4], [71, 6], [151, 7]], minItemLevel: 0, chance: [11.1111, 11.1111, 14.2857], label: 'MaxHP % Increase' },
			{ kind: 'mp_pct', values: [[0, 2], [31, 4], [71, 6], [151, 7]], minItemLevel: 0, chance: [11.1111, 11.1111, 14.2857], label: 'MaxMP % Increase' },
			{ kind: 'def_pct', values: [[0, 2], [31, 4], [71, 6], [151, 7]], minItemLevel: 0, chance: [11.1111, 11.1111, 8.5714], label: 'DEF % Increase' },
			{ kind: 'all_stat_pct', values: [[0, 1], [31, 2], [71, 3], [151, 4]], minItemLevel: 0, chance: [3.7037, 3.7037, 5.7142], label: 'All Stats % Increase' },
			{ kind: 'ignore_damage', values: [[0, 3], [11, 5], [21, 7], [31, 9], [41, 11], [51, 13], [61, 15], [71, 17], [81, 19], [91, 21], [101, 23], [111, 25], [151, 26]], minItemLevel: 0, chance: [11.1111, 11.1111, 0], label: '20% chance to ignore monster damage dealt' },
			{ kind: 'ignore_damage', values: [[0, 5], [11, 8], [21, 11], [31, 14], [41, 17], [51, 20], [61, 23], [71, 26], [81, 29], [91, 32], [101, 35], [111, 38], [151, 39]], minItemLevel: 0, chance: [11.1111, 11.1111, 0], label: '20% chance to ignore monster damage dealt' },
			{ kind: 'ignore_damage', values: [[0, 7], [11, 11], [21, 15], [31, 19], [41, 23], [51, 27], [61, 31], [71, 35], [81, 39], [91, 43], [101, 47], [111, 51], [151, 53]], minItemLevel: 0, chance: [11.1111, 11.1111, 0], label: '30% chance to ignore monster damage dealt' },
		],
		unique: [
			{ kind: 'stat_pct', stat: 'str', values: [[0, 3], [31, 6], [71, 9], [151, 10]], minItemLevel: 70, chance: [6.8965, 6.8965, 8.9285], label: 'STR % Increase' },
			{ kind: 'stat_pct', stat: 'dex', values: [[0, 3], [31, 6], [71, 9], [151, 10]], minItemLevel: 70, chance: [6.8965, 6.8965, 8.9285], label: 'DEX % Increase' },
			{ kind: 'stat_pct', stat: 'int', values: [[0, 3], [31, 6], [71, 9], [151, 10]], minItemLevel: 70, chance: [6.8965, 6.8965, 8.9285], label: 'INT % Increase' },
			{ kind: 'stat_pct', stat: 'luk', values: [[0, 3], [31, 6], [71, 9], [151, 10]], minItemLevel: 70, chance: [6.8965, 6.8965, 8.9285], label: 'LUK % Increase' },
			{ kind: 'hp_pct', values: [[0, 3], [31, 6], [71, 9]], minItemLevel: 70, chance: [10.3448, 10.3448, 10.7142], label: 'MaxHP % Increase' },
			{ kind: 'mp_pct', values: [[0, 3], [31, 6], [71, 9]], minItemLevel: 70, chance: [10.3448, 10.3448, 10.7142], label: 'MaxMP % Increase' },
			{ kind: 'def_pct', values: [[0, 3], [31, 6], [71, 9]], minItemLevel: 70, chance: [10.3448, 10.3448, 7.1428], label: 'DEF % Increase' },
			{ kind: 'all_stat_pct', values: [[0, 2], [31, 4], [71, 6], [151, 7]], minItemLevel: 70, chance: [3.4482, 3.4482, 7.1428], label: 'All Stats % Increase' },
			{ kind: 'ignore_damage', minItemLevel: 70, chance: [10.3448, 10.3448, 7.1428], maxPerItem: 2, label: '5% chance to ignore 20% of monster damage dealt' },
			{ kind: 'ignore_damage', minItemLevel: 70, chance: [10.3448, 10.3448, 7.1428], maxPerItem: 2, label: '5% chance to ignore 40% of monster damage dealt' },
			{ kind: 'hp_recovery', values: [[0, 10], [31, 20], [71, 30]], minItemLevel: 70, chance: [10.3448, 10.3448, 7.1428], label: 'Skills and Potion HP Recovery % Increase' },
			{ kind: 'decent_skill', minItemLevel: 70, chance: [6.8965, 6.8965, 7.1428], label: 'Decent Haste enabled' },
		],
		legendary: [
			{ kind: 'stat_pct', stat: 'str', values: [[0, 6], [31, 9], [71, 12], [151, 13]], minItemLevel: 70, chance: [6.4516, 6.4516, 10], label: 'STR % Increase' },
			{ kind: 'stat_pct', stat: 'dex', values: [[0, 6], [31, 9], [71, 12], [151, 13]], minItemLevel: 70, chance: [6.4516, 6.4516, 10], label: 'DEX % Increase' },
			{ kind: 'stat_pct', stat: 'int', values: [[0, 6], [31, 9], [71, 12], [151, 13]], minItemLevel: 70, chance: [6.4516, 6.4516, 10], label: 'INT % Increase' },
			{ kind: 'stat_pct', stat: 'luk', values: [[0, 6], [31, 9], [71, 12], [151, 13]], minItemLevel: 70, chance: [6.4516, 6.4516, 10], label: 'LUK % Increase' },
			{ kind: 'hp_pct', values: [[0, 6], [31, 9], [71, 12]], minItemLevel: 70, chance: [9.6774, 9.6774, 10], label: 'MaxHP % Increase' },
			{ kind: 'mp_pct', values: [[0, 6], [31, 9], [71, 12]], minItemLevel: 70, chance: [9.6774, 9.6774, 10], label: 'MaxMP % Increase' },
			{ kind: 'def_pct', values: [[0, 6], [31, 9], [71, 12]], minItemLevel: 70, chance: [9.6774, 9.6774, 10], label: 'DEF % Increase' },
			{ kind: 'all_stat_pct', values: [[0, 3], [31, 6], [71, 9], [151, 10]], minItemLevel: 70, chance: [6.4516, 6.4516, 7.5], label: 'All Stats % Increase' },
			{ kind: 'ignore_damage', minItemLevel: 70, chance: [9.6774, 9.6774, 7.5], maxPerItem: 2, label: '10% chance to ignore 20% of monster damage dealt' },
			{ kind: 'ignore_damage', minItemLevel: 70, chance: [9.6774, 9.6774, 7.5], maxPerItem: 2, label: '10% chance to ignore 40% of monster damage dealt' },
			{ kind: 'hp_recovery', values: [[0, 20], [31, 30], [71, 40]], minItemLevel: 70, chance: [9.6774, 9.6774, 0], label: 'Skills and Potion HP Recovery % Increase' },
			{ kind: 'decent_skill', minItemLevel: 70, chance: [9.6774, 9.6774, 7.5], label: 'Decent Combat Orders enabled' },
		],
	},
	capeBeltShoulder: {
		belowRare: [
			{ kind: 'stat_flat', stat: 'str', values: [[0, 1], [21, 2], [41, 3], [51, 4], [71, 5], [91, 6]], minItemLevel: 0, chance: [11.7647, 11.7647, 14.2857], label: 'STR Increase' },
			{ kind: 'stat_flat', stat: 'dex', values: [[0, 1], [21, 2], [41, 3], [51, 4], [71, 5], [91, 6]], minItemLevel: 0, chance: [11.7647, 11.7647, 14.2857], label: 'DEX Increase' },
			{ kind: 'stat_flat', stat: 'int', values: [[0, 1], [21, 2], [41, 3], [51, 4], [71, 5], [91, 6]], minItemLevel: 0, chance: [11.7647, 11.7647, 14.2857], label: 'INT Increase' },
			{ kind: 'stat_flat', stat: 'luk', values: [[0, 1], [21, 2], [41, 3], [51, 4], [71, 5], [91, 6]], minItemLevel: 0, chance: [11.7647, 11.7647, 14.2857], label: 'LUK Increase' },
			{ kind: 'hp_flat', values: [[0, 5], [11, 10], [21, 15], [31, 20], [41, 25], [51, 30], [61, 35], [71, 40], [81, 45], [91, 50], [101, 55], [111, 60]], minItemLevel: 0, chance: [17.647, 17.647, 14.2857], label: 'MaxHP Increase' },
			{ kind: 'mp_flat', values: [[0, 5], [11, 10], [21, 15], [31, 20], [41, 25], [51, 30], [61, 35], [71, 40], [81, 45], [91, 50], [101, 55], [111, 60]], minItemLevel: 0, chance: [17.647, 17.647, 14.2857], label: 'MaxMP Increase' },
			{ kind: 'def_flat', values: [[0, 5], [11, 10], [21, 15], [31, 20], [41, 25], [51, 30], [61, 35], [71, 40], [81, 45], [91, 50], [101, 55], [111, 60]], minItemLevel: 0, chance: [17.647, 17.647, 14.2857], label: 'DEF Increase' },
		],
		rare: [
			{ kind: 'stat_flat', stat: 'str', values: [[0, 2], [21, 4], [41, 6], [51, 8], [71, 10], [91, 12], [151, 13]], minItemLevel: 0, chance: [5.5555, 5.5555, 7.5], label: 'STR Increase' },
			{ kind: 'stat_flat', stat: 'dex', values: [[0, 2], [21, 4], [41, 6], [51, 8], [71, 10], [91, 12], [151, 13]], minItemLevel: 0, chance: [5.5555, 5.5555, 7.5], label: 'DEX Increase' },
			{ kind: 'stat_flat', stat: 'int', values: [[0, 2], [21, 4], [41, 6], [51, 8], [71, 10], [91, 12], [151, 13]], minItemLevel: 0, chance: [5.5555, 5.5555, 7.5], label: 'INT Increase' },
			{ kind: 'stat_flat', stat: 'luk', values: [[0, 2], [21, 4], [41, 6], [51, 8], [71, 10], [91, 12], [151, 13]], minItemLevel: 0, chance: [5.5555, 5.5555, 7.5], label: 'LUK Increase' },
			{ kind: 'hp_flat', values: [[0, 10], [11, 20], [21, 30], [31, 40], [41, 50], [51, 60], [61, 70], [71, 80], [81, 90], [91, 100], [101, 110], [111, 120], [151, 125]], minItemLevel: 0, chance: [8.3333, 8.3333, 7.5], label: 'MaxHP Increase' },
			{ kind: 'mp_flat', values: [[0, 10], [11, 20], [21, 30], [31, 40], [41, 50], [51, 60], [61, 70], [71, 80], [81, 90], [91, 100], [101, 110], [111, 120], [151, 125]], minItemLevel: 0, chance: [8.3333, 8.3333, 7.5], label: 'MaxMP Increase' },
			{ kind: 'def_flat', values: [[0, 10], [11, 20], [21, 30], [31, 40], [41, 50], [51, 60], [61, 70], [71, 80], [81, 90], [91, 100], [101, 110], [111, 120], [151, 125]], minItemLevel: 0, chance: [8.3333, 8.3333, 5], label: 'DEF Increase' },
			{ kind: 'stat_pct', stat: 'str', values: [[0, 1], [31, 2], [71, 3], [151, 4]], minItemLevel: 0, chance: [5.5555, 5.5555, 7.5], label: 'STR % Increase' },
			{ kind: 'stat_pct', stat: 'dex', values: [[0, 1], [31, 2], [71, 3], [151, 4]], minItemLevel: 0, chance: [5.5555, 5.5555, 7.5], label: 'DEX % Increase' },
			{ kind: 'stat_pct', stat: 'int', values: [[0, 1], [31, 2], [71, 3], [151, 4]], minItemLevel: 0, chance: [5.5555, 5.5555, 7.5], label: 'INT % Increase' },
			{ kind: 'stat_pct', stat: 'luk', values: [[0, 1], [31, 2], [71, 3], [151, 4]], minItemLevel: 0, chance: [5.5555, 5.5555, 7.5], label: 'LUK % Increase' },
			{ kind: 'hp_pct', values: [[0, 1], [31, 2], [71, 3], [151, 4]], minItemLevel: 0, chance: [8.3333, 8.3333, 5], label: 'MaxHP % Increase' },
			{ kind: 'mp_pct', values: [[0, 1], [31, 2], [71, 3], [151, 4]], minItemLevel: 0, chance: [8.3333, 8.3333, 5], label: 'MaxMP % Increase' },
			{ kind: 'def_pct', values: [[0, 1], [31, 2], [71, 3], [151, 4]], minItemLevel: 0, chance: [8.3333, 8.3333, 5], label: 'DEF % Increase' },
			{ kind: 'all_stat_flat', values: [[0, 1], [21, 2], [41, 3], [61, 4], [81, 5], [151, 6]], minItemLevel: 0, chance: [5.5555, 5.5555, 5], label: 'All Stats Increase' },
		],
		epic: [
			{ kind: 'stat_pct', stat: 'str', values: [[0, 2], [31, 4], [71, 6], [151, 7]], minItemLevel: 0, chance: [7.4074, 7.4074, 14.2857], label: 'STR % Increase' },
			{ kind: 'stat_pct', stat: 'dex', values: [[0, 2], [31, 4], [71, 6], [151, 7]], minItemLevel: 0, chance: [7.4074, 7.4074, 14.2857], label: 'DEX % Increase' },
			{ kind: 'stat_pct', stat: 'int', values: [[0, 2], [31, 4], [71, 6], [151, 7]], minItemLevel: 0, chance: [7.4074, 7.4074, 14.2857], label: 'INT % Increase' },
			{ kind: 'stat_pct', stat: 'luk', values: [[0, 2], [31, 4], [71, 6], [151, 7]], minItemLevel: 0, chance: [7.4074, 7.4074, 14.2857], label: 'LUK % Increase' },
			{ kind: 'hp_pct', values: [[0, 2], [31, 4], [71, 6], [151, 7]], minItemLevel: 0, chance: [11.1111, 11.1111, 14.2857], label: 'MaxHP % Increase' },
			{ kind: 'mp_pct', values: [[0, 2], [31, 4], [71, 6], [151, 7]], minItemLevel: 0, chance: [11.1111, 11.1111, 14.2857], label: 'MaxMP % Increase' },
			{ kind: 'def_pct', values: [[0, 2], [31, 4], [71, 6], [151, 7]], minItemLevel: 0, chance: [11.1111, 11.1111, 8.5714], label: 'DEF % Increase' },
			{ kind: 'all_stat_pct', values: [[0, 1], [31, 2], [71, 3], [151, 4]], minItemLevel: 0, chance: [3.7037, 3.7037, 5.7142], label: 'All Stats % Increase' },
			{ kind: 'ignore_damage', values: [[0, 3], [11, 5], [21, 7], [31, 9], [41, 11], [51, 13], [61, 15], [71, 17], [81, 19], [91, 21], [101, 23], [111, 25], [151, 26]], minItemLevel: 0, chance: [11.1111, 11.1111, 0], label: '20% chance to ignore monster damage dealt' },
			{ kind: 'ignore_damage', values: [[0, 5], [11, 8], [21, 11], [31, 14], [41, 17], [51, 20], [61, 23], [71, 26], [81, 29], [91, 32], [101, 35], [111, 38], [151, 39]], minItemLevel: 0, chance: [11.1111, 11.1111, 0], label: '20% chance to ignore monster damage dealt' },
			{ kind: 'ignore_damage', values: [[0, 7], [11, 11], [21, 15], [31, 19], [41, 23], [51, 27], [61, 31], [71, 35], [81, 39], [91, 43], [101, 47], [111, 51], [151, 53]], minItemLevel: 0, chance: [11.1111, 11.1111, 0], label: '30% chance to ignore monster damage dealt' },
		],
		unique: [
			{ kind: 'stat_pct', stat: 'str', values: [[0, 3], [31, 6], [71, 9], [151, 10]], minItemLevel: 40, chance: [7.4074, 7.4074, 9.6153], label: 'STR % Increase' },
			{ kind: 'stat_pct', stat: 'dex', values: [[0, 3], [31, 6], [71, 9], [151, 10]], minItemLevel: 40, chance: [7.4074, 7.4074, 9.6153], label: 'DEX % Increase' },
			{ kind: 'stat_pct', stat: 'int', values: [[0, 3], [31, 6], [71, 9], [151, 10]], minItemLevel: 40, chance: [7.4074, 7.4074, 9.6153], label: 'INT % Increase' },
			{ kind: 'stat_pct', stat: 'luk', values: [[0, 3], [31, 6], [71, 9], [151, 10]], minItemLevel: 40, chance: [7.4074, 7.4074, 9.6153], label: 'LUK % Increase' },
			{ kind: 'hp_pct', values: [[0, 3], [31, 6], [71, 9]], minItemLevel: 40, chance: [11.1111, 11.1111, 11.5384], label: 'MaxHP % Increase' },
			{ kind: 'mp_pct', values: [[0, 3], [31, 6], [71, 9]], minItemLevel: 40, chance: [11.1111, 11.1111, 11.5384], label: 'MaxMP % Increase' },
			{ kind: 'def_pct', values: [[0, 3], [31, 6], [71, 9]], minItemLevel: 40, chance: [11.1111, 11.1111, 7.6923], label: 'DEF % Increase' },
			{ kind: 'all_stat_pct', values: [[0, 2], [31, 4], [71, 6], [151, 7]], minItemLevel: 40, chance: [3.7037, 3.7037, 7.6923], label: 'All Stats % Increase' },
			{ kind: 'ignore_damage', minItemLevel: 40, chance: [11.1111, 11.1111, 7.6923], maxPerItem: 2, label: '5% chance to ignore 20% of monster damage dealt' },
			{ kind: 'ignore_damage', minItemLevel: 40, chance: [11.1111, 11.1111, 7.6923], maxPerItem: 2, label: '5% chance to ignore 40% of monster damage dealt' },
			{ kind: 'hp_recovery', values: [[0, 10], [31, 20], [71, 30]], minItemLevel: 40, chance: [11.1111, 11.1111, 7.6923], label: 'Skills and Potion HP Recovery % Increase' },
		],
		legendary: [
			{ kind: 'stat_pct', stat: 'str', values: [[0, 6], [31, 9], [71, 12], [151, 13]], minItemLevel: 40, chance: [7.1428, 7.1428, 10.8108], label: 'STR % Increase' },
			{ kind: 'stat_pct', stat: 'dex', values: [[0, 6], [31, 9], [71, 12], [151, 13]], minItemLevel: 40, chance: [7.1428, 7.1428, 10.8108], label: 'DEX % Increase' },
			{ kind: 'stat_pct', stat: 'int', values: [[0, 6], [31, 9], [71, 12], [151, 13]], minItemLevel: 40, chance: [7.1428, 7.1428, 10.8108], label: 'INT % Increase' },
			{ kind: 'stat_pct', stat: 'luk', values: [[0, 6], [31, 9], [71, 12], [151, 13]], minItemLevel: 40, chance: [7.1428, 7.1428, 10.8108], label: 'LUK % Increase' },
			{ kind: 'hp_pct', values: [[0, 6], [31, 9], [71, 12]], minItemLevel: 40, chance: [10.7142, 10.7142, 10.8108], label: 'MaxHP % Increase' },
			{ kind: 'mp_pct', values: [[0, 6], [31, 9], [71, 12]], minItemLevel: 40, chance: [10.7142, 10.7142, 10.8108], label: 'MaxMP % Increase' },
			{ kind: 'def_pct', values: [[0, 6], [31, 9], [71, 12]], minItemLevel: 40, chance: [10.7142, 10.7142, 10.8108], label: 'DEF % Increase' },
			{ kind: 'all_stat_pct', values: [[0, 3], [31, 6], [71, 9], [151, 10]], minItemLevel: 40, chance: [7.1428, 7.1428, 8.1081], label: 'All Stats % Increase' },
			{ kind: 'ignore_damage', minItemLevel: 40, chance: [10.7142, 10.7142, 8.1081], maxPerItem: 2, label: '10% chance to ignore 20% of monster damage dealt' },
			{ kind: 'ignore_damage', minItemLevel: 40, chance: [10.7142, 10.7142, 8.1081], maxPerItem: 2, label: '10% chance to ignore 40% of monster damage dealt' },
			{ kind: 'hp_recovery', values: [[0, 20], [31, 30], [71, 40]], minItemLevel: 40, chance: [10.7142, 10.7142, 0], label: 'Skills and Potion HP Recovery % Increase' },
		],
	},
	accessory: {
		belowRare: [
			{ kind: 'stat_flat', stat: 'str', values: [[0, 1], [21, 2], [41, 3], [51, 4], [71, 5], [91, 6]], minItemLevel: 0, chance: [11.7647, 11.7647, 14.2857], label: 'STR Increase' },
			{ kind: 'stat_flat', stat: 'dex', values: [[0, 1], [21, 2], [41, 3], [51, 4], [71, 5], [91, 6]], minItemLevel: 0, chance: [11.7647, 11.7647, 14.2857], label: 'DEX Increase' },
			{ kind: 'stat_flat', stat: 'int', values: [[0, 1], [21, 2], [41, 3], [51, 4], [71, 5], [91, 6]], minItemLevel: 0, chance: [11.7647, 11.7647, 14.2857], label: 'INT Increase' },
			{ kind: 'stat_flat', stat: 'luk', values: [[0, 1], [21, 2], [41, 3], [51, 4], [71, 5], [91, 6]], minItemLevel: 0, chance: [11.7647, 11.7647, 14.2857], label: 'LUK Increase' },
			{ kind: 'hp_flat', values: [[0, 5], [11, 10], [21, 15], [31, 20], [41, 25], [51, 30], [61, 35], [71, 40], [81, 45], [91, 50], [101, 55], [111, 60]], minItemLevel: 0, chance: [17.647, 17.647, 14.2857], label: 'MaxHP Increase' },
			{ kind: 'mp_flat', values: [[0, 5], [11, 10], [21, 15], [31, 20], [41, 25], [51, 30], [61, 35], [71, 40], [81, 45], [91, 50], [101, 55], [111, 60]], minItemLevel: 0, chance: [17.647, 17.647, 14.2857], label: 'MaxMP Increase' },
			{ kind: 'def_flat', values: [[0, 5], [11, 10], [21, 15], [31, 20], [41, 25], [51, 30], [61, 35], [71, 40], [81, 45], [91, 50], [101, 55], [111, 60]], minItemLevel: 0, chance: [17.647, 17.647, 14.2857], label: 'DEF Increase' },
		],
		rare: [
			{ kind: 'stat_flat', stat: 'str', values: [[0, 2], [21, 4], [41, 6], [51, 8], [71, 10], [91, 12], [151, 13]], minItemLevel: 0, chance: [4.7619, 4.7619, 7.5], label: 'STR Increase' },
			{ kind: 'stat_flat', stat: 'dex', values: [[0, 2], [21, 4], [41, 6], [51, 8], [71, 10], [91, 12], [151, 13]], minItemLevel: 0, chance: [4.7619, 4.7619, 7.5], label: 'DEX Increase' },
			{ kind: 'stat_flat', stat: 'int', values: [[0, 2], [21, 4], [41, 6], [51, 8], [71, 10], [91, 12], [151, 13]], minItemLevel: 0, chance: [4.7619, 4.7619, 7.5], label: 'INT Increase' },
			{ kind: 'stat_flat', stat: 'luk', values: [[0, 2], [21, 4], [41, 6], [51, 8], [71, 10], [91, 12], [151, 13]], minItemLevel: 0, chance: [4.7619, 4.7619, 7.5], label: 'LUK Increase' },
			{ kind: 'hp_flat', values: [[0, 10], [11, 20], [21, 30], [31, 40], [41, 50], [51, 60], [61, 70], [71, 80], [81, 90], [91, 100], [101, 110], [111, 120], [151, 125]], minItemLevel: 0, chance: [7.1428, 7.1428, 7.5], label: 'MaxHP Increase' },
			{ kind: 'mp_flat', values: [[0, 10], [11, 20], [21, 30], [31, 40], [41, 50], [51, 60], [61, 70], [71, 80], [81, 90], [91, 100], [101, 110], [111, 120], [151, 125]], minItemLevel: 0, chance: [7.1428, 7.1428, 7.5], label: 'MaxMP Increase' },
			{ kind: 'def_flat', values: [[0, 10], [11, 20], [21, 30], [31, 40], [41, 50], [51, 60], [61, 70], [71, 80], [81, 90], [91, 100], [101, 110], [111, 120], [151, 125]], minItemLevel: 0, chance: [7.1428, 7.1428, 5], label: 'DEF Increase' },
			{ kind: 'stat_pct', stat: 'str', values: [[0, 1], [31, 2], [71, 3], [151, 4]], minItemLevel: 0, chance: [4.7619, 4.7619, 7.5], label: 'STR % Increase' },
			{ kind: 'stat_pct', stat: 'dex', values: [[0, 1], [31, 2], [71, 3], [151, 4]], minItemLevel: 0, chance: [4.7619, 4.7619, 7.5], label: 'DEX % Increase' },
			{ kind: 'stat_pct', stat: 'int', values: [[0, 1], [31, 2], [71, 3], [151, 4]], minItemLevel: 0, chance: [4.7619, 4.7619, 7.5], label: 'INT % Increase' },
			{ kind: 'stat_pct', stat: 'luk', values: [[0, 1], [31, 2], [71, 3], [151, 4]], minItemLevel: 0, chance: [4.7619, 4.7619, 7.5], label: 'LUK % Increase' },
			{ kind: 'hp_pct', values: [[0, 1], [31, 2], [71, 3], [151, 4]], minItemLevel: 0, chance: [7.1428, 7.1428, 5], label: 'MaxHP % Increase' },
			{ kind: 'mp_pct', values: [[0, 1], [31, 2], [71, 3], [151, 4]], minItemLevel: 0, chance: [7.1428, 7.1428, 5], label: 'MaxMP % Increase' },
			{ kind: 'def_pct', values: [[0, 1], [31, 2], [71, 3], [151, 4]], minItemLevel: 0, chance: [7.1428, 7.1428, 5], label: 'DEF % Increase' },
			{ kind: 'all_stat_flat', values: [[0, 1], [21, 2], [41, 3], [61, 4], [81, 5], [151, 6]], minItemLevel: 0, chance: [4.7619, 4.7619, 5], label: 'All Stats Increase' },
			{ kind: 'other', values: [[0, 2], [11, 4], [21, 6], [31, 8], [41, 10], [51, 12], [61, 14], [71, 16], [81, 18], [91, 20], [101, 22], [111, 24], [151, 25]], minItemLevel: 0, chance: [7.1428, 7.1428, 0], label: 'Recover HP every 4 seconds' },
			{ kind: 'other', values: [[0, 2], [11, 4], [21, 6], [31, 8], [41, 10], [51, 12], [61, 14], [71, 16], [81, 18], [91, 20], [101, 22], [111, 24], [151, 25]], minItemLevel: 0, chance: [7.1428, 7.1428, 0], label: 'Recover MP every 4 seconds' },
		],
		epic: [
			{ kind: 'stat_pct', stat: 'str', values: [[0, 2], [31, 4], [71, 6], [151, 7]], minItemLevel: 0, chance: [11.1111, 11.1111, 14.2857], label: 'STR % Increase' },
			{ kind: 'stat_pct', stat: 'dex', values: [[0, 2], [31, 4], [71, 6], [151, 7]], minItemLevel: 0, chance: [11.1111, 11.1111, 14.2857], label: 'DEX % Increase' },
			{ kind: 'stat_pct', stat: 'int', values: [[0, 2], [31, 4], [71, 6], [151, 7]], minItemLevel: 0, chance: [11.1111, 11.1111, 14.2857], label: 'INT % Increase' },
			{ kind: 'stat_pct', stat: 'luk', values: [[0, 2], [31, 4], [71, 6], [151, 7]], minItemLevel: 0, chance: [11.1111, 11.1111, 14.2857], label: 'LUK % Increase' },
			{ kind: 'hp_pct', values: [[0, 2], [31, 4], [71, 6], [151, 7]], minItemLevel: 0, chance: [16.6666, 16.6666, 14.2857], label: 'MaxHP % Increase' },
			{ kind: 'mp_pct', values: [[0, 2], [31, 4], [71, 6], [151, 7]], minItemLevel: 0, chance: [16.6666, 16.6666, 14.2857], label: 'MaxMP % Increase' },
			{ kind: 'def_pct', values: [[0, 2], [31, 4], [71, 6], [151, 7]], minItemLevel: 0, chance: [16.6666, 16.6666, 8.5714], label: 'DEF % Increase' },
			{ kind: 'all_stat_pct', values: [[0, 1], [31, 2], [71, 3], [151, 4]], minItemLevel: 0, chance: [5.5555, 5.5555, 5.7142], label: 'All Stats % Increase' },
		],
		unique: [
			{ kind: 'stat_pct', stat: 'str', values: [[0, 3], [31, 6], [71, 9], [151, 10]], minItemLevel: 0, chance: [9.5238, 9.5238, 11.3636], label: 'STR % Increase' },
			{ kind: 'stat_pct', stat: 'dex', values: [[0, 3], [31, 6], [71, 9], [151, 10]], minItemLevel: 0, chance: [9.5238, 9.5238, 11.3636], label: 'DEX % Increase' },
			{ kind: 'stat_pct', stat: 'int', values: [[0, 3], [31, 6], [71, 9], [151, 10]], minItemLevel: 0, chance: [9.5238, 9.5238, 11.3636], label: 'INT % Increase' },
			{ kind: 'stat_pct', stat: 'luk', values: [[0, 3], [31, 6], [71, 9], [151, 10]], minItemLevel: 0, chance: [9.5238, 9.5238, 11.3636], label: 'LUK % Increase' },
			{ kind: 'hp_pct', values: [[0, 3], [31, 6], [71, 9]], minItemLevel: 0, chance: [14.2857, 14.2857, 13.6363], label: 'MaxHP % Increase' },
			{ kind: 'mp_pct', values: [[0, 3], [31, 6], [71, 9]], minItemLevel: 0, chance: [14.2857, 14.2857, 13.6363], label: 'MaxMP % Increase' },
			{ kind: 'def_pct', values: [[0, 3], [31, 6], [71, 9]], minItemLevel: 0, chance: [14.2857, 14.2857, 9.0909], label: 'DEF % Increase' },
			{ kind: 'all_stat_pct', values: [[0, 2], [31, 4], [71, 6], [151, 7]], minItemLevel: 0, chance: [4.7619, 4.7619, 9.0909], label: 'All Stats % Increase' },
			{ kind: 'hp_recovery', values: [[0, 10], [31, 20], [71, 30]], minItemLevel: 0, chance: [14.2857, 14.2857, 9.0909], label: 'Skills and Potion HP Recovery % Increase' },
		],
		legendary: [
			{ kind: 'stat_pct', stat: 'str', values: [[0, 6], [31, 9], [71, 12], [151, 13]], minItemLevel: 0, chance: [5.8823, 5.8823, 9.3023], label: 'STR % Increase' },
			{ kind: 'stat_pct', stat: 'dex', values: [[0, 6], [31, 9], [71, 12], [151, 13]], minItemLevel: 0, chance: [5.8823, 5.8823, 9.3023], label: 'DEX % Increase' },
			{ kind: 'stat_pct', stat: 'int', values: [[0, 6], [31, 9], [71, 12], [151, 13]], minItemLevel: 0, chance: [5.8823, 5.8823, 9.3023], label: 'INT % Increase' },
			{ kind: 'stat_pct', stat: 'luk', values: [[0, 6], [31, 9], [71, 12], [151, 13]], minItemLevel: 0, chance: [5.8823, 5.8823, 9.3023], label: 'LUK % Increase' },
			{ kind: 'hp_pct', values: [[0, 6], [31, 9], [71, 12]], minItemLevel: 0, chance: [8.8235, 8.8235, 9.3023], label: 'MaxHP % Increase' },
			{ kind: 'mp_pct', values: [[0, 6], [31, 9], [71, 12]], minItemLevel: 0, chance: [8.8235, 8.8235, 9.3023], label: 'MaxMP % Increase' },
			{ kind: 'def_pct', values: [[0, 6], [31, 9], [71, 12]], minItemLevel: 0, chance: [8.8235, 8.8235, 9.3023], label: 'DEF % Increase' },
			{ kind: 'all_stat_pct', values: [[0, 3], [31, 6], [71, 9], [151, 10]], minItemLevel: 0, chance: [5.8823, 5.8823, 6.9767], label: 'All Stats % Increase' },
			{ kind: 'mp_cost', values: [[0, 5], [51, 10], [101, 15], [151, 17]], minItemLevel: 0, chance: [8.8235, 8.8235, 6.9767], label: 'MP Cost Reduction' },
			{ kind: 'mp_cost', values: [[0, 10], [51, 20], [101, 30], [151, 35]], minItemLevel: 0, chance: [8.8235, 8.8235, 6.9767], label: 'MP Cost Reduction' },
			{ kind: 'hp_recovery', values: [[0, 20], [31, 30], [71, 40]], minItemLevel: 0, chance: [8.8235, 8.8235, 0], label: 'Skills and Potion HP Recovery % Increase' },
			{ kind: 'meso', values: [[0, 10], [31, 15], [71, 20]], minItemLevel: 0, chance: [8.8235, 8.8235, 6.9767], label: 'Mesos Obtained % Increase' },
			{ kind: 'drop', values: [[0, 10], [31, 15], [71, 20]], minItemLevel: 0, chance: [8.8235, 8.8235, 6.9767], maxPerItem: 2, label: 'Item Drop Rate % Increase' },
		],
	},
	weapon: {
		belowRare: [
			{ kind: 'stat_flat', stat: 'str', values: [[0, 1], [21, 2], [41, 3], [51, 4], [71, 5], [91, 6]], minItemLevel: 0, chance: [12.5, 12.5, 13.6363], label: 'STR Increase' },
			{ kind: 'stat_flat', stat: 'dex', values: [[0, 1], [21, 2], [41, 3], [51, 4], [71, 5], [91, 6]], minItemLevel: 0, chance: [12.5, 12.5, 13.6363], label: 'DEX Increase' },
			{ kind: 'stat_flat', stat: 'int', values: [[0, 1], [21, 2], [41, 3], [51, 4], [71, 5], [91, 6]], minItemLevel: 0, chance: [12.5, 12.5, 13.6363], label: 'INT Increase' },
			{ kind: 'stat_flat', stat: 'luk', values: [[0, 1], [21, 2], [41, 3], [51, 4], [71, 5], [91, 6]], minItemLevel: 0, chance: [12.5, 12.5, 13.6363], label: 'LUK Increase' },
			{ kind: 'hp_flat', values: [[0, 5], [11, 10], [21, 15], [31, 20], [41, 25], [51, 30], [61, 35], [71, 40], [81, 45], [91, 50], [101, 55], [111, 60]], minItemLevel: 0, chance: [18.75, 18.75, 13.6363], label: 'MaxHP Increase' },
			{ kind: 'mp_flat', values: [[0, 5], [11, 10], [21, 15], [31, 20], [41, 25], [51, 30], [61, 35], [71, 40], [81, 45], [91, 50], [101, 55], [111, 60]], minItemLevel: 0, chance: [18.75, 18.75, 13.6363], label: 'MaxMP Increase' },
			{ kind: 'att_flat', values: [[0, 1], [21, 2], [41, 3], [61, 4], [81, 5], [91, 6]], minItemLevel: 0, chance: [6.25, 6.25, 9.0909], label: 'Weapon ATT Increase' },
			{ kind: 'matt_flat', values: [[0, 1], [21, 2], [41, 3], [61, 4], [81, 5], [91, 6]], minItemLevel: 0, chance: [6.25, 6.25, 9.0909], label: 'Magic ATT Increase' },
		],
		rare: [
			{ kind: 'stat_flat', stat: 'str', values: [[0, 2], [21, 4], [41, 6], [51, 8], [71, 10], [91, 12], [151, 13]], minItemLevel: 30, chance: [3.5087, 3.5087, 6.1224], label: 'STR Increase' },
			{ kind: 'stat_flat', stat: 'dex', values: [[0, 2], [21, 4], [41, 6], [51, 8], [71, 10], [91, 12], [151, 13]], minItemLevel: 30, chance: [3.5087, 3.5087, 6.1224], label: 'DEX Increase' },
			{ kind: 'stat_flat', stat: 'int', values: [[0, 2], [21, 4], [41, 6], [51, 8], [71, 10], [91, 12], [151, 13]], minItemLevel: 30, chance: [3.5087, 3.5087, 6.1224], label: 'INT Increase' },
			{ kind: 'stat_flat', stat: 'luk', values: [[0, 2], [21, 4], [41, 6], [51, 8], [71, 10], [91, 12], [151, 13]], minItemLevel: 30, chance: [3.5087, 3.5087, 6.1224], label: 'LUK Increase' },
			{ kind: 'hp_flat', values: [[0, 10], [11, 20], [21, 30], [31, 40], [41, 50], [51, 60], [61, 70], [71, 80], [81, 90], [91, 100], [101, 110], [111, 120], [151, 125]], minItemLevel: 30, chance: [5.2631, 5.2631, 6.1224], label: 'MaxHP Increase' },
			{ kind: 'mp_flat', values: [[0, 10], [11, 20], [21, 30], [31, 40], [41, 50], [51, 60], [61, 70], [71, 80], [81, 90], [91, 100], [101, 110], [111, 120], [151, 125]], minItemLevel: 30, chance: [5.2631, 5.2631, 6.1224], label: 'MaxMP Increase' },
			{ kind: 'att_flat', values: [[0, 2], [21, 4], [41, 6], [61, 8], [81, 10], [91, 12], [151, 13]], minItemLevel: 30, chance: [3.5087, 3.5087, 4.0816], label: 'Weapon ATT Increase' },
			{ kind: 'matt_flat', values: [[0, 2], [21, 4], [41, 6], [61, 8], [81, 10], [91, 12], [151, 13]], minItemLevel: 30, chance: [3.5087, 3.5087, 4.0816], label: 'Magic ATT Increase' },
			{ kind: 'stat_pct', stat: 'str', values: [[0, 1], [31, 2], [71, 3], [151, 4]], minItemLevel: 30, chance: [3.5087, 3.5087, 6.1224], label: 'STR % Increase' },
			{ kind: 'stat_pct', stat: 'dex', values: [[0, 1], [31, 2], [71, 3], [151, 4]], minItemLevel: 30, chance: [3.5087, 3.5087, 6.1224], label: 'DEX % Increase' },
			{ kind: 'stat_pct', stat: 'int', values: [[0, 1], [31, 2], [71, 3], [151, 4]], minItemLevel: 30, chance: [3.5087, 3.5087, 6.1224], label: 'INT % Increase' },
			{ kind: 'stat_pct', stat: 'luk', values: [[0, 1], [31, 2], [71, 3], [151, 4]], minItemLevel: 30, chance: [3.5087, 3.5087, 6.1224], label: 'LUK % Increase' },
			{ kind: 'att_pct', values: [[0, 1], [31, 2], [71, 3], [151, 4]], minItemLevel: 30, chance: [1.7543, 1.7543, 2.0408], label: 'Weapon ATT % Increase' },
			{ kind: 'matt_pct', values: [[0, 1], [31, 2], [71, 3], [151, 4]], minItemLevel: 30, chance: [1.7543, 1.7543, 2.0408], label: 'Magic ATT % Increase' },
			{ kind: 'crit_rate', value: 4, minItemLevel: 30, chance: [1.7543, 1.7543, 2.0408], label: 'Critical Rate +4%' },
			{ kind: 'damage_pct', values: [[0, 1], [31, 2], [71, 3], [151, 4]], minItemLevel: 30, chance: [1.7543, 1.7543, 2.0408], label: 'Damage % Increase' },
			{ kind: 'all_stat_flat', values: [[0, 1], [21, 2], [41, 3], [61, 4], [81, 5], [151, 6]], minItemLevel: 30, chance: [3.5087, 3.5087, 4.0816], label: 'All Stats Increase' },
			{ kind: 'other', values: [[0, 20], [11, 40], [21, 60], [31, 80], [41, 100], [51, 120], [61, 140], [71, 160], [81, 180], [91, 200], [101, 220], [111, 240], [151, 250]], minItemLevel: 30, chance: [5.2631, 5.2631, 2.0408], label: 'Chance to recover HP when attacking' },
			{ kind: 'other', values: [[0, 20], [11, 30], [21, 40], [31, 50], [41, 60], [51, 70], [61, 80], [71, 90], [81, 100], [91, 110], [101, 120], [151, 125]], minItemLevel: 30, chance: [5.2631, 5.2631, 2.0408], label: 'Chance to recover MP when attacking' },
			{ kind: 'other', values: [[10, 1], [51, 2], [101, 3]], minItemLevel: 30, chance: [5.2631, 5.2631, 2.0408], label: 'Chance to inflict darkness when attacking' },
			{ kind: 'other', values: [[10, 1], [71, 2]], minItemLevel: 30, chance: [5.2631, 5.2631, 2.0408], label: 'Chance to inflict slow when attacking' },
			{ kind: 'other', values: [[10, 1], [21, 2], [41, 3], [61, 4], [81, 5], [101, 6]], minItemLevel: 30, chance: [5.2631, 5.2631, 2.0408], label: 'Chance to inflict poison when attacking' },
			{ kind: 'other', values: [[10, 1], [71, 2]], minItemLevel: 30, chance: [5.2631, 5.2631, 2.0408], label: 'Chance to inflict stun when attacking' },
			{ kind: 'other', values: [[10, 1], [71, 2]], minItemLevel: 30, chance: [5.2631, 5.2631, 2.0408], label: 'Chance to inflict seal when attacking' },
			{ kind: 'other', values: [[10, 1], [71, 2]], minItemLevel: 30, chance: [5.2631, 5.2631, 2.0408], label: 'Chance to inflict freeze when attacking' },
			{ kind: 'ied', value: 15, minItemLevel: 30, chance: [1.7543, 1.7543, 2.0408], maxPerItem: 2, label: 'Ignores 15% of Monster\'s DEF when attacking' },
		],
		epic: [
			{ kind: 'stat_pct', stat: 'str', values: [[0, 2], [31, 4], [71, 6], [151, 7]], minItemLevel: 50, chance: [7.6923, 7.6923, 10.8695], label: 'STR % Increase' },
			{ kind: 'stat_pct', stat: 'dex', values: [[0, 2], [31, 4], [71, 6], [151, 7]], minItemLevel: 50, chance: [7.6923, 7.6923, 10.8695], label: 'DEX % Increase' },
			{ kind: 'stat_pct', stat: 'int', values: [[0, 2], [31, 4], [71, 6], [151, 7]], minItemLevel: 50, chance: [7.6923, 7.6923, 10.8695], label: 'INT % Increase' },
			{ kind: 'stat_pct', stat: 'luk', values: [[0, 2], [31, 4], [71, 6], [151, 7]], minItemLevel: 50, chance: [7.6923, 7.6923, 10.8695], label: 'LUK % Increase' },
			{ kind: 'hp_pct', values: [[0, 2], [31, 4], [71, 6], [151, 7]], minItemLevel: 50, chance: [11.5384, 11.5384, 10.8695], label: 'MaxHP % Increase' },
			{ kind: 'mp_pct', values: [[0, 2], [31, 4], [71, 6], [151, 7]], minItemLevel: 50, chance: [11.5384, 11.5384, 10.8695], label: 'MaxMP % Increase' },
			{ kind: 'att_pct', values: [[0, 2], [31, 4], [71, 6], [151, 7]], minItemLevel: 50, chance: [3.8461, 3.8461, 4.3478], label: 'Weapon ATT % Increase' },
			{ kind: 'matt_pct', values: [[0, 2], [31, 4], [71, 6], [151, 7]], minItemLevel: 50, chance: [3.8461, 3.8461, 4.3478], label: 'Magic ATT % Increase' },
			{ kind: 'crit_rate', value: 8, minItemLevel: 50, chance: [3.8461, 3.8461, 4.3478], label: 'Critical Rate +8%' },
			{ kind: 'damage_pct', values: [[0, 2], [31, 4], [71, 6], [151, 7]], minItemLevel: 50, chance: [3.8461, 3.8461, 4.3478], label: 'Damage % Increase' },
			{ kind: 'all_stat_pct', values: [[0, 1], [31, 2], [71, 3], [151, 4]], minItemLevel: 50, chance: [3.8461, 3.8461, 4.3478], label: 'All Stats % Increase' },
			{ kind: 'other', values: [[0, 30], [11, 60], [21, 90], [31, 120], [41, 150], [51, 180], [61, 210], [71, 240], [81, 270], [91, 300], [101, 330], [111, 360], [151, 375]], minItemLevel: 50, chance: [11.5384, 11.5384, 4.3478], label: 'Chance to recover HP when attacking' },
			{ kind: 'other', values: [[0, 30], [11, 45], [21, 60], [31, 75], [41, 90], [51, 105], [61, 120], [71, 135], [81, 150], [91, 165], [101, 180], [151, 187]], minItemLevel: 50, chance: [11.5384, 11.5384, 4.3478], label: 'Chance to recover MP when attacking' },
			{ kind: 'ied', value: 15, minItemLevel: 50, chance: [3.8461, 3.8461, 4.3478], maxPerItem: 2, label: 'Ignore 15% of Monster\'s DEF when attacking' },
		],
		unique: [
			{ kind: 'stat_pct', stat: 'str', values: [[0, 3], [31, 6], [71, 9], [151, 10]], minItemLevel: 100, chance: [13.3333, 13.3333, 11.6279], label: 'STR % Increase' },
			{ kind: 'stat_pct', stat: 'dex', values: [[0, 3], [31, 6], [71, 9], [151, 10]], minItemLevel: 100, chance: [13.3333, 13.3333, 11.6279], label: 'DEX % Increase' },
			{ kind: 'stat_pct', stat: 'int', values: [[0, 3], [31, 6], [71, 9], [151, 10]], minItemLevel: 100, chance: [13.3333, 13.3333, 11.6279], label: 'INT % Increase' },
			{ kind: 'stat_pct', stat: 'luk', values: [[0, 3], [31, 6], [71, 9], [151, 10]], minItemLevel: 100, chance: [13.3333, 13.3333, 11.6279], label: 'LUK % Increase' },
			{ kind: 'att_pct', values: [[0, 3], [31, 6], [71, 9], [151, 10]], minItemLevel: 100, chance: [6.6666, 6.6666, 6.9767], label: 'Weapon ATT % Increase' },
			{ kind: 'matt_pct', values: [[0, 3], [31, 6], [71, 9], [151, 10]], minItemLevel: 100, chance: [6.6666, 6.6666, 6.9767], label: 'Magic ATT % Increase' },
			{ kind: 'crit_rate', values: [[0, 3], [31, 6], [71, 9], [151, 10]], minItemLevel: 100, chance: [6.6666, 6.6666, 9.3023], label: 'Critical Rate % Increase' },
			{ kind: 'damage_pct', values: [[0, 3], [31, 6], [71, 9], [151, 10]], minItemLevel: 100, chance: [6.6666, 6.6666, 6.9767], label: 'Damage % Increase' },
			{ kind: 'all_stat_pct', values: [[0, 2], [31, 4], [71, 6], [151, 7]], minItemLevel: 100, chance: [6.6666, 6.6666, 9.3023], label: 'All Stats % Increase' },
			{ kind: 'ied', value: 30, minItemLevel: 100, chance: [6.6666, 6.6666, 6.9767], maxPerItem: 2, label: 'Ignore 30% of Monster\'s DEF when attacking' },
			{ kind: 'boss', value: 30, minItemLevel: 100, chance: [6.6666, 6.6666, 6.9767], maxPerItem: 2, label: 'Damage to Boss Monsters +30%' },
		],
		legendary: [
			{ kind: 'stat_pct', stat: 'str', values: [[0, 6], [31, 9], [71, 12], [151, 13]], minItemLevel: 100, chance: [8, 11.1111, 9.756], label: 'STR % Increase' },
			{ kind: 'stat_pct', stat: 'dex', values: [[0, 6], [31, 9], [71, 12], [151, 13]], minItemLevel: 100, chance: [8, 11.1111, 9.756], label: 'DEX % Increase' },
			{ kind: 'stat_pct', stat: 'int', values: [[0, 6], [31, 9], [71, 12], [151, 13]], minItemLevel: 100, chance: [8, 11.1111, 9.756], label: 'INT % Increase' },
			{ kind: 'stat_pct', stat: 'luk', values: [[0, 6], [31, 9], [71, 12], [151, 13]], minItemLevel: 100, chance: [8, 11.1111, 9.756], label: 'LUK % Increase' },
			{ kind: 'att_pct', values: [[0, 6], [31, 9], [71, 12], [151, 13]], minItemLevel: 100, chance: [4, 5.5555, 4.878], label: 'Weapon ATT % Increase' },
			{ kind: 'matt_pct', values: [[0, 6], [31, 9], [71, 12], [151, 13]], minItemLevel: 100, chance: [4, 5.5555, 4.878], label: 'Magic ATT % Increase' },
			{ kind: 'crit_rate', values: [[0, 6], [31, 9], [71, 12], [151, 13]], minItemLevel: 100, chance: [4, 5.5555, 4.878], label: 'Critical Rate % Increase' },
			{ kind: 'damage_pct', values: [[0, 6], [31, 9], [71, 12], [151, 13]], minItemLevel: 100, chance: [4, 5.5555, 4.878], label: 'Damage % Increase' },
			{ kind: 'all_stat_pct', values: [[0, 3], [31, 6], [71, 9], [151, 10]], minItemLevel: 100, chance: [8, 11.1111, 7.317], label: 'All Stats % Increase' },
			{ kind: 'att_per_10_levels', value: 1, minItemLevel: 100, chance: [12, 0, 4.878], label: 'Weapon ATT +1 per 10 Character Levels' },
			{ kind: 'matt_per_10_levels', value: 1, minItemLevel: 100, chance: [12, 0, 4.878], label: 'Magic ATT +1 per 10 Character Levels' },
			{ kind: 'ied', value: 35, minItemLevel: 100, chance: [4, 5.5555, 4.878], maxPerItem: 2, label: 'Ignore 35% of Monster\'s DEF when attacking' },
			{ kind: 'ied', value: 40, minItemLevel: 100, chance: [4, 2.7777, 4.878], maxPerItem: 2, label: 'Ignore 40% of Monster\'s DEF when attacking' },
			{ kind: 'boss', value: 35, minItemLevel: 100, chance: [8, 11.1111, 9.756], maxPerItem: 2, label: 'Damage to Boss Monsters +35%' },
			{ kind: 'boss', value: 40, minItemLevel: 100, chance: [4, 2.7777, 4.878], maxPerItem: 2, label: 'Damage to Boss Monsters +40%' },
		],
	},
	secondary: {
		belowRare: [
			{ kind: 'stat_flat', stat: 'str', values: [[0, 1], [21, 2], [41, 3], [51, 4], [71, 5], [91, 6]], minItemLevel: 0, chance: [12.5, 12.5, 13.6363], label: 'STR Increase' },
			{ kind: 'stat_flat', stat: 'dex', values: [[0, 1], [21, 2], [41, 3], [51, 4], [71, 5], [91, 6]], minItemLevel: 0, chance: [12.5, 12.5, 13.6363], label: 'DEX Increase' },
			{ kind: 'stat_flat', stat: 'int', values: [[0, 1], [21, 2], [41, 3], [51, 4], [71, 5], [91, 6]], minItemLevel: 0, chance: [12.5, 12.5, 13.6363], label: 'INT Increase' },
			{ kind: 'stat_flat', stat: 'luk', values: [[0, 1], [21, 2], [41, 3], [51, 4], [71, 5], [91, 6]], minItemLevel: 0, chance: [12.5, 12.5, 13.6363], label: 'LUK Increase' },
			{ kind: 'hp_flat', values: [[0, 5], [11, 10], [21, 15], [31, 20], [41, 25], [51, 30], [61, 35], [71, 40], [81, 45], [91, 50], [101, 55], [111, 60]], minItemLevel: 0, chance: [18.75, 18.75, 13.6363], label: 'MaxHP Increase' },
			{ kind: 'mp_flat', values: [[0, 5], [11, 10], [21, 15], [31, 20], [41, 25], [51, 30], [61, 35], [71, 40], [81, 45], [91, 50], [101, 55], [111, 60]], minItemLevel: 0, chance: [18.75, 18.75, 13.6363], label: 'MaxMP Increase' },
			{ kind: 'att_flat', values: [[0, 1], [21, 2], [41, 3], [61, 4], [81, 5], [91, 6]], minItemLevel: 0, chance: [6.25, 6.25, 9.0909], label: 'Weapon ATT Increase' },
			{ kind: 'matt_flat', values: [[0, 1], [21, 2], [41, 3], [61, 4], [81, 5], [91, 6]], minItemLevel: 0, chance: [6.25, 6.25, 9.0909], label: 'Magic ATT Increase' },
		],
		rare: [
			{ kind: 'stat_flat', stat: 'str', values: [[0, 2], [21, 4], [41, 6], [51, 8], [71, 10], [91, 12], [151, 13]], minItemLevel: 30, chance: [3.5087, 3.5087, 6.1224], label: 'STR Increase' },
			{ kind: 'stat_flat', stat: 'dex', values: [[0, 2], [21, 4], [41, 6], [51, 8], [71, 10], [91, 12], [151, 13]], minItemLevel: 30, chance: [3.5087, 3.5087, 6.1224], label: 'DEX Increase' },
			{ kind: 'stat_flat', stat: 'int', values: [[0, 2], [21, 4], [41, 6], [51, 8], [71, 10], [91, 12], [151, 13]], minItemLevel: 30, chance: [3.5087, 3.5087, 6.1224], label: 'INT Increase' },
			{ kind: 'stat_flat', stat: 'luk', values: [[0, 2], [21, 4], [41, 6], [51, 8], [71, 10], [91, 12], [151, 13]], minItemLevel: 30, chance: [3.5087, 3.5087, 6.1224], label: 'LUK Increase' },
			{ kind: 'hp_flat', values: [[0, 10], [11, 20], [21, 30], [31, 40], [41, 50], [51, 60], [61, 70], [71, 80], [81, 90], [91, 100], [101, 110], [111, 120], [151, 125]], minItemLevel: 30, chance: [5.2631, 5.2631, 6.1224], label: 'MaxHP Increase' },
			{ kind: 'mp_flat', values: [[0, 10], [11, 20], [21, 30], [31, 40], [41, 50], [51, 60], [61, 70], [71, 80], [81, 90], [91, 100], [101, 110], [111, 120], [151, 125]], minItemLevel: 30, chance: [5.2631, 5.2631, 6.1224], label: 'MaxMP Increase' },
			{ kind: 'att_flat', values: [[0, 2], [21, 4], [41, 6], [61, 8], [81, 10], [91, 12], [151, 13]], minItemLevel: 30, chance: [3.5087, 3.5087, 4.0816], label: 'Weapon ATT Increase' },
			{ kind: 'matt_flat', values: [[0, 2], [21, 4], [41, 6], [61, 8], [81, 10], [91, 12], [151, 13]], minItemLevel: 30, chance: [3.5087, 3.5087, 4.0816], label: 'Magic ATT Increase' },
			{ kind: 'stat_pct', stat: 'str', values: [[0, 1], [31, 2], [71, 3], [151, 4]], minItemLevel: 30, chance: [3.5087, 3.5087, 6.1224], label: 'STR % Increase' },
			{ kind: 'stat_pct', stat: 'dex', values: [[0, 1], [31, 2], [71, 3], [151, 4]], minItemLevel: 30, chance: [3.5087, 3.5087, 6.1224], label: 'DEX % Increase' },
			{ kind: 'stat_pct', stat: 'int', values: [[0, 1], [31, 2], [71, 3], [151, 4]], minItemLevel: 30, chance: [3.5087, 3.5087, 6.1224], label: 'INT % Increase' },
			{ kind: 'stat_pct', stat: 'luk', values: [[0, 1], [31, 2], [71, 3], [151, 4]], minItemLevel: 30, chance: [3.5087, 3.5087, 6.1224], label: 'LUK % Increase' },
			{ kind: 'att_pct', values: [[0, 1], [31, 2], [71, 3], [151, 4]], minItemLevel: 30, chance: [1.7543, 1.7543, 2.0408], label: 'Weapon ATT % Increase' },
			{ kind: 'matt_pct', values: [[0, 1], [31, 2], [71, 3], [151, 4]], minItemLevel: 30, chance: [1.7543, 1.7543, 2.0408], label: 'Magic ATT % Increase' },
			{ kind: 'crit_rate', value: 4, minItemLevel: 30, chance: [1.7543, 1.7543, 2.0408], label: 'Critical Rate +4%' },
			{ kind: 'damage_pct', values: [[0, 1], [31, 2], [71, 3], [151, 4]], minItemLevel: 30, chance: [1.7543, 1.7543, 2.0408], label: 'Damage % Increase' },
			{ kind: 'all_stat_flat', values: [[0, 1], [21, 2], [41, 3], [61, 4], [81, 5], [151, 6]], minItemLevel: 30, chance: [3.5087, 3.5087, 4.0816], label: 'All Stats Increase' },
			{ kind: 'other', values: [[0, 20], [11, 40], [21, 60], [31, 80], [41, 100], [51, 120], [61, 140], [71, 160], [81, 180], [91, 200], [101, 220], [111, 240], [151, 250]], minItemLevel: 30, chance: [5.2631, 5.2631, 2.0408], label: 'Chance to recover HP when attacking' },
			{ kind: 'other', values: [[0, 20], [11, 30], [21, 40], [31, 50], [41, 60], [51, 70], [61, 80], [71, 90], [81, 100], [91, 110], [101, 120], [151, 125]], minItemLevel: 30, chance: [5.2631, 5.2631, 2.0408], label: 'Chance to recover MP when attacking' },
			{ kind: 'other', values: [[10, 1], [51, 2], [101, 3]], minItemLevel: 30, chance: [5.2631, 5.2631, 2.0408], label: 'Chance to inflict darkness when attacking' },
			{ kind: 'other', values: [[10, 1], [71, 2]], minItemLevel: 30, chance: [5.2631, 5.2631, 2.0408], label: 'Chance to inflict slow when attacking' },
			{ kind: 'other', values: [[10, 1], [21, 2], [41, 3], [61, 4], [81, 5], [101, 6]], minItemLevel: 30, chance: [5.2631, 5.2631, 2.0408], label: 'Chance to inflict poison when attacking' },
			{ kind: 'other', values: [[10, 1], [71, 2]], minItemLevel: 30, chance: [5.2631, 5.2631, 2.0408], label: 'Chance to inflict stun when attacking' },
			{ kind: 'other', values: [[10, 1], [71, 2]], minItemLevel: 30, chance: [5.2631, 5.2631, 2.0408], label: 'Chance to inflict seal when attacking' },
			{ kind: 'other', values: [[10, 1], [71, 2]], minItemLevel: 30, chance: [5.2631, 5.2631, 2.0408], label: 'Chance to inflict freeze when attacking' },
			{ kind: 'ied', value: 15, minItemLevel: 30, chance: [1.7543, 1.7543, 2.0408], maxPerItem: 2, label: 'Ignores 15% of Monster\'s DEF when attacking' },
		],
		epic: [
			{ kind: 'stat_pct', stat: 'str', values: [[0, 2], [31, 4], [71, 6], [151, 7]], minItemLevel: 50, chance: [5.7142, 5.7142, 10.8695], label: 'STR % Increase' },
			{ kind: 'stat_pct', stat: 'dex', values: [[0, 2], [31, 4], [71, 6], [151, 7]], minItemLevel: 50, chance: [5.7142, 5.7142, 10.8695], label: 'DEX % Increase' },
			{ kind: 'stat_pct', stat: 'int', values: [[0, 2], [31, 4], [71, 6], [151, 7]], minItemLevel: 50, chance: [5.7142, 5.7142, 10.8695], label: 'INT % Increase' },
			{ kind: 'stat_pct', stat: 'luk', values: [[0, 2], [31, 4], [71, 6], [151, 7]], minItemLevel: 50, chance: [5.7142, 5.7142, 10.8695], label: 'LUK % Increase' },
			{ kind: 'hp_pct', values: [[0, 2], [31, 4], [71, 6], [151, 7]], minItemLevel: 50, chance: [8.5714, 8.5714, 10.8695], label: 'MaxHP % Increase' },
			{ kind: 'mp_pct', values: [[0, 2], [31, 4], [71, 6], [151, 7]], minItemLevel: 50, chance: [8.5714, 8.5714, 10.8695], label: 'MaxMP % Increase' },
			{ kind: 'att_pct', values: [[0, 2], [31, 4], [71, 6], [151, 7]], minItemLevel: 50, chance: [2.8571, 2.8571, 4.3478], label: 'Weapon ATT % Increase' },
			{ kind: 'matt_pct', values: [[0, 2], [31, 4], [71, 6], [151, 7]], minItemLevel: 50, chance: [2.8571, 2.8571, 4.3478], label: 'Magic ATT % Increase' },
			{ kind: 'crit_rate', value: 8, minItemLevel: 50, chance: [2.8571, 2.8571, 4.3478], label: 'Critical Rate +8%' },
			{ kind: 'damage_pct', values: [[0, 2], [31, 4], [71, 6], [151, 7]], minItemLevel: 50, chance: [2.8571, 2.8571, 4.3478], label: 'Damage % Increase' },
			{ kind: 'all_stat_pct', values: [[0, 1], [31, 2], [71, 3], [151, 4]], minItemLevel: 50, chance: [2.8571, 2.8571, 4.3478], label: 'All Stats % Increase' },
			{ kind: 'other', values: [[0, 30], [11, 60], [21, 90], [31, 120], [41, 150], [51, 180], [61, 210], [71, 240], [81, 270], [91, 300], [101, 330], [111, 360], [151, 375]], minItemLevel: 50, chance: [8.5714, 8.5714, 4.3478], label: 'Chance to recover HP when attacking' },
			{ kind: 'other', values: [[0, 30], [11, 45], [21, 60], [31, 75], [41, 90], [51, 105], [61, 120], [71, 135], [81, 150], [91, 165], [101, 180], [151, 187]], minItemLevel: 50, chance: [8.5714, 8.5714, 4.3478], label: 'Chance to recover MP when attacking' },
			{ kind: 'ied', value: 15, minItemLevel: 50, chance: [2.8571, 2.8571, 4.3478], maxPerItem: 2, label: 'Ignore 15% of Monster\'s DEF when attacking' },
			{ kind: 'ignore_damage', values: [[0, 3], [11, 5], [21, 7], [31, 9], [41, 11], [51, 13], [61, 15], [71, 17], [81, 19], [91, 21], [101, 23], [111, 25], [151, 26]], minItemLevel: 50, chance: [8.5714, 8.5714, 0], label: '20% chance to ignore monster damage dealt' },
			{ kind: 'ignore_damage', values: [[0, 5], [11, 8], [21, 11], [31, 14], [41, 17], [51, 20], [61, 23], [71, 26], [81, 29], [91, 32], [101, 35], [111, 38], [151, 39]], minItemLevel: 50, chance: [8.5714, 8.5714, 0], label: '20% chance to ignore monster damage dealt' },
			{ kind: 'ignore_damage', values: [[0, 7], [11, 11], [21, 15], [31, 19], [41, 23], [51, 27], [61, 31], [71, 35], [81, 39], [91, 43], [101, 47], [111, 51], [151, 53]], minItemLevel: 50, chance: [8.5714, 8.5714, 0], label: '30% chance to ignore monster damage dealt' },
		],
		unique: [
			{ kind: 'stat_pct', stat: 'str', values: [[0, 3], [31, 6], [71, 9], [151, 10]], minItemLevel: 100, chance: [9.5238, 9.5238, 9.8039], label: 'STR % Increase' },
			{ kind: 'stat_pct', stat: 'dex', values: [[0, 3], [31, 6], [71, 9], [151, 10]], minItemLevel: 100, chance: [9.5238, 9.5238, 9.8039], label: 'DEX % Increase' },
			{ kind: 'stat_pct', stat: 'int', values: [[0, 3], [31, 6], [71, 9], [151, 10]], minItemLevel: 100, chance: [9.5238, 9.5238, 9.8039], label: 'INT % Increase' },
			{ kind: 'stat_pct', stat: 'luk', values: [[0, 3], [31, 6], [71, 9], [151, 10]], minItemLevel: 100, chance: [9.5238, 9.5238, 9.8039], label: 'LUK % Increase' },
			{ kind: 'att_pct', values: [[0, 3], [31, 6], [71, 9], [151, 10]], minItemLevel: 100, chance: [4.7619, 4.7619, 5.8823], label: 'Weapon ATT % Increase' },
			{ kind: 'matt_pct', values: [[0, 3], [31, 6], [71, 9], [151, 10]], minItemLevel: 100, chance: [4.7619, 4.7619, 5.8823], label: 'Magic ATT % Increase' },
			{ kind: 'crit_rate', values: [[0, 3], [31, 6], [71, 9], [151, 10]], minItemLevel: 100, chance: [4.7619, 4.7619, 7.8431], label: 'Critical Rate % Increase' },
			{ kind: 'damage_pct', values: [[0, 3], [31, 6], [71, 9], [151, 10]], minItemLevel: 100, chance: [4.7619, 4.7619, 5.8823], label: 'Damage % Increase' },
			{ kind: 'all_stat_pct', values: [[0, 2], [31, 4], [71, 6], [151, 7]], minItemLevel: 100, chance: [4.7619, 4.7619, 7.8431], label: 'All Stats % Increase' },
			{ kind: 'ied', value: 30, minItemLevel: 100, chance: [4.7619, 4.7619, 5.8823], maxPerItem: 2, label: 'Ignore 30% of Monster\'s DEF when attacking' },
			{ kind: 'ignore_damage', minItemLevel: 100, chance: [14.2857, 14.2857, 7.8431], maxPerItem: 2, label: '5% chance to ignore 20% of monster damage dealt' },
			{ kind: 'ignore_damage', minItemLevel: 100, chance: [14.2857, 14.2857, 7.8431], maxPerItem: 2, label: '5% chance to ignore 40% of monster damage dealt' },
			{ kind: 'boss', value: 30, minItemLevel: 100, chance: [4.7619, 4.7619, 5.8823], maxPerItem: 2, label: 'Damage to Boss Monsters +30%' },
		],
		legendary: [
			{ kind: 'stat_pct', stat: 'str', values: [[0, 6], [31, 9], [71, 12], [151, 13]], minItemLevel: 100, chance: [6.4516, 8.3333, 8.5106], label: 'STR % Increase' },
			{ kind: 'stat_pct', stat: 'dex', values: [[0, 6], [31, 9], [71, 12], [151, 13]], minItemLevel: 100, chance: [6.4516, 8.3333, 8.5106], label: 'DEX % Increase' },
			{ kind: 'stat_pct', stat: 'int', values: [[0, 6], [31, 9], [71, 12], [151, 13]], minItemLevel: 100, chance: [6.4516, 8.3333, 8.5106], label: 'INT % Increase' },
			{ kind: 'stat_pct', stat: 'luk', values: [[0, 6], [31, 9], [71, 12], [151, 13]], minItemLevel: 100, chance: [6.4516, 8.3333, 8.5106], label: 'LUK % Increase' },
			{ kind: 'att_pct', values: [[0, 6], [31, 9], [71, 12], [151, 13]], minItemLevel: 100, chance: [3.2258, 4.1666, 4.2553], label: 'Weapon ATT % Increase' },
			{ kind: 'matt_pct', values: [[0, 6], [31, 9], [71, 12], [151, 13]], minItemLevel: 100, chance: [3.2258, 4.1666, 4.2553], label: 'Magic ATT % Increase' },
			{ kind: 'crit_rate', values: [[0, 6], [31, 9], [71, 12], [151, 13]], minItemLevel: 100, chance: [3.2258, 4.1666, 4.2553], label: 'Critical Rate % Increase' },
			{ kind: 'damage_pct', values: [[0, 6], [31, 9], [71, 12], [151, 13]], minItemLevel: 100, chance: [3.2258, 4.1666, 4.2553], label: 'Damage % Increase' },
			{ kind: 'all_stat_pct', values: [[0, 3], [31, 6], [71, 9], [151, 10]], minItemLevel: 100, chance: [6.4516, 8.3333, 6.3829], label: 'All Stats % Increase' },
			{ kind: 'att_per_10_levels', value: 1, minItemLevel: 100, chance: [9.6774, 0, 4.2553], label: 'Weapon ATT +1 per 10 Character Levels' },
			{ kind: 'matt_per_10_levels', value: 1, minItemLevel: 100, chance: [9.6774, 0, 4.2553], label: 'Magic ATT +1 per 10 Character Levels' },
			{ kind: 'ied', value: 35, minItemLevel: 100, chance: [3.2258, 4.1666, 4.2553], maxPerItem: 2, label: 'Ignore 35% of Monster\'s DEF when attacking' },
			{ kind: 'ied', value: 40, minItemLevel: 100, chance: [3.2258, 2.0833, 4.2553], maxPerItem: 2, label: 'Ignore 40% of Monster\'s DEF when attacking' },
			{ kind: 'ignore_damage', minItemLevel: 100, chance: [9.6774, 12.5, 6.3829], maxPerItem: 2, label: '10% chance to ignore 20% of monster damage dealt' },
			{ kind: 'ignore_damage', minItemLevel: 100, chance: [9.6774, 12.5, 6.3829], maxPerItem: 2, label: '10% chance to ignore 40% of monster damage dealt' },
			{ kind: 'boss', value: 35, minItemLevel: 100, chance: [6.4516, 8.3333, 8.5106], maxPerItem: 2, label: 'Damage to Boss Monsters +35%' },
			{ kind: 'boss', value: 40, minItemLevel: 100, chance: [3.2258, 2.0833, 4.2553], maxPerItem: 2, label: 'Damage to Boss Monsters +40%' },
		],
	},
	shieldSoulRing: {
		belowRare: [
			{ kind: 'stat_flat', stat: 'str', values: [[0, 1], [21, 2], [41, 3], [51, 4], [71, 5], [91, 6]], minItemLevel: 0, chance: [15.3846, 15.3846, 15.7894], label: 'STR Increase' },
			{ kind: 'stat_flat', stat: 'dex', values: [[0, 1], [21, 2], [41, 3], [51, 4], [71, 5], [91, 6]], minItemLevel: 0, chance: [15.3846, 15.3846, 15.7894], label: 'DEX Increase' },
			{ kind: 'stat_flat', stat: 'int', values: [[0, 1], [21, 2], [41, 3], [51, 4], [71, 5], [91, 6]], minItemLevel: 0, chance: [15.3846, 15.3846, 15.7894], label: 'INT Increase' },
			{ kind: 'stat_flat', stat: 'luk', values: [[0, 1], [21, 2], [41, 3], [51, 4], [71, 5], [91, 6]], minItemLevel: 0, chance: [15.3846, 15.3846, 15.7894], label: 'LUK Increase' },
			{ kind: 'hp_flat', values: [[0, 5], [11, 10], [21, 15], [31, 20], [41, 25], [51, 30], [61, 35], [71, 40], [81, 45], [91, 50], [101, 55], [111, 60]], minItemLevel: 0, chance: [23.0769, 23.0769, 15.7894], label: 'MaxHP Increase' },
			{ kind: 'att_flat', values: [[0, 1], [21, 2], [41, 3], [61, 4], [81, 5], [91, 6]], minItemLevel: 0, chance: [7.6923, 7.6923, 10.5263], label: 'Weapon ATT Increase' },
			{ kind: 'matt_flat', values: [[0, 1], [21, 2], [41, 3], [61, 4], [81, 5], [91, 6]], minItemLevel: 0, chance: [7.6923, 7.6923, 10.5263], label: 'Magic ATT Increase' },
		],
		rare: [
			{ kind: 'stat_flat', stat: 'str', values: [[0, 2], [21, 4], [41, 6], [51, 8], [71, 10], [91, 12], [151, 13]], minItemLevel: 30, chance: [3.7037, 3.9215, 6.5217], label: 'STR Increase' },
			{ kind: 'stat_flat', stat: 'dex', values: [[0, 2], [21, 4], [41, 6], [51, 8], [71, 10], [91, 12], [151, 13]], minItemLevel: 30, chance: [3.7037, 3.9215, 6.5217], label: 'DEX Increase' },
			{ kind: 'stat_flat', stat: 'int', values: [[0, 2], [21, 4], [41, 6], [51, 8], [71, 10], [91, 12], [151, 13]], minItemLevel: 30, chance: [3.7037, 3.9215, 6.5217], label: 'INT Increase' },
			{ kind: 'stat_flat', stat: 'luk', values: [[0, 2], [21, 4], [41, 6], [51, 8], [71, 10], [91, 12], [151, 13]], minItemLevel: 30, chance: [3.7037, 3.9215, 6.5217], label: 'LUK Increase' },
			{ kind: 'hp_flat', values: [[0, 10], [11, 20], [21, 30], [31, 40], [41, 50], [51, 60], [61, 70], [71, 80], [81, 90], [91, 100], [101, 110], [111, 120], [151, 125]], minItemLevel: 30, chance: [5.5555, 5.8823, 6.5217], label: 'MaxHP Increase' },
			{ kind: 'att_flat', values: [[0, 2], [21, 4], [41, 6], [61, 8], [81, 10], [91, 12], [151, 13]], minItemLevel: 30, chance: [3.7037, 3.9215, 4.3478], label: 'Weapon ATT Increase' },
			{ kind: 'matt_flat', values: [[0, 2], [21, 4], [41, 6], [61, 8], [81, 10], [91, 12], [151, 13]], minItemLevel: 30, chance: [3.7037, 3.9215, 4.3478], label: 'Magic ATT Increase' },
			{ kind: 'stat_pct', stat: 'str', values: [[0, 1], [31, 2], [71, 3], [151, 4]], minItemLevel: 30, chance: [3.7037, 3.9215, 6.5217], label: 'STR % Increase' },
			{ kind: 'stat_pct', stat: 'dex', values: [[0, 1], [31, 2], [71, 3], [151, 4]], minItemLevel: 30, chance: [3.7037, 3.9215, 6.5217], label: 'DEX % Increase' },
			{ kind: 'stat_pct', stat: 'int', values: [[0, 1], [31, 2], [71, 3], [151, 4]], minItemLevel: 30, chance: [3.7037, 3.9215, 6.5217], label: 'INT % Increase' },
			{ kind: 'stat_pct', stat: 'luk', values: [[0, 1], [31, 2], [71, 3], [151, 4]], minItemLevel: 30, chance: [3.7037, 3.9215, 6.5217], label: 'LUK % Increase' },
			{ kind: 'att_pct', values: [[0, 1], [31, 2], [71, 3], [151, 4]], minItemLevel: 30, chance: [1.8518, 1.9607, 2.1739], label: 'Weapon ATT % Increase' },
			{ kind: 'matt_pct', values: [[0, 1], [31, 2], [71, 3], [151, 4]], minItemLevel: 30, chance: [1.8518, 1.9607, 2.1739], label: 'Magic ATT % Increase' },
			{ kind: 'crit_rate', value: 4, minItemLevel: 30, chance: [1.8518, 1.9607, 2.1739], label: 'Critical Rate +4%' },
			{ kind: 'damage_pct', values: [[0, 1], [31, 2], [71, 3], [151, 4]], minItemLevel: 30, chance: [1.8518, 1.9607, 2.1739], label: 'Damage % Increase' },
			{ kind: 'all_stat_flat', values: [[0, 1], [21, 2], [41, 3], [61, 4], [81, 5], [151, 6]], minItemLevel: 30, chance: [3.7037, 3.9215, 4.3478], label: 'All Stats Increase' },
			{ kind: 'other', values: [[0, 20], [11, 40], [21, 60], [31, 80], [41, 100], [51, 120], [61, 140], [71, 160], [81, 180], [91, 200], [101, 220], [111, 240], [151, 250]], minItemLevel: 30, chance: [5.5555, 5.8823, 2.1739], label: 'Chance to recover HP when attacking' },
			{ kind: 'other', values: [[0, 20], [11, 30], [21, 40], [31, 50], [41, 60], [51, 70], [61, 80], [71, 90], [81, 100], [91, 110], [101, 120], [151, 125]], minItemLevel: 30, chance: [5.5555, 0, 2.1739], label: 'Chance to recover MP when attacking' },
			{ kind: 'other', values: [[10, 1], [51, 2], [101, 3]], minItemLevel: 30, chance: [5.5555, 5.8823, 2.1739], label: 'Chance to inflict darkness when attacking' },
			{ kind: 'other', values: [[10, 1], [71, 2]], minItemLevel: 30, chance: [5.5555, 5.8823, 2.1739], label: 'Chance to inflict slow when attacking' },
			{ kind: 'other', values: [[10, 1], [21, 2], [41, 3], [61, 4], [81, 5], [101, 6]], minItemLevel: 30, chance: [5.5555, 5.8823, 2.1739], label: 'Chance to inflict poison when attacking' },
			{ kind: 'other', values: [[10, 1], [71, 2]], minItemLevel: 30, chance: [5.5555, 5.8823, 2.1739], label: 'Chance to inflict stun when attacking' },
			{ kind: 'other', values: [[10, 1], [71, 2]], minItemLevel: 30, chance: [5.5555, 5.8823, 2.1739], label: 'Chance to inflict seal when attacking' },
			{ kind: 'other', values: [[10, 1], [71, 2]], minItemLevel: 30, chance: [5.5555, 5.8823, 2.1739], label: 'Chance to inflict freeze when attacking' },
			{ kind: 'ied', value: 15, minItemLevel: 30, chance: [1.8518, 1.9607, 2.1739], maxPerItem: 2, label: 'Ignores 15% of Monster\'s DEF when attacking' },
		],
		epic: [
			{ kind: 'stat_pct', stat: 'str', values: [[0, 2], [31, 4], [71, 6], [151, 7]], minItemLevel: 50, chance: [6.25, 6.8965, 12.1951], label: 'STR % Increase' },
			{ kind: 'stat_pct', stat: 'dex', values: [[0, 2], [31, 4], [71, 6], [151, 7]], minItemLevel: 50, chance: [6.25, 6.8965, 12.1951], label: 'DEX % Increase' },
			{ kind: 'stat_pct', stat: 'int', values: [[0, 2], [31, 4], [71, 6], [151, 7]], minItemLevel: 50, chance: [6.25, 6.8965, 12.1951], label: 'INT % Increase' },
			{ kind: 'stat_pct', stat: 'luk', values: [[0, 2], [31, 4], [71, 6], [151, 7]], minItemLevel: 50, chance: [6.25, 6.8965, 12.1951], label: 'LUK % Increase' },
			{ kind: 'hp_pct', values: [[0, 2], [31, 4], [71, 6], [151, 7]], minItemLevel: 50, chance: [9.375, 10.3448, 12.1951], label: 'MaxHP % Increase' },
			{ kind: 'att_pct', values: [[0, 2], [31, 4], [71, 6], [151, 7]], minItemLevel: 50, chance: [3.125, 3.4482, 4.878], label: 'Weapon ATT % Increase' },
			{ kind: 'matt_pct', values: [[0, 2], [31, 4], [71, 6], [151, 7]], minItemLevel: 50, chance: [3.125, 3.4482, 4.878], label: 'Magic ATT % Increase' },
			{ kind: 'crit_rate', value: 8, minItemLevel: 50, chance: [3.125, 3.4482, 4.878], label: 'Critical Rate +8%' },
			{ kind: 'damage_pct', values: [[0, 2], [31, 4], [71, 6], [151, 7]], minItemLevel: 50, chance: [3.125, 3.4482, 4.878], label: 'Damage % Increase' },
			{ kind: 'all_stat_pct', values: [[0, 1], [31, 2], [71, 3], [151, 4]], minItemLevel: 50, chance: [3.125, 3.4482, 4.878], label: 'All Stats % Increase' },
			{ kind: 'other', values: [[0, 30], [11, 60], [21, 90], [31, 120], [41, 150], [51, 180], [61, 210], [71, 240], [81, 270], [91, 300], [101, 330], [111, 360], [151, 375]], minItemLevel: 50, chance: [9.375, 10.3448, 4.878], label: 'Chance to recover HP when attacking' },
			{ kind: 'other', values: [[0, 30], [11, 45], [21, 60], [31, 75], [41, 90], [51, 105], [61, 120], [71, 135], [81, 150], [91, 165], [101, 180], [151, 187]], minItemLevel: 50, chance: [9.375, 0, 4.878], label: 'Chance to recover MP when attacking' },
			{ kind: 'ied', value: 15, minItemLevel: 50, chance: [3.125, 3.4482, 4.878], maxPerItem: 2, label: 'Ignore 15% of Monster\'s DEF when attacking' },
			{ kind: 'ignore_damage', values: [[0, 3], [11, 5], [21, 7], [31, 9], [41, 11], [51, 13], [61, 15], [71, 17], [81, 19], [91, 21], [101, 23], [111, 25], [151, 26]], minItemLevel: 50, chance: [9.375, 10.3448, 0], label: '20% chance to ignore monster damage dealt' },
			{ kind: 'ignore_damage', values: [[0, 5], [11, 8], [21, 11], [31, 14], [41, 17], [51, 20], [61, 23], [71, 26], [81, 29], [91, 32], [101, 35], [111, 38], [151, 39]], minItemLevel: 50, chance: [9.375, 10.3448, 0], label: '20% chance to ignore monster damage dealt' },
			{ kind: 'ignore_damage', values: [[0, 7], [11, 11], [21, 15], [31, 19], [41, 23], [51, 27], [61, 31], [71, 35], [81, 39], [91, 43], [101, 47], [111, 51], [151, 53]], minItemLevel: 50, chance: [9.375, 10.3448, 0], label: '30% chance to ignore monster damage dealt' },
		],
		unique: [
			{ kind: 'stat_pct', stat: 'str', values: [[0, 3], [31, 6], [71, 9], [151, 10]], minItemLevel: 100, chance: [9.5238, 9.5238, 9.8039], label: 'STR % Increase' },
			{ kind: 'stat_pct', stat: 'dex', values: [[0, 3], [31, 6], [71, 9], [151, 10]], minItemLevel: 100, chance: [9.5238, 9.5238, 9.8039], label: 'DEX % Increase' },
			{ kind: 'stat_pct', stat: 'int', values: [[0, 3], [31, 6], [71, 9], [151, 10]], minItemLevel: 100, chance: [9.5238, 9.5238, 9.8039], label: 'INT % Increase' },
			{ kind: 'stat_pct', stat: 'luk', values: [[0, 3], [31, 6], [71, 9], [151, 10]], minItemLevel: 100, chance: [9.5238, 9.5238, 9.8039], label: 'LUK % Increase' },
			{ kind: 'att_pct', values: [[0, 3], [31, 6], [71, 9], [151, 10]], minItemLevel: 100, chance: [4.7619, 4.7619, 5.8823], label: 'Weapon ATT % Increase' },
			{ kind: 'matt_pct', values: [[0, 3], [31, 6], [71, 9], [151, 10]], minItemLevel: 100, chance: [4.7619, 4.7619, 5.8823], label: 'Magic ATT % Increase' },
			{ kind: 'crit_rate', values: [[0, 3], [31, 6], [71, 9], [151, 10]], minItemLevel: 100, chance: [4.7619, 4.7619, 7.8431], label: 'Critical Rate % Increase' },
			{ kind: 'damage_pct', values: [[0, 3], [31, 6], [71, 9], [151, 10]], minItemLevel: 100, chance: [4.7619, 4.7619, 5.8823], label: 'Damage % Increase' },
			{ kind: 'all_stat_pct', values: [[0, 2], [31, 4], [71, 6], [151, 7]], minItemLevel: 100, chance: [4.7619, 4.7619, 7.8431], label: 'All Stats % Increase' },
			{ kind: 'ied', value: 30, minItemLevel: 100, chance: [4.7619, 4.7619, 5.8823], maxPerItem: 2, label: 'Ignore 30% of Monster\'s DEF when attacking' },
			{ kind: 'ignore_damage', minItemLevel: 100, chance: [14.2857, 14.2857, 7.8431], maxPerItem: 2, label: '5% chance to ignore 20% of monster damage dealt' },
			{ kind: 'ignore_damage', minItemLevel: 100, chance: [14.2857, 14.2857, 7.8431], maxPerItem: 2, label: '5% chance to ignore 40% of monster damage dealt' },
			{ kind: 'boss', value: 30, minItemLevel: 100, chance: [4.7619, 4.7619, 5.8823], maxPerItem: 2, label: 'Damage to Boss Monsters +30%' },
		],
		legendary: [
			{ kind: 'stat_pct', stat: 'str', values: [[0, 6], [31, 9], [71, 12], [151, 13]], minItemLevel: 100, chance: [6.4516, 8.3333, 8.5106], label: 'STR % Increase' },
			{ kind: 'stat_pct', stat: 'dex', values: [[0, 6], [31, 9], [71, 12], [151, 13]], minItemLevel: 100, chance: [6.4516, 8.3333, 8.5106], label: 'DEX % Increase' },
			{ kind: 'stat_pct', stat: 'int', values: [[0, 6], [31, 9], [71, 12], [151, 13]], minItemLevel: 100, chance: [6.4516, 8.3333, 8.5106], label: 'INT % Increase' },
			{ kind: 'stat_pct', stat: 'luk', values: [[0, 6], [31, 9], [71, 12], [151, 13]], minItemLevel: 100, chance: [6.4516, 8.3333, 8.5106], label: 'LUK % Increase' },
			{ kind: 'att_pct', values: [[0, 6], [31, 9], [71, 12], [151, 13]], minItemLevel: 100, chance: [3.2258, 4.1666, 4.2553], label: 'Weapon ATT % Increase' },
			{ kind: 'matt_pct', values: [[0, 6], [31, 9], [71, 12], [151, 13]], minItemLevel: 100, chance: [3.2258, 4.1666, 4.2553], label: 'Magic ATT % Increase' },
			{ kind: 'crit_rate', values: [[0, 6], [31, 9], [71, 12], [151, 13]], minItemLevel: 100, chance: [3.2258, 4.1666, 4.2553], label: 'Critical Rate % Increase' },
			{ kind: 'damage_pct', values: [[0, 6], [31, 9], [71, 12], [151, 13]], minItemLevel: 100, chance: [3.2258, 4.1666, 4.2553], label: 'Damage % Increase' },
			{ kind: 'all_stat_pct', values: [[0, 3], [31, 6], [71, 9], [151, 10]], minItemLevel: 100, chance: [6.4516, 8.3333, 6.3829], label: 'All Stats % Increase' },
			{ kind: 'att_per_10_levels', value: 1, minItemLevel: 100, chance: [9.6774, 0, 4.2553], label: 'Weapon ATT +1 per 10 Character Levels' },
			{ kind: 'matt_per_10_levels', value: 1, minItemLevel: 100, chance: [9.6774, 0, 4.2553], label: 'Magic ATT +1 per 10 Character Levels' },
			{ kind: 'ied', value: 35, minItemLevel: 100, chance: [3.2258, 4.1666, 4.2553], maxPerItem: 2, label: 'Ignore 35% of Monster\'s DEF when attacking' },
			{ kind: 'ied', value: 40, minItemLevel: 100, chance: [3.2258, 2.0833, 4.2553], maxPerItem: 2, label: 'Ignore 40% of Monster\'s DEF when attacking' },
			{ kind: 'ignore_damage', minItemLevel: 100, chance: [9.6774, 12.5, 6.3829], maxPerItem: 2, label: '10% chance to ignore 20% of monster damage dealt' },
			{ kind: 'ignore_damage', minItemLevel: 100, chance: [9.6774, 12.5, 6.3829], maxPerItem: 2, label: '10% chance to ignore 40% of monster damage dealt' },
			{ kind: 'boss', value: 35, minItemLevel: 100, chance: [6.4516, 8.3333, 8.5106], maxPerItem: 2, label: 'Damage to Boss Monsters +35%' },
			{ kind: 'boss', value: 40, minItemLevel: 100, chance: [3.2258, 2.0833, 4.2553], maxPerItem: 2, label: 'Damage to Boss Monsters +40%' },
		],
	},
	emblem: {
		belowRare: [
			{ kind: 'stat_flat', stat: 'str', values: [[0, 1], [21, 2], [41, 3], [51, 4], [71, 5], [91, 6]], minItemLevel: 0, chance: [12.5, 12.5, 13.6363], label: 'STR Increase' },
			{ kind: 'stat_flat', stat: 'dex', values: [[0, 1], [21, 2], [41, 3], [51, 4], [71, 5], [91, 6]], minItemLevel: 0, chance: [12.5, 12.5, 13.6363], label: 'DEX Increase' },
			{ kind: 'stat_flat', stat: 'int', values: [[0, 1], [21, 2], [41, 3], [51, 4], [71, 5], [91, 6]], minItemLevel: 0, chance: [12.5, 12.5, 13.6363], label: 'INT Increase' },
			{ kind: 'stat_flat', stat: 'luk', values: [[0, 1], [21, 2], [41, 3], [51, 4], [71, 5], [91, 6]], minItemLevel: 0, chance: [12.5, 12.5, 13.6363], label: 'LUK Increase' },
			{ kind: 'hp_flat', values: [[0, 5], [11, 10], [21, 15], [31, 20], [41, 25], [51, 30], [61, 35], [71, 40], [81, 45], [91, 50], [101, 55], [111, 60]], minItemLevel: 0, chance: [18.75, 18.75, 13.6363], label: 'MaxHP Increase' },
			{ kind: 'mp_flat', values: [[0, 5], [11, 10], [21, 15], [31, 20], [41, 25], [51, 30], [61, 35], [71, 40], [81, 45], [91, 50], [101, 55], [111, 60]], minItemLevel: 0, chance: [18.75, 18.75, 13.6363], label: 'MaxMP Increase' },
			{ kind: 'att_flat', values: [[0, 1], [21, 2], [41, 3], [61, 4], [81, 5], [91, 6]], minItemLevel: 0, chance: [6.25, 6.25, 9.0909], label: 'Weapon ATT Increase' },
			{ kind: 'matt_flat', values: [[0, 1], [21, 2], [41, 3], [61, 4], [81, 5], [91, 6]], minItemLevel: 0, chance: [6.25, 6.25, 9.0909], label: 'Magic ATT Increase' },
		],
		rare: [
			{ kind: 'stat_flat', stat: 'str', values: [[0, 2], [21, 4], [41, 6], [51, 8], [71, 10], [91, 12], [151, 13]], minItemLevel: 30, chance: [3.5087, 3.5087, 6.1224], label: 'STR Increase' },
			{ kind: 'stat_flat', stat: 'dex', values: [[0, 2], [21, 4], [41, 6], [51, 8], [71, 10], [91, 12], [151, 13]], minItemLevel: 30, chance: [3.5087, 3.5087, 6.1224], label: 'DEX Increase' },
			{ kind: 'stat_flat', stat: 'int', values: [[0, 2], [21, 4], [41, 6], [51, 8], [71, 10], [91, 12], [151, 13]], minItemLevel: 30, chance: [3.5087, 3.5087, 6.1224], label: 'INT Increase' },
			{ kind: 'stat_flat', stat: 'luk', values: [[0, 2], [21, 4], [41, 6], [51, 8], [71, 10], [91, 12], [151, 13]], minItemLevel: 30, chance: [3.5087, 3.5087, 6.1224], label: 'LUK Increase' },
			{ kind: 'hp_flat', values: [[0, 10], [11, 20], [21, 30], [31, 40], [41, 50], [51, 60], [61, 70], [71, 80], [81, 90], [91, 100], [101, 110], [111, 120], [151, 125]], minItemLevel: 30, chance: [5.2631, 5.2631, 6.1224], label: 'MaxHP Increase' },
			{ kind: 'mp_flat', values: [[0, 10], [11, 20], [21, 30], [31, 40], [41, 50], [51, 60], [61, 70], [71, 80], [81, 90], [91, 100], [101, 110], [111, 120], [151, 125]], minItemLevel: 30, chance: [5.2631, 5.2631, 6.1224], label: 'MaxMP Increase' },
			{ kind: 'att_flat', values: [[0, 2], [21, 4], [41, 6], [61, 8], [81, 10], [91, 12], [151, 13]], minItemLevel: 30, chance: [3.5087, 3.5087, 4.0816], label: 'Weapon ATT Increase' },
			{ kind: 'matt_flat', values: [[0, 2], [21, 4], [41, 6], [61, 8], [81, 10], [91, 12], [151, 13]], minItemLevel: 30, chance: [3.5087, 3.5087, 4.0816], label: 'Magic ATT Increase' },
			{ kind: 'stat_pct', stat: 'str', values: [[0, 1], [31, 2], [71, 3], [151, 4]], minItemLevel: 30, chance: [3.5087, 3.5087, 6.1224], label: 'STR % Increase' },
			{ kind: 'stat_pct', stat: 'dex', values: [[0, 1], [31, 2], [71, 3], [151, 4]], minItemLevel: 30, chance: [3.5087, 3.5087, 6.1224], label: 'DEX % Increase' },
			{ kind: 'stat_pct', stat: 'int', values: [[0, 1], [31, 2], [71, 3], [151, 4]], minItemLevel: 30, chance: [3.5087, 3.5087, 6.1224], label: 'INT % Increase' },
			{ kind: 'stat_pct', stat: 'luk', values: [[0, 1], [31, 2], [71, 3], [151, 4]], minItemLevel: 30, chance: [3.5087, 3.5087, 6.1224], label: 'LUK % Increase' },
			{ kind: 'att_pct', values: [[0, 1], [31, 2], [71, 3], [151, 4]], minItemLevel: 30, chance: [1.7543, 1.7543, 2.0408], label: 'Weapon ATT % Increase' },
			{ kind: 'matt_pct', values: [[0, 1], [31, 2], [71, 3], [151, 4]], minItemLevel: 30, chance: [1.7543, 1.7543, 2.0408], label: 'Magic ATT % Increase' },
			{ kind: 'crit_rate', value: 4, minItemLevel: 30, chance: [1.7543, 1.7543, 2.0408], label: 'Critical Rate +4%' },
			{ kind: 'damage_pct', values: [[0, 1], [31, 2], [71, 3], [151, 4]], minItemLevel: 30, chance: [1.7543, 1.7543, 2.0408], label: 'Damage % Increase' },
			{ kind: 'all_stat_flat', values: [[0, 1], [21, 2], [41, 3], [61, 4], [81, 5], [151, 6]], minItemLevel: 30, chance: [3.5087, 3.5087, 4.0816], label: 'All Stats Increase' },
			{ kind: 'other', values: [[0, 20], [11, 40], [21, 60], [31, 80], [41, 100], [51, 120], [61, 140], [71, 160], [81, 180], [91, 200], [101, 220], [111, 240], [151, 250]], minItemLevel: 30, chance: [5.2631, 5.2631, 2.0408], label: 'Chance to recover HP when attacking' },
			{ kind: 'other', values: [[0, 20], [11, 30], [21, 40], [31, 50], [41, 60], [51, 70], [61, 80], [71, 90], [81, 100], [91, 110], [101, 120], [151, 125]], minItemLevel: 30, chance: [5.2631, 5.2631, 2.0408], label: 'Chance to recover MP when attacking' },
			{ kind: 'other', values: [[10, 1], [51, 2], [101, 3]], minItemLevel: 30, chance: [5.2631, 5.2631, 2.0408], label: 'Chance to inflict darkness when attacking' },
			{ kind: 'other', values: [[10, 1], [71, 2]], minItemLevel: 30, chance: [5.2631, 5.2631, 2.0408], label: 'Chance to inflict slow when attacking' },
			{ kind: 'other', values: [[10, 1], [21, 2], [41, 3], [61, 4], [81, 5], [101, 6]], minItemLevel: 30, chance: [5.2631, 5.2631, 2.0408], label: 'Chance to inflict poison when attacking' },
			{ kind: 'other', values: [[10, 1], [71, 2]], minItemLevel: 30, chance: [5.2631, 5.2631, 2.0408], label: 'Chance to inflict stun when attacking' },
			{ kind: 'other', values: [[10, 1], [71, 2]], minItemLevel: 30, chance: [5.2631, 5.2631, 2.0408], label: 'Chance to inflict seal when attacking' },
			{ kind: 'other', values: [[10, 1], [71, 2]], minItemLevel: 30, chance: [5.2631, 5.2631, 2.0408], label: 'Chance to inflict freeze when attacking' },
			{ kind: 'ied', value: 15, minItemLevel: 30, chance: [1.7543, 1.7543, 2.0408], maxPerItem: 2, label: 'Ignores 15% of Monster\'s DEF when attacking' },
		],
		epic: [
			{ kind: 'stat_pct', stat: 'str', values: [[0, 2], [31, 4], [71, 6], [151, 7]], minItemLevel: 50, chance: [7.6923, 7.6923, 10.8695], label: 'STR % Increase' },
			{ kind: 'stat_pct', stat: 'dex', values: [[0, 2], [31, 4], [71, 6], [151, 7]], minItemLevel: 50, chance: [7.6923, 7.6923, 10.8695], label: 'DEX % Increase' },
			{ kind: 'stat_pct', stat: 'int', values: [[0, 2], [31, 4], [71, 6], [151, 7]], minItemLevel: 50, chance: [7.6923, 7.6923, 10.8695], label: 'INT % Increase' },
			{ kind: 'stat_pct', stat: 'luk', values: [[0, 2], [31, 4], [71, 6], [151, 7]], minItemLevel: 50, chance: [7.6923, 7.6923, 10.8695], label: 'LUK % Increase' },
			{ kind: 'hp_pct', values: [[0, 2], [31, 4], [71, 6], [151, 7]], minItemLevel: 50, chance: [11.5384, 11.5384, 10.8695], label: 'MaxHP % Increase' },
			{ kind: 'mp_pct', values: [[0, 2], [31, 4], [71, 6], [151, 7]], minItemLevel: 50, chance: [11.5384, 11.5384, 10.8695], label: 'MaxMP % Increase' },
			{ kind: 'att_pct', values: [[0, 2], [31, 4], [71, 6], [151, 7]], minItemLevel: 50, chance: [3.8461, 3.8461, 4.3478], label: 'Weapon ATT % Increase' },
			{ kind: 'matt_pct', values: [[0, 2], [31, 4], [71, 6], [151, 7]], minItemLevel: 50, chance: [3.8461, 3.8461, 4.3478], label: 'Magic ATT % Increase' },
			{ kind: 'crit_rate', value: 8, minItemLevel: 50, chance: [3.8461, 3.8461, 4.3478], label: 'Critical Rate +8%' },
			{ kind: 'damage_pct', values: [[0, 2], [31, 4], [71, 6], [151, 7]], minItemLevel: 50, chance: [3.8461, 3.8461, 4.3478], label: 'Damage % Increase' },
			{ kind: 'all_stat_pct', values: [[0, 1], [31, 2], [71, 3], [151, 4]], minItemLevel: 50, chance: [3.8461, 3.8461, 4.3478], label: 'All Stats % Increase' },
			{ kind: 'other', values: [[0, 30], [11, 60], [21, 90], [31, 120], [41, 150], [51, 180], [61, 210], [71, 240], [81, 270], [91, 300], [101, 330], [111, 360], [151, 375]], minItemLevel: 50, chance: [11.5384, 11.5384, 4.3478], label: 'Chance to recover HP when attacking' },
			{ kind: 'other', values: [[0, 30], [11, 45], [21, 60], [31, 75], [41, 90], [51, 105], [61, 120], [71, 135], [81, 150], [91, 165], [101, 180], [151, 187]], minItemLevel: 50, chance: [11.5384, 11.5384, 4.3478], label: 'Chance to recover MP when attacking' },
			{ kind: 'ied', value: 15, minItemLevel: 50, chance: [3.8461, 3.8461, 4.3478], maxPerItem: 2, label: 'Ignore 15% of Monster\'s DEF when attacking' },
		],
		unique: [
			{ kind: 'stat_pct', stat: 'str', values: [[0, 3], [31, 6], [71, 9], [151, 10]], minItemLevel: 50, chance: [14.2857, 14.2857, 12.5], label: 'STR % Increase' },
			{ kind: 'stat_pct', stat: 'dex', values: [[0, 3], [31, 6], [71, 9], [151, 10]], minItemLevel: 50, chance: [14.2857, 14.2857, 12.5], label: 'DEX % Increase' },
			{ kind: 'stat_pct', stat: 'int', values: [[0, 3], [31, 6], [71, 9], [151, 10]], minItemLevel: 50, chance: [14.2857, 14.2857, 12.5], label: 'INT % Increase' },
			{ kind: 'stat_pct', stat: 'luk', values: [[0, 3], [31, 6], [71, 9], [151, 10]], minItemLevel: 50, chance: [14.2857, 14.2857, 12.5], label: 'LUK % Increase' },
			{ kind: 'att_pct', values: [[0, 3], [31, 6], [71, 9], [151, 10]], minItemLevel: 50, chance: [7.1428, 7.1428, 7.5], label: 'Weapon ATT % Increase' },
			{ kind: 'matt_pct', values: [[0, 3], [31, 6], [71, 9], [151, 10]], minItemLevel: 50, chance: [7.1428, 7.1428, 7.5], label: 'Magic ATT % Increase' },
			{ kind: 'crit_rate', values: [[0, 3], [31, 6], [71, 9], [151, 10]], minItemLevel: 50, chance: [7.1428, 7.1428, 10], label: 'Critical Rate % Increase' },
			{ kind: 'damage_pct', values: [[0, 3], [31, 6], [71, 9], [151, 10]], minItemLevel: 50, chance: [7.1428, 7.1428, 7.5], label: 'Damage % Increase' },
			{ kind: 'all_stat_pct', values: [[0, 2], [31, 4], [71, 6], [151, 7]], minItemLevel: 50, chance: [7.1428, 7.1428, 10], label: 'All Stats % Increase' },
			{ kind: 'ied', value: 30, minItemLevel: 50, chance: [7.1428, 7.1428, 7.5], maxPerItem: 2, label: 'Ignore 30% of Monster\'s DEF when attacking' },
		],
		legendary: [
			{ kind: 'stat_pct', stat: 'str', values: [[0, 6], [31, 9], [71, 12], [151, 13]], minItemLevel: 100, chance: [9.0909, 12.9032, 11.4285], label: 'STR % Increase' },
			{ kind: 'stat_pct', stat: 'dex', values: [[0, 6], [31, 9], [71, 12], [151, 13]], minItemLevel: 100, chance: [9.0909, 12.9032, 11.4285], label: 'DEX % Increase' },
			{ kind: 'stat_pct', stat: 'int', values: [[0, 6], [31, 9], [71, 12], [151, 13]], minItemLevel: 100, chance: [9.0909, 12.9032, 11.4285], label: 'INT % Increase' },
			{ kind: 'stat_pct', stat: 'luk', values: [[0, 6], [31, 9], [71, 12], [151, 13]], minItemLevel: 100, chance: [9.0909, 12.9032, 11.4285], label: 'LUK % Increase' },
			{ kind: 'att_pct', values: [[0, 6], [31, 9], [71, 12], [151, 13]], minItemLevel: 100, chance: [4.5454, 6.4516, 5.7142], label: 'Weapon ATT % Increase' },
			{ kind: 'matt_pct', values: [[0, 6], [31, 9], [71, 12], [151, 13]], minItemLevel: 100, chance: [4.5454, 6.4516, 5.7142], label: 'Magic ATT % Increase' },
			{ kind: 'crit_rate', values: [[0, 6], [31, 9], [71, 12], [151, 13]], minItemLevel: 100, chance: [4.5454, 6.4516, 5.7142], label: 'Critical Rate % Increase' },
			{ kind: 'damage_pct', values: [[0, 6], [31, 9], [71, 12], [151, 13]], minItemLevel: 100, chance: [4.5454, 6.4516, 5.7142], label: 'Damage % Increase' },
			{ kind: 'all_stat_pct', values: [[0, 3], [31, 6], [71, 9], [151, 10]], minItemLevel: 100, chance: [9.0909, 12.9032, 8.5714], label: 'All Stats % Increase' },
			{ kind: 'att_per_10_levels', value: 1, minItemLevel: 100, chance: [13.6363, 0, 5.7142], label: 'Weapon ATT +1 per 10 Character Levels' },
			{ kind: 'matt_per_10_levels', value: 1, minItemLevel: 100, chance: [13.6363, 0, 5.7142], label: 'Magic ATT +1 per 10 Character Levels' },
			{ kind: 'ied', value: 35, minItemLevel: 100, chance: [4.5454, 6.4516, 5.7142], maxPerItem: 2, label: 'Ignore 35% of Monster\'s DEF when attacking' },
			{ kind: 'ied', value: 40, minItemLevel: 100, chance: [4.5454, 3.2258, 5.7142], maxPerItem: 2, label: 'Ignore 40% of Monster\'s DEF when attacking' },
		],
	},
	heartBadge: {
		belowRare: [
			{ kind: 'stat_flat', stat: 'str', values: [[0, 1], [21, 2], [41, 3], [51, 4], [71, 5], [91, 6]], minItemLevel: 0, chance: [11.7647, 11.7647, 14.2857], label: 'STR Increase' },
			{ kind: 'stat_flat', stat: 'dex', values: [[0, 1], [21, 2], [41, 3], [51, 4], [71, 5], [91, 6]], minItemLevel: 0, chance: [11.7647, 11.7647, 14.2857], label: 'DEX Increase' },
			{ kind: 'stat_flat', stat: 'int', values: [[0, 1], [21, 2], [41, 3], [51, 4], [71, 5], [91, 6]], minItemLevel: 0, chance: [11.7647, 11.7647, 14.2857], label: 'INT Increase' },
			{ kind: 'stat_flat', stat: 'luk', values: [[0, 1], [21, 2], [41, 3], [51, 4], [71, 5], [91, 6]], minItemLevel: 0, chance: [11.7647, 11.7647, 14.2857], label: 'LUK Increase' },
			{ kind: 'hp_flat', values: [[0, 5], [11, 10], [21, 15], [31, 20], [41, 25], [51, 30], [61, 35], [71, 40], [81, 45], [91, 50], [101, 55], [111, 60]], minItemLevel: 0, chance: [17.647, 17.647, 14.2857], label: 'MaxHP Increase' },
			{ kind: 'mp_flat', values: [[0, 5], [11, 10], [21, 15], [31, 20], [41, 25], [51, 30], [61, 35], [71, 40], [81, 45], [91, 50], [101, 55], [111, 60]], minItemLevel: 0, chance: [17.647, 17.647, 14.2857], label: 'MaxMP Increase' },
			{ kind: 'def_flat', values: [[0, 5], [11, 10], [21, 15], [31, 20], [41, 25], [51, 30], [61, 35], [71, 40], [81, 45], [91, 50], [101, 55], [111, 60]], minItemLevel: 0, chance: [17.647, 17.647, 14.2857], label: 'DEF Increase' },
		],
		rare: [
			{ kind: 'stat_flat', stat: 'str', values: [[0, 2], [21, 4], [41, 6], [51, 8], [71, 10], [91, 12], [151, 13]], minItemLevel: 0, chance: [5.5555, 5.5555, 7.5], label: 'STR Increase' },
			{ kind: 'stat_flat', stat: 'dex', values: [[0, 2], [21, 4], [41, 6], [51, 8], [71, 10], [91, 12], [151, 13]], minItemLevel: 0, chance: [5.5555, 5.5555, 7.5], label: 'DEX Increase' },
			{ kind: 'stat_flat', stat: 'int', values: [[0, 2], [21, 4], [41, 6], [51, 8], [71, 10], [91, 12], [151, 13]], minItemLevel: 0, chance: [5.5555, 5.5555, 7.5], label: 'INT Increase' },
			{ kind: 'stat_flat', stat: 'luk', values: [[0, 2], [21, 4], [41, 6], [51, 8], [71, 10], [91, 12], [151, 13]], minItemLevel: 0, chance: [5.5555, 5.5555, 7.5], label: 'LUK Increase' },
			{ kind: 'hp_flat', values: [[0, 10], [11, 20], [21, 30], [31, 40], [41, 50], [51, 60], [61, 70], [71, 80], [81, 90], [91, 100], [101, 110], [111, 120], [151, 125]], minItemLevel: 0, chance: [8.3333, 8.3333, 7.5], label: 'MaxHP Increase' },
			{ kind: 'mp_flat', values: [[0, 10], [11, 20], [21, 30], [31, 40], [41, 50], [51, 60], [61, 70], [71, 80], [81, 90], [91, 100], [101, 110], [111, 120], [151, 125]], minItemLevel: 0, chance: [8.3333, 8.3333, 7.5], label: 'MaxMP Increase' },
			{ kind: 'def_flat', values: [[0, 10], [11, 20], [21, 30], [31, 40], [41, 50], [51, 60], [61, 70], [71, 80], [81, 90], [91, 100], [101, 110], [111, 120], [151, 125]], minItemLevel: 0, chance: [8.3333, 8.3333, 5], label: 'DEF Increase' },
			{ kind: 'stat_pct', stat: 'str', values: [[0, 1], [31, 2], [71, 3], [151, 4]], minItemLevel: 0, chance: [5.5555, 5.5555, 7.5], label: 'STR % Increase' },
			{ kind: 'stat_pct', stat: 'dex', values: [[0, 1], [31, 2], [71, 3], [151, 4]], minItemLevel: 0, chance: [5.5555, 5.5555, 7.5], label: 'DEX % Increase' },
			{ kind: 'stat_pct', stat: 'int', values: [[0, 1], [31, 2], [71, 3], [151, 4]], minItemLevel: 0, chance: [5.5555, 5.5555, 7.5], label: 'INT % Increase' },
			{ kind: 'stat_pct', stat: 'luk', values: [[0, 1], [31, 2], [71, 3], [151, 4]], minItemLevel: 0, chance: [5.5555, 5.5555, 7.5], label: 'LUK % Increase' },
			{ kind: 'hp_pct', values: [[0, 1], [31, 2], [71, 3], [151, 4]], minItemLevel: 0, chance: [8.3333, 8.3333, 5], label: 'MaxHP % Increase' },
			{ kind: 'mp_pct', values: [[0, 1], [31, 2], [71, 3], [151, 4]], minItemLevel: 0, chance: [8.3333, 8.3333, 5], label: 'MaxMP % Increase' },
			{ kind: 'def_pct', values: [[0, 1], [31, 2], [71, 3], [151, 4]], minItemLevel: 0, chance: [8.3333, 8.3333, 5], label: 'DEF % Increase' },
			{ kind: 'all_stat_flat', values: [[0, 1], [21, 2], [41, 3], [61, 4], [81, 5], [151, 6]], minItemLevel: 0, chance: [5.5555, 5.5555, 5], label: 'All Stats Increase' },
		],
		epic: [
			{ kind: 'stat_pct', stat: 'str', values: [[0, 2], [31, 4], [71, 6], [151, 7]], minItemLevel: 0, chance: [11.1111, 11.1111, 14.2857], label: 'STR % Increase' },
			{ kind: 'stat_pct', stat: 'dex', values: [[0, 2], [31, 4], [71, 6], [151, 7]], minItemLevel: 0, chance: [11.1111, 11.1111, 14.2857], label: 'DEX % Increase' },
			{ kind: 'stat_pct', stat: 'int', values: [[0, 2], [31, 4], [71, 6], [151, 7]], minItemLevel: 0, chance: [11.1111, 11.1111, 14.2857], label: 'INT % Increase' },
			{ kind: 'stat_pct', stat: 'luk', values: [[0, 2], [31, 4], [71, 6], [151, 7]], minItemLevel: 0, chance: [11.1111, 11.1111, 14.2857], label: 'LUK % Increase' },
			{ kind: 'hp_pct', values: [[0, 2], [31, 4], [71, 6], [151, 7]], minItemLevel: 0, chance: [16.6666, 16.6666, 14.2857], label: 'MaxHP % Increase' },
			{ kind: 'mp_pct', values: [[0, 2], [31, 4], [71, 6], [151, 7]], minItemLevel: 0, chance: [16.6666, 16.6666, 14.2857], label: 'MaxMP % Increase' },
			{ kind: 'def_pct', values: [[0, 2], [31, 4], [71, 6], [151, 7]], minItemLevel: 0, chance: [16.6666, 16.6666, 8.5714], label: 'DEF % Increase' },
			{ kind: 'all_stat_pct', values: [[0, 1], [31, 2], [71, 3], [151, 4]], minItemLevel: 0, chance: [5.5555, 5.5555, 5.7142], label: 'All Stats % Increase' },
		],
		unique: [
			{ kind: 'stat_pct', stat: 'str', values: [[0, 3], [31, 6], [71, 9], [151, 10]], minItemLevel: 0, chance: [9.5238, 9.5238, 11.3636], label: 'STR % Increase' },
			{ kind: 'stat_pct', stat: 'dex', values: [[0, 3], [31, 6], [71, 9], [151, 10]], minItemLevel: 0, chance: [9.5238, 9.5238, 11.3636], label: 'DEX % Increase' },
			{ kind: 'stat_pct', stat: 'int', values: [[0, 3], [31, 6], [71, 9], [151, 10]], minItemLevel: 0, chance: [9.5238, 9.5238, 11.3636], label: 'INT % Increase' },
			{ kind: 'stat_pct', stat: 'luk', values: [[0, 3], [31, 6], [71, 9], [151, 10]], minItemLevel: 0, chance: [9.5238, 9.5238, 11.3636], label: 'LUK % Increase' },
			{ kind: 'hp_pct', values: [[0, 3], [31, 6], [71, 9]], minItemLevel: 0, chance: [14.2857, 14.2857, 13.6363], label: 'MaxHP % Increase' },
			{ kind: 'mp_pct', values: [[0, 3], [31, 6], [71, 9]], minItemLevel: 0, chance: [14.2857, 14.2857, 13.6363], label: 'MaxMP % Increase' },
			{ kind: 'def_pct', values: [[0, 3], [31, 6], [71, 9]], minItemLevel: 0, chance: [14.2857, 14.2857, 9.0909], label: 'DEF % Increase' },
			{ kind: 'all_stat_pct', values: [[0, 2], [31, 4], [71, 6], [151, 7]], minItemLevel: 0, chance: [4.7619, 4.7619, 9.0909], label: 'All Stats % Increase' },
			{ kind: 'hp_recovery', values: [[0, 10], [31, 20], [71, 30]], minItemLevel: 0, chance: [14.2857, 14.2857, 9.0909], label: 'Skills and Potion HP Recovery % Increase' },
		],
		legendary: [
			{ kind: 'stat_pct', stat: 'str', values: [[0, 6], [31, 9], [71, 12], [151, 13]], minItemLevel: 0, chance: [9.0909, 9.0909, 12.9032], label: 'STR % Increase' },
			{ kind: 'stat_pct', stat: 'dex', values: [[0, 6], [31, 9], [71, 12], [151, 13]], minItemLevel: 0, chance: [9.0909, 9.0909, 12.9032], label: 'DEX % Increase' },
			{ kind: 'stat_pct', stat: 'int', values: [[0, 6], [31, 9], [71, 12], [151, 13]], minItemLevel: 0, chance: [9.0909, 9.0909, 12.9032], label: 'INT % Increase' },
			{ kind: 'stat_pct', stat: 'luk', values: [[0, 6], [31, 9], [71, 12], [151, 13]], minItemLevel: 0, chance: [9.0909, 9.0909, 12.9032], label: 'LUK % Increase' },
			{ kind: 'hp_pct', values: [[0, 6], [31, 9], [71, 12]], minItemLevel: 0, chance: [13.6363, 13.6363, 12.9032], label: 'MaxHP % Increase' },
			{ kind: 'mp_pct', values: [[0, 6], [31, 9], [71, 12]], minItemLevel: 0, chance: [13.6363, 13.6363, 12.9032], label: 'MaxMP % Increase' },
			{ kind: 'def_pct', values: [[0, 6], [31, 9], [71, 12]], minItemLevel: 0, chance: [13.6363, 13.6363, 12.9032], label: 'DEF % Increase' },
			{ kind: 'all_stat_pct', values: [[0, 3], [31, 6], [71, 9], [151, 10]], minItemLevel: 0, chance: [9.0909, 9.0909, 9.6774], label: 'All Stats % Increase' },
			{ kind: 'hp_recovery', values: [[0, 20], [31, 30], [71, 40]], minItemLevel: 0, chance: [13.6363, 13.6363, 0], label: 'Skills and Potion HP Recovery % Increase' },
		],
	},
};

/* -------------------------------------------------------------------------- */
/* UNRESOLVED SOURCE CONFLICT: the high-rank %DEF line                         */
/* -------------------------------------------------------------------------- */

/**
 * ⚠️ **UNVERIFIED — the one place GMS and KMS sources disagree, and it is worth 1.34×.**
 *
 * StrategyWiki's GMS tables carry a `DEF %` line in the **Unique** and
 * **Legendary** armour and accessory pools. Nexon KR's own disclosure (as scraped
 * into MathBro's `cubeRates.js`) does **not** — and that is not a scraping
 * artifact: the same scrape *does* capture `Defense : +6%` at Epic and
 * `Defense : +3%` at Rare, so the tool would have shown it at the top ranks had
 * it been there. Both tables are internally consistent (each sums to 100 %), so
 * they describe genuinely different pools — or the same pool at two different
 * points in time.
 *
 * **Numeric consequence.** `DEF %` carries weight 4 in every affected pool, so
 * including it enlarges the pool and makes every *other* line rarer:
 *
 * | group | GMS pool weight | KMS pool weight | cost factor on a 3-line target |
 * |---|---|---|---|
 * | `accessory` | 43 | 39 | (43/39)³ = **1.34×** |
 * | `gloves` | 44 | 40 | **1.33×** |
 * | `hat` | 45 | 41 | **1.32×** |
 * | `weapon` / `secondary` / `emblem` | — | — | **1.00× (no `DEF %` in either)** |
 *
 * So every weapon-group number in this module reconciles with the reference
 * calculator to six significant figures, and every armour/accessory number is
 * ~1.34× more pessimistic. `potential-lines.spec.ts` pins both.
 *
 * **Which is right for GMS today is unresolved.** No third source was reachable
 * (StrategyWiki 403s scripts, `whackybeanz` is 404, MapleStory Wiki's stat-table
 * page is still empty). We keep GMS as the source of record per the project's
 * region rule, and expose `PoolVariant` so the disagreement is measurable rather
 * than hidden. **Do not present an armour or accessory cube cost as exact to
 * better than ~1.4× until this is confirmed from an in-game tooltip.**
 */
export const UNVERIFIED_HIGH_RANK_DEF_PERCENT_LINE = {
	/** Ranks where the sources disagree. Rare and Epic agree: both have `DEF %`. */
	ranks: ['unique', 'legendary'] as const,
	/** Groups affected. Weapon-likes have no `DEF %` line in either source. */
	groups: [
		'hat',
		'topOverall',
		'bottom',
		'gloves',
		'shoes',
		'capeBeltShoulder',
		'accessory',
		'heartBadge'
	] as const,
	presentIn: 'gms',
	absentIn: 'kms',
	/** Approximate cost multiplier GMS applies over KMS on a 3-line stat target. */
	approxThreeLineCostFactor: 1.34
} as const;

/* -------------------------------------------------------------------------- */
/* Line-count caps and the pool re-normalisation rule                          */
/* -------------------------------------------------------------------------- */

/**
 * How many lines of a given kind one item may carry.
 *
 * Nexon's documented rule for what happens when a cap is reached (from the KMS
 * probability disclosure, `https://maplestory.nexon.com/Guide/OtherProbability/cube/strange`):
 *
 * > display probability / (100% − the sum of the display probabilities of the excluded options)
 *
 * i.e. the capped line is removed from the pool for the remaining lines and the
 * rest are re-normalised. `lineDistribution` / `targetProbability` implement that.
 *
 * ⚠️ **CONFLICT, resolved in favour of 3.** StrategyWiki still says Boss Damage,
 * Ignore DEF and Item Drop Rate "can only appear up to 2 times on a single cube"
 * (that text is preserved verbatim in each `PoolLine.maxPerItem`). That
 * restriction was **removed** in KMST ver. 1.2.168 (January 2024):
 *
 * > "When resetting potential or additional potential, it has been changed so that
 * >  the stats below can appear 3 times on the same item. Monster Defense Ignore +%,
 * >  Damage Increase When Attacking Boss Monsters +%, Item Drop Rate +%"
 *
 * <https://orangemushroom.net/2024/01/19/kmst-ver-1-2-168-meso-changes-and-new-potential-reset-system/>
 * MathBro's (GMS-facing) cubing calculator followed suit in June 2024
 * ("Now accounts for possibility of 3 line boss, IED, and drop",
 * commit `60879c3`), so 3-line boss / IED / drop is live in GMS.
 *
 * The other three caps are unchanged and still bite, because they re-normalise the
 * pool for later lines even though we never *want* those lines.
 */
export const MAX_LINES_PER_ITEM: Readonly<Partial<Record<PoolLineKind, number>>> = {
	boss: 3,
	ied: 3,
	drop: 3,
	ignore_damage: 2,
	invincible_chance: 2,
	invincible_time: 1,
	decent_skill: 1
};

/** Kinds whose count is capped, i.e. whose exhaustion re-normalises the pool. */
export const RESTRICTED_KINDS: readonly PoolLineKind[] = Object.keys(
	MAX_LINES_PER_ITEM
) as PoolLineKind[];

function isRestricted(kind: PoolLineKind): boolean {
	return MAX_LINES_PER_ITEM[kind] !== undefined;
}

/* -------------------------------------------------------------------------- */
/* Cubes                                                                       */
/* -------------------------------------------------------------------------- */

/**
 * Prime-line rates by cube.
 *
 * Cash cubes: the rate depends on the **cube and the line position only** —
 * "if the 2nd line is not a prime line, the chance of the 3rd line being a prime
 * line still remains the same" (StrategyWiki). In-game cubes: the rate depends on
 * the **cube and the item's rank**, and lines 2 and 3 share it.
 *
 * The 1st line is always prime. `null` = that cube cannot be used at that rank.
 * formulas.md §4A §3.4 · <https://strategywiki.org/wiki/MapleStory/Potential_System>
 */
export const CUBE_PRIME_LINE_RATES = {
	/** Occult / Suspicious Cube */
	mystical: {
		source: 'inGameCube',
		byGrade: { rare: 0.000999, epic: 0.0099, unique: null, legendary: null }
	},
	/** Master Craftsman's / Yellow Cube */
	hard: {
		source: 'inGameCube',
		byGrade: { rare: 0.166666, epic: 0.047619, unique: 0.011857, legendary: null }
	},
	/** Meister's / Purple Cube */
	solid: {
		source: 'inGameCube',
		byGrade: { rare: 0.166666, epic: 0.079994, unique: 0.016958, legendary: 0.001996 }
	},
	/** RED Cube — Heroic buys it for 12M mesos */
	glowing: { source: 'cashCube', secondLine: 0.1, thirdLine: 0.01 },
	/** Black Cube — Heroic buys it for 22M mesos */
	bright: { source: 'cashCube', secondLine: 0.2, thirdLine: 0.05 }
} as const;

/**
 * Heroic (Reboot) meso prices. In-game cubes are drops/crafts, not purchases, so
 * they have no meso price — `null`, never 0, so a caller cannot silently price a
 * Solid-cube plan at zero. formulas.md §4A §3.7 · <https://maplestorywiki.net/w/Cube>
 */
export const HEROIC_CUBE_MESO_PRICE: Readonly<Record<CubeId, number | null>> = {
	mystical: null,
	hard: null,
	solid: null,
	glowing: 12_000_000,
	bright: 22_000_000
};

/** Highest rank each cube can produce. */
export const CUBE_MAX_GRADE: Readonly<Record<CubeId, PoolGrade>> = {
	mystical: 'epic',
	hard: 'unique',
	solid: 'legendary',
	glowing: 'legendary',
	bright: 'legendary'
};

/**
 * One-time cost to reveal hidden potential: `constant × itemLevel²`.
 * StrategyWiki "Reveal Potential Cost". This is **not** charged per cube — a cube
 * leaves the new potential revealed — so `cubeCost` excludes it by default.
 * (MathBro's calculator adds it to every cube; that is a modelling choice, not a
 * rule we could source.) Waived entirely at Insight 60/90 for low-level gear.
 */
export const REVEAL_POTENTIAL_COST_CONSTANT = [
	{ minItemLevel: 0, constant: 0 },
	{ minItemLevel: 31, constant: 0.5 },
	{ minItemLevel: 71, constant: 2.5 },
	{ minItemLevel: 121, constant: 20 }
] as const;

/** `revealPotentialCost(200) === 800_000`. */
export function revealPotentialCost(itemLevel: number): number {
	let constant = 0;
	for (const row of REVEAL_POTENTIAL_COST_CONSTANT)
		if (itemLevel >= row.minItemLevel) constant = row.constant;
	return constant * itemLevel * itemLevel;
}

/** The probability column a cube reads. */
export function chanceSourceForCube(cube: CubeId): ChanceSource {
	return CUBE_PRIME_LINE_RATES[cube].source;
}

/**
 * `[line1, line2, line3]` prime chances for a cube used on an item of this rank.
 * Throws when the cube cannot be used at that rank.
 */
export function primeLineRates(cube: CubeId, grade: PoolGrade): [number, number, number] {
	const spec = CUBE_PRIME_LINE_RATES[cube];
	if (spec.source === 'cashCube') return [1, spec.secondLine, spec.thirdLine];
	const rate = spec.byGrade[grade];
	if (rate === null) {
		throw new Error(`Cube "${cube}" cannot be used on ${grade} potential`);
	}
	return [1, rate, rate];
}

/* -------------------------------------------------------------------------- */
/* Pool access and line values                                                 */
/* -------------------------------------------------------------------------- */

/** The pool a **prime** line of this rank rolls from. */
export function primePoolRank(grade: PoolGrade): PoolRank {
	return grade;
}

/** The pool a **non-prime** (2nd/3rd) line on an item of this rank rolls from. */
export function nonPrimePoolRank(grade: PoolGrade): PoolRank {
	switch (grade) {
		case 'legendary':
			return 'unique';
		case 'unique':
			return 'epic';
		case 'epic':
			return 'rare';
		case 'rare':
			return 'belowRare';
	}
}

/**
 * The raw pool.
 *
 * `variant: 'kms'` drops the disputed high-rank `DEF %` line — see
 * `UNVERIFIED_HIGH_RANK_DEF_PERCENT_LINE`. It exists so the disagreement can be
 * measured; `'gms'` is the default and the source of record.
 */
export function linePool(
	group: PotentialPoolGroup,
	rank: PoolRank,
	variant: PoolVariant = 'gms'
): readonly PoolLine[] {
	const pool = POTENTIAL_LINE_POOLS[group][rank];
	if (variant === 'gms') return pool;
	if (rank !== 'unique' && rank !== 'legendary') return pool;
	return pool.filter((line) => line.kind !== 'def_pct');
}

/**
 * The pool as a given cube actually sees it: lines with a `0` chance in that
 * column are dropped. **This is the number that drives the cost**, so it is worth
 * looking at directly — e.g. `rollablePool('gloves', 'legendary', 'cashCube')`
 * has 12 entries, which is why one specific glove line is a ~1-in-11 shot.
 */
export function rollablePool(
	group: PotentialPoolGroup,
	rank: PoolRank,
	source: ChanceSource,
	variant: PoolVariant = 'gms'
): readonly PoolLine[] {
	const index = SOURCE_INDEX[source];
	return linePool(group, rank, variant).filter((l) => l.chance[index] > 0);
}

const SOURCE_INDEX: Readonly<Record<ChanceSource, 0 | 1 | 2>> = {
	initial: 0,
	inGameCube: 1,
	cashCube: 2
};

/** Published chance (whole percent) of one line in one pool, for one cube column. */
export function lineChance(line: PoolLine, source: ChanceSource): number {
	return line.chance[SOURCE_INDEX[source]];
}

/** Lowest item level at which the source publishes this pool. */
export function poolMinItemLevel(group: PotentialPoolGroup, rank: PoolRank): number {
	return Math.max(...linePool(group, rank).map((l) => l.minItemLevel));
}

/**
 * The item levels at which any line in a pool changes value — the answer to
 * "which breakpoints matter for this slot?". Always includes 151 for pools with
 * `%` stat lines (the GMS bump `potential.ts` already models).
 */
export function itemLevelBreakpoints(group: PotentialPoolGroup, rank: PoolRank): number[] {
	const set = new Set<number>();
	for (const line of linePool(group, rank)) for (const [lvl] of line.values ?? []) set.add(lvl);
	return [...set].sort((a, b) => a - b);
}

/**
 * The GMS-only top row of the `%` scale. A Lv160 AbsoLab, a Lv200 Arcane and a
 * Lv250 Genesis all sit on it (`potential.ts` §POTENTIAL_PERCENT_SCALE).
 *
 * ⚠️ Not every `%` line gets the bump: `stat_pct` and `all_stat_pct` do, but
 * `hp_pct`, `mp_pct` and `def_pct` have **no 151+ row** in the source and stay at
 * 12% / 9%. That asymmetry is real and is preserved in the `values` tables.
 */
export const GMS_PERCENT_LINE_BREAKPOINT = 151;

/**
 * The value a line takes on a given item.
 *
 * Returns `null` when the line has no value at that item level (e.g. glove
 * Critical Damage below item level 50) or carries no numeric value at all
 * (Decent skills, "chance to ignore damage").
 *
 * `characterLevel` is only consulted by the `+1 per 10 character levels` lines.
 */
export function lineValueAtLevel(
	line: PoolLine,
	itemLevel: number,
	characterLevel?: number
): number | null {
	if (
		line.kind === 'att_per_10_levels' ||
		line.kind === 'matt_per_10_levels' ||
		line.kind === 'stat_per_10_levels'
	) {
		if (characterLevel === undefined) return null;
		return (line.value ?? 1) * Math.floor(characterLevel / 10);
	}
	if (line.values && line.values.length > 0) {
		let value: number | null = null;
		for (const [minLevel, v] of line.values) if (itemLevel >= minLevel) value = v;
		return value;
	}
	return line.value ?? null;
}

/** Value magnitude, used for all `minValue` / `totalValue` comparisons. Cooldown lines are stored negative. */
function magnitude(value: number | null): number | null {
	return value === null ? null : Math.abs(value);
}

/* -------------------------------------------------------------------------- */
/* Matching a wanted line                                                      */
/* -------------------------------------------------------------------------- */

/** What the user wants out of one line. */
export interface LineMatcher {
	/** Kind, or any of several kinds (e.g. `['boss', 'ied']` for "boss or IED"). */
	readonly kind: PoolLineKind | readonly PoolLineKind[];
	/**
	 * Which stat a stat-bearing line must carry.
	 *
	 * The filter applies **only to lines that have a stat**: a matcher of
	 * `{ kind: ['stat_pct', 'all_stat_pct'], stat: 'str' }` therefore matches
	 * `STR %` lines *and* `All Stat %` lines, and ignores DEX/INT/LUK. That is
	 * deliberate — All Stat raises your main stat too, so it counts toward the
	 * same total, exactly as the reference cubing calculators score it.
	 *
	 * **Omitting `stat` on a multi-line stat requirement is almost always a bug**
	 * and is rejected — see `LineRequirement.anyStat`.
	 */
	readonly stat?: PoolStat;
	/**
	 * Minimum value **magnitude** per matching line, e.g. `minValue: 40` to demand
	 * the 40% boss line rather than the 35%. Cooldown is matched by magnitude, so
	 * `{ kind: 'cooldown', minValue: 2 }` means the −2s hat line.
	 */
	readonly minValue?: number;
}

/** One requirement on the finished 3-line potential. */
export interface LineRequirement extends LineMatcher {
	/** How many matching lines are needed. Default 1. */
	readonly lines?: number;
	/** Minimum summed magnitude across matching lines, e.g. `totalValue: 4` for 4 seconds of cooldown. */
	readonly totalValue?: number;
	/**
	 * Opt in to counting STR / DEX / INT / LUK lines **interchangeably**.
	 *
	 * Without this, a stat requirement asking for more than one line (or a
	 * `totalValue`) must name a `stat`. The reason is a trap that is very easy to
	 * fall into and that silently produces answers ~40x too cheap:
	 * `{ kind: 'stat_pct', lines: 3, totalValue: 33 }` is satisfied by
	 * `STR +12% / DEX +12% / LUK +9%`, which is worth nothing to a real character.
	 * Naming the stat gives the number the ranker actually wants.
	 *
	 * Legitimate uses: Xenon (STR, DEX and LUK all count) and "which stat did I
	 * roll?" queries. Everything else wants `stat`.
	 */
	readonly anyStat?: boolean;
}

/** Kinds whose value only helps when every matching line carries the *same* stat. */
const STAT_BEARING_KINDS: readonly PoolLineKind[] = ['stat_pct', 'stat_flat', 'stat_per_10_levels'];

/** A whole target configuration: every requirement must hold simultaneously. */
export type PotentialTarget = readonly LineRequirement[];

/** Convenience: `requireLines('boss', 3)` → "three Boss Damage lines, any value". */
export function requireLines(
	kind: PoolLineKind | readonly PoolLineKind[],
	lines = 1,
	minValue?: number
): LineRequirement {
	return minValue === undefined ? { kind, lines } : { kind, lines, minValue };
}

function kindList(matcher: LineMatcher): readonly PoolLineKind[] {
	const kind = matcher.kind;
	return typeof kind === 'string' ? [kind] : kind;
}

function kindMatches(matcher: LineMatcher, kind: PoolLineKind): boolean {
	return kindList(matcher).includes(kind);
}

/** Does one rolled line satisfy a matcher? `stat` only constrains stat-bearing lines. */
function lineMatches(
	matcher: LineMatcher,
	line: { kind: PoolLineKind; stat?: PoolStat; value: number | null }
): boolean {
	if (!kindMatches(matcher, line.kind)) return false;
	if (matcher.stat !== undefined && line.stat !== undefined && line.stat !== matcher.stat) {
		return false;
	}
	if (matcher.minValue !== undefined && (line.value === null || line.value < matcher.minValue)) {
		return false;
	}
	return true;
}

/**
 * Reject the "any stat counts" trap before it can produce a wrong number.
 *
 * See `LineRequirement.anyStat`. This throws rather than warns because the
 * failure mode is silent and large: the ranker would print ~1.5 B mesos for a
 * target that really costs ~66 B.
 */
export function validateTarget(target: PotentialTarget): void {
	for (const req of target) {
		const statBearing = kindList(req).some((k) => STAT_BEARING_KINDS.includes(k));
		const multi = (req.lines ?? 1) > 1 || req.totalValue !== undefined;
		if (statBearing && multi && req.stat === undefined && req.anyStat !== true) {
			throw new Error(
				`Ambiguous stat requirement ${JSON.stringify(req)}: it asks for multiple stat ` +
					'lines but does not name a `stat`, so STR/DEX/INT/LUK lines would count ' +
					'interchangeably — roughly 40x too cheap for a real character. Pass ' +
					'`stat: "str"` (All Stat % lines still count when `all_stat_pct` is in ' +
					'`kind`), or use `mainStatPercent(stat, total)`. `anyStat: true` opts in ' +
					'deliberately, for Xenon.'
			);
		}
	}
}

/**
 * "N %+ Stat" as the reference cubing calculators mean it: **main-stat % lines
 * plus All Stat % lines**, summed across all three lines.
 *
 * `mainStatPercent('luk', 33)` on a Lv150 Legendary accessory is the `12/12/9`
 * roll — two prime LUK lines plus one All Stat (or one non-prime LUK).
 */
export function mainStatPercent(stat: PoolStat, totalPercent: number): LineRequirement {
	return { kind: ['stat_pct', 'all_stat_pct'], stat, totalValue: totalPercent };
}

/**
 * "N %+ ATT" — summed `%ATT` across all three lines. All Stat does **not** count
 * (it raises stat, not attack), matching the reference calculators.
 */
export function attackPercent(totalPercent: number, magic = false): LineRequirement {
	return { kind: magic ? 'matt_pct' : 'att_pct', totalValue: totalPercent };
}

/* -------------------------------------------------------------------------- */
/* Distributions                                                               */
/* -------------------------------------------------------------------------- */

/** What we actually roll for: a cube used on an item at a rank. */
export interface RollContext {
	readonly group: PotentialPoolGroup;
	readonly itemLevel: number;
	/** The rank the item is (and stays) at. Rank-ups are priced separately. */
	readonly grade: PoolGrade;
	readonly cube: CubeId;
	/** Only needed when a `+1 per 10 character levels` line is part of the target. */
	readonly characterLevel?: number;
	/** Defaults to `'gms'`. See `UNVERIFIED_HIGH_RANK_DEF_PERCENT_LINE`. */
	readonly poolVariant?: PoolVariant;
}

/** One possible outcome for one line slot. */
export interface LineOutcome {
	readonly kind: PoolLineKind;
	readonly stat?: PoolStat;
	/** Resolved magnitude on this item, or `null` when the line has no value. */
	readonly value: number | null;
	/** Probability within this line slot; the slot's outcomes sum to 1. */
	readonly p: number;
	/** Whether this outcome is a real pool line or the merged "everything else" bucket. */
	readonly junk: boolean;
	readonly labels: readonly string[];
}

function normalise(
	group: PotentialPoolGroup,
	rank: PoolRank,
	source: ChanceSource,
	variant: PoolVariant = 'gms'
) {
	const pool = rollablePool(group, rank, source, variant);
	const total = pool.reduce((sum, l) => sum + lineChance(l, source), 0);
	if (total <= 0) throw new Error(`Empty pool: ${group}/${rank}/${source}`);
	return pool.map((line) => ({ line, p: lineChance(line, source) / total }));
}

/**
 * The full probability distribution for one of the three line slots, before any
 * cap re-normalisation (that depends on what the earlier lines rolled).
 *
 * `index` 0 is always prime; 1 and 2 mix the prime pool and the rank-below pool
 * by the cube's prime-line rate.
 */
export function lineDistribution(ctx: RollContext, index: 0 | 1 | 2): LineOutcome[] {
	assertCubeUsable(ctx);
	const source = chanceSourceForCube(ctx.cube);
	const primeRate = primeLineRates(ctx.cube, ctx.grade)[index];
	const merged = new Map<
		string,
		{ kind: PoolLineKind; stat?: PoolStat; value: number | null; p: number; labels: string[] }
	>();
	// Two lines are the SAME outcome iff they have the same kind, stat and resolved
	// value. A prime `+13% ATT` and a non-prime `+10% ATT` must stay distinct, which
	// is why the key carries the resolved value and not the source line's label.
	const add = (line: PoolLine, p: number) => {
		const value = magnitude(lineValueAtLevel(line, ctx.itemLevel, ctx.characterLevel));
		const key = `${line.kind}|${line.stat ?? ''}|${value ?? ''}`;
		const existing = merged.get(key);
		if (existing) {
			existing.p += p;
			if (!existing.labels.includes(line.label)) existing.labels.push(line.label);
		} else {
			merged.set(key, {
				kind: line.kind,
				...(line.stat ? { stat: line.stat } : {}),
				value,
				p,
				labels: [line.label]
			});
		}
	};
	const variant = ctx.poolVariant ?? 'gms';
	for (const { line, p } of normalise(ctx.group, primePoolRank(ctx.grade), source, variant)) {
		add(line, p * primeRate);
	}
	if (primeRate < 1) {
		for (const { line, p } of normalise(ctx.group, nonPrimePoolRank(ctx.grade), source, variant)) {
			add(line, p * (1 - primeRate));
		}
	}
	return [...merged.values()].map((e) => ({ ...e, junk: false }));
}

function assertCubeUsable(ctx: RollContext): void {
	const order: PoolGrade[] = ['rare', 'epic', 'unique', 'legendary'];
	if (order.indexOf(ctx.grade) > order.indexOf(CUBE_MAX_GRADE[ctx.cube])) {
		throw new Error(`Cube "${ctx.cube}" cannot roll ${ctx.grade} potential`);
	}
	const minLevel = poolMinItemLevel(ctx.group, primePoolRank(ctx.grade));
	if (ctx.itemLevel < minLevel) {
		throw new Error(
			`No sourced pool for ${ctx.group}/${ctx.grade} below item level ${minLevel} ` +
				`(asked for ${ctx.itemLevel}) — StrategyWiki publishes this pool from ${minLevel}+ only`
		);
	}
}

/**
 * Chance that **one prime roll** produces a matching line.
 *
 * This is the number that makes "three specific lines" expensive, and the one
 * `potential.ts`'s `triplePrime` silently omits. Example: on gloves, Critical
 * Damage is 1 of 12 rollable Legendary-prime lines for a cash cube, weighted
 * 9.0909% → `primeLineChance({kind:'crit_dmg'}, ...) === 0.090909`.
 */
export function primeLineChance(
	group: PotentialPoolGroup,
	grade: PoolGrade,
	matcher: LineMatcher,
	options: {
		source?: ChanceSource;
		itemLevel?: number;
		characterLevel?: number;
		variant?: PoolVariant;
	} = {}
): number {
	const source = options.source ?? 'cashCube';
	const itemLevel = options.itemLevel ?? 200;
	let hit = 0;
	for (const { line, p } of normalise(
		group,
		primePoolRank(grade),
		source,
		options.variant ?? 'gms'
	)) {
		const value = magnitude(lineValueAtLevel(line, itemLevel, options.characterLevel));
		if (!lineMatches(matcher, { kind: line.kind, stat: line.stat, value })) continue;
		hit += p;
	}
	return hit;
}

/* -------------------------------------------------------------------------- */
/* Target probability                                                          */
/* -------------------------------------------------------------------------- */

/** Collapse a line slot's outcomes to the buckets a target actually distinguishes. */
function consolidate(outcomes: readonly LineOutcome[], target: PotentialTarget): LineOutcome[] {
	const buckets = new Map<
		string,
		{
			kind: PoolLineKind;
			stat?: PoolStat;
			value: number | null;
			p: number;
			labels: string[];
			junk: boolean;
		}
	>();
	let junkP = 0;
	const junkLabels: string[] = [];
	for (const o of outcomes) {
		const relevant = target.some((req) => kindMatches(req, o.kind));
		if (!relevant && !isRestricted(o.kind)) {
			junkP += o.p;
			junkLabels.push(...o.labels);
			continue;
		}
		const key = `${o.kind}|${o.stat ?? ''}|${o.value ?? ''}`;
		const existing = buckets.get(key);
		if (existing) {
			existing.p += o.p;
			existing.labels.push(...o.labels);
		} else {
			buckets.set(key, {
				kind: o.kind,
				...(o.stat ? { stat: o.stat } : {}),
				value: o.value,
				p: o.p,
				labels: [...o.labels],
				junk: false
			});
		}
	}
	const result: LineOutcome[] = [...buckets.values()];
	if (junkP > 0) {
		result.push({ kind: 'other', value: null, p: junkP, junk: true, labels: junkLabels });
	}
	return result;
}

function satisfies(outcome: readonly LineOutcome[], target: PotentialTarget): boolean {
	for (const req of target) {
		let count = 0;
		let total = 0;
		for (const line of outcome) {
			if (line.junk) continue;
			if (!lineMatches(req, line)) continue;
			count += 1;
			total += line.value ?? 0;
		}
		if (count < (req.lines ?? 1)) return false;
		if (req.totalValue !== undefined && total < req.totalValue) return false;
	}
	return true;
}

/**
 * Probability that **one cube** lands the whole target.
 *
 * Exact: it enumerates every (line1, line2, line3) combination, applying Nexon's
 * documented pool re-normalisation whenever an earlier line exhausts a capped
 * category (`MAX_LINES_PER_ITEM`). Lines that no requirement mentions are merged
 * into a single "junk" bucket first, so the enumeration stays small.
 *
 * Assumes the item already has 3 lines and stays at `ctx.grade` (using a cube on a
 * <3-line item now brings it to 3 lines automatically — `potential.ts`
 * `POTENTIAL_LINE_COUNT`). Rank-ups are not priced here.
 */
export function targetProbability(ctx: RollContext, target: PotentialTarget): number {
	validateTarget(target);
	if (target.length === 0) return 1;
	const slots = ([0, 1, 2] as const).map((i) => consolidate(lineDistribution(ctx, i), target));

	let total = 0;
	for (const a of slots[0]) {
		for (const b of slots[1]) {
			for (const c of slots[2]) {
				const outcome = [a, b, c];
				if (!satisfies(outcome, target)) continue;
				let p = 1;
				for (let i = 0; i < 3; i++) {
					p *= adjustedProbability(outcome[i], outcome.slice(0, i), slots[i]);
					if (p === 0) break;
				}
				total += p;
			}
		}
	}
	return total;
}

/**
 * Nexon's rule: once a capped kind has appeared `max` times, it is removed from
 * the pool for the remaining lines and the rest are re-normalised by
 * `p / (1 − removed mass)`.
 */
function adjustedProbability(
	current: LineOutcome,
	previous: readonly LineOutcome[],
	pool: readonly LineOutcome[]
): number {
	if (previous.length === 0) return current.p;
	const counts = new Map<PoolLineKind, number>();
	for (const line of previous) {
		if (!isRestricted(line.kind) || line.junk) continue;
		counts.set(line.kind, (counts.get(line.kind) ?? 0) + 1);
	}
	const exhausted = new Set<PoolLineKind>();
	for (const [kind, count] of counts) {
		const max = MAX_LINES_PER_ITEM[kind] as number;
		if (count >= max) exhausted.add(kind);
	}
	if (!current.junk && exhausted.has(current.kind)) return 0;
	if (exhausted.size === 0) return current.p;
	let removed = 0;
	for (const line of pool) if (!line.junk && exhausted.has(line.kind)) removed += line.p;
	return removed >= 1 ? 0 : current.p / (1 - removed);
}

/* -------------------------------------------------------------------------- */
/* Cost                                                                        */
/* -------------------------------------------------------------------------- */

export interface CubeCost {
	/** Chance per cube. */
	readonly probability: number;
	/** `1 / probability`. `Infinity` when the target is impossible in this pool. */
	readonly expectedCubes: number;
	readonly medianCubes: number;
	readonly p75Cubes: number;
	/** Included because the reference calculators report 75 / 85 / 95. */
	readonly p85Cubes: number;
	readonly p95Cubes: number;
	/** Expected mesos = `expectedCubes × price`. `null` when the cube is not purchasable. */
	readonly expectedMesos: number | null;
	readonly medianMesos: number | null;
	readonly cube: CubeId;
}

/** Number of independent trials to reach probability `q` of at least one success. */
function geometricQuantile(p: number, q: number): number {
	if (p <= 0) return Infinity;
	if (p >= 1) return 1;
	return Math.ceil(Math.log(1 - q) / Math.log(1 - p));
}

/**
 * Expected cubes and mesos for a target, at a fixed rank.
 *
 * This is the number the ranker should use for a "3 useful lines" candidate —
 * **not** `1 / triplePrime`. Add `includeRevealCost` only if you are modelling an
 * item whose potential is still hidden.
 */
export function cubeCost(
	ctx: RollContext,
	target: PotentialTarget,
	options: { includeRevealCost?: boolean } = {}
): CubeCost {
	const probability = targetProbability(ctx, target);
	const expectedCubes = probability > 0 ? 1 / probability : Infinity;
	const price = HEROIC_CUBE_MESO_PRICE[ctx.cube];
	const perCube =
		price === null
			? null
			: price + (options.includeRevealCost ? revealPotentialCost(ctx.itemLevel) : 0);
	const medianCubes = geometricQuantile(probability, 0.5);
	return {
		probability,
		expectedCubes,
		medianCubes,
		p75Cubes: geometricQuantile(probability, 0.75),
		p85Cubes: geometricQuantile(probability, 0.85),
		p95Cubes: geometricQuantile(probability, 0.95),
		expectedMesos: perCube === null ? null : expectedCubes * perCube,
		medianMesos: perCube === null || !Number.isFinite(medianCubes) ? null : medianCubes * perCube,
		cube: ctx.cube
	};
}

/** Whichever purchasable cube costs less in expectation for this target. */
export function cheapestCubeFor(ctx: Omit<RollContext, 'cube'>, target: PotentialTarget): CubeCost {
	const options = (['glowing', 'bright'] as const).map((cube) =>
		cubeCost({ ...ctx, cube }, target)
	);
	return options.reduce((best, next) =>
		(next.expectedMesos ?? Infinity) < (best.expectedMesos ?? Infinity) ? next : best
	);
}

/* -------------------------------------------------------------------------- */
/* Kind mapping and non-modelled systems                                       */
/* -------------------------------------------------------------------------- */

/**
 * Pool kind → the `PotentialKind` vocabulary the tooltip parser
 * (`src/lib/calc/potential-parse.ts`) produces. Kinds with no parser equivalent
 * map to `other`; the parser never drops a line, so nothing is lost.
 */
export const POOL_KIND_TO_PARSED_KIND: Readonly<Record<PoolLineKind, string>> = {
	stat_pct: 'stat_pct',
	all_stat_pct: 'all_stat_pct',
	att_pct: 'att_pct',
	matt_pct: 'matt_pct',
	damage_pct: 'dmg',
	boss: 'boss',
	ied: 'ied',
	crit_rate: 'crit_rate',
	crit_dmg: 'crit_dmg',
	hp_pct: 'hp_pct',
	att_per_10_levels: 'att',
	matt_per_10_levels: 'matt',
	stat_per_10_levels: 'stat_flat',
	stat_flat: 'stat_flat',
	all_stat_flat: 'other',
	att_flat: 'att',
	matt_flat: 'matt',
	hp_flat: 'stat_flat',
	mp_flat: 'other',
	def_flat: 'other',
	meso: 'meso',
	drop: 'drop',
	cooldown: 'cooldown',
	mp_pct: 'other',
	def_pct: 'other',
	mp_cost: 'other',
	hp_recovery: 'other',
	auto_steal: 'other',
	speed: 'other',
	jump: 'other',
	ignore_damage: 'other',
	invincible_chance: 'other',
	invincible_time: 'other',
	decent_skill: 'other',
	other: 'other'
};

/**
 * **Bonus Potential is not modelled here, on purpose.**
 *
 * It does not exist in Heroic/Reboot worlds (`formulas.md` §4A §3.1,
 * `BONUS_POTENTIAL_AVAILABLE_IN_HEROIC = false`), so a Heroic tracker must never
 * generate bonus-potential candidates. StrategyWiki does publish the full
 * per-slot bonus-potential pools in its `#Bonus_Potential_Stat_List` section, in
 * the same five-section shape, if an Interactive-world build ever needs them;
 * `potential.ts` already carries the bonus-potential *value* scales.
 */
export const BONUS_POTENTIAL_POOLS_NOT_MODELLED = true;

/** Where every number in this file came from. */
export const POTENTIAL_LINE_POOL_SOURCES = [
	{
		what: 'per-slot, per-rank line pools: lines, values, probabilities',
		url: 'https://strategywiki.org/wiki/MapleStory/Potential_System',
		snapshot:
			'https://web.archive.org/web/20260708180530/https://strategywiki.org/wiki/MapleStory/Potential_System'
	},
	{
		what: 'cross-check of pool weights and of the whole probability engine (KMS data, scraped from Nexon KR disclosure pages)',
		url: 'https://brendonmay.github.io/cubingCalculator/',
		source: 'https://github.com/brendonmay/brendonmay.github.io/tree/master/cubingCalculator'
	},
	{
		what: 'pool re-normalisation rule when a capped line is exhausted',
		url: 'https://maplestory.nexon.com/Guide/OtherProbability/cube/strange'
	},
	{
		what: '3-line boss / IED / drop restriction removal (KMST 1.2.168, Jan 2024)',
		url: 'https://orangemushroom.net/2024/01/19/kmst-ver-1-2-168-meso-changes-and-new-potential-reset-system/'
	},
	{
		what: 'GMS cube names and Heroic meso prices (post-v239)',
		url: 'https://maplestorywiki.net/w/Cube'
	}
] as const;
