import { describe, expect, it } from 'vitest';

import {
	LEVEL_MULTIPLIER_TABLE,
	arcaneMultiplier,
	levelMultiplier,
	sacredMultiplier
} from './force';

describe('arcaneMultiplier (formulas.md §1.12)', () => {
	it('has no effect when the map has no requirement', () => {
		expect(arcaneMultiplier(undefined, 500)).toBe(1);
		expect(arcaneMultiplier(0, 500)).toBe(1);
	});

	it('reproduces every published band', () => {
		const req = 100;
		expect(arcaneMultiplier(req, 0)).toBeCloseTo(0.1, 10); // 0-9%   -> -90%
		expect(arcaneMultiplier(req, 9)).toBeCloseTo(0.1, 10);
		expect(arcaneMultiplier(req, 10)).toBeCloseTo(0.3, 10); // 10-29% -> -70%
		expect(arcaneMultiplier(req, 29)).toBeCloseTo(0.3, 10);
		expect(arcaneMultiplier(req, 30)).toBeCloseTo(0.6, 10); // 30-49% -> -40%
		expect(arcaneMultiplier(req, 49)).toBeCloseTo(0.6, 10);
		expect(arcaneMultiplier(req, 50)).toBeCloseTo(0.7, 10); // 50-69% -> -30%
		expect(arcaneMultiplier(req, 69)).toBeCloseTo(0.7, 10);
		expect(arcaneMultiplier(req, 70)).toBeCloseTo(0.8, 10); // 70-99% -> -20%
		expect(arcaneMultiplier(req, 99)).toBeCloseTo(0.8, 10);
		expect(arcaneMultiplier(req, 100)).toBeCloseTo(1.0, 10); // 100-109% -> 0%
		expect(arcaneMultiplier(req, 109)).toBeCloseTo(1.0, 10);
		expect(arcaneMultiplier(req, 110)).toBeCloseTo(1.1, 10); // 110-129% -> +10%
		expect(arcaneMultiplier(req, 129)).toBeCloseTo(1.1, 10);
		expect(arcaneMultiplier(req, 130)).toBeCloseTo(1.3, 10); // 130-149% -> +30%
		expect(arcaneMultiplier(req, 149)).toBeCloseTo(1.3, 10);
		expect(arcaneMultiplier(req, 150)).toBeCloseTo(1.5, 10); // 150%+ -> +50%
		expect(arcaneMultiplier(req, 10_000)).toBeCloseTo(1.5, 10);
	});

	it("reproduces Lucid's masonym breakpoints (req 360 -> 400/470/540)", () => {
		expect(arcaneMultiplier(360, 360)).toBeCloseTo(1.0, 10);
		expect(arcaneMultiplier(360, 395)).toBeCloseTo(1.0, 10); // 109.7% -> floor 109 -> 0%
		expect(arcaneMultiplier(360, 396)).toBeCloseTo(1.1, 10); // 110.0% -> +10%
		expect(arcaneMultiplier(360, 400)).toBeCloseTo(1.1, 10); // 111%   -> +10%
		expect(arcaneMultiplier(360, 470)).toBeCloseTo(1.3, 10); // 130.5% -> +30%
		expect(arcaneMultiplier(360, 540)).toBeCloseTo(1.5, 10); // 150%   -> +50%
	});

	it('reproduces the Black Mage breakpoints (req 1320 -> 1455/1720/1980)', () => {
		expect(arcaneMultiplier(1320, 1455)).toBeCloseTo(1.1, 10);
		expect(arcaneMultiplier(1320, 1720)).toBeCloseTo(1.3, 10);
		expect(arcaneMultiplier(1320, 1980)).toBeCloseTo(1.5, 10);
	});
});

describe('sacredMultiplier (formulas.md §1.12)', () => {
	it('has no effect when the map has no requirement', () => {
		expect(sacredMultiplier(undefined, 300)).toBe(1);
		expect(sacredMultiplier(0, 300)).toBe(1);
	});

	it('is exactly at requirement', () => {
		expect(sacredMultiplier(200, 200)).toBeCloseTo(1, 10);
	});

	it('loses 1%p per point short, capped at -95%', () => {
		expect(sacredMultiplier(200, 199)).toBeCloseTo(0.99, 10);
		expect(sacredMultiplier(200, 150)).toBeCloseTo(0.5, 10);
		expect(sacredMultiplier(200, 105)).toBeCloseTo(0.05, 10);
		expect(sacredMultiplier(200, 100)).toBeCloseTo(0.05, 10);
		expect(sacredMultiplier(200, 0)).toBeCloseTo(0.05, 10);
	});

	it('gains 1%p per 2 points over, floored, capped at +25%', () => {
		expect(sacredMultiplier(200, 201)).toBeCloseTo(1.0, 10); // floor(1/2) = 0
		expect(sacredMultiplier(200, 202)).toBeCloseTo(1.01, 10);
		expect(sacredMultiplier(200, 203)).toBeCloseTo(1.01, 10);
		expect(sacredMultiplier(200, 210)).toBeCloseTo(1.05, 10);
		expect(sacredMultiplier(200, 249)).toBeCloseTo(1.24, 10);
		expect(sacredMultiplier(200, 250)).toBeCloseTo(1.25, 10); // "+25% (Max)"
		expect(sacredMultiplier(200, 1000)).toBeCloseTo(1.25, 10);
	});

	it('reproduces the masonym +25% breakpoint for every Grandis boss', () => {
		// req -> req + 50 gives +25% (Max) for Seren/Kalos 200, Adversary 220,
		// Kaling 230, Malefic Star 400, Limbo 500, Baldrix 700, Jupiter 810.
		for (const req of [200, 220, 230, 400, 500, 700, 810]) {
			expect(sacredMultiplier(req, req + 50)).toBeCloseTo(1.25, 10);
			expect(sacredMultiplier(req, req + 49)).toBeCloseTo(1.24, 10);
		}
	});
});

describe('levelMultiplier (formulas.md §1.11, StrategyWiki version)', () => {
	it('reproduces every published row', () => {
		for (const [diff, expected] of LEVEL_MULTIPLIER_TABLE) {
			expect(levelMultiplier(200 + diff, 200)).toBeCloseTo(expected, 10);
		}
	});

	it('caps the above-level bonus at +20%', () => {
		expect(levelMultiplier(300, 200)).toBeCloseTo(1.2, 10);
		expect(levelMultiplier(205, 200)).toBeCloseTo(1.2, 10);
	});

	it('fixes the MapleStory Wiki transcription bug at -37/-38/-39', () => {
		// The wiki prints 0.8 / 0.5 / 0.3; the pattern (and StrategyWiki)
		// require 0.08 / 0.05 / 0.03.
		expect(levelMultiplier(163, 200)).toBeCloseTo(0.08, 10);
		expect(levelMultiplier(162, 200)).toBeCloseTo(0.05, 10);
		expect(levelMultiplier(161, 200)).toBeCloseTo(0.03, 10);
	});

	it('is 0 at 40 or more levels below', () => {
		expect(levelMultiplier(160, 200)).toBe(0);
		expect(levelMultiplier(100, 200)).toBe(0);
	});

	it('interpolates the unpublished rows at -2.5%p per level', () => {
		expect(levelMultiplier(189, 200)).toBeCloseTo(0.73, 10); // -11
		expect(levelMultiplier(188, 200)).toBeCloseTo(0.7, 10); // -12
		expect(levelMultiplier(175, 200)).toBeCloseTo(0.38, 10); // -25
	});
});
