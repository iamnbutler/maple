import { z } from 'zod';

import { ItemSchema, SlotSchema } from './item';
import { IsoTimestampSchema, StatWindowSchema } from './stats';

/** Character ids are slugs: lowercase, digits and dashes, 2–41 characters. */
export const CHARACTER_ID_PATTERN = /^[a-z0-9][a-z0-9-]{1,40}$/;

export const CharacterIdSchema = z
	.string()
	.regex(CHARACTER_ID_PATTERN, 'id must match ^[a-z0-9][a-z0-9-]{1,40}$');

export const ARCANE_REGIONS = [
	'vanishingJourney',
	'chuchu',
	'lachelein',
	'arcana',
	'morass',
	'esfera'
] as const;
export const ArcaneRegionSchema = z.enum(ARCANE_REGIONS);
export type ArcaneRegion = z.infer<typeof ArcaneRegionSchema>;

export const SACRED_REGIONS = [
	'cernium',
	'hotelArcus',
	'odium',
	'shangrila',
	'arteria',
	'carcion',
	'tallahart'
] as const;
export const SacredRegionSchema = z.enum(SACRED_REGIONS);
export type SacredRegion = z.infer<typeof SacredRegionSchema>;

export const HYPER_STAT_KEYS = [
	'str',
	'dex',
	'int',
	'luk',
	'maxHp',
	'maxMp',
	'dfTfPp',
	'criticalRate',
	'criticalDamage',
	'ignoreDefense',
	'damage',
	'bossDamage',
	'normalMonsterDamage',
	'statusResistance',
	'knockbackResistance',
	'defense',
	'speedJump',
	'attMatt',
	'expGain',
	'arcaneForce'
] as const;
export const HyperStatKeySchema = z.enum(HYPER_STAT_KEYS);
export type HyperStatKey = z.infer<typeof HyperStatKeySchema>;

const symbolLevel = z.number().int().min(0);

export const SymbolsSchema = z.strictObject({
	arcane: z.partialRecord(ArcaneRegionSchema, symbolLevel).optional(),
	sacred: z.partialRecord(SacredRegionSchema, symbolLevel).optional(),
	grandis: z.record(z.string(), symbolLevel).optional()
});

export type Symbols = z.infer<typeof SymbolsSchema>;

/**
 * The character document. `createdAt` / `updatedAt` are maintained by the
 * store, not by clients — use {@link CharacterInputSchema} to validate a
 * request body.
 */
export const CharacterSchema = z
	.strictObject({
		id: CharacterIdSchema,
		/** In-game name. */
		name: z.string().min(1),
		world: z.string().min(1),
		/** Key into src/lib/data/classes.ts, e.g. "shadower". */
		classId: z.string().min(1),
		level: z.number().int().min(1).max(300),

		statWindow: StatWindowSchema.optional(),
		equipment: z.partialRecord(SlotSchema, ItemSchema).default({}),

		symbols: SymbolsSchema.optional(),
		/** Hyper stat levels, 0–15. */
		hyperStats: z.partialRecord(HyperStatKeySchema, z.number().int().min(0).max(15)).optional(),
		legion: z
			.strictObject({
				level: z.number().int().min(0).optional(),
				notes: z.string().optional()
			})
			.optional(),
		/** Raw inner-ability lines. */
		innerAbility: z.array(z.string()).optional(),
		/** Raw link-skill names; informational only. */
		links: z.array(z.string()).optional(),
		notes: z.string().optional(),

		createdAt: IsoTimestampSchema,
		updatedAt: IsoTimestampSchema
	})
	.describe('a tracked MapleStory character');

export type Character = z.infer<typeof CharacterSchema>;

/**
 * What a client may PUT: the full document minus the store-managed timestamps
 * (which are accepted but ignored for `updatedAt`, and used as a floor for
 * `createdAt`).
 */
export const CharacterInputSchema = CharacterSchema.extend({
	createdAt: IsoTimestampSchema.optional(),
	updatedAt: IsoTimestampSchema.optional()
});

export type CharacterInput = z.infer<typeof CharacterInputSchema>;

/** `POST /api/characters` body. */
export const CharacterCreateSchema = z
	.strictObject({
		id: CharacterIdSchema.optional(),
		name: z.string().min(1),
		classId: z.string().min(1),
		level: z.number().int().min(1).max(300),
		world: z.string().min(1),
		notes: z.string().optional()
	})
	.describe('minimal payload to create a character');

export type CharacterCreate = z.infer<typeof CharacterCreateSchema>;

/** Derive a character id from an IGN. Returns `null` when nothing usable is left. */
export function slugify(name: string): string | null {
	const slug = name
		.normalize('NFKD')
		.toLowerCase()
		.replace(/[^a-z0-9]+/g, '-')
		.replace(/^-+|-+$/g, '')
		.slice(0, 41)
		.replace(/-+$/g, '');
	return CHARACTER_ID_PATTERN.test(slug) ? slug : null;
}
