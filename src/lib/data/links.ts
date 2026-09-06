/**
 * Link Skills — GMS 2026 (v270).
 *
 * Transcribed from `docs/research/formulas.md` §4B §4 PART B "LINK SKILLS".
 * Primary sources cited there:
 *   - individual maplestorywiki.net skill pages (each tagged with its GMS version)
 *   - https://grandislibrary.com/content/link-skills            (cross-check)
 *   - https://orangemushroom.net/2025/12/28/kms-ver-1-2-410-maplestory-crown-kinesis-remaster/
 *
 * ⚠️ PART C of the research warns: prefer the individual wiki skill pages over
 * the Link Skill OVERVIEW page, which carries stale rows. Grandis Library is
 * also behind on the Hayato and Kanna revamps. Everything here follows the
 * per-skill pages.
 *
 * Three things this module exists to get right, because they are what
 * calculators get wrong:
 *
 *   1. **Faction stacking.** Explorers (per branch), Cygnus, Resistance and
 *      Shine share ONE skill whose level is the sum of each UNIQUE contributing
 *      class's level. Two Heroes do nothing beyond the first.
 *   2. **Self versions differ from transferred versions.** Playing Shade gives
 *      you Close Call +5% Damage that a Shade mule does not transfer. Ren's own
 *      Grounded Body is +5% Damage; a Ren mule's is not.
 *   3. **Conditional links are not their headline number.** Angelic Buster's
 *      +60% Damage is 10 seconds on a 60-second cooldown. See {@link LinkCondition}.
 */

/* -------------------------------------------------------------------------- */
/* Level progression and stacking                                             */
/* -------------------------------------------------------------------------- */

/**
 * Per-CHARACTER link level gates. §B1 "Level progression".
 *
 * ⚠️ GMS and KMS diverge here. In GMS, *Every Little Thing Every Precious Thing*
 * expanded level 3 to every job at **Lv.210 per contributing character, no item**.
 * KMS still needs Lv.285 plus a one-per-character Proof of a Radiant Hero.
 * This module models GMS.
 */
export const LINK_LEVEL_GATES = [
	{ level: 1, atCharacterLevel: 1, note: 'granted on creation; shareable at Lv.70' },
	{ level: 2, atCharacterLevel: 120 },
	{ level: 3, atCharacterLevel: 210, note: 'GMS rule — KMS needs Lv.285 + Proof of a Radiant Hero' }
] as const;

/** A character must be Lv.70 and 1st-job-advanced before it can share a link. §B1. */
export const LINK_TRANSFER_UNLOCK_LEVEL = 70;

/** Link skills equipped from OTHER characters. 13 total counting your own. §B1. */
export const LINK_SLOTS = 12;

/** Presets of 12 links each. §B1. */
export const LINK_PRESETS = 3;

/**
 * The link level one contributing character of this level provides, under the
 * GMS rules. Faction links sum this across unique contributing classes.
 */
export function linkLevelFromCharacterLevel(characterLevel: number): number {
	if (characterLevel >= 210) return 3;
	if (characterLevel >= 120) return 2;
	return 1;
}

/* -------------------------------------------------------------------------- */
/* Effects                                                                    */
/* -------------------------------------------------------------------------- */

/**
 * What a link skill grants at a level. Every "...Percent" field is a WHOLE
 * percent, matching `src/lib/calc/types.ts`. Absent means the link does not
 * touch that stat — never 0.
 *
 * ⚠️ `allStatFlat` CHANNEL IS UNVERIFIED. `formulas.md` §1.2 splits flat stat
 * into "% applied" (gear/flames/scrolls/stars) and "% not applied" (hyper stats,
 * symbols, Legion member effects, inner ability). Link skills appear in neither
 * list. §2 of the same research notes only that Combat Power *excludes* link
 * skill stat entirely, which settles nothing about the multiplication channel.
 * Consumers must treat `allStatFlat` as {@link LINK_FLAT_STAT_CHANNEL} says.
 */
export interface LinkEffect {
	damagePercent?: number;
	bossDamagePercent?: number;
	ignoreDefensePercent?: number;
	criticalRatePercent?: number;
	criticalDamagePercent?: number;
	/** Percentage points of All Stat % (STR/DEX/INT/LUK — not Max HP). */
	allStatPercent?: number;
	/** Flat STR, DEX, INT and LUK — all four at this value. See the channel warning above. */
	allStatFlat?: number;
	/** Flat ATT and MATT. */
	attack?: number;
	maxHpPercent?: number;
	maxMpPercent?: number;
	maxHpFlat?: number;
	maxMpFlat?: number;
	/** Negative means a REDUCTION in damage taken, e.g. `-6` for −6%. */
	damageTakenPercent?: number;
	statusResistance?: number;
	elementalResistancePercent?: number;
	buffDurationPercent?: number;
	expPercent?: number;
	mesosPercent?: number;
	summonDurationPercent?: number;
	/** Negative means a reduction, e.g. `-5` for −5% cooldowns. */
	cooldownPercent?: number;
	/** Damage only against normal (non-boss) monsters. */
	normalDamagePercent?: number;
	/** Seconds of post-revive invincibility (Resistance). */
	invincibilitySeconds?: number;
}

