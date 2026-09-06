// Character list + the class table the create form is built from.

import { listClasses } from '$lib/data/classes';

import type { PageServerLoad } from './$types';
import type { Character } from '$lib/schema';

export const load: PageServerLoad = async ({ fetch }) => {
	const classes = listClasses().map((c) => ({ id: c.id, name: c.name, jobType: c.jobType }));

	const res = await fetch('/api/characters');
	if (!res.ok) {
		return { characters: [] as Character[], classes, error: `GET /api/characters → ${res.status}` };
	}

	const body = (await res.json()) as { characters?: Character[] };
	return { characters: body.characters ?? [], classes, error: null as string | null };
};
