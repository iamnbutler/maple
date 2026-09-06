// Weapon multipliers ("weapon constant") keyed by WEAPON TYPE.
//
// Source: docs/research/formulas.md §1.5 "Weapon multiplier (a.k.a. weapon
// constant)", the StrategyWiki weapon-keyed table
// (https://strategywiki.org/wiki/MapleStory/Formulas §Weapon Multiplier).
//
// Where a class overrides the base value for its own weapon type the override
// is listed in `WEAPON_CONSTANT_OVERRIDES` below; formulas.md §1.5 notes the
// job-keyed MapleStory Wiki table is the primary source for per-class values
// (see src/lib/data/classes.ts), and that StrategyWiki's 1H-Axe base of 1.20
// disagrees with the job table's Hero 1H Axe = 1.34.

export type WeaponType =
	| 'wand'
	| 'staff'
	| 'shining-rod'
	| 'psy-limiter'
	| 'magic-gauntlet'
	| 'one-handed-blunt'
	| 'one-handed-axe'
	| 'one-handed-sword'
	| 'katana'
	| 'bow'
	| 'dagger'
	| 'dual-bowguns'
	| 'cane'
	| 'desperado'
	| 'energy-chain'
	| 'ancient-bow'
	| 'buchae'
	| 'tuner'
	| 'breath-shooter'
	| 'chakram'
	| 'whip-blade'
	| 'energy-sword'
	| 'two-handed-blunt'
	| 'long-sword'
	| 'scepter'
	| 'two-handed-sword'
	| 'two-handed-axe'
	| 'crossbow'
	| 'fan'
	| 'spear'
	| 'polearm'
	| 'great-sword'
	| 'gun'
	| 'cannon'
	| 'knuckle'
	| 'soul-shooter'
	| 'arm-cannon'
	| 'claw';

/**
 * Base weapon multiplier per weapon type.
 * docs/research/formulas.md §1.5, "By weapon type" table.
 */
export const WEAPON_CONSTANTS: Record<WeaponType, number> = {
	// 1.20 — Wand, Staff, Shining Rod, Psy Limiter, Magic Gauntlet
	wand: 1.2,
	staff: 1.2,
	'shining-rod': 1.2,
	'psy-limiter': 1.2,
	'magic-gauntlet': 1.2,
	// 1.20 — One-handed Blunt Weapon (1.24 Paladin)
	'one-handed-blunt': 1.2,
	// 1.20 — One-handed Axe (1.34 Hero)
	'one-handed-axe': 1.2,
	// 1.24 — One-handed Sword (1.34 Hero)
	'one-handed-sword': 1.24,
	// 1.25 — Katana (Hayato)
	katana: 1.25,
	// 1.30 — Bow, Dagger, Dual Bowguns, Cane, Desperado, Energy Chain,
	//        Ancient Bow, Buchae, Tuner, Breath Shooter, Chakram
	bow: 1.3,
	dagger: 1.3,
	'dual-bowguns': 1.3,
	cane: 1.3,
	desperado: 1.3,
	'energy-chain': 1.3,
	'ancient-bow': 1.3,
	buchae: 1.3,
	tuner: 1.3,
	'breath-shooter': 1.3,
	chakram: 1.3,
	// 1.3125 — Whip Blade / Energy Sword (Xenon)
	'whip-blade': 1.3125,
	'energy-sword': 1.3125,
	// 1.34 — Two-handed Blunt Weapon, Long Sword (Lazuli), Scepter
	'two-handed-blunt': 1.34,
	'long-sword': 1.34,
	scepter: 1.34,
	// 1.34 — Two-handed Sword, Two-handed Axe (1.44 Hero)
	'two-handed-sword': 1.34,
	'two-handed-axe': 1.34,
	// 1.35 — Crossbow, Fan
	crossbow: 1.35,
	fan: 1.35,
	// 1.49 — Spear, Polearm, Great Sword (Lapis)
	spear: 1.49,
	polearm: 1.49,
	'great-sword': 1.49,
	// 1.50 — Gun, Cannon
	gun: 1.5,
	cannon: 1.5,
	// 1.70 — Knuckle, Soul Shooter, Arm Cannon/Revolver
	knuckle: 1.7,
	'soul-shooter': 1.7,
	'arm-cannon': 1.7,
	// 1.75 — Claw
	claw: 1.75
};

/**
 * Per-class overrides of the by-weapon-type table.
 * docs/research/formulas.md §1.5 (parenthesised values in the weapon table,
 * cross-checked against the job-keyed table).
 */
export const WEAPON_CONSTANT_OVERRIDES: Record<string, Partial<Record<WeaponType, number>>> = {
	// Hero is modelled as two-handed only (see src/lib/data/classes.ts), so only
	// the 2H rows are carried here; §1.5's 1H Hero value of 1.34 is out of scope.
	hero: {
		'two-handed-sword': 1.44,
		'two-handed-axe': 1.44
	},
	paladin: {
		'one-handed-blunt': 1.24,
		'one-handed-sword': 1.24,
		'two-handed-blunt': 1.34,
		'two-handed-sword': 1.34
	}
};

/** Look up a weapon constant, applying the class override when there is one. */
export function weaponConstantFor(weapon: WeaponType, classId?: string): number {
	if (classId) {
		const override = WEAPON_CONSTANT_OVERRIDES[classId]?.[weapon];
		if (override !== undefined) return override;
	}
	return WEAPON_CONSTANTS[weapon];
}

/** The highest weapon constant in the game (Claw, 1.75) — the Combat Power denominator. */
export const MAX_WEAPON_CONSTANT = 1.75;
