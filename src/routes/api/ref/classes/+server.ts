// Reference: playable classes, from src/lib/data/classes.ts.
//
// `primary` / `secondary` are the stat-multiplier groups (formulas.md §1.2), so
// Xenon reports three primaries and Shadower / Dual Blade / Cadena report two
// secondaries. `weaponConstant` is the default for the class (design §11: Hero
// is modelled as two-handed only).

import { json } from '@sveltejs/kit';

import { listClasses } from '$lib/data/classes';

import type { RequestHandler } from './$types';

export const GET: RequestHandler = () =>
	json(
		listClasses().map((cls) => ({
			id: cls.id,
			name: cls.name,
			jobType: cls.jobType,
			primary: cls.primary,
			secondary: cls.secondary,
			usesMagicAttack: cls.usesMagicAttack,
			weaponConstant: cls.weaponConstant,
			...(cls.weaponVariants ? { weaponVariants: cls.weaponVariants } : {}),
			masteryPercent: cls.masteryPercent,
			...(cls.flags ? { flags: cls.flags } : {})
		}))
	);
