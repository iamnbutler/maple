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

	/**
	 * In-game primary weapon type, e.g. "Bow", "Claw", "Sword".
	 * Populated from `CLASS_WEAPONS` at module load; see that table for sources.
	 */
	weaponType?: string;
	/** In-game secondary weapon type, e.g. "Imugi Gem", "Jewel", "Magic Marble". */
	secondaryType?: string;
	/** The full weapon record, including alternatives and catalogue aliases. */
	weapons?: ClassWeapons;
}

/* -------------------------------------------------------------------------- */
/* Weapons                                                                     */
/* -------------------------------------------------------------------------- */

/**
 * What a class actually holds.
 *
 * ⚠️ WEAPON TYPE AND WEAPON CONSTANT ARE INDEPENDENT. `weaponConstant` above is
 * job-keyed (formulas.md §1.5) and the newer classes get bespoke constants that
 * do NOT follow from their weapon type — Ren's 1.3 is a sourced per-class value,
 * not "the Sword constant". Never derive one of these two fields from the other.
 */
export interface ClassWeapons {
	/** Primary weapon type, spelled as the game and Grandis Library spell it. */
	weaponType: string;
	/** Other primary weapon types the class may equip. */
	weaponTypeAlternatives?: readonly string[];
	/** Secondary weapon type, spelled as the game spells it. */
	secondaryType: string;
	/** True when the primary is two-handed. Two-handed classes still take a secondary. */
	twoHandedPrimary?: boolean;
	/**
	 * The `weaponType` labels used by `src/lib/data/items/catalogue.json`, which
	 * come from maplestory.io's `typeInfo.subCategory` and do NOT always match the
	 * in-game name (Kain's "Whispershot" is subCategory "Breath Shooter"; Lynn's
	 * "Memorial Staff" is "Scepter"; Illium's "Lucent Gauntlet" is "Gauntlet").
	 * EMPTY means GMS v270 has no matching label — Ren, Mo Xuan, Sia Astelle and
	 * Erel Light postdate the v270 dump — and consumers must skip the check
	 * rather than warn.
	 */
	catalogueWeaponTypes: readonly string[];
}

/**
 * Per-class weapons. Primary source: the Grandis Library class pages
 * (<https://grandislibrary.com/>), cross-checked against maplestorywiki.net
 * class infoboxes and, where the item exists in GMS v270, against the
 * maplestory.io item API's subCategory.
 *
 * Ren is the class design §11 calls out: Sword + Imugi Gem, STR / DEX —
 * verified at <https://grandislibrary.com/anima/ren>.
 */
