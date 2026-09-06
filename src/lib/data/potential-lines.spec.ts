import { describe, expect, it } from 'vitest';
import {
	CUBE_MAX_GRADE,
	cheapestCubeFor,
	cubeCost,
	GMS_PERCENT_LINE_BREAKPOINT,
	HEROIC_CUBE_MESO_PRICE,
	attackPercent,
	itemLevelBreakpoints,
	lineChance,
	lineDistribution,
	lineValueAtLevel,
	linePool,
	mainStatPercent,
	MAX_LINES_PER_ITEM,
	POOL_KIND_TO_PARSED_KIND,
	POTENTIAL_LINE_POOLS,
	poolGroupForSlot,
	poolMinItemLevel,
	primeLineChance,
	primeLineRates,
	nonPrimePoolRank,
	requireLines,
	revealPotentialCost,
	rollablePool,
	UNVERIFIED_HIGH_RANK_DEF_PERCENT_LINE,
	validateTarget,
	secondaryPoolGroup,
	targetProbability,
	type CubeId,
	type PoolLine,
	type PoolLineKind,
	type PoolRank,
	type PotentialPoolGroup,
	type PotentialTarget,
	type RollContext
} from './potential-lines';

const GROUPS = Object.keys(POTENTIAL_LINE_POOLS) as PotentialPoolGroup[];
const RANKS: PoolRank[] = ['belowRare', 'rare', 'epic', 'unique', 'legendary'];

/** A Lv200 Arcane/Eternal piece at Legendary — the case the tracker actually ranks. */
function ctx(group: PotentialPoolGroup, cube: CubeId): RollContext {
	return { group, itemLevel: 200, grade: 'legendary', cube, characterLevel: 285 };
}

/* -------------------------------------------------------------------------- */

describe('pool integrity', () => {
	it('covers all 12 StrategyWiki slot groups × 5 rank sections', () => {
		expect(GROUPS).toHaveLength(12);
		for (const group of GROUPS) {
			expect(Object.keys(POTENTIAL_LINE_POOLS[group]).sort()).toEqual([...RANKS].sort());
		}
	});

	// This is the transcription check: the source publishes each pool as a set of
	// mutually exclusive options, so every column must total 100%. Any dropped or
	// duplicated row would show up here.
	it('every pool totals 100% in all three probability columns', () => {
		for (const group of GROUPS) {
			for (const rank of RANKS) {
				const pool = linePool(group, rank);
				expect(pool.length, `${group}/${rank} is empty`).toBeGreaterThan(0);
				for (const source of ['initial', 'inGameCube', 'cashCube'] as const) {
					const total = pool.reduce((sum, line) => sum + lineChance(line, source), 0);
					expect(total, `${group}/${rank}/${source}`).toBeCloseTo(100, 1);
				}
			}
		}
	});

	it('every line carries its verbatim source label and a known kind', () => {
		const kinds = new Set(Object.keys(POOL_KIND_TO_PARSED_KIND));
		for (const group of GROUPS) {
			for (const rank of RANKS) {
				for (const line of linePool(group, rank)) {
					expect(line.label.length).toBeGreaterThan(0);
					expect(kinds.has(line.kind), `${line.kind} unmapped`).toBe(true);
					expect(line.chance).toHaveLength(3);
				}
			}
		}
	});

	it('a pool is published from one item level upward, uniformly', () => {
		for (const group of GROUPS) {
			for (const rank of RANKS) {
				const levels = new Set(linePool(group, rank).map((l) => l.minItemLevel));
				expect(levels.size, `${group}/${rank}`).toBe(1);
			}
		}
		// The endgame pools: weapons publish from 100+, hats and gloves from 120+.
		expect(poolMinItemLevel('weapon', 'legendary')).toBe(100);
		expect(poolMinItemLevel('hat', 'legendary')).toBe(120);
		expect(poolMinItemLevel('gloves', 'legendary')).toBe(120);
		expect(poolMinItemLevel('accessory', 'legendary')).toBe(0);
	});
});

/* -------------------------------------------------------------------------- */

