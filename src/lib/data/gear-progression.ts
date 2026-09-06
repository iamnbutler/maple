// Gear progression PATHS and per-stage STOPPING POINTS — GMS Heroic (Reboot), 2026.
//
// Every table here is transcribed from `docs/research/gear-progression.md`, which
// carries the full quotes and source URLs. Section references below (§n) point at
// that file. Primary sources, keyed the same way the research is:
//   UG   https://docs.google.com/document/d/1ITQx0vhNCiP9unJpV64AZgZDU-w2za4w-xcxGhbmXfY/edit
//        ("GMS Gear Progression Guide", UncappedGames, 2024 — the only guide that
//        states stopping points AND their reasons; Kronos/Hyperion i.e. Heroic)
//   DTQ  https://www.digitaltq.com/maplestory-progression-guide
//   GL   https://grandislibrary.com/content/progression-guide
//        https://www.grandislibrary.com/contents/upgrading-enhancing-equipment
//   WIKI https://maplestorywiki.net  (item pages fetched as ?action=raw)
//
// WHY THIS EXISTS
// ---------------
// The ranker used to model what is mathematically POSSIBLE (3-line a Lv 130
// earring; 30 stars on anything) instead of what a player would DO. It lacked two
// concepts: the ordered PATH a slot travels, and the STOPPING POINT on each stage
// of that path.
//
// READ THIS BEFORE USING IT: investment in a stepping stone is REQUIRED, not
// wasted. You cannot reach Arcane Umbra without gearing CRA and AbsoLab — Arcane
// drops from Lucid (entry Lv 220) and you need those tiers to get there. Nothing
// in this module says "skip a stage". `stop` is a CEILING on a stage, and `GL`
// supplies the matching floor: "It does not matter if the gear will be replaced,
// this will help you to defeat enemies." Both bounds are real.
//
// CONVENTIONS
// -----------
//  * Percent fields are whole percents (`15` means 15%).
//  * Absent/unknown values are `undefined`, never `0` — `0★` and "not researched"
//    are different facts.
//  * Every item name with `nameKind: 'item'` is verified to exist in the GMS v270
//    catalogue (`items/catalogue.json`), except the documented post-v270 names in
//    `NAMES_NOT_IN_V270_CATALOGUE`. `gear-progression.spec.ts` enforces this — it
//    is the guard against a confidently wrong item name.
//  * `maxStars` is the MECHANICAL cap (wiki `starForceEnhancements`, which agrees
//    with `starforce.ts` MAX_STARS_BY_LEVEL everywhere checked). It is never a
//    target. The target is `stop.stars`.
//  * No new dependencies. Boss data is referenced by id into `bosses.ts` rather
//    than copied, so it cannot drift.

import { capabilities, normalizeItemName, resolveByName, type CatalogueSlot } from './items';
import { SETS } from './sets';
import { getBoss, fivePercentHp, forceRequirement, type Boss } from './bosses';

/** Slot family a path belongs to. Coarser than `schema.Slot` (one `ring`, not `ring1..4`). */
export type GearSlot = CatalogueSlot;

/* -------------------------------------------------------------------------- */
/* Stopping points                                                             */
/* -------------------------------------------------------------------------- */

/**
 * Potential grade to stop at on a stage.
 * `none` means the item cannot take potential at all (badge, medal, pocket).
 */
export type PotentialTarget = 'none' | 'epic' | 'unique' | 'legendary';

/**
 * How much flame investment a stage earns.
 * - `not-applicable` — the slot cannot take bonus stats at all. Secondary, emblem,
 *   badge, medal, ring, android, heart, shoulder and totem are flame-ineligible
 *   (`items/rules.ts` `flame-ineligible-slot`; DTQ lists the same slots).
 * - `none`  — do not spend flames here (research §7.2).
 * - `opportunistic` — use spare/low-tier flames only; do not buy or farm for it.
 * - `invest` — worth farming Powerful/Eternal Rebirth Flames for (UG: "try using
 *   them on items you'd be keeping for a while like CRA").
 */
export type FlameTarget = 'not-applicable' | 'none' | 'opportunistic' | 'invest';

/**
 * The prescribed investment ceiling for one stage. This is the core of the module.
 *
 * `stars` is where you stop and move on. `starsOnEvent` is the higher number that
 * is only correct once this stage is the LAST stage of its path and a Sunny Sunday
 * / Shining Star Force event is running (GL: the Shining event is "the best
 * opportunity to Star Force your gear especially to 17-star"). When `starsOnEvent`
 * equals `stars`, the guides explicitly decline to push further.
 */
export interface StopPoint {
	/** Stop star forcing here. `undefined` = the item takes no star force. */
	stars?: number;
	/** Push to here only on an event, and only when this is the final stage. */
	starsOnEvent?: number;
	/** Potential grade to stop at. */
	potential: PotentialTarget;
	/** Main-stat % to aim for at that grade, when the guides name one. */
	mainStatPct?: number;
	/** Number of useful lines to aim for, when the guides name one. */
	usefulLines?: number;
	flames: FlameTarget;
	/** One sentence a user can read next to a suppressed or capped candidate. */
	why: string;
	/** True when the guides disagree; see `disputed` on the stage. */
	sources: readonly string[];
}

/* -------------------------------------------------------------------------- */
/* Stages and paths                                                            */
/* -------------------------------------------------------------------------- */

/** Gear-tier id, used to join a stage to its gate in `GEAR_GATES`. */
export type TierId =
	| 'starter-140'
	| 'boss-acc-low'
	| 'boss-acc-mid'
	| 'gollux-lower'
	| 'gollux-superior'
	| 'cra'
	| 'absolab'
	| 'arcane-umbra'
	| 'eternal'
	| 'genesis'
	| 'dawn'
	| 'crafted-ring'
	| 'commerci'
	| 'event'
	| 'fixed'
	| 'pitched'
	| 'brilliant';

/**
 * How a stage claims item names beyond its literal `name` and `examples`.
 *
 * WHY THIS IS NOT JUST A PREFIX. A `nameKind: 'family'` stage covers one item PER
 * JOB BRANCH — there are ~20 Fafnir weapons, ~20 Arcane Umbra weapons and five
 * per-branch names for every armour piece. Enumerating three examples can never
 * cover that, and a bare substring match is actively dangerous: `starforce.ts`
 * was already burned by a bare `'genesis'` catching the Genesis Badge, the
 * Genesis Bandana, a "Bond of Destiny" cape and four "…Destiny" medals.
 *
 * The fix there — `MAX_STAR_EXCEPTIONS` — is the pattern copied here: a matcher
 * is ANCHORED at the start of the name and SLOT-SCOPED, so a badge can never
 * match a weapon family. `slots` is mandatory for that reason.
 */
export interface StageMatch {
	/**
	 * Slots this stage may ever claim. Mandatory — this is the guard that stops a
	 * medal or badge matching a weapon family.
	 */
	slots: readonly GearSlot[];
	/**
	 * Name prefixes, matched against the normalised name at a word boundary.
	 * Anchored at the start, never a bare substring.
	 */
	prefixes?: readonly string[];
	/**
	 * Catalogue set names (matched as a prefix, so "Root Abyss Set" covers
	 * "Root Abyss Set (Warrior)" and its four siblings). Safer than string
	 * matching for armour, because the catalogue already knows set membership.
	 */
	sets?: readonly string[];
	/**
	 * Claims items the CATALOGUE says cannot be star forced at all. A capability
	 * is a far better signal than a name for this class — there are ~130 such
	 * rings and no naming convention unites them ("Eternal Flame Ring",
	 * "Ring of Restraint", "Libae's Prototype R Ring", "Heroic Awake Ring").
	 * Every ring on the damage ladder IS star-forceable, so this cannot collide
	 * with one. Requires a known slot.
	 */
	nonStarforceable?: boolean;
	/**
	 * Last-resort claim on the whole slot. Only correct where every item in the
	 * slot gets identical advice — secondaries and emblems, which take no star
	 * force and no flames, so "cube it and stop" is true of all of them. Requires
	 * a known slot; never fires on a bare name.
	 */
	slotFallback?: boolean;
}

export interface PathStage {
	/** Stable id, unique within the whole module. */
	id: string;
	/**
	 * Exact GMS item name (`nameKind: 'item'`) or the tier/set family
	 * (`nameKind: 'family'`) when the real name is job-branch specific.
	 */
	name: string;
	nameKind: 'item' | 'family';
	/** Verified per-branch item names. Only meaningful for `nameKind: 'family'`. */
	examples?: readonly string[];
	itemLevel?: number;
	setName?: string;
	tier: TierId;
	/** Mechanical star cap (wiki `starForceEnhancements`). NEVER a target. */
	maxStars?: number;
	/**
	 * Slot-scoped matchers for the branch names `examples` cannot enumerate.
	 * Omit only when the stage is a single, fixed item.
	 */
	match?: StageMatch;
	/** Where the item comes from, in prose. */
	obtainedFrom: string;
	/** Boss ids into `bosses.ts`, when a boss drops it. */
	bossIds?: readonly string[];
	stop: StopPoint;
	/** The condition under which you leave this stage for the next one. */
	movesOnWhen?: string;
	/** True when this stage may be skipped, with the condition in `movesOnWhen`. */
	skippable?: boolean;
	/** Set when the guides disagree about this stage; the prose says how. */
	disputed?: string;
	/** True for Pitched/Brilliant endpoints. NEVER rank these. See OUT_OF_SCOPE. */
	outOfScope?: boolean;
}

export interface SlotPath {
	id: string;
	slot: GearSlot;
	label: string;
	/**
	 * `only`        — every character takes this path; there is no branch.
	 * `default`     — the path taken unless `branchCondition` on an alternative fires.
	 * `alternative` — taken only when its `branchCondition` holds.
	 */
	kind: 'only' | 'default' | 'alternative';
	/** Required when `kind !== 'only'`: the condition that selects this path. */
	branchCondition?: string;
	stages: readonly PathStage[];
}

/* -------------------------------------------------------------------------- */
/* Shared stop points                                                          */
/* -------------------------------------------------------------------------- */

// Reusing these keeps the "why" text identical everywhere the same reasoning
// applies, and keeps this file readable. Each cites the research section.

/** UG P1: "Get all items except magnus cape, boots, and belt 10 star max". */
const STOP_STARTER_ACCESSORY: StopPoint = {
	stars: 10,
	starsOnEvent: 10,
	potential: 'epic',
	mainStatPct: 6,
	flames: 'none',
	why:
		'Early boss accessory. 10 stars and Epic 6% main stat is the whole job — its ' +
		'successor arrives from a daily or weekly boss you can already reach, and any ' +
		'potential above Epic is destroyed if you transfer-hammer into that successor.',
	sources: ['research §2.4, §4.3 — UG Phase 1; DTQ early-game table']
};

/** DTQ early table: Pensalir armour 10 stars, weapon 12. GL: "12-stars on each item". */
const STOP_STARTER_ARMOUR: StopPoint = {
	stars: 10,
	starsOnEvent: 10,
	potential: 'epic',
	flames: 'none',
	why:
		'Lv 140 mob gear. Fill the slot and star it cheaply so you can kill things — ' +
		'GL: "It does not matter if the gear will be replaced, this will help you to ' +
		'defeat enemies." Stop at 10 stars; boss gear replaces it within a tier.',
	sources: ['research §3, §4.3 — DTQ early-game table; GL "12-stars on each item is suggested"']
};

/** The universal mid-tier number. See research §4.2 for why it is 17 and not 18. */
const STOP_17_EPIC_TRANSFER: StopPoint = {
	stars: 17,
	starsOnEvent: 17,
	potential: 'epic',
	mainStatPct: 6,
	flames: 'opportunistic',
	why:
		'17 stars is the last star Safeguard protects, and this stage is replaced before ' +
		'the unprotected 18-plus climb pays off. Epic 6% (Unique 15% if cubes are free) ' +
		'because anything above Epic is lost when you transfer-hammer into the successor.',
	sources: [
		'research §2.3, §4.2, §4.3 — UG Phase 2; DTQ mid-game table; GL Upgrading & Enhancing (transfer hammer drops potential to Epic)'
	]
};

/** Terminal-for-a-long-time gear: 17 now, 21-22 on event once nothing better is reachable. */
const STOP_17_THEN_22_LEGENDARY: StopPoint = {
	stars: 17,
	starsOnEvent: 22,
	potential: 'legendary',
	mainStatPct: 15,
	usefulLines: 3,
	flames: 'invest',
	why:
		'You keep this for a long time, so it earns Legendary potential and real flames. ' +
		'Take it to 17 first (Safeguard-protected), then push 21-22 on a Star Force event ' +
		'with backups. 22 is the practical ceiling on COST, not because the band above it ' +
		'is worthless: main stat does freeze at 22, but ATT keeps climbing. What stops you ' +
		'is that Safeguard ends at 17 and the expected cost per further star is not ' +
		'recoverable — 22 to 30 runs ~2.4e7 attempts and ~1.1e6 destroyed copies.',
	sources: [
		'research §4.2, §4.3 — UG Phase 2/3; DTQ mid 17 / end 22; UG Phase 4 "22 star everything"; starforce.ts STAR_RATES + TRACE_RECOVERY'
	]
};