export const CLASS_WEAPONS: Record<string, ClassWeapons> = {
	// --- Explorers ---
	// The tracker models Hero as TWO-HANDED ONLY, to match the 1.44 weapon
	// constant chosen above (§1.5 lists 1.34 for a 1H Hero). Hero can hold 1H
	// swords/axes and 2H axes in game; that path is deliberately out of scope.
	hero: {
		weaponType: 'Two-Handed Sword',
		secondaryType: 'Medallion',
		twoHandedPrimary: true,
		catalogueWeaponTypes: ['Two-Handed Sword']
	},
	paladin: {
		weaponType: 'Two-Handed Sword',
		weaponTypeAlternatives: ['One-Handed Sword', 'One-Handed Blunt Weapon', 'Two-Handed Blunt'],
		secondaryType: 'Rosary',
		catalogueWeaponTypes: [
			'Two-Handed Sword',
			'One-Handed Sword',
			'One-Handed Blunt Weapon',
			'Two-Handed Blunt'
		]
	},
	'dark-knight': {
		weaponType: 'Spear',
		weaponTypeAlternatives: ['Pole Arm'],
		secondaryType: 'Iron Chain',
		twoHandedPrimary: true,
		catalogueWeaponTypes: ['Spear', 'Pole Arm']
	},
	'arch-mage-fp': {
		weaponType: 'Staff',
		weaponTypeAlternatives: ['Wand'],
		secondaryType: 'Magic Book',
		catalogueWeaponTypes: ['Staff', 'Wand']
	},
	'arch-mage-il': {
		weaponType: 'Staff',
		weaponTypeAlternatives: ['Wand'],
		secondaryType: 'Magic Book',
		catalogueWeaponTypes: ['Staff', 'Wand']
	},
	bishop: {
		weaponType: 'Staff',
		weaponTypeAlternatives: ['Wand'],
		secondaryType: 'Magic Book',
		catalogueWeaponTypes: ['Staff', 'Wand']
	},
	'bow-master': {
		weaponType: 'Bow',
		secondaryType: 'Arrow Fletching',
		twoHandedPrimary: true,
		catalogueWeaponTypes: ['Bow']
	},
	marksman: {
		weaponType: 'Crossbow',
		secondaryType: 'Bow Thimble',
		twoHandedPrimary: true,
		catalogueWeaponTypes: ['Crossbow']
	},
	pathfinder: {
		weaponType: 'Ancient Bow',
		secondaryType: 'Relic',
		twoHandedPrimary: true,
		catalogueWeaponTypes: ['Ancient Bow']
	},
	'night-lord': {
		weaponType: 'Claw',
		secondaryType: 'Charm',
		twoHandedPrimary: true,
		catalogueWeaponTypes: ['Claw']
	},
	shadower: {
		weaponType: 'Dagger',
		secondaryType: 'Dagger Scabbard',
		catalogueWeaponTypes: ['Dagger']
	},
	'dual-blade': {
		weaponType: 'Dagger',
		secondaryType: 'Katara',
		catalogueWeaponTypes: ['Dagger']
	},
	buccaneer: {
		weaponType: 'Knuckle',
		secondaryType: 'Wrist Band',
		twoHandedPrimary: true,
		catalogueWeaponTypes: ['Knuckle']
	},
	corsair: {
		weaponType: 'Gun',
		secondaryType: 'Far Sight',
		catalogueWeaponTypes: ['Gun']
	},
	cannoneer: {
		weaponType: 'Hand Cannon',
		secondaryType: 'Powder Keg',
		twoHandedPrimary: true,
		catalogueWeaponTypes: ['Hand Cannon']
	},

	// --- Cygnus Knights ---
	'dawn-warrior': {
		weaponType: 'Two-Handed Sword',
		weaponTypeAlternatives: ['One-Handed Sword'],
		secondaryType: 'Jewel',
		catalogueWeaponTypes: ['Two-Handed Sword', 'One-Handed Sword']
	},
	mihile: {
		weaponType: 'One-Handed Sword',
		secondaryType: 'Soul Shield',
		catalogueWeaponTypes: ['One-Handed Sword']
	},
	'blaze-wizard': {
		weaponType: 'Staff',
		weaponTypeAlternatives: ['Wand'],
		secondaryType: 'Jewel',
		catalogueWeaponTypes: ['Staff', 'Wand']
	},
	'wind-archer': {
		weaponType: 'Bow',
		secondaryType: 'Jewel',
		twoHandedPrimary: true, // GMS item data: "Two-Handed Weapon / Bow"
		catalogueWeaponTypes: ['Bow']
	},
	'night-walker': {
		weaponType: 'Claw',
		secondaryType: 'Jewel',
		twoHandedPrimary: true, // GMS item data: "Two-Handed Weapon / Claw"
		catalogueWeaponTypes: ['Claw']
	},
	'thunder-breaker': {
		weaponType: 'Knuckle',
		secondaryType: 'Jewel',
		twoHandedPrimary: true,
		catalogueWeaponTypes: ['Knuckle']
	},

	// --- Heroes / Legends ---
	aran: {
		weaponType: 'Pole Arm',
		secondaryType: 'Mass',
		twoHandedPrimary: true,
		catalogueWeaponTypes: ['Pole Arm']
	},
	evan: {
		weaponType: 'Staff',
		weaponTypeAlternatives: ['Wand'],
		secondaryType: 'Document',
		catalogueWeaponTypes: ['Staff', 'Wand']
	},
	luminous: {
		weaponType: 'Shining Rod',
		secondaryType: 'Orb',
		catalogueWeaponTypes: ['Shining Rod']
	},
	mercedes: {
		weaponType: 'Dual Bowgun',
		secondaryType: 'Magic Arrow',
		twoHandedPrimary: true,
		catalogueWeaponTypes: ['Dual Bowgun']
	},
	phantom: {
		weaponType: 'Cane',
		secondaryType: 'Card',
		catalogueWeaponTypes: ['Cane']
	},
	shade: {
		weaponType: 'Knuckle',
		secondaryType: 'Fox Marble',
		twoHandedPrimary: true,
		catalogueWeaponTypes: ['Knuckle']
	},

	// --- Resistance ---
	blaster: {
		weaponType: 'Arm Cannon',
		secondaryType: 'Charge',
		twoHandedPrimary: true,
		catalogueWeaponTypes: ['Arm Cannon']
	},
	'battle-mage': {
		weaponType: 'Staff',
		secondaryType: 'Magic Marble',
		catalogueWeaponTypes: ['Staff']
	},
	'wild-hunter': {
		weaponType: 'Crossbow',
		secondaryType: 'Arrowhead',
		twoHandedPrimary: true,
		catalogueWeaponTypes: ['Crossbow']
	},
	mechanic: {
		weaponType: 'Gun',
		secondaryType: 'Magnum',
		catalogueWeaponTypes: ['Gun']
	},
	xenon: {
		weaponType: 'Whip Blade',
		secondaryType: 'Core Controller',
		catalogueWeaponTypes: ['Whip Blade']
	},
	'demon-slayer': {
		weaponType: 'One-Handed Axe',
		weaponTypeAlternatives: ['One-Handed Blunt Weapon'],
		secondaryType: 'Demon Aegis',
		catalogueWeaponTypes: ['One-Handed Axe', 'One-Handed Blunt Weapon']
	},
	'demon-avenger': {
		weaponType: 'Desperado',
		secondaryType: 'Demon Aegis',
		catalogueWeaponTypes: ['Desperado']
	},

	// --- Nova ---
	kaiser: {
		weaponType: 'Two-Handed Sword',
		secondaryType: 'Dragon Essence',
		twoHandedPrimary: true,
		catalogueWeaponTypes: ['Two-Handed Sword']
	},
	kain: {
		// In-game "Whispershot"; the v270 item data calls the subCategory "Breath Shooter".
		weaponType: 'Whispershot',
		secondaryType: 'Weapon Belt',
		catalogueWeaponTypes: ['Breath Shooter']
	},
	cadena: {
		weaponType: 'Chain',
		secondaryType: 'Warp Forge',
		catalogueWeaponTypes: ['Chain']
	},
	'angelic-buster': {
		weaponType: 'Soul Shooter',
		secondaryType: 'Soul Ring',
		catalogueWeaponTypes: ['Soul Shooter']
	},

	// --- Child of God / Friends World ---
	zero: {
		// Alpha's Long Sword occupies the weapon slot, Beta's Heavy Sword the
		// secondary slot; the v270 data calls them Lapis and Lazuli.
		weaponType: 'Long Sword',
		secondaryType: 'Heavy Sword',
		twoHandedPrimary: true,
		catalogueWeaponTypes: ['Lapis']
	},
	kinesis: {
		weaponType: 'Psy-limiter',
		secondaryType: 'Chess Piece',
		catalogueWeaponTypes: ['Psy-limiter']
	},

	// --- Flora ---
	adele: {
		weaponType: 'Bladecaster',
		secondaryType: 'Bladebinder',
		catalogueWeaponTypes: ['Bladecaster']
	},
	illium: {
		// In-game "Lucent Gauntlet"; v270 subCategory is plain "Gauntlet".
		weaponType: 'Lucent Gauntlet',
		secondaryType: 'Lucent Wing',
		catalogueWeaponTypes: ['Gauntlet']
	},
	khali: {
		// ⚠️ v270 mislabels the Chakram as subCategory "Two-Handed Sword"
		// (e.g. 1404007 "Cruso Apus"). Grandis Library, MapleWiki and the v.242
		// patch notes all say Chakram; the catalogue alias below follows the DATA
		// so lookups work, which is why a Khali holding a real two-handed sword
		// will not be flagged.
		weaponType: 'Chakram',
		secondaryType: 'Hex Seeker',
		twoHandedPrimary: true,
		catalogueWeaponTypes: ['Two-Handed Sword']
	},
	ark: {
		weaponType: 'Knuckle',
		secondaryType: 'Abyssal Path',
		twoHandedPrimary: true,
		catalogueWeaponTypes: ['Knuckle']
	},

	// --- Anima ---
	lara: {
		weaponType: 'Wand',
		secondaryType: 'Ornament',
		catalogueWeaponTypes: ['Wand']
	},
	hoyoung: {
		weaponType: 'Ritual Fan',
		secondaryType: 'Fan Tassel',
		catalogueWeaponTypes: ['Ritual Fan']
	},
	ren: {
		// design §11 priority class. Verified at https://grandislibrary.com/anima/ren:
		// "Swords (Longswords in MSEA) are the exclusive weapons of Ren. They are
		// one-handed weapons that are used in conjunction with Imugi Gems."
		// STR primary / DEX secondary, set on the ClassDef above.
		// NOTE: Ren's weaponConstant of 1.3 is a SOURCED per-class value from
		// formulas.md §1.5, not something derived from "Sword" — the newer classes
		// get bespoke constants that do not follow their weapon type. Do not
		// "correct" it to match another Sword user.
		weaponType: 'Sword',
		secondaryType: 'Imugi Gem',
		// Ren postdates the GMS v270 dump, so the catalogue has no Sword weapons
		// and no Imugi Gems. Consumers must skip the weapon check for Ren.
		catalogueWeaponTypes: []
	},

	// --- Sengoku ---
	hayato: {
		weaponType: 'Katana',
		// The items are named "... Blade" but the category is Kodachi.
		secondaryType: 'Kodachi',
		catalogueWeaponTypes: ['Katana']
	},
	kanna: {
		// GMS v.266 (2026-02-04) made the Fan one-handed and introduced Talisman as
		// a real, enhanceable secondary; before that Kanna had no secondary at all.
		// Source: https://www.nexon.com/maplestory/news/update/35483/updated-2-5-v-266-the-sengoku-warrior-reawakening-patch-notes
		weaponType: 'Fan',
		secondaryType: 'Talisman',
		catalogueWeaponTypes: ['Fan']
	},

	// --- Jianghu / Shine (all postdate the v270 dump) ---
	lynn: {
		// In-game "Memorial Staff"; v270 subCategory is "Scepter".
		weaponType: 'Memorial Staff',
		secondaryType: 'Leaf',
		catalogueWeaponTypes: ['Scepter']
	},
	'mo-xuan': {
		weaponType: 'Martial Brace',
		secondaryType: 'Brace Band',
		catalogueWeaponTypes: []
	},
	'sia-astelle': {
		weaponType: 'Celestial Light',
		secondaryType: 'Compass',
		catalogueWeaponTypes: []
	},
	'erel-light': {
		weaponType: 'Gram',
		secondaryType: 'Keir',
		catalogueWeaponTypes: []
	}
};

const CLASS_LIST: ClassDef[] = [
	// ------------------------------------------------------------------
	// Explorers (formulas.md §4.1)
	// ------------------------------------------------------------------
	{
		// §1.5: "1.44 | Hero with 2H Sword / 2H Axe".
		// This tracker models Hero as two-handed only, so there is no variant
		// toggle: the constant IS 1.44. (§1.5 also lists 1.34 for a Hero holding
		// a 1H Sword/Axe; that path is out of scope and deliberately absent, so
		// nothing can accidentally resolve Hero to the 1H value.)
		id: 'hero',
		name: 'Hero',
		jobType: 'warrior',
		primary: ['str'],
		secondary: ['dex'],
		usesMagicAttack: false,
		weaponConstant: 1.44,
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

// Attach the weapon record to each class. Kept as a separate table above so the
// weapons stay reviewable in one block with their sources, rather than smeared
// across 53 class literals.
for (const cls of CLASS_LIST) {
	const weapons = CLASS_WEAPONS[cls.id];
	if (!weapons) continue;
	cls.weapons = weapons;
	cls.weaponType = weapons.weaponType;
	cls.secondaryType = weapons.secondaryType;
}

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
