// A realistic `Analysis` (and the character it describes) so every section of
// the UI can be built and eyeballed before the engine lands.
//
// Reached from the UI with `?demo=1` on a character page. Numbers are plausible
// rather than authoritative — nothing here is game data, and nothing in the app
// reads it outside the explicit demo switch.

import type { Analysis, BossRow, RankedUpgrade, StatWorth } from '$lib/analysis/types';
import type { CalcInput } from '$lib/calc/types';
import type { Character, Item, Slot } from '$lib/schema';

const AT = '2026-09-06T09:12:00.000Z';

function item(
	slot: Slot,
	partial: Omit<Item, 'slot' | 'category'> & { category: Item['category'] }
): Item {
	return { slot, ...partial };
}

const EQUIPMENT: Partial<Record<Slot, Item>> = {
	weapon: item('weapon', {
		name: 'Genesis Two-handed Sword',
		category: 'weapon',
		itemLevel: 200,
		starforce: 22,
		total: { str: 355, dex: 130, att: 337, bossDmgPct: 30, iedPct: 30 },
		base: { str: 150, dex: 100, att: 238 },
		flame: { str: 125, dex: 30, att: 41 },
		scroll: { str: 80, att: 58 },
		potential: {
			grade: 'legendary',
			lines: ['Boss Damage: +40%', 'Ignore Enemy Defense: +40%', 'STR: +9%']
		},
		bonusPotential: {
			grade: 'unique',
			lines: ['ATT: +10%', 'STR: +7%', 'Ignore Enemy Defense: +10%']
		},
		soul: { name: 'Grand Gollux Soul', option: 'ATT +20' },
		source: { kind: 'screenshot', at: AT }
	}),
	secondary: item('secondary', {
		name: 'Deimos Shadow Shield',
		category: 'secondary',
		itemLevel: 140,
		starforce: 15,
		total: { str: 158, dex: 60, att: 62 },
		potential: { grade: 'unique', lines: ['STR: +9%', 'STR: +6%', 'Boss Damage: +8%'] },
		source: { kind: 'screenshot', at: AT }
	}),
	emblem: item('emblem', {
		name: 'Gold Maple Leaf Emblem',
		category: 'emblem',
		itemLevel: 100,
		total: { str: 20, att: 25 },
		potential: { grade: 'unique', lines: ['STR: +9%', 'STR: +6%', 'ATT: +3%'] },
		source: { kind: 'screenshot', at: AT }
	}),
	hat: item('hat', {
		name: 'Arcane Umbra Knight Helm',
		category: 'armor',
		itemLevel: 200,
		starforce: 22,
		setName: 'Arcane Umbra',
		total: { str: 320, dex: 105, maxHp: 1275, att: 24, def: 1450 },
		potential: {
			grade: 'legendary',
			lines: ['STR: +12%', 'Skill Cooldown: -2 sec', 'STR: +9%']
		},
		bonusPotential: { grade: 'epic', lines: ['STR: +6%', 'Max HP: +4%', 'DEX: +3%'] },
		source: { kind: 'screenshot', at: AT }
	}),
	top: item('top', {
		name: 'Arcane Umbra Knight Armor',
		category: 'armor',
		itemLevel: 200,
		starforce: 22,
		setName: 'Arcane Umbra',
		total: { str: 305, dex: 90, maxHp: 1200, att: 22, def: 1380 },
		potential: { grade: 'unique', lines: ['STR: +9%', 'Max HP: +6%', 'DEX: +3%'] },
		source: { kind: 'screenshot', at: AT }
	}),
	bottom: item('bottom', {
		name: 'Arcane Umbra Knight Pants',
		category: 'armor',
		itemLevel: 200,
		starforce: 21,
		setName: 'Arcane Umbra',
		total: { str: 288, dex: 85, maxHp: 1140, att: 20, def: 1290 },
		potential: { grade: 'unique', lines: ['STR: +9%', 'STR: +6%', 'Max HP: +3%'] },
		source: { kind: 'screenshot', at: AT }
	}),
	shoes: item('shoes', {
		name: 'Arcane Umbra Knight Boots',
		category: 'armor',
		itemLevel: 200,
		starforce: 22,
		setName: 'Arcane Umbra',
		total: { str: 275, dex: 80, att: 20, def: 1180 },
		potential: { grade: 'legendary', lines: ['STR: +12%', 'STR: +9%', 'DEX: +3%'] },
		source: { kind: 'screenshot', at: AT }
	}),
	gloves: item('gloves', {
		name: 'Arcane Umbra Knight Gloves',
		category: 'armor',
		itemLevel: 200,
		starforce: 18,
		setName: 'Arcane Umbra',
		total: { str: 210, dex: 70, att: 42, def: 980 },
		potential: { grade: 'epic', lines: ['Critical Damage: +8%', 'STR: +3%', 'DEF: +3%'] },
		notes: 'Cubing target — epic crit damage is well below the legendary line.',
		source: { kind: 'screenshot', at: AT }
	}),
	cape: item('cape', {
		name: 'Arcane Umbra Cape',
		category: 'armor',
		itemLevel: 200,
		starforce: 17,
		setName: 'Arcane Umbra',
		total: { str: 245, dex: 75, att: 21, def: 1050 },
		potential: { grade: 'unique', lines: ['STR: +9%', 'STR: +6%', 'Max HP: +3%'] },
		source: { kind: 'screenshot', at: AT }
	}),
	shoulder: item('shoulder', {
		name: 'Arcane Umbra Knight Shoulder',
		category: 'armor',
		itemLevel: 200,
		starforce: 17,
		setName: 'Arcane Umbra',
		total: { str: 190, dex: 60, att: 18, def: 720 },
		potential: { grade: 'unique', lines: ['STR: +9%', 'ATT: +3%', 'DEX: +3%'] },
		source: { kind: 'screenshot', at: AT }
	}),
	belt: item('belt', {
		name: 'Dreamy Belt',
		category: 'accessory',
		itemLevel: 200,
		starforce: 22,
		total: { str: 265, dex: 85, att: 21, def: 950 },
		potential: { grade: 'rare', lines: ['STR: +6%', 'DEF: +6%', 'Speed: +6'] },
		notes: 'Still on the rare potential it dropped with.',
		source: { kind: 'screenshot', at: AT }
	}),
	pendant1: item('pendant1', {
		name: 'Dominator Pendant',
		category: 'accessory',
		itemLevel: 140,
		starforce: 21,
		total: { str: 180, dex: 60, att: 27 },
		potential: { grade: 'unique', lines: ['STR: +9%', 'STR: +6%', 'ATT: +3%'] },
		source: { kind: 'screenshot', at: AT }
	}),
	pendant2: item('pendant2', {
		name: 'Daybreak Pendant',
		category: 'accessory',
		itemLevel: 140,
		starforce: 20,
		total: { str: 165, dex: 55, att: 24 },
		potential: { grade: 'unique', lines: ['STR: +9%', 'STR: +6%', 'DEX: +3%'] },
		source: { kind: 'screenshot', at: AT }
	}),
	ring1: item('ring1', {
		name: 'Endless Terror',
		category: 'accessory',
		itemLevel: 160,
		starforce: 20,
		total: { str: 155, dex: 50, att: 22 },
		potential: { grade: 'legendary', lines: ['STR: +12%', 'STR: +9%', 'ATT: +3%'] },
		source: { kind: 'screenshot', at: AT }
	}),
	ring2: item('ring2', {
		name: 'Guardian Angel Ring',
		category: 'accessory',
		itemLevel: 160,
		starforce: 20,
		total: { str: 150, dex: 50, att: 22 },
		potential: { grade: 'unique', lines: ['STR: +9%', 'STR: +6%', 'ATT: +3%'] },
		source: { kind: 'screenshot', at: AT }
	}),
	ring3: item('ring3', {
		name: 'Meister Ring',
		category: 'accessory',
		itemLevel: 140,
		starforce: 18,
		total: { str: 120, dex: 40, att: 18 },
		potential: { grade: 'unique', lines: ['STR: +9%', 'STR: +3%', 'DEF: +3%'] },
		source: { kind: 'screenshot', at: AT }
	}),
	ring4: item('ring4', {
		name: 'Kanna’s Treasure',
		category: 'accessory',
		itemLevel: 140,
		starforce: 17,
		total: { str: 110, dex: 35, att: 16 },
		potential: { grade: 'epic', lines: ['STR: +6%', 'STR: +3%', 'DEX: +3%'] },
		source: { kind: 'screenshot', at: AT }
	}),
	earrings: item('earrings', {
		name: 'Estella Earrings',
		category: 'accessory',
		itemLevel: 150,
		starforce: 22,
		total: { str: 205, dex: 70, att: 28 },
		potential: { grade: 'legendary', lines: ['STR: +12%', 'STR: +9%', 'ATT: +3%'] },
		source: { kind: 'screenshot', at: AT }
	}),
	face: item('face', {
		name: 'Twilight Mark',
		category: 'accessory',
		itemLevel: 150,
		starforce: 22,
		total: { str: 175, dex: 60, att: 25 },
		potential: { grade: 'unique', lines: ['STR: +9%', 'STR: +6%', 'ATT: +3%'] },
		source: { kind: 'screenshot', at: AT }
	}),
	eye: item('eye', {
		name: 'Papulatus Mark',
		category: 'accessory',
		itemLevel: 145,
		starforce: 20,
		total: { str: 160, dex: 55, att: 22 },
		potential: { grade: 'unique', lines: ['STR: +9%', 'STR: +6%', 'DEX: +3%'] },
		source: { kind: 'screenshot', at: AT }
	}),
	badge: item('badge', {
		name: 'Crystal Ventus Badge',
		category: 'badge',
		itemLevel: 100,
		total: { str: 30, att: 12 },
		source: { kind: 'manual', at: AT }
	}),
	heart: item('heart', {
		name: 'Lidium Heart',
		category: 'heart',
		itemLevel: 120,
		total: { att: 30 },
		source: { kind: 'manual', at: AT }
	}),
	pocket: item('pocket', {
		name: 'Pink Holy Cup',
		category: 'pocket',
		itemLevel: 140,
		total: { str: 60 },
		source: { kind: 'manual', at: AT }
	}),
	medal: item('medal', {
		name: 'Ripe Fruit of Grandis',
		category: 'medal',
		itemLevel: 100,
		total: { str: 20, att: 5 },
		source: { kind: 'manual', at: AT }
	}),
	android: item('android', {
		name: 'Lumi Android',
		category: 'android',
		source: { kind: 'manual', at: AT }
	})
};