describe('pools are PER SLOT, not per category', () => {
	const kindsIn = (group: PotentialPoolGroup, rank: PoolRank) =>
		new Set(rollablePool(group, rank, 'cashCube').map((l) => l.kind));

	it('gloves roll Critical Damage; no other slot does', () => {
		for (const group of GROUPS) {
			for (const rank of RANKS) {
				const has = linePool(group, rank).some((l) => l.kind === 'crit_dmg');
				expect(has, `${group}/${rank}`).toBe(group === 'gloves' && rank === 'legendary');
			}
		}
	});

	it('hats roll Skill Cooldown; no other slot does', () => {
		for (const group of GROUPS) {
			for (const rank of RANKS) {
				const has = linePool(group, rank).some((l) => l.kind === 'cooldown');
				expect(has, `${group}/${rank}`).toBe(group === 'hat' && rank === 'legendary');
			}
		}
		const cooldowns = linePool('hat', 'legendary').filter((l) => l.kind === 'cooldown');
		expect(cooldowns.map((l) => l.value)).toEqual([-1, -2]);
	});

	it('emblems cannot roll Boss Damage, but weapons and secondaries can', () => {
		expect(kindsIn('emblem', 'legendary').has('boss')).toBe(false);
		expect(kindsIn('emblem', 'unique').has('boss')).toBe(false);
		expect(kindsIn('emblem', 'legendary').has('ied')).toBe(true);
		expect(kindsIn('weapon', 'legendary').has('boss')).toBe(true);
		expect(kindsIn('secondary', 'legendary').has('boss')).toBe(true);
		expect(kindsIn('shieldSoulRing', 'legendary').has('boss')).toBe(true);
	});

	it('only accessories roll Mesos Obtained / Item Drop Rate, and only at Legendary', () => {
		for (const group of GROUPS) {
			for (const rank of RANKS) {
				const has = linePool(group, rank).some((l) => l.kind === 'meso' || l.kind === 'drop');
				expect(has, `${group}/${rank}`).toBe(group === 'accessory' && rank === 'legendary');
			}
		}
	});

	it('hearts and badges roll nothing but stat lines — no ATT%, no boss, no IED', () => {
		const kinds = kindsIn('heartBadge', 'legendary');
		expect([...kinds].sort()).toEqual(['all_stat_pct', 'def_pct', 'hp_pct', 'mp_pct', 'stat_pct']);
	});

	// The exact size of the pool a Glowing/Bright cube sees is what sets the price
	// of any single wanted line, so pin it.
	it('rollable Legendary-prime pool sizes for a cash cube', () => {
		const sizes = Object.fromEntries(
			GROUPS.map((g) => [g, rollablePool(g, 'legendary', 'cashCube').length])
		);
		expect(sizes).toEqual({
			hat: 13,
			topOverall: 12,
			bottom: 10,
			gloves: 12,
			shoes: 11,
			capeBeltShoulder: 10,
			accessory: 12,
			weapon: 15,
			secondary: 17,
			shieldSoulRing: 17,
			emblem: 13,
			heartBadge: 8
		});
	});

	it('cash cubes cannot roll every line an in-game cube can', () => {
		// Auto Steal and the +40% "Skills and Potion HP Recovery" line are 0% on cash cubes.
		const gloves = linePool('gloves', 'legendary');
		const autoSteal = gloves.filter((l) => l.kind === 'auto_steal');
		expect(autoSteal.length).toBeGreaterThan(0);
		for (const line of autoSteal) {
			expect(lineChance(line, 'inGameCube')).toBeGreaterThan(0);
			expect(lineChance(line, 'cashCube')).toBe(0);
		}
	});
});

/* -------------------------------------------------------------------------- */

