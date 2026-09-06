/**
 * Class skills that feed the damage formula — GMS, five priority classes.
 *
 * WHY THIS EXISTS. The engine is top-down: the in-game stat window is the source
 * of truth and every class passive is normally an opaque baseline we never
 * reconstruct (design §2). That is fine for ranking gear, but it blocks two
 * things:
 *
 *   1. Combat Power is computed by the game from SKILL-STRIPPED stats
 *      (`formulas.md` §2.2). `src/lib/analysis/checksums.ts` can therefore only
 *      BOUND it from above. Knowing what each class's passives contribute is the
 *      prerequisite for subtracting them and reproducing CP as a point value.
 *   2. "Which of my buffs is driving this number?" needs a per-skill breakdown.
 *
 * PROVENANCE. Every number below is transcribed from the class's own page on
 * Grandis Library <https://grandislibrary.com/>, which is the only source that
 * is both current for GMS and covers the 2025-26 Anima classes (Ren). Each class
 * block cites its page URL; each skill entry is quoted from that page's skill
 * list, and the `grandisLibraryTotals` block quotes the page's own "Attack
 * Stats" aggregate so the transcription can be checked against the source in
 * `class-skills.spec.ts`.
 *
 * The Grandis Library site footer states the content reflects
 * **GMS Ver. 269 [Ride the Lightning Update]** (checked 2026-09-06). The class
 * pages themselves carry no per-page patch stamp; the newest dated artefact on
 * them is an infographic (Ren 2026-07-10, Night Walker 2026-06-25, Wind Archer
 * 2026-06-24, Battle Mage 2026-05-27). Grandis Library is a GMS resource and
 * none of the five pages flags any value as KMS-only, so nothing here is marked
 * as an unreleased KMS number. See `docs/research/class-skills.md`.
 *
 * CONVENTIONS (matching the rest of `src/lib/data/`):
 *   - Whole percents: `40` means 40%.
 *   - Absent values are `undefined` (the key is simply not present), NEVER `0`.
 *     A missing key means "this skill does not grant that stat", and a missing
 *     class means "not researched yet" — not "contributes nothing".
 *   - Nothing is inferred. Anything the source does not state is either omitted
 *     or carried as a `note` beginning "UNVERIFIED".
 *   - No new dependencies; the only import is a type.
 *
 * TWO FLAGS DO THE REAL WORK:
 *   - `alwaysOn`  — false for anything duration-limited (a Buff, a hyper active,
 *     a 5th-job common buff). Combat Power strips buffs, so only `alwaysOn`
 *     entries can ever appear in a skill-stripped reconstruction.
 *   - `scope`     — 'character' for stats that show in the stat window and apply
 *     to every attack; 'skill' for stats that only apply to the named skills
 *     (nearly all hyper passives, every V boost node, every Ascent skill). Skill
 *     -scoped stats never reach the stat window and must never be summed into a
 *     character total. Grandis Library's own aggregate omits them, which is how
 *     the two can be cross-checked.
 *
 * A third field, `conditional`, marks a permanent passive whose effect still
 * requires a game state to be true (Combo Orbs charged, a debuff applied, an
 * aura toggled, a particular weapon equipped). Those are `alwaysOn: true` —
 * they are not duration-limited — but `alwaysOnTotals()` excludes them unless
 * `includeConditional` is passed.
 */

import type { StatKey } from '../calc/types';

/* -------------------------------------------------------------------------- */
/* Types                                                                       */
/* -------------------------------------------------------------------------- */

/**
 * Where a skill comes from.
 *
 * `link` and `common` are not class skills in the strict sense — a Link Skill is
 * granted by another character and the "common" 5th-job skills (Weapon Aura,
 * the Goddess's Blessings, Impenetrable Skin, Last Resort, Mana Overload,
 * Vicious Shot) are shared across a whole job branch. They are carried here
 * anyway because Grandis Library folds them into the per-class aggregate we
 * cross-check against, and because a user asking "what is driving this number?"
 * needs to see them. Filter on `source` to exclude them.
 */
export type SkillSource = 'passive' | 'hyper' | 'v' | 'hexa' | 'link' | 'common';

/** 'character' = shows in the stat window; 'skill' = only the named skills. */
export type SkillScope = 'character' | 'skill';

/**
 * Damage-formula contributions of one skill, in whole percents.
 *
 * Composition rules (formulas.md §1.6-§1.9), which `alwaysOnTotals()` applies:
 *   - `finalDamagePercent` is MULTIPLICATIVE with every other final damage source.
 *   - `ignoreDefensePercent` COMPOSES: 1 - Π(1 - x).
 *   - everything else is additive.
 */
export interface SkillEffects {
	/** Multiplicative final damage. */
	finalDamagePercent?: number;
	/** Ignore enemy defense; composes, never adds. */
	ignoreDefensePercent?: number;
	bossDamagePercent?: number;
	damagePercent?: number;
	normalEnemyDamagePercent?: number;
	criticalRatePercent?: number;
	criticalDamagePercent?: number;
	/** Flat weapon ATT. */
	attack?: number;
	/** %ATT. */
	attackPercent?: number;
	/** Flat Magic ATT. */
	magicAttack?: number;
	/** %Magic ATT. */
	magicAttackPercent?: number;
	/** Flat main/secondary stat, keyed the same way as `CalcInput.stats`. */
	stat?: Partial<Record<StatKey, number>>;
	/** %stat, e.g. Wind Archer's Touch of the Wind (+15% DEX). */
	statPercent?: Partial<Record<StatKey, number>>;
	/**
	 * Maple Warrior and its per-branch equivalents: "+N% to all stats with a
	 * direct AP investment". This is NOT %stat — it applies to AP-assigned
	 * points only, so it cannot be folded into `statPercent`.
	 */
	apAssignedStatPercent?: number;
	/** Weapon mastery, whole percent. Affects only the low end of the range. */
	masteryPercent?: number;
	/** Attack-speed stages gained (lower displayed number = faster). */
	attackSpeedStages?: number;
}

export interface ClassSkill {
	/** Skill name exactly as Grandis Library spells it. */
	name: string;
	/** Job tier label from the source page, e.g. "4th Job", "Hyper Skill". */
	job: string;
	source: SkillSource;
	/**
	 * False for anything duration-limited. ALWAYS written out explicitly — the
	 * spec asserts no entry relies on a default.
	 */
	alwaysOn: boolean;
	scope: SkillScope;
	/** Set when a permanent passive still needs a game state to be true. */
	conditional?: string;
	/** Buff duration in seconds, when the source states one. */
	durationSeconds?: number;
	/** For `scope: 'skill'`, the skills the effect applies to. */
	appliesTo?: readonly string[];
	effects: SkillEffects;
	note?: string;
}

/**
 * Grandis Library's own "Attack Stats" aggregate for the class, quoted verbatim.
 *
 * Kept as strings, not parsed numbers, because it is EVIDENCE rather than data:
 * the spec re-derives the always-on totals from `skills` and compares them to
 * these strings' leading value. Where the two legitimately differ (GL folds
 * some buffs and debuffs into its base figure) the difference is documented in
 * `docs/research/class-skills.md` and in the class's `notes`.
 */
export interface GrandisLibraryTotals {
	weaponMultiplier: string;
	attackSpeed: string;
	weaponMastery: string;
	mainStat: string;
	attack: string;
	criticalRate: string;
	criticalDamage: string;
	damage: string;
	bossDamage: string;
	finalDamage: string;
	ignoreDefense: string;
}

export interface ClassSkillSet {
	/** Matches the `id` in `src/lib/data/classes.ts`. */
	classId: string;
	className: string;
	/** e.g. "Anima", "Explorers", "Cygnus Knights", "Resistance". */
	classGroup: string;
	/** e.g. "Warrior", "Archer", "Thief", "Magician". */
	jobGroup: string;
	primaryStat: StatKey;
	secondaryStat: StatKey;
	/** Primary weapon types, spelled as Grandis Library spells them. */
	weaponTypes: readonly string[];
	/** Secondary (shield-slot) weapon types. */
	secondaryTypes: readonly string[];
	/** Weapon multiplier as printed on the page; cross-checks `classes.ts`. */
	weaponMultiplier: readonly number[];
	/** Total weapon mastery with the 4th-job upgrade; cross-checks `classes.ts`. */
	weaponMasteryPercent: number;
	sourceUrl: string;
	grandisLibraryTotals: GrandisLibraryTotals;
	skills: readonly ClassSkill[];
	notes?: readonly string[];
}

/**
 * Every character's innate critical rate before any skill, stated as
 * "Base +5%" in the Crit Rate row of every Grandis Library class page.
 */
