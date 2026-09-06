import { describe, expect, it } from 'vitest';

import { parsePotentialLine, parsePotentialLines } from './potential-parse';

function parsed(raw: string) {
	const { kind, stat, value } = parsePotentialLine(raw);
	return stat ? { kind, stat, value } : { kind, value };
}

describe('potential parser — percent stat lines', () => {
	it('parses the spaced and unspaced colon forms', () => {
		expect(parsed('STR : +12%')).toEqual({ kind: 'stat_pct', stat: 'str', value: 12 });
		expect(parsed('STR: +12%')).toEqual({ kind: 'stat_pct', stat: 'str', value: 12 });
		expect(parsed('STR:+12%')).toEqual({ kind: 'stat_pct', stat: 'str', value: 12 });
	});

	it('parses every stat', () => {
		expect(parsed('DEX : +9%')).toEqual({ kind: 'stat_pct', stat: 'dex', value: 9 });
		expect(parsed('INT : +9%')).toEqual({ kind: 'stat_pct', stat: 'int', value: 9 });
		expect(parsed('LUK : +9%')).toEqual({ kind: 'stat_pct', stat: 'luk', value: 9 });
	});

	it('is case insensitive', () => {
		expect(parsed('str : +12%')).toEqual({ kind: 'stat_pct', stat: 'str', value: 12 });
		expect(parsed('Luk : +12%')).toEqual({ kind: 'stat_pct', stat: 'luk', value: 12 });
	});

	it('parses All Stats', () => {
		expect(parsed('All Stats : +9%')).toEqual({ kind: 'all_stat_pct', value: 9 });
		expect(parsed('All Stat : +9%')).toEqual({ kind: 'all_stat_pct', value: 9 });
		expect(parsed('all stats: +6%')).toEqual({ kind: 'all_stat_pct', value: 6 });
	});
});

describe('potential parser — flat stat lines', () => {
	it('parses flat stats', () => {
		expect(parsed('STR : +40')).toEqual({ kind: 'stat_flat', stat: 'str', value: 40 });
		expect(parsed('DEX : +40')).toEqual({ kind: 'stat_flat', stat: 'dex', value: 40 });
	});

	it('parses flat Max HP as a flat HP stat', () => {
		expect(parsed('Max HP : +250')).toEqual({ kind: 'stat_flat', stat: 'hp', value: 250 });
		expect(parsed('MaxHP : +250')).toEqual({ kind: 'stat_flat', stat: 'hp', value: 250 });
	});
});

describe('potential parser — attack lines', () => {
	it('parses Attack Power, flat and percent', () => {
		expect(parsed('Attack Power : +12%')).toEqual({ kind: 'att_pct', value: 12 });
		expect(parsed('Attack Power : +15')).toEqual({ kind: 'att', value: 15 });
		expect(parsed('ATT : +12%')).toEqual({ kind: 'att_pct', value: 12 });
	});

	it('parses Magic ATT, flat and percent, without colliding with ATT', () => {
		expect(parsed('Magic ATT : +9%')).toEqual({ kind: 'matt_pct', value: 9 });
		expect(parsed('Magic ATT : +12')).toEqual({ kind: 'matt', value: 12 });
		expect(parsed('Magic Attack : +9%')).toEqual({ kind: 'matt_pct', value: 9 });
		expect(parsed('MATT : +9%')).toEqual({ kind: 'matt_pct', value: 9 });
	});
});

describe('potential parser — damage lines', () => {
	it('parses Boss Monster Damage before plain Damage', () => {
		expect(parsed('Boss Monster Damage : +40%')).toEqual({ kind: 'boss', value: 40 });
		expect(parsed('Boss Damage : +30%')).toEqual({ kind: 'boss', value: 30 });
		expect(parsed('Damage to Boss Monsters : +35%')).toEqual({ kind: 'boss', value: 35 });
	});

	it('parses plain Damage', () => {
		expect(parsed('Damage : +12%')).toEqual({ kind: 'dmg', value: 12 });
		expect(parsed('Total Damage : +12%')).toEqual({ kind: 'dmg', value: 12 });
	});

	it('parses both spellings of the IED line', () => {
		expect(parsed('Ignore Enemy DEF : +40%')).toEqual({ kind: 'ied', value: 40 });
		expect(parsed('Ignored Enemy DEF : +40%')).toEqual({ kind: 'ied', value: 40 });
		expect(parsed('Ignore Enemy Defense : +35%')).toEqual({ kind: 'ied', value: 35 });
		expect(parsed('ignore def: +30%')).toEqual({ kind: 'ied', value: 30 });
	});
});

describe('potential parser — crit, HP and utility lines', () => {
	it('parses Critical Rate and Critical Damage separately', () => {
		expect(parsed('Critical Rate : +12%')).toEqual({ kind: 'crit_rate', value: 12 });
		expect(parsed('Critical Damage : +8%')).toEqual({ kind: 'crit_dmg', value: 8 });
		expect(parsed('Crit Rate : +5%')).toEqual({ kind: 'crit_rate', value: 5 });
	});

	it('parses Max HP %', () => {
		expect(parsed('Max HP : +12%')).toEqual({ kind: 'hp_pct', value: 12 });
	});

	it('parses a negative cooldown reduction in seconds', () => {
		expect(parsed('Skill Cooldown : -2 sec')).toEqual({ kind: 'cooldown', value: -2 });
		expect(parsed('Skill Cooldown: -1 sec')).toEqual({ kind: 'cooldown', value: -1 });
	});

	it('tolerates the en dash GMS sometimes renders', () => {
		expect(parsed('Skill Cooldown : –2 sec')).toEqual({ kind: 'cooldown', value: -2 });
	});

	it('parses drop and meso lines', () => {
		expect(parsed('Item Drop Rate : +20%')).toEqual({ kind: 'drop', value: 20 });
		expect(parsed('Mesos Obtained : +20%')).toEqual({ kind: 'meso', value: 20 });
	});
});

describe('potential parser — unknown lines', () => {
	it('maps Decent skills to other, never dropping them', () => {
		for (const line of [
			'Decent Sharp Eyes',
			'Decent Speed Infusion',
			'Decent Hyper Body',
			'Decent Combat Orders',
			'Decent Advanced Blessing'
		]) {
			const result = parsePotentialLine(line);
			expect(result.kind).toBe('other');
			expect(result.value).toBe(0);
			expect(result.raw).toBe(line);
		}
	});

	it('maps unmodelled effects to other', () => {
		expect(parsed('Chance to ignore 20% damage when hit')).toEqual({ kind: 'other', value: 0 });
		expect(parsed('Increases invincibility time after being hit by 2 sec')).toEqual({
			kind: 'other',
			value: 0
		});
		expect(parsed('')).toEqual({ kind: 'other', value: 0 });
		expect(parsed('   ')).toEqual({ kind: 'other', value: 0 });
	});

	it('keeps the raw string verbatim on every line', () => {
		const raw = '  STR : +12%  ';
		expect(parsePotentialLine(raw).raw).toBe(raw);
	});
});

describe('parsePotentialLines', () => {
	it('preserves order and count', () => {
		const lines = ['STR : +12%', 'Decent Sharp Eyes', 'Ignore Enemy DEF : +35%'];
		const result = parsePotentialLines(lines);
		expect(result).toHaveLength(3);
		expect(result.map((line) => line.kind)).toEqual(['stat_pct', 'other', 'ied']);
		expect(result.map((line) => line.raw)).toEqual(lines);
	});
});
