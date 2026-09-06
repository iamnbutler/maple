// Snapshot index for a character, oldest first.

import { json } from '@sveltejs/kit';

import { history } from '$lib/store';
import { errorResponse } from '../../../_http';

import type { RequestHandler } from './$types';

export const GET: RequestHandler = async ({ params }) => {
	try {
		return json({ id: params.id, snapshots: await history.list(params.id) });
	} catch (error) {
		return errorResponse(error);
	}
};