/** The character the fixture analysis describes. */
export const DEMO_CHARACTER: Character = {
	id: 'demo',
	name: 'Demoheroic',
	world: 'Kronos',
	classId: 'hero',
	level: 287,
	statWindow: {
		capturedAt: AT,
		str: { base: 96540, percent: 226, flat: 12480 },
		dex: { base: 4180, percent: 96, flat: 620 },
		int: { base: 1040, percent: 24, flat: 120 },
		luk: { base: 1120, percent: 24, flat: 120 },
		attack: { base: 2214, percent: 41, flat: 0 },
		magicAttack: { base: 1010, percent: 0, flat: 0 },
		damagePercent: 68,
		bossDamagePercent: 341,
		finalDamagePercent: 68,
		ignoreDefensePercent: 94.6,
		criticalRatePercent: 100,
		criticalDamagePercent: 91,
		arcaneForce: 1320,
		sacredForce: 380,
		displayed: { rangeMax: 14522483, rangeMin: 13070234, combatPower: 187432110 }
	},
	equipment: EQUIPMENT,
	symbols: {
		arcane: {
			vanishingJourney: 20,
			chuchu: 20,
			lachelein: 20,
			arcana: 19,
			morass: 17,
			esfera: 14
		},
		sacred: { cernium: 11, hotelArcus: 10, odium: 8, shangrila: 6, arteria: 5, carcion: 4 }
	},
	hyperStats: {
		str: 12,
		criticalDamage: 10,
		bossDamage: 12,
		ignoreDefense: 11,
		damage: 10,
		attMatt: 6,
		criticalRate: 5
	},
	legion: {
		level: 8420,
		members: [
			{ classId: 'hero', level: 260 },
			{ classId: 'paladin', level: 210 },
			{ classId: 'dark-knight', level: 210 },
			{ classId: 'dawn-warrior', level: 210 },
			{ classId: 'blaze-wizard', level: 200 },
			{ classId: 'wind-archer', level: 200 },
			{ classId: 'night-walker', level: 200 },
			{ classId: 'thunder-breaker', level: 200 },
			{ classId: 'kaiser', level: 210 },
			{ classId: 'phantom', level: 210 },
			{ classId: 'demon-avenger', level: 210 },
			{ classId: 'shade', level: 200 },
			{ classId: 'hayato', level: 200 },
			{ classId: 'blaster', level: 200 }
		],
		// Legendary I board: 40 outer squares per area available.
		board: { bossDamage: 40, ignoreDefense: 40, criticalDamage: 40, criticalRate: 22 },
		artifact: {
			level: 42,
			effects: { bossDamage: 10, ignoreDefense: 10, criticalDamage: 10, buffDuration: 9 }
		},
		notes: 'Legendary Legion I, 8420 legion level'
	},
	innerAbility: ['Boss Damage: +20%', 'ATT: +21', 'Critical Rate: +14%'],
	links: [
		{ id: 'cygnus-blessing', level: 15 },
		{ id: 'iron-will', level: 3 },
		{ id: 'phantom-instinct', level: 3 },
		{ id: 'wild-rage', level: 3 }
	],
	notes: 'Fixture character — not real data.',
	createdAt: '2026-06-01T00:00:00.000Z',
	updatedAt: AT
};

