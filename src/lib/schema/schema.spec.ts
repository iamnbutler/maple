import { describe, expect, it } from 'vitest';

import {
	CharacterCreateSchema,
	CharacterInputSchema,
	CharacterSchema,
	ItemSchema,
	JSON_SCHEMAS,
	SLOTS,
	SlotSchema,
	StatTripleSchema,
	StatWindowSchema,
	slugify
} from './index';

const validCharacter = {
	id: 'nate-shadower',
	name: 'NateTheGreat',
	world: 'Kronos',
	classId: 'shadower',
	level: 287,
	createdAt: '2026-09-06T00:00:00.000Z',
	updatedAt: '2026-09-06T00:00:00.000Z'
};

describe('StatTripleSchema', () => {
	it('requires base and leaves percent/flat optional', () => {
		expect(StatTripleSchema.parse({ base: 100 })).toEqual({ base: 100 });
		expect(StatTripleSchema.safeParse({ percent: 10 }).success).toBe(false);
	});

	it('rejects unknown keys', () => {
		const result = StatTripleSchema.safeParse({ base: 1, bass: 2 });
		expect(result.success).toBe(false);
		expect(result.error?.issues[0]?.code).toBe('unrecognized_keys');
	});
});

describe('SlotSchema', () => {
	it('covers the 29 slots from the design', () => {
		expect(SLOTS).toHaveLength(29);
		expect(SlotSchema.parse('pendant2')).toBe('pendant2');
		expect(SlotSchema.safeParse('pendant3').success).toBe(false);
	});
});

describe('ItemSchema', () => {
	const item = { name: 'Royal Von Leon Warrior Hat', slot: 'hat', category: 'armor' } as const;

	it('accepts a minimal item', () => {
		expect(ItemSchema.parse(item)).toEqual(item);
	});

	it('requires exactly three potential lines', () => {
		const two = ItemSchema.safeParse({
			...item,
			potential: { grade: 'legendary', lines: ['STR: +12%', 'STR: +9%'] }
		});
		expect(two.success).toBe(false);

		const three = ItemSchema.safeParse({
			...item,
			potential: { grade: 'legendary', lines: ['STR: +12%', 'STR: +9%', 'Boss Damage: +30%'] }
		});
		expect(three.success).toBe(true);
	});

	it('rejects empty potential lines and unknown grades', () => {
		expect(
			ItemSchema.safeParse({ ...item, potential: { grade: 'legendary', lines: ['a', '', 'c'] } })
				.success
		).toBe(false);
		expect(
			ItemSchema.safeParse({ ...item, potential: { grade: 'mythic', lines: ['a', 'b', 'c'] } })
				.success
		).toBe(false);
	});

	it('rejects a typo in a stat block key with a readable message', () => {
		const result = ItemSchema.safeParse({ ...item, total: { str: 250, attack: 12 } });
		expect(result.success).toBe(false);
		expect(result.error?.issues[0]?.message).toContain('attack');
	});

	it('caps star force at 30', () => {
		expect(ItemSchema.safeParse({ ...item, starforce: 30 }).success).toBe(true);
		expect(ItemSchema.safeParse({ ...item, starforce: 31 }).success).toBe(false);
	});
});

describe('StatWindowSchema', () => {
	const window = {
		str: { base: 12345, percent: 285, flat: 1830 },
		dex: { base: 1830 },
		int: { base: 4 },
		luk: { base: 4 },
		attack: { base: 1720, percent: 47 }
	};

	it('defaults capturedAt to now', () => {
		const parsed = StatWindowSchema.parse(window);
		expect(parsed.capturedAt).toMatch(/^\d{4}-\d{2}-\d{2}T/);
	});

	it('keeps percent fields as plain numbers', () => {
		const parsed = StatWindowSchema.parse({ ...window, bossDamagePercent: 315 });
		expect(parsed.bossDamagePercent).toBe(315);
	});

	it('requires all four stat triples', () => {
		const { luk: _luk, ...missing } = window;
		expect(StatWindowSchema.safeParse(missing).success).toBe(false);
	});

	it('rejects a non-ISO capturedAt', () => {
		expect(StatWindowSchema.safeParse({ ...window, capturedAt: '2026-09-06' }).success).toBe(false);
	});
});

describe('CharacterSchema', () => {
	it('defaults equipment to an empty object', () => {
		expect(CharacterSchema.parse(validCharacter).equipment).toEqual({});
	});

	it('accepts a partial equipment record', () => {
		const parsed = CharacterSchema.parse({
			...validCharacter,
			equipment: { hat: { name: 'Hat', slot: 'hat', category: 'armor' } }
		});
		expect(Object.keys(parsed.equipment)).toEqual(['hat']);
	});

	it('rejects bad ids and unknown slots', () => {
		expect(CharacterSchema.safeParse({ ...validCharacter, id: 'Nate' }).success).toBe(false);
		expect(CharacterSchema.safeParse({ ...validCharacter, id: 'a' }).success).toBe(false);
		expect(
			CharacterSchema.safeParse({
				...validCharacter,
				equipment: { hatt: { name: 'Hat', slot: 'hat', category: 'armor' } }
			}).success
		).toBe(false);
	});

	it('has no serverType field', () => {
		expect(CharacterSchema.safeParse({ ...validCharacter, serverType: 'heroic' }).success).toBe(
			false
		);
	});
});

