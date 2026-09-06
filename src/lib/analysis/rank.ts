// Scoring and ordering the candidate upgrades.
//
// Every candidate is scored with `calc.measureGain` against the SAME target the
// rest of the analysis uses (formulas.md §3.1: `gain = D'/D - 1`, recomputed
// from current totals). Candidates are scored INDEPENDENTLY here — that is
// correct for a ranking, but it is exactly why `whatIf` exists: a set of
// upgrades must be evaluated jointly, never by summing this list (§3.4).

import * as calc from '$lib/calc';
import type { CalcInput, Target } from '$lib/calc/types';

import type { UpgradeCandidate } from './candidates';
import type { RankedUpgrade } from './types';

export const DEFAULT_TOP_N = 40;

export interface RankOptions {
	topN?: number;
	/** Gains at or below this (whole percent) are dropped. */
	epsilon?: number;
}

/**
 * ORDERING RULE.
 *
 * There is no honest way to compare "0.9% for 4 billion mesos" with "0.4% for 18
 * days" on one axis, so the list is three concatenated ladders rather than one
 * mixed sort:
 *
 *   1. meso-priced candidates, best `gainPerBillionMesos` first;
 *   2. day-gated candidates, best `gainPerDay` first — a symbol also carries a
 *      meso price, but the daily quest cap is the binding constraint, so days win;
 *   3. everything we could not price (hyper stat points, and any candidate whose
 *      cost table is missing), best raw `gainPercent` first.
 *
 * Mesos lead because they are the fungible currency this tracker prices
 * everything else against; day-gated work is a separate queue you cannot buy
 * your way through; unpriced candidates come last because "no cost is known" is
 * not the same as "it is free". Ties inside a bucket break on raw gain, then on
 * id, so the order is deterministic.
 */
/**
 * Sort buckets, best first. Ceilings are LAST unconditionally: they describe the
 * headroom in a slot rather than an action anyone can take, so however large
 * their gain, they must never sit above something achievable.
 */
function bucketOf(upgrade: RankedUpgrade): 0 | 1 | 2 | 3 {
	if (upgrade.feasibility === 'ceiling') return 3;
	if (upgrade.gainPerDay !== undefined) return 1;
	if (upgrade.gainPerBillionMesos !== undefined) return 0;
	return 2;
}

function sortKey(upgrade: RankedUpgrade): number {
	switch (bucketOf(upgrade)) {
		case 0:
			return upgrade.gainPerBillionMesos as number;
		case 1:
			return upgrade.gainPerDay as number;
		default:
			return upgrade.gainPercent;
	}
}

/** Score, filter, cost-normalise and order. */
export function rankCandidates(
	input: CalcInput,
	candidates: readonly UpgradeCandidate[],
	target: Target,
	options: RankOptions = {}
): RankedUpgrade[] {
	const epsilon = options.epsilon ?? 1e-9;
	const topN = options.topN ?? DEFAULT_TOP_N;

	const scored: RankedUpgrade[] = [];
	for (const candidate of candidates) {
		const { gainPct } = calc.measureGain(input, candidate.delta, target);
		if (!Number.isFinite(gainPct) || gainPct <= epsilon) continue;

		const upgrade: RankedUpgrade = {
			id: candidate.id,
			kind: candidate.kind,
			label: candidate.label,
			detail: candidate.detail,
			slot: candidate.slot,
			itemName: candidate.itemName,
			delta: candidate.delta,
			gainPercent: gainPct,
			cost: candidate.cost,
			confidence: candidate.confidence,
			feasibility: candidate.feasibility,
			notes: candidate.notes
		};

		if (candidate.cost.mesos !== undefined && candidate.cost.mesos > 0) {
			upgrade.gainPerBillionMesos = gainPct / (candidate.cost.mesos / 1e9);
		}
		if (candidate.cost.days !== undefined && candidate.cost.days > 0) {
			upgrade.gainPerDay = gainPct / candidate.cost.days;
		}

		scored.push(upgrade);
	}

	scored.sort((a, b) => {
		const bucketDiff = bucketOf(a) - bucketOf(b);
		if (bucketDiff !== 0) return bucketDiff;
		const keyDiff = sortKey(b) - sortKey(a);
		if (keyDiff !== 0) return keyDiff;
		const gainDiff = b.gainPercent - a.gainPercent;
		if (gainDiff !== 0) return gainDiff;
		return a.id.localeCompare(b.id);
	});

	return scored.slice(0, Math.max(0, topN));
}
