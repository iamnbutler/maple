#!/usr/bin/env node
// Seed the local store with characters.
//
//   node scripts/seed-characters.mjs [--base http://localhost:5177]
//
// Two characters:
//
//   lutoren  — the real one. Identity (name/level/class/rank) came from the GMS
//              rankings API; the GEAR was dictated from memory by the user on
//              2026-09-06 and every stat number here is INVENTED to be plausible
//              for that gear. Anything invented is marked `source.kind: "manual"`
//              with a note saying so, so a screenshot import can overwrite it
//              without anyone wondering which numbers were real.
//
//   rendemo  — a fictional better-geared Ren, kept so there is always something
//              with a full analysis to look at.
//
// Re-running is safe: characters are PUT/PATCHed, not appended.

const BASE = (() => {
	const i = process.argv.indexOf('--base');
	return i === -1 ? 'http://localhost:5177' : process.argv[i + 1];
})();

const GUESSED =
	'Dictated from memory, not read from a screenshot — stats are invented placeholders.';
const INVENTED = 'Slot not mentioned by the user; item and stats are invented placeholders.';

async function call(method, path, body) {
	const res = await fetch(`${BASE}${path}`, {
		method,
		headers: body ? { 'content-type': 'application/json' } : undefined,
		body: body ? JSON.stringify(body) : undefined
	});
	const text = await res.text();
	// 404 on the existence probe and 409 on a create race are both expected.
	if (!res.ok && res.status !== 409 && res.status !== 404) {
		throw new Error(`${method} ${path} -> ${res.status}\n${text.slice(0, 400)}`);
	}
	return { status: res.status, body: text ? JSON.parse(text) : null };
}

async function ensure(character) {
	// CharacterCreateSchema only accepts identity fields; everything else
	// (symbols, notes, hyper stats) goes on afterwards as a merge-patch.
	const { id, name, classId, level, world, ...rest } = character;
	const existing = await call('GET', `/api/characters/${id}`);
	if (existing.status === 404) {
		await call('POST', '/api/characters', { id, name, classId, level, world });
	}
	await call('PATCH', `/api/characters/${id}`, { name, classId, level, world, ...rest });
}

function item(name, extra, note) {
	return {
		name,
		source: { kind: 'manual', note: note ?? INVENTED, at: new Date().toISOString() },
		...extra
	};
}

/* -------------------------------------------------------------------------- */
/* Lutoren — the real character                                                */
/* -------------------------------------------------------------------------- */

// Ren is a STR warrior using a Sword + Imugi Gem (grandislibrary.com/anima/ren).
const CAP = 'CAPTURED from screenshots 2026-09-06 (docs/capture/2026-09-06-lutoren.md).';