describe('line values and item-level breakpoints', () => {
	const statLine = (group: PotentialPoolGroup, rank: PoolRank) =>
		linePool(group, rank).find((l) => l.kind === 'stat_pct' && l.stat === 'str') as PoolLine;

	it('GMS bumps %stat to 13% at item level 151, and only from 151', () => {
		const line = statLine('hat', 'legendary');
		expect(lineValueAtLevel(line, 150, 285)).toBe(12);
		expect(lineValueAtLevel(line, GMS_PERCENT_LINE_BREAKPOINT, 285)).toBe(13);
		expect(lineValueAtLevel(line, 160, 285)).toBe(13);
		expect(lineValueAtLevel(line, 200, 285)).toBe(13);
		expect(lineValueAtLevel(line, 250, 285)).toBe(13);
		expect(lineValueAtLevel(line, 70, 285)).toBe(9);
	});

	it('All Stats % is one rank below: 10% at Legendary, 7% at Unique', () => {
		const legendary = linePool('hat', 'legendary').find((l) => l.kind === 'all_stat_pct')!;
		const unique = linePool('hat', 'unique').find((l) => l.kind === 'all_stat_pct')!;
		expect(lineValueAtLevel(legendary, 200, 285)).toBe(10);
		expect(lineValueAtLevel(unique, 200, 285)).toBe(7);
	});

	// The asymmetry is real and easy to get wrong: %HP / %MP / %DEF have no 151+ row.
	it('Max HP % / DEF % do NOT get the 151 bump — they stay at 12%', () => {
		for (const kind of ['hp_pct', 'mp_pct', 'def_pct'] as const) {
			const line = linePool('hat', 'legendary').find((l) => l.kind === kind)!;
			expect(lineValueAtLevel(line, 150, 285), kind).toBe(12);
			expect(lineValueAtLevel(line, 250, 285), kind).toBe(12);
		}
	});

	it('glove Critical Damage is 5 / 6 / 8% and does not exist below item level 50', () => {
		const line = linePool('gloves', 'legendary').find((l) => l.kind === 'crit_dmg')!;
		expect(lineValueAtLevel(line, 49, 285)).toBeNull();
		expect(lineValueAtLevel(line, 50, 285)).toBe(5);
		expect(lineValueAtLevel(line, 60, 285)).toBe(5);
		expect(lineValueAtLevel(line, 61, 285)).toBe(6);
		expect(lineValueAtLevel(line, 80, 285)).toBe(6);
		expect(lineValueAtLevel(line, 81, 285)).toBe(8);
		expect(lineValueAtLevel(line, 200, 285)).toBe(8);
	});

	it('Meso / Drop stop scaling at item level 71 — no 151 bump', () => {
		const drop = linePool('accessory', 'legendary').find((l) => l.kind === 'drop')!;
		expect(lineValueAtLevel(drop, 30, 285)).toBe(10);
		expect(lineValueAtLevel(drop, 70, 285)).toBe(15);
		expect(lineValueAtLevel(drop, 71, 285)).toBe(20);
		expect(lineValueAtLevel(drop, 250, 285)).toBe(20);
	});

	it('"+1 ATT per 10 character levels" scales with the CHARACTER, not the item', () => {
		const line = linePool('weapon', 'legendary').find((l) => l.kind === 'att_per_10_levels')!;
		expect(lineValueAtLevel(line, 200, 250)).toBe(25);
		expect(lineValueAtLevel(line, 200, 285)).toBe(28);
		expect(lineValueAtLevel(line, 200, undefined)).toBeNull();
	});

	it('boss and IED lines are fixed values, not scaled', () => {
		const boss = linePool('weapon', 'legendary')
			.filter((l) => l.kind === 'boss')
			.map((l) => l.value);
		const ied = linePool('weapon', 'legendary')
			.filter((l) => l.kind === 'ied')
			.map((l) => l.value);
		expect(boss).toEqual([35, 40]);
		expect(ied).toEqual([35, 40]);
		expect(
			linePool('weapon', 'unique')
				.filter((l) => l.kind === 'boss')
				.map((l) => l.value)
		).toEqual([30]);
	});

	it('reports the breakpoints that matter for a slot', () => {
		expect(itemLevelBreakpoints('hat', 'legendary')).toContain(GMS_PERCENT_LINE_BREAKPOINT);
		expect(itemLevelBreakpoints('weapon', 'legendary')).toEqual([0, 31, 71, 151]);
	});
});

/* -------------------------------------------------------------------------- */

describe('prime-line chance — the number `triplePrime` leaves out', () => {
	it('Critical Damage is 1 of 12 rollable glove Legendary-prime lines', () => {
		expect(primeLineChance('gloves', 'legendary', { kind: 'crit_dmg' })).toBeCloseTo(1 / 11, 4);
	});

	it('Boss Damage on a weapon: 35% is twice as likely as 40%', () => {
		const any = primeLineChance('weapon', 'legendary', { kind: 'boss' });
		const forty = primeLineChance('weapon', 'legendary', { kind: 'boss', minValue: 40 });
		expect(any).toBeCloseTo(0.14634, 4); // 9.756% + 4.878%
		expect(forty).toBeCloseTo(0.04878, 4);
		expect(any / forty).toBeCloseTo(3, 2);
	});

	it('any single wanted line is a ~1-in-7 to 1-in-25 shot, never a "prime" coin flip', () => {
		expect(primeLineChance('weapon', 'legendary', { kind: 'att_pct' })).toBeCloseTo(0.04878, 4);
		expect(primeLineChance('hat', 'legendary', { kind: 'cooldown' })).toBeCloseTo(0.11111, 4);
		expect(primeLineChance('accessory', 'legendary', { kind: 'drop' })).toBeCloseTo(0.069767, 4);
	});

	it('a line absent from the pool is exactly zero, never a small number', () => {
		expect(primeLineChance('emblem', 'legendary', { kind: 'boss' })).toBe(0);
		expect(primeLineChance('hat', 'legendary', { kind: 'crit_dmg' })).toBe(0);
		expect(primeLineChance('gloves', 'legendary', { kind: 'cooldown' })).toBe(0);
		expect(primeLineChance('heartBadge', 'legendary', { kind: 'att_pct' })).toBe(0);
	});
});

/* -------------------------------------------------------------------------- */

