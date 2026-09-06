import { describe, expect, it } from 'vitest';

import { toCalcInput } from './adapter';
import { bowBaseAttFor, buildChecksums, combatPowerFor } from './checksums';
import { windArcherFixture } from './test-fixtures';

function checksums(mutate: (character: ReturnType<typeof windArcherFixture>) => void = () => {}) {
	const character = windArcherFixture();
	mutate(character);
	const { input } = toCalcInput(character);
	return buildChecksums(character, input);
}

describe('buildChecksums', () => {
	it('matches the captured range and Combat Power', () => {
		const rows = checksums();
		expect(rows.map((row) => row.label)).toEqual([
			'Damage range (max)',
			'Damage range (min)',
			'Combat Power'
		]);
		for (const row of rows) {
			expect(row.status).toBe('match');
			expect(Math.abs(row.deltaPercent!)).toBeLessThanOrEqual(0.1);
		}
	});

	it('grades a small discrepancy `close` and a large one `mismatch`', () => {
		const close = checksums((character) => {
			character.statWindow!.displayed!.rangeMax = Math.round(21_124_769 * 1.01);
		});
		expect(close[0].status).toBe('close');
		expect(close[0].deltaPercent).toBeLessThan(0);

		const mismatch = checksums((character) => {
			character.statWindow!.displayed!.rangeMax = 15_000_000;
		});
		expect(mismatch[0].status).toBe('mismatch');
		expect(mismatch[0].deltaPercent).toBeGreaterThan(2);
	});

	it('is `missing` when nothing was captured', () => {
		const rows = checksums((character) => {
			delete character.statWindow!.displayed;
		});
		for (const row of rows) {
			expect(row.status).toBe('missing');
			expect(row.displayed).toBeUndefined();
			expect(row.deltaPercent).toBeUndefined();
			expect(row.computed).toBeGreaterThan(0);
		}
	});
});

describe('combatPowerFor', () => {
	it('normalises off the weapon base/star ATT when they are known', () => {
		const character = windArcherFixture();
		const { input } = toCalcInput(character);
		const cp = combatPowerFor(character, input);

		expect(cp.confidence).toBe('sourced');
		expect(cp.note).toContain('checksum, not a score');
		expect(cp.value).toBeGreaterThan(0);
	});

	it('falls back to the un-normalised value, labelled estimated, without a breakdown', () => {
		const character = windArcherFixture();
		delete character.equipment.weapon!.star;

		const { input } = toCalcInput(character);
		const cp = combatPowerFor(character, input);

		expect(cp.confidence).toBe('estimated');
		expect(cp.note).toContain('bow normalisation');
		expect(cp.value).toBeGreaterThan(0);
	});

	it('picks the bow-equivalent base ATT by weapon name before item level', () => {
		expect(bowBaseAttFor({ name: 'Genesis Bow', slot: 'weapon', category: 'weapon' })).toEqual({
			value: 318,
			exact: true
		});
		expect(
			bowBaseAttFor({ name: 'Mystery Cane', slot: 'weapon', category: 'weapon', itemLevel: 200 })
		).toEqual({ value: 318, exact: false });
		expect(
			bowBaseAttFor({ name: 'Mystery Cane', slot: 'weapon', category: 'weapon' })
		).toBeUndefined();
	});
});
