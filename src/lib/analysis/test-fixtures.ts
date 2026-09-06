// A realistic Heroic character for the analysis tests.
//
// Ren is one of the five classes design §11 says must be exactly right, and a
// Wind Archer is the other bowman-shaped one; this fixture is a level 275
// Heroic Wind Archer with Arcane Umbra / Genesis gear, arcane symbols at
// mid-level and a partially-invested hyper stat build — i.e. the shape of
// character the ranking is actually for.
//
// The `displayed` numbers are the values `calc.displayedRange` and
// `calc.computeCombatPower` produce for this input, so the checksums read
// `match`; `checksums.spec.ts` perturbs them to exercise the other statuses.

import type { Character, Item, Slot } from '$lib/schema';

function item(slot: Slot, partial: Omit<Item, 'slot'>): [Slot, Item] {
	return [slot, { ...partial, slot }];
}

export function windArcherFixture(): Character {
	const equipment = Object.fromEntries([
		item('weapon', {
			name: 'Genesis Bow',
			category: 'weapon',
			itemLevel: 200,
			starforce: 22,
			total: { att: 754, str: 250, dex: 250, bossDmgPct: 30 },
			base: { att: 318, str: 0, dex: 0 },
			flame: { att: 62, dex: 0 },
			star: { att: 155 },
			potential: {
				grade: 'legendary',
				lines: ['Boss Damage : +40%', 'Ignore Enemy DEF : +40%', 'ATT : +12%']
			}
		}),
		item('secondary', {
			name: 'Evolving Arrow II',
			category: 'secondary',
			itemLevel: 200,
			starforce: 17,
			total: { att: 40, dex: 60, str: 30 },
			potential: {
				grade: 'unique',
				lines: ['Boss Damage : +30%', 'DEX : +9%', 'Ignore Enemy DEF : +30%']
			}
		}),
		item('emblem', {
			name: 'Gold Maple Leaf Emblem',
			category: 'emblem',
			itemLevel: 100,
			total: { att: 25, dex: 20 },
			potential: {
				grade: 'legendary',
				lines: ['Ignore Enemy DEF : +40%', 'DEX : +12%', 'DEX : +12%']
			}
		}),
		item('hat', {
			name: 'Arcane Umbra Hood',
			category: 'armor',
			itemLevel: 200,
			starforce: 22,
			total: { dex: 480, str: 180, att: 22 },
			base: { dex: 150, str: 60 },
			flame: { dex: 92, str: 33 },
			potential: {
				grade: 'legendary',
				lines: ['DEX : +12%', 'DEX : +12%', 'DEX : +9%']
			}
		}),
		item('top', {
			name: 'Arcane Umbra Archer Mail',
			category: 'armor',
			itemLevel: 200,
			starforce: 22,
			total: { dex: 470, str: 175, att: 22 },
			base: { dex: 150, str: 60 },
			flame: { dex: 88, str: 30 },
			potential: { grade: 'legendary', lines: ['DEX : +12%', 'DEX : +9%', 'DEX : +9%'] }
		}),
		item('bottom', {
			name: 'Arcane Umbra Archer Pants',
			category: 'armor',
			itemLevel: 200,
			starforce: 22,
			total: { dex: 455, str: 170, att: 22 },
			base: { dex: 150, str: 60 },
			flame: { dex: 76, str: 22 },
			potential: { grade: 'unique', lines: ['DEX : +9%', 'DEX : +9%', 'DEF : +6%'] }
		}),
		item('shoes', {
			name: 'Arcane Umbra Archer Shoes',
			category: 'armor',
			itemLevel: 200,
			starforce: 21,
			total: { dex: 440, str: 160, att: 20 },
			base: { dex: 130, str: 50 },
			flame: { dex: 66, str: 20 },
			potential: { grade: 'legendary', lines: ['DEX : +12%', 'DEX : +9%', 'Speed : +6'] }
		}),
		item('gloves', {
			name: 'Arcane Umbra Archer Gloves',
			category: 'armor',
			itemLevel: 200,
			starforce: 21,
			total: { dex: 320, str: 120, att: 40 },
			base: { dex: 110, str: 40 },
			flame: { dex: 55, att: 5 },
			potential: {
				grade: 'legendary',
				lines: ['Critical Damage : +8%', 'DEX : +12%', 'DEX : +9%']
			}
		}),
		item('cape', {
			name: 'Arcane Umbra Cape',
			category: 'armor',
			itemLevel: 200,
			starforce: 17,
			total: { dex: 300, str: 110, att: 18 },
			base: { dex: 110, str: 40 },
			flame: { dex: 44, str: 15 },
			potential: { grade: 'unique', lines: ['DEX : +9%', 'DEX : +6%', 'Max HP : +6%'] }
		}),
		item('belt', {
			name: 'Dreamy Belt',
			category: 'accessory',
			itemLevel: 200,
			starforce: 20,
			total: { dex: 260, str: 90, att: 15 },
			base: { dex: 90, str: 30 },
			flame: { dex: 39, str: 12 },
			potential: { grade: 'legendary', lines: ['DEX : +12%', 'DEX : +9%', 'All Stats : +6%'] }
		})
	]);

	return {
		id: 'zephyra',
		name: 'Zephyra',
		world: 'Kronos',
		classId: 'wind-archer',
		level: 275,
		statWindow: {
			capturedAt: '2026-09-06T00:00:00.000Z',
			str: { base: 2400, percent: 300, flat: 620 },
			dex: { base: 14800, percent: 302, flat: 8100 },
			int: { base: 4, percent: 0, flat: 0 },
			luk: { base: 4, percent: 0, flat: 0 },
			attack: { base: 1240, percent: 92, flat: 0 },
			damagePercent: 58,
			bossDamagePercent: 322,
			finalDamagePercent: 54,
			ignoreDefensePercent: 94.2,
			criticalRatePercent: 100,
			criticalDamagePercent: 76,
			arcaneForce: 1330,
			sacredForce: 480,
			displayed: {
				rangeMax: 21_124_769,
				rangeMin: 17_956_055,
				combatPower: 104_163_419
			}
		},
		equipment,
		symbols: {
			arcane: {
				vanishingJourney: 20,
				chuchu: 20,
				lachelein: 19,
				arcana: 18,
				morass: 17,
				esfera: 16
			},
			sacred: {
				cernium: 11,
				hotelArcus: 10,
				odium: 9,
				shangrila: 8,
				arteria: 7,
				carcion: 6
			}
		},
		hyperStats: {
			dex: 10,
			criticalDamage: 10,
			ignoreDefense: 9,
			damage: 8,
			bossDamage: 12,
			attMatt: 6,
			arcaneForce: 10
		},
		legion: { level: 8000 },
		createdAt: '2026-09-01T00:00:00.000Z',
		updatedAt: '2026-09-06T00:00:00.000Z'
	} satisfies Character;
}