/**
 * How a link's flat STR/DEX/INT/LUK composes.
 *
 * `'unverified'` — the research does not settle whether link flat stat is
 * multiplied by %stat. The safe reading for a RANKING engine is the pessimistic
 * one (`mainFinal`, not multiplied), because over-crediting an upgrade is worse
 * than under-crediting it. Only Pirate Blessing and the KMS-only Lethe link are
 * affected, so the blast radius is small.
 */
export const LINK_FLAT_STAT_CHANNEL = 'unverified' as const;

/** Which links are worth what only under a condition. */
export interface LinkCondition {
	/**
	 * `proc`     — random chance on attack.
	 * `cooldown` — an active with a duration and a cooldown.
	 * `stack`    — ramps up over repeated hits and falls off.
	 * `state`    — needs a standing condition (a stat threshold, a target type).
	 */
	kind: 'proc' | 'cooldown' | 'stack' | 'state';
	/** What actually has to be true. */
	note: string;
	/**
	 * Fraction of a boss fight the effect is up, 0-1.
	 *
	 * ⚠️ ESTIMATED, not sourced. This project has no rotation model, so anything
	 * that is not arithmetic off a stated duration and cooldown is a judgement
	 * call. `cooldown` entries are `duration / cooldown` and are exact given the
	 * skill is cast on cooldown; `stack` and `proc` entries are guesses and are
	 * marked so. A candidate built on a non-exact uptime must not claim better
	 * than `estimated` confidence.
	 */
	assumedUptime: number;
	/** True when `assumedUptime` is duration/cooldown arithmetic rather than a guess. */
	uptimeIsArithmetic?: boolean;
}

/* -------------------------------------------------------------------------- */
/* Factions                                                                   */
/* -------------------------------------------------------------------------- */

/**
 * §B1 "Faction stacking". Each UNIQUE class in the faction contributes its own
 * levels; a second copy of the same class contributes nothing.
 *
 * Note who is NOT here: Mihile, Demon Slayer, Demon Avenger and Xenon each have
 * their own separate 3-level link and are not part of the Cygnus / Resistance
 * stacks, however often guides claim otherwise.
 */
export const LINK_FACTIONS = {
	'explorer-warrior': ['hero', 'paladin', 'dark-knight'],
	'explorer-magician': ['bishop', 'arch-mage-fp', 'arch-mage-il'],
	'explorer-bowman': ['bow-master', 'marksman', 'pathfinder'],
	'explorer-thief': ['night-lord', 'shadower', 'dual-blade'],
	'explorer-pirate': ['buccaneer', 'corsair', 'cannoneer'],
	cygnus: ['dawn-warrior', 'blaze-wizard', 'wind-archer', 'night-walker', 'thunder-breaker'],
	resistance: ['battle-mage', 'wild-hunter', 'mechanic', 'blaster'],
	shine: ['sia-astelle', 'erel-light']
} as const satisfies Record<string, readonly string[]>;

export type LinkFaction = keyof typeof LINK_FACTIONS;

/**
 * ⚠️ Stale caps still circulating: Explorer 6, Resistance 8, Cygnus 10. Those
 * were right before Lv.3 links reached every class. Current caps are 3 × the
 * number of unique contributing classes: 9 / 12 / 15 / 6.
 */
export const STALE_FACTION_CAPS = { explorer: 6, resistance: 8, cygnus: 10 } as const;

/* -------------------------------------------------------------------------- */
/* The link skill table                                                       */
/* -------------------------------------------------------------------------- */

export interface LinkSkillSpec {
	id: string;
	/** Current GMS name. */
	name: string;
	/** Older or KMS name, when guides still use it. */
	alsoKnownAs?: string;
	/** Class ids that contribute levels. One entry for a single-class link. */
	contributors: readonly string[];
	faction?: LinkFaction;
	maxLevel: number;
	/** Effect of the TRANSFERRED (mule) version at levels 1..maxLevel. Index 0 is level 1. */
	transferred: readonly LinkEffect[];
	/**
	 * EXTRA effect the owning character gets on top of (or instead of) the
	 * transferred version, at levels 1..maxLevel. §B2.3. Absent when the self
	 * version is identical to the transferred one.
	 */
	self?: readonly LinkEffect[];
	/** True when `self` REPLACES `transferred` rather than adding to it. */
	selfReplaces?: boolean;
	condition?: LinkCondition;
	/** True when the link does nothing for damage — kept so the roster is complete. */
	utility?: boolean;
	note?: string;
}

