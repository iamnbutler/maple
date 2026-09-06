// Hand-checkable synthetic characters shared by the calc unit tests.
// Not exported from `index.ts` — this file exists only so the specs agree on
// one set of numbers that can be verified with a calculator.

import type { CalcInput, Target } from './types';

/**
 * A Wind Archer with deliberately round numbers, chosen so every intermediate
 * of the damage index can be checked by hand:
 *
 *   DEX   = floor(20000 * 2.00) + 1000 = 41000
 *   STR   = floor( 1000 * 2.00) +  100 =  2100
 *   stat  = 4*41000 + 2100             = 166100      (formulas.md §1.2)
 *   att   = floor(1000 * 1.20)         =  1200       (§1.4)
 *   dmg   = 1 + (100 + 300)/100        =     5.00    (§1.6)
 *   fd    = 1 + 50/100                 =     1.50    (§1.6)
 *   crit  = 1.35 + 1.00                =     2.35    (§1.7, 100% crit rate)
 *   def   = 1 - 3.0 * (1 - 0.89)       =     0.67    (§1.8)
 *   level = 285 vs 285                 =     1.10    (§1.11)
 *   D     = 2,589,092,055
 */
export const WIND_ARCHER: CalcInput = {
	level: 285,
	classId: 'wind-archer',
	stats: {
		str: { base: 1000, percent: 100, flat: 100 },
		dex: { base: 20000, percent: 100, flat: 1000 },
		int: { base: 4, percent: 0, flat: 0 },
		luk: { base: 4, percent: 0, flat: 0 },
		hp: { base: 0, percent: 0, flat: 0 }
	},
	attack: { base: 1000, percent: 20, flat: 0 },
	magicAttack: { base: 0, percent: 0, flat: 0 },
	damagePercent: 100,
	bossDamagePercent: 300,
	finalDamagePercent: 50,
	ignoreDefensePercent: 89,
	criticalRatePercent: 100,
	criticalDamagePercent: 100,
	arcaneForce: 0,
	sacredForce: 0
};

/** The hand-computed damage index of `WIND_ARCHER` against `ARCANE_TARGET` (pdr 3.0). */
export const WIND_ARCHER_INDEX = 2_589_092_055;

/** Grandis preset from the design doc §4: 380% PDR, level 285. */
export const GRANDIS_TARGET: Target = { id: 'grandis', pdr: 3.8, level: 285 };

/**
 * Arcane preset from the design doc §4, retuned to 300% PDR so the fixture's
 * 89% IED reproduces the §3.3 worked example exactly.
 */
export const ARCANE_TARGET: Target = { id: 'arcane', pdr: 3.0, level: 285 };

/** Lucid — formulas.md §1.8 boss table: level 230, 300% PDR, Arcane Force 360. */
export const LUCID: Target = { id: 'lucid', pdr: 3.0, level: 230, arcaneReq: 360 };

/** Chosen Seren — formulas.md §1.8 boss table: level 270, 380% PDR, Sacred Force 200. */
export const SEREN: Target = { id: 'seren', pdr: 3.8, level: 270, sacredReq: 200 };
