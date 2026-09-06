// The "what is one more of X worth right now?" table.
//
// formulas.md §3.4 is emphatic that stat equivalence is only valid at the
// CURRENT configuration ("any changes to the stats can change such ratios"), so
// every row is recomputed from current totals on every call. Nothing here is
// cached and nothing is a constant.
//
// Each row is scored with the same engine the ranking uses (§3.1:
// `gain = D'/D - 1`), and then converted into main-stat-equivalent units — the
// community's common currency, and the unit flame score is defined in
// (formulas.md §3.2: "gaining 1 Flame score represents the same increase in
// output as gaining 1 Main Stat").

import * as calc from '$lib/calc';
import type { CalcInput, Delta, Target } from '$lib/calc/types';

import type { StatWorth } from './types';

/** The IED lines the potential pool actually rolls (formulas.md §4A §3.3). */
export const IED_LINE_VALUES = [30, 35, 40] as const;

interface Row {
	label: string;
	delta: Delta;
}

function rows(): Row[] {
	return [
		{ label: '+1 ATT (base)', delta: { att: 1 } },
		{ label: '+1% ATT', delta: { attPct: 1 } },
		{ label: '+1% boss damage', delta: { boss: 1 } },
		{ label: '+1% damage', delta: { dmg: 1 } },
		{ label: '+1% final damage', delta: { fd: 1 } },
		{ label: '+1% critical damage', delta: { critDmg: 1 } },
		{ label: '+1% critical rate', delta: { critRate: 1 } },
		{ label: '+10 main stat (gear channel)', delta: { mainFlat: 10 } },
		{ label: '+10 main stat (final channel)', delta: { mainFinal: 10 } },
		...IED_LINE_VALUES.map((value) => ({
			label: `+${value}% IED line`,
			delta: { iedAdd: [value] } satisfies Delta
		}))
	];
}

/**
 * How much main stat (in the GEAR channel — the one flame score measures) buys
 * the same gain as `gainPercent`.
 *
 * Solved by bisection rather than the closed forms of formulas.md §3.2, because
 * the closed forms drop the floors and this does not. The gain function is a
 * non-decreasing step function of added main stat, so bisection is exact to
 * within one stat point; 80 iterations takes it well past that.
 */
export function mainStatEquivalent(
	input: CalcInput,
	target: Target,
	gainPercent: number
): number | undefined {
	if (!(gainPercent > 0)) return gainPercent === 0 ? 0 : undefined;

	const gainOf = (amount: number): number =>
		calc.measureGain(input, { mainFlat: amount }, target).gainPct;

	// Bracket: grow until main stat out-gains the row, giving up if it cannot.
	let hi = 1;
	for (let i = 0; i < 40 && gainOf(hi) < gainPercent; i++) hi *= 2;
	if (gainOf(hi) < gainPercent) return undefined;

	let lo = 0;
	for (let i = 0; i < 80; i++) {
		const mid = (lo + hi) / 2;
		if (gainOf(mid) < gainPercent) lo = mid;
		else hi = mid;
	}
	return (lo + hi) / 2;
}

/** The full diagnostic table, recomputed from current totals. */
export function statWorth(input: CalcInput, target: Target): StatWorth[] {
	return rows().map(({ label, delta }) => {
		const gainPercent = calc.measureGain(input, delta, target).gainPct;
		return {
			label,
			delta,
			gainPercent,
			mainStatEquivalent: mainStatEquivalent(input, target, gainPercent)
		};
	});
}
