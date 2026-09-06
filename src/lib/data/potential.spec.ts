import { describe, expect, it } from 'vitest';

import {
	BONUS_POTENTIAL_AVAILABLE_IN_HEROIC,
	CASH_CUBE_PRIME_RATES,
	GMS_POTENTIAL_LEVEL_BREAKPOINT,
	HEROIC_CUBE_PRICES,
	IN_GAME_CUBE_PRIME_RATES,
	LEGENDARY_PRIME_ODDS,
	lineValue,
	lineValues,
	POTENTIAL_PERCENT_SCALE,
	rankBelow,
	UNVERIFIED_GLOVE_CRIT_DAMAGE,
	USEFUL_LINES,
	type PotentialGrade
} from './potential';

const GRADES: PotentialGrade[] = ['rare', 'epic', 'unique', 'legendary'];

describe('the master percentage scale', () => {
	// formulas.md §4A §3.2
	it('breaks at item level 151 in GMS', () => {
		expect(GMS_POTENTIAL_LEVEL_BREAKPOINT).toBe(151);
		expect(lineValue('legendary', 150, 'armor', 'stat_pct')).toBe(12);
		expect(lineValue('legendary', 151, 'armor', 'stat_pct')).toBe(13);
	});

	it('gives 13% main stat at Lv151+ for every equipment level above it', () => {
		for (const level of [151, 160, 200, 250]) {
			expect(lineValue('legendary', level, 'armor', 'stat_pct')).toBe(13);
			expect(lineValue('legendary', level, 'weapon', 'stat_pct')).toBe(13);
			expect(lineValue('legendary', level, 'accessory', 'stat_pct')).toBe(13);
		}
	});

	it('matches the published table at every bracket and rank', () => {
		const expected = [
			{ level: 0, values: [1, 2, 3, 6] },
			{ level: 31, values: [2, 4, 6, 9] },
			{ level: 71, values: [3, 6, 9, 12] },
			{ level: 151, values: [4, 7, 10, 13] }
		];
		for (const row of expected) {
			expect(GRADES.map((g) => lineValue(g, row.level, 'armor', 'stat_pct'))).toEqual(row.values);
		}
		expect(POTENTIAL_PERCENT_SCALE).toHaveLength(4);
	});

	it('drops All Stat % one rank below the stated rank', () => {
		expect(lineValue('legendary', 160, 'armor', 'all_stat_pct')).toBe(10);
		expect(lineValue('unique', 160, 'armor', 'all_stat_pct')).toBe(7);
		expect(rankBelow('legendary')).toBe('unique');
		expect(rankBelow('rare')).toBeNull();
		expect(lineValue('rare', 160, 'armor', 'all_stat_pct')).toBeNull();
	});
});

describe('weapon special lines', () => {
	// formulas.md §4A §3.3
	it('has Boss Damage 30% at Unique and 35/40% at Legendary', () => {
		expect(lineValues('unique', 200, 'weapon', 'boss').map((o) => o.value)).toEqual([30]);
		expect(lineValues('legendary', 200, 'weapon', 'boss').map((o) => o.value)).toEqual([35, 40]);
		expect(lineValue('legendary', 200, 'weapon', 'boss')).toBe(40);
		// Boss 35% is twice as likely as Boss 40% on an initial roll.
		const legendary = lineValues('legendary', 200, 'weapon', 'boss');
		expect(legendary[0].initialChance).toBe(0.08);
		expect(legendary[1].initialChance).toBe(0.04);
	});

	it('has IED 30% at Unique and 35/40% at Legendary, equally likely', () => {
		expect(lineValues('unique', 200, 'weapon', 'ied').map((o) => o.value)).toEqual([30]);
		expect(lineValues('legendary', 200, 'weapon', 'ied').map((o) => o.value)).toEqual([35, 40]);
		const legendary = lineValues('legendary', 200, 'weapon', 'ied');
		expect(legendary[0].initialChance).toBe(legendary[1].initialChance);
	});

	it('respects the minimum item levels', () => {
		expect(lineValues('legendary', 60, 'weapon', 'boss')).toHaveLength(0); // Lv100+
		expect(lineValues('legendary', 60, 'weapon', 'ied').map((o) => o.value)).toEqual([35]); // 35 is Lv50+
	});

	it('does not put boss/IED lines on armor or accessories', () => {
		expect(lineValue('legendary', 200, 'armor', 'boss')).toBeNull();
		expect(lineValue('legendary', 200, 'accessory', 'ied')).toBeNull();
	});

	it('mirrors the weapon pool onto secondaries and emblems', () => {
		expect(lineValue('legendary', 200, 'secondary', 'boss')).toBe(40);
		expect(lineValue('legendary', 200, 'emblem', 'att_pct')).toBe(13);
	});
});