export const INNATE_CRITICAL_RATE_PERCENT = 5;

/**
 * Uniform riders on 5th-job Boost Nodes, stated identically on all five pages.
 *
 * These are SKILL-SCOPED: the IED and crit rate apply only to the skill the node
 * boosts, so they never appear in the stat window and are not modelled as
 * per-skill entries below. The per-node Final Damage values differ per skill and
 * are deliberately not transcribed — they belong to a skill-rotation model this
 * project does not have.
 */
export const V_BOOST_NODE_RIDERS = {
	/** Not every node has the Lv. 20 rider; the ones that do all grant +5%. */
	level20CriticalRatePercent: 5,
	/** Every Boost Node listed on all five pages carries this at Lv. 40. */
	level40IgnoreDefensePercent: 20
} as const;

/**
 * The 6th-job Ascent skill rider, identical on all five pages:
 * Ren "Rising Azure Dragon: Heartbound Verse", Hero "Ultrasonic Slash",
 * Wind Archer "Elemental Tempest", Night Walker "Stygian Command",
 * Battle Mage "Duskbound Aura". Skill-scoped, one cast.
 */
export const ASCENT_SKILL_RIDER = {
	ignoreDefensePercent: 60,
	bossDamagePercent: 40,
	criticalRatePercent: 100
} as const;

/* -------------------------------------------------------------------------- */
/* Ren — https://grandislibrary.com/anima/ren                                  */
/* -------------------------------------------------------------------------- */

const REN: ClassSkillSet = {
	classId: 'ren',
	className: 'Ren',
	classGroup: 'Anima',
	jobGroup: 'Warrior',
	// Page header: mainStat "STR", secondaryStat "DEX",
	// equipment weapon ["sword"], secondary ["imugiGem"].
	primaryStat: 'str',
	secondaryStat: 'dex',
	weaponTypes: ['Sword'],
	secondaryTypes: ['Imugi Gem'],
	weaponMultiplier: [1.3], // "Weapon Multiplier: 1.3x" — agrees with classes.ts
	weaponMasteryPercent: 90, // "Weapon Mastery: 90%" = Base +20% + Exquisite Sword Mastery +70%
	sourceUrl: 'https://grandislibrary.com/anima/ren',
	grandisLibraryTotals: {
		weaponMultiplier: '1.3x',
		attackSpeed: '8',
		weaponMastery: '90%',
		mainStat: '+60(90) & +15% to assigned AP',
		attack: '+4% +165',
		criticalRate: '+50%',
		criticalDamage: '+10%',
		damage: '+20%(60%)',
		bossDamage: '+0%',
		finalDamage: '+69.23%(79.38%)(106.29% to certain skills)',
		ignoreDefense: '+40%(49%)'
	},
	skills: [
		{
			name: 'Grounded Body',
			job: 'Link Skill',
			source: 'link',
			alwaysOn: true,
			scope: 'character',
			// "[Passive] Damage: -6% ... Damage: +5%" — the -6% is damage TAKEN.
			effects: { damagePercent: 5 }
		},
		{
			name: 'Exclusive Spell',
			job: 'Beginner Skill',
			source: 'passive',
			alwaysOn: false, // "Duration: 2400 sec." — a buff, stripped by Combat Power
			scope: 'character',
			durationSeconds: 2400,
			effects: { attackPercent: 4, magicAttackPercent: 4 }
		},
		{
			name: 'Serene Verse',
			job: '1st Job',
			source: 'passive',
			alwaysOn: true,
			scope: 'character',
			// "Attack: +30, Critical Rate: +15%, Final Damage: +5%"
			effects: { attack: 30, criticalRatePercent: 15, finalDamagePercent: 5 }
		},
		{
			name: 'Sword Mastery',
			job: '2nd Job',
			source: 'passive',
			alwaysOn: true,
			scope: 'character',
			// "Sword Mastery: +50%, Attack: +30" — mastery superseded by Exquisite
			// Sword Mastery (+70%); the flat ATT is separate and stacks.
			effects: { masteryPercent: 50, attack: 30 },
			note: 'Mastery is replaced, not stacked, by Exquisite Sword Mastery (4th Job).'
		},
		{
			name: 'Physical Training',
			job: '2nd Job',
			source: 'passive',
			alwaysOn: true,
			scope: 'character',
			effects: { stat: { str: 60 } } // "STR: +60"
		},
		{
			name: 'Serene Verse II',
			job: '2nd Job',
			source: 'passive',
			alwaysOn: true,
			scope: 'character',
			effects: { criticalRatePercent: 20, finalDamagePercent: 10 }
		},
		{
			name: 'Blossoming Blade',
			job: '2nd Job',
			source: 'passive',
			alwaysOn: false, // "Duration: 200 sec."
			scope: 'character',
			durationSeconds: 200,
			effects: { attackSpeedStages: 2 } // "Sword Attack Speed: +2"
		},
		{
			name: 'Serene Verse III',
			job: '3rd Job',
			source: 'passive',
			alwaysOn: true,
			scope: 'character',
			// "Max HP: +20%, Critical Rate: +10%, Final Damage: +10%"
			effects: { criticalRatePercent: 10, finalDamagePercent: 10 }
		},
		{
			name: 'Anima Warrior',
			job: '4th Job',
			source: 'passive',
			alwaysOn: true,
			scope: 'character',
			// "[Passive Effect: All stats with a direct AP investment increase by 15%]"
			effects: { apAssignedStatPercent: 15 }
		},
		{
			name: 'Exquisite Sword Mastery',
			job: '4th Job',
			source: 'passive',
			alwaysOn: true,
			scope: 'character',
			// "Sword Mastery: +70%, Attack Power: +48, Final Damage: +11%"
			effects: { masteryPercent: 70, attack: 48, finalDamagePercent: 11 }
		},
		{
			name: 'Serene Verse IV',
			job: '4th Job',
			source: 'passive',
			alwaysOn: true,
			scope: 'character',
			effects: { attack: 57, finalDamagePercent: 20 }
		},
		{
			name: 'Eyes Unclouded',
			job: '4th Job',
			source: 'passive',
			alwaysOn: true,
			scope: 'character',
			// "Damage: +15%, Critical Damage: +10%, Ignore Defense: +40%"
			effects: { damagePercent: 15, criticalDamagePercent: 10, ignoreDefensePercent: 40 }
		},

		// --- Hyper passives (all skill-scoped; Grandis Library's aggregate omits them) ---
		{
			name: 'Spirit Strike - Reinforce',
			job: 'Hyper Skill',
			source: 'hyper',
			alwaysOn: true,
			scope: 'skill',
			appliesTo: ['Imugi Spirit Sword: Spirit Strike'],
			effects: { damagePercent: 20 }
		},
		{
			name: 'Spirit Strike - Guardbreak',
			job: 'Hyper Skill',
			source: 'hyper',
			alwaysOn: true,
			scope: 'skill',
			appliesTo: ['Imugi Spirit Sword: Spirit Strike'],
			effects: { ignoreDefensePercent: 10 }
		},
		{
			name: 'Storm - Reinforce',
			job: 'Hyper Skill',
			source: 'hyper',
			alwaysOn: true,
			scope: 'skill',
			appliesTo: ['Plum Blossom Sword: Storm'],
			effects: { damagePercent: 20 }
		},
		{
			name: 'Storm - Guardbreak',
			job: 'Hyper Skill',
			source: 'hyper',
			alwaysOn: true,
			scope: 'skill',
			appliesTo: ['Plum Blossom Sword: Storm'],
			effects: { ignoreDefensePercent: 20 }
		},
		{
			name: 'Storm - Boss Rush',
			job: 'Hyper Skill',
			source: 'hyper',
			alwaysOn: true,
			scope: 'skill',
			appliesTo: ['Plum Blossom Sword: Storm'],
			effects: { bossDamagePercent: 20 }
		},
		{
			name: 'Wish Unending - Reinforce',
			job: 'Hyper Skill',
			source: 'hyper',
			alwaysOn: true,
			scope: 'skill',
			appliesTo: [
				'Final Imugi Spirit Sword: Burrowing Earth',
				'Final Imugi Spirit Sword: Ravenous Spirit',
				'Final Imugi Spirit Sword: Years Uncounted',
				'Final Imugi Spirit Sword: Blade of the Unbound Heart'
			],
			effects: { damagePercent: 20 }
		},
		{
			name: 'Wish Unending - Guardbreak',
			job: 'Hyper Skill',
			source: 'hyper',
			alwaysOn: true,
			scope: 'skill',
			appliesTo: [
				'Final Imugi Spirit Sword: Burrowing Earth',
				'Final Imugi Spirit Sword: Ravenous Spirit',
				'Final Imugi Spirit Sword: Years Uncounted',
				'Final Imugi Spirit Sword: Blade of the Unbound Heart'
			],
			effects: { ignoreDefensePercent: 20 }
		},
		{
			name: 'Wish Unending - Critical Chance',
			job: 'Hyper Skill',
			source: 'hyper',
			alwaysOn: true,
			scope: 'skill',
			appliesTo: [
				'Final Imugi Spirit Sword: Burrowing Earth',
				'Final Imugi Spirit Sword: Ravenous Spirit',
				'Final Imugi Spirit Sword: Years Uncounted',
				'Final Imugi Spirit Sword: Blade of the Unbound Heart'
			],
			effects: { criticalRatePercent: 20 }
		},

		// --- 5th job ---
		{
			name: 'Final Imugi Spirit Sword: Blade of the Unbound Heart',
			job: '5th Job',
			source: 'v',
			alwaysOn: true,
			scope: 'skill',
			appliesTo: ['Final Imugi Spirit Sword: Blade of the Unbound Heart'],
			effects: { ignoreDefensePercent: 20 } // "Ignore Defense: 20%"
		},
		{
			name: 'Weapon Aura',
			job: '5th Job',
			source: 'common',
			alwaysOn: false, // "[130s](120s cd)"
			scope: 'character',
			durationSeconds: 130,
			effects: { finalDamagePercent: 6, ignoreDefensePercent: 16 }
		},
		{
			name: "Grandis Goddess's Blessing",
			job: '5th Job',
			source: 'common',
			alwaysOn: false, // "[40s](120s cd)"
			scope: 'character',
			durationSeconds: 40,
			effects: { damagePercent: 40 },
			note:
				'Also grants "+15% Final Damage to certain skills (refer to skill)". That final ' +
				'damage is skill-scoped and the affected list is not enumerated on the page, so it ' +
				'is UNVERIFIED and deliberately absent from `effects`.'
		},
		{
			name: 'Impenetrable Skin',
			job: '5th Job',
			source: 'common',
			alwaysOn: false, // "[18s](120s cd)"
			scope: 'character',
			durationSeconds: 18,
			effects: { stat: { str: 30 } }
		},

		// --- 6th job ---
		{
			name: 'HEXA Wish Unending',
			job: '6th Job',
			source: 'hexa',
			alwaysOn: true,
			scope: 'skill',
			appliesTo: ['HEXA Wish Unending'],
			effects: { ignoreDefensePercent: 20 } // "Ignore Defense: +20%"
		},
		{
			name: 'Rising Azure Dragon: Heartbound Verse',
			job: '6th Job',
			source: 'hexa',
			alwaysOn: false,
			scope: 'skill',
			appliesTo: ['Falling Flower', 'Climbing Serpent', 'Soaring Dragon'],
			// "For each technique, Ignore Defense: +60%, Boss Damage: +40%, Critical Rate: 100%"
			effects: {
				ignoreDefensePercent: ASCENT_SKILL_RIDER.ignoreDefensePercent,
				bossDamagePercent: ASCENT_SKILL_RIDER.bossDamagePercent,
				criticalRatePercent: ASCENT_SKILL_RIDER.criticalRatePercent
			}
		}
	],
	notes: [
		'Ren has no class-wide Boss Damage at all: the page prints "Boss Damage: +0%". ' +
			'Its only boss damage is the skill-scoped Storm - Boss Rush hyper passive and the ' +
			'Ascent skill rider.',
		'Grandis Library prints Weapon Mastery 90% (Base +20% + Exquisite Sword Mastery +70%). ' +
			'classes.ts currently carries 90 marked UNVERIFIED; this sources it.'
	]
};