/* -------------------------------------------------------------------------- */
/* The paths                                                                   */
/* -------------------------------------------------------------------------- */

/**
 * The ordered path through each slot, with the prescribed stopping point per stage.
 * Research §3. Armour stages are families; `examples` holds catalogue-verified
 * per-branch names (Warrior branch shown, since the priority classes span all five).
 */
export const SLOT_PATHS: readonly SlotPath[] = [
	/* ---------------------------------------------------------------- weapon */
	{
		id: 'weapon',
		slot: 'weapon',
		label: 'Weapon',
		kind: 'only',
		stages: [
			{
				id: 'weapon-utgard',
				name: 'Utgard / Pensalir weapon',
				nameKind: 'family',
				examples: ['Utgard Axe', 'Utgard Bow', 'Utgard Cane'],
				itemLevel: 140,
				tier: 'starter-140',
				maxStars: 30,
				match: { slots: ['weapon'], prefixes: ['utgard'] },
				obtainedFrom: 'Lv 130+ monster drops',
				stop: {
					stars: 12,
					starsOnEvent: 12,
					potential: 'epic',
					flames: 'none',
					why: 'Starter weapon. DTQ gives it 12 stars; CRA or AbsoLab replaces it within a tier.',
					sources: [
						'research §3 — DTQ early-game table: Pensalir (Utgard) / Weapon / Epic / 12 Stars'
					]
				},
				movesOnWhen: 'You can clear or be carried in Chaos Vellum (entry Lv 180).'
			},
			{
				id: 'weapon-cra',
				name: 'CRA weapon (Fafnir)',
				nameKind: 'family',
				examples: ['Fafnir Mistilteinn', 'Fafnir Ancient Bow', 'Fafnir Mana Cradle'],
				itemLevel: 150,
				setName: 'Root Abyss Set',
				tier: 'cra',
				maxStars: 30,
				match: { slots: ['weapon'], prefixes: ['fafnir'], sets: ['Root Abyss Set'] },
				obtainedFrom: 'Chaos Vellum (Chaos Root Abyss)',
				bossIds: ['chaos-vellum'],
				stop: {
					stars: 17,
					starsOnEvent: 17,
					potential: 'legendary',
					usefulLines: 2,
					flames: 'invest',
					why:
						'The CRA weapon carries you through Lomien. Legendary ATT% because weapon ' +
						'potential is the single largest damage lever; 17 stars because AbsoLab or ' +
						'Arcane replaces the weapon well before an unprotected 18+ climb pays off.',
					sources: [
						'research §3, §7.1 — UG Phase 2 items; GL "Weapon, Secondary Weapon, and Emblem to unique first"'
					]
				},
				movesOnWhen: 'AbsoLab coins/materials are in hand, or a Lomien weapon box drops.'
			},
			{
				id: 'weapon-absolab',
				name: 'AbsoLab weapon',
				nameKind: 'family',
				examples: ['AbsoLab Saber', 'AbsoLab Sureshot Bow', 'AbsoLab Shining Rod'],
				itemLevel: 160,
				setName: 'AbsoLab Set',
				tier: 'absolab',
				maxStars: 30,
				match: { slots: ['weapon'], prefixes: ['absolab'], sets: ['AbsoLab Set'] },
				obtainedFrom: 'AbsoLab dailies (Scrapyard / Dark World Tree) + Lotus & Damien materials',
				bossIds: ['normal-lotus', 'normal-damien'],
				stop: {
					stars: 17,
					starsOnEvent: 17,
					potential: 'unique',
					usefulLines: 2,
					flames: 'opportunistic',
					why:
						'Bridge weapon between Lomien and Lucid. 17 stars, and do not push further — ' +
						'Arcane Umbra arrives from Lucid (entry Lv 220) in the same levelling run.',
					sources: ['research §3, §4.3 — DTQ mid-game table: Absolab / Weapon / 17 Stars']
				},
				skippable: true,
				movesOnWhen:
					'Skippable: UG Phase 1 — "If you have CRA wep, you can hold off on getting the ' +
					'Absolab weapon until you are in Phase 2 ... and save the Absolab resources for a boss mule."'
			},
			{
				id: 'weapon-arcane',
				name: 'Arcane Umbra weapon',
				nameKind: 'family',
				examples: ['Arcane Umbra Saber', 'Arcane Umbra Bow', 'Arcane Umbra Shining Rod'],
				itemLevel: 200,
				setName: 'Arcane Umbra Set',
				tier: 'arcane-umbra',
				maxStars: 30,
				match: { slots: ['weapon'], prefixes: ['arcane umbra'], sets: ['Arcane Umbra Set'] },
				obtainedFrom: 'Lucid / Will (Arcane Umbra Weapon Box)',
				bossIds: ['normal-lucid', 'normal-will'],
				stop: {
					stars: 17,
					starsOnEvent: 17,
					potential: 'legendary',
					usefulLines: 3,
					flames: 'invest',
					why:
						'UG: "Arcane Weapon should be 17 stars (DO NOT SURPASS 17)" — the Genesis weapon ' +
						'arrives at a FIXED 22 stars after 8 monthly Black Mage clears, so stars bought ' +
						'here are discarded. Potential and flames are worth it; stars are not.',
					sources: ['research §4.4 — UG Phase 3 (17, hard stop); DTQ end-game table (22)']
				},
				disputed:
					'UG says 17 and "DO NOT SURPASS"; DTQ end-game table gives the weapon slot 22. ' +
					'UG is the more specific claim and the only one that reasons about replacement.',
				movesOnWhen: 'Genesis liberation completes (8 Hard Black Mage clears, monthly reset).'
			},
			{
				id: 'weapon-genesis',
				name: 'Genesis weapon',
				nameKind: 'family',
				examples: ['Genesis Saber', 'Genesis Bow', 'Genesis Shining Rod'],
				itemLevel: 200,
				setName: 'Eternal Set',
				tier: 'genesis',
				maxStars: 22,
				match: { slots: ['weapon'], prefixes: ['genesis'] },
				obtainedFrom: 'Black Mage liberation — 8 clears, monthly reset',
				bossIds: ['hard-black-mage'],
				stop: {
					stars: 22,
					starsOnEvent: 22,
					potential: 'legendary',
					usefulLines: 3,
					flames: 'invest',
					why:
						'Granted at a fixed 22 stars and cannot be star forced at all, so there is no ' +
						'star candidate here. Cube to 3-line ATT% and flame it; that is the whole job.',
					sources: [
						'research §3 — items/rules.ts liberated-weapon-fixed-star; https://maplestorywiki.net/w/Genesis_Weapon; UG Phase 4'
					]
				}
			}
		]
	},

	/* ------------------------------------------------------------- secondary */
	{
		id: 'secondary',
		slot: 'secondary',
		label: 'Secondary weapon',
		kind: 'only',
		stages: [
			{
				id: 'secondary-lv100',
				name: 'Lv 100 vendor secondary',
				nameKind: 'family',
				examples: ['Ruin Force Shield', 'Karma Orb', 'Deimos Warrior Shield', 'Imugi Gem'],
				itemLevel: 100,
				tier: 'starter-140',
				match: { slots: ['secondary'], slotFallback: true },
				obtainedFrom: 'Secondary Weapon Vendor, Leafre (500k mesos)',
				stop: {
					potential: 'legendary',
					usefulLines: 2,
					flames: 'not-applicable',
					why:
						'Secondaries take no star force and no flames, so cubing is the only lever — and ' +
						'the potential is never wasted, because the Lv 140 replacement is only marginally ' +
						'better. GL puts Weapon/Secondary/Emblem first for exactly this reason.',
					sources: [
						'research §3, §7.1 — GL "Weapon, Secondary Weapon, and Emblem to unique first"; UG Phase 1; DTQ "cannot be Star Force\'d"'
					]
				},
				movesOnWhen: 'Princess No fragments collected (3-4 kills).'
			},
			{
				id: 'secondary-princess-no',
				name: "Princess No's secondary",
				nameKind: 'family',
				examples: [
					"Princess No's Soul Shield",
					"Princess No's Poisoned Sword",
					"Princess No's Carte"
				],
				itemLevel: 140,
				tier: 'fixed',
				match: { slots: ['secondary'], prefixes: ["princess no's"] },
				obtainedFrom: 'Princess No fragments',
				bossIds: ['normal-princess-no'],
				stop: {
					potential: 'legendary',
					usefulLines: 3,
					flames: 'not-applicable',
					why:
						'Terminal for the life of the character — no secondary replaces it. 3 lines of ' +
						'ATT% / Boss% / IED. No stars, no flames possible.',
					sources: [
						'research §3 — DTQ mid & end tables; UG Phase 3 "Emblem and Secondary should have 5 useful lines"'
					]
				}
			}
		]
	},

	/* ---------------------------------------------------------------- emblem */
	{
		id: 'emblem',
		slot: 'emblem',
		label: 'Emblem',
		kind: 'only',
		stages: [
			{
				id: 'emblem-gold-maple',
				name: 'Gold Maple Leaf Emblem',
				nameKind: 'item',
				itemLevel: 100,
				tier: 'fixed',
				match: { slots: ['emblem'], slotFallback: true },
				obtainedFrom: 'Quest reward',
				stop: {
					potential: 'legendary',
					usefulLines: 3,
					flames: 'not-applicable',
					why:
						'Best-in-slot for practical purposes and never replaced (the only successor is a ' +
						'Pitched item). No stars, no flames — cube it to 3 lines of ATT% and stop.',
					sources: [
						'research §3 — DTQ "best-in-slot ... you can cube this to perfect stats"; UG Phase 3. DTQ calls it "Gold Knight\'s Emblem"; the GMS name is Gold Maple Leaf Emblem.'
					]
				}
			},
			{
				id: 'emblem-mitra',
				name: "Mitra's Rage: Warrior",
				nameKind: 'family',
				examples: [
					"Mitra's Rage: Warrior",
					"Mitra's Rage: Magician",
					"Mitra's Rage: Bowman",
					"Mitra's Rage: Thief",
					"Mitra's Rage: Pirate"
				],
				itemLevel: 200,
				setName: 'Pitched Boss Set',
				tier: 'pitched',
				match: { slots: ['emblem'], prefixes: ["mitra's rage"] },
				obtainedFrom: "Chosen Seren — Mitra's Rage Selection Box",
				bossIds: ['normal-chosen-seren', 'hard-chosen-seren'],
				outOfScope: true,
				stop: {
					potential: 'legendary',
					usefulLines: 3,
					flames: 'not-applicable',
					why: 'Pitched Boss Set item — a long-term goal, never a ranked upgrade. See OUT_OF_SCOPE.',
					sources: ['research §6 — https://maplestorywiki.net/w/Mitra%27s_Rage:_Warrior']
				}
			}
		]
	},

	/* --------------------------------------------------------- hat/top/bottom */
	{
		id: 'armour-core',
		slot: 'hat',
		label: 'Hat / Top / Bottom (Overall)',
		kind: 'only',
		stages: [
			{
				id: 'armour-core-pensalir',
				name: 'Pensalir',
				nameKind: 'family',
				examples: ['Pensalir Battle Helm', 'Pensalir Battle Mail'],
				itemLevel: 140,
				tier: 'starter-140',
				maxStars: 30,
				match: { slots: ['hat', 'top', 'bottom', 'overall'], prefixes: ['pensalir'] },
				obtainedFrom: 'Lv 130+ monster drops',
				stop: STOP_STARTER_ARMOUR,
				movesOnWhen: 'You can clear or be carried in Chaos Root Abyss (entry Lv 180).'
			},
			{
				id: 'armour-core-cra',
				name: 'CRA hat / top / bottom',
				nameKind: 'family',
				examples: ['Royal Warrior Helm', 'Eagle Eye Warrior Armor', 'Trixter Warrior Pants'],
				itemLevel: 150,
				setName: 'Root Abyss Set',
				tier: 'cra',
				maxStars: 30,
				match: {
					slots: ['hat', 'top', 'bottom', 'overall'],
					prefixes: ['eagle eye', 'trixter'],
					sets: ['Root Abyss Set']
				},
				obtainedFrom: 'Chaos Pierre (hat), Chaos Crimson Queen (top), Chaos Von Bon (bottom)',
				bossIds: ['chaos-pierre', 'chaos-crimson-queen', 'chaos-von-bon'],
				stop: STOP_17_THEN_22_LEGENDARY,
				movesOnWhen:
					'Only Kalos (Eternal) displaces CRA here — roughly Lv 265+. Until then this is ' +
					'the stage, and UG Phase 3 puts it at 21-22 stars.'
			},
			{
				id: 'armour-core-eternal',
				name: 'Eternal hat / top / bottom',
				nameKind: 'family',
				examples: ['Eternal Knight Helm', 'Eternal Knight Armor', 'Eternal Knight Pants'],
				itemLevel: 250,
				setName: 'Eternal Set',
				tier: 'eternal',
				maxStars: 30,
				match: {
					slots: ['hat', 'top', 'bottom', 'overall'],
					prefixes: ['eternal'],
					sets: ['Eternal Set']
				},
				obtainedFrom: "Kalos — Kalos's Residual Determination",
				bossIds: ['easy-kalos', 'normal-kalos', 'chaos-kalos'],
				stop: {
					stars: 22,
					starsOnEvent: 22,
					potential: 'legendary',
					usefulLines: 3,
					flames: 'invest',
					why:
						'End of the path — everything goes in here. Stop at 22: main stat freezes at 22 ' +
						'while ATT carries on climbing, so the band above is not worthless, but there is ' +
						'no Safeguard past 17 and 22 to 30 costs about 24 million attempts and 1.1 ' +
						'million destroyed copies in expectation. No guide recommends going past 22.',
					sources: [
						'research §4.2, §4.3 — DTQ end-game table; UG Phase 4 "22 star everything (other than pitched)"; starforce.ts STAR_RATES + TRACE_RECOVERY'
					]
				}
			}
		]
	},

	/* --------------------------------------------- shoes/gloves/cape/shoulder */
	{
		id: 'armour-outer',
		slot: 'shoes',
		label: 'Shoes / Gloves / Cape / Shoulder',
		kind: 'only',
		stages: [
			{
				id: 'armour-outer-pensalir',
				name: 'Pensalir + Royal Black Metal Shoulder',
				nameKind: 'family',
				examples: [
					'Pensalir Battle Boots',
					'Pensalir Battle Gloves',
					'Pensalir Battle Cape',
					'Royal Black Metal Shoulder'
				],
				itemLevel: 140,
				tier: 'starter-140',
				maxStars: 30,
				match: { slots: ['shoes', 'gloves', 'cape', 'shoulder'], prefixes: ['pensalir'] },
				obtainedFrom: 'Lv 130+ monster drops; shoulder from Easy/Normal Magnus',
				bossIds: ['normal-magnus'],
				stop: STOP_STARTER_ARMOUR,
				movesOnWhen: 'AbsoLab coins from Scrapyard / Dark World Tree weeklies + Lomien materials.'
			},
			{
				id: 'armour-outer-absolab',
				name: 'AbsoLab armour',
				nameKind: 'family',
				examples: [
					'AbsoLab Knight Shoes',
					'AbsoLab Knight Gloves',
					'AbsoLab Knight Cape',
					'AbsoLab Knight Shoulder',
					'AbsoLab Knight Helm',
					'AbsoLab Knight Suit'
				],
				itemLevel: 160,
				setName: 'AbsoLab Set',
				tier: 'absolab',
				maxStars: 30,
				match: {
					slots: ['hat', 'top', 'bottom', 'overall', 'shoes', 'gloves', 'cape', 'shoulder'],
					prefixes: ['absolab'],
					sets: ['AbsoLab Set']
				},
				obtainedFrom: 'AbsoLab dailies (Scrapyard / Dark World Tree) + Lotus & Damien materials',
				bossIds: ['normal-lotus', 'normal-damien'],
				stop: {
					...STOP_17_EPIC_TRANSFER,
					why:
						'This is the AbsoLab stopping point. 17 stars, Epic 6% (Unique 15% only if cubes ' +
						'are free). Arcane Umbra drops from Lucid at entry Lv 220 — the same Arcane River ' +
						'run during which AbsoLab is farmed — so AbsoLab is worn for roughly 40 levels. ' +
						'Neither guide ever puts AbsoLab at 22 stars: DTQ gives it 17 in the mid-game ' +
						'table and drops it from the end-game table entirely.',
					sources: [
						'research §4.3 — UG Phase 2 ("Abso items will be replaced with Arcane eventually"); DTQ mid-game table 17 Stars; DTQ end-game table omits AbsoLab'
					]
				},
				movesOnWhen:
					'Lucid or Will becomes clearable or carryable (Lucid entry Lv 220, Arcane Force 360). ' +
					'UG carve-out: if levelling outruns the Arcane time gates, keep upgrading AbsoLab to ' +
					'stay in content.'
			},
			{
				id: 'armour-outer-arcane',
				name: 'Arcane Umbra armour',
				nameKind: 'family',
				examples: [
					'Arcane Umbra Knight Shoes',
					'Arcane Umbra Knight Gloves',
					'Arcane Umbra Knight Cape',
					'Arcane Umbra Knight Shoulder',
					'Arcane Umbra Knight Hat',
					'Arcane Umbra Knight Suit'
				],
				itemLevel: 200,
				setName: 'Arcane Umbra Set',
				tier: 'arcane-umbra',
				maxStars: 30,
				match: {
					slots: ['hat', 'top', 'bottom', 'overall', 'shoes', 'gloves', 'cape', 'shoulder'],
					prefixes: ['arcane umbra'],
					sets: ['Arcane Umbra Set']
				},
				obtainedFrom: 'Lucid / Will (Arcane Umbra Armor Box)',
				bossIds: ['easy-lucid', 'normal-lucid', 'easy-will', 'normal-will'],
				stop: {
					stars: 17,
					starsOnEvent: 22,
					potential: 'legendary',
					mainStatPct: 23,
					usefulLines: 3,
					flames: 'invest',
					why:
						'UG: "Arcane items should all be 17 stars first, then 3 Line Legendary with 23%+ ' +
						'Stat each" — stars before cubes at the tier transition, then push 21-22 on an ' +
						'event. DTQ: this gear "is quite easy to get, so getting it to 22 Star should be ' +
						'the priority as soon as possible."',
					sources: ['research §4.3 — UG Phase 3; DTQ end-game table 22 Stars']
				},
				movesOnWhen:
					'Kalos becomes clearable (entry Lv 265, Sacred Force 200+). Disputed — see below.',
				disputed:
					"DTQ's end-game table keeps Arcane in these four slots and puts Eternal only in " +
					'hat/top/bottom, while the Eternal cape/shoes/gloves/shoulder items do exist at ' +
					'Lv 250 / 30 stars on the wiki and in sets.json. Treat the Eternal stage here as far.'
			},
			{
				id: 'armour-outer-eternal',
				name: 'Eternal cape / shoes / gloves / shoulder',
				nameKind: 'family',
				examples: [
					'Eternal Knight Cape',
					'Eternal Knight Shoes',
					'Eternal Knight Gloves',
					'Eternal Knight Shoulder'
				],
				itemLevel: 250,
				setName: 'Eternal Set',
				tier: 'eternal',
				maxStars: 30,
				match: {
					slots: ['shoes', 'gloves', 'cape', 'shoulder'],
					prefixes: ['eternal'],
					sets: ['Eternal Set']
				},
				obtainedFrom: "Kalos — Kalos's Residual Determination",
				bossIds: ['easy-kalos', 'normal-kalos', 'chaos-kalos'],
				stop: {
					stars: 22,
					starsOnEvent: 22,
					potential: 'legendary',
					usefulLines: 3,
					flames: 'invest',
					why:
						'End of the path. Stop at 22 — main stat freezes there but ATT does not, so the ' +
						'reason to stop is cost and risk (no Safeguard past 17), not a worthless band.',
					sources: [
						'research §4.2, §7 — wiki Eternal Knight Cape/Gloves; DTQ end-game table; UG Phase 4'
					]
				},
				disputed:
					"DTQ's end-game table keeps Arcane Umbra in these slots. The items exist; whether " +
					'they are the practical GMS Heroic endpoint today is unverified (research §8.4).'
			}
		]
	},

	/* -------------------------------------------------------------- earrings */
	{
		id: 'earrings',
		slot: 'earrings',
		label: 'Earrings',
		kind: 'only',
		stages: [
			{
				id: 'earrings-boss-accessory',
				name: "Will o' the Wisps / Dea Sidus Earring",
				nameKind: 'family',
				examples: ["Will o' the Wisps", 'Dea Sidus Earring'],
				itemLevel: 130,
				setName: 'Boss Accessory Set',
				tier: 'boss-acc-mid',
				maxStars: 20,
				match: { slots: ['earrings'] },
				obtainedFrom:
					"Hard Hilla (Will o' the Wisps); Horntail / Chaos Horntail (Dea Sidus Earring)",
				bossIds: ['hard-hilla', 'chaos-horntail'],
				stop: {
					stars: 10,
					starsOnEvent: 12,
					potential: 'epic',
					mainStatPct: 6,
					flames: 'none',
					why:
						"Lv 130 stepping stone that physically caps at 20 stars, against its successor's " +
						'30. Wear it, star it to 10, Epic 6% main stat, and move on — Superior Gollux ' +
						'Earrings come from a DAILY boss (Hell Gollux) or 700 Gollux Coins, so the wait is ' +
						'weeks. Do not 3-line it and do not flame it. The two Lv 130 earrings are ' +
						'interchangeable — take whichever drops first.',
					sources: [
						'research §2.4 — https://maplestorywiki.net/w/Will_o%27_the_Wisps and https://maplestorywiki.net/w/Dea_Sidus_Earring (both starForceEnhancements=20); UG Phase 1; DTQ early-game table'
					]
				},
				movesOnWhen: '700 Gollux Coins saved, or a Superior Gollux Earrings drop from Hell Gollux.'
			},
			{
				id: 'earrings-superior-gollux',
				name: 'Superior Gollux Earrings',
				nameKind: 'item',
				itemLevel: 150,
				setName: 'Superior Gollux Set',
				tier: 'gollux-superior',
				maxStars: 30,
				match: { slots: ['earrings'] },
				obtainedFrom: 'Hell Gollux drop, or 700 Gollux Coins from Lucia',
				bossIds: ['hard-gollux'],
				stop: {
					stars: 17,
					starsOnEvent: 22,
					potential: 'unique',
					mainStatPct: 15,
					flames: 'invest',
					why:
						'The keeper. Part of the Superior Gollux 4-set (+30% Boss Damage, +30% IED). ' +
						'17 stars now, 22 on an event once you have Hellux backups. UG: cube to Legendary ' +
						'instead of Unique only "if you are getting consistent Hellux carries" — otherwise ' +
						'stay Epic/Unique and transfer-hammer a Reinforced belt or Pink Bean belt in.',
					sources: [
						'research §3 — UG Phase 2; DTQ mid 17 / end 22; sets.json Superior Gollux Set 4-set (screenshot-verified)'
					]
				},
				movesOnWhen:
					'Nothing on the normal path replaces it. The only successors are the Dawn earring ' +
					'(which costs the Gollux 4-set) and the Pitched earring (out of scope).'
			},
			{
				id: 'earrings-estella',
				name: 'Estella Earrings',
				nameKind: 'item',
				itemLevel: 160,
				setName: 'Dawn Boss Set',
				tier: 'dawn',
				maxStars: 30,
				match: { slots: ['earrings'] },
				obtainedFrom: 'Normal/Chaos Gloom, Normal/Hard Darknell',
				bossIds: ['normal-gloom', 'normal-darknell'],
				stop: {
					stars: 17,
					starsOnEvent: 22,
					potential: 'legendary',
					flames: 'invest',
					why:
						'Only take this if you are assembling the Dawn 4-set — it costs you the Superior ' +
						'Gollux 4-set (+30% Boss / +30% IED) in exchange for the Dawn 4-set (+10% Boss / ' +
						'+10% IED plus stats). Neither guide takes it; both keep Superior Gollux.',
					sources: [
						'research §3, §6.1 — https://maplestorywiki.net/w/Dawn_Boss_Set; GL Dawn Boss Accessories'
					]
				}
			},
			{
				id: 'earrings-commanding-force',
				name: 'Commanding Force Earring',
				nameKind: 'item',
				itemLevel: 200,
				setName: 'Pitched Boss Set',
				tier: 'pitched',
				maxStars: 30,
				match: { slots: ['earrings'] },
				obtainedFrom: 'Hard Darknell (weekly)',
				bossIds: ['hard-darknell'],
				outOfScope: true,
				stop: {
					stars: 22,
					starsOnEvent: 22,
					potential: 'legendary',
					flames: 'invest',
					why:
						'Pitched Boss Set — a long-term goal, never a ranked upgrade. If one does drop, ' +
						'UG: pitched items are "only really worth using if they\'re 22star in most cases".',
					sources: ['research §6 — UG Phase 4; DTQ end-game table']
				}
			}
		]
	},

	/* ------------------------------------------------------------------ face */
	{
		id: 'face-default',
		slot: 'face',
		label: 'Face accessory',
		kind: 'default',
		branchCondition: 'You can get into Lucid or Will parties (entry Lv 220 / 235).',
		stages: [
			{
				id: 'face-condensed-power-crystal',
				name: 'Condensed Power Crystal',
				nameKind: 'item',
				itemLevel: 110,
				setName: 'Boss Accessory Set',
				tier: 'boss-acc-low',
				maxStars: 10,
				obtainedFrom: 'Normal / Chaos Zakum',
				bossIds: ['chaos-zakum'],
				stop: {
					...STOP_STARTER_ACCESSORY,
					why:
						'Caps at 10 stars mechanically, which is also the prescribed target — there is ' +
						'nothing above its own ceiling to buy. Epic main stat and move on.',
					sources: [
						'research §2.2 — https://maplestorywiki.net/w/Condensed_Power_Crystal (starForceEnhancements=10); DTQ early "Epic, Main Stat / 10 Stars"'
					]
				},
				movesOnWhen: 'Twilight Mark drops from Normal Lucid or Normal Will.'
			},
			{
				id: 'face-twilight-mark',
				name: 'Twilight Mark',
				nameKind: 'item',
				itemLevel: 140,
				setName: 'Dawn Boss Set',
				tier: 'dawn',
				maxStars: 30,
				match: { slots: ['face'] },
				obtainedFrom: 'Normal or Hard Lucid, Normal or Hard Will',
				bossIds: ['normal-lucid', 'normal-will'],
				stop: STOP_17_THEN_22_LEGENDARY,
				movesOnWhen:
					'Nothing on the normal path replaces it (the successor, Berserked, is Pitched). ' +
					'With the Dawn Guardian Angel Ring it gives the Dawn 2-set, +10% Boss Damage.'
			},
			{
				id: 'face-berserked',
				name: 'Berserked',
				nameKind: 'item',
				itemLevel: 160,
				setName: 'Pitched Boss Set',
				tier: 'pitched',
				maxStars: 30,
				obtainedFrom: 'Hard / Extreme Lotus (weekly)',
				bossIds: ['hard-lotus'],
				outOfScope: true,
				stop: {
					stars: 22,
					starsOnEvent: 22,
					potential: 'legendary',
					flames: 'invest',
					why: 'Pitched Boss Set — long-term goal, never a ranked upgrade.',
					sources: ['research §6 — https://maplestorywiki.net/w/Berserked']
				}
			},
			{
				id: 'face-original-sin-of-pride',
				name: 'Original Sin of Pride',
				nameKind: 'item',
				itemLevel: 250,
				setName: 'Brilliant Boss Set',
				tier: 'brilliant',
				maxStars: 30,
				obtainedFrom: 'Grandis endgame bosses',
				outOfScope: true,
				stop: {
					stars: 22,
					starsOnEvent: 22,
					potential: 'legendary',
					flames: 'invest',
					why: 'Brilliant Boss Set (the community "Radiant"/Grandis set) — long-term goal only.',
					sources: ['research §6 — https://maplestorywiki.net/w/Brilliant_Boss_Set']
				}
			}
		]
	},
	{
		id: 'face-commerci',
		slot: 'face',
		label: 'Face accessory (Commerci route)',
		kind: 'alternative',
		branchCondition:
			'You cannot get into Lucid / Will parties. DTQ: the Sweetwater Tattoo is "another daily ' +
			'grind, but more accessible to those who don\'t get into Lucid/Will parties."',
		stages: [
			{
				id: 'face-sweetwater-tattoo',
				name: 'Sweetwater Tattoo',
				nameKind: 'item',
				itemLevel: 160,
				tier: 'commerci',
				maxStars: 30,
				obtainedFrom: 'Commerci Voyages / Commerci Denaro from Javert',
				stop: STOP_17_THEN_22_LEGENDARY,
				movesOnWhen: 'Twilight Mark becomes available (it also carries the Dawn 2-set).'
			}
		]
	},

	/* ------------------------------------------------------------------- eye */
	{
		id: 'eye',
		slot: 'eye',
		label: 'Eye accessory',
		kind: 'only',
		stages: [
			{
				id: 'eye-aquatic-letter',
				name: 'Aquatic Letter Eye Accessory',
				nameKind: 'item',
				itemLevel: 100,
				setName: 'Boss Accessory Set',
				tier: 'boss-acc-low',
				maxStars: 8,
				obtainedFrom: 'Normal / Chaos Zakum',
				bossIds: ['chaos-zakum'],
				stop: {
					stars: 8,
					starsOnEvent: 8,
					potential: 'epic',
					mainStatPct: 6,
					flames: 'none',
					why:
						'Hard cap is 8 stars — that IS the target, there is nothing above it. DTQ early ' +
						'table agrees: "Epic, Main Stat / 8 Stars".',
					sources: [
						'research §2.2 — https://maplestorywiki.net/w/Aquatic_Letter_Eye_Accessory (starForceEnhancements=8); DTQ early-game table'
					]
				},
				movesOnWhen: 'Black Bean Mark drops from Pink Bean (daily boss).'
			},
			{
				id: 'eye-black-bean-mark',
				name: 'Black Bean Mark',
				nameKind: 'item',
				itemLevel: 135,
				setName: 'Boss Accessory Set',
				tier: 'boss-acc-mid',
				maxStars: 20,
				obtainedFrom: 'Normal / Chaos Pink Bean',
				bossIds: ['normal-pink-bean'],
				stop: { ...STOP_STARTER_ACCESSORY, starsOnEvent: 12 },
				movesOnWhen:
					'Papulatus Mark drops from Chaos Papulatus (rare), or Commerci dailies produce a ' +
					'Sweetwater Monocle.'
			},
			{
				id: 'eye-papulatus-mark',
				name: 'Papulatus Mark',
				nameKind: 'item',
				itemLevel: 145,
				setName: 'Boss Accessory Set',
				tier: 'boss-acc-mid',
				maxStars: 30,
				obtainedFrom: 'Chaos Papulatus — DTQ: "a super rare drop that not many people get"',
				bossIds: ['chaos-papulatus'],
				stop: STOP_17_THEN_22_LEGENDARY,
				movesOnWhen:
					'Terminal on the normal path. Can be transposed onto a Sweetwater Monocle for extra ' +
					'stats and higher-tier potential.'
			},
			{
				id: 'eye-sweetwater-monocle',
				name: 'Sweetwater Monocle',
				nameKind: 'item',
				itemLevel: 160,
				tier: 'commerci',
				maxStars: 30,
				match: { slots: ['eye'] },
				obtainedFrom: 'Commerci Denaro from Javert — the reliable, grind-gated route',
				stop: STOP_17_THEN_22_LEGENDARY,
				movesOnWhen: 'Terminal on the normal path (the successor, Magic Eyepatch, is Pitched).'
			},
			{
				id: 'eye-magic-eyepatch',
				name: 'Magic Eyepatch',
				nameKind: 'item',
				itemLevel: 160,
				setName: 'Pitched Boss Set',
				tier: 'pitched',
				maxStars: 30,
				obtainedFrom: 'Hard Damien (weekly)',
				bossIds: ['hard-damien'],
				outOfScope: true,
				stop: {
					stars: 22,
					starsOnEvent: 22,
					potential: 'legendary',
					flames: 'invest',
					why: 'Pitched Boss Set — long-term goal, never a ranked upgrade.',
					sources: ['research §6 — https://maplestorywiki.net/w/Magic_Eyepatch']
				}
			}
		]
	},

	/* -------------------------------------------------------------- pendants */
	{
		id: 'pendant-primary',
		slot: 'pendant',
		label: 'Pendant (first slot)',
		kind: 'only',
		stages: [
			{
				id: 'pendant-chaos-horntail',
				name: 'Chaos Horntail Necklace',
				nameKind: 'item',
				itemLevel: 120,
				setName: 'Boss Accessory Set',
				tier: 'boss-acc-low',
				maxStars: 15,
				obtainedFrom: 'Chaos Horntail (daily)',
				bossIds: ['chaos-horntail'],
				stop: STOP_STARTER_ACCESSORY,
				movesOnWhen: '700 Gollux Coins saved for the Superior Engraved Gollux Pendant.'
			},
			{
				id: 'pendant-superior-gollux',
				name: 'Superior Engraved Gollux Pendant',
				nameKind: 'item',
				itemLevel: 150,
				setName: 'Superior Gollux Set',
				tier: 'gollux-superior',
				maxStars: 30,
				match: { slots: ['pendant'] },
				obtainedFrom: '700 Gollux Coins from Lucia, or Hell Gollux drop',
				bossIds: ['hard-gollux'],
				stop: {
					stars: 17,
					starsOnEvent: 22,
					potential: 'unique',
					mainStatPct: 15,
					flames: 'invest',
					why:
						'Fourth piece of the Superior Gollux 4-set (+30% Boss Damage, +30% IED). ' +
						'17 now, 22 on an event with backups.',
					sources: ['research §3 — UG Phase 3 "Gollux - Superior 4 set"; DTQ mid 17 / end 22']
				}
			},
			{
				id: 'pendant-source-of-suffering',
				name: 'Source of Suffering',
				nameKind: 'item',
				itemLevel: 160,
				setName: 'Pitched Boss Set',
				tier: 'pitched',
				maxStars: 30,
				obtainedFrom: 'Hard Verus Hilla (weekly)',
				bossIds: ['hard-verus-hilla'],
				outOfScope: true,
				stop: {
					stars: 22,
					starsOnEvent: 22,
					potential: 'legendary',
					flames: 'invest',
					why: 'Pitched Boss Set — long-term goal, never a ranked upgrade.',
					sources: ['research §6 — https://maplestorywiki.net/w/Source_of_Suffering']
				}
			}
		]
	},
	{
		id: 'pendant-secondary',
		slot: 'pendant',
		label: 'Pendant (second slot)',
		kind: 'only',
		stages: [
			{
				id: 'pendant2-mechanator',
				name: 'Mechanator Pendant',
				nameKind: 'item',
				itemLevel: 120,
				setName: 'Boss Accessory Set',
				tier: 'boss-acc-low',
				maxStars: 15,
				obtainedFrom: 'Normal Arkarium (daily) — common drop',
				bossIds: ['normal-arkarium'],
				stop: STOP_STARTER_ACCESSORY,
				movesOnWhen: 'A Dominator Pendant drops from Arkarium (rare), or a Daybreak Pendant drops.'
			},
			{
				id: 'pendant2-dominator',
				name: 'Dominator Pendant',
				nameKind: 'item',
				itemLevel: 140,
				setName: 'Boss Accessory Set',
				tier: 'boss-acc-mid',
				maxStars: 30,
				match: { slots: ['pendant'] },
				obtainedFrom: 'Normal Arkarium — rare drop; keep spares for transfer hammering',
				bossIds: ['normal-arkarium'],
				stop: {
					stars: 15,
					starsOnEvent: 17,
					potential: 'unique',
					mainStatPct: 15,
					flames: 'opportunistic',
					why:
						'UG: "the Arkarium pendants can go to 15-17 stars if you really want to since they ' +
						"will be around forever potentially as drop gear after they're used to get you to " +
						"better equips. You can safeguard the Dominator's pendant if you'd like.\" " +
						'DTQ prefers Dominator over a second Superior Gollux pendant, because two ' +
						'Superior Gollux pendants no longer both count toward the set.',
					sources: ['research §3 — UG Phase 1; DTQ mid-game table and Second Pendant note']
				}
			},
			{
				id: 'pendant2-daybreak',
				name: 'Daybreak Pendant',
				nameKind: 'item',
				itemLevel: 140,
				setName: 'Dawn Boss Set',
				tier: 'dawn',
				maxStars: 30,
				match: { slots: ['pendant'] },
				obtainedFrom: 'Normal/Hard Verus Hilla, Normal/Hard/Extreme Chosen Seren',
				bossIds: ['normal-verus-hilla', 'normal-chosen-seren'],
				stop: STOP_17_THEN_22_LEGENDARY,
				movesOnWhen: 'Terminal on the normal path (successor Oath of Death is Brilliant).'
			},
			{
				id: 'pendant2-oath-of-death',
				name: 'Oath of Death',
				nameKind: 'item',
				itemLevel: 250,
				setName: 'Brilliant Boss Set',
				tier: 'brilliant',
				maxStars: 30,
				obtainedFrom: 'Grandis endgame bosses',
				outOfScope: true,
				stop: {
					stars: 22,
					starsOnEvent: 22,
					potential: 'legendary',
					flames: 'invest',
					why: 'Brilliant Boss Set — long-term goal only.',
					sources: ['research §6 — https://maplestorywiki.net/w/Brilliant_Boss_Set']
				}
			}
		]
	},

	/* ----------------------------------------------------------------- rings */
	{
		id: 'ring',
		slot: 'ring',
		label: 'Rings (four slots)',
		kind: 'default',
		branchCondition:
			'The damage/set rings. Event and exclusive-scroll rings are a parallel option — ' +
			'see the `ring-event` path.',
		stages: [
			{
				id: 'ring-starter',
				name: 'Starter rings',
				nameKind: 'family',
				examples: [
					'Silver Blossom Ring',
					"Noble Ifia's Ring",
					'Cracked Gollux Ring',
					'Solid Gollux Ring'
				],
				itemLevel: 110,
				setName: 'Boss Accessory Set',
				tier: 'boss-acc-low',
				maxStars: 10,
				match: { slots: ['ring'], prefixes: ['cracked gollux', 'solid gollux'] },
				obtainedFrom: "Horntail (Silver Blossom Ring); Ifia (Noble Ifia's Ring); event shops",
				bossIds: ['chaos-horntail'],
				stop: {
					...STOP_STARTER_ACCESSORY,
					flames: 'not-applicable',
					why:
						'Caps at 10 stars, which is also the target. Rings never take flames. Note the ' +
						'one legitimate reason to go Legendary later: accessories become drop/meso gear, ' +
						'and meso and drop lines require Legendary — that is a different build, not a ' +
						'damage upgrade.',
					sources: [
						'research §2.2, §7.3 — https://maplestorywiki.net/w/Silver_Blossom_Ring (starForceEnhancements=10); UG general tips'
					]
				},
				movesOnWhen: "Gollux coins, a Kanna's Treasure drop, or Accessory-crafting Meister."
			},
			{
				id: 'ring-keepers',
				name: 'Mid/late ring keepers',
				nameKind: 'family',
				examples: [
					'Superior Gollux Ring',
					'Reinforced Gollux Ring',
					"Kanna's Treasure",
					'Dawn Guardian Angel Ring',
					'Guardian Angel Ring',
					'Meister Ring'
				],
				itemLevel: 140,
				tier: 'crafted-ring',
				maxStars: 30,
				match: {
					slots: ['ring'],
					prefixes: ['superior gollux', 'reinforced gollux', 'meister ring']
				},
				obtainedFrom:
					"Gollux Coins (Superior/Reinforced); Princess No (Kanna's Treasure); Guardian " +
					'Angel Slime + Conversion Scroll (Dawn GA Ring); Accessory-crafting Meister (Meister Ring)',
				bossIds: ['hard-gollux', 'normal-princess-no', 'normal-guardian-angel-slime'],
				stop: {
					stars: 17,
					starsOnEvent: 22,
					potential: 'legendary',
					mainStatPct: 15,
					flames: 'not-applicable',
					why:
						'These four slots are a menu, not a ladder: Superior + Reinforced Gollux feed the ' +
						'Gollux set counts, Dawn Guardian Angel Ring + Twilight Mark give the Dawn 2-set ' +
						"(+10% Boss Damage), and Kanna's Treasure and the Meister Ring are pure stat " +
						"sticks. All are 30-star capable and UG names 21-22 stars on Kanna's Treasure " +
						'and the Meister Ring by name. Rings never take flames.',
					sources: [
						'research §3 — UG Phase 3 "21-22 star Kanna\'s Treasure & Meister ring"; DTQ mid/end tables'
					]
				}
			},
			{
				id: 'ring-endless-terror',
				name: 'Endless Terror',
				nameKind: 'item',
				itemLevel: 200,
				setName: 'Pitched Boss Set',
				tier: 'pitched',
				maxStars: 30,
				obtainedFrom: 'Chaos Gloom (weekly)',
				bossIds: ['chaos-gloom'],
				outOfScope: true,
				stop: {
					stars: 22,
					starsOnEvent: 22,
					potential: 'legendary',
					flames: 'not-applicable',
					why: 'Pitched Boss Set — long-term goal, never a ranked upgrade.',
					sources: ['research §6 — https://maplestorywiki.net/w/Endless_Terror']
				}
			},
			{
				id: 'ring-brilliant',
				name: 'Brilliant rings',
				nameKind: 'family',
				examples: ['Whisper of the Source', 'Blissful Nightmare'],
				itemLevel: 250,
				setName: 'Brilliant Boss Set',
				tier: 'brilliant',
				maxStars: 30,
				match: { slots: ['ring'] },
				obtainedFrom: 'Grandis endgame bosses',
				outOfScope: true,
				stop: {
					stars: 22,
					starsOnEvent: 22,
					potential: 'legendary',
					flames: 'not-applicable',
					why: 'Brilliant Boss Set — long-term goal only.',
					sources: ['research §6 — https://maplestorywiki.net/w/Brilliant_Boss_Set']
				}
			}
		]
	},

	/* ------------------------------------------------------------------ belt */
	{
		id: 'ring-event',
		slot: 'ring',
		label: 'Event and exclusive-scroll rings',
		kind: 'alternative',
		branchCondition:
			'A ring the catalogue says takes NO star force — event rings, Awake/Vengeful/Cosmos ' +
			'rings and the like. They compete for the same four slots as the ladder rings, and ' +
			'availability is an event, not a boss, so this is a genuinely parallel option.',
		stages: [
			{
				id: 'ring-event-only',
				name: 'Event / exclusive-scroll ring',
				nameKind: 'family',
				examples: [
					'Eternal Flame Ring',
					'Ring of Restraint',
					'Awake Ring',
					'Vengeful Ring',
					'Cosmos Ring',
					"Libae's Prototype R Ring"
				],
				tier: 'event',
				match: { slots: ['ring'], nonStarforceable: true },
				obtainedFrom: 'Event shops and event questlines; availability varies by patch',
				stop: {
					// `stars` deliberately absent: these take no star force at all, and an
					// absent value must mean "not applicable", never 0.
					potential: 'legendary',
					flames: 'not-applicable',
					why:
						'These rings take NO star force — the catalogue blocks it (`no-upgrade-slots`, ' +
						'or `exclusive-scroll-only` for the Awake/Vengeful/Cosmos line, which only ' +
						'accept their own enhancement currency). Cubing is the only lever, and ' +
						'Legendary IS the right target: UG says to get 2-3 event rings "for damage at ' +
						'first, then eventually to re-utilize as drop gear", and drop/meso lines ' +
						'require Legendary. So cube it and stop — there is nothing else to spend here.',
					sources: [
						'research §3, §7.3 — UG general tips ("definitely get 2-3 on your character for damage at first, then eventually to re-utilize as drop gear"; "Items must be Legendary to get meso or drop rate"); items/rules.ts no-upgrade-slots and exclusive-scroll-only'
					]
				},
				movesOnWhen:
					'Never, mechanically — but a ladder ring (Gollux, Kanna\'s Treasure, Meister, ' +
					'Dawn Guardian Angel) outscales it once you have four of them, because those ' +
					'take star force and these do not.'
			}
		]
	},
	{
		id: 'belt',
		slot: 'belt',
		label: 'Belt',
		kind: 'only',
		stages: [
			{
				id: 'belt-lower-gollux',
				name: 'Lower Gollux belts / Golden Clover Belt',
				nameKind: 'family',
				examples: [
					'Cracked Engraved Gollux Belt',
					'Solid Engraved Gollux Belt',
					'Reinforced Engraved Gollux Belt',
					'Golden Clover Belt'
				],
				itemLevel: 140,
				tier: 'gollux-lower',
				maxStars: 30,
				match: {
					slots: ['belt'],
					prefixes: [
						'cracked engraved gollux',
						'solid engraved gollux',
						'reinforced engraved gollux',
						'golden clover'
					]
				},
				obtainedFrom: 'Gollux (Easy/Normal/Hard); Golden Clover Belt from Pink Bean',
				bossIds: ['normal-gollux', 'hard-gollux', 'normal-pink-bean'],
				stop: {
					...STOP_STARTER_ACCESSORY,
					why:
						'These exist to be transfer-hammered into the Superior belt. UG: "Keep spare belts ' +
						'for transfer hammering." Transfer drops potential above Epic back to Epic, so ' +
						'Epic 6% is the mechanical stopping point, not a preference.',
					sources: ['research §2.3 — UG Phase 1/2; GL Upgrading & Enhancing (transfer hammer)']
				},
				movesOnWhen: '700 Gollux Coins saved for the Superior Engraved Gollux Belt.'
			},
			{
				id: 'belt-superior-gollux',
				name: 'Superior Engraved Gollux Belt',
				nameKind: 'item',
				itemLevel: 150,
				setName: 'Superior Gollux Set',
				tier: 'gollux-superior',
				maxStars: 30,
				match: { slots: ['belt'] },
				obtainedFrom: 'Hell Gollux drop, or 700 Gollux Coins from Lucia',
				bossIds: ['hard-gollux'],
				stop: {
					stars: 17,
					starsOnEvent: 22,
					potential: 'unique',
					mainStatPct: 15,
					flames: 'invest',
					why:
						'Superior Gollux 4-set piece (+30% Boss Damage, +30% IED). 17 now, 22 on event ' +
						'with Hellux backups; UG allows Legendary here instead of Unique once Hellux ' +
						'carries are consistent.',
					sources: ['research §3 — UG Phase 2; DTQ mid 17 / end 22']
				}
			},
			{
				id: 'belt-dreamy',
				name: 'Dreamy Belt',
				nameKind: 'item',
				itemLevel: 200,
				setName: 'Pitched Boss Set',
				tier: 'pitched',
				maxStars: 30,
				obtainedFrom: 'Hard Lucid (weekly)',
				bossIds: ['hard-lucid'],
				outOfScope: true,
				stop: {
					stars: 22,
					starsOnEvent: 22,
					potential: 'legendary',
					flames: 'invest',
					why: 'Pitched Boss Set — long-term goal, never a ranked upgrade.',
					sources: ['research §6 — https://maplestorywiki.net/w/Dreamy_Belt']
				}
			}
		]
	},

	/* ----------------------------------------------------------------- heart */
	{
		id: 'heart',
		slot: 'heart',
		label: 'Android heart',
		kind: 'only',
		stages: [
			{
				id: 'heart-lidium',
				name: 'Lidium Heart',
				nameKind: 'item',
				itemLevel: 30,
				tier: 'event',
				maxStars: 5,
				obtainedFrom: 'Event shops, or an expiring craft from Ardentmill',
				stop: {
					stars: 5,
					starsOnEvent: 5,
					potential: 'epic',
					flames: 'not-applicable',
					why: 'Lv 30 filler with a 5-star target (DTQ). Hearts never take flames.',
					sources: ['research §3 — DTQ early-game table "Lidium Heart / Heart / Epic / 5 Stars"']
				},
				movesOnWhen: 'A Fairy Heart appears in an event shop.'
			},
			{
				id: 'heart-fairy',
				name: 'Fairy Heart',
				nameKind: 'item',
				itemLevel: 100,
				tier: 'event',
				maxStars: 8,
				match: { slots: ['heart'] },
				obtainedFrom: 'Event shops — DTQ: "comes around every other event"',
				stop: {
					stars: 8,
					starsOnEvent: 8,
					potential: 'legendary',
					flames: 'not-applicable',
					why:
						'Hard cap is 8 stars, which is the target. Worth Legendary because it carries the ' +
						'Lv 120+ potential table rather than the Lv 30 one, and nothing on the normal path ' +
						'replaces it (Black Heart is Pitched AND expires after 20 days).',
					sources: [
						"research §3 — https://maplestorywiki.net/w/Fairy_Heart (starForceEnhancements=8); DTQ. NOTE: DTQ's tables say 17/22 stars, which contradicts the wiki cap; the wiki wins."
					]
				},
				disputed:
					"DTQ's mid- and end-game tables give Fairy Heart 17 and 22 stars. The wiki caps it at " +
					'8. The wiki wins — DTQ is applying a blanket row value.'
			},
			{
				id: 'heart-pitched',
				name: 'Pitched hearts',
				nameKind: 'family',
				examples: ['Black Heart', 'Total Control'],
				itemLevel: 120,
				setName: 'Pitched Boss Set',
				tier: 'pitched',
				match: { slots: ['heart'], prefixes: ['total control', 'black heart'] },
				obtainedFrom: 'Hard Lotus (Black Heart, 20-day time limit); Total Control (Lv 200)',
				bossIds: ['hard-lotus'],
				outOfScope: true,
				stop: {
					potential: 'legendary',
					flames: 'not-applicable',
					why:
						'Pitched Boss Set. Black Heart is additionally time-limited to 20 days and cannot ' +
						'be extended, which is why DTQ says to keep the Fairy Heart as the main item.',
					sources: ['research §6 — DTQ; GL Pitched Boss Accessories']
				}
			}
		]
	},

	/* ----------------------------------------------------------------- badge */
	{
		id: 'badge',
		slot: 'badge',
		label: 'Badge',
		kind: 'only',
		stages: [
			{
				id: 'badge-crystal-ventus',
				name: 'Crystal Ventus Badge',
				nameKind: 'item',
				itemLevel: 130,
				setName: 'Boss Accessory Set',
				tier: 'boss-acc-low',
				obtainedFrom: 'Easy / Normal / Hard Magnus',
				bossIds: ['normal-magnus'],
				stop: {
					potential: 'none',
					flames: 'not-applicable',
					why:
						'No star force, no potential, no flames. DTQ: "It cannot be cubed or Star ' +
						"Force'd, so you're not missing out too much.\" Equip it and forget it.",
					sources: ['research §3 — DTQ; items/rules.ts potential-ineligible-slot']
				}
			},
			{
				id: 'badge-genesis',
				name: 'Genesis Badge',
				nameKind: 'item',
				itemLevel: 200,
				setName: 'Pitched Boss Set',
				tier: 'pitched',
				obtainedFrom: 'Black Mage (monthly reset)',
				bossIds: ['hard-black-mage'],
				outOfScope: true,
				stop: {
					potential: 'none',
					flames: 'not-applicable',
					why:
						'Pitched Boss Set, from a MONTHLY-reset boss — at most 12 rolls a year. Long-term ' +
						'goal only.',
					sources: ['research §6 — bosses.json hard-black-mage reset: monthly']
				}
			}
		]
	},

	/* ---------------------------------------------------------------- pocket */
	{
		id: 'pocket',
		slot: 'pocket',
		label: 'Pocket item',
		kind: 'only',
		stages: [
			{
				id: 'pocket-stone-of-eternal-life',
				name: 'Stone of Eternal Life',
				nameKind: 'item',
				setName: 'Boss Accessory Set',
				tier: 'boss-acc-low',
				obtainedFrom: 'Hilla (requires Charm level 30 to unlock the slot)',
				stop: {
					potential: 'none',
					flames: 'opportunistic',
					why:
						'Placeholder. Pocket items take no star force and no potential, but they DO take ' +
						'flames — pocket is not in the flame-ineligible list.',
					sources: [
						'research §3 — DTQ; items/rules.ts flame-ineligible-slot ("Pocket items are NOT excluded")'
					]
				},
				movesOnWhen: 'Pink Holy Cup drops from Pink Bean (daily boss).'
			},
			{
				id: 'pocket-pink-holy-cup',
				name: 'Pink Holy Cup',
				nameKind: 'item',
				itemLevel: 140,
				setName: 'Boss Accessory Set',
				tier: 'boss-acc-mid',
				obtainedFrom: 'Normal / Chaos Pink Bean',
				bossIds: ['normal-pink-bean'],
				stop: {
					potential: 'none',
					flames: 'invest',
					why:
						'Terminal on the normal path — the only successor is a Cursed Spellbook (Pitched). ' +
						'No stars, no potential; flames are the only lever and are worth using.',
					sources: ['research §3 — DTQ mid-game table; items/rules.ts']
				}
			},
			{
				id: 'pocket-cursed-spellbook',
				name: 'Cursed Spellbooks',
				nameKind: 'family',
				examples: [
					'Cursed Red Spellbook',
					'Cursed Blue Spellbook',
					'Cursed Green Spellbook',
					'Cursed Yellow Spellbook'
				],
				itemLevel: 160,
				setName: 'Pitched Boss Set',
				tier: 'pitched',
				match: { slots: ['pocket'], prefixes: ['cursed '] },
				obtainedFrom: "Hard Will — Will's Cursed Spellbook Selection Box (weekly)",
				bossIds: ['hard-will'],
				outOfScope: true,
				stop: {
					potential: 'none',
					flames: 'invest',
					why: 'Pitched Boss Set — long-term goal, never a ranked upgrade.',
					sources: ['research §6 — GL boss reward list; wiki Pitched Boss Set']
				}
			}
		]
	}
] as const;

