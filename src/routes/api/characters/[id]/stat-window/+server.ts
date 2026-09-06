// Replace the stat window capture.

import { StatWindowSchema } from '$lib/schema';
import { ValidationError, characters } from '$lib/store';
import { errorResponse, readJsonObject, writeResponse } from '../../../_http';

import type { RequestHandler } from './$types';

export const PUT: RequestHandler = async ({ params, request }) => {
	try {
		const body = await readJsonObject(request);

		const parsed = StatWindowSchema.safeParse(body);
		if (!parsed.success) throw ValidationError.fromZod(parsed.error, 'Invalid stat window');

		const existing = await characters.get(params.id);
		return writeResponse(await characters.put(params.id, { ...existing, statWindow: parsed.data }));
	} catch (error) {
		return errorResponse(error);
	}
};
