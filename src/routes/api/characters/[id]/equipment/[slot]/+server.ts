// Upsert or remove one equipped item.
//
// `slot` and `category` are filled in from the request path when the body omits
// them, so an agent can POST exactly what it read off the tooltip.

import { json } from '@sveltejs/kit';

import { CATEGORY_BY_SLOT, ItemSchema, SlotSchema, itemWarnings, type Slot } from '$lib/schema';
import { NotFoundError, ValidationError, characters } from '$lib/store';
import { errorResponse, readJsonObject } from '../../../../_http';

import type { RequestHandler } from './$types';

function parseSlot(raw: string): Slot {
	const parsed = SlotSchema.safeParse(raw);
	if (!parsed.success) {
		throw new ValidationError(`Unknown slot "${raw}"`, [
			{ path: 'slot', message: 'see GET /api/ref/slots for the valid slot ids' }
		]);
	}
	return parsed.data;
}

export const PUT: RequestHandler = async ({ params, request }) => {
	try {
		const slot = parseSlot(params.slot);
		const body = await readJsonObject(request);

		if (body.slot !== undefined && body.slot !== slot) {
			throw new ValidationError(
				`Body slot "${String(body.slot)}" does not match path slot "${slot}"`,
				[{ path: 'slot', message: `must be "${slot}" or omitted` }]
			);
		}

		const parsed = ItemSchema.safeParse({
			...body,
			slot,
			category: body.category ?? CATEGORY_BY_SLOT[slot]
		});
		if (!parsed.success) throw ValidationError.fromZod(parsed.error, 'Invalid item');

		const existing = await characters.get(params.id);
		const character = await characters.put(params.id, {
			...existing,
			equipment: { ...existing.equipment, [slot]: parsed.data }
		});

		return json({ character, warnings: itemWarnings(slot, parsed.data) });
	} catch (error) {
		return errorResponse(error);
	}
};

export const DELETE: RequestHandler = async ({ params }) => {
	try {
		const slot = parseSlot(params.slot);
		const existing = await characters.get(params.id);

		if (!existing.equipment[slot]) {
			throw new NotFoundError(`Character "${params.id}" has nothing in slot "${slot}"`);
		}

		const equipment = { ...existing.equipment };
		delete equipment[slot];

		const character = await characters.put(params.id, { ...existing, equipment });
		return json({ character, warnings: [] as string[] });
	} catch (error) {
		return errorResponse(error);
	}
};
