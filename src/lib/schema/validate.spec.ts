import { describe, expect, it } from 'vitest';

import type { Character, Item } from './index';
import { characterWarnings, itemWarnings } from './validate';

function item(overrides: Partial<Item> = {}): Item {
	return {
		name: 'Royal Von Leon Warrior Hat',
		slot: 'hat',
		category: 'armor',
		itemLevel: 150,
		starforce: 22,
		...overrides
	} as Item;
}

describe('itemWarnings', () => {
	it('is silent on a fully captured, consistent item', () => {
		expect(
			itemWarnings(
				'hat',
				item({
					total: { str: 265 },
					base: { str: 100 },
					flame: { str: 45 },
					scroll: { str: 40 },
					star: { str: 80 }
				})
			)
		).toEqual([]);
	});

	it('flags a breakdown that does not add up to the total', () => {
		const warnings = itemWarnings(
			'hat',
			item({ total: { str: 265 }, base: { str: 100 }, flame: { str: 45 }, scroll: { str: 40 } })
		);
		expect(warnings).toHaveLength(1);
		expect(warnings[0]).toContain('total.str is 265');
		expect(warnings[0]).toContain('185');
	});

	it('treats an absent component as zero (GMS classic merges scroll+star)', () => {
		expect(
			itemWarnings('hat', item({ total: { str: 185 }, base: { str: 100 }, scroll: { str: 85 } }))
		).toEqual([]);
	});

	it('ignores percent stats, which do not decompose', () => {
		expect(
			itemWarnings(
				'hat',
				item({ total: { str: 100, allStatPct: 9 }, base: { str: 100 }, flame: { allStatPct: 3 } })
			)
		).toEqual([]);
	});

	it('warns when star force is missing on a star-forceable slot', () => {
		const warnings = itemWarnings(
			'weapon',
			item({ slot: 'weapon', category: 'weapon', starforce: undefined })
		);
		expect(warnings.some((w) => w.includes('starforce is missing'))).toBe(true);
	});

	it('does not warn about star force on a badge', () => {
		const warnings = itemWarnings(
			'badge',
			item({ slot: 'badge', category: 'badge', starforce: undefined })
		);
		expect(warnings.some((w) => w.includes('starforce'))).toBe(false);
	});

	it('warns when the item level is missing', () => {
		const warnings = itemWarnings('hat', item({ itemLevel: undefined }));
		expect(warnings.some((w) => w.includes('itemLevel is missing'))).toBe(true);
	});
});

describe('characterWarnings', () => {
	it('collects warnings across every equipped slot', () => {
		const character = {
			id: 'nate',
			name: 'Nate',
			world: 'Kronos',
			classId: 'shadower',
			level: 287,
			equipment: {
				hat: item({ itemLevel: undefined }),
				weapon: item({
					slot: 'weapon',
					category: 'weapon',
					name: 'Genesis Dagger',
					starforce: undefined
				})
			},
			createdAt: '2026-09-06T00:00:00.000Z',
			updatedAt: '2026-09-06T00:00:00.000Z'
		} as unknown as Character;

		const warnings = characterWarnings(character);
		expect(warnings.some((w) => w.startsWith('equipment.hat'))).toBe(true);
		expect(warnings.some((w) => w.startsWith('equipment.weapon'))).toBe(true);
	});
});
