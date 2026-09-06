import { describe, expect, it } from 'vitest';

import {
	applyStarCatch,
	cumulativeStarStats,
	expectedBooms,
	expectedCostToReach,
	getRecoveredStars,
	maxStars,
	starforceBaseCost,
	starforceCost,
	starRates,
	starStatGain,
	STAR_RATES,
	UNVERIFIED_WEAPON_26_30,
	weaponSub15Attack
} from './starforce';

describe('maxStars', () => {
	// formulas.md §4A §1.2
	it('follows the published item-level brackets', () => {
		expect(maxStars(94)).toBe(5);
		expect(maxStars(95)).toBe(8); // conflict resolved: two wikis beat masonym.dev's 96
		expect(maxStars(107)).toBe(8);
		expect(maxStars(108)).toBe(10);
		expect(maxStars(118)).toBe(15);
		expect(maxStars(128)).toBe(20);
		expect(maxStars(137)).toBe(20);
		expect(maxStars(138)).toBe(30);
		expect(maxStars(250)).toBe(30);
	});

	it('uses the Superior brackets when asked', () => {
		expect(maxStars(87, true)).toBe(3);
		expect(maxStars(88, true)).toBe(5);
		expect(maxStars(150, true)).toBe(15); // Tyrant
	});
});

describe('stars 1-15 (item-level independent)', () => {
	// formulas.md §4A §1.3
	it('reaches +40 class stat and +255 Max HP at 15★ on armor', () => {
		const at15 = cumulativeStarStats({ itemLevel: 160, stars: 15, kind: 'armor' });
		expect(at15.stat).toBe(40);
		expect(at15.maxHp).toBe(255);
		expect(at15.att).toBe(0);
	});

	it('matches the published cumulative class-stat column', () => {
		const cumulative = [0, 2, 4, 6, 8, 10, 13, 16, 19, 22, 25, 28, 31, 34, 37, 40];
		for (let s = 0; s <= 15; s++) {
			expect(cumulativeStarStats({ itemLevel: 160, stars: s, kind: 'armor' }).stat).toBe(
				cumulative[s]
			);
		}
	});

	it('gives weapons Max MP as well as Max HP', () => {
		const at15 = cumulativeStarStats({ itemLevel: 160, stars: 15, kind: 'weapon', baseAttack: 0 });
		expect(at15.maxHp).toBe(255);
		expect(at15.maxMp).toBe(255);
	});

	it('gives gloves no Max HP but the +7 ATT block', () => {
		const at15 = cumulativeStarStats({ itemLevel: 160, stars: 15, kind: 'glove' });
		expect(at15.maxHp).toBe(0);
		expect(at15.att).toBe(7);
		expect(at15.matt).toBe(7);
	});

	it('compounds weapon attack off the weapon base attack', () => {
		// f(n) = Σ ⌊att(i−1) × 0.02 + 1⌋ — formulas.md §4A §1.3 reference implementation
		expect(weaponSub15Attack(100, 5)).toBe(15);
		expect(weaponSub15Attack(100, 15)).toBe(45);
		expect(weaponSub15Attack(0, 15)).toBe(0); // no base ATT → no gain
		const gain = starStatGain({ itemLevel: 200, fromStar: 4, kind: 'weapon', baseAttack: 100 });
		expect(gain.att).toBe(weaponSub15Attack(100, 5) - weaponSub15Attack(100, 4));
	});

	it('adds 5% DEF per star', () => {
		expect(cumulativeStarStats({ itemLevel: 160, stars: 22, kind: 'armor' }).defPercent).toBe(110);
	});
});

describe('stars 16-30 — armor and accessories', () => {
	// formulas.md §4A §1.4, cumulative ATT/MATT table
	const cases: Array<[number, number, number]> = [
		// itemLevel, stars, expected cumulative ATT
		[130, 16, 7],
		[130, 20, 45],
		[145, 22, 78],
		[145, 30, 255],
		[155, 30, 270],
		[160, 30, 285],
		[200, 30, 315],
		[250, 30, 345],
		[160, 17, 21],
		[250, 16, 14]
	];
	it.each(cases)('item level %i at %i★ gives +%i ATT', (itemLevel, stars, expected) => {
		expect(cumulativeStarStats({ itemLevel, stars, kind: 'armor' }).att).toBe(expected);
	});

	it('caps class stat at 22★', () => {
		// 40 + perStar × (min(★,22) − 15) — formulas.md §4A §1.4
		expect(cumulativeStarStats({ itemLevel: 130, stars: 20, kind: 'armor' }).stat).toBe(75);
		expect(cumulativeStarStats({ itemLevel: 145, stars: 22, kind: 'armor' }).stat).toBe(103);
		expect(cumulativeStarStats({ itemLevel: 155, stars: 22, kind: 'armor' }).stat).toBe(117);
		expect(cumulativeStarStats({ itemLevel: 160, stars: 22, kind: 'armor' }).stat).toBe(131);
		expect(cumulativeStarStats({ itemLevel: 200, stars: 22, kind: 'armor' }).stat).toBe(145);
		expect(cumulativeStarStats({ itemLevel: 250, stars: 22, kind: 'armor' }).stat).toBe(159);
		// 23★+ grants attack only
		expect(cumulativeStarStats({ itemLevel: 160, stars: 30, kind: 'armor' }).stat).toBe(131);
	});

	it('keeps the glove sub-15 attack on top of the 16★+ table', () => {
		const at22 = cumulativeStarStats({ itemLevel: 160, stars: 22, kind: 'glove' });
		expect(at22.att).toBe(7 + 92); // +7 from stars 5-15, +92 from the armor 16-22 table
	});
});