const INPUT: CalcInput = {
	level: 287,
	classId: 'hero',
	stats: {
		str: { base: 96540, percent: 226, flat: 12480 },
		dex: { base: 4180, percent: 96, flat: 620 },
		int: { base: 1040, percent: 24, flat: 120 },
		luk: { base: 1120, percent: 24, flat: 120 },
		hp: { base: 0, percent: 0, flat: 0 }
	},
	attack: { base: 2214, percent: 41, flat: 0 },
	magicAttack: { base: 1010, percent: 0, flat: 0 },
	damagePercent: 68,
	bossDamagePercent: 341,
	finalDamagePercent: 68,
	ignoreDefensePercent: 94.6,
	criticalRatePercent: 100,
	criticalDamagePercent: 91,
	arcaneForce: 1320,
	sacredForce: 380,
	masteryPercent: 90
};

const UPGRADES: RankedUpgrade[] = [
	{
		id: 'sf-cape-17-18',
		kind: 'starforce',
		label: 'Arcane Umbra Cape 17★ → 18★',
		detail: '+13 STR, +7 ATT at item level 200.',
		slot: 'cape',
		itemName: 'Arcane Umbra Cape',
		delta: { mainFlat: 13, att: 7 },
		gainPercent: 1.42,
		cost: { mesos: 1_664_000_000, note: 'Expected mesos incl. boom risk, safeguard on.' },
		gainPerBillionMesos: 0.85,
		confidence: 'estimated',
		notes: ['Star force cost model is expected-value, not a quote.']
	},
	{
		id: 'pot-gloves-epic-unique',
		kind: 'potential',
		label: 'Gloves: epic → unique (crit damage)',
		detail: 'Two useful lines assumed at unique; keeps the crit damage line.',
		slot: 'gloves',
		itemName: 'Arcane Umbra Knight Gloves',
		delta: { critDmg: 8, mainPct: 6 },
		gainPercent: 3.18,
		cost: { mesos: 12_090_000_000, note: 'Heroic red cubes at 12M, expected count.' },
		gainPerBillionMesos: 0.26,
		confidence: 'estimated'
	},
	{
		id: 'sf-shoulder-17-18',
		kind: 'starforce',
		label: 'Arcane Umbra Knight Shoulder 17★ → 18★',
		slot: 'shoulder',
		itemName: 'Arcane Umbra Knight Shoulder',
		delta: { mainFlat: 13, att: 7 },
		gainPercent: 1.38,
		cost: { mesos: 1_664_000_000 },
		gainPerBillionMesos: 0.83,
		confidence: 'estimated'
	},
	{
		id: 'sym-esfera-14-15',
		kind: 'symbol',
		label: 'Esfera symbol 14 → 15',
		detail: '+100 arcane force, +200 main stat.',
		delta: { mainFinal: 200, arcane: 100 },
		gainPercent: 0.94,
		cost: { days: 6, note: 'Daily quest rate, 6 symbols per level.' },
		gainPerDay: 0.16,
		confidence: 'sourced'
	},
	{
		id: 'sym-carcion-4-5',
		kind: 'symbol',
		label: 'Carcion symbol 4 → 5',
		detail: '+10 sacred force, +200 main stat.',
		delta: { mainFinal: 200, sacred: 10 },
		gainPercent: 1.11,
		cost: { days: 5 },
		gainPerDay: 0.22,
		confidence: 'sourced'
	},
	{
		id: 'hyper-boss-12-13',
		kind: 'hyper-stat',
		label: 'Hyper stat: Boss Damage 12 → 13',
		delta: { boss: 4 },
		gainPercent: 0.72,
		cost: { points: 39 },
		confidence: 'exact'
	},
	{
		id: 'hyper-ied-11-12',
		kind: 'hyper-stat',
		label: 'Hyper stat: Ignore Defense 11 → 12',
		delta: { iedAdd: [3] },
		gainPercent: 0.48,
		cost: { points: 33 },
		confidence: 'exact'
	},
	{
		id: 'flame-weapon-t6',
		kind: 'flame',
		label: 'Weapon flame → tier 6 ATT',
		detail: 'Assumes a T6 ATT line replacing the current T4.',
		slot: 'weapon',
		itemName: 'Genesis Two-handed Sword',
		delta: { att: 14 },
		gainPercent: 2.05,
		cost: { note: 'Powerful flame cost is not sourced.' },
		confidence: 'speculative',
		notes: ['Flame reroll cost is unknown; ranking by gain only.']
	},
	{
		id: 'bpot-hat-epic-unique',
		kind: 'bonus-potential',
		label: 'Hat bonus potential: epic → unique',
		slot: 'hat',
		itemName: 'Arcane Umbra Knight Helm',
		delta: { mainPct: 3, att: 4 },
		gainPercent: 0.61,
		cost: { mesos: 22_000_000_000, note: 'Heroic bonus cubes at 22M.' },
		gainPerBillionMesos: 0.03,
		confidence: 'estimated'
	},
	{
		id: 'sf-belt-22-23',
		kind: 'starforce',
		label: 'Dreamy Belt 22★ → 23★',
		slot: 'belt',
		itemName: 'Dreamy Belt',
		delta: { mainFlat: 15, att: 9 },
		gainPercent: 1.55,
		cost: { mesos: 9_180_000_000 },
		gainPerBillionMesos: 0.17,
		confidence: 'estimated'
	},
	{
		id: 'pot-belt-rare-epic',
		kind: 'potential',
		label: 'Belt: rare → epic',
		slot: 'belt',
		itemName: 'Dreamy Belt',
		delta: { mainPct: 9 },
		gainPercent: 1.86,
		cost: { mesos: 2_400_000_000 },
		gainPerBillionMesos: 0.78,
		confidence: 'estimated'
	}
];