describe('slot-specific lines', () => {
	// formulas.md §4A §3.3 "Armor — Hat"
	it('gives hats the −2s cooldown line and everything else only −1s', () => {
		expect(lineValue('legendary', 160, 'armor', 'cooldown', { slot: 'hat' })).toBe(-2);
		expect(lineValue('legendary', 160, 'armor', 'cooldown', { slot: 'top' })).toBe(-1);
		expect(lineValue('legendary', 100, 'armor', 'cooldown', { slot: 'hat' })).toBe(-1); // −2s needs Lv120+
		expect(lineValue('legendary', 60, 'armor', 'cooldown', { slot: 'hat' })).toBeNull(); // −1s needs Lv70+
		expect(lineValue('unique', 160, 'armor', 'cooldown', { slot: 'hat' })).toBeNull();
	});

	it('exposes the glove Critical Damage line only as an UNVERIFIED value', () => {
		expect(UNVERIFIED_GLOVE_CRIT_DAMAGE.legendary).toBe(8);
		expect(lineValue('legendary', 160, 'armor', 'crit_dmg', { slot: 'gloves' })).toBe(8);
		expect(lineValue('legendary', 160, 'armor', 'crit_dmg', { slot: 'hat' })).toBeNull();
		expect(lineValues('legendary', 160, 'armor', 'crit_dmg', { slot: 'gloves' })[0].note).toMatch(
			/UNVERIFIED/
		);
	});

	it('caps accessory meso/drop lines at item level 71', () => {
		expect(lineValue('legendary', 71, 'accessory', 'meso')).toBe(20);
		expect(lineValue('legendary', 250, 'accessory', 'drop')).toBe(20); // no 151+ bump
		expect(lineValue('legendary', 50, 'accessory', 'meso')).toBe(15);
		expect(lineValue('legendary', 250, 'armor', 'drop')).toBeNull();
	});
});

describe('bonus potential', () => {
	// formulas.md §4A §3.6 — reference only: bonus potential does not exist in Heroic worlds
	it('is flagged unavailable in Heroic worlds', () => {
		expect(BONUS_POTENTIAL_AVAILABLE_IN_HEROIC).toBe(false);
	});

	it('uses its own, weaker % scale on armor and accessories', () => {
		expect(lineValue('legendary', 160, 'armor', 'stat_pct', { potential: 'bonus' })).toBe(8);
		expect(lineValue('legendary', 100, 'armor', 'stat_pct', { potential: 'bonus' })).toBe(7);
		expect(lineValue('legendary', 160, 'armor', 'hp_pct', { potential: 'bonus' })).toBe(11);
		expect(lineValue('legendary', 160, 'armor', 'all_stat_pct', { potential: 'bonus' })).toBe(6);
	});

	it('uses the regular scale on weapons, secondaries and emblems', () => {
		expect(lineValue('legendary', 160, 'weapon', 'stat_pct', { potential: 'bonus' })).toBe(13);
		expect(lineValue('legendary', 160, 'emblem', 'att_pct', { potential: 'bonus' })).toBe(13);
	});

	it('has the flat ATT line worth +15 on a Lv151+ armor or accessory', () => {
		expect(lineValue('legendary', 160, 'armor', 'att_flat', { potential: 'bonus' })).toBe(15);
		expect(lineValue('legendary', 100, 'accessory', 'att_flat', { potential: 'bonus' })).toBe(14);
		expect(lineValue('legendary', 160, 'armor', 'stat_flat', { potential: 'bonus' })).toBe(19);
		expect(lineValue('unique', 160, 'armor', 'att_flat', { potential: 'bonus' })).toBeNull();
	});

	it('has much weaker weapon specials than regular potential', () => {
		expect(lineValue('legendary', 200, 'weapon', 'boss', { potential: 'bonus' })).toBe(18);
		expect(lineValue('legendary', 200, 'weapon', 'ied', { potential: 'bonus' })).toBe(5);
	});
});

describe('prime-line rates and cubes', () => {
	// formulas.md §4A §3.4, §3.7
	it('knows the in-game cube prime rates', () => {
		expect(IN_GAME_CUBE_PRIME_RATES.solid.legendary).toBe(0.001996);
		expect(IN_GAME_CUBE_PRIME_RATES.hard.legendary).toBeNull();
		expect(CASH_CUBE_PRIME_RATES.bright).toEqual({ secondLine: 0.2, thirdLine: 0.05 });
		expect(LEGENDARY_PRIME_ODDS.bright.triplePrime).toBe(0.01);
	});

	it('prices cash cubes in Heroic mesos only', () => {
		expect(HEROIC_CUBE_PRICES).toEqual({ glowing: 12_000_000, bright: 22_000_000 });
	});
});

describe('useful-line templates', () => {
	it('covers every category and only names real line kinds', () => {
		const categories = [
			'weapon',
			'secondary',
			'emblem',
			'armor',
			'accessory',
			'heart',
			'badge'
		] as const;
		for (const category of categories) {
			expect(USEFUL_LINES[category].length).toBeGreaterThan(0);
		}
		expect(USEFUL_LINES.weapon).toContain('boss');
		expect(USEFUL_LINES.weapon).toContain('ied');
		expect(USEFUL_LINES.accessory).not.toContain('boss');
	});
});
