// JSON Schema for the documents an agent writes.

import { json } from '@sveltejs/kit';

import { JSON_SCHEMAS, type JsonSchemaName } from '$lib/schema';
import { apiError } from '../_http';

import type { RequestHandler } from './$types';

export const GET: RequestHandler = ({ url }) => {
	const name = url.searchParams.get('name');
	if (name === null) return json(JSON_SCHEMAS);

	if (!(name in JSON_SCHEMAS)) {
		return apiError(404, `No schema "${name}". Known: ${Object.keys(JSON_SCHEMAS).join(', ')}`);
	}
	return json(JSON_SCHEMAS[name as JsonSchemaName]);
};