/* -------------------------------------------------------------------------- */
/* Hero — https://grandislibrary.com/explorers/hero                            */
/* -------------------------------------------------------------------------- */

const HERO: ClassSkillSet = {
	classId: 'hero',
	className: 'Hero',
	classGroup: 'Explorers',
	jobGroup: 'Warrior',
	primaryStat: 'str',
	secondaryStat: 'dex',
	// Page: weapon ["oneHSword","twoHSword","oneHAxe","twoHAxe"],
	// secondary ["medallion","warShield"]. The tracker models Hero as two-handed
	// sword only (design §11) but the source lists all four; both are recorded.
	weaponTypes: ['One-Handed Sword', 'Two-Handed Sword', 'One-Handed Axe', 'Two-Handed Axe'],
	secondaryTypes: ['Medallion', 'War Shield'],
	weaponMultiplier: [1.34, 1.44], // "[1H] 1.34x [2H] 1.44x"
	weaponMasteryPercent: 90, // Base +20% + Advanced Combo +70%
	sourceUrl: 'https://grandislibrary.com/explorers/hero',
	grandisLibraryTotals: {
		weaponMultiplier: '[1H] 1.34x [2H] 1.44x',
		attackSpeed: '[1H] 8 [2H] 7',
		weaponMastery: '90%',
		mainStat: '+50(80) & +15%(415%) to assigned AP',
		attack: '+4% +80(154)',
		criticalRate: '+40%(70%)',
		criticalDamage: '+20%',
		damage: '+6%(61-66%)',
		bossDamage: '+20%(24%)',
		finalDamage: '+202.5%(447.46%)',
		ignoreDefense: '+50%(~58%)'
	},
	skills: [
		{
			name: 'Invincible Belief',
			job: 'Link Skill',
			source: 'link',
			alwaysOn: true,
			scope: 'character',
			effects: { damagePercent: 6 } // "[Passive Effect: Damage +6%]"
		},
		{
			name: "Hero's Echo",
			job: 'Beginner Skill',
			source: 'passive',
			alwaysOn: false, // "for 2400 sec"
			scope: 'character',
			durationSeconds: 2400,
			effects: { attackPercent: 4, magicAttackPercent: 4 }
		},
		{
			name: 'Combo Attack',
			job: '2nd Job',
			source: 'passive',
			alwaysOn: true,
			scope: 'character',
			conditional: 'per Combo Orb; +2 ATT each, up to 10 orbs with Advanced Combo',
			// "Attack Power for each Combo Count: +2." Advanced Combo raises the cap
			// to 10 orbs, which is the +20 Grandis Library totals.
			effects: { attack: 20 }
		},
		{
			name: 'Spirit Blade',
			job: '2nd Job',
			source: 'passive',
			alwaysOn: false, // "Duration: 200 sec"
			scope: 'character',
			durationSeconds: 200,
			effects: { attack: 30 }
		},
		{
			name: 'Weapon Mastery',
			job: '2nd Job',
			source: 'passive',
			alwaysOn: true,
			scope: 'character',
			// "Sword and Axe Mastery: +50%, Attack Speed: +1, Final Damage: +10%,
			//  Critical Rate: +15% | Damage +5% when equipped with an Axe."
			// The axe-only +5% Damage is carried as its own entry below, because
			// this tracker models Hero as two-handed SWORD only (design §11).
			effects: {
				masteryPercent: 50,
				attackSpeedStages: 1,
				finalDamagePercent: 10,
				criticalRatePercent: 15
			}
		},
		{
			name: 'Weapon Mastery (Axe bonus)',
			job: '2nd Job',
			source: 'passive',
			alwaysOn: true,
			scope: 'character',
			conditional: 'only while an Axe is equipped; the tracker models Hero as 2H Sword (design §11)',
			effects: { damagePercent: 5 }
		},
		{
			name: 'Agile Arms',
			job: '2nd Job',
			source: 'passive',
			alwaysOn: true,
			scope: 'character',
			effects: { attackSpeedStages: 2, stat: { str: 20 } }
		},
		{
			name: 'Physical Training',
			job: '2nd Job',
			source: 'passive',
			alwaysOn: true,
			scope: 'character',
			effects: { stat: { str: 30, dex: 30 } }
		},
		{
			name: 'Chance Attack',
			job: '3rd Job',
			source: 'passive',
			alwaysOn: true,
			scope: 'character',
			// "Final Damage (to pierced, incapacitated enemies): +25% | Permanently
			//  increases your Critical Rate by 20%."
			effects: { criticalRatePercent: 20 }
		},
		{
			name: 'Chance Attack (pierced target)',
			job: '3rd Job',
			source: 'passive',
			alwaysOn: true,
			scope: 'character',
			conditional: 'target must be pierced or incapacitated (Scarring Sword / Puncture)',
			effects: { finalDamagePercent: 25 }
		},
		{
			name: 'Maple Warrior',
			job: '4th Job',
			source: 'passive',
			alwaysOn: true,
			scope: 'character',
			effects: { apAssignedStatPercent: 15 }
		},
		{
			name: 'Advanced Combo',
			job: '4th Job',
			source: 'passive',
			alwaysOn: true,
			scope: 'character',
			conditional: 'per Combo Orb; +10% Final Damage each, max 10 orbs',
			// "Final Damage boosted to 10% per Combo Orb, Max Combo Orbs: 10,
			//  ... Weapon Mastery: Increased by 70%". Mastery is unconditional; the
			//  final damage is not, so mastery lives in its own entry below.
			effects: { finalDamagePercent: 100 }
		},
		{
			name: 'Advanced Combo (mastery)',
			job: '4th Job',
			source: 'passive',
			alwaysOn: true,
			scope: 'character',
			effects: { masteryPercent: 70 }
		},
		{
			name: 'Combat Mastery',
			job: '4th Job',
			source: 'passive',
			alwaysOn: true,
			scope: 'character',
			effects: { ignoreDefensePercent: 50 } // "Defense Ignored: 50%"
		},
		{
			name: 'Advanced Final Attack',
			job: '4th Job',
			source: 'passive',
			alwaysOn: true,
			scope: 'character',
			effects: { attack: 30 } // "Attack Power: +30 permanently."
		},
		{
			name: 'Enrage',
			job: '4th Job',
			source: 'passive',
			alwaysOn: true,
			scope: 'character',
			effects: { finalDamagePercent: 25, criticalDamagePercent: 20 }
		},
		{
			name: 'Puncture',
			job: '4th Job',
			source: 'passive',
			alwaysOn: true,
			scope: 'character',
			conditional: "target must be afflicted by Puncture's debuff",
			// "Attacks deal 25% more damage to afflicted enemies."
			effects: { damagePercent: 25 }
		},

		// --- Hyper passives ---
		{
			name: 'Advanced Combo Attack - Reinforce',
			job: 'Hyper Skill',
			source: 'hyper',
			alwaysOn: true,
			scope: 'character',
			conditional: 'per Combo Orb; +2% Final Damage each, so +20% at 10 orbs',
			effects: { finalDamagePercent: 20 }
		},
		{
			name: 'Advanced Combo Attack - Boss Rush',
			job: 'Hyper Skill',
			source: 'hyper',
			alwaysOn: true,
			scope: 'character',
			conditional: 'per Combo Orb; +2% Boss Damage each, so +20% at 10 orbs',
			effects: { bossDamagePercent: 20 }
		},
		{
			name: 'Advanced Final Attack - Ferocity',
			job: 'Hyper Skill',
			source: 'hyper',
			alwaysOn: true,
			scope: 'character',
			effects: { attack: 20 },
			note:
				'Grandis Library marks this "optional" in its Attack total, because hyper passive ' +
				'points are limited and the recommended build spends them elsewhere. It is a ' +
				'permanent passive if taken.'
		},
		{
			name: 'Advanced Final Attack - Reinforce',
			job: 'Hyper Skill',
			source: 'hyper',
			alwaysOn: true,
			scope: 'skill',
			appliesTo: ['Advanced Final Attack'],
			effects: { damagePercent: 10 }
		},
		{
			name: 'Raging Blow - Reinforce',
			job: 'Hyper Skill',
			source: 'hyper',
			alwaysOn: true,
			scope: 'skill',
			appliesTo: ['Raging Blow'],
			effects: { damagePercent: 20 }
		},

		// --- Hyper actives (buffs) ---
		{
			name: 'Cry Valhalla',
			job: 'Hyper Skill',
			source: 'hyper',
			alwaysOn: false, // "[30s](120s cd)"
			scope: 'character',
			durationSeconds: 30,
			effects: { attack: 50, criticalRatePercent: 30 }
		},
		{
			name: 'Epic Adventure',
			job: 'Hyper Skill',
			source: 'hyper',
			alwaysOn: false, // "Duration: 60 sec"
			scope: 'character',
			durationSeconds: 60,
			effects: { damagePercent: 10 }
		},

		// --- 5th job ---
		{
			name: 'Instinctual Combo',
			job: '5th Job',
			source: 'v',
			alwaysOn: false, // "Duration: 20 sec."
			scope: 'character',
			durationSeconds: 20,
			// "The Combo Orb increases Final Damage, Boss Damage, and Attack Power
			//  by 13%." Grandis Library's totals show that as "Max. +4" ATT and
			//  "Max. +4%" Boss Damage.
			effects: { attack: 4, bossDamagePercent: 4 },
			note:
				'The +13% also multiplies the Combo Orb FINAL DAMAGE, which Grandis Library shows ' +
				'as raising the combo-orb final damage from +120% to +135.6%. That is an increment ' +
				'on another entry rather than a standalone final damage line, so no ' +
				'`finalDamagePercent` is recorded here.'
		},
		{
			name: 'Maple World Goddess’s Blessing',
			job: '5th Job',
			source: 'common',
			alwaysOn: false, // "[60s](120s cd)"
			scope: 'character',
			durationSeconds: 60,
			// "+20% Damage" and "extra +400%" on Maple Warrior's AP-assigned bonus,
			// which is the "+15%(415%)" in the page's STR row.
			effects: { damagePercent: 20, apAssignedStatPercent: 400 }
		},
		{
			name: 'Weapon Aura',
			job: '5th Job',
			source: 'common',
			alwaysOn: false,
			scope: 'character',
			durationSeconds: 130,
			effects: { finalDamagePercent: 6 },
			note:
				'The Hero page lists Weapon Aura only in the Final Damage row (+6%). Its Ignore ' +
				'DEF rider is implied by the page printing Ignore DEF "+50%(~58%)"; the Ren page ' +
				'states the same skill as +16% Ignore DEF, which reproduces ~58%.'
		},
		{
			name: 'Impenetrable Skin',
			job: '5th Job',
			source: 'common',
			alwaysOn: false,
			scope: 'character',
			durationSeconds: 18,
			effects: { stat: { str: 30 } }
		},

		// --- 6th job ---
		{
			name: 'Ultrasonic Slash',
			job: '6th Job',
			source: 'hexa',
			alwaysOn: false,
			scope: 'skill',
			appliesTo: ['Ultrasonic Slash'],
			effects: {
				ignoreDefensePercent: ASCENT_SKILL_RIDER.ignoreDefensePercent,
				bossDamagePercent: ASCENT_SKILL_RIDER.bossDamagePercent,
				criticalRatePercent: ASCENT_SKILL_RIDER.criticalRatePercent
			}
		}
	],
	notes: [
		'Hero is the class whose totals depend most on a maintained RESOURCE. Combo Orbs drive ' +
			'+20 ATT, +100% Final Damage (Advanced Combo), a further +20% Final Damage (hyper ' +
			'Reinforce) and +20% Boss Damage (hyper Boss Rush). All four are permanent passives, ' +
			'not buffs, so they are alwaysOn: true with a `conditional`. Excluding them drops ' +
			"Hero's unconditional final damage from Grandis Library's +202.5% to +37.5%.",
		"Grandis Library's parenthetical Final Damage figure (+447.46%) could NOT be reproduced " +
			'from the components it lists; its base figure (+202.5% = 1.10 x 1.25 x 2.20) can. ' +
			'The parenthetical is therefore recorded as a quoted string only and is not used.',
		'The tracker models Hero as two-handed Sword only (design §11), so the 1H weapon ' +
			"multiplier (1.34) and the Axe-only +5% Damage are recorded but flagged and don't " +
			'enter the unconditional totals.'
	]
};