/* -------------------------------------------------------------------------- */
/* Gating — why each stage exists                                              */
/* -------------------------------------------------------------------------- */

/**
 * The boss gate that unlocks a gear tier.
 *
 * Boss numbers are NOT copied here — `bossIds` joins into `bosses.ts` so entry
 * level, force requirement, published CP gate and HP cannot drift. Use
 * `gateRequirements()` to resolve them.
 *
 * ⚠️ There is deliberately no "required range" field. `docs/research/bosses.md`
 * §2.1: "There is no published, validated conversion from a character's stats to
 * a boss clear ... charts disagree with each other by up to 2x", and the community
 * rejects range as a cross-class proxy. The four gates below are the ones that are
 * actually hard: entry level, force, published minimum Combat Power, and the
 * 5%-of-total-HP loot contribution rule.
 */
export interface GearGate {
	tier: TierId;
	label: string;
	/** Bosses that drop or fund this tier. Ids into `bosses.ts`. */
	bossIds: readonly string[];
	/** What the tier unlocks next, in prose. */
	unlocks: string;
	/**
	 * A community "comfortable clear" Combat Power figure, when a guide states one.
	 * Distinct from the PUBLISHED minimum in `bosses.json.cpGate`, which is a floor
	 * to enter, not a number at which you clear.
	 */
	communityCombatPower?: number;
	note: string;
	sources: readonly string[];
}