describe('stars 16-30 — weapons', () => {
	// formulas.md §4A §1.4 weapon cumulative table (added on top of f(15))
	const cases: Array<[number, number, number]> = [
		[130, 16, 6],
		[130, 20, 37],
		[145, 17, 15], // corrected 17★ delta (+8), not the wiki's repeated +7
		[145, 25, 158],
		[155, 25, 168],
		[160, 25, 177],
		[200, 25, 207] // wiki renders 102 here; a typo the research corrects
	];
	it.each(cases)('item level %i at %i★ gives +%i ATT', (itemLevel, stars, expected) => {
		expect(cumulativeStarStats({ itemLevel, stars, kind: 'weapon', baseAttack: 0 }).att).toBe(
			expected
		);
	});

	it('refuses to guess stars 26-30 unless the caller opts in', () => {
		expect(() =>
			cumulativeStarStats({ itemLevel: 160, stars: 30, kind: 'weapon', baseAttack: 0 })
		).toThrow(/undocumented/);
		const unverified = cumulativeStarStats({
			itemLevel: 160,
			stars: 30,
			kind: 'weapon',
			baseAttack: 0,
			allowUnverifiedWeapon26to30: true
		});
		// 177 at 25★ plus the extrapolated +35/36/37/38/39
		expect(unverified.att).toBe(177 + 35 + 36 + 37 + 38 + 39);
		expect(UNVERIFIED_WEAPON_26_30['160-199'][0]).toBe(35);
	});
});

describe('badges and superior gear', () => {
	// formulas.md §4A §1.4
	it('gives badges All Stats only', () => {
		const at22 = cumulativeStarStats({ itemLevel: 160, stars: 22, kind: 'badge' });
		expect(at22.allStat).toBe(131);
		expect(at22.att).toBe(0);
		expect(at22.maxHp).toBe(0);
		expect(at22.defPercent).toBe(0);
		expect(cumulativeStarStats({ itemLevel: 130, stars: 20, kind: 'badge' }).allStat).toBe(75);
		// The research corrects the wiki's 21★/150-159 cell (104) to 40 + 11×6 = 106.
		expect(cumulativeStarStats({ itemLevel: 155, stars: 21, kind: 'badge' }).allStat).toBe(106);
	});

	it('matches the Superior cumulative checkpoints', () => {
		const tyrant15 = cumulativeStarStats({ itemLevel: 150, stars: 15, kind: 'superior' });
		expect(tyrant15.allStat).toBe(115);
		expect(tyrant15.att).toBe(150);
		const l138 = cumulativeStarStats({ itemLevel: 140, stars: 15, kind: 'superior' });
		expect(l138.allStat).toBe(105);
		expect(l138.att).toBe(140);
		const l118 = cumulativeStarStats({ itemLevel: 120, stars: 10, kind: 'superior' });
		expect(l118.allStat).toBe(80);
		expect(l118.att).toBe(40);
		const l128 = cumulativeStarStats({ itemLevel: 130, stars: 10, kind: 'superior' });
		expect(l128.allStat).toBe(90);
		expect(l128.att).toBe(45);
	});
});

describe('rates', () => {
	// formulas.md §4A §1.5 (GMS v264 official)
	it('has 30 rows that each sum to 1', () => {
		expect(STAR_RATES).toHaveLength(30);
		for (const row of STAR_RATES) {
			expect(row.success + row.maintain + row.destroy).toBeCloseTo(1, 10);
		}
	});

	it('matches spot values', () => {
		expect(STAR_RATES[0].success).toBe(0.95);
		expect(STAR_RATES[14].success).toBe(0.3); // 14 → 15
		expect(STAR_RATES[15]).toEqual({ success: 0.3, maintain: 0.679, destroy: 0.021 });
		expect(STAR_RATES[20].destroy).toBe(0.105); // 20 → 21 is the odd 30% success row
		expect(STAR_RATES[29]).toEqual({ success: 0.01, maintain: 0.792, destroy: 0.198 });
	});

	it('star catch multiplies success by 1.05 and redistributes the remainder', () => {
		const caught = applyStarCatch(STAR_RATES[17]);
		expect(caught.success).toBeCloseTo(0.1575, 10);
		expect(caught.success + caught.maintain + caught.destroy).toBeCloseTo(1, 10);
		// destroy keeps its share of the non-success mass
		expect(caught.destroy / (caught.maintain + caught.destroy)).toBeCloseTo(0.068 / 0.85, 10);
	});

	it('safeguard converts destruction into maintain at 15-17★ only', () => {
		const safe = starRates(16, { safeguard: true });
		expect(safe.destroy).toBe(0);
		expect(safe.maintain).toBeCloseTo(0.7, 10);
		const unsafe = starRates(18, { safeguard: true });
		expect(unsafe.destroy).toBe(0.068);
	});
});

