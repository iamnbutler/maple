// GET /api/characters/:id/analysis?target=&topN=&kinds=
//
// The full analysis for a stored character (design §7). A character with no
// stat window answers 409, not 500: the document is fine, it just is not in a
// state that can be analysed yet.

import { json } from '@sveltejs/kit';

import { AnalysisError, analyzeAsync, optionsFromSearchParams } from '$lib/analysis';
import { characters } from '$lib/store';

import { apiError, errorResponse } from '../../../_http';

import type { RequestHandler } from './$types';

export const GET: RequestHandler = async ({ params, url }) => {
	try {
		const options = optionsFromSearchParams(url.searchParams);
		const character = await characters.get(params.id);
		return json(await analyzeAsync(character, options));
	} catch (error) {
		if (error instanceof AnalysisError) return apiError(error.status, error.message);
		return errorResponse(error);
	}
};