/* -------------------------------------------------------------------------- */
/* Wind Archer — https://grandislibrary.com/cygnus-knights/wind-archer         */
/* -------------------------------------------------------------------------- */

const WIND_ARCHER: ClassSkillSet = {
	classId: 'wind-archer',
	className: 'Wind Archer',
	classGroup: 'Cygnus Knights',
	jobGroup: 'Archer',
	primaryStat: 'dex',
	secondaryStat: 'str',
	weaponTypes: ['Bow'],
	secondaryTypes: ['Jewel'],
	weaponMultiplier: [1.3],
	weaponMasteryPercent: 85, // Base +15% + Bow Expert +70%
	sourceUrl: 'https://grandislibrary.com/cygnus-knights/wind-archer',
	grandisLibraryTotals: {
		weaponMultiplier: '1.3x',
		attackSpeed: '8',
		weaponMastery: '85%',
		mainStat: '+15% +50 +1 per 2 levels & +15% to assigned AP',
		attack: '+24% +170',
		criticalRate: '+60%',
		criticalDamage: '+36%',
		damage: '+50%(132%)',
		bossDamage: '+40%',
		finalDamage: '+66.32%',
		ignoreDefense: '+34.98%'
	},
	skills: [
		{
			name: 'Cygnus Blessing',
			job: 'Link Skill',
			source: 'link',
			alwaysOn: true,
			scope: 'character',
			// "Attack Power and Magic ATT: +55" at the level the page assumes.
			effects: { attack: 55, magicAttack: 55 }
		},
		{
			name: 'Elemental Harmony',
			job: 'Beginner Skill',
			source: 'passive',
			alwaysOn: true,
			scope: 'character',
			// "Dexterity increases 1 for every 2 levels the character gains" — a
			// level-dependent amount, so no fixed number can be recorded.
			effects: {},
			note: 'Grants +1 DEX per 2 character levels (+150 DEX at Lv. 300). Level-dependent, so no fixed value is stored.'
		},
		{
			name: 'Elemental Expert',
			job: 'Beginner Skill',
			source: 'passive',
			alwaysOn: true,
			scope: 'character',
			effects: { attackPercent: 10, magicAttackPercent: 10 }
		},
		{
			name: "Hero's Echo",
			job: 'Beginner Skill',
			source: 'passive',
			alwaysOn: false,
			scope: 'character',
			durationSeconds: 2400,
			effects: { attackPercent: 4, magicAttackPercent: 4 }
		},
		{
			name: 'Storm Elemental',
			job: '1st Job',
			source: 'passive',
			alwaysOn: true,
			scope: 'character',
			effects: { damagePercent: 10 } // "[Passive Effect: Damage: +10%]"
		},
		{
			name: 'Whispers of the Wind',
			job: '1st Job',
			source: 'passive',
			alwaysOn: true,
			scope: 'character',
			effects: { attack: 20 }
		},
		{
			name: 'Sylvan Aid',
			job: '2nd Job',
			source: 'passive',
			alwaysOn: true,
			scope: 'character',
			effects: { attack: 20, criticalRatePercent: 10 }
		},
		{
			name: 'Agile Bows',
			job: '2nd Job',
			source: 'passive',
			alwaysOn: true,
			scope: 'character',
			effects: { attackSpeedStages: 2, stat: { dex: 20 } }
		},
		{
			name: 'Bow Mastery',
			job: '2nd Job',
			source: 'passive',
			alwaysOn: true,
			scope: 'character',
			effects: { masteryPercent: 50, finalDamagePercent: 10 },
			note: 'Mastery is replaced, not stacked, by Bow Expert (4th Job).'
		},
		{
			name: 'Physical Training',
			job: '2nd Job',
			source: 'passive',
			alwaysOn: true,
			scope: 'character',
			effects: { stat: { str: 30, dex: 30 } }
		},
		{
			name: 'Pinpoint Pierce',
			job: '3rd Job',
			source: 'passive',
			alwaysOn: true,
			scope: 'character',
			// "[Passive Effects: Damage: +15%, Ignore Defense: +15%]"
			effects: { damagePercent: 15, ignoreDefensePercent: 15 }
		},
		{
			name: 'Eagle Eye',
			job: '3rd Job',
			source: 'passive',
			alwaysOn: true,
			scope: 'character',
			// "Attack Power: +20, Final Damage: 12%, Max HP: +1500,
			//  Critical Rate: +10%, Attack Speed: +1"
			effects: {
				attack: 20,
				finalDamagePercent: 12,
				criticalRatePercent: 10,
				attackSpeedStages: 1
			}
		},
		{
			name: 'Second Wind',
			job: '3rd Job',
			source: 'passive',
			alwaysOn: true,
			scope: 'character',
			effects: { attack: 15 }
		},
		{
			name: 'Call of Cygnus',
			job: '4th Job',
			source: 'passive',
			alwaysOn: true,
			scope: 'character',
			effects: { apAssignedStatPercent: 15 }
		},
		{
			name: 'Sharp Eyes',
			job: '4th Job',
			source: 'passive',
			alwaysOn: false, // "Duration: 300 sec" — a party buff
			scope: 'character',
			durationSeconds: 300,
			effects: { criticalRatePercent: 20, criticalDamagePercent: 15 }
		},
		{
			name: 'Touch of the Wind',
			job: '4th Job',
			source: 'passive',
			alwaysOn: true,
			scope: 'character',
			// "Attack Power: +10%, Dexterity: +15%, Max HP: +20%, ..."
			effects: { attackPercent: 10, statPercent: { dex: 15 } }
		},
		{
			name: 'Bow Expert',
			job: '4th Job',
			source: 'passive',
			alwaysOn: true,
			scope: 'character',
			// "Bow Mastery: +70%. Attack Power: +30, Final Damage: +35%,
			//  Critical Damage: +21%, Damage Against Bosses: +40%"
			effects: {
				masteryPercent: 70,
				attack: 30,
				finalDamagePercent: 35,
				criticalDamagePercent: 21,
				bossDamagePercent: 40
			}
		},
		{
			name: 'Emerald Dust',
			job: '4th Job',
			source: 'passive',
			alwaysOn: true,
			scope: 'character',
			conditional: 'requires the Emerald Flower summon to be up and the enemy in range',
			// "Monster DEF: -10%" — the page notes this "can be considered as %Ignore DEF".
			effects: { ignoreDefensePercent: 10 }
		},
		{
			name: 'Albatross Max',
			job: '4th Job',
			source: 'passive',
			alwaysOn: true,
			scope: 'character',
			// "Attack Power: +30, Damage: +25%, Ignore Enemy Defense: +15%,
			//  Critical Rate: +15%, ..., Attack Speed: +1"
			effects: {
				attack: 30,
				damagePercent: 25,
				ignoreDefensePercent: 15,
				criticalRatePercent: 15,
				attackSpeedStages: 1
			}
		},

		// --- Hyper passives (all skill-scoped) ---
		{
			name: 'Trifling Wind - Reinforce',
			job: 'Hyper Skill',
			source: 'hyper',
			alwaysOn: true,
			scope: 'skill',
			appliesTo: ['Trifling Wind I', 'Trifling Wind II', 'Trifling Wind III'],
			effects: { damagePercent: 20 }
		},
		{
			name: 'Fairy Spiral - Reinforce',
			job: 'Hyper Skill',
			source: 'hyper',
			alwaysOn: true,
			scope: 'skill',
			appliesTo: ['Fairy Spiral'],
			effects: { damagePercent: 20 }
		},
		{
			name: 'Song of Heaven - Reinforce',
			job: 'Hyper Skill',
			source: 'hyper',
			alwaysOn: true,
			scope: 'skill',
			appliesTo: ['Song of Heaven'],
			effects: { damagePercent: 20 }
		},
		{
			name: 'Song of Heaven - Guardbreak',
			job: 'Hyper Skill',
			source: 'hyper',
			alwaysOn: true,
			scope: 'skill',
			appliesTo: ['Song of Heaven'],
			effects: { ignoreDefensePercent: 20 }
		},
		{
			name: 'Song of Heaven - Boss Rush',
			job: 'Hyper Skill',
			source: 'hyper',
			alwaysOn: true,
			scope: 'skill',
			appliesTo: ['Song of Heaven'],
			effects: { bossDamagePercent: 30 }
		},
		{
			name: 'Glory of the Guardians',
			job: 'Hyper Skill',
			source: 'hyper',
			alwaysOn: false, // "Duration: 60 sec"
			scope: 'character',
			durationSeconds: 60,
			effects: { damagePercent: 10 }
		},

		// --- 5th job commons ---
		{
			name: "Transcendent Cygnus's Blessing",
			job: '5th Job',
			source: 'common',
			alwaysOn: false, // "[45s](120s cd)"
			scope: 'character',
			durationSeconds: 45,
			effects: { damagePercent: 72 }
		},
		{
			name: 'Vicious Shot',
			job: '5th Job',
			source: 'common',
			alwaysOn: false, // "[30s](120s cd)"
			scope: 'character',
			durationSeconds: 30,
			effects: {},
			note:
				'Grandis Library states the effect only as "+50% of Crit Rate" in the Critical ' +
				'Damage row. The resulting critical damage therefore depends on the character’s ' +
				'own crit rate and no fixed percent can be recorded. UNVERIFIED as a number.'
		},

		// --- 6th job ---
		{
			name: 'Elemental Tempest',
			job: '6th Job',
			source: 'hexa',
			alwaysOn: false,
			scope: 'skill',
			appliesTo: ['Elemental Tempest'],
			effects: {
				ignoreDefensePercent: ASCENT_SKILL_RIDER.ignoreDefensePercent,
				bossDamagePercent: ASCENT_SKILL_RIDER.bossDamagePercent,
				criticalRatePercent: ASCENT_SKILL_RIDER.criticalRatePercent
			}
		}
	],
	notes: [
		'Wind Archer is the cleanest of the five: its whole final damage stack (+66.32%) is ' +
			'unconditional permanent passives, and it is the only one of the five with ' +
			'always-on class Boss Damage (+40% from Bow Expert).',
		"Grandis Library's printed Crit Rate (+60%) and Crit Damage (+36%) fold in Sharp Eyes, " +
			'a 300-second party buff. Excluding it gives +40% crit rate and +21% crit damage ' +
			'always-on. Its printed Ignore DEF (+34.98%) likewise folds in Emerald Dust, which ' +
			'needs the Emerald Flower summon; without it the always-on figure is +27.75%.'
	]
};