describe('line distributions', () => {
	it('the 1st line is always prime; later lines mix in the rank-below pool', () => {
		expect(primeLineRates('bright', 'legendary')).toEqual([1, 0.2, 0.05]);
		expect(primeLineRates('glowing', 'legendary')).toEqual([1, 0.1, 0.01]);
		expect(primeLineRates('solid', 'legendary')).toEqual([1, 0.001996, 0.001996]);
		expect(nonPrimePoolRank('legendary')).toBe('unique');
	});

	it('each line slot is a proper distribution', () => {
		for (const index of [0, 1, 2] as const) {
			const dist = lineDistribution(ctx('weapon', 'bright'), index);
			const total = dist.reduce((sum, o) => sum + o.p, 0);
			expect(total).toBeCloseTo(1, 10);
		}
	});

	it('a 2nd line is far more likely to be a NON-prime %ATT than a prime one', () => {
		const dist = lineDistribution(ctx('weapon', 'bright'), 1);
		const prime = dist.find((o) => o.kind === 'att_pct' && o.value === 13)!;
		const nonPrime = dist.find((o) => o.kind === 'att_pct' && o.value === 10)!;
		expect(prime.p).toBeCloseTo(0.2 * 0.04878, 4);
		expect(nonPrime.p).toBeCloseTo(0.8 * 0.069767, 4);
		expect(nonPrime.p).toBeGreaterThan(prime.p);
	});

	it('rejects a cube that cannot reach the rank, and an item below the published pool', () => {
		expect(() => lineDistribution(ctx('weapon', 'hard'), 0)).toThrow(/cannot roll legendary/);
		expect(() => lineDistribution(ctx('weapon', 'mystical'), 0)).toThrow(/cannot roll legendary/);
		expect(() => lineDistribution({ ...ctx('gloves', 'bright'), itemLevel: 100 }, 0)).toThrow(
			/No sourced pool/
		);
		expect(CUBE_MAX_GRADE.solid).toBe('legendary');
	});
});

/* -------------------------------------------------------------------------- */

describe("target probability — cross-checked against MathBro's cubing calculator", () => {
	// MathBro's calculator computes the same quantities from an independent
	// transcription (Nexon KR's own disclosure pages, scraped 2023-11-14). The
	// weapon pool is identical in GMS and KMS, so these must agree.
	// Source: https://brendonmay.github.io/cubingCalculator/
	const w = (cube: CubeId) => ctx('weapon', cube);
	const cases: ReadonlyArray<[string, CubeId, PotentialTarget, number]> = [
		['3 lines of boss damage (Bright)', 'bright', [requireLines('boss', 3)], 9.16343e-4],
		['2 lines of boss damage (Bright)', 'bright', [requireLines('boss', 2)], 2.765e-2],
		['3 lines of %ATT, any value (Bright)', 'bright', [requireLines('att_pct', 3)], 2.19795e-4],
		['3 lines of boss or IED (Bright)', 'bright', [requireLines(['boss', 'ied'], 3)], 5.66327e-3],
		['3 lines of boss or IED (Glowing)', 'glowing', [requireLines(['boss', 'ied'], 3)], 5.14218e-3],
		[
			'2 boss + 1 %ATT (Bright)',
			'bright',
			[requireLines('boss', 2), requireLines('att_pct', 1)],
			1.86725e-3
		]
	];

	for (const [name, cube, target, expected] of cases) {
		it(`matches MathBro: ${name}`, () => {
			const p = targetProbability(w(cube), target);
			expect(p / expected).toBeCloseTo(1, 4);
		});
	}

	it('matches a hand-computed independent-lines case exactly', () => {
		// Critical Damage exists ONLY in the glove Legendary-prime pool, so all three
		// lines must be prime AND all three must hit the same 1-in-11 slot:
		//   p = (1/11) × (0.20 × 1/11) × (0.05 × 1/11) = 0.01 / 1331
		const p = targetProbability(ctx('gloves', 'bright'), [requireLines('crit_dmg', 3)]);
		expect(p).toBeCloseTo(0.01 / 1331, 9);
	});

	it('an impossible target is exactly 0 and costs Infinity cubes', () => {
		const cost = cubeCost(ctx('emblem', 'bright'), [requireLines('boss', 1)]);
		expect(cost.probability).toBe(0);
		expect(cost.expectedCubes).toBe(Infinity);
	});

	it('an empty target is free', () => {
		expect(targetProbability(ctx('weapon', 'bright'), [])).toBe(1);
	});
});

/* -------------------------------------------------------------------------- */

describe('line-count caps', () => {
	it('boss / IED / drop may appear 3 times (KMST 1.2.168 lifted the 2-line cap)', () => {
		expect(MAX_LINES_PER_ITEM.boss).toBe(3);
		expect(MAX_LINES_PER_ITEM.ied).toBe(3);
		expect(MAX_LINES_PER_ITEM.drop).toBe(3);
		expect(targetProbability(ctx('weapon', 'bright'), [requireLines('boss', 3)])).toBeGreaterThan(
			0
		);
		expect(
			targetProbability(ctx('accessory', 'bright'), [requireLines('drop', 3)])
		).toBeGreaterThan(0);
	});

	it('the source\'s stale "up to 2 times" note is preserved verbatim on the lines', () => {
		const boss = linePool('weapon', 'legendary').find((l) => l.kind === 'boss')!;
		expect(boss.maxPerItem).toBe(2);
	});

	it('a capped junk line re-normalises the pool, nudging later lines UP', () => {
		// Decent skills cap at 1 per item, so once one rolls it leaves the pool and
		// every remaining line's chance rises. Two cooldown lines on a hat therefore
		// come out slightly ahead of the naive independent product.
		const naive =
			0.11111 * (0.2 * 0.11111) + 0.11111 * (0.05 * 0.11111) + 0.2 * 0.11111 * 0.05 * 0.11111;
		const exact = targetProbability(ctx('hat', 'bright'), [requireLines('cooldown', 2)]);
		expect(exact).toBeGreaterThan(naive * 0.99);
		expect(exact).toBeLessThan(naive * 1.05);
	});
});

