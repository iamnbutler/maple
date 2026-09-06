// Boss damage index and the in-game "Damage Range" display.
//
// Sources: docs/research/formulas.md §1.1 (master expression), §1.6-§1.13,
// §3.1 (the relative-damage-scalar method), and the design doc §4.

import { getClass } from '../data/classes';
import { defenseMultiplier } from './ied';
import { arcaneMultiplier, levelMultiplier, sacredMultiplier } from './force';
import { attackTerm, criticalFactor, floorGuarded, statMultiplier } from './stats';
import type { CalcInput, Target } from './types';

export interface DamageOptions {
	/**
	 * Include the factors that cancel in a ratio comparison — `0.01`, the weapon
	 * constant, the average mastery roll, and the elemental multiplier.
	 *
	 * With `absolute: true` this reproduces the StrategyWiki per-line output
	 * (formulas.md §1.1) for ONE line of a `skill% = 100` attack against a
	 * Strong-elemental-resistance boss:
	 *
	 *   0.01 * weaponConstant * statMultiplier * floor(att*(1+att%))
	 *   * (1 + dmg% + bd%) * (1 + fd%)                 <- §1.6
	 *   * critFactor                                    <- §1.7, averaged
	 *   * 0.5 * (1 + mastery%)                          <- §1.9, averaged
	 *   * (1 - pdr * (1 - ied))                         <- §1.8
	 *   * 0.5                                           <- §1.10, Strong resist
	 *   * levelMultiplier * forceMultiplier             <- §1.11, §1.12
	 *
	 * It is an AVERAGE (mastery and crit damage are both uniform rolls), not a
	 * single observed hit, and it omits `skill%`, Ignore Elemental Resistance,
	 * and the game's per-step rounding, so treat it as an estimate rather than
	 * a number to reconcile digit-for-digit.
	 */
	absolute?: boolean;
	/**
	 * `boss` (default) adds Boss Damage % to Damage %; `normal` adds
	 * Normal Monster Damage % instead. formulas.md §1.6: the two are additive
	 * with Damage %, never multiplicative, and never both at once.
	 */
	enemyType?: 'boss' | 'normal';
	/**
	 * Elemental multiplier used only when `absolute` is set. Default 0.5 —
	 * "almost all bosses are Strong-resist, so bossing carries a baseline x0.5"
	 * (formulas.md §1.10).
	 */
	elementalMultiplier?: number;
}

/** The individual factors of a damage index, for display and debugging. */
export interface DamageBreakdown {
	statMultiplier: number;
	attack: number;
	damageMultiplier: number;
	finalDamageMultiplier: number;
	criticalFactor: number;
	defenseMultiplier: number;
	levelMultiplier: number;
	forceMultiplier: number;
	/** Present only when `absolute` was requested. */
	weaponConstant?: number;
	masteryMultiplier?: number;
	elementalMultiplier?: number;
	value: number;
}

/**
 * The Arcane/Sacred map multiplier for a target.
 *
 * formulas.md §1.12 / §1.8: a boss carries at most one force requirement —
 * Arcane River bosses use Arcane Force, Grandis bosses use Sacred Force.
 * Sacred takes precedence when a target somehow declares both.
 */
export function forceMultiplier(input: CalcInput, target: Target): number {
	if (target.sacredReq) return sacredMultiplier(target.sacredReq, input.sacredForce);
	if (target.arcaneReq) return arcaneMultiplier(target.arcaneReq, input.arcaneForce);
	return 1;
}