/* -------------------------------------------------------------------------- */
/* Night Walker — https://grandislibrary.com/cygnus-knights/night-walker       */
/* -------------------------------------------------------------------------- */

const NIGHT_WALKER: ClassSkillSet = {
	classId: 'night-walker',
	className: 'Night Walker',
	classGroup: 'Cygnus Knights',
	jobGroup: 'Thief',
	primaryStat: 'luk',
	secondaryStat: 'dex',
	weaponTypes: ['Claw'],
	secondaryTypes: ['Jewel'],
	weaponMultiplier: [1.75],
	weaponMasteryPercent: 85, // Base +15% + Throwing Expert +70%
	sourceUrl: 'https://grandislibrary.com/cygnus-knights/night-walker',
	grandisLibraryTotals: {
		weaponMultiplier: '1.75x',
		attackSpeed: '8',
		weaponMastery: '85%',
		mainStat: '+80 +1 per 2 levels & +15% to assigned AP',
		attack: '+14% +125(215)',
		criticalRate: '+40%(100%)',
		criticalDamage: '+30%',
		damage: '+30%(112%)',
		bossDamage: '+0%',
		finalDamage: '+54.56%(129.99%)',
		ignoreDefense: '+44.75%'
	},
	skills: [
		{
			name: 'Cygnus Blessing',
			job: 'Link Skill',
			source: 'link',
			alwaysOn: true,
			scope: 'character',
			effects: { attack: 55, magicAttack: 55 }
		},
		{
			name: 'Elemental Harmony',
			job: 'Beginner Skill',
			source: 'passive',
			alwaysOn: true,
			scope: 'character',
			effects: {},
			note: 'Grants +1 LUK per 2 character levels (+150 LUK at Lv. 300). Level-dependent, so no fixed value is stored.'
		},
		{
			name: 'Elemental Expert',
			job: 'Beginner Skill',
			source: 'passive',
			alwaysOn: true,
			scope: 'character',
			effects: { attackPercent: 10, magicAttackPercent: 10 }
		},
		{
			name: "Hero's Echo",
			job: 'Beginner Skill',
			source: 'passive',
			alwaysOn: false,
			scope: 'character',
			durationSeconds: 2400,
			effects: { attackPercent: 4, magicAttackPercent: 4 }
		},
		{
			name: 'Throwing Mastery',
			job: '2nd Job',
			source: 'passive',
			alwaysOn: true,
			scope: 'character',
			// "Claw Mastery: +50%, Damage: +30%, Throwing Stars: +200"
			effects: { masteryPercent: 50, damagePercent: 30 },
			note: 'Mastery is replaced, not stacked, by Throwing Expert (4th Job).'
		},
		{
			name: 'Agile Throwing',
			job: '2nd Job',
			source: 'passive',
			alwaysOn: true,
			scope: 'character',
			effects: { attackSpeedStages: 2, stat: { luk: 20 } }
		},
		{
			name: 'Critical Throw',
			job: '2nd Job',
			source: 'passive',
			alwaysOn: true,
			scope: 'character',
			effects: { criticalRatePercent: 35, criticalDamagePercent: 10 }
		},
		{
			name: 'Physical Training',
			job: '2nd Job',
			source: 'passive',
			alwaysOn: true,
			scope: 'character',
			effects: { stat: { luk: 60 } }
		},
		{
			name: 'Shadow Momentum',
			job: '3rd Job',
			source: 'passive',
			alwaysOn: true,
			scope: 'character',
			effects: { finalDamagePercent: 15 } // "Permanently Final Damage by 15%"
		},
		{
			name: 'Spirit Projection',
			job: '3rd Job',
			source: 'passive',
			alwaysOn: true,
			scope: 'character',
			effects: { attack: 10 }
		},
		{
			name: 'Alchemic Adrenaline',
			job: '3rd Job',
			source: 'passive',
			alwaysOn: true,
			scope: 'character',
			effects: { criticalDamagePercent: 10 }
		},
		{
			name: 'Adaptive Darkness III',
			job: '4th Job',
			source: 'passive',
			alwaysOn: true,
			scope: 'character',
			conditional: 'requires Marks of Darkness on the target; +7% per mark, max 5 marks',
			// The 4%/mark base comes from Dark Elemental, raised +1% per mark by each
			// of Adaptive Darkness I/II/III. Grandis Library's Ignore DEF row states
			// the composed result: "+7% per stack (Max. +35%)".
			effects: { ignoreDefensePercent: 35 }
		},
		{
			name: 'Throwing Expert',
			job: '4th Job',
			source: 'passive',
			alwaysOn: true,
			scope: 'character',
			// "Claw Mastery: +70%. Attack Power: +30, Critical Damage: +10%"
			effects: { masteryPercent: 70, attack: 30, criticalDamagePercent: 10 }
		},
		{
			name: 'Dark Blessing',
			job: '4th Job',
			source: 'passive',
			alwaysOn: true,
			scope: 'character',
			// "Attack Power: +30, Ignore Defense: +15%, Final Damage: +12%"
			effects: { attack: 30, ignoreDefensePercent: 15, finalDamagePercent: 12 }
		},
		{
			name: 'Call of Cygnus',
			job: '4th Job',
			source: 'passive',
			alwaysOn: true,
			scope: 'character',
			effects: { apAssignedStatPercent: 15 }
		},

		// --- Hyper passives ---
		{
			name: 'Quintuple Star - Reinforce',
			job: 'Hyper Skill',
			source: 'hyper',
			alwaysOn: true,
			scope: 'skill',
			appliesTo: ['Quintuple Star'],
			effects: { damagePercent: 20 }
		},
		{
			name: 'Quintuple Star - Boss Rush',
			job: 'Hyper Skill',
			source: 'hyper',
			alwaysOn: true,
			scope: 'skill',
			appliesTo: ['Quintuple Star'],
			effects: { bossDamagePercent: 20 }
		},
		{
			name: 'Quintuple Star - Critical Chance',
			job: 'Hyper Skill',
			source: 'hyper',
			alwaysOn: true,
			scope: 'skill',
			appliesTo: ['Quintuple Star'],
			effects: { criticalRatePercent: 10 }
		},
		{
			name: 'Dark Omen - Reinforce',
			job: 'Hyper Skill',
			source: 'hyper',
			alwaysOn: true,
			scope: 'skill',
			appliesTo: ['Dark Omen'],
			effects: { damagePercent: 20 }
		},
		{
			name: 'Vitality Siphon - Reinforce',
			job: 'Hyper Skill',
			source: 'hyper',
			alwaysOn: true,
			scope: 'character',
			effects: { attack: 60 },
			note:
				'Grandis Library marks this "optional" in its Attack total (hyper passive points ' +
				'are limited). It is a permanent passive if taken, which is why the page prints ' +
				'Attack as "+125(215)".'
		},

		// --- Hyper actives (buffs) ---
		{
			name: 'Dominion',
			job: 'Hyper Skill',
			source: 'hyper',
			alwaysOn: false, // "[20s](120s cd)"
			scope: 'character',
			durationSeconds: 20,
			effects: { criticalRatePercent: 100, finalDamagePercent: 20 }
		},
		{
			name: 'Glory of the Guardians',
			job: 'Hyper Skill',
			source: 'hyper',
			alwaysOn: false,
			scope: 'character',
			durationSeconds: 60,
			effects: { damagePercent: 10 }
		},

		// --- 5th job ---
		{
			name: 'Shadow Bite',
			job: '5th Job',
			source: 'v',
			alwaysOn: true,
			scope: 'character',
			// "[Passive Effect: Final Damage: +20%]" — the page's note reads
			// "[Passive]: Permanently increases %Final Damage".
			effects: { finalDamagePercent: 20 }
		},
		{
			name: "Transcendent Cygnus's Blessing",
			job: '5th Job',
			source: 'common',
			alwaysOn: false,
			scope: 'character',
			durationSeconds: 45,
			effects: { damagePercent: 72 }
		},
		{
			name: 'Last Resort',
			job: '5th Job',
			source: 'common',
			alwaysOn: false, // "[30s](60s cd)"
			scope: 'character',
			durationSeconds: 30,
			// "+30 ATT"; "+10% Final Damage in Stage 1, +24% in Stage 2".
			effects: { attack: 30, finalDamagePercent: 24 },
			note: 'Final damage is +10% in Stage 1 and +24% in Stage 2; the Stage 2 value is stored.'
		},

		// --- 6th job ---
		{
			name: 'HEXA Dominion',
			job: '6th Job',
			source: 'hexa',
			alwaysOn: false, // "Cooldown: 120 sec", "While active"
			scope: 'character',
			durationSeconds: 20,
			effects: { finalDamagePercent: 20, criticalRatePercent: 100 }
		},
		{
			name: 'Stygian Command',
			job: '6th Job',
			source: 'hexa',
			alwaysOn: false,
			scope: 'skill',
			appliesTo: ['Stygian Command'],
			effects: {
				ignoreDefensePercent: ASCENT_SKILL_RIDER.ignoreDefensePercent,
				bossDamagePercent: ASCENT_SKILL_RIDER.bossDamagePercent,
				criticalRatePercent: ASCENT_SKILL_RIDER.criticalRatePercent
			}
		}
	],
	notes: [
		'Night Walker, like Ren, has NO class-wide Boss Damage: the page prints ' +
			'"Boss Damage: +0%". Its only boss damage is the skill-scoped Quintuple Star - ' +
			'Boss Rush hyper passive and the Ascent skill rider.',
		"Grandis Library's printed Ignore DEF (+44.75%) composes Dark Blessing's unconditional " +
			'+15% with Adaptive Darkness III at max Marks of Darkness (+35%): ' +
			'1 - 0.85 x 0.65 = 0.4475. The unconditional figure is +15%.'
	]
};

