// Candidate upgrades as deltas, and the "absolute % damage gain" they produce.
//
// Sources: docs/research/formulas.md §3.1 (the correct general method),
// §3.3 (per-upgrade multipliers), §3.4 (evaluate a SET of upgrades jointly,
// never by summing individual deltas), §1.6 (FD composes multiplicatively),
// §1.8 (IED composes multiplicatively).

import { getClass } from '../data/classes';
import { damageIndex, type DamageOptions } from './damage';
import * as ied from './ied';
import type { CalcInput, Delta, GainResult, StatKey, StatTriple, Target } from './types';

function cloneTriple(t: StatTriple): StatTriple {
	return { base: t.base, percent: t.percent, flat: t.flat };
}

function cloneInput(input: CalcInput): CalcInput {
	return {
		...input,
		stats: {
			str: cloneTriple(input.stats.str),
			dex: cloneTriple(input.stats.dex),
			int: cloneTriple(input.stats.int),
			luk: cloneTriple(input.stats.luk),
			hp: cloneTriple(input.stats.hp)
		},
		attack: cloneTriple(input.attack),
		magicAttack: cloneTriple(input.magicAttack)
	};
}

/**
 * Apply a `Delta` to a `CalcInput`, returning a new object (the input is never
 * mutated).
 *
 * Routing rules:
 *   * `mainFlat`/`mainPct` land in `base`/`percent` of EVERY stat in the
 *     class's `primary` list, and `mainFinal` in `flat`. For Xenon (primary
 *     STR + DEX + LUK, formulas.md §1.2) that is the correct behaviour: Xenon's
 *     main-stat sources are all-stat sources. For every other class `primary`
 *     has one entry, so it is the obvious behaviour.
 *   * `subFlat`/`subFinal`/`subPct` do the same for `secondary`, which is
 *     DEX + STR for Shadower / Dual Blade / Cadena (§1.2).
 *   * `allStatPct` adds percentage points to STR/DEX/INT/LUK. It does NOT touch
 *     Max HP, so it is a no-op on Demon Avenger's primary stat by design.
 *   * `att`/`attPct` go to Magic ATT for classes with `usesMagicAttack` (§1.4).
 *     `att` is BASE attack, i.e. before %ATT (§3.3 "+1 ATT (base)").
 *   * `fd` composes: `newFD = (1 + oldFD) * (1 + fd) - 1` (§1.6).
 *   * `iedAdd` / `iedRemove` compose and decompose multiplicatively via
 *     `ied.ts`; IED is NEVER added arithmetically (§1.8, §3.1).
 */
export function applyDelta(input: CalcInput, delta: Delta): CalcInput {
	const cls = getClass(input.classId);
	const next = cloneInput(input);

	const bump = (keys: readonly StatKey[], flat = 0, final = 0, pct = 0) => {
		for (const key of keys) {
			const triple = next.stats[key];
			triple.base += flat;
			triple.flat += final;
			triple.percent += pct;
		}
	};

	bump(cls.primary, delta.mainFlat ?? 0, delta.mainFinal ?? 0, delta.mainPct ?? 0);
	bump(cls.secondary, delta.subFlat ?? 0, delta.subFinal ?? 0, delta.subPct ?? 0);

	if (delta.allStatPct) {
		for (const key of ['str', 'dex', 'int', 'luk'] as const) {
			next.stats[key].percent += delta.allStatPct;
		}
	}

	if (delta.att || delta.attPct) {
		const target = cls.usesMagicAttack ? next.magicAttack : next.attack;
		target.base += delta.att ?? 0;
		target.percent += delta.attPct ?? 0;
	}

	if (delta.dmg) next.damagePercent += delta.dmg;
	if (delta.boss) next.bossDamagePercent += delta.boss;

	// §1.6 — Final Damage sources multiply.
	if (delta.fd) {
		const composed = (1 + next.finalDamagePercent / 100) * (1 + delta.fd / 100) - 1;
		next.finalDamagePercent = composed * 100;
	}

	if (delta.critDmg) next.criticalDamagePercent += delta.critDmg;
	if (delta.critRate) {
		// §1.7 — critical rate is capped at 100%.
		next.criticalRatePercent = Math.min(100, next.criticalRatePercent + delta.critRate);
	}

	// §1.8 — IED composes on the complement, in both directions.
	if (delta.iedRemove?.length || delta.iedAdd?.length) {
		let total = next.ignoreDefensePercent / 100;
		for (const source of delta.iedRemove ?? []) total = ied.remove(total, source / 100);
		for (const source of delta.iedAdd ?? []) total = ied.add(total, source / 100);
		next.ignoreDefensePercent = total * 100;
	}

	if (delta.arcane) next.arcaneForce = (next.arcaneForce ?? 0) + delta.arcane;
	if (delta.sacred) next.sacredForce = (next.sacredForce ?? 0) + delta.sacred;

	return next;
}

/** Apply several deltas in order to one input (used by `measureGainBatch`). */
export function applyDeltas(input: CalcInput, deltas: readonly Delta[]): CalcInput {
	return deltas.reduce<CalcInput>((acc, delta) => applyDelta(acc, delta), input);
}

/**
 * `gain = D(after)/D(before) - 1`, reported as a WHOLE percent.
 *
 * Source: docs/research/formulas.md §3.1 — "absolute % damage gain =
 * (D' - D) / D", computed fresh from the current totals every time (§3.4).
 */
export function measureGain(
	input: CalcInput,
	delta: Delta,
	target: Target,
	opts?: DamageOptions
): GainResult {
	return measureGainBatch(input, [delta], target, opts);
}

/**
 * Evaluate a SET of deltas jointly.
 *
 * Source: docs/research/formulas.md §3.4 — "when evaluating a set of
 * simultaneous upgrades, evaluate the set jointly rather than summing
 * individual deltas". Summing is wrong for anything non-linear, IED above all.
 */
export function measureGainBatch(
	input: CalcInput,
	deltas: readonly Delta[],
	target: Target,
	opts?: DamageOptions
): GainResult {
	const before = damageIndex(input, target, opts);
	const after = damageIndex(applyDeltas(input, deltas), target, opts);
	const gainPct = before === 0 ? 0 : (after / before - 1) * 100;
	return { before, after, gainPct };
}