/** Research §5.2. */
export const GEAR_GATES: readonly GearGate[] = [
	{
		tier: 'boss-acc-low',
		label: 'Basic boss accessories',
		bossIds: [
			'chaos-zakum',
			'chaos-horntail',
			'normal-magnus',
			'normal-arkarium',
			'normal-pink-bean'
		],
		unlocks: 'Face, eye, earrings, ring, pendant, belt, shoulder, badge and pocket fillers.',
		note: 'Mostly daily-reset bosses, so the whole tier is assembled in weeks.',
		sources: ['research §5.2 — bosses.json; GL boss reward list']
	},
	{
		tier: 'boss-acc-mid',
		label: 'Mid boss accessories',
		bossIds: ['hard-hilla', 'normal-pink-bean', 'chaos-papulatus', 'normal-arkarium'],
		unlocks:
			"Will o' the Wisps, Black Bean Mark, Papulatus Mark, Dominator Pendant, Pink Holy Cup.",
		note: 'Boss Accessory Set counts (3/5/7/9) matter more than any individual piece here.',
		sources: ['research §5.2 — bosses.json; https://maplestorywiki.net/w/Boss_Accessory_Set']
	},
	{
		tier: 'gollux-superior',
		label: 'Superior Gollux 4-set',
		bossIds: ['hard-gollux'],
		unlocks:
			'+30% Boss Damage and +30% IED from the 4-set — the single largest accessory jump on the path.',
		note:
			'Hell Gollux is a DAILY-reset boss, so this is a coin grind, not a drop lottery. UG: ' +
			'clear 5% of Hellux HP for a carry ("do 18% of phase 1 to get a carry (blue)"), and ' +
			'"Reminder: Hellux entry is once a day whether it\'s cleared or not."',
		sources: [
			'research §5.2 — bosses.json hard-gollux reset: daily; UG Phase 1/2; sets.json Superior Gollux Set'
		]
	},
	{
		tier: 'cra',
		label: 'Chaos Root Abyss (Lv 150 CRA)',
		bossIds: ['chaos-pierre', 'chaos-von-bon', 'chaos-crimson-queen', 'chaos-vellum'],
		unlocks: 'Hat/top/bottom for the next 100 levels, plus the Fafnir weapon.',
		note:
			'UG: "Doing 5 Root Abyss runs to unlock CRA for phase 2, then try to manage 5% damage ' +
			'runs solo to get carries/struggle runs (requires decent IED)." The 5%-of-HP loot rule ' +
			'is the real gate, not a stat number.',
		sources: ['research §5.1, §5.2 — UG Phase 1 goals; bosses.md §2.2 (5% contribution rule)']
	},
	{
		tier: 'absolab',
		label: 'AbsoLab (Lv 160)',
		bossIds: ['normal-lotus', 'normal-damien'],
		unlocks: 'Shoes/gloves/cape/shoulder and a weapon for the stretch between Lomien and Lucid.',
		note:
			'Coins come from Lv 190 Scrapyard and Dark World Tree weeklies; the exchange needs Lotus ' +
			'and Damien materials. DTQ: "it will still take you several weeks to get all your ' +
			'Absolab Gear." This is why AbsoLab is worn, and why it is not finished.',
		sources: ['research §4.3, §5.2 — GL Weekly Content; DTQ mid-game']
	},
	{
		tier: 'arcane-umbra',
		label: 'Arcane Umbra (Lv 200)',
		bossIds: ['easy-lucid', 'normal-lucid', 'easy-will', 'normal-will'],
		unlocks: 'The 22-star tier for shoes/gloves/cape/shoulder, and the pre-Genesis weapon.',
		note:
			'Lucid entry is Lv 220 with an Arcane Force requirement of 360; Will is Lv 235 at 560-760. ' +
			'Those levels arrive during the same Arcane River run that funds AbsoLab, which is why ' +
			'AbsoLab stops at 17 stars.',
		sources: [
			'research §4.3, §5.2 — bosses.json easy-lucid/normal-will force + entryLevel; DTQ end-game'
		]
	},
	{
		tier: 'dawn',
		label: 'Dawn Boss Set',
		bossIds: [
			'normal-lucid',
			'normal-will',
			'normal-verus-hilla',
			'normal-chosen-seren',
			'normal-gloom',
			'normal-darknell',
			'normal-guardian-angel-slime'
		],
		unlocks: 'Twilight Mark, Daybreak Pendant, Estella Earrings, Dawn Guardian Angel Ring.',
		note:
			'All four drop from NORMAL-mode bosses on the main path — this is the in-scope boss-set ' +
			'answer, unlike Pitched. The 2-set alone is +10% Boss Damage.',
		sources: [
			'research §6.1 — https://maplestorywiki.net/w/Dawn_Boss_Set; GL Dawn Boss Accessories'
		]
	},
	{
		tier: 'genesis',
		label: 'Genesis weapon liberation',
		bossIds: ['hard-black-mage'],
		unlocks: 'A fixed 22-star weapon, which is why the Arcane weapon stops at 17.',
		note: 'Monthly reset — 8 clears means 8 months minimum.',
		sources: ['research §3, §4.4 — bosses.json hard-black-mage reset: monthly; UG Phase 3/4']
	},
	{
		tier: 'eternal',
		label: 'Eternal (Lv 250, Kalos)',
		bossIds: ['easy-kalos', 'normal-kalos', 'chaos-kalos'],
		unlocks: 'The final armour tier.',
		communityCombatPower: 80_000_000,
		note:
			'Kalos entry is Lv 265 with Sacred Force 200/250/330 by difficulty. The published minimum ' +
			'Combat Power for Easy Kalos is 35,000,000, but UG Phase 3 says "Starting working on ' +
			'eKalos (80m+ CP at least)" — more than double. The published gate is a floor to enter, ' +
			'not a number at which you clear. Both are recorded.',
		sources: ['research §5.2 — bosses.json easy-kalos cpGate 35,000,000; UG Phase 3 goals']
	}
] as const;

