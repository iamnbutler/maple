import { describe, expect, it } from 'vitest';

import {
	CharacterCreateSchema,
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