// Every number below is read off a tooltip photograph. Where a tooltip shows a
// decomposition like `STR +142 (40 +62 +40)` we record only the TOTAL, because
// that is what the damage formula consumes; the base/flame/star split is in the
// capture doc.
const lutorenGear = {
	weapon: item(
		'Fafnir Soaring Sword',
		{
			itemLevel: 150,
			starforce: 14,
			setName: 'Root Abyss Set (Warrior)',
			total: {
				str: 125,
				dex: 77,
				maxHp: 230,
				maxMp: 230,
				att: 275,
				dmgPct: 4,
				bossDmgPct: 30,
				iedPct: 10
			},
			potential: {
				grade: 'legendary',
				lines: ['Attack Power : +12%', 'Attack Power : +9%', 'Boss Monster Damage : +30%']
			}
		},
		`${CAP} Ren-specific Fafnir weapon; one-handed sword, req Lv 125 (150-25). ` +
			`Soul: Magnificent Magnus Soul (Magic ATT +3%).`
	),
	hat: item(
		'Royal Warrior Helm',
		{
			itemLevel: 150,
			starforce: 17,
			setName: 'Root Abyss Set (Warrior)',
			total: {
				str: 142,
				dex: 134,
				int: 20,
				luk: 20,
				maxHp: 615,
				maxMp: 360,
				att: 27,
				matt: 19,
				def: 909,
				iedPct: 10
			},
			potential: {
				grade: 'legendary',
				lines: ['All Stats : +9%', 'STR : +9%', 'HP Recovery Items and Skills Efficiency : +30%']
			}
		},
		CAP
	),
	top: item(
		'Eagle Eye Warrior Armor',
		{
			itemLevel: 150,
			starforce: 12,
			setName: 'Root Abyss Set (Warrior)',
			total: { str: 81, dex: 97, int: 16, allStatPct: 6, maxHp: 180, att: 7, def: 386, iedPct: 5 },
			potential: { grade: 'unique', lines: ['All Stats : +6%', 'STR : +6%', 'DEX : +6%'] }
		},
		CAP
	),
	bottom: item(
		'Trixter Warrior Pants',
		{
			itemLevel: 150,
			starforce: 12,
			setName: 'Root Abyss Set (Warrior)',
			total: {
				str: 77,
				dex: 77,
				allStatPct: 6,
				maxHp: 180,
				maxMp: 2700,
				att: 8,
				def: 386,
				iedPct: 5
			},
			potential: { grade: 'unique', lines: ['LUK : +9%', 'All Stats : +6%', 'STR : +6%'] }
		},
		CAP
	),
	cape: item(
		'AbsoLab Knight Cape',
		{
			itemLevel: 160,
			starforce: 13,
			setName: 'AbsoLab Set (Warrior)',
			total: {
				str: 74,
				dex: 49,
				int: 40,
				luk: 15,
				allStatPct: 5,
				maxHp: 205,
				att: 6,
				matt: 2,
				def: 524
			},
			potential: { grade: 'unique', lines: ['STR : +10%', 'Max HP : +7%', 'Max MP : +7%'] }
		},
		CAP
	),
	gloves: item(
		'AbsoLab Knight Gloves',
		{
			itemLevel: 160,
			starforce: 14,
			setName: 'AbsoLab Set (Warrior)',
			total: { str: 93, dex: 127, luk: 25, att: 18, def: 306 },
			potential: {
				grade: 'legendary',
				lines: ['Critical Damage : +8%', 'Enables the <Decent Sharp Eyes> skill', 'LUK : +10%']
			}
		},
		CAP
	),
	shoes: item(
		'AbsoLab Knight Shoes',
		{
			itemLevel: 160,
			starforce: 13,
			setName: 'AbsoLab Set (Warrior)',
			total: { str: 133, dex: 54, int: 25, att: 11, def: 291, speed: 24, jump: 21 },
			potential: { grade: 'epic', lines: ['STR : +7%', 'LUK : +13', 'Max MP : +4%'] }
		},
		`${CAP} EPIC potential — the weakest potential on the character.`
	),
	shoulder: item(
		'Royal Black Metal Shoulder',
		{
			itemLevel: 120,
			starforce: 12,
			setName: 'Boss Accessory Set',
			total: { str: 41, dex: 41, int: 41, luk: 41, maxHp: 180, att: 6, matt: 6, def: 188 }
		},
		`${CAP} Potential: NONE — the tooltip shows no potential at all.`
	),
	secondary: item(
		"Princess No's Imugi Gem",
		{
			itemLevel: 140,
			total: { str: 14, dex: 14, att: 9 },
			potential: {
				grade: 'legendary',
				lines: ['Attack Power : +12%', 'Damage : +12%', 'Attack Power : +9%']
			}
		},
		`${CAP} Ren's secondary. Takes neither star force nor flames. Postdates the ` +
			`v270 catalogue, so it has no sprite and no per-item capability data.`
	),
	emblem: item(
		'Gold Sword Emblem',
		{
			itemLevel: 100,
			total: { str: 10, dex: 10, int: 10, luk: 10, att: 2, matt: 2 },
			potential: {
				grade: 'legendary',
				lines: ['Attack Power : +12%', 'Damage : +9%', 'Damage : +9%']
			}
		},
		`${CAP} Ren class emblem; postdates the v270 catalogue.`
	),
	pendant1: item(
		'Daybreak Pendant',
		{
			itemLevel: 140,
			starforce: 16,
			setName: 'Dawn Boss Set',
			total: {
				str: 81,
				dex: 145,
				int: 57,
				luk: 73,
				maxHp: 255,
				maxHpPct: 5,
				att: 16,
				matt: 10,
				def: 230
			},
			potential: { grade: 'unique', lines: ['STR : +9%', 'Max HP : +6%', 'STR : +6%'] }
		},
		`${CAP} NOTE the flame rolled DEX-heavy (+88 DEX vs +24 STR) on a STR class.`
	),
	pendant2: item(
		'Dominator Pendant',
		{
			itemLevel: 140,
			starforce: 17,
			setName: 'Boss Accessory Set',
			total: {
				str: 138,
				dex: 78,
				int: 118,
				luk: 98,
				allStatPct: 5,
				maxHp: 255,
				maxHpPct: 10,
				maxMpPct: 10,
				att: 20,
				matt: 20,
				def: 242
			},
			potential: { grade: 'unique', lines: ['STR : +9%', 'Max MP : +6%', 'All Stats : +3%'] }
		},
		CAP
	),
	ring1: item(
		"Libae's Prototype R Ring",
		{
			itemLevel: 110,
			total: { str: 4, dex: 4, int: 4, luk: 4, att: 4, matt: 4 }
		},
		`${CAP} This is the "RoR 6" — it grants [Special Skill Ring] Ring of Restraint ` +
			`Lv. 6. TEMPORARY: expires 2026-09-24 04:20 UTC and cannot be extended. ` +
			`Takes no star force, no flame and no potential.`
	),
	ring2: item(
		'Dawn Guardian Angel Ring',
		{
			itemLevel: 160,
			starforce: 14,
			setName: 'Dawn Boss Set',
			total: {
				str: 42,
				dex: 42,
				int: 42,
				luk: 42,
				maxHp: 430,
				maxMp: 200,
				att: 2,
				matt: 2,
				def: 15
			},
			potential: { grade: 'unique', lines: ['STR : +10%', 'STR : +7%', 'Max HP : +7%'] }
		},
		CAP
	),
	ring3: item(
		'Heroic Awake Ring (Lv. 4)',
		{
			itemLevel: 120,
			total: { str: 40, dex: 40, int: 40, luk: 40, maxHp: 4000, maxMp: 4000, att: 25, matt: 25 },
			potential: { grade: 'legendary', lines: ['STR : +12%', 'All Stats : +6%', 'All Stats : +6%'] }
		},
		CAP
	),
	ring4: item(
		'Eternal Flame Ring',
		{
			itemLevel: 120,
			total: { str: 40, dex: 40, int: 40, luk: 40, maxHp: 4000, maxMp: 4000, att: 25, matt: 25 },
			potential: { grade: 'legendary', lines: ['Item Drop Rate : +20%', 'DEX : +9%', 'STR : +9%'] }
		},
		CAP
	),
	earrings: item(
		"Will o' the Wisps",
		{
			itemLevel: 130,
			starforce: 14,
			setName: 'Boss Accessory Set',
			total: {
				str: 93,
				dex: 44,
				int: 44,
				luk: 44,
				allStatPct: 5,
				maxHp: 100,
				maxMp: 100,
				att: 7,
				matt: 2,
				def: 208,
				speed: 5
			},
			potential: {
				grade: 'legendary',
				lines: ['Item Drop Rate : +20%', 'Max HP : +9%', 'All Stats : +6%']
			}
		},
		CAP
	),
	face: item(
		'Condensed Power Crystal',
		{
			itemLevel: 110,
			starforce: 10,
			setName: 'Boss Accessory Set',
			total: {
				str: 60,
				dex: 30,
				int: 30,
				luk: 30,
				allStatPct: 5,
				maxMp: 1650,
				att: 9,
				matt: 5,
				def: 170
			},
			potential: { grade: 'legendary', lines: ['Max MP : +12%', 'All Stats : +9%', 'STR : +9%'] }
		},
		CAP
	),
	eye: item(
		'Aquatic Letter Eye Accessory',
		{
			itemLevel: 100,
			starforce: 8,
			setName: 'Boss Accessory Set',
			total: {
				str: 67,
				dex: 43,
				int: 25,
				luk: 25,
				allStatPct: 5,
				att: 1,
				matt: 1,
				def: 153,
				speed: 5
			},
			potential: {
				grade: 'legendary',
				lines: ['Mesos Obtained : +20%', 'All Stats : +9%', 'DEX : +9%']
			}
		},
		CAP
	),
	belt: item(
		'Superior Engraved Gollux Belt',
		{
			itemLevel: 150,
			starforce: 18,
			setName: 'Superior Gollux Set',
			total: {
				str: 149,
				dex: 133,
				int: 145,
				luk: 145,
				allStatPct: 4,
				maxHp: 455,
				maxMp: 200,
				att: 65,
				matt: 65,
				def: 255
			},
			potential: {
				grade: 'unique',
				lines: ['Max HP : +9%', '20% chance to ignore 38 damage when attacked', 'STR : +6%']
			}
		},
		`${CAP} Gollux gear is flameable but is NOT flame-advantaged.`
	),
	pocket: item(
		'Pink Holy Cup',
		{
			itemLevel: 140,
			setName: 'Boss Accessory Set',
			total: {
				str: 41,
				dex: 37,
				int: 25,
				luk: 21,
				allStatPct: 6,
				maxHp: 50,
				maxMp: 50,
				att: 5,
				matt: 5
			}
		},
		`${CAP} Flamed (+36 STR). Pocket items take flames but no star force and no ` +
			`potential — the tooltip says "Star Force Can't Enhance" only.`
	),
	badge: item(
		'Crystal Ventus Badge',
		{
			itemLevel: 130,
			setName: 'Boss Accessory Set',
			total: { str: 10, dex: 10, int: 10, luk: 10, att: 5, matt: 5, speed: 10, jump: 10 }
		},
		CAP
	),
	medal: item(
		'HYPER BURNING MAX',
		{ itemLevel: 200, total: { str: 6, dex: 6, int: 6, luk: 6, att: 6, matt: 6 } },
		CAP
	),
	heart: item(
		'Fairy Heart',
		{
			itemLevel: 100,
			starforce: 8,
			total: { str: 19, dex: 19, int: 19, luk: 19, maxHp: 100 },
			potential: { grade: 'unique', lines: ['STR : +9%', 'Max MP : +6%', 'Max MP : +6%'] }
		},
		`${CAP} Rank 5.`
	)
	// android: NOT CAPTURED — no photograph of the android slot.
	// totems: confirmed EMPTY in the equipment window.
};