/* -------------------------------------------------------------------------- */
/* Out of scope: Pitched and Brilliant                                         */
/* -------------------------------------------------------------------------- */

export interface OutOfScopeSet {
	setName: string;
	/** Names the community uses that are NOT the GMS name. */
	alsoCalled?: readonly string[];
	/** Per-clear drop probability. UNVERIFIED — no public source. Always `undefined`. */
	dropRatePercent?: number;
	reason: string;
	presentAs: string;
	sources: readonly string[];
}

/**
 * Sets that must NEVER appear as a ranked upgrade candidate.
 *
 * ⚠️ `dropRatePercent` is deliberately `undefined`, not a guess. No public source
 * publishes GMS Pitched or Brilliant drop rates: the wiki lists item sources but no
 * rates, Nexon's probability pages return JS shells with no data, and the search
 * avenues available in this session were exhausted (research §6.2, §8.1). The
 * exclusion rests on the sourced qualitative statements plus the arithmetic in
 * `PITCHED_WAIT_SENSITIVITY`, not on an invented number.
 */
export const OUT_OF_SCOPE: readonly OutOfScopeSet[] = [
	{
		setName: 'Pitched Boss Set',
		dropRatePercent: undefined,
		reason:
			'Every source is a weekly-reset boss (Genesis Badge is monthly), so a character gets at ' +
			'most 52 rolls a year on any one item. DTQ: "the drop-rate is terrible. Some players have ' +
			'gone several months without a single item drop", and "you can get stuck looking for these ' +
			'items for months if not years if you\'re on Reboot Servers". GL: "Items here at very rare ' +
			'and hard to get." A single piece can also be a net DOWNGRADE — a Commanding Force Earring ' +
			'displaces Superior Gollux Earrings and can cost the Gollux 4-set (+30% Boss, +30% IED).',
		presentAs:
			'An unranked "Long-term goals" list: item, slot, source boss and difficulty, reset cadence, ' +
			"set completed. Never a gainPct, never a cost, never a rank. DTQ's own advice is the " +
			'fallback to show instead: "you may find starring your current equipment to 22 stars will ' +
			'give you more damage whilst you wait for the item to drop." If one IS already equipped, ' +
			'treat it as normal gear — UG: pitched is "only really worth using if they\'re 22star".',
		sources: [
			'research §6 — DTQ end-game section; GL Pitched Boss Accessories; UG Phase 3/4; bosses.json reset periods; https://maplestorywiki.net/w/Pitched_Boss_Set'
		]
	},
	{
		setName: 'Brilliant Boss Set',
		alsoCalled: ['Radiant Boss Set', 'Grandis boss set'],
		dropRatePercent: undefined,
		reason:
			'All five pieces are Lv 250 Grandis endgame drops, behind Kalos-tier and beyond. Same ' +
			'drop-rate problem as Pitched, at a higher entry bar. Note the GMS name is "Brilliant Boss ' +
			'Set" — "Radiant" is not a GMS item or set name.',
		presentAs:
			'Same as Pitched: an unranked long-term goal list. Never ranked, never given a gainPct.',
		sources: [
			'research §6.1 — https://maplestorywiki.net/w/Brilliant_Boss_Set; sets.json "Brilliant Boss Set"'
		]
	}
] as const;