/** Build a levels array from a per-level generator, 1..max. */
function levels(max: number, fn: (level: number) => LinkEffect): LinkEffect[] {
	return Array.from({ length: max }, (_, i) => fn(i + 1));
}

/** A single-value effect repeated on a stated ladder. */
function ladder<K extends keyof LinkEffect>(key: K, values: readonly number[]): LinkEffect[] {
	return values.map((value) => ({ [key]: value }) as LinkEffect);
}

/**
 * Cygnus Blessing's Abnormal Status Resistance / Elemental Resistance ladder.
 * The research cites Lv1 = 1, Lv2 = 3, Lv3 = 4 and Lv15 = 22 only. No published
 * source gives Lv4-14, and no simple ladder hits all four anchors, so these are
 * a linear fill between the cited endpoints.
 *
 * **UNVERIFIED.** Neither value affects damage, so nothing downstream should
 * depend on them.
 */
export const UNVERIFIED_CYGNUS_STATUS_RES = [
	1, 3, 4, 5, 7, 8, 9, 11, 12, 13, 15, 16, 18, 20, 22
] as const;

/**
 * Empirical Knowledge's per-stack Damage % / IED % ladder. Cited at Lv1 = 1,
 * Lv2 = 1, Lv3 = 2 and Lv9 = 5; 1,1,2,2,3,3,4,4,5 is the only simple ladder
 * hitting all four. Lv4-8 are therefore **UNVERIFIED**.
 */
export const EMPIRICAL_KNOWLEDGE_PER_STACK = [1, 1, 2, 2, 3, 3, 4, 4, 5] as const;

/**
 * Every GMS link skill. §B2.1 (damage), §B2.2 (utility), §B2.3 (self versions).
 *
 * Where the research cites only levels 1-3 and the max, intermediate levels are
 * interpolated on the pattern that reproduces every cited anchor, and the spec
 * carries a `note` saying so. Those interpolations are the only unsourced
 * numbers in this table.
 */
