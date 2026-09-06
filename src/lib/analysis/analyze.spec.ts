import { describe, expect, it } from 'vitest';

import * as calc from '$lib/calc';

import { analyze, analyzeAsync, whatIf } from './analyze';
import { AnalysisError } from './errors';
import { PRESET_TARGETS } from './targets';
import { windArcherFixture } from './test-fixtures';

const character = windArcherFixture();

describe('analyze — end to end', () => {
	const analysis = analyze(character);

	it('summarises the character against the requested and both preset targets', () => {
		expect(analysis.target.id).toBe('grandis');
		expect(analysis.summary).toMatchObject({
			characterId: 'zephyra',
			name: 'Zephyra',
			classId: 'wind-archer',
			className: 'Wind Archer',
			level: 275,
			world: 'Kronos'
		});
		expect(analysis.summary.damageIndex).toBeCloseTo(analysis.summary.damageIndexGrandis, 9);
		// A 380% DEF target hurts more than a 300% one at the same IED.
		expect(analysis.summary.damageIndexArcane).toBeGreaterThan(analysis.summary.damageIndexGrandis);
		expect(analysis.summary.range.max).toBeGreaterThan(analysis.summary.range.min);
		expect(analysis.summary.combatPower.value).toBeGreaterThan(0);
		expect(analysis.summary.totals.mainStat).toBe(calc.statTotal(analysis.input, 'dex'));
		expect(analysis.summary.totals.arcaneForce).toBe(1330);
	});

	it('returns the CalcInput it ran on', () => {
		expect(analysis.input.classId).toBe('wind-archer');
		expect(analysis.input.bossDamagePercent).toBe(322);
	});

	it('calibrates: checksums match, residuals are positive, warnings are strings', () => {
		expect(analysis.calibration.checksums).toHaveLength(3);
		expect(analysis.calibration.checksums.every((c) => c.status === 'match')).toBe(true);
		expect(analysis.calibration.residuals.length).toBeGreaterThan(5);
		for (const warning of analysis.calibration.warnings) expect(typeof warning).toBe('string');
	});

	it('ranks only positive gains, in the documented order', () => {
		expect(analysis.upgrades.length).toBeGreaterThan(10);
		for (const upgrade of analysis.upgrades) {
			expect(upgrade.gainPercent).toBeGreaterThan(0);
			expect(upgrade.confidence).toMatch(/^(exact|sourced|estimated|speculative)$/);
			expect(typeof upgrade.label).toBe('string');
		}

		const bucket = (u: (typeof analysis.upgrades)[number]) =>
			u.gainPerDay !== undefined ? 1 : u.gainPerBillionMesos !== undefined ? 0 : 2;
		const key = (u: (typeof analysis.upgrades)[number]) =>
			bucket(u) === 1 ? u.gainPerDay! : bucket(u) === 0 ? u.gainPerBillionMesos! : u.gainPercent;

		for (let i = 1; i < analysis.upgrades.length; i++) {
			const previous = analysis.upgrades[i - 1];
			const current = analysis.upgrades[i];
			expect(bucket(previous)).toBeLessThanOrEqual(bucket(current));
			if (bucket(previous) === bucket(current)) {
				expect(key(previous)).toBeGreaterThanOrEqual(key(current) - 1e-9);
			}
		}
	});

	it('re-derives every ranked gain from the same input and delta', () => {
		for (const upgrade of analysis.upgrades) {
			expect(upgrade.gainPercent).toBeCloseTo(
				calc.measureGain(analysis.input, upgrade.delta, analysis.target).gainPct,
				9
			);
		}
	});

	it('includes the stat worth diagnostic table', () => {
		expect(analysis.statWorth).toHaveLength(12);
		const fd = analysis.statWorth.find((row) => row.label === '+1% final damage')!;
		expect(fd.gainPercent).toBeCloseTo(1, 9);
	});

	it('honours topN and kinds', () => {
		const limited = analyze(character, { topN: 5, kinds: ['symbol'] });
		expect(limited.upgrades).toHaveLength(5);
		expect(new Set(limited.upgrades.map((u) => u.kind))).toEqual(new Set(['symbol']));
	});

	it('re-prices everything against the requested target', () => {
		const arcane = analyze(character, { target: 'arcane' });
		const grandis = analyze(character, { target: 'grandis' });

		const iedWorth = (a: typeof arcane) =>
			a.statWorth.find((row) => row.label === '+40% IED line')!.gainPercent;
		// Defence piercing is worth MORE against the higher-PDR target.
		expect(iedWorth(grandis)).toBeGreaterThan(iedWorth(arcane));

		const attWorth = (a: typeof arcane) =>
			a.statWorth.find((row) => row.label === '+1 ATT (base)')!.gainPercent;
		// A pure multiplier is target-independent.
		expect(attWorth(grandis)).toBeCloseTo(attWorth(arcane), 12);
	});

	it('propagates the typed error when there is no stat window', () => {
		const bare = windArcherFixture();
		delete bare.statWindow;
		expect(() => analyze(bare)).toThrowError(AnalysisError);
	});

	it('rejects an unknown target with a 400-shaped error', () => {
		try {
			analyze(character, { target: 'nope' });
			expect.unreachable('should have thrown');
		} catch (error) {
			expect((error as AnalysisError).status).toBe(400);
		}
	});

	it('has an ISO generatedAt', () => {
		expect(analysis.generatedAt).toMatch(/^\d{4}-\d{2}-\d{2}T[\d:.]+Z$/);
	});
});

