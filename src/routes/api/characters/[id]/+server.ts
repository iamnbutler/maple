// One character document: read, replace, merge-patch, delete.

import { json } from '@sveltejs/kit';

import { characters } from '$lib/store';
import { errorResponse, readJsonObject, writeResponse } from '../../_http';

import type { RequestHandler } from './$types';

export const GET: RequestHandler = async ({ params }) => {
	try {
		return json(await characters.get(params.id));
	} catch (error) {
		return errorResponse(error);
	}
};

export const PUT: RequestHandler = async ({ params, request }) => {
	try {
		const body = await readJsonObject(request);
		if (body.id === undefined) body.id = params.id;
		return writeResponse(await characters.put(params.id, body));
	} catch (error) {
		return errorResponse(error);
	}
};

export const PATCH: RequestHandler = async ({ params, request }) => {
	try {
		return writeResponse(await characters.patch(params.id, await readJsonObject(request)));
	} catch (error) {
		return errorResponse(error);
	}
};

export const DELETE: RequestHandler = async ({ params }) => {
	try {
		await characters.remove(params.id);
		return json({ deleted: params.id, warnings: [] as string[] });
	} catch (error) {
		return errorResponse(error);
	}
};