/** `damageIndex` with every factor exposed. */
export function damageBreakdown(
	input: CalcInput,
	target: Target,
	opts: DamageOptions = {}
): DamageBreakdown {
	const cls = getClass(input.classId);

	const stat = statMultiplier(input);
	const att = attackTerm(input);

	// §1.6 — Damage % and Boss/Normal Damage % are additive with each other.
	const enemyBonus =
		opts.enemyType === 'normal' ? (input.normalEnemyDamagePercent ?? 0) : input.bossDamagePercent;
	const damageMultiplier = 1 + (input.damagePercent + enemyBonus) / 100;

	// §1.6 — Final Damage is a separate multiplicative factor.
	const finalDamageMultiplier = 1 + input.finalDamagePercent / 100;

	// §1.7
	const crit = criticalFactor(input.criticalRatePercent, input.criticalDamagePercent);

	// §1.8 — the stat window's composed IED total, as a fraction.
	const def = defenseMultiplier(target.pdr, input.ignoreDefensePercent / 100);

	// §1.11, §1.12
	const level = levelMultiplier(input.level, target.level);
	const force = forceMultiplier(input, target);

	let value = stat * att * damageMultiplier * finalDamageMultiplier * crit * def * level * force;

	const breakdown: DamageBreakdown = {
		statMultiplier: stat,
		attack: att,
		damageMultiplier,
		finalDamageMultiplier,
		criticalFactor: crit,
		defenseMultiplier: def,
		levelMultiplier: level,
		forceMultiplier: force,
		value
	};

	if (opts.absolute) {
		// §1.1 / §1.9 / §1.10 — the factors that cancel in a ratio comparison.
		const weaponConstant = input.weaponConstantOverride ?? cls.weaponConstant;
		const masteryPercent = input.masteryPercent ?? cls.masteryPercent;
		const masteryMultiplier = 0.5 * (1 + masteryPercent / 100);
		const elemental = opts.elementalMultiplier ?? 0.5;
		value = value * 0.01 * weaponConstant * masteryMultiplier * elemental;
		breakdown.weaponConstant = weaponConstant;
		breakdown.masteryMultiplier = masteryMultiplier;
		breakdown.elementalMultiplier = elemental;
		breakdown.value = value;
	}

	return breakdown;
}

/**
 * The relative damage scalar `D` from docs/research/formulas.md §3.1.
 *
 * By default every factor that is identical between two candidate states is
 * omitted (`0.01`, weapon constant, mastery, elemental, skill%), which is what
 * makes `(D' - D) / D` an exact "absolute % damage gain". Pass
 * `{ absolute: true }` to include them — see `DamageOptions.absolute`.
 */
export function damageIndex(input: CalcInput, target: Target, opts: DamageOptions = {}): number {
	return damageBreakdown(input, target, opts).value;
}

/** The four numbers behind the stat window's Damage Range display. */
export interface DisplayedRange {
	/** `Multiplier * StatValue * TotalJobATT / 100`, rounded. */
	upperActual: number;
	/** `UpperActual * Mastery% / 100`, rounded. */
	lowerActual: number;
	/** The upper number shown in the stat window. */
	upper: number;
	/** The lower number shown in the stat window. */
	lower: number;
}

/** Round half away from zero, with the same float-representation guard as `floorGuarded`. */
function roundHalfUp(value: number): number {
	return Math.sign(value) * Math.round(Math.abs(Number(value.toFixed(10))));
}

/**
 * Reproduce the in-game "Damage Range" display.
 *
 * Source: docs/research/formulas.md §1.13 (StrategyWiki §Damage Range), verbatim:
 *
 *   UpperActual = Multiplier * StatValue * TotalJobATT / 100      , rounded off
 *   LowerActual = UpperActual * Mastery% / 100                    , rounded off
 *   UpperShown  = floor( UpperActual * (1 + Damage%/100) * (1 + Final%/100) )
 *   LowerShown  = floor( 1 + LowerActual * (1 + Damage%/100) * (1 + Final%/100) )
 *
 * `Multiplier` is the weapon multiplier and `TotalJobATT` is total Magic ATT for
 * magician weapons, total Weapon ATT otherwise.
 *
 * NOTE (§1.13): the SHOWN range deliberately excludes Boss Damage % and Normal
 * Monster Damage %; the game applies those only when damage is actually
 * computed, off `UpperActual`/`LowerActual`.
 */
export function displayedRange(input: CalcInput): DisplayedRange {
	const cls = getClass(input.classId);
	const weaponConstant = input.weaponConstantOverride ?? cls.weaponConstant;
	const masteryPercent = input.masteryPercent ?? cls.masteryPercent;

	const upperActual = roundHalfUp(
		(weaponConstant * statMultiplier(input) * attackTerm(input)) / 100
	);
	const lowerActual = roundHalfUp((upperActual * masteryPercent) / 100);

	const shownScale = (1 + input.damagePercent / 100) * (1 + input.finalDamagePercent / 100);

	return {
		upperActual,
		lowerActual,
		upper: floorGuarded(upperActual * shownScale),
		lower: floorGuarded(1 + lowerActual * shownScale)
	};
}