export const LINK_SKILLS: Record<string, LinkSkillSpec> = {
	/* ---------------------------------------------------------------- */
	/* Faction links                                                    */
	/* ---------------------------------------------------------------- */

	'invincible-belief': {
		id: 'invincible-belief',
		name: 'Invincible Belief',
		contributors: LINK_FACTIONS['explorer-warrior'],
		faction: 'explorer-warrior',
		maxLevel: 9,
		utility: true,
		// Transferred version is a survival heal only — no damage contribution.
		transferred: levels(9, () => ({})),
		// §B2.3 — self-only damage passive at Lv7-9.
		self: levels(9, (l) => (l >= 7 ? { damagePercent: (l - 6) * 2 } : {})),
		note: 'transferred version restores Max HP below 15% HP; only the owner gets Damage %'
	},

	'empirical-knowledge': {
		id: 'empirical-knowledge',
		name: 'Empirical Knowledge',
		contributors: LINK_FACTIONS['explorer-magician'],
		faction: 'explorer-magician',
		maxLevel: 9,
		// Cited: Lv1 15% proc / +1% dmg / +1% IED per stack; Lv2 17/1/1; Lv3 19/2/2;
		// Lv9 31% proc, +5%/+5% per stack, 3 stacks = +15%/+15%.
		// Proc steps +2 per level (15..31). Per-stack steps 1,1,2,2,3,3,4,4,5.
		// Values below are the FULL 3-stack value, which is what matters at a boss.
		transferred: levels(9, (l) => {
			const atFullStacks = EMPIRICAL_KNOWLEDGE_PER_STACK[l - 1] * 3;
			return { damagePercent: atFullStacks, ignoreDefensePercent: atFullStacks };
		}),
		self: levels(9, (l) => (l === 9 ? { damagePercent: 6 } : {})),
		condition: {
			kind: 'stack',
			note: '15%→31% chance on attack to add a stack; 3 stacks, 10s each. Sustained attacking holds 3 stacks most of the time.',
			assumedUptime: 0.9
		},
		note: 'Lv4-8 per-stack values interpolated on 1,1,2,2,3,3,4,4,5 — the only ladder reproducing the cited Lv1/2/3/9 anchors. Values stated at the full 3 stacks.'
	},

	'adventurers-curiosity': {
		id: 'adventurers-curiosity',
		name: "Adventurer's Curiosity",
		contributors: LINK_FACTIONS['explorer-bowman'],
		faction: 'explorer-bowman',
		maxLevel: 9,
		// Cited: Lv1 3%, Lv2 4%, Lv3 6%, Lv9 15%. The +1/+2 alternating ladder
		// 3,4,6,7,9,10,12,13,15 hits every cited anchor exactly.
		transferred: ladder('criticalRatePercent', [3, 4, 6, 7, 9, 10, 12, 13, 15]),
		self: levels(9, (l) => (l >= 7 ? { damagePercent: (l - 6) * 2 } : {})),
		note: 'Lv4-8 interpolated on an alternating +1/+2 ladder that reproduces the cited Lv1/2/3/9 anchors. Also grants +50% Monster Collection rate at max.'
	},

	'thiefs-cunning': {
		id: 'thiefs-cunning',
		name: "Thief's Cunning",
		contributors: LINK_FACTIONS['explorer-thief'],
		faction: 'explorer-thief',
		maxLevel: 9,
		// Clean +3 per level: 3,6,9,...,27. Every cited anchor lands on it.
		transferred: ladder('damagePercent', [3, 6, 9, 12, 15, 18, 21, 24, 27]),
		condition: {
			kind: 'cooldown',
			note: 'triggers on debuffing an enemy; 10s duration, 20s cooldown',
			assumedUptime: 0.5,
			uptimeIsArithmetic: true
		}
	},

	'pirate-blessing': {
		id: 'pirate-blessing',
		name: 'Pirate Blessing',
		contributors: LINK_FACTIONS['explorer-pirate'],
		faction: 'explorer-pirate',
		maxLevel: 9,
		// Every level of all three ladders is cited: stats 20..100 by 10,
		// HP/MP 350..1750 by 175, damage taken -5..-21 by -2.
		transferred: levels(9, (l) => ({
			allStatFlat: 10 + l * 10,
			maxHpFlat: 175 * l + 175,
			maxMpFlat: 175 * l + 175,
			damageTakenPercent: -(3 + l * 2)
		})),
		// §B2.3 — the owner's Lv7/8/9 stat values are 90/110/130, not 80/90/100.
		selfReplaces: true,
		self: levels(9, (l) => ({
			allStatFlat: l >= 7 ? [90, 110, 130][l - 7] : 10 + l * 10,
			maxHpFlat: 175 * l + 175,
			maxMpFlat: 175 * l + 175,
			damageTakenPercent: -(3 + l * 2)
		})),
		note: 'self version also toggles an equipment STR↔DEX swap'
	},

	'cygnus-blessing': {
		id: 'cygnus-blessing',
		name: 'Cygnus Blessing',
		contributors: LINK_FACTIONS.cygnus,
		faction: 'cygnus',
		maxLevel: 15,
		// ATT/MATT is a clean +2 per level: 7,9,11,...,35. Cited at Lv1/2/3/15.
		transferred: levels(15, (l) => ({
			attack: 5 + l * 2,
			statusResistance: UNVERIFIED_CYGNUS_STATUS_RES[l - 1],
			elementalResistancePercent: UNVERIFIED_CYGNUS_STATUS_RES[l - 1]
		})),
		// §B2.3 — the owner gets ATT & MATT +55 at max instead of +35.
		selfReplaces: true,
		self: levels(15, (l) => ({
			attack: l === 15 ? 55 : 5 + l * 2,
			statusResistance: UNVERIFIED_CYGNUS_STATUS_RES[l - 1],
			elementalResistancePercent: UNVERIFIED_CYGNUS_STATUS_RES[l - 1]
		})),
		note: 'ATT ladder is exact (+2/level). Status and elemental resistance intermediates are UNVERIFIED — see UNVERIFIED_CYGNUS_STATUS_RES.'
	},

	'spirit-of-freedom': {
		id: 'spirit-of-freedom',
		name: 'Spirit of Freedom',
		alsoKnownAs: 'Afterimage Shock (Blaster, pre-merge)',
		contributors: LINK_FACTIONS.resistance,
		faction: 'resistance',
		maxLevel: 12,
		utility: true,
		transferred: levels(12, (l) => ({ invincibilitySeconds: l })),
		// §B2.3 — self-only damage passive at Lv9-12: +2/+3/+4/+5%.
		self: levels(12, (l) => (l >= 9 ? { damagePercent: l - 7 } : {})),
		note: '1 second of post-revive invincibility per level'
	},

	'guiding-stars': {
		id: 'guiding-stars',
		name: 'Guiding Stars',
		alsoKnownAs: 'Tree of Stars (Sia Astelle, pre-merge)',
		contributors: LINK_FACTIONS.shine,
		faction: 'shine',
		maxLevel: 6,
		// Every level cited: buff duration 4/7/10/13/16/19, crit damage 1..6.
		transferred: levels(6, (l) => ({
			buffDurationPercent: 1 + l * 3,
			criticalDamagePercent: l
		}))
	},

	/* ---------------------------------------------------------------- */
	/* Single-class links — damage-relevant (§B2.1)                     */
	/* ---------------------------------------------------------------- */

	'light-wash': {
		id: 'light-wash',
		name: 'Light Wash',
		alsoKnownAs: 'Permeate (KMS)',
		contributors: ['luminous'],
		maxLevel: 3,
		transferred: ladder('ignoreDefensePercent', [10, 15, 20]),
		self: levels(3, (l) => (l === 3 ? { damagePercent: 4 } : {}))
	},

	'phantom-instinct': {
		id: 'phantom-instinct',
		name: 'Phantom Instinct',
		alsoKnownAs: 'Deadly Instinct (KMS)',
		contributors: ['phantom'],
		maxLevel: 3,
		transferred: ladder('criticalRatePercent', [10, 15, 20]),
		self: levels(3, (l) => (l === 3 ? { damagePercent: 5 } : {}))
	},

	'hybrid-logic': {
		id: 'hybrid-logic',
		name: 'Hybrid Logic',
		contributors: ['xenon'],
		maxLevel: 3,
		transferred: ladder('allStatPercent', [5, 10, 15])
	},

	'fury-unleashed': {
		id: 'fury-unleashed',
		name: 'Fury Unleashed',
		alsoKnownAs: "Demon's Fury (KMS)",
		contributors: ['demon-slayer'],
		maxLevel: 3,
		transferred: ladder('bossDamagePercent', [10, 15, 20]),
		note: 'the common attribution is backwards — Demon SLAYER gives Boss Damage, Demon AVENGER gives Damage'
	},

	'wild-rage': {
		id: 'wild-rage',
		name: 'Wild Rage',
		contributors: ['demon-avenger'],
		maxLevel: 3,
		transferred: ladder('damagePercent', [5, 10, 15])
	},

	'iron-will': {
		id: 'iron-will',
		name: 'Iron Will',
		contributors: ['kaiser'],
		maxLevel: 3,
		transferred: ladder('maxHpPercent', [10, 15, 20]),
		selfReplaces: true,
		self: ladder('maxHpPercent', [10, 15, 15]),
		note: 'self version is Max HP +15% plus +4% Damage per Morph Gauge stage; the Morph term is class-state and is not modelled'
	},

	'time-to-prepare': {
		id: 'time-to-prepare',
		name: 'Time to Prepare',
		alsoKnownAs: 'Prior Preparation (KMS); often miscalled "Sharp Eyes"',
		contributors: ['kain'],
		maxLevel: 3,
		transferred: ladder('damagePercent', [9, 17, 25]),
		condition: {
			kind: 'cooldown',
			note: 'needs 5 stacks; 20s duration, 40s cooldown',
			assumedUptime: 0.5,
			uptimeIsArithmetic: true
		}
	},

	'unfair-advantage': {
		id: 'unfair-advantage',
		name: 'Unfair Advantage',
		alsoKnownAs: 'Intensive Assault (KMS); Mark of Phantom Thief (old GMS)',
		contributors: ['cadena'],
		maxLevel: 3,
		// Two halves: vs lower-level enemies, and vs abnormal-status enemies. Only
		// the second can apply at a boss, and bosses out-level you, so the
		// lower-level half is worth ZERO on the boss board.
		transferred: ladder('damagePercent', [3, 6, 9]),
		condition: {
			kind: 'state',
			note: 'the modelled half is +3/6/9% vs enemies with an abnormal status; the other half (+3/6/9% vs LOWER-level enemies) never applies to a boss',
			assumedUptime: 1
		}
	},

	'terms-and-conditions': {
		id: 'terms-and-conditions',
		name: 'Terms and Conditions',
		alsoKnownAs: 'Soul Contract (KMS)',
		contributors: ['angelic-buster'],
		maxLevel: 3,
		transferred: ladder('damagePercent', [30, 45, 60]),
		selfReplaces: true,
		self: ladder('damagePercent', [60, 90, 120]),
		condition: {
			kind: 'cooldown',
			note: '10s duration; cooldown 90s at Lv1, 60s at Lv2-3',
			assumedUptime: 10 / 60,
			uptimeIsArithmetic: true
		},
		note: 'the transferred version is exactly half the self version'
	},

	'rhinnes-blessing': {
		id: 'rhinnes-blessing',
		name: "Rhinne's Blessing",
		contributors: ['zero'],
		maxLevel: 6,
		// Cited at every level: damage taken -3/-6/-9/-12/-15/-20, IED +2/4/6/8/10/15.
		transferred: levels(6, (l) => ({
			damageTakenPercent: l === 6 ? -20 : -3 * l,
			ignoreDefensePercent: l === 6 ? 15 : 2 * l
		})),
		self: levels(6, (l) => (l === 6 ? { damagePercent: 4 } : {})),
		note: 'Zero levels this through story quests — Lv5 on finishing the story at Lv178'
	},

	judgment: {
		id: 'judgment',
		name: 'Judgment',
		contributors: ['kinesis'],
		maxLevel: 3,
		transferred: ladder('criticalDamagePercent', [2, 4, 6])
	},

	'noble-fire': {
		id: 'noble-fire',
		name: 'Noble Fire',
		alsoKnownAs: 'Noblesse (KMS); Noble Blessing (old GMS)',
		contributors: ['adele'],
		maxLevel: 3,
		// Boss Damage is unconditional. The party term is +1/2/3% PER PARTY MEMBER
		// to a cap of 4/8/12%; solo counts as a party of one, so solo gets one tick.
		transferred: levels(3, (l) => ({ bossDamagePercent: l * 2, damagePercent: l })),
		note: 'damagePercent here is the SOLO value (party of 1). In a full 4-party it reaches +4/8/12%.'
	},

	'tide-of-battle': {
		id: 'tide-of-battle',
		name: 'Tide of Battle',
		contributors: ['illium'],
		maxLevel: 3,
		// +2/3/4% per stack, 4 stacks -> 8/12/16% at full stacks.
		transferred: ladder('damagePercent', [8, 12, 16]),
		condition: {
			kind: 'stack',
			note: '4 stacks; transferred stacks last 10s (the owner gets 25s)',
			assumedUptime: 0.9
		},
		note: 'values stated at the full 4 stacks'
	},

	'innate-gift': {
		id: 'innate-gift',
		name: 'Innate Gift',
		alsoKnownAs: 'Hex: Fortitude (old GMS)',
		contributors: ['khali'],
		maxLevel: 3,
		transferred: ladder('damagePercent', [3, 5, 7]),
		selfReplaces: true,
		self: ladder('damagePercent', [3, 5, 10])
	},

	solus: {
		id: 'solus',
		name: 'Solus',
		alsoKnownAs: 'Unfathomable Sorrow (old GMS)',
		contributors: ['ark'],
		maxLevel: 3,
		// +1% base plus +1/2/3% per stack to 5 stacks -> 6/11/16%.
		transferred: ladder('damagePercent', [6, 11, 16]),
		condition: {
			kind: 'stack',
			note: '5 stacks, 5s each',
			assumedUptime: 0.9
		},
		note: 'values stated at the full 5 stacks (1% base + 5 x per-stack)'
	},

	'natures-friend': {
		id: 'natures-friend',
		name: "Nature's Friend",
		alsoKnownAs: 'Dragon Vein Absorption (old GMS)',
		contributors: ['lara'],
		maxLevel: 3,
		// The Damage half is always-on; the normal-monster half is a separate buff.
		transferred: levels(3, (l) => ({
			damagePercent: [3, 5, 7][l - 1],
			normalDamagePercent: [7, 11, 15][l - 1]
		})),
		selfReplaces: true,
		self: levels(3, (l) => ({
			damagePercent: [3, 5, 10][l - 1],
			normalDamagePercent: [7, 11, 15][l - 1]
		}))
	},

	bravado: {
		id: 'bravado',
		name: 'Bravado',
		alsoKnownAs: 'Wretched Fiends (old GMS)',
		contributors: ['hoyoung'],
		maxLevel: 3,
		// IED is unconditional. The +9/14/19% only applies to full-HP enemies,
		// which at a boss means the opening hit and nothing else — not modelled.
		transferred: ladder('ignoreDefensePercent', [5, 10, 15]),
		self: levels(3, (l) => (l === 3 ? { damagePercent: 4 } : {})),
		note: 'also grants +9/14/19% damage against enemies at 100% HP, which is worth ~nothing over a boss fight and is deliberately not included'
	},

	'moonlit-blade-learnings': {
		id: 'moonlit-blade-learnings',
		name: 'Moonlit Blade Learnings',
		alsoKnownAs: 'Keen Edge (pre-revamp — Grandis Library still shows the old version)',
		contributors: ['hayato'],
		maxLevel: 3,
		transferred: ladder('criticalDamagePercent', [3, 5, 7]),
		condition: {
			kind: 'state',
			note: 'requires Critical Rate >= 100% AND Critical Damage >= 50%',
			assumedUptime: 1
		}
	},

	elementalism: {
		id: 'elementalism',
		name: 'Elementalism',
		contributors: ['kanna'],
		maxLevel: 3,
		transferred: ladder('damagePercent', [10, 15, 20]),
		condition: {
			kind: 'stack',
			note: 'arms after 40 attack-skill uses, then 12s. Uptime depends entirely on the class rotation.',
			assumedUptime: 0.5
		},
		note: 'revamped — Grandis Library still shows the pre-revamp flat +15% Damage'
	},

	'focus-spirit': {
		id: 'focus-spirit',
		name: 'Focus Spirit',
		alsoKnownAs:
			"Lynn's own skill is Spirit Guide Blessing; the name was Beast Tamer's before the conversion",
		contributors: ['lynn'],
		maxLevel: 3,
		transferred: levels(3, (l) => ({
			bossDamagePercent: [4, 7, 11][l - 1],
			criticalRatePercent: [4, 7, 10][l - 1],
			maxHpPercent: [3, 4, 5][l - 1],
			maxMpPercent: [3, 4, 5][l - 1]
		}))
	},

	'qi-cultivation': {
		id: 'qi-cultivation',
		name: 'Qi Cultivation',
		contributors: ['mo-xuan'],
		maxLevel: 3,
		// Boss Damage +2/4/6% flat, plus +1/2/3% per hit on a boss to 6 stacks.
		transferred: levels(3, (l) => ({
			bossDamagePercent: l * 2,
			damagePercent: l * 6
		})),
		condition: {
			kind: 'stack',
			note: '6 stacks, gained at most 1 per 2s and lasting 5s — ramps slowly and falls off between bursts',
			assumedUptime: 0.8
		},
		note: 'damagePercent is the full-6-stack value (+6/12/18%); bossDamagePercent is unconditional'
	},

	'grounded-body': {
		id: 'grounded-body',
		name: 'Grounded Body',
		contributors: ['ren'],
		maxLevel: 3,
		transferred: ladder('damageTakenPercent', [-2, -4, -6]),
		self: levels(3, (l) => (l === 3 ? { damagePercent: 5 } : {})),
		note: 'a Ren MULE gives only the damage reduction; playing Ren adds +5% Damage'
	},

	/* ---------------------------------------------------------------- */
	/* Single-class links — utility (§B2.2)                             */
	/* ---------------------------------------------------------------- */

	'knights-watch': {
		id: 'knights-watch',
		name: "Knight's Watch",
		alsoKnownAs: 'Guardian of Light (KMS)',
		contributors: ['mihile'],
		maxLevel: 3,
		utility: true,
		transferred: levels(3, () => ({ statusResistance: 100 })),
		self: levels(3, () => ({ damagePercent: 3 })),
		note: 'transferred: Status Resistance +100 for 10/15/20s on a 120s cooldown. The self version is a different skill entirely — a 30s 9-hit barrier with Damage +25% — plus a flat +3% Damage passive.'
	},

	'combo-kill-blessing': {
		id: 'combo-kill-blessing',
		name: 'Combo Kill Blessing',
		alsoKnownAs: 'Combo Kill Advantage (KMS)',
		contributors: ['aran'],
		maxLevel: 3,
		utility: true,
		transferred: levels(3, () => ({})),
		self: levels(3, (l) => (l === 3 ? { damagePercent: 5 } : {})),
		note: 'transferred: Combo Kill Marble EXP +400/650/900%'
	},

	'rune-persistence': {
		id: 'rune-persistence',
		name: 'Rune Persistence',
		contributors: ['evan'],
		maxLevel: 3,
		utility: true,
		transferred: levels(3, () => ({})),
		self: levels(3, (l) => (l === 3 ? { damagePercent: 5 } : {})),
		note: 'transferred: Liberated Rune Power duration +30/50/70%'
	},

	'elven-blessing': {
		id: 'elven-blessing',
		name: 'Elven Blessing',
		contributors: ['mercedes'],
		maxLevel: 3,
		utility: true,
		transferred: ladder('expPercent', [10, 15, 20]),
		self: levels(3, (l) => (l === 3 ? { damagePercent: 5 } : {})),
		note: 'the +20% EXP is permanent and is the reason every account has a Mercedes'
	},

	'close-call': {
		id: 'close-call',
		name: 'Close Call',
		contributors: ['shade'],
		maxLevel: 3,
		utility: true,
		transferred: levels(3, () => ({})),
		self: levels(3, (l) => (l === 3 ? { damagePercent: 5 } : {})),
		note: 'transferred: 5/10/15% chance to survive a fatal hit'
	}
};

