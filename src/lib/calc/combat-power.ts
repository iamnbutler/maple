// Combat Power.
//
// Sources: docs/research/formulas.md §2.2 (the term list from
// https://maplestorywiki.net/w/Combat_Power), §2.3 (the verified python-fiddle
// reference implementation, which reproduces a real character's CP of 236,118),
// §2.5 (what CP includes/excludes); docs/research/kms-tools.md §1 restates the
// same formula and the bow-equivalent base ATT figures.
//
// CP is a CHECKSUM, never a ranking metric: it omits IED entirely, has no
// crit-rate term, and always adds Boss Damage (formulas.md §2.6).

/**
 * Bow-equivalent base ATT by weapon prefix tier, for the CP normalisation of
 * §2.2 ("the weapon's prefix tier determines the equivalent bow base ATT").
 *
 * The first four rows are the ones the Combat Power wiki page lists and were
 * verified against the individual item pages' `incWAttack` field. The rest are
 * the research author's extension from the same field and are explicitly NOT
 * confirmed as the values the CP routine uses.
 */
export const BOW_BASE_ATT = {
	/** Destiny Bow, item level 250 (formulas.md §2.2). */
	destiny: 349,
	/** Genesis Bow, item level 200 (formulas.md §2.2). */
	genesis: 318,
	/** Arcane Umbra Bow, item level 200 (formulas.md §2.2). */
	arcane: 276,
	/** AbsoLab Sureshot Bow, item level 160 (formulas.md §2.2). */
	absolab: 192,
	// UNVERIFIED — formulas.md §2.2 marks the following four rows as an
	// extension from the item pages, not confirmed for CP purposes.
	sweetwater: 160,
	fafnir: 160,
	commerci: 126,
	utgard: 115
} as const;

export type BowTier = keyof typeof BOW_BASE_ATT;

export interface BowNormalizeArgs {
	/**
	 * The character's flat Attack Power (or Magic ATT) BEFORE %ATT, with skill
	 * and consumable contributions already subtracted (formulas.md §2.2:
	 * "Except for Final Damage, all skill and consumable boosts must be
	 * subtracted from every term").
	 */
	flatAtt: number;
	/** The equipped weapon's own base ATT. */
	weaponBaseAtt: number;
	/** The equipped weapon's Star Force ATT. */
	weaponStarAtt: number;
	/** Base ATT of the equivalent bow — see `BOW_BASE_ATT`. */
	bowBaseAtt: number;
}

/**
 * Convert the character's flat ATT into the "bow-normalised" ATT CP uses.
 *
 * Source: docs/research/formulas.md §2.2 term 8 —
 *   `AttackPower + floor( bowBaseATT / weaponBaseATT - 1 ) * ( weaponBaseATT + weaponStarForceATT )`
 * and §2.3, whose runnable implementation places the floor around the WHOLE
 * product (`math.floor((bowBaseAtt / weaponBaseAtt - 1) * (weaponBaseAtt + weaponSfAtt))`).
 * The §2.3 placement is the one that reproduces 236,118, so it is the one used
 * here; the §2.2 prose is a transcription of the same expression.
 *
 * Equivalently: "AttackPower minus the weapon's total ATT plus the ATT of the
 * corresponding bow with equivalent enhancements".
 */
export function bowNormalizeAtt(args: BowNormalizeArgs): number {
	const { flatAtt, weaponBaseAtt, weaponStarAtt, bowBaseAtt } = args;
	if (weaponBaseAtt <= 0) return flatAtt;
	return flatAtt + Math.floor((bowBaseAtt / weaponBaseAtt - 1) * (weaponBaseAtt + weaponStarAtt));
}

export interface CombatPowerArgs {
	/** Main stat: "% applied" base value, INCLUDING skill contributions. */
	mainStatBase: number;
	/** Main stat %: whole percent. */
	mainStatPercent: number;
	/** Main stat "final" (%-not-applied) value. */
	mainStatFinal: number;
	/** Main stat base granted by skills/links/consumables — subtracted (§2.2, §2.5). */
	mainStatFromSkills?: number;

	/** Secondary stat, same decomposition. Xenon's third main stat can be folded in here. */
	subStatBase: number;
	subStatPercent: number;
	subStatFinal: number;
	subStatFromSkills?: number;

	/** Flat Attack Power (or Magic ATT for magicians), before %ATT. */
	attFlat: number;
	/** %ATT / %Magic ATT, whole percent. */
	attPercent: number;
	/** Flat ATT granted by skills/consumables — subtracted. */
	attFromSkills?: number;