/* -------------------------------------------------------------------------- */
/* Battle Mage — https://grandislibrary.com/resistance/battle-mage             */
/* -------------------------------------------------------------------------- */

const BATTLE_MAGE: ClassSkillSet = {
	classId: 'battle-mage',
	className: 'Battle Mage',
	classGroup: 'Resistance',
	jobGroup: 'Magician',
	primaryStat: 'int',
	secondaryStat: 'luk',
	weaponTypes: ['Staff'],
	// Page: secondary ["mageShield", "magicMarble"]. classes.ts records only
	// "Magic Marble"; the Mage Shield is the older alternative.
	secondaryTypes: ['Magic Marble', 'Mage Shield'],
	weaponMultiplier: [1.2],
	weaponMasteryPercent: 95, // Base +25% + Staff Expert +70%
	sourceUrl: 'https://grandislibrary.com/resistance/battle-mage',
	grandisLibraryTotals: {
		weaponMultiplier: '1.2x',
		attackSpeed: '8',
		weaponMastery: '95%',
		mainStat: '+40 & +15%(415%) to assigned AP',
		attack: '+21% +80(140)',
		criticalRate: '+60%',
		criticalDamage: '+40%',
		damage: '+36%(76%)',
		bossDamage: '(+5%)',
		finalDamage: '+58.6%(79.85%)',
		ignoreDefense: '+44%'
	},
	skills: [
		{
			name: 'Spirit of Freedom',
			job: 'Link Skill',
			source: 'link',
			alwaysOn: true,
			scope: 'character',
			effects: { damagePercent: 5 } // "[Passive Effect: Damage +5%]"
		},
		{
			name: "Hero's Echo",
			job: 'Beginner Skill',
			source: 'passive',
			alwaysOn: false,
			scope: 'character',
			durationSeconds: 2400,
			effects: { attackPercent: 4, magicAttackPercent: 4 }
		},
		{
			name: 'Staff Artist',
			job: '1st Job',
			source: 'passive',
			alwaysOn: true,
			scope: 'character',
			// "Magic ATT: +20, Critical Rate: +15%, DEF: +150"
			effects: { magicAttack: 20, criticalRatePercent: 15 }
		},
		{
			name: 'Hasty Aura',
			job: '1st Job',
			source: 'passive',
			alwaysOn: true,
			scope: 'character',
			// "[Passive Effect: ... Attack Speed +2 levels ...]" — the passive half
			// applies with the aura off; toggling adds +1 more, which does not break
			// the soft cap and is not modelled.
			effects: { attackSpeedStages: 2 }
		},
		{
			name: 'Staff Mastery',
			job: '2nd Job',
			source: 'passive',
			alwaysOn: true,
			scope: 'character',
			// "Staff Mastery: +50%, Magic ATT: +30, Critical Hit Rate: +20%"
			effects: { masteryPercent: 50, magicAttack: 30, criticalRatePercent: 20 },
			note: 'Mastery is replaced, not stacked, by Staff Expert (4th Job).'
		},
		{
			name: 'High Wisdom',
			job: '2nd Job',
			source: 'passive',
			alwaysOn: true,
			scope: 'character',
			effects: { stat: { int: 40 } }
		},
		{
			name: 'Staff Boost',
			job: '2nd Job',
			source: 'passive',
			alwaysOn: false, // "Attack Speed increased for 200 sec"
			scope: 'character',
			durationSeconds: 200,
			effects: { attackSpeedStages: 2 }
		},
		{
			name: 'Battle Mastery',
			job: '3rd Job',
			source: 'passive',
			alwaysOn: true,
			scope: 'character',
			effects: { finalDamagePercent: 30, criticalDamagePercent: 10 }
		},
		{
			name: 'Maple Warrior',
			job: '4th Job',
			source: 'passive',
			alwaysOn: true,
			scope: 'character',
			effects: { apAssignedStatPercent: 15 }
		},
		{
			name: 'Battle Rage',
			job: '4th Job',
			source: 'passive',
			alwaysOn: true,
			scope: 'character',
			// "Damage: +25%, Critical Rate: +20%, Critical Damage: +10%, ..."
			effects: { damagePercent: 25, criticalRatePercent: 20, criticalDamagePercent: 10 }
		},
		{
			name: 'Staff Expert',
			job: '4th Job',
			source: 'passive',
			alwaysOn: true,
			scope: 'character',
			// "Staff Mastery: +70%. Magic ATT: +30, Critical Damage: +20%"
			effects: { masteryPercent: 70, magicAttack: 30, criticalDamagePercent: 20 }
		},
		{
			name: 'Spell Boost',
			job: '4th Job',
			source: 'passive',
			alwaysOn: true,
			scope: 'character',
			// "Final Damage: +22%, Magic ATT: +10%, Damage: +6%, Ignore Defense: +30%"
			effects: {
				finalDamagePercent: 22,
				magicAttackPercent: 10,
				damagePercent: 6,
				ignoreDefensePercent: 30
			}
		},
		{
			name: 'Dark Aura (passive half)',
			job: '4th Job',
			source: 'passive',
			alwaysOn: true,
			scope: 'character',
			effects: { magicAttackPercent: 7 } // "[Passive Effect: Magic ATT +7%]"
		},
		{
			name: 'Dark Aura (aura half)',
			job: '4th Job',
			source: 'passive',
			alwaysOn: true,
			scope: 'character',
			conditional: 'requires the Dark Aura aura to be toggled on (16 MP/sec)',
			effects: { damagePercent: 10 } // "MP Cost per sec: 16, Damage: +10%"
		},
		{
			name: 'Weakening Aura',
			job: '4th Job',
			source: 'passive',
			alwaysOn: true,
			scope: 'character',
			conditional: 'requires the Weakening Aura aura toggled on; applies as an enemy debuff',
			// "Enemy DEF: -20%. Requires 2 sec to apply but will be in effect 60 sec
			//  after aura deactivation."
			effects: { ignoreDefensePercent: 20 }
		},

		// --- Hyper passives ---
		{
			name: 'Dark Genesis - Reinforce',
			job: 'Hyper Skill',
			source: 'hyper',
			alwaysOn: true,
			scope: 'skill',
			appliesTo: ['Dark Genesis'],
			effects: { damagePercent: 20 }
		},
		{
			name: 'Dark Genesis - Additional Reinforce',
			job: 'Hyper Skill',
			source: 'hyper',
			alwaysOn: true,
			scope: 'skill',
			appliesTo: ['Dark Genesis'],
			effects: { damagePercent: 20 }
		},
		{
			name: 'Dark Aura - Boss Rush',
			job: 'Hyper Skill',
			source: 'hyper',
			alwaysOn: true,
			scope: 'character',
			conditional: 'requires the Dark Aura aura to be toggled on',
			// "When attacking Boss Monster - Damage: +5%"
			effects: { bossDamagePercent: 5 }
		},
		{
			name: 'Weakening Aura - Enhance',
			job: 'Hyper Skill',
			source: 'hyper',
			alwaysOn: true,
			scope: 'character',
			conditional: 'requires the Weakening Aura aura toggled on',
			// "Increases Final Damage enemies receive by 5%."
			effects: { finalDamagePercent: 5 }
		},
		{
			name: 'For Liberty',
			job: 'Hyper Skill',
			source: 'hyper',
			alwaysOn: false, // "Duration: 60 sec"
			scope: 'character',
			durationSeconds: 60,
			effects: { damagePercent: 10 }
		},

		// --- 5th job ---
		{
			name: 'Aura Scythe',
			job: '5th Job',
			source: 'v',
			alwaysOn: false, // "Duration: 25 sec"
			scope: 'character',
			durationSeconds: 25,
			// "Additional Magic ATT increase by 60 for the self."
			effects: { magicAttack: 60 }
		},
		{
			name: 'Mana Overload',
			job: '5th Job',
			source: 'common',
			alwaysOn: true,
			scope: 'character',
			conditional: 'requires Mana Overload to be toggled on (drains MP)',
			effects: { finalDamagePercent: 8 } // "+8% while toggled"
		},
		{
			name: 'Maple World Goddess’s Blessing',
			job: '5th Job',
			source: 'common',
			alwaysOn: false,
			scope: 'character',
			durationSeconds: 60,
			effects: { damagePercent: 20, apAssignedStatPercent: 400 }
		},

		// --- 6th job ---
		{
			name: 'Duskbound Aura',
			job: '6th Job',
			source: 'hexa',
			alwaysOn: false,
			scope: 'skill',
			appliesTo: ['Duskbound Aura'],
			effects: {
				ignoreDefensePercent: ASCENT_SKILL_RIDER.ignoreDefensePercent,
				bossDamagePercent: ASCENT_SKILL_RIDER.bossDamagePercent,
				criticalRatePercent: ASCENT_SKILL_RIDER.criticalRatePercent
			}
		}
	],
	notes: [
		'Battle Mage has NO unconditional class Boss Damage. The page prints Boss Damage as ' +
			'"(+5%)" — parenthesised, because the only source is the Dark Aura - Boss Rush hyper ' +
			'passive, which needs the Dark Aura toggled on.',
		"Grandis Library's printed Ignore DEF (+44%) composes Spell Boost's unconditional +30% " +
			'with Weakening Aura (+20% as an enemy DEF debuff): 1 - 0.70 x 0.80 = 0.44. The ' +
			'unconditional figure is +30%.',
		'Auras are toggles, not timed buffs, so they are alwaysOn: true with a `conditional`. ' +
			'Whether Combat Power counts a toggled aura is NOT documented anywhere we could find.'
	]
};

