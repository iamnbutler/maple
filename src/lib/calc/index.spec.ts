import { describe, expect, it } from 'vitest';

import * as calc from './index';

describe('calc barrel', () => {
	it('re-exports every module the design doc §4 lists for this wave', () => {
		expect(typeof calc.applyTriple).toBe('function');
		expect(typeof calc.statMultiplier).toBe('function');
		expect(typeof calc.ied.compose).toBe('function');
		expect(typeof calc.ied.defenseMultiplier).toBe('function');
		expect(typeof calc.arcaneMultiplier).toBe('function');
		expect(typeof calc.sacredMultiplier).toBe('function');
		expect(typeof calc.levelMultiplier).toBe('function');
		expect(typeof calc.damageIndex).toBe('function');
		expect(typeof calc.displayedRange).toBe('function');
		expect(typeof calc.computeCombatPower).toBe('function');
		expect(typeof calc.bowNormalizeAtt).toBe('function');
		expect(typeof calc.applyDelta).toBe('function');
		expect(typeof calc.measureGain).toBe('function');
		expect(typeof calc.measureGainBatch).toBe('function');
		expect(typeof calc.parsePotentialLine).toBe('function');
	});

	it('exposes the sourced constant tables', () => {
		expect(calc.BOW_BASE_ATT.destiny).toBe(349);
		expect(calc.LEVEL_MULTIPLIER_TABLE.length).toBeGreaterThan(0);
		expect(calc.ARCANE_BANDS.length).toBe(9);
	});
});
