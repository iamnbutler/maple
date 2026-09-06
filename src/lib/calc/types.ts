// Core value types for the pure game-math engine.
//
// Convention (matches docs/plans/2026-09-06-maple-design.md §3):
//   * every "...Percent" field is a WHOLE percent — `40` means 40%.
//   * the only exceptions are the fraction-based helpers in `ied.ts` and the
//     multipliers returned by `force.ts` / `damage.ts`, which are plain ratios.
//   * absent/unknown values are `undefined`, never `0`.

/**
 * The GMS hover-tooltip split of a single stat.
 *
 * `total = floor(base * (1 + percent/100)) + flat`
 *
 * `base`  — "% applied" flat stat (AP + gear + flames + scrolls + star force)
 * `flat`  — "% NOT applied" final stat (hyper stats, symbols, Legion member
 *           effects, inner ability)
 *
 * Source: docs/research/formulas.md §1.2 ("Final Total Stats"), which gives
 * `Stat = floor(BaseValue * (1 + %Value)) + (%-not-applied "final" stat)`.
 */
export interface StatTriple {
	base: number;
	percent: number;
	flat: number;
}

/** Stats that can act as a primary/secondary damage stat. `hp` is Demon Avenger only. */
export type StatKey = 'str' | 'dex' | 'int' | 'luk' | 'hp';

/**
 * Everything the damage math needs about a character, independent of the
 * persisted `Character` document (see design §4 — `adapter.ts` bridges them).
 */
export interface CalcInput {
	level: number;
	/** id from src/lib/data/classes.ts */
	classId: string;
	stats: Record<StatKey, StatTriple>;
	attack: StatTriple;
	magicAttack: StatTriple;
	damagePercent: number;
	bossDamagePercent: number;
	finalDamagePercent: number;
	ignoreDefensePercent: number;
	normalEnemyDamagePercent?: number;
	criticalRatePercent: number;
	criticalDamagePercent: number;
	arcaneForce?: number;
	sacredForce?: number;
	/** Overrides the class default from src/lib/data/classes.ts. */
	masteryPercent?: number;
	/** Overrides the class default (e.g. a Hero holding a 1H sword). */
	weaponConstantOverride?: number;
}

/** A monster to evaluate damage against. */
export interface Target {
	id?: string;
	/** Physical/magic defence rate as a DECIMAL — 300% is `3.0`. */
	pdr: number;
	level: number;
	/** Arcane Force requirement, when the map/boss has one. */
	arcaneReq?: number;
	/** Sacred (Authentic) Force requirement, when the map/boss has one. */
	sacredReq?: number;
}

/**
 * A candidate change to a `CalcInput`.
 *
 * Note the two flat-stat channels, which are NOT interchangeable
 * (docs/research/formulas.md §1.2, §3.3):
 *   * `mainFlat`  → `StatTriple.base`  — "% applied": gear, flames, scrolls, stars
 *   * `mainFinal` → `StatTriple.flat`  — "% not applied": hyper stats, symbols, Legion
 *
 * IED deltas are lists of individual source percentages, because IED composes
 * multiplicatively and never additively (formulas.md §1.8).
 */
export interface Delta {
	/** Flat main stat that IS multiplied by %stat (gear/flame/scroll/star). */
	mainFlat?: number;
	/** Final main stat that is NOT multiplied by %stat (hyper/symbol/legion/IA). */
	mainFinal?: number;
	/** Percentage points of main stat %. */
	mainPct?: number;
	subFlat?: number;
	subFinal?: number;
	subPct?: number;
	/** Percentage points of All Stat % (STR/DEX/INT/LUK — not Max HP). */
	allStatPct?: number;
	/** Flat (base) Attack Power / Magic ATT, before %ATT. */
	att?: number;
	/** Percentage points of %ATT / %Magic ATT. */
	attPct?: number;
	/** Percentage points of Damage %. */
	dmg?: number;
	/** Percentage points of Boss Damage %. */
	boss?: number;
	/** Percentage points of a NEW Final Damage source (composed multiplicatively). */
	fd?: number;
	/** Percentage points of Critical Damage %. */
	critDmg?: number;
	/** Percentage points of Critical Rate % (clamped to 100). */
	critRate?: number;
	/** Whole-percent IED sources to add, each composed separately. */
	iedAdd?: number[];
	/** Whole-percent IED sources to remove, each divided back out. */
	iedRemove?: number[];
	/** Arcane Force points. */
	arcane?: number;
	/** Sacred Force points. */
	sacred?: number;
}

/** Result of comparing a `CalcInput` before/after a `Delta`. */
export interface GainResult {
	before: number;
	after: number;
	/** `(after / before - 1) * 100` — a WHOLE percent, e.g. `1.4` for +1.4%. */
	gainPct: number;
}

/** Convenience constructor for a fully-zero stat triple. */
export function emptyTriple(): StatTriple {
	return { base: 0, percent: 0, flat: 0 };
}

/** Convenience constructor for a zeroed `Record<StatKey, StatTriple>`. */
export function emptyStats(): Record<StatKey, StatTriple> {
	return {
		str: emptyTriple(),
		dex: emptyTriple(),
		int: emptyTriple(),
		luk: emptyTriple(),
		hp: emptyTriple()
	};
}
