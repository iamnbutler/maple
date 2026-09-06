import { z } from 'zod';

import { IsoTimestampSchema, StatBlockSchema } from './stats';

/** Every equipment slot the tracker models, in in-game layout order. */
export const SLOTS = [
	'weapon',
	'secondary',
	'emblem',
	'hat',
	'top',
	'bottom',
	'overall',
	'shoes',
	'gloves',
	'cape',
	'shoulder',
	'belt',
	'pendant1',
	'pendant2',
	'ring1',
	'ring2',
	'ring3',
	'ring4',
	'earrings',
	'face',
	'eye',
	'pocket',
	'badge',
	'medal',
	'heart',
	'android',
	'totem1',
	'totem2',
	'totem3'
] as const;

export const SlotSchema = z.enum(SLOTS).describe('equipment slot id');
export type Slot = z.infer<typeof SlotSchema>;

export const ITEM_CATEGORIES = [
	'weapon',
	'secondary',
	'emblem',
	'armor',
	'accessory',
	'heart',
	'badge',
	'pocket',
	'medal',
	'android',
	'totem'
] as const;

export const ItemCategorySchema = z.enum(ITEM_CATEGORIES).describe('upgrade-table category');
export type ItemCategory = z.infer<typeof ItemCategorySchema>;

/** The category each slot belongs to — used to default `Item.category`. */
export const CATEGORY_BY_SLOT: Record<Slot, ItemCategory> = {
	weapon: 'weapon',
	secondary: 'secondary',
	emblem: 'emblem',
	hat: 'armor',
	top: 'armor',
	bottom: 'armor',
	overall: 'armor',
	shoes: 'armor',
	gloves: 'armor',
	cape: 'armor',
	shoulder: 'armor',
	belt: 'accessory',
	pendant1: 'accessory',
	pendant2: 'accessory',
	ring1: 'accessory',
	ring2: 'accessory',
	ring3: 'accessory',
	ring4: 'accessory',
	earrings: 'accessory',
	face: 'accessory',
	eye: 'accessory',
	pocket: 'pocket',
	badge: 'badge',
	medal: 'medal',
	heart: 'heart',
	android: 'android',
	totem1: 'totem',
	totem2: 'totem',
	totem3: 'totem'
};

/**
 * Categories whose items carry star force. Emblems, badges, medals, pocket
 * items, hearts, androids and totems cannot be enhanced, so a missing
 * `starforce` on those is not worth a warning.
 */
export const STAR_FORCEABLE_CATEGORIES: readonly ItemCategory[] = [
	'weapon',
	'secondary',
	'armor',
	'accessory'
];

export const GradeSchema = z
	.enum(['rare', 'epic', 'unique', 'legendary'])
	.describe('potential grade');
export type Grade = z.infer<typeof GradeSchema>;

const potentialLine = z
	.string()
	.min(1, 'potential lines must be non-empty; use "none" for an absent line');

/**
 * Raw tooltip lines. Always exactly three whenever a grade is visible — VLMs
 * silently drop lines otherwise (see docs/research/existing-tools.md §6).
 * Parsing happens server-side in `src/lib/calc/potential-parse.ts`.
 */
export const PotentialSchema = z.strictObject({
	grade: GradeSchema,
	lines: z.tuple([potentialLine, potentialLine, potentialLine])
});

export type Potential = z.infer<typeof PotentialSchema>;

export const ItemSourceSchema = z.strictObject({
	kind: z.enum(['screenshot', 'manual', 'api']),
	note: z.string().optional(),
	at: IsoTimestampSchema
});

/**
 * One equipped item. Only `name`, `slot` and `category` are required; the API
 * fills `slot`/`category` from the request path when they are omitted.
 *
 * Absent means "not captured". Never write 0 or "" to mean "none".
 */
export const ItemSchema = z
	.strictObject({
		name: z.string().min(1),
		slot: SlotSchema,
		category: ItemCategorySchema,

		/** Base item level; needed for SF/flame/potential tables. Not on the tooltip — infer from the name. */
		itemLevel: z.number().int().positive().optional(),
		setName: z.string().optional(),

		/** ALWAYS user-confirmed. Agents must not count star sprites. */
		starforce: z.number().int().min(0).max(30).optional(),
		/** Tyrant / Superior gear. */
		superior: z.boolean().optional(),

		/** The big leading numbers in the tooltip. */
		total: StatBlockSchema.optional(),
		/** Parenthesised breakdown when legible. GMS classic merges scroll+star: put the merged value in `scroll`. */
		base: StatBlockSchema.optional(),
		flame: StatBlockSchema.optional(),
		scroll: StatBlockSchema.optional(),
		star: StatBlockSchema.optional(),

		potential: PotentialSchema.optional(),
		bonusPotential: PotentialSchema.optional(),

		soul: z
			.strictObject({
				name: z.string().optional(),
				option: z.string().optional()
			})
			.optional(),
		exceptional: StatBlockSchema.optional(),

		scrollUpgrades: z.number().int().min(0).optional(),
		remainingUpgrades: z.number().int().min(0).optional(),
		hammers: z.number().int().min(0).optional(),

		source: ItemSourceSchema.optional(),
		notes: z.string().optional()
	})
	.describe('one equipped item as read from its in-game tooltip');

export type Item = z.infer<typeof ItemSchema>;
