// Calibration: what we computed vs what the game displayed.
//
// Design §2: Combat Power is computed as a CHECKSUM and never as a ranking
// metric (it omits IED, crit rate, level and force — formulas.md §2.6). The
// damage range is the stronger check, because `displayedRange` reproduces the
// stat window exactly (formulas.md §1.13).

import * as calc from '$lib/calc';
import type { CalcInput } from '$lib/calc/types';
import { getClass } from '$lib/data/classes';
import type { Character, Item } from '$lib/schema';

import type { Checksum, Confidence, Sourced } from './types';

/** Within 0.1% is a match; within 2% is close; anything else is a mismatch. */
export const MATCH_TOLERANCE_PERCENT = 0.1;
export const CLOSE_TOLERANCE_PERCENT = 2;

function checksum(label: string, computed: number, displayed: number | undefined): Checksum {
	if (displayed === undefined || displayed === 0) {
		return { label, computed, status: 'missing' };
	}
	const deltaPercent = ((computed - displayed) / displayed) * 100;
	const magnitude = Math.abs(deltaPercent);
	const status =
		magnitude <= MATCH_TOLERANCE_PERCENT
			? 'match'
			: magnitude <= CLOSE_TOLERANCE_PERCENT
				? 'close'
				: 'mismatch';
	return { label, computed, displayed, deltaPercent, status };
}

/**
 * A checksum whose computed value only BOUNDS the displayed one from above.
 *
 * Anything at or below the bound is consistent and says nothing more; only a
 * displayed value ABOVE the bound is evidence of a problem, and then it is
 * strong evidence — either the number was misread or the model is wrong.
 */
function boundChecksum(
	label: string,
	computed: number,
	displayed: number | undefined,
	note: string
): Checksum {
	if (displayed === undefined || displayed === 0) {
		return { label, computed, status: 'missing', kind: 'upper-bound', note };
	}
	return {
		label,
		computed,
		displayed,
		deltaPercent: ((computed - displayed) / displayed) * 100,
		status: displayed <= computed ? 'within-bound' : 'over-bound',
		kind: 'upper-bound',
		note
	};
}

/**
 * Bow-equivalent base ATT for the CP normalisation (formulas.md §2.2).
 *
 * Matched off the weapon NAME first, because the four documented rows are
 * named weapon lines; item level is only a fallback, and one that cannot tell
 * an Arcane Umbra from a Genesis (both level 200), so it is reported as
 * `estimated`.
 */
export function bowBaseAttFor(item: Item): { value: number; exact: boolean } | undefined {
	const name = item.name.toLowerCase();
	if (name.includes('destiny')) return { value: calc.BOW_BASE_ATT.destiny, exact: true };
	if (name.includes('genesis')) return { value: calc.BOW_BASE_ATT.genesis, exact: true };
	if (name.includes('arcane')) return { value: calc.BOW_BASE_ATT.arcane, exact: true };
	if (name.includes('absolab') || name.includes('abso lab')) {
		return { value: calc.BOW_BASE_ATT.absolab, exact: true };
	}
	if (name.includes('fafnir')) return { value: calc.BOW_BASE_ATT.fafnir, exact: false };
	if (name.includes('sweetwater')) return { value: calc.BOW_BASE_ATT.sweetwater, exact: false };

	const level = item.itemLevel;
	if (level === undefined) return undefined;
	if (level >= 250) return { value: calc.BOW_BASE_ATT.destiny, exact: false };
	if (level >= 200) return { value: calc.BOW_BASE_ATT.genesis, exact: false };
	if (level >= 160) return { value: calc.BOW_BASE_ATT.absolab, exact: false };
	return { value: calc.BOW_BASE_ATT.fafnir, exact: false };
}

/**
 * The weapon's own base ATT and star-force ATT, when the tooltip breakdown was
 * captured well enough to derive them.
 *
 * GMS classic merges scroll+star into `scroll` (design §3), so `star` is often
 * absent; in that case the star ATT is unknown and the normalisation is skipped
 * rather than guessed.
 */
function weaponAtt(
	item: Item,
	usesMagicAttack: boolean
): { base: number; star: number } | undefined {
	const key = usesMagicAttack ? 'matt' : 'att';
	const base = item.base?.[key];
	const star = item.star?.[key];
	if (base === undefined || star === undefined) return undefined;
	return { base, star };
}

/**
 * Combat Power for a character.
 *
 * `approx` (design §4) is reported as `estimated` confidence with a note: the
 * bow normalisation needs the weapon's base and star ATT, and without them the
 * un-normalised value is returned rather than a guess.
 */