/**
 * Expected wait to a FIRST drop under a geometric model, by assumed per-clear
 * probability. This is arithmetic, not data: it says "IF the rate were p, THEN the
 * wait is this". It exists so the UI can justify the exclusion without inventing a
 * drop rate. Research §6.2.
 */
export const PITCHED_WAIT_SENSITIVITY = [
	{ dropRatePercent: 5, expectedClears: 20, weeklyBossYears: 0.4, monthlyBossYears: 1.7 },
	{ dropRatePercent: 2, expectedClears: 50, weeklyBossYears: 1.0, monthlyBossYears: 4.2 },
	{ dropRatePercent: 1, expectedClears: 100, weeklyBossYears: 1.9, monthlyBossYears: 8.3 },
	{ dropRatePercent: 0.5, expectedClears: 200, weeklyBossYears: 3.8, monthlyBossYears: 16.7 }
] as const;

/* -------------------------------------------------------------------------- */
/* Star force reality                                                          */
/* -------------------------------------------------------------------------- */

/**
 * Why 22★ is the ceiling and 30★ is not a goal. Research §4.2.
 *
 * `expectedAttempts` / `expectedBooms` are DERIVED from `starforce.ts` STAR_RATES
 * and TRACE_RECOVERY by solving the absorbing Markov chain (assumptions:
 * Enhancement Mode 1, no Star Catch, Safeguard off, a destroyed item is always
 * restored from its Equipment Trace and re-climbed). The derivation is reproduced
 * and re-verified in `gear-progression.spec.ts`, so these numbers cannot drift
 * away from the rate table they came from.
 */
