// `Character` (the persisted document) -> `CalcInput` (what the math needs).
//
// Design §2: the STAT WINDOW is the source of truth for totals. Class passives
// and buffs contribute FD/IED/BD/CD that cannot be reconstructed from gear, so
// this adapter reads the window and never sums equipment. `gear.ts` does the
// bottom-up pass separately, purely as a cross-check and as a source of deltas.
//
// Design §3's "omit zeros" rule means every percent field on a `StatWindow` is
// optional and absent means "not captured". `CalcInput` has no notion of
// "absent", so this boundary defaults them to 0 AND emits a warning for every
// field the damage formula actually consumes — a missing Boss Damage % is a
// screenshot that was not fully read, not a character with 0% boss damage.

import type { CalcInput, StatKey, StatTriple as CalcTriple } from '$lib/calc/types';
import { tryGetClass } from '$lib/data/classes';
import type { Character } from '$lib/schema';
import type { StatTriple as SchemaTriple, StatWindow } from '$lib/schema';

import { missingStatWindow, unknownClass } from './errors';

export interface AdapterResult {
	input: CalcInput;
	warnings: string[];
}

function triple(source: SchemaTriple | undefined): CalcTriple {
	if (!source) return { base: 0, percent: 0, flat: 0 };
	return { base: source.base, percent: source.percent ?? 0, flat: source.flat ?? 0 };
}

/** Fields the damage formula reads directly; absent ones are worth a warning. */
const REQUIRED_PERCENTS = [
	['damagePercent', 'Damage %'],
	['bossDamagePercent', 'Boss Damage %'],
	['finalDamagePercent', 'Final Damage %'],
	['ignoreDefensePercent', 'Ignore Enemy DEF %'],
	['criticalRatePercent', 'Critical Rate %'],
	['criticalDamagePercent', 'Critical Damage %']
] as const satisfies readonly (readonly [keyof StatWindow, string])[];

/**
 * Build the `CalcInput` for a character.
 *
 * @throws {AnalysisError} `missing-stat-window` when there is no stat window,
 *   `unknown-class` when `classId` is not in the class table.
 */
export function toCalcInput(character: Character): AdapterResult {
	const cls = tryGetClass(character.classId);
	if (!cls) throw unknownClass(character.classId);

	const window = character.statWindow;
	if (!window) throw missingStatWindow(character.id);

	const warnings: string[] = [];

	for (const [key, label] of REQUIRED_PERCENTS) {
		if (window[key] === undefined) {
			warnings.push(`Stat window is missing ${label}; treating it as 0% for the damage formula.`);
		}
	}

	const stats: Record<StatKey, CalcTriple> = {
		str: triple(window.str),
		dex: triple(window.dex),
		int: triple(window.int),
		luk: triple(window.luk),
		hp: triple(window.hp)
	};

	if (cls.flags?.demonAvenger && !window.hp) {
		warnings.push(
			`${cls.name} scales off Max HP, but the stat window has no hp triple; the stat ` +
				'multiplier will be far too low.'
		);
	}

	if (cls.usesMagicAttack && !window.magicAttack) {
		warnings.push(
			`${cls.name} damage uses Magic ATT, but the stat window has no magicAttack triple; ` +
				'the attack term will be 0.'
		);
	}

	// Percent-not-captured on the stat a class does not use is not interesting, but a
	// zero BASE on the class's own primary stat always is.
	for (const key of cls.primary) {
		if (stats[key].base === 0) {
			warnings.push(
				`Stat window has no base ${key.toUpperCase()}, which is ${cls.name}'s primary stat.`
			);
		}
	}

	if (window.attack.base === 0 && !cls.usesMagicAttack) {
		warnings.push('Stat window has no base Attack Power.');
	}

	const input: CalcInput = {
		level: character.level,
		classId: character.classId,
		stats,
		attack: triple(window.attack),
		magicAttack: triple(window.magicAttack),
		damagePercent: window.damagePercent ?? 0,
		bossDamagePercent: window.bossDamagePercent ?? 0,
		finalDamagePercent: window.finalDamagePercent ?? 0,
		ignoreDefensePercent: window.ignoreDefensePercent ?? 0,
		criticalRatePercent: window.criticalRatePercent ?? 0,
		criticalDamagePercent: window.criticalDamagePercent ?? 0
	};

	if (window.normalEnemyDamagePercent !== undefined) {
		input.normalEnemyDamagePercent = window.normalEnemyDamagePercent;
	}
	if (window.arcaneForce !== undefined) input.arcaneForce = window.arcaneForce;
	if (window.sacredForce !== undefined) input.sacredForce = window.sacredForce;

	return { input, warnings };
}
