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

const GUESSED = 'Dictated from memory, not read from a screenshot — stats are invented placeholders.';
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
const lutorenGear = {
	// --- stated by the user ---
	weapon: item(
		'Fafnir Sword',
		{
			itemLevel: 150,
			starforce: 15,
			total: { str: 285, dex: 140, att: 337 },
			potential: {
				grade: 'legendary',
				lines: ['Attack Power : +12%', 'Attack Power : +9%', 'Boss Monster Damage : +30%']
			}
		},
		`${GUESSED} User stated: Fafnir sword, 15 stars, legendary ATT/ATT/Boss.`
	),
	hat: item(
		'Fafnir Hat',
		{ itemLevel: 150, starforce: 15, total: { str: 250, dex: 120, att: 20 } },
		`${GUESSED} User stated: Fafnir hat.`
	),
	top: item(
		'Fafnir Top',
		{ itemLevel: 150, starforce: 15, total: { str: 235, dex: 110, att: 18 } },
		`${GUESSED} User stated: Fafnir top.`
	),
	bottom: item(
		'Fafnir Bottom',
		{ itemLevel: 150, starforce: 15, total: { str: 235, dex: 110, att: 18 } },
		`${GUESSED} User said "faf ... mid" — read as the bottom/pants slot.`
	),
	cape: item(
		'AbsoLab Cape',
		{ itemLevel: 160, starforce: 17, total: { str: 265, dex: 130, att: 32 } },
		`${GUESSED} User stated: AbsoLab cape.`
	),
	gloves: item(
		'AbsoLab Gloves',
		{
			itemLevel: 160,
			starforce: 17,
			total: { str: 245, dex: 120, att: 38 },
			potential: {
				grade: 'legendary',
				lines: ['Critical Damage : +8%', 'STR : +6%', 'STR : +3%']
			}
		},
		`${GUESSED} User stated: AbsoLab gloves with 8% crit damage.`
	),
	shoes: item(
		'AbsoLab Shoes',
		{ itemLevel: 160, starforce: 17, total: { str: 245, dex: 120, att: 30 } },
		`${GUESSED} User stated: AbsoLab shoes.`
	),
	pendant1: item(
		'Daybreak Pendant',
		{ itemLevel: 140, starforce: 17, total: { str: 220, dex: 100, att: 22 }, setName: 'Dawn Boss' },
		`${GUESSED} User stated: Dawn necklace.`
	),
	ring1: item(
		'Ring of Restraint',
		{ itemLevel: 200, total: { str: 150, att: 15 } },
		`${GUESSED} User stated: RoR6, temporary. Special ring — takes no star force.`
	),
	ring2: item(
		'Guardian Angel Ring',
		{ itemLevel: 160, starforce: 17, total: { str: 200, dex: 90, att: 20 }, setName: 'Dawn Boss' },
		`${GUESSED} User stated: slime ring (Dawn set).`
	),
	ring3: item(
		'Event Ring I',
		{ itemLevel: 100, total: { str: 60, att: 5 } },
		`${GUESSED} User stated: event ring (unspecified).`
	),
	ring4: item(
		'Event Ring II',
		{ itemLevel: 100, total: { str: 60, att: 5 } },
		`${GUESSED} User stated: event ring (unspecified).`
	),
	heart: item(
		'Fairy Heart',
		{ itemLevel: 100, total: { str: 90, dex: 90, att: 12 } },
		`${GUESSED} User stated: Fairy Heart.`
	),

	// --- not mentioned; invented so the analysis has something to chew on ---
	secondary: item('Imugi Gem', { itemLevel: 140, total: { str: 120, dex: 60, att: 12 } }),
	emblem: item('Gold Maple Leaf Emblem', { itemLevel: 100, total: { str: 100, att: 8 } }),
	shoulder: item('AbsoLab Shoulder', { itemLevel: 160, starforce: 12, total: { str: 130, att: 18 } }),
	belt: item('Golden Clover Belt', { itemLevel: 140, starforce: 15, total: { str: 180, att: 15 } }),
	pendant2: item('Dominator Pendant', { itemLevel: 140, starforce: 12, total: { str: 165, att: 15 } }),
	earrings: item('Estella Earrings', { itemLevel: 140, starforce: 15, total: { str: 195, att: 20 }, setName: 'Dawn Boss' }),
	face: item('Condensed Power Crystal', { itemLevel: 140, starforce: 12, total: { str: 130, att: 12 } }),
	eye: item('Black Bean Mark', { itemLevel: 140, starforce: 12, total: { str: 130, att: 12 } }),
	badge: item('Crystal Ventus Badge', { itemLevel: 130, total: { str: 40, att: 12 } }),
	medal: item('Chaos Vellum Medal', { itemLevel: 130, total: { str: 35, att: 8 } }),
	pocket: item('Pink Holy Cup', { itemLevel: 140, total: { str: 100, att: 10 } }),
	android: item('Lumiwing Android', { itemLevel: 100, total: {} })
	// totems: user says none yet.
};