/* -------------------------------------------------------------------------- */

describe('the known-hard cases', () => {
	const naiveTriplePrimeCubes = { glowing: 1 / 0.001, bright: 1 / 0.01 };

	it('3× Critical Damage gloves costs TRILLIONS, not the ~2.2B `triplePrime` implies', () => {
		const cost = cubeCost(ctx('gloves', 'bright'), [requireLines('crit_dmg', 3)]);
		expect(cost.expectedCubes).toBeGreaterThan(100_000);
		expect(cost.expectedCubes).toBeLessThan(200_000);
		expect(cost.expectedMesos!).toBeGreaterThan(2e12);
		expect(cost.expectedMesos!).toBeLessThan(4e12);
		// The whole point of this module: the naive model is off by three orders of magnitude.
		const naive = naiveTriplePrimeCubes.bright * HEROIC_CUBE_MESO_PRICE.bright!;
		expect(cost.expectedMesos! / naive).toBeGreaterThan(1000);
	});

	it('3× Critical Damage is worse with Glowing cubes despite the cheaper cube', () => {
		const glowing = cubeCost(ctx('gloves', 'glowing'), [requireLines('crit_dmg', 3)]);
		const bright = cubeCost(ctx('gloves', 'bright'), [requireLines('crit_dmg', 3)]);
		expect(glowing.expectedMesos!).toBeGreaterThan(bright.expectedMesos!);
		expect(
			cheapestCubeFor({ ...ctx('gloves', 'bright') }, [requireLines('crit_dmg', 3)]).cube
		).toBe('bright');
	});

	it('2× cooldown lines on a hat is a few billion, not a few trillion', () => {
		const cost = cubeCost(ctx('hat', 'bright'), [requireLines('cooldown', 2)]);
		expect(cost.expectedCubes).toBeGreaterThan(250);
		expect(cost.expectedCubes).toBeLessThan(400);
		expect(cost.expectedMesos!).toBeGreaterThan(5e9);
		expect(cost.expectedMesos!).toBeLessThan(9e9);
	});

	it('2× the −2s cooldown line (4 seconds) is ~6× harder than 2 cooldown lines', () => {
		const any = cubeCost(ctx('hat', 'bright'), [requireLines('cooldown', 2)]);
		const both2s = cubeCost(ctx('hat', 'bright'), [{ kind: 'cooldown', lines: 2, minValue: 2 }]);
		expect(both2s.expectedCubes / any.expectedCubes).toBeGreaterThan(5);
		expect(both2s.expectedCubes / any.expectedCubes).toBeLessThan(8);
	});

	it('3× %ATT on a weapon: cheap if you accept 10% lines, ~19T if you demand 13%', () => {
		const anyValue = cubeCost(ctx('weapon', 'bright'), [requireLines('att_pct', 3)]);
		const allPrime = cubeCost(ctx('weapon', 'bright'), [
			{ kind: 'att_pct', lines: 3, minValue: 13 }
		]);
		expect(anyValue.expectedCubes).toBeGreaterThan(4000);
		expect(anyValue.expectedCubes).toBeLessThan(5000);
		expect(allPrime.expectedCubes / anyValue.expectedCubes).toBeGreaterThan(100);
		expect(allPrime.expectedMesos!).toBeGreaterThan(1e13);
	});

	it('3 lines of boss/IED on a weapon is ~200 cubes — the reachable endgame target', () => {
		const cost = cubeCost(ctx('weapon', 'bright'), [requireLines(['boss', 'ied'], 3)]);
		expect(cost.expectedCubes).toBeGreaterThan(150);
		expect(cost.expectedCubes).toBeLessThan(220);
		expect(cost.expectedMesos!).toBeLessThan(5e9);
	});

	it('the same target is much harder on a secondary and impossible-for-boss on an emblem', () => {
		const weapon = cubeCost(ctx('weapon', 'bright'), [requireLines(['boss', 'ied'], 3)]);
		const secondary = cubeCost(ctx('secondary', 'bright'), [requireLines(['boss', 'ied'], 3)]);
		const emblem = cubeCost(ctx('emblem', 'bright'), [requireLines(['boss', 'ied'], 3)]);
		expect(secondary.expectedCubes).toBeGreaterThan(weapon.expectedCubes);
		// The emblem pool has IED but no boss, so "3 lines of boss or IED" means 3 IED.
		expect(emblem.expectedCubes).toBeGreaterThan(1000);
	});

	it('3-line drop accessories are a multi-trillion meso project', () => {
		const cost = cubeCost(ctx('accessory', 'bright'), [requireLines('drop', 3)]);
		expect(cost.expectedCubes).toBeGreaterThan(250_000);
		expect(cost.expectedMesos!).toBeGreaterThan(5e12);
	});
});