describe('analyze — boss board', () => {
	it('is omitted when no builder is available', () => {
		expect(analyze(character, { includeBossBoard: false }).bossBoard).toBeUndefined();
		expect(analyze(character).bossBoard).toBeUndefined();
	});

	it('uses an injected builder and survives one that throws', () => {
		const board = { rows: [], calibrated: false };
		expect(analyze(character, {}, { bossBoardBuilder: () => board }).bossBoard).toBe(board);

		const failed = analyze(
			character,
			{},
			{
				bossBoardBuilder: () => {
					throw new Error('not ready');
				}
			}
		);
		expect(failed.bossBoard).toBeUndefined();
		expect(failed.calibration.warnings.join(' ')).toContain('not ready');
	});

	it('analyzeAsync resolves the sibling module and passes its verdicts through honestly', async () => {
		const withBoard = await analyzeAsync(character);
		if (!withBoard.bossBoard) {
			// boss-board.ts has not landed; the analysis still works without it.
			expect(withBoard.upgrades.length).toBeGreaterThan(0);
			return;
		}

		const board = withBoard.bossBoard;
		expect(Array.isArray(board.rows)).toBe(true);
		expect(typeof board.calibrated).toBe('boolean');
		if (!board.calibrated) {
			// No per-class DPM anchor is sourced yet (design §9): every DPM-derived
			// verdict must say so rather than guessing.
			// Hard gates (`blocked`) are evaluated before the DPM model and stay.
			for (const row of board.rows) {
				expect(['uncalibrated', 'blocked']).toContain(row.solo.verdict);
				expect(['uncalibrated', 'blocked']).toContain(row.party.verdict);
				if (row.solo.verdict === 'uncalibrated') expect(row.solo.ratio).toBeUndefined();
			}
		}
	});

	it('forwards includeEarlyBosses to the builder', async () => {
		const seen: unknown[] = [];
		analyze(
			character,
			{ includeEarlyBosses: true },
			{
				bossBoardBuilder: (_input, _character, options) => {
					seen.push(options);
					return { rows: [], calibrated: false };
				}
			}
		);
		expect(seen[0]).toMatchObject({ includeEarlyBosses: true });
		expect((seen[0] as { combatPower: number }).combatPower).toBeGreaterThan(0);

		const withoutEarly = await analyzeAsync(character, { includeEarlyBosses: false });
		expect(withoutEarly).toBeDefined();
	});
});

describe('whatIf', () => {
	it('evaluates a set jointly, and reports each delta alone', () => {
		const deltas = [{ att: 30 }, { boss: 20 }, { iedAdd: [30] }];
		const result = whatIf(character, deltas, 'grandis');

		expect(result.target.id).toBe('grandis');
		expect(result.marginal).toHaveLength(3);
		expect(result.after).toBeGreaterThan(result.before);
		expect(result.gainPercent).toBeCloseTo((result.after / result.before - 1) * 100, 9);

		const summed = result.marginal.reduce((total, m) => total + m.gainPercent, 0);
		// formulas.md §3.4 — the whole point: the parts do NOT sum to the whole.
		expect(result.gainPercent).toBeGreaterThan(summed);
		expect(result.gainPercent).not.toBeCloseTo(summed, 3);
	});

	it('defaults to grandis and accepts an empty delta list', () => {
		const result = whatIf(character, []);
		expect(result.target).toEqual(PRESET_TARGETS.grandis);
		expect(result.gainPercent).toBe(0);
		expect(result.marginal).toEqual([]);
	});

	it('composes IED removal and addition rather than subtracting', () => {
		const swap = whatIf(character, [{ iedRemove: [30], iedAdd: [40] }], 'grandis');
		expect(swap.gainPercent).toBeGreaterThan(0);
		expect(swap.gainPercent).toBeLessThan(
			whatIf(character, [{ iedAdd: [40] }], 'grandis').gainPercent
		);
	});
});
