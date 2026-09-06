import { describe, expect, it } from 'vitest';

import * as calc from '$lib/calc';

import { residuals, summarizeGear } from './gear';
import { windArcherFixture } from './test-fixtures';

describe('summarizeGear', () => {
	it('sums tooltip totals and parsed potential lines', () => {
		const { totals, items } = summarizeGear(windArcherFixture());

		expect(items).toHaveLength(10);
		// 250 (weapon) + 60 + 20 + 480 + 470 + 455 + 440 + 320 + 300 + 260
		expect(totals.flatStat.dex).toBe(3055);
		// %DEX only, All Stat % tracked separately.
		expect(totals.statPercent.dex).toBe(
			9 + // secondary
				(12 + 12) + // emblem
				(12 + 12 + 9) + // hat
				(12 + 9 + 9) + // top
				(9 + 9) + // bottom
				(12 + 9) + // shoes
				(12 + 9) + // gloves
				(9 + 6) + // cape
				(12 + 9) // belt
		);
		expect(totals.allStatPercent).toBe(6);
		expect(totals.attPercent).toBe(12);
		expect(totals.bossPercent).toBe(30 + 40 + 30);
		expect(totals.critDamagePercent).toBe(8);
	});

	it('keeps IED as a list of individual sources and never sums them', () => {
		const { totals, composedIedPercent } = summarizeGear(windArcherFixture());

		expect(totals.iedLines.sort((a, b) => a - b)).toEqual([30, 40, 40]);
		// 1 - 0.6*0.6*0.7 = 74.8%, emphatically not 110%.
		expect(composedIedPercent).toBeCloseTo(74.8, 6);
		expect(composedIedPercent).toBeLessThan(100);
		expect(calc.ied.compose([0.3, 0.4, 0.4]) * 100).toBeCloseTo(composedIedPercent, 9);
	});

	it('warns about missing itemLevel and unconfirmed star force', () => {
		const character = windArcherFixture();
		delete character.equipment.hat!.itemLevel;
		delete character.equipment.cape!.starforce;

		const { warnings } = summarizeGear(character);
		expect(warnings.join('\n')).toContain('no itemLevel');
		expect(warnings.join('\n')).toContain('no confirmed starforce');
	});

	it('does not warn about star force on slots that cannot be enhanced', () => {
		const { warnings } = summarizeGear(windArcherFixture());
		expect(warnings.join('\n')).not.toContain('Gold Maple Leaf Emblem');
	});
});

describe('residuals', () => {
	it('reports the class/link/legion baseline the gear cannot explain', () => {
		const rows = residuals(windArcherFixture());
		const byStat = new Map(rows.map((row) => [row.stat, row]));

		const dexBase = byStat.get('DEX (base)')!;
		expect(dexBase.fromGear).toBe(3055);
		expect(dexBase.fromStatWindow).toBe(14800);
		expect(dexBase.residual).toBe(14800 - 3055);
		expect(dexBase.residual).toBeGreaterThan(0);

		const boss = byStat.get('Boss Damage %')!;
		expect(boss.residual).toBe(322 - 100);
	});

	it('composes the IED residual instead of subtracting it', () => {
		const rows = residuals(windArcherFixture());
		const ied = rows.find((row) => row.stat.startsWith('Ignore Enemy DEF'))!;

		expect(ied.fromGear).toBeCloseTo(74.8, 6);
		expect(ied.fromStatWindow).toBeCloseTo(94.2, 6);
		// The extra source implied by the window, not 94.2 - 74.8 = 19.4.
		expect(ied.residual).toBeCloseTo((1 - 0.058 / 0.252) * 100, 6);
		expect(ied.residual).not.toBeCloseTo(19.4, 1);
	});

	it('returns nothing without a stat window', () => {
		const character = windArcherFixture();
		delete character.statWindow;
		expect(residuals(character)).toEqual([]);
	});
});