/* -------------------------------------------------------------------------- */

describe('cost helpers', () => {
	it('expected / median / p95 cubes are consistent', () => {
		const cost = cubeCost(ctx('weapon', 'bright'), [requireLines('boss', 2)]);
		expect(cost.expectedCubes).toBeCloseTo(1 / cost.probability, 6);
		expect(cost.medianCubes).toBeLessThan(cost.expectedCubes);
		expect(cost.p75Cubes).toBeGreaterThan(cost.medianCubes);
		expect(cost.p95Cubes).toBeGreaterThan(cost.p75Cubes);
		expect(cost.expectedMesos).toBeCloseTo(cost.expectedCubes * 22_000_000, 0);
	});

	it('in-game cubes have no meso price, and price null never becomes 0', () => {
		expect(HEROIC_CUBE_MESO_PRICE.solid).toBeNull();
		const cost = cubeCost(ctx('weapon', 'solid'), [requireLines('boss', 1)]);
		expect(cost.expectedMesos).toBeNull();
		expect(cost.expectedCubes).toBeGreaterThan(1);
	});

	it('reveal cost is a one-off and is excluded by default', () => {
		expect(revealPotentialCost(200)).toBe(800_000);
		expect(revealPotentialCost(20)).toBe(0);
		const plain = cubeCost(ctx('weapon', 'bright'), [requireLines('boss', 1)]);
		const withReveal = cubeCost(ctx('weapon', 'bright'), [requireLines('boss', 1)], {
			includeRevealCost: true
		});
		expect(withReveal.expectedMesos!).toBeGreaterThan(plain.expectedMesos!);
	});
});

/* -------------------------------------------------------------------------- */

describe('slot mapping', () => {
	it('maps every tracker slot that can hold potential', () => {
		expect(poolGroupForSlot('gloves')).toBe('gloves');
		expect(poolGroupForSlot('hat')).toBe('hat');
		expect(poolGroupForSlot('overall')).toBe('topOverall');
		expect(poolGroupForSlot('belt')).toBe('capeBeltShoulder');
		expect(poolGroupForSlot('ring3')).toBe('accessory');
		expect(poolGroupForSlot('earrings')).toBe('accessory');
		expect(poolGroupForSlot('heart')).toBe('heartBadge');
		expect(poolGroupForSlot('badge')).toBe('heartBadge');
	});

	it('returns null for slots that never receive potential', () => {
		for (const slot of ['pocket', 'medal', 'android', 'totem1', 'nonsense']) {
			expect(poolGroupForSlot(slot), slot).toBeNull();
		}
	});

	it('Demon Aegis and Soul Rings use their own secondary pool', () => {
		expect(secondaryPoolGroup(false)).toBe('secondary');
		expect(secondaryPoolGroup(true)).toBe('shieldSoulRing');
	});
});

/* -------------------------------------------------------------------------- */
/* Stat requirements — the trap that made cubeCost 44x too cheap               */
/* -------------------------------------------------------------------------- */

