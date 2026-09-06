// One snapshot. Read-only.

import { json } from '@sveltejs/kit';

import { history } from '$lib/store';
import { errorResponse } from '../../../../_http';

import type { RequestHandler } from './$types';

export const GET: RequestHandler = async ({ params }) => {
	try {
		return json(await history.get(params.id, params.ts));
	} catch (error) {
		return errorResponse(error);
	}
};