export const STAR_CLIMB_COST = [
	{ from: 0, to: 17, expectedAttempts: 35, expectedBooms: 0.1 },
	{ from: 17, to: 21, expectedAttempts: 102, expectedBooms: 4.0 },
	{ from: 17, to: 22, expectedAttempts: 196, expectedBooms: 8.2 },
	{ from: 17, to: 23, expectedAttempts: 425, expectedBooms: 18.6 },
	{ from: 17, to: 25, expectedAttempts: 3127, expectedBooms: 144 },
	{ from: 22, to: 30, expectedAttempts: 23_547_667, expectedBooms: 1_093_880 }
] as const;

/**
 * The star at and below which Safeguard is available, hence the universal
 * mid-tier target. `starforce.ts` SAFEGUARD_STARS = [15, 16, 17]: 17 is the last
 * star Safeguard protects, and 17→18 is the first unprotected attempt.
 */
export const SAFEGUARD_CEILING = 17;

/**
 * Last star that grants CLASS STAT. Mirrors `starforce.ts` LAST_STAT_STAR.
 *
 * ⚠️ Read this as "main stat stops here", NOT as "the band above is worthless".
 * ATT keeps climbing past 22 and ATT is the most valuable stat in the game.
 * Verified against `starforce.cumulativeStarStats`, armour at item level 160:
 *   22★ stat 131, att  92
 *   23★ stat 131, att 111   (+19)
 *   24★ stat 131, att 132   (+21)
 *   25★ stat 131, att 155   (+23)
 * The reason to stop at 22 is cost and risk, not a dead band — see
 * `PRESCRIBED_MAX_STAR` and `STAR_CLIMB_COST`.
 */
export const LAST_STAT_STAR = 22;

/**
 * The weapon exception, recorded so it is not flattened away.
 *
 * On WEAPONS the ATT gain does not merely continue past 22 — it accelerates
 * sharply, and it does so exactly at the 23 boundary. From
 * `starforce.WEAPON_ATT_DELTA_16_25`, item level 150: +11 / +12 / +13 at 20 / 21 /
 * 22, then **+31 / +32 / +33** at 23 / 24 / 25. Armour over the same band gains
 * +19 / +21 / +23. This is the one place where the band above 22 is genuinely
 * lucrative rather than merely non-zero.
 *
 * It is still NOT a recommendation, for two independent reasons:
 *
 *  1. NO SOURCE recommends it. Searched across all three guides: `UG` Phase 4 says
 *     "22 star everything (other than pitched)" and its only "23" is "23%+ Stat"
 *     (potential, not stars); `DTQ`'s end-game star column is 22 in every row;
 *     `GL`'s "max. 25 stars" is its stale pre-2025-revamp cap, not advice. There
 *     is no branch to record as `disputed` — there is simply no dissent.
 *  2. On the weapon you actually finish with, it is UNREACHABLE. The terminal GMS
 *     Heroic weapon is the Genesis weapon, granted at a fixed 22★ that cannot be
 *     enhanced at all (`items/rules.ts` `liberated-weapon-fixed-star`). The only
 *     weapon that can pass 22 is a Destiny stage-2, and that caps at 25, not 30
 *     (`items/rules.ts` `destiny-stage-ambiguous`). So chasing the jump means
 *     spending it on an Arcane or CRA weapon you are about to throw away — at
 *     1.13 expected destroyed copies per successful 22→23 attempt.
 *
 * Research §4.2 "The one real exception".
 */
export const WEAPON_ATT_JUMP_AT_23 = {
	/** ATT gained per star on a level-150 weapon, 20★ through 25★. */
	weaponAttDeltaLv150: [
		{ star: 20, att: 11 },
		{ star: 21, att: 12 },
		{ star: 22, att: 13 },
		{ star: 23, att: 31 },
		{ star: 24, att: 32 },
		{ star: 25, att: 33 }
	],
	/** ATT gained per star on level-160 armour over the same band, for contrast. */
	armourAttDeltaLv160: [
		{ star: 23, att: 19 },
		{ star: 24, att: 21 },
		{ star: 25, att: 23 }
	],
	recommendedByAnySource: false,
	reachableOnTerminalWeapon: false,
	note:
		'Real and large, but no guide recommends it, and the Genesis weapon — the ' +
		'weapon you finish on — is locked at a fixed 22★ and cannot be enhanced, so ' +
		'the jump can only be bought on a weapon you are about to replace.',
	sources: [
		'research §4.2 — starforce.ts WEAPON_ATT_DELTA_16_25; items/rules.ts liberated-weapon-fixed-star and destiny-stage-ambiguous; UG Phase 4; DTQ end-game table'
	]
} as const;

/** The mechanical cap. Reachable in theory only — see STAR_CLIMB_COST. */
export const THEORETICAL_MAX_STAR = 30;

/**
 * The highest star the tracker should ever propose as a target, for any item.
 *
 * ⚠️ NOT because the band above is worthless. Main stat freezes at 22
 * (`LAST_STAT_STAR`), but ATT keeps climbing, and on WEAPONS it accelerates
 * sharply exactly there — see `WEAPON_ATT_JUMP_AT_23`. The cap is a COST and RISK
 * judgement: Safeguard ends at 17, so every attempt from 18 up can destroy the
 * item, and 22 -> 30 costs ~2.4e7 attempts and ~1.1e6 destroyed copies in
 * expectation (`STAR_CLIMB_COST`). No guide in `docs/research/gear-progression.md`
 * recommends going past 22 in any slot.
 */
export const PRESCRIBED_MAX_STAR = 22;

/* -------------------------------------------------------------------------- */
/* Investment order                                                            */
/* -------------------------------------------------------------------------- */

export interface InvestmentStep {
	phase: number;
	label: string;
	/** Ordered actions within the phase. */
	actions: readonly string[];
	sources: readonly string[];
}

/** Research §7.1. */
export const INVESTMENT_ORDER: readonly InvestmentStep[] = [
	{
		phase: 0,
		label: 'Fill every slot',
		actions: [
			'Put something in every equipment slot, replaced-or-not.',
			'Star everything to 10-12; reveal potentials and reroll to Epic / some % main stat.'
		],
		sources: [
			'research §7.1 — GL: "It does not matter if the gear will be replaced, this will help you to defeat enemies."'
		]
	},
	{
		phase: 1,
		label: 'Cheap stars everywhere, Epic 6%, and WSE first',
		actions: [
			'10 stars on everything, 12 on the weapon.',
			'Epic 6% main stat on every basic boss accessory.',
			'Weapon / Secondary / Emblem to Unique-Legendary with 1-2 ATT% lines — they take no stars and no flames, so cubing is the only lever and it is never wasted.',
			'No flames yet.'
		],
		sources: [
			'research §7.1 — UG Phase 1; GL "Weapon, Secondary Weapon, and Emblem to unique first"; GL "For now don\'t worry too much about Bonus Stats and Rebirth Flames"'
		]
	},
	{
		phase: 2,
		label: '17 stars across the board; Legendary on CRA, Epic/Unique on AbsoLab and Gollux',
		actions: [
			'17 stars on CRA, AbsoLab and Superior Gollux (Safeguard covers 15-17).',
			'CRA to Legendary 15%+ — it lasts to Kalos.',
			'AbsoLab and Superior Gollux to Epic 6%+ / Unique 15%+ — AbsoLab is replaced, Gollux is transfer-hammered into.',
			'Gloves: 1 line of % Crit Damage (2 lines is not a Phase 2 goal).',
			'Flames enter here, on keepers only: "decent -> good flames, ideally 3%+ stat".',
			'WSE: at least 5 total ATT% / M.ATT% lines plus some IED / Boss%.'
		],
		sources: ['research §7.1 — UG Phase 2']
	},
	{
		phase: 3,
		label: 'Replace first, then stars, then potential',
		actions: [
			'Move each slot to its next stage as its gate opens.',
			'"Arcane items should all be 17 stars first, then 3 Line Legendary with 23%+ Stat each" — stars before cubes at a tier transition.',
			'Arcane weapon: T6-T7 ATT / M.ATT flames.',
			"21-22 stars on the terminal pieces: CRA, Kanna's Treasure, Meister Ring."
		],
		sources: ['research §7.1 — UG Phase 3']
	},
	{
		phase: 4,
		label: '22 stars on everything terminal',
		actions: [
			'22 stars on everything that is not farming gear and not pitched.',
			'3-line stat items.',
			'High flames on all flame-eligible items.'
		],
		sources: ['research §7.1 — UG Phase 4: "22 star everything (other than pitched)"']
	}
] as const;

/* -------------------------------------------------------------------------- */
/* Catalogue-coverage escape hatch                                             */
/* -------------------------------------------------------------------------- */

/**
 * Item names used above that are genuinely absent from the GMS v270 catalogue
 * dump. Their spelling is verified against MapleStory Wiki instead. The spec
 * asserts every OTHER `nameKind: 'item'` name resolves in the catalogue — that
 * assertion is the guard against a confidently wrong item name, and this list is
 * the only permitted exception.
 */
export const NAMES_NOT_IN_V270_CATALOGUE: readonly string[] = [
	// https://maplestorywiki.net/w/Mitra%27s_Rage:_Warrior — job-specific emblems.
	"Mitra's Rage: Warrior",
	"Mitra's Rage: Magician",
	"Mitra's Rage: Bowman",
	"Mitra's Rage: Thief",
	"Mitra's Rage: Pirate",
	// Ren's secondary. v270 predates the class — see items/catalogue.json
	// `coverage.knownMissing`, which names it explicitly.
	'Imugi Gem'
] as const;

/* -------------------------------------------------------------------------- */
/* Lookup helpers                                                              */
/* -------------------------------------------------------------------------- */

const STAGES: readonly PathStage[] = SLOT_PATHS.flatMap((p) => p.stages);

const STAGE_BY_ID = new Map<string, PathStage>(STAGES.map((s) => [s.id, s]));

const PATH_BY_STAGE_ID = new Map<string, SlotPath>(
	SLOT_PATHS.flatMap((p) => p.stages.map((s) => [s.id, p] as const))
);

// Normalisation is DELEGATED to the catalogue's own normaliser rather than
// reimplemented. It folds curly apostrophes (U+2019, as in the captured
// "Kanna’s Treasure" against the catalogue's "Kanna's Treasure"), en/em dashes,
// NFKC forms and whitespace. A private `.toLowerCase()` here would have missed
// all of that, which is exactly how "Kanna's Treasure" went unmatched.
const norm = normalizeItemName;

/** Every literal name a stage answers to: its own, plus its `examples`. */
function stageNames(stage: PathStage): string[] {
	return [stage.name, ...(stage.examples ?? [])].map(norm);
}

