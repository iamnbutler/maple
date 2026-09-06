import { describe, expect, it } from 'vitest';

import * as calc from '$lib/calc';

import { toCalcInput } from './adapter';
import type { UpgradeCandidate } from './candidates';
import { generateCandidates } from './candidates';
import { rankCandidates } from './rank';
import { resolveTarget } from './targets';
import { windArcherFixture } from './test-fixtures';

const character = windArcherFixture();
const { input } = toCalcInput(character);
const target = resolveTarget('grandis');

function candidate(partial: Partial<UpgradeCandidate> & { id: string }): UpgradeCandidate {
	return {
		kind: 'stat-line',
		label: partial.id,
		delta: {},
		cost: {},
		confidence: 'exact',
		...partial
	};
}

describe('rankCandidates', () => {
	it('scores with measureGain against the requested target', () => {
		const one = candidate({ id: 'a', delta: { att: 50 } });
		const [ranked] = rankCandidates(input, [one], target);
		expect(ranked.gainPercent).toBeCloseTo(calc.measureGain(input, one.delta, target).gainPct, 12);
	});

	it('drops non-positive gains', () => {
		const ranked = rankCandidates(
			input,
			[
				candidate({ id: 'zero', delta: {} }),
				candidate({ id: 'negative', delta: { att: -10 } }),
				candidate({ id: 'positive', delta: { att: 10 } })
			],
			target
		);
		expect(ranked.map((r) => r.id)).toEqual(['positive']);
	});

	it('computes gain per billion mesos and gain per day', () => {
		const ranked = rankCandidates(
			input,
			[
				candidate({ id: 'mesos', delta: { att: 10 }, cost: { mesos: 2e9 } }),
				candidate({ id: 'days', delta: { att: 10 }, cost: { days: 20 } })
			],
			target
		);

		const meso = ranked.find((r) => r.id === 'mesos')!;
		const day = ranked.find((r) => r.id === 'days')!;
		expect(meso.gainPerBillionMesos).toBeCloseTo(meso.gainPercent / 2, 12);
		expect(meso.gainPerDay).toBeUndefined();
		expect(day.gainPerDay).toBeCloseTo(day.gainPercent / 20, 12);
		expect(day.gainPerBillionMesos).toBeUndefined();
	});

	it('orders meso ladder, then day ladder, then unpriced', () => {
		const ranked = rankCandidates(
			input,
			[
				candidate({ id: 'free-big', delta: { att: 60 }, cost: { points: 10 } }),
				candidate({ id: 'meso-cheap', delta: { att: 5 }, cost: { mesos: 1e8 } }),
				candidate({ id: 'meso-dear', delta: { att: 40 }, cost: { mesos: 1e11 } }),
				candidate({ id: 'day', delta: { att: 30 }, cost: { days: 5 } })
			],
			target
		);

		expect(ranked.map((r) => r.id)).toEqual(['meso-cheap', 'meso-dear', 'day', 'free-big']);
	});

	it('orders a candidate that costs both mesos and days on the day ladder', () => {
		// Symbols carry both; the daily cap is the binding constraint, so they sort
		// after every meso-priced candidate even when their meso price is trivial.
		const ranked = rankCandidates(
			input,
			[
				candidate({ id: 'symbol-like', delta: { att: 40 }, cost: { mesos: 5e8, days: 12 } }),
				candidate({ id: 'meso-only', delta: { att: 1 }, cost: { mesos: 1e11 } })
			],
			target
		);
		expect(ranked.map((r) => r.id)).toEqual(['meso-only', 'symbol-like']);
		// Both per-cost figures are still reported for the UI.
		expect(ranked[1].gainPerDay).toBeDefined();
		expect(ranked[1].gainPerBillionMesos).toBeDefined();
	});

	it('caps at topN', () => {
		const { candidates } = generateCandidates(character, input, target);
		expect(rankCandidates(input, candidates, target, { topN: 3 })).toHaveLength(3);
		expect(rankCandidates(input, candidates, target, { topN: 0 })).toHaveLength(0);
	});

	it('produces a stable order for identical candidates', () => {
		const ranked = rankCandidates(
			input,
			[candidate({ id: 'b', delta: { att: 10 } }), candidate({ id: 'a', delta: { att: 10 } })],
			target
		);
		expect(ranked.map((r) => r.id)).toEqual(['a', 'b']);
	});
});

describe('ceilings never outrank achievable actions', () => {
	// A "reroll to three specific legendary lines" candidate is a jackpot whose
	// real meso cost we cannot compute. It used to be priced at 1/triplePrime and
	// so ranked FIRST, above every routine action — which is what this pins shut.
	it('sorts a huge ceiling below a small routine gain', () => {
		const ranked = rankCandidates(
			input,
			[
				candidate({
					id: 'ceiling',
					kind: 'potential',
					delta: { boss: 120 },
					cost: { note: 'unknown' },
					confidence: 'speculative',
					feasibility: 'ceiling'
				}),
				candidate({
					id: 'routine',
					kind: 'starforce',
					delta: { boss: 1 },
					cost: { mesos: 500_000_000 },
					confidence: 'sourced'
				})
			],
			target
		);

		expect(ranked.map((u) => u.id)).toEqual(['routine', 'ceiling']);
		// ...and the ceiling really is the larger gain, which is the whole point.
		const ceiling = ranked.find((u) => u.id === 'ceiling')!;
		const routine = ranked.find((u) => u.id === 'routine')!;
		expect(ceiling.gainPercent).toBeGreaterThan(routine.gainPercent);
	});

	it('carries feasibility through to the ranked upgrade', () => {
		const [only] = rankCandidates(
			input,
			[
				candidate({
					id: 'ceiling',
					kind: 'potential',
					delta: { boss: 10 },
					confidence: 'speculative',
					feasibility: 'ceiling'
				})
			],
			target
		);
		expect(only.feasibility).toBe('ceiling');
	});
});

describe('topN never deletes an entire system', () => {
	// Unpriced candidates sort behind every meso-priced one, so a plain slice at
	// topN was dropping all four set-threshold candidates — including a flat Boss
	// Damage +10% from completing an accessory set.
	it('reserves a slot for a kind that would otherwise be cut, without exceeding topN', () => {
		const priced = Array.from({ length: 10 }, (_, i) =>
			candidate({
				id: `sf${i}`,
				kind: 'starforce',
				delta: { att: 40 - i },
				cost: { mesos: 100_000_000 }
			})
		);
		const unpriced = candidate({
			id: 'set-threshold',
			kind: 'set',
			delta: { att: 1 },
			cost: { note: 'not meso-priced' }
		});

		const ranked = rankCandidates(input, [...priced, unpriced], target, { topN: 5 });

		expect(ranked).toHaveLength(5);
		expect(ranked.map((u) => u.id)).toContain('set-threshold');
		// The reserved slot comes out of the tail of the dominant kind.
		expect(ranked.filter((u) => u.kind === 'starforce')).toHaveLength(4);
	});

	it('leaves the ordering alone when nothing needs rescuing', () => {
		const only = Array.from({ length: 4 }, (_, i) =>
			candidate({ id: `sf${i}`, kind: 'starforce', delta: { att: 40 - i } })
		);
		const ranked = rankCandidates(input, only, target, { topN: 2 });
		expect(ranked.map((u) => u.id)).toEqual(['sf0', 'sf1']);
	});
});