describe('stat requirements', () => {
	const accessory: RollContext = {
		group: 'accessory',
		itemLevel: 150,
		grade: 'legendary',
		cube: 'bright'
	};

	// The bug this guard exists to prevent: `{kind:'stat_pct', lines:3, totalValue:33}`
	// is satisfied by STR +12% / DEX +12% / LUK +9%, which is worth nothing to a real
	// character, and prices a 66 B target at 1.5 B.
	it('rejects a multi-line stat requirement that does not name a stat', () => {
		expect(() =>
			targetProbability(accessory, [{ kind: 'stat_pct', lines: 3, totalValue: 33 }])
		).toThrow(/does not name a `stat`/);
		expect(() => targetProbability(accessory, [requireLines('stat_pct', 3)])).toThrow(
			/does not name a `stat`/
		);
		expect(() => validateTarget([{ kind: 'stat_flat', lines: 2 }])).toThrow(/Ambiguous stat/);
	});

	it('allows a single stat line, and any-stat when opted into explicitly', () => {
		expect(() => targetProbability(accessory, [requireLines('stat_pct', 1)])).not.toThrow();
		expect(() =>
			targetProbability(accessory, [{ kind: 'stat_pct', lines: 3, totalValue: 33, anyStat: true }])
		).not.toThrow();
		// Xenon really does want any-stat, and it really is much cheaper.
		const anyStat = targetProbability(accessory, [
			{ kind: 'stat_pct', lines: 3, totalValue: 33, anyStat: true }
		]);
		const oneStat = targetProbability(accessory, [mainStatPercent('luk', 33)]);
		expect(anyStat / oneStat).toBeGreaterThan(20);
	});

	it('never rejects a requirement over kinds that carry no stat', () => {
		expect(() => targetProbability(accessory, [{ kind: 'drop', lines: 2 }])).not.toThrow();
		expect(() =>
			targetProbability({ ...accessory, group: 'weapon', itemLevel: 200 }, [attackPercent(39)])
		).not.toThrow();
	});

	// `stat` filters stat-BEARING lines only, so All Stat still counts toward the total.
	// That is what "33%+ Stat" means in every reference calculator.
	it('All Stat % counts toward a main-stat total; other stats do not', () => {
		const dist = lineDistribution({ ...accessory, itemLevel: 150 }, 0);
		const luk = dist.find((o) => o.kind === 'stat_pct' && o.stat === 'luk')!;
		const all = dist.find((o) => o.kind === 'all_stat_pct')!;
		expect(luk.value).toBe(12);
		expect(all.value).toBe(9); // one rank below

		// 12 + 12 + 9 = 33 reaches the target; 12 + 12 alone (24) does not.
		const withAllStat = targetProbability(accessory, [mainStatPercent('luk', 33)]);
		const lukOnly = targetProbability(accessory, [
			{ kind: 'stat_pct', stat: 'luk', totalValue: 33 }
		]);
		expect(withAllStat).toBeGreaterThan(lukOnly);

		// DEX lines must not count toward a LUK total.
		const dexToo = targetProbability(accessory, [
			{ kind: ['stat_pct', 'all_stat_pct'], stat: 'dex', totalValue: 33 }
		]);
		expect(dexToo).toBeCloseTo(withAllStat, 12); // symmetric pools, same answer
		const mixed = targetProbability(accessory, [
			{ kind: 'stat_pct', lines: 3, totalValue: 33, anyStat: true }
		]);
		expect(mixed).toBeGreaterThan(withAllStat * 20);
	});
});

/* -------------------------------------------------------------------------- */
/* Full reconciliation against the reference calculator                        */
/* -------------------------------------------------------------------------- */

