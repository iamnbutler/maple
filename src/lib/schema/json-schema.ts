import { z } from 'zod';

import { CharacterCreateSchema, CharacterSchema } from './character';
import { ItemSchema, SlotSchema } from './item';
import { StatBlockSchema, StatTripleSchema, StatWindowSchema } from './stats';

/**
 * JSON Schema (draft 2020-12) for the documents an agent writes. Served from
 * `GET /api/schema` so an external agent can self-configure.
 */
export const JSON_SCHEMAS = {
	Character: z.toJSONSchema(CharacterSchema),
	CharacterCreate: z.toJSONSchema(CharacterCreateSchema),
	Item: z.toJSONSchema(ItemSchema),
	StatWindow: z.toJSONSchema(StatWindowSchema),
	StatTriple: z.toJSONSchema(StatTripleSchema),
	StatBlock: z.toJSONSchema(StatBlockSchema),
	Slot: z.toJSONSchema(SlotSchema)
} as const;

export type JsonSchemaName = keyof typeof JSON_SCHEMAS;