/* -------------------------------------------------------------------------- */
/* Table + lookups                                                             */
/* -------------------------------------------------------------------------- */

/**
 * The five design §11 priority classes. Every other GMS class is deliberately
 * ABSENT rather than stubbed: a missing entry means "not researched", and
 * `getClassSkills` throws so a caller can never silently treat an unresearched
 * class as one with no passives.
 */
export const CLASS_SKILLS: Readonly<Record<string, ClassSkillSet>> = {
	ren: REN,
	hero: HERO,
	'wind-archer': WIND_ARCHER,
	'night-walker': NIGHT_WALKER,
	'battle-mage': BATTLE_MAGE
};

/** Class ids this module covers, in design §11 priority order. */
export const CLASS_SKILL_IDS = [
	'ren',
	'hero',
	'wind-archer',
	'night-walker',
	'battle-mage'
] as const;

export type ClassSkillId = (typeof CLASS_SKILL_IDS)[number];

/** Look up a class's skills, or `undefined` when it has not been researched. */
export function tryGetClassSkills(classId: string): ClassSkillSet | undefined {
	return CLASS_SKILLS[classId];
}

/** Look up a class's skills; throws when the class has not been researched. */
export function getClassSkills(classId: string): ClassSkillSet {
	const found = CLASS_SKILLS[classId];
	if (!found) {
		throw new Error(
			`No class-skill data for ${JSON.stringify(classId)}. ` +
				`Researched classes: ${CLASS_SKILL_IDS.join(', ')}.`
		);
	}
	return found;
}