// Read straight off the Character Info window (IMG_7957). The hover tooltips
// that decompose each stat into base / % / %-not-applied were NOT photographed,
// so each triple carries the displayed TOTAL as `base` with no percent or flat
// component: `total = floor(base * 1) + 0` holds, and nothing is invented.
const lutorenStatWindow = {
	capturedAt: '2026-09-06T19:49:00.000Z',
	str: { base: 29216 },
	dex: { base: 3882 },
	int: { base: 2462 },
	luk: { base: 2404 },
	attack: { base: 1772 },
	magicAttack: { base: 478 },
	damagePercent: 102,
	bossDamagePercent: 316,
	finalDamagePercent: 162.27,
	ignoreDefensePercent: 93.14,
	normalEnemyDamagePercent: 17,
	criticalRatePercent: 82,
	criticalDamagePercent: 86.5,
	arcaneForce: 1230,
	sacredForce: 210,
	displayed: { rangeMax: 14_736_287, combatPower: 19_547_691 }
};

/* -------------------------------------------------------------------------- */
/* rendemo — the fictional well-geared Ren                                     */
/* -------------------------------------------------------------------------- */

const demoGear = {
	weapon: item('Genesis Sword', {
		itemLevel: 200,
		starforce: 22,
		total: { str: 320, dex: 180, att: 432, bossDmgPct: 30, iedPct: 10 },
		potential: {
			grade: 'legendary',
			lines: ['Boss Monster Damage : +40%', 'Boss Monster Damage : +35%', 'Ignore Enemy DEF : +40%']
		}
	}),
	hat: item('Arcane Umbra Knight Hat', {
		itemLevel: 200,
		starforce: 22,
		total: { str: 455, dex: 220, att: 42 },
		potential: { grade: 'legendary', lines: ['STR : +13%', 'STR : +9%', 'Skill Cooldown : -2 sec'] }
	}),
	// Arcane Umbra has no separate top/bottom — the armour set uses an Overall,
	// which occupies both cells in the equip window.
	overall: item('Arcane Umbra Knight Suit', {
		itemLevel: 200,
		starforce: 22,
		total: { str: 860, dex: 420, att: 76 }
	}),
	gloves: item('Arcane Umbra Gloves', {
		itemLevel: 200,
		starforce: 17,
		total: { str: 310, dex: 150, att: 58 },
		potential: { grade: 'legendary', lines: ['Critical Damage : +8%', 'STR : +9%', 'STR : +6%'] }
	}),
	shoes: item('Arcane Umbra Shoes', {
		itemLevel: 200,
		starforce: 22,
		total: { str: 400, dex: 190, att: 36 }
	}),
	cape: item('Arcane Umbra Cape', {
		itemLevel: 200,
		starforce: 22,
		total: { str: 400, dex: 190, att: 36 }
	}),
	shoulder: item('Arcane Umbra Knight Shoulder', {
		itemLevel: 200,
		starforce: 17,
		total: { str: 250, att: 30 }
	}),
	secondary: item('Imugi Gem', {
		itemLevel: 200,
		starforce: 17,
		total: { str: 200, dex: 100, att: 30 }
	}),
	pendant1: item('Daybreak Pendant', {
		itemLevel: 140,
		starforce: 22,
		total: { str: 300, att: 30 },
		setName: 'Dawn Boss Set'
	}),
	pendant2: item('Source of Suffering', {
		itemLevel: 160,
		starforce: 22,
		total: { str: 320, att: 35 }
	}),
	ring1: item('Ring of Restraint', { itemLevel: 200, total: { str: 180, att: 18 } }),
	ring2: item('Guardian Angel Ring', {
		itemLevel: 160,
		starforce: 22,
		total: { str: 280, att: 28 },
		setName: 'Dawn Boss Set'
	}),
	ring3: item('Whisper of the Source', {
		itemLevel: 160,
		starforce: 22,
		total: { str: 290, att: 30 }
	}),
	ring4: item('Kanna’s Treasure', { itemLevel: 140, total: { str: 120, att: 15 } }),
	earrings: item('Estella Earrings', {
		itemLevel: 140,
		starforce: 22,
		total: { str: 290, att: 30 },
		setName: 'Dawn Boss Set'
	}),
	belt: item('Dreamy Belt', { itemLevel: 160, starforce: 22, total: { str: 300, att: 28 } }),
	heart: item('Total Control Heart', {
		itemLevel: 160,
		starforce: 17,
		total: { str: 220, att: 40 }
	})
};

