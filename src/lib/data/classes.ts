// GMS class table (as of 2026-09).
//
// Sources — all values below are copied from docs/research/formulas.md:
//   * weaponConstant  — §1.5 "Weapon multiplier", job-keyed MapleStory Wiki
//     table (primary; covers the 2025-26 classes), cross-checked against the
//     weapon-keyed StrategyWiki table in the same section.
//   * primary/secondary — §1.2 "Stat multiplier", "Which stat is primary/
//     secondary" table (StrategyWiki §Stat Value).
//   * masteryPercent  — §4.0 "Weapon Mastery by class". We store the MINIMUM of
//     the published range, because the maximum assumes every mastery-boosting
//     buff is up. Mastery only affects the LOWER end of the damage range; it
//     cancels entirely in ratio comparisons (§1.9).
//   * jobType         — §4 "Legion Member Effects — full class table (GMS 2026)"
//     (§§4.1-4.6), which is also the roster used to decide which classes exist
//     in GMS. Lethe (§4.7) is KMS-only and is deliberately absent; Beast Tamer,
//     Jett and Zen are removed classes (§4 notes) and are also absent.
//
// Anything not attributable to those tables is marked `// UNVERIFIED`.

import type { StatKey } from '../calc/types';

export type JobType = 'warrior' | 'magician' | 'bowman' | 'thief' | 'pirate' | 'thief-pirate';

export interface ClassFlags {
	/** Stat multiplier is 4*(STR+DEX+LUK) with no secondary (formulas.md §1.2). */
	xenon?: boolean;
	/** Stat multiplier is the HP formula (formulas.md §1.2). */
	demonAvenger?: boolean;
	/** Elemental Blessing grants Final Magic ATT per Max HP (formulas.md §1.4). */
	kanna?: boolean;
}

export interface ClassDef {
	/** kebab-case identifier used everywhere else in the app. */
	id: string;
	name: string;
	jobType: JobType;
	/** Stats multiplied by 4 in the stat multiplier. */
	primary: StatKey[];
	/** Stats added at 1x in the stat multiplier. */
	secondary: StatKey[];
	/** True when the class's damage uses Magic ATT / %Magic ATT instead of ATT. */
	usesMagicAttack: boolean;
	/** Default weapon constant (formulas.md §1.5). */
	weaponConstant: number;
	/** For classes that can swap weapon types with different constants. */
	weaponVariants?: Record<string, number>;
	/** Minimum of the published mastery range (formulas.md §4.0), whole percent. */
	masteryPercent: number;
	flags?: ClassFlags;
}