	/** Critical Damage %, whole percent; `1.35 + cd` is the CP term (§2.2 term 7). */
	critDamagePercent: number;
	critDamageFromSkills?: number;

	damagePercent: number;
	damageFromSkills?: number;

	bossDamagePercent: number;
	bossDamageFromSkills?: number;

	/** Total Final Damage %, whole percent. */
	finalDamagePercent: number;
	/**
	 * The PRODUCT of `(1 + F)` over skill-sourced Final Damage sources, which CP
	 * divides back out (§2.2 term 6). Default 1 (no skill FD known).
	 */
	finalDamageFromSkills?: number;

	/**
	 * `Current Weapon Constant / highest possible Weapon Constant` (§2.2 term 2),
	 * for jobs whose Weapon Mastery covers several weapon types. Default 1 —
	 * which is correct for every job with a single weapon type, and is why the
	 * §2.3 reference (a cane user) omits the term entirely.
	 */
	weaponConstantRatio?: number;

	/** Weapon data for the bow normalisation; omit to skip it (result is `approx`). */
	weaponBaseAtt?: number;
	weaponStarAtt?: number;
	bowBaseAtt?: number;
}

export interface CombatPowerResult {
	value: number;
	/**
	 * True when the bow normalisation could not be applied because the weapon's
	 * base/star ATT was not supplied. Design doc §4: label it `approx` rather
	 * than guessing.
	 */
	approx: boolean;
	/** The bow-normalised flat ATT that went into the calculation. */
	normalizedAtt: number;
}

/**
 * Combat Power.
 *
 * Source: docs/research/formulas.md §2.3, structure read off the verified
 * reference implementation:
 *
 *   CP = floor( 0.01
 *             * (4*mainStat + secondaryStat)
 *             * floor(bowNormalisedATT * (1 + ATT%))
 *             * (1.35 + critDmg_excl_class)
 *             * (1 + dmg_excl_class + boss_excl_class)
 *             * (1 + FD_total) / PI(1 + FD_from_class_skills) )
 *
 * with the §2.2 weapon-constant ratio applied as an extra factor. Note the
 * reference floors the stat totals as `floor(base * mult + final)`; since the
 * final stat is an integer this equals `floor(base * mult) + final`, and the
 * reference's form is transcribed here.
 */
export function computeCombatPower(args: CombatPowerArgs): CombatPowerResult {
	const toMultiplier = (percent: number) => 1 + percent / 100;

	const mainSkills = args.mainStatFromSkills ?? 0;
	const subSkills = args.subStatFromSkills ?? 0;
	const attSkills = args.attFromSkills ?? 0;
	const critSkills = args.critDamageFromSkills ?? 0;
	const dmgSkills = args.damageFromSkills ?? 0;
	const bossSkills = args.bossDamageFromSkills ?? 0;
	const fdSkills = args.finalDamageFromSkills ?? 1;
	const weaponConstantRatio = args.weaponConstantRatio ?? 1;

	const canNormalize =
		args.weaponBaseAtt !== undefined &&
		args.weaponStarAtt !== undefined &&
		args.bowBaseAtt !== undefined;

	const strippedAtt = args.attFlat - attSkills;
	const normalizedAtt = canNormalize
		? bowNormalizeAtt({
				flatAtt: strippedAtt,
				weaponBaseAtt: args.weaponBaseAtt as number,
				weaponStarAtt: args.weaponStarAtt as number,
				bowBaseAtt: args.bowBaseAtt as number
			})
		: strippedAtt;

	const totalMain = Math.floor(
		(args.mainStatBase - mainSkills) * toMultiplier(args.mainStatPercent) + args.mainStatFinal
	);
	const totalSub = Math.floor(
		(args.subStatBase - subSkills) * toMultiplier(args.subStatPercent) + args.subStatFinal
	);

	const value = Math.floor(
		(4 * totalMain + totalSub) *
			0.01 *
			weaponConstantRatio *
			Math.floor(normalizedAtt * toMultiplier(args.attPercent)) *
			toMultiplier(args.critDamagePercent - critSkills + 35) *
			toMultiplier(args.bossDamagePercent - bossSkills + args.damagePercent - dmgSkills) *
			(toMultiplier(args.finalDamagePercent) / fdSkills)
	);

	return { value, approx: !canNormalize, normalizedAtt };
}