const demoStatWindow = {
	capturedAt: new Date().toISOString(),
	str: { base: 13980, percent: 292, flat: 2010 },
	dex: { base: 2140, percent: 292, flat: 520 },
	int: { base: 4, flat: 60 },
	luk: { base: 4, flat: 60 },
	attack: { base: 1806, percent: 49, flat: 168 },
	magicAttack: { base: 1010, percent: 49 },
	damagePercent: 86,
	bossDamagePercent: 338,
	finalDamagePercent: 61,
	ignoreDefensePercent: 93,
	criticalRatePercent: 100,
	criticalDamagePercent: 81,
	arcaneForce: 1320,
	sacredForce: 420,
	displayed: { combatPower: 118_000_000 }
};

/* -------------------------------------------------------------------------- */

async function seed(character, statWindow, gear) {
	await ensure(character);
	await call('PUT', `/api/characters/${character.id}/stat-window`, statWindow);
	let warnings = 0;
	for (const [slot, body] of Object.entries(gear)) {
		const res = await call('PUT', `/api/characters/${character.id}/equipment/${slot}`, body);
		warnings += res.body?.warnings?.length ?? 0;
	}
	console.log(
		`${character.id}: ${Object.keys(gear).length} items, ${warnings} warnings ` +
			`-> ${BASE}/c/${character.id}`
	);
}