const STAT_WORTH: StatWorth[] = [
	{ label: '+1 ATT', delta: { att: 1 }, gainPercent: 0.045, mainStatEquivalent: 41 },
	{ label: '+10 main stat', delta: { mainFlat: 10 }, gainPercent: 0.011, mainStatEquivalent: 10 },
	{ label: '+1% main stat', delta: { mainPct: 1 }, gainPercent: 0.108, mainStatEquivalent: 98 },
	{ label: '+1% boss', delta: { boss: 1 }, gainPercent: 0.187, mainStatEquivalent: 170 },
	{ label: '+1% final damage', delta: { fd: 1 }, gainPercent: 1.0, mainStatEquivalent: 909 },
	{ label: '+1% crit damage', delta: { critDmg: 1 }, gainPercent: 0.427, mainStatEquivalent: 388 },
	{ label: '+30% IED line', delta: { iedAdd: [30] }, gainPercent: 1.62, mainStatEquivalent: 1473 },
	{ label: '+10 sacred force', delta: { sacred: 10 }, gainPercent: 1.11, mainStatEquivalent: 1009 }
];

function bossRow(row: BossRow & { tier: 'trivial' | 'early' | 'current' }): BossRow {
	return row as BossRow;
}

const BOSS_ROWS: BossRow[] = [
	bossRow({
		tier: 'early',
		bossId: 'chaos-zakum',
		bossName: 'Zakum',
		difficulty: 'chaos',
		level: 180,
		entryLevel: 90,
		totalHp: 168_000_000_000,
		gates: { levelOk: true, forceMultiplier: 1, forceType: 'none', combatPowerOk: true },
		carryDamageRequired: 8_400_000_000,
		solo: { verdict: 'comfortable', ratio: 480, clearMinutes: 0.2 },
		party: { verdict: 'comfortable', ratio: 2880, clearMinutes: 0.1 },
		carried: { verdict: 'comfortable', ratio: 9600 },
		crystalMesos: 8_100_000
	}),
	bossRow({
		tier: 'early',
		bossId: 'hard-magnus',
		bossName: 'Magnus',
		difficulty: 'hard',
		level: 190,
		entryLevel: 155,
		totalHp: 630_000_000_000,
		gates: { levelOk: true, forceMultiplier: 1, forceType: 'none', combatPowerOk: true },
		carryDamageRequired: 31_500_000_000,
		solo: { verdict: 'comfortable', ratio: 128, clearMinutes: 0.5 },
		party: { verdict: 'comfortable', ratio: 768 },
		carried: { verdict: 'comfortable', ratio: 2560 },
		crystalMesos: 51_562_500
	}),
	bossRow({
		tier: 'early',
		bossId: 'chaos-papulatus',
		bossName: 'Papulatus',
		difficulty: 'chaos',
		level: 220,
		entryLevel: 190,
		totalHp: 4_200_000_000_000,
		gates: { levelOk: true, forceMultiplier: 1, forceType: 'none', combatPowerOk: true },
		carryDamageRequired: 210_000_000_000,
		solo: { verdict: 'comfortable', ratio: 42, clearMinutes: 1.4 },
		party: { verdict: 'comfortable', ratio: 252 },
		carried: { verdict: 'comfortable', ratio: 840 },
		crystalMesos: 133_875_000
	}),
	bossRow({
		tier: 'current',
		bossId: 'normal-lotus',
		bossName: 'Lotus',
		difficulty: 'normal',
		level: 210,
		entryLevel: 190,
		totalHp: 1_575_000_000_000,
		gates: { levelOk: true, forceMultiplier: 1, forceType: 'none', combatPowerOk: true },
		carryDamageRequired: 78_750_000_000,
		solo: { verdict: 'comfortable', ratio: 96, clearMinutes: 0.6 },
		party: { verdict: 'comfortable', ratio: 576 },
		carried: { verdict: 'comfortable', ratio: 1920 },
		crystalMesos: 162_562_500
	}),
	bossRow({
		tier: 'current',
		bossId: 'hard-lucid',
		bossName: 'Lucid',
		difficulty: 'hard',
		level: 230,
		entryLevel: 220,
		totalHp: 117_600_000_000_000,
		gates: {
			levelOk: true,
			forceMultiplier: 1,
			forceType: 'arcane',
			forceRequired: 360,
			forceHave: 1320,
			combatPowerOk: true
		},
		carryDamageRequired: 5_880_000_000_000,
		solo: { verdict: 'comfortable', ratio: 12.4, clearMinutes: 2.4 },
		party: { verdict: 'comfortable', ratio: 74 },
		carried: { verdict: 'comfortable', ratio: 248 },
		crystalMesos: 504_000_000
	}),
	bossRow({
		tier: 'current',
		bossId: 'hard-will',
		bossName: 'Will',
		difficulty: 'hard',
		level: 250,
		entryLevel: 235,
		totalHp: 168_000_000_000_000,
		gates: {
			levelOk: true,
			forceMultiplier: 1,
			forceType: 'arcane',
			forceRequired: 690,
			forceHave: 1320,
			combatPowerOk: true
		},
		carryDamageRequired: 8_400_000_000_000,
		solo: { verdict: 'comfortable', ratio: 8.6, clearMinutes: 3.5 },
		party: { verdict: 'comfortable', ratio: 52 },
		carried: { verdict: 'comfortable', ratio: 172 },
		crystalMesos: 594_000_000
	}),
	bossRow({
		tier: 'current',
		bossId: 'hard-darknell',
		bossName: 'Darknell',
		difficulty: 'hard',
		level: 265,
		entryLevel: 255,
		totalHp: 157_500_000_000_000,
		gates: {
			levelOk: true,
			forceMultiplier: 1,
			forceType: 'arcane',
			forceRequired: 850,
			forceHave: 1320,
			combatPowerOk: true
		},
		carryDamageRequired: 7_875_000_000_000,
		solo: { verdict: 'comfortable', ratio: 9.2, clearMinutes: 3.3 },
		party: { verdict: 'comfortable', ratio: 55 },
		carried: { verdict: 'comfortable', ratio: 184 },
		crystalMesos: 667_920_000
	}),
	bossRow({
		tier: 'current',
		bossId: 'extreme-seren',
		bossName: 'Seren',
		difficulty: 'extreme',
		level: 285,
		entryLevel: 275,
		totalHp: 2_016_000_000_000_000,
		gates: {
			levelOk: true,
			forceMultiplier: 0.96,
			forceType: 'sacred',
			forceRequired: 400,
			forceHave: 380,
			combatPowerOk: false
		},
		carryDamageRequired: 100_800_000_000_000,
		solo: {
			verdict: 'minimum',
			ratio: 0.94,
			clearMinutes: 28.4,
			reason: 'Inside the 30 min limit only at full uptime.'
		},
		party: { verdict: 'possible', ratio: 2.8 },
		carried: { verdict: 'comfortable', ratio: 14.4 },
		crystalMesos: 1_575_000_000,
		notes: ['20 sacred force short of the 400 requirement: 0.96× damage.']
	}),
	bossRow({
		tier: 'current',
		bossId: 'normal-limbo',
		bossName: 'Limbo',
		difficulty: 'normal',
		level: 285,
		entryLevel: 285,
		totalHp: 6_505_000_000_000_000,
		gates: {
			levelOk: true,
			forceMultiplier: 0.88,
			forceType: 'sacred',
			forceRequired: 500,
			forceHave: 380,
			combatPowerOk: false
		},
		carryDamageRequired: 325_250_000_000_000,
		solo: {
			verdict: 'out-of-reach',
			ratio: 0.29,
			clearMinutes: 103,
			reason: 'Needs ~3.4x current damage.'
		},
		party: { verdict: 'minimum', ratio: 0.87, clearMinutes: 34.4 },
		carried: { verdict: 'possible', ratio: 4.5 },
		crystalMesos: 2_100_000_000,
		notes: ['120 sacred force short of 500: 0.88× damage.']
	}),
	bossRow({
		tier: 'current',
		bossId: 'extreme-kalos',
		bossName: 'Kalos',
		difficulty: 'extreme',
		level: 290,
		entryLevel: 290,
		totalHp: 44_000_000_000_000_000,
		gates: {
			levelOk: false,
			forceMultiplier: 0.85,
			forceType: 'sacred',
			forceRequired: 550,
			forceHave: 380,
			combatPowerOk: false
		},
		carryDamageRequired: 2_200_000_000_000_000,
		solo: { verdict: 'blocked', reason: 'Character level 287 < entry level 290.' },
		party: { verdict: 'blocked', reason: 'Character level 287 < entry level 290.' },
		carried: { verdict: 'blocked', reason: 'Character level 287 < entry level 290.' },
		crystalMesos: 3_500_000_000
	})
];