// Invented to be plausible for the gear above. `displayed.combatPower` is the
// ONE number the user gave: "~19k cp", read as 19,000,000 (19,000 is impossible
// at level 272 — it would be a level ~50 character). The calibration panel will
// show computed-vs-displayed, which is exactly how a wrong reading surfaces.
const lutorenStatWindow = {
	capturedAt: new Date().toISOString(),
	str: { base: 6250, percent: 148, flat: 1850 },
	dex: { base: 920, percent: 148, flat: 420 },
	int: { base: 4, flat: 60 },
	luk: { base: 4, flat: 60 },
	attack: { base: 795, percent: 44, flat: 32 },
	magicAttack: { base: 320, percent: 44 },
	damagePercent: 62,
	bossDamagePercent: 186,
	finalDamagePercent: 28,
	ignoreDefensePercent: 78,
	criticalRatePercent: 100,
	criticalDamagePercent: 52,
	arcaneForce: 660,
	sacredForce: 0,
	displayed: { combatPower: 19_000_000 }
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
	hat: item('Arcane Umbra Hat', {
		itemLevel: 200,
		starforce: 22,
		total: { str: 455, dex: 220, att: 42 },
		potential: { grade: 'legendary', lines: ['STR : +13%', 'STR : +9%', 'Skill Cooldown : -2 sec'] }
	}),
	top: item('Arcane Umbra Top', { itemLevel: 200, starforce: 22, total: { str: 430, dex: 210, att: 38 } }),
	bottom: item('Arcane Umbra Bottom', { itemLevel: 200, starforce: 22, total: { str: 430, dex: 210, att: 38 } }),
	gloves: item('Arcane Umbra Gloves', {
		itemLevel: 200,
		starforce: 17,
		total: { str: 310, dex: 150, att: 58 },
		potential: { grade: 'legendary', lines: ['Critical Damage : +8%', 'STR : +9%', 'STR : +6%'] }
	}),
	shoes: item('Arcane Umbra Shoes', { itemLevel: 200, starforce: 22, total: { str: 400, dex: 190, att: 36 } }),
	cape: item('Arcane Umbra Cape', { itemLevel: 200, starforce: 22, total: { str: 400, dex: 190, att: 36 } }),
	shoulder: item('Arcane Umbra Shoulder', { itemLevel: 200, starforce: 17, total: { str: 250, att: 30 } }),
	secondary: item('Imugi Gem', { itemLevel: 200, starforce: 17, total: { str: 200, dex: 100, att: 30 } }),
	pendant1: item('Daybreak Pendant', { itemLevel: 140, starforce: 22, total: { str: 300, att: 30 }, setName: 'Dawn Boss' }),
	pendant2: item('Source of Suffering', { itemLevel: 160, starforce: 22, total: { str: 320, att: 35 } }),
	ring1: item('Ring of Restraint', { itemLevel: 200, total: { str: 180, att: 18 } }),
	ring2: item('Guardian Angel Ring', { itemLevel: 160, starforce: 22, total: { str: 280, att: 28 }, setName: 'Dawn Boss' }),
	ring3: item('Whisper of the Source', { itemLevel: 160, starforce: 22, total: { str: 290, att: 30 } }),
	ring4: item('Kanna’s Treasure', { itemLevel: 140, total: { str: 120, att: 15 } }),
	earrings: item('Estella Earrings', { itemLevel: 140, starforce: 22, total: { str: 290, att: 30 }, setName: 'Dawn Boss' }),
	belt: item('Dreamy Belt', { itemLevel: 160, starforce: 22, total: { str: 300, att: 28 } }),
	heart: item('Total Control Heart', { itemLevel: 160, starforce: 17, total: { str: 220, att: 40 } })
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
			arcane: { vanishingJourney: 8, chuchu: 8, lachelein: 7, arcana: 6, morass: 5, esfera: 4 }
		},
		notes:
			'Identity from the GMS rankings API (rank 52897 weekly, worldID 45 = Kronos). ' +
			'Gear dictated from memory 2026-09-06; every stat number is an invented placeholder ' +
			'pending screenshots. Only displayed.combatPower (~19M) came from the user.'
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
			arcane: { vanishingJourney: 20, chuchu: 20, lachelein: 20, arcana: 20, morass: 20, esfera: 20 },
			sacred: { cernium: 11, hotelArcus: 10, odium: 8, shangrila: 7, arteria: 7, carcion: 5 }
		},
		notes: 'Fictional well-geared Ren, kept so there is always a full analysis to look at.'
	},
	demoStatWindow,
	demoGear
);