export const LINK_SKILL_IDS = Object.keys(LINK_SKILLS);

/* -------------------------------------------------------------------------- */
/* Lookups                                                                    */
/* -------------------------------------------------------------------------- */

/** classId -> the link skill it contributes to. Built once from `contributors`. */
const BY_CLASS = new Map<string, LinkSkillSpec>();
for (const spec of Object.values(LINK_SKILLS)) {
	for (const classId of spec.contributors) BY_CLASS.set(classId, spec);
}

/** The link skill a class contributes to, or `undefined` for an unknown class. */
export function linkSkillForClass(classId: string): LinkSkillSpec | undefined {
	return BY_CLASS.get(classId);
}

export function getLinkSkill(id: string): LinkSkillSpec {
	const spec = LINK_SKILLS[id];
	if (!spec) throw new Error(`Unknown link skill "${id}".`);
	return spec;
}

/**
 * The effect of a link skill at a level.
 *
 * @param forSelf when true, the character IS this link's class — apply the self
 *   version, which either replaces the transferred effect (`selfReplaces`) or is
 *   merged on top of it.
 */
export function linkEffect(id: string, level: number, forSelf = false): LinkEffect {
	const spec = getLinkSkill(id);
	if (level < 0) throw new Error(`Link level must be >= 0 (got ${level}).`);
	if (level > spec.maxLevel) {
		throw new Error(`${spec.name} caps at level ${spec.maxLevel} (got ${level}).`);
	}
	if (level === 0) return {};

	const base = spec.transferred[level - 1];
	if (!forSelf || !spec.self) return { ...base };

	const own = spec.self[level - 1];
	return spec.selfReplaces ? { ...own } : mergeAdding(base, own);
}