/* -------------------------------------------------------------------------- */
/* Totals                                                                      */
/* -------------------------------------------------------------------------- */

export interface SkillTotals {
	/** Composed multiplicatively: Π(1 + x/100) - 1, as a whole percent. */
	finalDamagePercent: number;
	/** Composed: (1 - Π(1 - x/100)) as a whole percent. Never a plain sum. */
	ignoreDefensePercent: number;
	bossDamagePercent: number;
	damagePercent: number;
	/** Includes `INNATE_CRITICAL_RATE_PERCENT`. */
	criticalRatePercent: number;
	criticalDamagePercent: number;
	attack: number;
	attackPercent: number;
	magicAttack: number;
	magicAttackPercent: number;
	/** The skills that were counted, for "what is driving this number?". */
	contributors: readonly ClassSkill[];
}

export interface TotalsOptions {
	/**
	 * Include entries carrying a `conditional` (Combo Orbs, enemy debuffs,
	 * toggled auras, a specific weapon). Default false: the result is then the
	 * strictly unconditional always-on baseline, which is what a skill-stripped
	 * Combat Power reconstruction needs.
	 */
	includeConditional?: boolean;
	/** Include `scope: 'skill'` entries too. Default false. Almost never wanted. */
	includeSkillScoped?: boolean;
	/** Restrict to these sources. Default: all six. */
	sources?: readonly SkillSource[];
}

/**
 * Always-on totals for a class.
 *
 * Only `alwaysOn` skills are counted, because Combat Power is computed from
 * skill-stripped stats and a duration-limited buff is never part of a baseline.
 */
export function alwaysOnTotals(classId: string, options: TotalsOptions = {}): SkillTotals {
	const set = getClassSkills(classId);
	const includeConditional = options.includeConditional ?? false;
	const includeSkillScoped = options.includeSkillScoped ?? false;
	const sources = options.sources;

	const contributors = set.skills.filter((s) => {
		if (!s.alwaysOn) return false;
		if (!includeConditional && s.conditional !== undefined) return false;
		if (!includeSkillScoped && s.scope !== 'character') return false;
		if (sources && !sources.includes(s.source)) return false;
		return true;
	});

	let finalDamageFactor = 1;
	let defenseRemaining = 1;
	const totals = {
		bossDamagePercent: 0,
		damagePercent: 0,
		criticalRatePercent: INNATE_CRITICAL_RATE_PERCENT,
		criticalDamagePercent: 0,
		attack: 0,
		attackPercent: 0,
		magicAttack: 0,
		magicAttackPercent: 0
	};

	for (const skill of contributors) {
		const e = skill.effects;
		if (e.finalDamagePercent !== undefined) finalDamageFactor *= 1 + e.finalDamagePercent / 100;
		if (e.ignoreDefensePercent !== undefined) defenseRemaining *= 1 - e.ignoreDefensePercent / 100;
		if (e.bossDamagePercent !== undefined) totals.bossDamagePercent += e.bossDamagePercent;
		if (e.damagePercent !== undefined) totals.damagePercent += e.damagePercent;
		if (e.criticalRatePercent !== undefined) totals.criticalRatePercent += e.criticalRatePercent;
		if (e.criticalDamagePercent !== undefined) {
			totals.criticalDamagePercent += e.criticalDamagePercent;
		}
		if (e.attack !== undefined) totals.attack += e.attack;
		if (e.attackPercent !== undefined) totals.attackPercent += e.attackPercent;
		if (e.magicAttack !== undefined) totals.magicAttack += e.magicAttack;
		if (e.magicAttackPercent !== undefined) totals.magicAttackPercent += e.magicAttackPercent;
	}

	return {
		finalDamagePercent: (finalDamageFactor - 1) * 100,
		ignoreDefensePercent: (1 - defenseRemaining) * 100,
		...totals,
		contributors
	};
}

/**
 * Every skill of a class that touches a given stat, always-on or not.
 *
 * This is the "which of my buffs is driving this number?" query.
 */
export function skillsAffecting(classId: string, key: keyof SkillEffects): readonly ClassSkill[] {
	return getClassSkills(classId).skills.filter((s) => s.effects[key] !== undefined);
}
