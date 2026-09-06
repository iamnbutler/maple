// List and create characters.

import { json } from '@sveltejs/kit';

import { CharacterCreateSchema, slugify } from '$lib/schema';
import { ValidationError, characters } from '$lib/store';
import { apiError, errorResponse, readJsonObject, writeResponse } from '../_http';

import type { RequestHandler } from './$types';

export const GET: RequestHandler = async () => {
	try {
		return json({ characters: await characters.list() });
	} catch (error) {
		return errorResponse(error);
	}
};

export const POST: RequestHandler = async ({ request }) => {
	try {
		const body = await readJsonObject(request);

		const parsed = CharacterCreateSchema.safeParse(body);
		if (!parsed.success) throw ValidationError.fromZod(parsed.error, 'Invalid character payload');

		const id = parsed.data.id ?? slugify(parsed.data.name);
		if (!id) {
			throw new ValidationError(
				`Could not derive an id from name "${parsed.data.name}" — pass an explicit "id"`,
				[{ path: 'id', message: 'must match ^[a-z0-9][a-z0-9-]{1,40}$' }]
			);
		}

		if (await characters.exists(id)) {
			return apiError(409, `Character "${id}" already exists`);
		}

		const { id: _ignored, ...rest } = parsed.data;
		const character = await characters.put(id, { ...rest, id, equipment: {} });
		return writeResponse(character, 201);
	} catch (error) {
		return errorResponse(error);
	}
};