/** Add `extra` onto `base`, summing shared numeric keys rather than overwriting. */
function mergeAdding(base: LinkEffect, extra: LinkEffect): LinkEffect {
	const out: LinkEffect = { ...base };
	for (const [key, value] of Object.entries(extra) as [keyof LinkEffect, number][]) {
		if (value === undefined) continue;
		out[key] = (out[key] ?? 0) + value;
	}
	return out;
}

/** One character available to contribute a link. */
export interface LinkContributor {
	classId: string;
	level: number;
}

/**
 * The level a link skill reaches from a roster, applying §B1's stacking rule:
 * each UNIQUE contributing class adds its own level, duplicates add nothing, and
 * the total is capped at the skill's max.
 */
export function linkLevelFromRoster(id: string, roster: readonly LinkContributor[]): number {
	const spec = getLinkSkill(id);
	const contributors = new Set(spec.contributors);
	const bestPerClass = new Map<string, number>();

	for (const character of roster) {
		if (!contributors.has(character.classId)) continue;
		if (character.level < LINK_TRANSFER_UNLOCK_LEVEL) continue;
		const level = linkLevelFromCharacterLevel(character.level);
		bestPerClass.set(character.classId, Math.max(bestPerClass.get(character.classId) ?? 0, level));
	}

	let total = 0;
	for (const level of bestPerClass.values()) total += level;
	return Math.min(total, spec.maxLevel);
}