await seed(
	{
		id: 'lutoren',
		name: 'Lutoren',
		classId: 'ren',
		level: 272,
		world: 'Kronos',
		symbols: {
			// Levels read off IMG_7958 / IMG_7959. The REGION LABELS were not legible
			// in the photos — these follow the standard left-to-right UI order and are
			// the one unconfirmed part of this capture.
			arcane: {
				vanishingJourney: 20,
				chuchu: 18,
				lachelein: 16,
				arcana: 16,
				morass: 15,
				esfera: 16
			},
			sacred: { cernium: 6, hotelArcus: 6, odium: 6 }
		},
		notes:
			'Identity from the GMS rankings API (rank 52897 weekly, worldID 45 = Kronos). ' +
			'Gear and stats CAPTURED from 44 screenshots on 2026-09-06 — see ' +
			'docs/capture/2026-09-06-lutoren.md. Legion 9083 (Legendary III, artifact 39); ' +
			'hyper stats and legion/artifact bonuses are already inside the stat-window ' +
			'totals and are recorded in the capture doc, not re-modelled here.'
	},
	lutorenStatWindow,
	lutorenGear
);

await seed(
	{
		id: 'rendemo',
		name: 'RenDemo',
		classId: 'ren',
		level: 283,
		world: 'Kronos',
		symbols: {
			arcane: {
				vanishingJourney: 20,
				chuchu: 20,
				lachelein: 20,
				arcana: 20,
				morass: 20,
				esfera: 20
			},
			sacred: { cernium: 11, hotelArcus: 10, odium: 8, shangrila: 7, arteria: 7, carcion: 5 }
		},
		notes: 'Fictional well-geared Ren, kept so there is always a full analysis to look at.'
	},
	demoStatWindow,
	demoGear
);
