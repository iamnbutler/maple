// Ignore Enemy Defense composition and the monster-defence term.
//
// Source: docs/research/formulas.md §1.8 "Ignore Enemy Defense (IED) and boss PDR".
//
// UNITS: every function in this module works in FRACTIONS, not whole percents —
// 89% IED is `0.89` and a 300% PDR boss is `pdr = 3.0`. This mirrors the source
// formulas (`1 - [def% * (1 - ied%)]` with `def% = 3.0`) and keeps the
// multiplicative composition readable. `damage.ts` divides the whole-percent
// `CalcInput.ignoreDefensePercent` by 100 before calling in.

/** Monster DEF is applied up to 500% (formulas.md §1.8). */
export const MAX_PDR = 5.0;

/**
 * Compose independent IED sources.
 *
 * `Total IED% = 100 - [100 * (1 - ID1/100) * (1 - ID2/100) * ... ]`
 *
 * Every individual potential line is its own source; a skill's 4th-job passive,
 * its Hyper passive and its 5th-job enhancement are three separate sources
 * (20% + 20% composes to 36%, not 40%). Source: formulas.md §1.8.
 */
export function compose(sources: readonly number[]): number {
	let remaining = 1;
	for (const source of sources) remaining *= 1 - source;
	return 1 - remaining;
}

/**
 * Add one source to an existing total: `1 - [(1 - total) * (1 - x)]`.
 * Source: formulas.md §1.8.
 */
export function add(total: number, x: number): number {
	return 1 - (1 - total) * (1 - x);
}

/**
 * Remove one source from an existing total: `1 - [(1 - total) / (1 - x)]`.
 * Source: formulas.md §1.8.
 *
 * A 100% source cannot be removed (it destroys the information), so this
 * throws rather than returning a silently wrong number.
 */
export function remove(total: number, x: number): number {
	if (x >= 1) throw new RangeError('Cannot remove a 100% IED source: the composition is singular');
	return 1 - (1 - total) / (1 - x);
}

/**
 * The percentage points a new source actually contributes to the total:
 * `source * (1 - currentTotalIED)`. Source: formulas.md §1.8.
 */
export function marginal(total: number, x: number): number {
	return x * (1 - total);
}

/**
 * The monster-defence term: `1 - [def% * (1 - ied%)]`.
 *
 * Source: formulas.md §1.8 —
 *   * `pdr` is the monster's PDR as a decimal (300% => 3.0);
 *   * monster DEF is applied up to 500%, so `pdr` is capped at 5.0;
 *   * if the multiplier is 0 or negative the hit deals 1 damage, so the
 *     multiplier is floored at 0 (callers treat 0 as "chip damage only").
 */
export function defenseMultiplier(pdr: number, ied: number): number {
	const cappedPdr = Math.min(Math.max(pdr, 0), MAX_PDR);
	return Math.max(0, 1 - cappedPdr * (1 - ied));
}
