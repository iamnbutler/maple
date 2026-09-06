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

	// SELECTION, not truncation.
	//
	// The UI offers three sort modes (gain %, gain per 1B mesos, gain per day)
	// but can only ever sort what it was sent. Selecting the top N by ONE key
	// silently destroys the other views: star-force candidates carry enormous
	// meso costs, so ranking by gain-per-meso cut every one of them, and "sort by
	// Gain %" then presented a +9% potential reroll as the best available action
	// while a +20.32% weapon star force sat outside the payload entirely. A user
	// spotted that immediately, and was right.
	//
	// So fill the N places ROUND-ROBIN from the three key orders. Each view is
	// guaranteed roughly its own top N/3, `topN` still means at most N rows, and
	// no key can starve another.
	const limit = Math.max(0, topN);
	if (limit === 0) return [];
	if (scored.length <= limit) return scored;

	const order = (key: (u: RankedUpgrade) => number | undefined): RankedUpgrade[] =>
		scored
			.filter((u) => key(u) !== undefined)
			.sort((a, b) => (key(b) as number) - (key(a) as number));

	const queues = [
		order((u) => u.gainPercent),
		order((u) => u.gainPerBillionMesos),
		order((u) => u.gainPerDay)
	];

	const selected = new Map<string, RankedUpgrade>();
	const cursors = queues.map(() => 0);
	let progressed = true;
	while (selected.size < limit && progressed) {
		progressed = false;
		for (let q = 0; q < queues.length && selected.size < limit; q++) {
			const queue = queues[q];
			while (cursors[q] < queue.length && selected.has(queue[cursors[q]].id)) cursors[q]++;
			if (cursors[q] >= queue.length) continue;
			selected.set(queue[cursors[q]].id, queue[cursors[q]]);
			cursors[q]++;
			progressed = true;
		}
	}

	// One reserved place for any KIND the round-robin missed entirely, so a whole
	// system can never vanish from the board. Taken from the tail of whichever
	// kind is over-represented, so the cap still holds.
	for (const upgrade of scored) {
		if (selected.size < limit) break;
		if ([...selected.values()].some((u) => u.kind === upgrade.kind)) continue;
		const counts = new Map<string, number>();
		for (const u of selected.values()) counts.set(u.kind, (counts.get(u.kind) ?? 0) + 1);
		const victim = [...selected.values()].reverse().find((u) => (counts.get(u.kind) ?? 0) > 1);
		if (!victim) break;
		selected.delete(victim.id);
		selected.set(upgrade.id, upgrade);
	}

	return [...selected.values()].sort((a, b) => {
		const bucketDiff = bucketOf(a) - bucketOf(b);
		if (bucketDiff !== 0) return bucketDiff;
		const keyDiff = sortKey(b) - sortKey(a);
		if (keyDiff !== 0) return keyDiff;
		const gainDiff = b.gainPercent - a.gainPercent;
		if (gainDiff !== 0) return gainDiff;
		return a.id.localeCompare(b.id);
	});
}