/**
 * Every link skill a roster can currently supply, with its level.
 *
 * Note this does NOT apply the {@link LINK_SLOTS} cap — that is a CHOICE the
 * player makes, and picking the best 12 is a ranking problem for the analysis
 * layer, not a data lookup. `available` is sorted highest-level-first so the
 * caller can slice it if it wants a naive answer.
 */
export function availableLinks(roster: readonly LinkContributor[]): {
	id: string;
	level: number;
	maxLevel: number;
}[] {
	return LINK_SKILL_IDS.map((id) => ({
		id,
		level: linkLevelFromRoster(id, roster),
		maxLevel: LINK_SKILLS[id].maxLevel
	}))
		.filter((entry) => entry.level > 0)
		.sort((a, b) => b.level - a.level || a.id.localeCompare(b.id));
}

/**
 * Effective value of a conditional link — the raw effect scaled by the assumed
 * uptime. Unconditional links come back untouched.
 *
 * ⚠️ Scaling a Damage % by uptime is an APPROXIMATION. A buff that is up half
 * the time is not the same as half the buff, because damage composes
 * multiplicatively and burst windows are worth more than their share of the
 * clock. It is the honest first-order answer and nothing here should claim more
 * than `estimated` confidence off the back of it.
 */
export function effectiveLinkEffect(id: string, level: number, forSelf = false): LinkEffect {
	const spec = getLinkSkill(id);
	const raw = linkEffect(id, level, forSelf);
	if (!spec.condition || spec.condition.assumedUptime === 1) return raw;

	const uptime = spec.condition.assumedUptime;
	const out: LinkEffect = {};
	for (const [key, value] of Object.entries(raw) as [keyof LinkEffect, number][]) {
		if (value === undefined) continue;
		out[key] = value * uptime;
	}
	return out;
}