export function combatPowerFor(character: Character, input: CalcInput): Sourced<number> {
	const cls = getClass(input.classId);
	const notes: string[] = [];

	const mainKey = cls.primary[0] ?? 'str';
	const subKey = cls.secondary[0];
	const mainTriple = input.stats[mainKey];
	const subTriple = subKey ? input.stats[subKey] : { base: 0, percent: 0, flat: 0 };
	const attTriple = cls.usesMagicAttack ? input.magicAttack : input.attack;

	if (cls.primary.length > 1) {
		notes.push(
			`${cls.name} has ${cls.primary.length} primary stats; CP is computed off ` +
				`${mainKey.toUpperCase()} alone and will read low.`
		);
	}
	if (cls.flags?.demonAvenger) {
		notes.push('Demon Avenger CP uses the HP stat formula, which this checksum does not model.');
	}

	const weapon = character.equipment?.weapon;
	let weaponBaseAtt: number | undefined;
	let weaponStarAtt: number | undefined;
	let bowBaseAtt: number | undefined;

	if (weapon) {
		const att = weaponAtt(weapon, cls.usesMagicAttack);
		const bow = bowBaseAttFor(weapon);
		if (att && bow) {
			weaponBaseAtt = att.base;
			weaponStarAtt = att.star;
			bowBaseAtt = bow.value;
			if (!bow.exact) {
				notes.push(
					`Bow-equivalent base ATT for ${weapon.name} was inferred from its item level, ` +
						'not from a documented row.'
				);
			}
		} else if (!att) {
			notes.push(
				`${weapon.name} has no separate base/star ATT breakdown, so the bow normalisation ` +
					'(formulas.md §2.2) was skipped.'
			);
		} else {
			notes.push(`No bow-equivalent base ATT is known for ${weapon.name}.`);
		}
	} else {
		notes.push('No weapon is equipped, so the bow normalisation was skipped.');
	}

	const result = calc.computeCombatPower({
		mainStatBase: mainTriple.base,
		mainStatPercent: mainTriple.percent,
		mainStatFinal: mainTriple.flat,
		subStatBase: subTriple.base,
		subStatPercent: subTriple.percent,
		subStatFinal: subTriple.flat,
		attFlat: attTriple.base,
		attPercent: attTriple.percent,
		critDamagePercent: input.criticalDamagePercent,
		damagePercent: input.damagePercent,
		bossDamagePercent: input.bossDamagePercent,
		finalDamagePercent: input.finalDamagePercent,
		weaponBaseAtt,
		weaponStarAtt,
		bowBaseAtt
	});

	// CP subtracts skill/consumable contributions from every term (§2.2), and the
	// stat window is captured buffed-or-not with no way to tell, so even a fully
	// normalised value is `sourced`, never `exact`.
	const confidence: Confidence = result.approx ? 'estimated' : 'sourced';
	if (result.approx) {
		notes.push('Un-normalised Combat Power (approx) — expect it to read low for non-bow classes.');
	}
	notes.push(
		'CP omits IED, crit rate, level and force (formulas.md §2.6) — it is a checksum, not a score.'
	);

	return { value: result.value, confidence, note: notes.join(' ') };
}

/** Computed vs displayed: range max, range min, Combat Power. */
export function buildChecksums(character: Character, input: CalcInput): Checksum[] {
	const range = calc.displayedRange(input);
	const displayed = character.statWindow?.displayed;
	const cp = combatPowerFor(character, input);

	return [
		checksum('Damage range (max)', range.upper, displayed?.rangeMax),
		checksum('Damage range (min)', range.lower, displayed?.rangeMin),
		// NOT a point comparison. The game computes Combat Power from
		// SKILL-STRIPPED stats (formulas.md §2.2: every term subtracts its skill
		// and consumable contribution), while a stat-window capture is whatever
		// the character had running at the time. Those skill contributions are
		// the opaque class baseline this project deliberately does not try to
		// reconstruct (design §2), so we cannot subtract them — and because each
		// one only ever REDUCES a term, computing with them all at zero yields an
		// upper bound rather than an estimate. Comparing that bound as if it were
		// a point estimate is what produced the old, permanent "+229% mismatch".
		boundChecksum(
			'Combat Power',
			cp.value,
			displayed?.combatPower,
			'Upper bound: the game strips skill and buff contributions from every term ' +
				'before computing CP, and a stat-window capture cannot separate them, so the ' +
				'displayed value should sit BELOW this. Only a value above it indicates a problem.'
		)
	];
}