describe("reconciliation against MathBro's cubing calculator", () => {
	// Reference values produced by running the calculator's own getProbability.js +
	// statistics.js over its own cubeRates.js (KMS data, scraped from Nexon KR).
	// https://brendonmay.github.io/cubingCalculator/
	//
	// These run with `poolVariant: 'kms'` so that BOTH sides use the same pool
	// transcription. Every case then agrees to 5 significant figures, which is what
	// pins the engine — the prime/non-prime mixing, the cap re-normalisation, the
	// value tables and the target semantics — as correct. The remaining GMS-vs-KMS
	// gap is one disputed data line and nothing else (next describe block).
	// `p` is the reference's own probability output (7 s.f.); `cubes` is what its UI
	// prints (its mean, rounded). We compare on `p` because the UI's integer rounding
	// is coarser than the agreement we actually achieve.
	const cases: ReadonlyArray<
		[string, PotentialPoolGroup, number, CubeId, PotentialTarget, number, number]
	> = [
		[
			'accessory Lv150, 33%+ stat',
			'accessory',
			150,
			'bright',
			[mainStatPercent('luk', 33)],
			3.37496e-4,
			2963
		],
		[
			'accessory Lv150, 36%+ stat',
			'accessory',
			150,
			'bright',
			[mainStatPercent('luk', 36)],
			1.078878e-5,
			92689
		],
		[
			'accessory Lv150, 30%+ stat',
			'accessory',
			150,
			'bright',
			[mainStatPercent('luk', 30)],
			2.269247e-3,
			441
		],
		[
			'accessory Lv150, 33%+ stat, Glowing',
			'accessory',
			150,
			'glowing',
			[mainStatPercent('luk', 33)],
			1.455176e-4,
			6872
		],
		[
			'accessory Lv200, 36%+ stat',
			'accessory',
			200,
			'bright',
			[mainStatPercent('luk', 36)],
			3.37496e-4,
			2963
		],
		[
			'accessory Lv200, 39%+ stat',
			'accessory',
			200,
			'bright',
			[mainStatPercent('luk', 39)],
			1.078878e-5,
			92689
		],
		[
			'weapon Lv150, 33%+ stat',
			'weapon',
			150,
			'bright',
			[mainStatPercent('luk', 33)],
			2.84732e-4,
			3512
		],
		[
			'weapon Lv200, 39%+ stat',
			'weapon',
			200,
			'bright',
			[mainStatPercent('luk', 39)],
			9.285811e-6,
			107691
		],
		['weapon Lv200, 39%+ ATT', 'weapon', 200, 'bright', [attackPercent(39)], 1.160714e-6, 861538],
		[
			'weapon Lv200, 3 lines of boss',
			'weapon',
			200,
			'bright',
			[requireLines('boss', 3)],
			9.163427e-4,
			1091
		],
		[
			'hat Lv200, 39%+ stat',
			'hat',
			200,
			'bright',
			[mainStatPercent('luk', 39)],
			9.285811e-6,
			107691
		],
		['hat Lv150, 33%+ stat', 'hat', 150, 'bright', [mainStatPercent('luk', 33)], 2.406749e-4, 4155],
		[
			'gloves Lv200, 3 lines of crit damage',
			'gloves',
			200,
			'bright',
			[requireLines('crit_dmg', 3)],
			1.0e-5,
			100000
		]
	];

	for (const [name, group, itemLevel, cube, target, referenceP, referenceCubes] of cases) {
		it(`matches the reference on the same pool data: ${name}`, () => {
			const cost = cubeCost(
				{ group, itemLevel, grade: 'legendary', cube, characterLevel: 285, poolVariant: 'kms' },
				target
			);
			// Agreement to 5 significant figures on the probability itself.
			expect(cost.probability / referenceP).toBeCloseTo(1, 4);
			// And to within the reference UI's own integer rounding on the cube count.
			expect(Math.abs(cost.expectedCubes - referenceCubes) / referenceCubes).toBeLessThan(0.003);
		});
	}

	it('percentiles follow the same geometric shape as the reference', () => {
		const cost = cubeCost(
			{
				group: 'accessory',
				itemLevel: 150,
				grade: 'legendary',
				cube: 'bright',
				poolVariant: 'kms'
			},
			[mainStatPercent('luk', 33)]
		);
		// Reference: median 2,053 · 75% 4,107 · 85% 5,620 · 95% 8,875.
		// We ceil where the reference rounds ("how many cubes to be 50% sure" is a
		// whole number of cubes), so ±1 is expected and is the only difference.
		for (const [ours, reference] of [
			[cost.medianCubes, 2053],
			[cost.p75Cubes, 4107],
			[cost.p85Cubes, 5620],
			[cost.p95Cubes, 8875]
		]) {
			expect(Math.abs(ours - reference), `${ours} vs ${reference}`).toBeLessThanOrEqual(1);
		}
	});

	it('the reference meso figure includes its per-cube reveal fee', () => {
		// 2,963 × (22,000,000 + 20 × 150²) = 66,519,350,000 — the reference's number.
		const cost = cubeCost(
			{
				group: 'accessory',
				itemLevel: 150,
				grade: 'legendary',
				cube: 'bright',
				poolVariant: 'kms'
			},
			[mainStatPercent('luk', 33)],
			{ includeRevealCost: true }
		);
		expect(Math.round(cost.expectedCubes) * (22_000_000 + revealPotentialCost(150))).toBe(
			66_519_350_000
		);
		expect(cost.expectedMesos! / 66_519_350_000).toBeCloseTo(1, 3);
	});
});

describe('the GMS/KMS %DEF conflict, isolated', () => {
	const target = [mainStatPercent('luk', 33)];
	const at = (group: PotentialPoolGroup, poolVariant: 'gms' | 'kms'): RollContext => ({
		group,
		itemLevel: 150,
		grade: 'legendary',
		cube: 'bright',
		poolVariant
	});

	it('costs GMS ~1.3x more than KMS on armour and accessories', () => {
		for (const group of ['accessory', 'hat', 'gloves'] as const) {
			const ratio =
				cubeCost(at(group, 'gms'), target).expectedCubes /
				cubeCost(at(group, 'kms'), target).expectedCubes;
			expect(ratio, group).toBeGreaterThan(1.28);
			expect(ratio, group).toBeLessThan(1.36);
		}
		expect(UNVERIFIED_HIGH_RANK_DEF_PERCENT_LINE.approxThreeLineCostFactor).toBeCloseTo(1.34, 2);
	});

	it('changes nothing at all on weapon-like slots', () => {
		for (const group of ['weapon', 'secondary', 'emblem', 'shieldSoulRing'] as const) {
			expect(cubeCost(at(group, 'gms'), target).probability, group).toBe(
				cubeCost(at(group, 'kms'), target).probability
			);
		}
	});

	it('changes nothing at Rare or Epic, where the sources agree', () => {
		for (const group of UNVERIFIED_HIGH_RANK_DEF_PERCENT_LINE.groups) {
			for (const rank of ['belowRare', 'rare', 'epic'] as const) {
				expect(linePool(group, rank, 'kms').length, `${group}/${rank}`).toBe(
					linePool(group, rank, 'gms').length
				);
			}
		}
	});

	it('the variant removes exactly one line, and only where documented', () => {
		for (const group of UNVERIFIED_HIGH_RANK_DEF_PERCENT_LINE.groups) {
			for (const rank of UNVERIFIED_HIGH_RANK_DEF_PERCENT_LINE.ranks) {
				expect(linePool(group, rank, 'gms').length - linePool(group, rank, 'kms').length).toBe(1);
			}
		}
	});
});
