// Reference: every equipment slot, its upgrade-table category, and whether it
// can carry star force.

import { json } from '@sveltejs/kit';

import { CATEGORY_BY_SLOT, ITEM_CATEGORIES, SLOTS, STAR_FORCEABLE_CATEGORIES } from '$lib/schema';

import type { RequestHandler } from './$types';

export const GET: RequestHandler = () =>
	json({
		slots: SLOTS.map((slot) => ({
			id: slot,
			category: CATEGORY_BY_SLOT[slot],
			starForceable: STAR_FORCEABLE_CATEGORIES.includes(CATEGORY_BY_SLOT[slot])
		})),
		categories: ITEM_CATEGORIES
	});