describe('CharacterSchema legion', () => {
	const legion = (value: unknown) =>
		CharacterSchema.safeParse({ ...validCharacter, legion: value });

	it('accepts the whole structure', () => {
		const parsed = CharacterSchema.parse({
			...validCharacter,
			legion: {
				level: 9083,
				members: [{ classId: 'hero', level: 270, name: 'Lutohammer' }],
				board: { bossDamage: 40, criticalRate: 12 },
				artifact: { level: 39, effects: { bossDamage: 10, mesosObtained: 9 } },
				notes: 'Legendary III'
			}
		});
		expect(parsed.legion?.members?.[0].classId).toBe('hero');
		expect(parsed.legion?.board?.bossDamage).toBe(40);
		expect(parsed.legion?.artifact?.effects?.mesosObtained).toBe(9);
	});

	it('keeps every field optional so a partial capture still validates', () => {
		expect(legion({}).success).toBe(true);
		expect(legion({ level: 9083 }).success).toBe(true);
	});

	it('rejects an unknown board area', () => {
		// Guides list a "Stance" area that does not exist on the current board.
		expect(legion({ board: { stance: 10 } }).success).toBe(false);
		expect(legion({ board: { damage: 20 } }).success).toBe(false);
	});

	it('caps a board area at the 40 squares an area can hold', () => {
		expect(legion({ board: { bossDamage: 40 } }).success).toBe(true);
		expect(legion({ board: { bossDamage: 41 } }).success).toBe(false);
		expect(legion({ board: { bossDamage: -1 } }).success).toBe(false);
	});

	it('caps artifact level at 60 and effect levels at 10', () => {
		expect(legion({ artifact: { level: 60 } }).success).toBe(true);
		expect(legion({ artifact: { level: 61 } }).success).toBe(false);
		expect(legion({ artifact: { effects: { bossDamage: 10 } } }).success).toBe(true);
		expect(legion({ artifact: { effects: { bossDamage: 11 } } }).success).toBe(false);
	});

	it('rejects a member level outside 1-300', () => {
		expect(legion({ members: [{ classId: 'hero', level: 301 }] }).success).toBe(false);
		expect(legion({ members: [{ classId: 'hero', level: 0 }] }).success).toBe(false);
	});
});

describe('CharacterSchema links', () => {
	it('stores links as id plus stacked level', () => {
		const parsed = CharacterSchema.parse({
			...validCharacter,
			links: [
				{ id: 'cygnus-blessing', level: 15 },
				{ id: 'light-wash', level: 3 }
			]
		});
		expect(parsed.links).toEqual([
			{ id: 'cygnus-blessing', level: 15 },
			{ id: 'light-wash', level: 3 }
		]);
	});

	it('rejects a level above the highest faction cap', () => {
		// Cygnus Blessing at 15 is the highest link level that exists.
		expect(
			CharacterSchema.safeParse({ ...validCharacter, links: [{ id: 'x', level: 16 }] }).success
		).toBe(false);
	});

	it('does not accept the legacy string[] on the STORED schema', () => {
		expect(
			CharacterSchema.safeParse({ ...validCharacter, links: ['Cygnus Knights'] }).success
		).toBe(false);
	});

	it('coerces the legacy string[] on the INPUT schema, at level 0', () => {
		const parsed = CharacterInputSchema.parse({
			...validCharacter,
			links: ['Cygnus Knights', 'Kaiser']
		});
		expect(parsed.links).toEqual([
			{ id: 'Cygnus Knights', level: 0 },
			{ id: 'Kaiser', level: 0 }
		]);
	});

	it('still accepts the structured form on the input schema', () => {
		const parsed = CharacterInputSchema.parse({
			...validCharacter,
			links: [{ id: 'light-wash', level: 3 }]
		});
		expect(parsed.links).toEqual([{ id: 'light-wash', level: 3 }]);
	});
});

describe('CharacterCreateSchema', () => {
	it('accepts the minimal create payload', () => {
		expect(
			CharacterCreateSchema.parse({
				name: 'NateTheGreat',
				classId: 'shadower',
				level: 287,
				world: 'Kronos'
			})
		).toEqual({ name: 'NateTheGreat', classId: 'shadower', level: 287, world: 'Kronos' });
	});

	it('rejects extra keys', () => {
		expect(
			CharacterCreateSchema.safeParse({
				name: 'N',
				classId: 'shadower',
				level: 1,
				world: 'Kronos',
				statWindow: {}
			}).success
		).toBe(false);
	});
});

describe('slugify', () => {
	it('slugifies IGNs', () => {
		expect(slugify('NateTheGreat')).toBe('natethegreat');
		expect(slugify('Nate The Great!')).toBe('nate-the-great');
	});

	it('returns null when nothing usable is left', () => {
		expect(slugify('!!')).toBeNull();
		expect(slugify('x')).toBeNull();
	});
});

describe('JSON_SCHEMAS', () => {
	it('exposes Character, Item and StatWindow', () => {
		expect(Object.keys(JSON_SCHEMAS)).toEqual(
			expect.arrayContaining(['Character', 'Item', 'StatWindow'])
		);
	});

	it('marks objects as closed and lists the slot enum', () => {
		expect(JSON_SCHEMAS.Item).toMatchObject({ type: 'object', additionalProperties: false });
		expect(JSON_SCHEMAS.Slot).toMatchObject({ enum: expect.arrayContaining(['weapon', 'ring4']) });
	});
});
