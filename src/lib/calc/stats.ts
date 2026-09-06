// Stat totals and the "stat multiplier" term of the damage formula.
//
// Sources: docs/research/formulas.md §1.2 (Stat multiplier / Final Total Stats /
// Pure Stats) and §3.1 (order of operations that must be preserved).

import { getClass } from '../data/classes';
import type { CalcInput, StatKey, StatTriple } from './types';

/**
 * Floating-point guard for the game's flooring.
 *
 * `floor(2077 * 1.29)` is 2679 in exact arithmetic but IEEE-754 gives
 * 2679.9999999999995 for some inputs, which floors one short. Rounding the
 * product to 10 decimal places first removes the representation error without
 * touching any value the game could legitimately produce.
 */
export function floorGuarded(value: number): number {
	return Math.floor(Number(value.toFixed(10)));
}

/**
 * `total = floor(base * (1 + percent/100)) + flat`
 *
 * Source: docs/research/formulas.md §1.2 —
 * `Stat = floor(BaseValue * (1 + %Value)) + (%-not-applied "final" stat)`.
 * The same shape applies to STR/DEX/INT/LUK/HP/MP/DEF/ATT/MATT, each computed
 * independently (§1.2, §1.4).
 */
export function applyTriple(triple: StatTriple): number {
	return floorGuarded(triple.base * (1 + triple.percent / 100)) + triple.flat;
}

/**
 * Demon Avenger Pure HP, assuming all AP is in HP (15 pure HP per AP).
 *
 * Source: docs/research/formulas.md §1.2 "Demon Avenger Pure HP":
 *   1st job: 220 + 90*Level · 2nd: 395 + 90*Level ·
 *   3rd: 470 + 90*Level · 4th job and beyond: 545 + 90*Level
 */
export function demonAvengerPureHp(level: number, jobAdvancement: 1 | 2 | 3 | 4 = 4): number {
	const bases = { 1: 220, 2: 395, 3: 470, 4: 545 } as const;
	return bases[jobAdvancement] + 90 * level;
}

/**
 * Demon Avenger stat value.
 *
 * Source: docs/research/formulas.md §1.2 —
 *   `statValue = floor(PureHP / 3.5) + 0.8 * floor((TotalHP - PureHP) / 3.5) + STR`
 * The two groups are floored independently before summing, so 1-3 HP may not
 * move the range at all. `TotalHP` ignores the 500,000 displayed HP cap.
 */
export function demonAvengerStatValue(totalHp: number, pureHp: number, str: number): number {
	const bonusHp = Math.max(0, totalHp - pureHp);
	return floorGuarded(pureHp / 3.5) + 0.8 * floorGuarded(bonusHp / 3.5) + str;
}

/** Total for one stat key of a `CalcInput`. */
export function statTotal(input: CalcInput, key: StatKey): number {
	return applyTriple(input.stats[key]);
}

/** Every stat total, keyed. */
export function statTotals(input: CalcInput): Record<StatKey, number> {
	return {
		str: statTotal(input, 'str'),
		dex: statTotal(input, 'dex'),
		int: statTotal(input, 'int'),
		luk: statTotal(input, 'luk'),
		hp: statTotal(input, 'hp')
	};
}

/**
 * The stat multiplier term.
 *
 * Source: docs/research/formulas.md §1.2.
 *   * all jobs except Xenon and Demon Avenger:
 *     `4*(MainStat1 + MainStat2 + MainStat3) + SecondaryStat1 + SecondaryStat2`
 *     (inapplicable stats are 0) — this covers Shadower / Dual Blade / Cadena,
 *     whose secondary is DEX + STR.
 *   * Xenon: `4*(STR + DEX + LUK)`, no secondary term.
 *   * Demon Avenger: the dedicated HP formula above.
 *
 * §3.1 stresses the floors must be kept: the expansion is
 * `4*floor(a*b) + 4*c + floor(d*e) + f`, which is exactly
 * `4*applyTriple(primary) + applyTriple(secondary)`.
 */
export function statMultiplier(input: CalcInput): number {
	const cls = getClass(input.classId);
	const totals = statTotals(input);

	if (cls.flags?.demonAvenger) {
		// §1.2: HP is primary, STR secondary, via the special stat value.
		const pureHp = demonAvengerPureHp(input.level);
		return demonAvengerStatValue(totals.hp, pureHp, totals.str);
	}

	// Xenon falls out of the general form: primary = [str, dex, luk], secondary = [].
	let sum = 0;
	for (const key of cls.primary) sum += 4 * totals[key];
	for (const key of cls.secondary) sum += totals[key];
	return sum;
}

/**
 * The attack term, `floor(BaseATT * (1 + ATT%)) + FinalATT`.
 * Magicians substitute Magic ATT and %Magic ATT.
 * Source: docs/research/formulas.md §1.4.
 */
export function attackTerm(input: CalcInput): number {
	const cls = getClass(input.classId);
	return applyTriple(cls.usesMagicAttack ? input.magicAttack : input.attack);
}

/**
 * Expected critical multiplier for a crit rate `p` (whole percent).
 *
 * Source: docs/research/formulas.md §1.7 —
 *   crit multiplier averages `1.35 + cd` (the per-hit roll is uniform on
 *   `[1.20 + cd, 1.50 + cd]`), and for a mixed rate
 *   `expectedCritFactor = p*(1.35 + cd) + (1 - p)*1`.
 * Crit rate is capped at 100%.
 */
export function criticalFactor(criticalRatePercent: number, criticalDamagePercent: number): number {
	const p = Math.min(100, Math.max(0, criticalRatePercent)) / 100;
	const critMultiplier = 1.35 + criticalDamagePercent / 100;
	return p * critMultiplier + (1 - p);
}