/** The fixture analysis. `targetId` only relabels the target; numbers are fixed. */
export function demoAnalysis(targetId = 'grandis'): Analysis {
	const presets: Record<string, { label: string; pdr: number; level: number }> = {
		grandis: { label: 'Grandis (380% PDR, lv 285)', pdr: 3.8, level: 285 },
		arcane: { label: 'Arcane River (300% PDR, lv 255)', pdr: 3.0, level: 255 }
	};
	const preset = presets[targetId];

	return {
		generatedAt: AT,
		target: preset
			? { id: targetId, label: preset.label, kind: 'preset', pdr: preset.pdr, level: preset.level }
			: {
					id: targetId,
					label: targetId,
					kind: 'boss',
					pdr: 3.8,
					level: 285,
					sacredReq: 500
				},
		summary: {
			characterId: 'demo',
			name: DEMO_CHARACTER.name,
			classId: 'hero',
			className: 'Hero',
			level: 287,
			world: 'Kronos',
			damageIndex: 1_284_930_000,
			damageIndexArcane: 1_642_180_000,
			damageIndexGrandis: 1_284_930_000,
			range: { min: 13_070_234, max: 14_522_483 },
			combatPower: {
				value: 186_940_512,
				confidence: 'sourced',
				note: 'Bow normalisation not applicable; weapon base ATT taken from the tooltip.'
			},
			totals: {
				mainStat: 327_449,
				secondaryStat: 8_812,
				attack: 3_121,
				statMultiplier: 1_318_608,
				damagePercent: 68,
				bossDamagePercent: 341,
				finalDamagePercent: 68,
				ignoreDefensePercent: 94.6,
				criticalRatePercent: 100,
				criticalDamagePercent: 91,
				arcaneForce: 1320,
				sacredForce: 380
			}
		},
		calibration: {
			checksums: [
				{
					label: 'Range (max)',
					computed: 14_522_483,
					displayed: 14_522_483,
					deltaPercent: 0,
					status: 'match'
				},
				{
					label: 'Range (min)',
					computed: 13_098_540,
					displayed: 13_070_234,
					deltaPercent: 0.22,
					status: 'close'
				},
				{
					label: 'Combat Power',
					computed: 186_940_512,
					displayed: 187_432_110,
					deltaPercent: -0.26,
					status: 'close'
				},
				{
					label: 'Ignore Defense %',
					computed: 91.2,
					displayed: 94.6,
					deltaPercent: -3.59,
					status: 'mismatch'
				},
				{ label: 'Boss Damage %', computed: 341, status: 'missing' }
			],
			residuals: [
				{ stat: 'STR (base)', fromGear: 61_240, fromStatWindow: 96_540, residual: 35_300 },
				{ stat: 'STR %', fromGear: 189, fromStatWindow: 226, residual: 37 },
				{ stat: 'ATT', fromGear: 1_694, fromStatWindow: 2_214, residual: 520 },
				{ stat: 'Boss damage %', fromGear: 78, fromStatWindow: 341, residual: 263 },
				{ stat: 'IED %', fromGear: 71.5, fromStatWindow: 94.6, residual: 23.1 }
			],
			warnings: [
				'gloves: total STR 210 does not equal base+flame+scroll+star (198) — breakdown may be misread.',
				'android: no stat block captured; it contributes nothing to the gear model.',
				'IED composed from gear is 3.4 points below the stat window — one IED source is likely missing.'
			]
		},
		upgrades: UPGRADES,
		statWorth: STAT_WORTH,
		bossBoard: {
			rows: BOSS_ROWS,
			calibrated: false,
			note: 'No class DPM anchor for Hero yet — solo/party/carried verdicts are indicative only.',
			tierCounts: { trivial: 41, early: 23, current: 12 }
		} as Analysis['bossBoard'],
		input: INPUT
	};
}