const CLASS_LIST: ClassDef[] = [
	// ------------------------------------------------------------------
	// Explorers (formulas.md §4.1)
	// ------------------------------------------------------------------
	{
		// §1.5: "1.44 | Hero with 2H Sword / 2H Axe", "1.34 | Hero with 1H Sword/1H Axe".
		// Default to the 2H constant; `weaponVariants` carries both.
		id: 'hero',
		name: 'Hero',
		jobType: 'warrior',
		primary: ['str'],
		secondary: ['dex'],
		usesMagicAttack: false,
		weaponConstant: 1.44,
		weaponVariants: { '1h': 1.34, '2h': 1.44 },
		masteryPercent: 90 // §4.0 Hero 90-91%
	},
	{
		// §1.5: "1.34 | ... Paladin with 2H Sword/2H Blunt", "1.24 | Paladin with 1H Sword/1H Blunt".
		id: 'paladin',
		name: 'Paladin',
		jobType: 'warrior',
		primary: ['str'],
		secondary: ['dex'],
		usesMagicAttack: false,
		weaponConstant: 1.34,
		weaponVariants: { '1h': 1.24, '2h': 1.34 },
		masteryPercent: 90 // §4.0 Paladin 90-95%
	},
	{
		id: 'dark-knight',
		name: 'Dark Knight',
		jobType: 'warrior',
		primary: ['str'],
		secondary: ['dex'],
		usesMagicAttack: false,
		weaponConstant: 1.49, // §1.5
		masteryPercent: 90 // §4.0 Dark Knight 90-92%
	},
	{
		id: 'arch-mage-fp',
		name: 'Arch Mage (Fire, Poison)',
		jobType: 'magician',
		primary: ['int'],
		secondary: ['luk'],
		usesMagicAttack: true,
		weaponConstant: 1.2, // §1.5 "1.2 | All Magicians except Kanna and Lynn"
		masteryPercent: 95 // §4.0 Arch Mage (F/P) 95-96%
	},
	{
		id: 'arch-mage-il',
		name: 'Arch Mage (Ice, Lightning)',
		jobType: 'magician',
		primary: ['int'],
		secondary: ['luk'],
		usesMagicAttack: true,
		weaponConstant: 1.2, // §1.5
		masteryPercent: 95 // §4.0 Arch Mage (I/L) 95-96%
	},
	{
		id: 'bishop',
		name: 'Bishop',
		jobType: 'magician',
		primary: ['int'],
		secondary: ['luk'],
		usesMagicAttack: true,
		weaponConstant: 1.2, // §1.5
		masteryPercent: 95 // UNVERIFIED — Bishop is absent from the §4.0 mastery table; 95 mirrors the other Explorer Arch Mages
	},
	{
		id: 'bow-master',
		name: 'Bow Master',
		jobType: 'bowman',
		primary: ['dex'],
		secondary: ['str'],
		usesMagicAttack: false,
		weaponConstant: 1.3, // §1.5
		masteryPercent: 85 // §4.0 Bowmaster 85-87%
	},
	{
		id: 'marksman',
		name: 'Marksman',
		jobType: 'bowman',
		primary: ['dex'],
		secondary: ['str'],
		usesMagicAttack: false,
		weaponConstant: 1.35, // §1.5
		masteryPercent: 85 // §4.0 Marksman 85-87%
	},
	{
		id: 'pathfinder',
		name: 'Pathfinder',
		jobType: 'bowman',
		primary: ['dex'],
		secondary: ['str'],
		usesMagicAttack: false,
		weaponConstant: 1.3, // §1.5
		masteryPercent: 85 // §4.0 Pathfinder 85-87%
	},
	{
		id: 'night-lord',
		name: 'Night Lord',
		jobType: 'thief',
		primary: ['luk'],
		secondary: ['dex'],
		usesMagicAttack: false,
		weaponConstant: 1.75, // §1.5
		masteryPercent: 85 // §4.0 Night Lord 85-87%
	},
	{
		// §1.2: "Thief — Shadower, Dual Blade, Cadena | LUK | DEX + STR"
		id: 'shadower',
		name: 'Shadower',
		jobType: 'thief',
		primary: ['luk'],
		secondary: ['dex', 'str'],
		usesMagicAttack: false,
		weaponConstant: 1.3, // §1.5
		masteryPercent: 90 // §4.0 Shadower 90-92%
	},
	{
		id: 'dual-blade',
		name: 'Dual Blade',
		jobType: 'thief',
		primary: ['luk'],
		secondary: ['dex', 'str'], // §1.2
		usesMagicAttack: false,
		weaponConstant: 1.3, // §1.5
		masteryPercent: 90 // §4.0 Dual Blade 90-92%
	},
	{
		// §1.2: "Pirate (knuckle users, Cannoneer) | STR | DEX"
		id: 'buccaneer',
		name: 'Buccaneer',
		jobType: 'pirate',
		primary: ['str'],
		secondary: ['dex'],
		usesMagicAttack: false,
		weaponConstant: 1.7, // §1.5
		masteryPercent: 90 // §4.0 Buccaneer 90-91%
	},
	{
		// §1.2: "Pirate (gun users, Angelic Buster) | DEX | STR"
		id: 'corsair',
		name: 'Corsair',
		jobType: 'pirate',
		primary: ['dex'],
		secondary: ['str'],
		usesMagicAttack: false,
		weaponConstant: 1.5, // §1.5
		masteryPercent: 85 // §4.0 Corsair 85-87%
	},
	{
		id: 'cannoneer',
		name: 'Cannoneer',
		jobType: 'pirate',
		primary: ['str'], // §1.2 names Cannoneer explicitly in the STR pirate row
		secondary: ['dex'],
		usesMagicAttack: false,
		weaponConstant: 1.5, // §1.5
		masteryPercent: 85 // §4.0 Cannoneer 85-87%
	},

	// ------------------------------------------------------------------
	// Cygnus Knights (formulas.md §4.2)
	// ------------------------------------------------------------------
	{
		// §1.5: "1.34 | ... Dawn Warrior with 2H Sword"; "1.24 | ... Dawn Warrior with 1H Sword".
		id: 'dawn-warrior',
		name: 'Dawn Warrior',
		jobType: 'warrior',
		primary: ['str'],
		secondary: ['dex'],
		usesMagicAttack: false,
		weaponConstant: 1.34,
		weaponVariants: { '1h': 1.24, '2h': 1.34 },
		masteryPercent: 90 // §4.0 Dawn Warrior 90-92%
	},
	{
		id: 'mihile',
		name: 'Mihile',
		jobType: 'warrior',
		primary: ['str'],
		secondary: ['dex'],
		usesMagicAttack: false,
		weaponConstant: 1.24, // §1.5
		masteryPercent: 90 // §4.0 Mihile 90-92%
	},
	{
		// GMS name "Blaze Wizard"; §4.0 lists the same class as "Flame Wizard".
		id: 'blaze-wizard',
		name: 'Blaze Wizard',
		jobType: 'magician',
		primary: ['int'],
		secondary: ['luk'],
		usesMagicAttack: true,
		weaponConstant: 1.2, // §1.5
		masteryPercent: 95 // §4.0 Flame Wizard 95-98%
	},
	{
		id: 'wind-archer',
		name: 'Wind Archer',
		jobType: 'bowman',
		primary: ['dex'],
		secondary: ['str'],
		usesMagicAttack: false,
		weaponConstant: 1.3, // §1.5
		masteryPercent: 85 // §4.0 Wind Archer 85-87%
	},
	{
		id: 'night-walker',
		name: 'Night Walker',
		jobType: 'thief',
		primary: ['luk'],
		secondary: ['dex'],
		usesMagicAttack: false,
		weaponConstant: 1.75, // §1.5
		masteryPercent: 85 // §4.0 Night Walker 85-87%
	},
	{
		id: 'thunder-breaker',
		name: 'Thunder Breaker',
		jobType: 'pirate',
		primary: ['str'], // §1.2 knuckle pirate
		secondary: ['dex'],
		usesMagicAttack: false,
		weaponConstant: 1.7, // §1.5
		masteryPercent: 90 // §4.0 Thunder Breaker 90-92%
	},

	// ------------------------------------------------------------------
	// Heroes / Legends (formulas.md §4.3)
	// ------------------------------------------------------------------
	{
		id: 'aran',
		name: 'Aran',
		jobType: 'warrior',
		primary: ['str'],
		secondary: ['dex'],
		usesMagicAttack: false,
		weaponConstant: 1.49, // §1.5
		masteryPercent: 90 // §4.0 Aran 90-92%
	},
	{
		id: 'evan',
		name: 'Evan',
		jobType: 'magician',
		primary: ['int'],
		secondary: ['luk'],
		usesMagicAttack: true,
		weaponConstant: 1.2, // §1.5
		masteryPercent: 95 // §4.0 Evan 95-98%
	},
	{
		id: 'luminous',
		name: 'Luminous',
		jobType: 'magician',
		primary: ['int'],
		secondary: ['luk'],
		usesMagicAttack: true,
		weaponConstant: 1.2, // §1.5
		masteryPercent: 95 // §4.0 Luminous 95-97%
	},
	{
		id: 'mercedes',
		name: 'Mercedes',
		jobType: 'bowman',
		primary: ['dex'],
		secondary: ['str'],
		usesMagicAttack: false,
		weaponConstant: 1.3, // §1.5
		masteryPercent: 85 // §4.0 Mercedes 85-87%
	},
	{
		id: 'phantom',
		name: 'Phantom',
		jobType: 'thief',
		primary: ['luk'],
		secondary: ['dex'],
		usesMagicAttack: false,
		weaponConstant: 1.3, // §1.5
		masteryPercent: 90 // §4.0 Phantom 90-92%
	},
	{
		id: 'shade',
		name: 'Shade',
		jobType: 'pirate',
		primary: ['str'], // §1.2 knuckle pirate
		secondary: ['dex'],
		usesMagicAttack: false,
		weaponConstant: 1.7, // §1.5
		masteryPercent: 90 // §4.0 Shade 90-92%
	},

	// ------------------------------------------------------------------
	// Resistance / Demon (formulas.md §4.4)
	// ------------------------------------------------------------------
	{
		id: 'blaster',
		name: 'Blaster',
		jobType: 'warrior',
		primary: ['str'],
		secondary: ['dex'],
		usesMagicAttack: false,
		weaponConstant: 1.7, // §1.5
		masteryPercent: 90 // §4.0 Blaster 90-92%
	},
	{
		id: 'battle-mage',
		name: 'Battle Mage',
		jobType: 'magician',
		primary: ['int'],
		secondary: ['luk'],
		usesMagicAttack: true,
		weaponConstant: 1.2, // §1.5
		masteryPercent: 95 // §4.0 Battle Mage 95-97%
	},
	{
		id: 'wild-hunter',
		name: 'Wild Hunter',
		jobType: 'bowman',
		primary: ['dex'],
		secondary: ['str'],
		usesMagicAttack: false,
		weaponConstant: 1.35, // §1.5
		masteryPercent: 85 // §4.0 Wild Hunter 85-87%
	},
	{
		id: 'mechanic',
		name: 'Mechanic',
		jobType: 'pirate',
		primary: ['dex'], // §1.2 gun pirate
		secondary: ['str'],
		usesMagicAttack: false,
		weaponConstant: 1.5, // §1.5
		masteryPercent: 85 // §4.0 Mechanic 85-87%
	},
	{
		// §1.2: "Xenon | STR + DEX + LUK | none"; §4.4 calls it a Thief/Pirate hybrid.
		id: 'xenon',
		name: 'Xenon',
		jobType: 'thief-pirate',
		primary: ['str', 'dex', 'luk'],
		secondary: [],
		usesMagicAttack: false,
		weaponConstant: 1.3125, // §1.5
		masteryPercent: 90, // §4.0 Xenon 90-92%
		flags: { xenon: true }
	},
	{
		id: 'demon-slayer',
		name: 'Demon Slayer',
		jobType: 'warrior',
		primary: ['str'],
		secondary: ['dex'],
		usesMagicAttack: false,
		weaponConstant: 1.2, // §1.5 "1.2 | ... Demon Slayer"
		masteryPercent: 90 // §4.0 Demon Slayer 90-92%
	},
	{
		// §1.2: "Demon Avenger | HP | STR" plus the dedicated HP stat-value formula.
		id: 'demon-avenger',
		name: 'Demon Avenger',
		jobType: 'warrior',
		primary: ['hp'],
		secondary: ['str'],
		usesMagicAttack: false,
		weaponConstant: 1.3, // §1.5
		masteryPercent: 90, // §4.0 Demon Avenger 90-92%
		flags: { demonAvenger: true }
	},

	// ------------------------------------------------------------------
	// Nova (formulas.md §4.5)
	// ------------------------------------------------------------------
	{
		id: 'kaiser',
		name: 'Kaiser',
		jobType: 'warrior',
		primary: ['str'],
		secondary: ['dex'],
		usesMagicAttack: false,
		weaponConstant: 1.34, // §1.5
		masteryPercent: 90 // §4.0 Kaiser 90-92%
	},
	{
		id: 'kain',
		name: 'Kain',
		jobType: 'bowman',
		primary: ['dex'],
		secondary: ['str'],
		usesMagicAttack: false,
		weaponConstant: 1.3, // §1.5
		masteryPercent: 85 // §4.0 Kain 85-87%
	},
	{
		id: 'cadena',
		name: 'Cadena',
		jobType: 'thief',
		primary: ['luk'],
		secondary: ['dex', 'str'], // §1.2
		usesMagicAttack: false,
		weaponConstant: 1.3, // §1.5
		masteryPercent: 90 // §4.0 Cadena 90-92%
	},
	{
		id: 'angelic-buster',
		name: 'Angelic Buster',
		jobType: 'pirate',
		primary: ['dex'], // §1.2 names Angelic Buster explicitly in the DEX pirate row
		secondary: ['str'],
		usesMagicAttack: false,
		weaponConstant: 1.7, // §1.5
		masteryPercent: 95 // §4.0 Angelic Buster 95-97%
	},

	// ------------------------------------------------------------------
	// Transcendent / Friends World / Flora / Anima / Sengoku / Jianghu / Shine
	// (formulas.md §4.6)
	// ------------------------------------------------------------------
	{
		// §1.5: "1.49 | ... Zero: Beta"; "1.34 | ... Zero: Alpha".
		id: 'zero',
		name: 'Zero',
		jobType: 'warrior',
		primary: ['str'],
		secondary: ['dex'],
		usesMagicAttack: false,
		weaponConstant: 1.34,
		weaponVariants: { alpha: 1.34, beta: 1.49 },
		masteryPercent: 90 // UNVERIFIED — Zero is absent from the §4.0 mastery table
	},
	{
		id: 'kinesis',
		name: 'Kinesis',
		jobType: 'magician',
		primary: ['int'],
		secondary: ['luk'],
		usesMagicAttack: true,
		weaponConstant: 1.2, // §1.5 "All Magicians except Kanna and Lynn"
		masteryPercent: 90 // §4.0 Kinesis 90-99%
	},
	{
		id: 'adele',
		name: 'Adele',
		jobType: 'warrior',
		primary: ['str'],
		secondary: ['dex'],
		usesMagicAttack: false,
		weaponConstant: 1.3, // §1.5
		masteryPercent: 90 // §4.0 Adele 90-92%
	},
	{
		id: 'illium',
		name: 'Illium',
		jobType: 'magician',
		primary: ['int'],
		secondary: ['luk'],
		usesMagicAttack: true,
		weaponConstant: 1.2, // §1.5 "All Magicians except Kanna and Lynn"
		masteryPercent: 90 // §4.0 Illium 90-93%
	},
	{
		id: 'khali',
		name: 'Khali',
		jobType: 'thief',
		primary: ['luk'],
		secondary: ['dex'],
		usesMagicAttack: false,
		weaponConstant: 1.3, // §1.5
		masteryPercent: 90 // UNVERIFIED — Khali is absent from the §4.0 mastery table
	},
	{
		id: 'ark',
		name: 'Ark',
		jobType: 'pirate',
		primary: ['str'], // §1.2 knuckle pirate
		secondary: ['dex'],
		usesMagicAttack: false,
		weaponConstant: 1.7, // §1.5
		masteryPercent: 90 // §4.0 Ark 90-92%
	},
	{
		id: 'lara',
		name: 'Lara',
		jobType: 'magician',
		primary: ['int'],
		secondary: ['luk'],
		usesMagicAttack: true,
		weaponConstant: 1.2, // §1.5 "All Magicians except Kanna and Lynn"
		masteryPercent: 95 // UNVERIFIED — Lara is absent from the §4.0 mastery table; 95 mirrors the other magicians
	},
	{
		id: 'hoyoung',
		name: 'Hoyoung',
		jobType: 'thief',
		primary: ['luk'],
		secondary: ['dex'],
		usesMagicAttack: false,
		weaponConstant: 1.3, // §1.5
		masteryPercent: 90 // §4.0 Hoyoung 90-92%
	},
	{
		// §4.6: Ren | Anima | Warrior. §1.5: "1.3 | ... Ren".
		id: 'ren',
		name: 'Ren',
		jobType: 'warrior',
		primary: ['str'], // §1.2 Warrior row (STR/DEX)
		secondary: ['dex'],
		usesMagicAttack: false,
		weaponConstant: 1.3,
		masteryPercent: 90 // UNVERIFIED — Ren postdates the §4.0 mastery table
	},
	{
		id: 'hayato',
		name: 'Hayato',
		jobType: 'warrior',
		primary: ['str'],
		secondary: ['dex'],
		usesMagicAttack: false,
		weaponConstant: 1.25, // §1.5 "1.25 | Hayato"
		masteryPercent: 90 // UNVERIFIED — Hayato is absent from the §4.0 mastery table
	},
	{
		id: 'kanna',
		name: 'Kanna',
		jobType: 'magician',
		primary: ['int'],
		secondary: ['luk'],
		usesMagicAttack: true,
		weaponConstant: 1.35, // §1.5 "1.35 | ... Kanna"
		masteryPercent: 95, // §4.0 Kanna 95-97%
		flags: { kanna: true }
	},
	{
		// §4.6: Lynn | Jianghu | Magician. §1.5: "1.34 | ... Lynn".
		// Lynn replaced Beast Tamer in GMS on 2024-05-01 (formulas.md §4 notes).
		id: 'lynn',
		name: 'Lynn',
		jobType: 'magician',
		primary: ['int'], // §1.2 Magician row (INT/LUK)
		secondary: ['luk'],
		usesMagicAttack: true, // UNVERIFIED — inferred from the Magician job type
		weaponConstant: 1.34,
		masteryPercent: 90 // UNVERIFIED — Lynn postdates the §4.0 mastery table
	},
	{
		// §4.6: Mo Xuan | Jianghu | Pirate. §1.5: "1.75 | ... Mo Xuan".
		id: 'mo-xuan',
		name: 'Mo Xuan',
		jobType: 'pirate',
		// UNVERIFIED — §1.2 splits Pirates into STR (knuckle/Cannoneer) and DEX
		// (gun/Angelic Buster) groups and does not place Mo Xuan in either.
		primary: ['str'],
		secondary: ['dex'],
		usesMagicAttack: false,
		weaponConstant: 1.75,
		masteryPercent: 90 // UNVERIFIED — Mo Xuan postdates the §4.0 mastery table
	},
	{
		// §4.6: Sia Astelle | Shine | Magician. Not named in §1.5's job table, so
		// the constant follows its "1.2 | All Magicians except Kanna and Lynn" row.
		id: 'sia-astelle',
		name: 'Sia Astelle',
		jobType: 'magician',
		primary: ['int'], // §1.2 Magician row
		secondary: ['luk'],
		usesMagicAttack: true, // UNVERIFIED — inferred from the Magician job type
		weaponConstant: 1.2,
		masteryPercent: 95 // UNVERIFIED — Sia Astelle postdates the §4.0 mastery table
	},
	{
		// §4.6: Erel Light | Shine | Warrior. §1.5: "1.49 | ... Erel Light".
		id: 'erel-light',
		name: 'Erel Light',
		jobType: 'warrior',
		primary: ['str'], // §1.2 Warrior row
		secondary: ['dex'],
		usesMagicAttack: false,
		weaponConstant: 1.49,
		masteryPercent: 90 // UNVERIFIED — Erel Light postdates the §4.0 mastery table
	}
];

const BY_ID = new Map<string, ClassDef>(CLASS_LIST.map((c) => [c.id, c]));

/** Every GMS class, in roster order. */
export function listClasses(): readonly ClassDef[] {
	return CLASS_LIST;
}

/** Look up a class, returning `undefined` when the id is unknown. */
export function tryGetClass(id: string): ClassDef | undefined {
	return BY_ID.get(id);
}

/** Look up a class; throws when the id is unknown. */
export function getClass(id: string): ClassDef {
	const found = BY_ID.get(id);
	if (!found) throw new Error(`Unknown classId: ${JSON.stringify(id)}`);
	return found;
}
