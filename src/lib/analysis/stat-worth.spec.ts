import { describe, expect, it } from 'vitest';

import * as calc from '$lib/calc';
import type { CalcInput } from '$lib/calc/types';

import { toCalcInput } from './adapter';
import { mainStatEquivalent, statWorth } from './stat-worth';
import { resolveTarget } from './targets';
import { windArcherFixture } from './test-fixtures';

const { input } = toCalcInput(windArcherFixture());
const target = resolveTarget('grandis');

function byLabel(rows: ReturnType<typeof statWorth>) {
	return new Map(rows.map((row) => [row.label, row]));
}

describe('statWorth', () => {
	it('covers every diagnostic row', () => {
		const labels = statWorth(input, target).map((row) => row.label);
		expect(labels).toEqual([
			'+1 ATT (base)',
			'+1% ATT',
			'+1% boss damage',
			'+1% damage',
			'+1% final damage',
			'+1% critical damage',
			'+1% critical rate',
			'+10 main stat (gear channel)',
			'+10 main stat (final channel)',
			'+30% IED line',
			'+35% IED line',
			'+40% IED line'
		]);
	});

	it('is a real gain measurement, positive everywhere it should be', () => {
		for (const row of statWorth(input, target)) {
			if (row.label === '+1% critical rate') continue; // already at 100%
			expect(row.gainPercent).toBeGreaterThan(0);
			expect(row.gainPercent).toBeCloseTo(calc.measureGain(input, row.delta, target).gainPct, 12);
		}
	});

	it('gives +1% final damage exactly 1%, and beats +1% damage at high damage%', () => {
		const rows = byLabel(statWorth(input, target));
		// formulas.md §3.3: FD is the only stat with a flat, state-independent 1%.
		expect(rows.get('+1% final damage')!.gainPercent).toBeCloseTo(1, 9);
		expect(rows.get('+1% damage')!.gainPercent).toBeLessThan(1);
		expect(rows.get('+1% final damage')!.gainPercent).toBeGreaterThan(
			rows.get('+1% damage')!.gainPercent
		);
		// +1% boss and +1% damage are interchangeable against a boss (§3.3).
		expect(rows.get('+1% boss damage')!.gainPercent).toBeCloseTo(
			rows.get('+1% damage')!.gainPercent,
			12
		);
	});

	it('values crit rate at zero when crit rate is already 100%', () => {
		const rows = byLabel(statWorth(input, target));
		expect(rows.get('+1% critical rate')!.gainPercent).toBe(0);
		expect(rows.get('+1% critical rate')!.mainStatEquivalent).toBe(0);
	});

	it('prices an IED line lower the more IED you already have', () => {
		const low: CalcInput = { ...input, ignoreDefensePercent: 80 };
		const high: CalcInput = { ...input, ignoreDefensePercent: 95 };
		const capped: CalcInput = { ...input, ignoreDefensePercent: 100 };

		const value = (state: CalcInput) =>
			byLabel(statWorth(state, target)).get('+30% IED line')!.gainPercent;

		expect(value(low)).toBeGreaterThan(value(high));
		expect(value(high)).toBeGreaterThan(0);
		expect(value(capped)).toBe(0);
	});

	it('values a bigger IED line above a smaller one', () => {
		const rows = byLabel(statWorth(input, target));
		expect(rows.get('+40% IED line')!.gainPercent).toBeGreaterThan(
			rows.get('+35% IED line')!.gainPercent
		);
		expect(rows.get('+35% IED line')!.gainPercent).toBeGreaterThan(
			rows.get('+30% IED line')!.gainPercent
		);
	});

	it('values the final stat channel above the gear channel is FALSE here — %stat wins', () => {
		const rows = byLabel(statWorth(input, target));
		// The character has +302% DEX, so a gear-channel point is worth ~4x a final one.
		expect(rows.get('+10 main stat (gear channel)')!.gainPercent).toBeGreaterThan(
			rows.get('+10 main stat (final channel)')!.gainPercent
		);
	});
});

describe('mainStatEquivalent', () => {
	it('expresses +10 gear main stat as ~10 main stat', () => {
		const rows = byLabel(statWorth(input, target));
		expect(rows.get('+10 main stat (gear channel)')!.mainStatEquivalent).toBeCloseTo(10, 0);
	});

	it('inverts the gain function', () => {
		const equivalent = mainStatEquivalent(input, target, 1)!;
		expect(equivalent).toBeGreaterThan(0);
		// Main stat enters through a floor, so the inverse is exact only to ~1 point.
		expect(calc.measureGain(input, { mainFlat: equivalent }, target).gainPct).toBeCloseTo(1, 2);
	});

	it('is monotone: a bigger gain needs more main stat', () => {
		expect(mainStatEquivalent(input, target, 2)!).toBeGreaterThan(
			mainStatEquivalent(input, target, 1)!
		);
	});

	it('is recomputed from current totals, not cached', () => {
		const boosted: CalcInput = {
			...input,
			stats: { ...input.stats, dex: { ...input.stats.dex, percent: 50 } }
		};
		const rows = byLabel(statWorth(boosted, target));
		// With only +50% DEX a gear-channel point is worth far less, so it takes
		// MORE of them to match +1 ATT than it does at +302%.
		expect(rows.get('+1 ATT (base)')!.mainStatEquivalent!).toBeGreaterThan(
			byLabel(statWorth(input, target)).get('+1 ATT (base)')!.mainStatEquivalent!
		);
	});
});