const STAGE_BY_NAME = new Map<string, PathStage>();
for (const stage of STAGES) {
	for (const n of stageNames(stage)) if (!STAGE_BY_NAME.has(n)) STAGE_BY_NAME.set(n, stage);
}

/** Normalised catalogue-set names an item id belongs to (from `sets.json`). */
const SET_NAMES_BY_ITEM_ID = new Map<number, string[]>();
for (const set of SETS) {
	for (const id of set.memberItemIds) {
		const bucket = SET_NAMES_BY_ITEM_ID.get(id);
		if (bucket) {
			if (!bucket.includes(set.name)) bucket.push(set.name);
		} else SET_NAMES_BY_ITEM_ID.set(id, [set.name]);
	}
}

/** Prefix match, anchored at the start and at a word boundary — never a substring. */
function hasPrefix(nameNorm: string, prefix: string): boolean {
	const p = norm(prefix);
	if (!nameNorm.startsWith(p)) return false;
	// A trailing space in the prefix already encodes the boundary.
	if (p.endsWith(' ')) return true;
	const next = nameNorm.charAt(p.length);
	return next === '' || next === ' ';
}

/**
 * What the catalogue knows about a captured name: its canonical names, its slot
 * and its set memberships. Uses `resolveByName`, which already handles the
 * approximations screenshot captures produce ("Total Control Heart" for
 * "Total Control", "Arcane Umbra Hat" for "Arcane Umbra Knight Hat").
 */
function catalogueFacts(
	itemName: string,
	slot?: GearSlot
): { names: string[]; slot?: GearSlot; sets: string[] } {
	const { entries } = resolveByName(itemName, slot);
	if (entries.length === 0) return { names: [], slot, sets: [] };
	const slots = new Set(entries.map((e) => e.slot));
	const sets = new Set<string>();
	for (const e of entries) for (const s of SET_NAMES_BY_ITEM_ID.get(e.id) ?? []) sets.add(s);
	return {
		names: entries.map((e) => norm(e.name)),
		// Only trust a catalogue-derived slot when every candidate agrees.
		slot: slot ?? (slots.size === 1 ? [...slots][0] : undefined),
		sets: [...sets]
	};
}

/**
 * Stages claiming a name by matcher, before slot scoping.
 * `kind` orders the passes: set membership is more specific than a name prefix,
 * and `slotFallback` is the last resort.
 */
function matcherCandidates(
	nameNorm: string,
	sets: readonly string[],
	kind: 'sets' | 'prefixes' | 'nonStarforceable' | 'slotFallback',
	originalName?: string,
	slot?: GearSlot
): PathStage[] {
	return STAGES.filter((stage) => {
		const m = stage.match;
		if (!m) return false;
		if (kind === 'sets') return (m.sets ?? []).some((want) => sets.some((s) => s.startsWith(want)));
		if (kind === 'prefixes') return (m.prefixes ?? []).some((p) => hasPrefix(nameNorm, p));
		if (kind === 'nonStarforceable') {
			if (m.nonStarforceable !== true || !slot || !originalName) return false;
			// `capabilities` degrades permissively for an unknown name, so an item the
			// catalogue has never heard of is NOT claimed here.
			const cap = capabilities({ name: originalName, slot });
			return cap.known === true && cap.canStarforce === false;
		}
		return m.slotFallback === true;
	});
}

/**
 * Narrow matcher candidates to one stage.
 *
 * With a known slot, the `slots` allow-list does the work — this is the guard
 * that stops a badge matching a weapon family. Without one, a matcher is only
 * honoured when exactly one stage in the whole module claims it, so an ambiguous
 * prefix like "arcane umbra" (weapon AND armour) resolves to `undefined` rather
 * than guessing.
 */
function narrow(candidates: PathStage[], slot?: GearSlot): PathStage | undefined {
	if (candidates.length === 0) return undefined;
	if (slot) {
		const scoped = candidates.filter((s) => s.match!.slots.includes(slot));
		return scoped.length === 1 ? scoped[0] : undefined;
	}
	return candidates.length === 1 ? candidates[0] : undefined;
}

/** All paths that cover a slot. More than one means a real branch — check `branchCondition`. */
export function pathsFor(slot: GearSlot): SlotPath[] {
	return SLOT_PATHS.filter((p) => p.slot === slot);
}

export function getStage(id: string): PathStage | undefined {
	return STAGE_BY_ID.get(id);
}

/**
 * Resolve an item name to its stage.
 *
 * PASS ORDER, most specific first. Each pass is slot-scoped once a slot is known
 * (passed in, or agreed by every catalogue candidate):
 *   1. the literal `name` / `examples`, on the normalised name;
 *   2. the same, on the canonical catalogue name(s) — this is what turns a
 *      captured "Total Control Heart" or "Arcane Umbra Hat" into a hit;
 *   3. catalogue SET membership, e.g. any "Root Abyss Set (…)" piece in a
 *      hat/top/bottom/overall slot is the CRA armour stage. Safer than string
 *      matching, because the catalogue already knows the set;
 *   4. an anchored, slot-scoped name PREFIX — the only thing that reaches names
 *      the v270 dump does not have at all (Ren's "Fafnir Soaring Sword",
 *      "Genesis Sword") and the per-job-branch names `examples` cannot enumerate;
 *   5. `slotFallback`, for slots where every item gets identical advice.
 *
 * Pass `slot` whenever you have it. It is what lets an unknown name match a
 * family safely; without it, an ambiguous matcher yields `undefined` rather than
 * a guess.
 *
 * `undefined` means UNKNOWN, never INVALID — callers must degrade gracefully and
 * say so, not suppress the item.
 */
export function stageForItem(itemName: string, slot?: GearSlot): PathStage | undefined {
	const nameNorm = norm(itemName);

	const literal = STAGE_BY_NAME.get(nameNorm);
	if (literal && (!slot || !literal.match || literal.match.slots.includes(slot))) return literal;

	const facts = catalogueFacts(itemName, slot);
	for (const canonical of facts.names) {
		const hit = STAGE_BY_NAME.get(canonical);
		if (hit && (!slot || !hit.match || hit.match.slots.includes(slot))) return hit;
	}

	const effectiveSlot = slot ?? facts.slot;
	if (!effectiveSlot) {
		// Without a slot only an unambiguous set or prefix claim is safe.
		return (
			narrow(matcherCandidates(nameNorm, facts.sets, 'sets')) ??
			narrow(matcherCandidates(nameNorm, facts.sets, 'prefixes'))
		);
	}
	return (
		narrow(matcherCandidates(nameNorm, facts.sets, 'sets'), effectiveSlot) ??
		narrow(matcherCandidates(nameNorm, facts.sets, 'prefixes'), effectiveSlot) ??
		narrow(
			matcherCandidates(nameNorm, facts.sets, 'nonStarforceable', itemName, effectiveSlot),
			effectiveSlot
		) ??
		narrow(matcherCandidates(nameNorm, facts.sets, 'slotFallback'), effectiveSlot)
	);
}

/** The prescribed stopping point for an item, if we know its stage. */
export function stopPointForItem(itemName: string, slot?: GearSlot): StopPoint | undefined {
	return stageForItem(itemName, slot)?.stop;
}

/** The path an item sits on. */
export function pathForItem(itemName: string, slot?: GearSlot): SlotPath | undefined {
	const stage = stageForItem(itemName, slot);
	return stage ? PATH_BY_STAGE_ID.get(stage.id) : undefined;
}

/** The next stage on the same path, or `undefined` at the end of the path. */
export function nextStage(stageId: string): PathStage | undefined {
	const path = PATH_BY_STAGE_ID.get(stageId);
	if (!path) return undefined;
	const i = path.stages.findIndex((s) => s.id === stageId);
	return i >= 0 ? path.stages[i + 1] : undefined;
}

/**
 * The next stage that is actually a recommendation — i.e. skipping any Pitched or
 * Brilliant endpoint. This is what a "what's next for this slot" view should show.
 */
export function nextRecommendedStage(stageId: string): PathStage | undefined {
	let cur: PathStage | undefined = getStage(stageId);
	while (cur) {
		const next: PathStage | undefined = nextStage(cur.id);
		if (!next) return undefined;
		if (!next.outOfScope) return next;
		cur = next;
	}
	return undefined;
}

/** True for an item on a Pitched or Brilliant stage. These must never be ranked. */
export function isOutOfScope(itemName: string, slot?: GearSlot): boolean {
	return stageForItem(itemName, slot)?.outOfScope === true;
}

export type StarTargetVerdict = {
	known: boolean;
	prescribed?: number;
	onEvent?: number;
	mechanicalMax?: number;
	verdict:
		'unknown' | 'within-plan' | 'event-only' | 'over-invested' | 'impossible' | 'above-global-cap';
	why?: string;
};

/**
 * Whether a star target exceeds what this stage is worth, and by how much.
 *
 * `known: false` means the item is not in the ladder — say so, do not suppress.
 *
 * VERDICTS FOR A KNOWN ITEM ARE UNCHANGED and remain the suppression signal
 * `analysis/candidates.ts` branches on (`over-invested` / `impossible`). Since
 * no stage prescribes past 22 stars, a >22 target on a known item already lands
 * on one of those two.
 *
 * `above-global-cap` is ADDITIVE and only ever returned for an UNKNOWN item. The
 * 22-star ceiling is a cost-and-risk limit rather than a stat one — see
 * `PRESCRIBED_MAX_STAR` — and it comes from the star table, not from the ladder,
 * so it holds for a name we failed to recognise too. Callers that want a name gap to
 * fail closed rather than fall through to a 30-star recommendation should treat
 * `above-global-cap` the same as `over-invested`; callers that deliberately keep
 * generating speculative candidates for unlisted items can ignore it.
 */
export function starTargetVerdict(
	itemName: string,
	targetStars: number,
	slot?: GearSlot
): StarTargetVerdict {
	const stage = stageForItem(itemName, slot);
	if (!stage) {
		return targetStars > PRESCRIBED_MAX_STAR
			? {
					known: false,
					verdict: 'above-global-cap',
					why:
						`${targetStars} stars is past the ${PRESCRIBED_MAX_STAR}-star ceiling that applies ` +
						'to every item in the game. Not because the band above is worthless — main stat ' +
						'freezes at 22 but ATT keeps climbing — but because Safeguard ends at 17 and ' +
						'climbing 22 to 30 costs roughly 24 million attempts and 1.1 million destroyed ' +
						'copies in expectation. This item is not in the gear ladder, so there is no ' +
						'stage-specific stopping point to quote, but the ceiling still applies.'
				}
			: { known: false, verdict: 'unknown' };
	}
	const { stars, starsOnEvent } = stage.stop;
	const max = stage.maxStars;
	if (max !== undefined && targetStars > max) {
		return {
			known: true,
			prescribed: stars,
			onEvent: starsOnEvent,
			mechanicalMax: max,
			verdict: 'impossible',
			why: `${stage.name} caps at ${max} stars — ${targetStars} is not reachable on this item.`
		};
	}
	if (stars === undefined) {
		return {
			known: true,
			mechanicalMax: max,
			verdict: 'impossible',
			why: `${stage.name} takes no star force.`
		};
	}
	if (targetStars <= stars) {
		return {
			known: true,
			prescribed: stars,
			onEvent: starsOnEvent,
			mechanicalMax: max,
			verdict: 'within-plan'
		};
	}
	if (starsOnEvent !== undefined && targetStars <= starsOnEvent) {
		return {
			known: true,
			prescribed: stars,
			onEvent: starsOnEvent,
			mechanicalMax: max,
			verdict: 'event-only',
			why:
				`Past the ${stars}-star stopping point for ${stage.name}. Worth it only once this is ` +
				`your final stage for the slot, and only on a Star Force event.`
		};
	}
	return {
		known: true,
		prescribed: stars,
		onEvent: starsOnEvent,
		mechanicalMax: max,
		verdict: 'over-invested',
		why: stage.stop.why
	};
}

export function getGate(tier: TierId): GearGate | undefined {
	return GEAR_GATES.find((g) => g.tier === tier);
}

/**
 * Resolve a gate's boss requirements from `bosses.ts`. Returns one row per boss so
 * the caller can pick the easiest difficulty the character qualifies for.
 */
export function gateRequirements(gate: GearGate): {
	bossId: string;
	found: boolean;
	entryLevel?: number;
	reset?: Boss['reset'];
	soloCombatPower?: number;
	force?: { type: string; required: number };
	lootContributionHp?: number;
}[] {
	return gate.bossIds.map((bossId) => {
		const boss = getBoss(bossId);
		if (!boss) return { bossId, found: false };
		const force = forceRequirement(boss);
		const fivePct = fivePercentHp(boss);
		return {
			bossId,
			found: true,
			entryLevel: boss.entryLevel,
			reset: boss.reset,
			soloCombatPower: boss.cpGate?.solo,
			force: force ? { type: force.type, required: force.required } : undefined,
			lootContributionHp: fivePct ?? undefined
		};
	});
}
