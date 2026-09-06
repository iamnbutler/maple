// Server-side icon resolution.
//
// The item catalogue is 1.15 MB of JSON, so it stays on the server: this module
// resolves each equipped item's name to a maplestory.io sprite URL once, during
// `load`, and stamps it onto the item as `iconUrl`. The client's
// `resolveIconUrl` then finds it in step 1 and never needs the catalogue.
//
// Name matching is the catalogue's own `resolveByName`, which handles the
// approximations a tooltip capture produces ("AbsoLab Shoulder" for "AbsoLab
// Knight Shoulder"). The slot is always passed: it stops a fuzzy match from
// wandering into the wrong category, and disambiguates the many same-named
// items that differ only by class.

import { catalogueSlot, resolveByName } from '$lib/data/items';
import type { Character, Item } from '$lib/schema';

/** An item as it reaches the client: the stored item plus a resolved sprite. */
export type ItemWithIcon = Item & { iconUrl?: string };

/** The sprite URL for one item, or `undefined` when the catalogue has no match. */
export function iconUrlForItem(item: Pick<Item, 'name' | 'slot'>): string | undefined {
	if (!item?.name) return undefined;
	const { entries } = resolveByName(item.name, catalogueSlot(item.slot));
	// An approximate match still earns an icon: a nearly-right sprite reads far
	// better than a wall of text, and `gear.ts` surfaces the naming warning
	// separately, so a wrong sprite is never the only signal.
	return entries[0]?.iconUrl;
}

/**
 * A copy of the character with `iconUrl` stamped onto every equipped item.
 *
 * Returns a new object; the stored document is never mutated. Items the
 * catalogue cannot resolve are passed through untouched and render as text —
 * genuinely absent items (anything postdating GMS v270, such as Ren's Imugi
 * Gem) are expected here, so a miss must never be treated as an error.
 */
export function withIconUrls<T extends Character>(character: T): T {
	const equipment = character.equipment ?? {};
	const withIcons: Record<string, ItemWithIcon> = {};

	for (const [slot, item] of Object.entries(equipment)) {
		if (!item) continue;
		const iconUrl = iconUrlForItem(item);
		withIcons[slot] = iconUrl ? { ...item, iconUrl } : item;
	}

	return { ...character, equipment: withIcons } as T;
}