describe('meso cost', () => {
	// formulas.md §4A §1.7 — regression values recomputed from the published formula
	it('matches the formula at spot points', () => {
		expect(starforceBaseCost(150, 0)).toBe(136_000);
		expect(starforceBaseCost(150, 10)).toBe(5_470_800);
		expect(starforceBaseCost(160, 15)).toBe(36_514_500);
		expect(starforceBaseCost(160, 17)).toBe(66_913_100);
		expect(starforceBaseCost(200, 22)).toBe(189_988_600);
	});

	it('rounds the item level down to the nearest 10 and the cost to the nearest 100', () => {
		expect(starforceBaseCost(159, 15)).toBe(starforceBaseCost(150, 15));
		expect(starforceBaseCost(160, 15) % 100).toBe(0);
	});

	it('triples the cost with safeguard, at 15-17★ only', () => {
		const base = starforceBaseCost(160, 16);
		expect(starforceCost(160, 16, { safeguard: true })).toBe(base * 3);
		expect(starforceCost(160, 18, { safeguard: true })).toBe(starforceBaseCost(160, 18));
	});

	it('discounts the base cost only, never the safeguard surcharge', () => {
		const base = starforceBaseCost(160, 16);
		expect(starforceCost(160, 16, { mvpDiscountPercent: 10 })).toBeCloseTo(base * 0.9, 6);
		expect(starforceCost(160, 16, { safeguard: true, mvpDiscountPercent: 10 })).toBeCloseTo(
			base * 0.9 + base * 2,
			6
		);
	});

	it('refuses Enhancement Modes 2-4 without an explicit opt-in', () => {
		expect(() => starforceCost(160, 18, { enhancementMode: 4 })).toThrow(
			/allowUnverifiedEnhancementModes/
		);
		expect(() =>
			starforceCost(160, 16, { enhancementMode: 4, allowUnverifiedEnhancementModes: true })
		).toThrow(/not available for 15★→17★/);
		expect(() =>
			starforceCost(160, 18, { enhancementMode: 2, allowUnverifiedEnhancementModes: true })
		).toThrow(/published no rates/);
		expect(
			starforceCost(160, 18, { enhancementMode: 4, allowUnverifiedEnhancementModes: true })
		).toBeCloseTo(starforceBaseCost(160, 18) * 6.5, 6);
	});
});

describe('trace recovery', () => {
	// formulas.md §4A §1.6
	it('matches the GMS recovery table', () => {
		expect(getRecoveredStars(15)).toBe(12);
		expect(getRecoveredStars(19)).toBe(12);
		expect(getRecoveredStars(20)).toBe(15);
		expect(getRecoveredStars(22)).toBe(17);
		expect(getRecoveredStars(25)).toBe(19);
		expect(getRecoveredStars(30)).toBe(20);
	});
});

describe('expectedCostToReach', () => {
	it('is cost / success below 15★, where nothing can be lost', () => {
		const expected = starforceBaseCost(160, 0) / 0.95;
		expect(expectedCostToReach(160, 0, 1)).toBeCloseTo(expected, 6);
	});

	it('is monotone in the target star', () => {
		let previous = 0;
		for (let to = 16; to <= 25; to++) {
			const cost = expectedCostToReach(160, 15, to);
			expect(cost).toBeGreaterThan(previous);
			previous = cost;
		}
	});

	it('is monotone in the starting star (further to go costs more)', () => {
		expect(expectedCostToReach(160, 15, 22)).toBeGreaterThan(expectedCostToReach(160, 17, 22));
	});

	it('charges the replacement cost on every boom', () => {
		const withoutReplacement = expectedCostToReach(160, 15, 22);
		const withReplacement = expectedCostToReach(160, 15, 22, { replacementCost: 1_000_000_000 });
		const booms = expectedBooms(15, 22);
		expect(booms).toBeGreaterThan(0);
		expect(withReplacement).toBeGreaterThan(withoutReplacement);
		// The replacement charge is exactly booms × price only when the price does not
		// change the path, which it does not — booms are path-independent here.
		expect(withReplacement - withoutReplacement).toBeCloseTo(booms * 1_000_000_000, 0);
	});

	it('makes safeguarding 15→18 cheaper in booms', () => {
		expect(expectedBooms(15, 18, { safeguard: true })).toBe(0);
		expect(expectedBooms(15, 18)).toBeGreaterThan(0);
	});

	it('returns 0 when already at or past the target', () => {
		expect(expectedCostToReach(160, 22, 22)).toBe(0);
		expect(expectedCostToReach(160, 23, 22)).toBe(0);
	});
});
