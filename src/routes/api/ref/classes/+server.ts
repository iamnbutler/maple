// Reference: playable classes.
//
// TODO: return the real table once `src/lib/data/classes.ts` lands (primary /
// secondary stat mapping, Xenon's 3-way split, Demon Avenger's HP scaling).
// Until then this is an empty list so clients can already wire the endpoint up.

import { json } from '@sveltejs/kit';

import type { RequestHandler } from './$types';

export const GET: RequestHandler = () => json([]);
