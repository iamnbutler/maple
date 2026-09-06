import { describe, expect, it } from 'vitest';

import { AnalysisError } from './errors';
import { toCalcInput } from './adapter';
import { windArcherFixture } from './test-fixtures';

describe('toCalcInput', () => {
	it('reads the stat window, not the gear', () => {
		const character = windArcherFixture();
		const { input, warnings } = toCalcInput(character);

		expect(warnings).toEqual([]);
		expect(input.level).toBe(275);
		expect(input.classId).toBe('wind-archer');
		expect(input.stats.dex).toEqual({ base: 14800, percent: 302, flat: 8100 });
		expect(input.attack).toEqual({ base: 1240, percent: 92, flat: 0 });
		expect(input.bossDamagePercent).toBe(322);
		expect(input.arcaneForce).toBe(1330);
	});

	it('defaults omitted percent fields to 0 and warns about each one', () => {
		const character = windArcherFixture();
		delete character.statWindow!.bossDamagePercent;
		delete character.statWindow!.finalDamagePercent;

		const { input, warnings } = toCalcInput(character);
		expect(input.bossDamagePercent).toBe(0);
		expect(input.finalDamagePercent).toBe(0);
		expect(warnings).toHaveLength(2);
		expect(warnings.join(' ')).toContain('Boss Damage %');
		expect(warnings.join(' ')).toContain('Final Damage %');
	});

	it('treats an absent StatTriple percent/flat as 0', () => {
		const character = windArcherFixture();
		character.statWindow!.dex = { base: 1000 };
		const { input } = toCalcInput(character);
		expect(input.stats.dex).toEqual({ base: 1000, percent: 0, flat: 0 });
	});

	it('throws a typed 409 error when there is no stat window', () => {
		const character = windArcherFixture();
		delete character.statWindow;

		try {
			toCalcInput(character);
			expect.unreachable('should have thrown');
		} catch (error) {
			expect(error).toBeInstanceOf(AnalysisError);
			expect((error as AnalysisError).code).toBe('missing-stat-window');
			expect((error as AnalysisError).status).toBe(409);
			expect((error as AnalysisError).message).toContain('/stat-window');
		}
	});

	it('throws a typed error for an unknown class', () => {
		const character = windArcherFixture();
		character.classId = 'not-a-class';
		expect(() => toCalcInput(character)).toThrowError(/Unknown classId/);
	});

	it('warns when a magic class has no magicAttack triple', () => {
		const character = windArcherFixture();
		character.classId = 'battle-mage';
		character.statWindow!.int = { base: 14800, percent: 302, flat: 8100 };
		const { warnings } = toCalcInput(character);
		expect(warnings.join(' ')).toContain('Magic ATT');
	});
});
