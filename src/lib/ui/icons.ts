// Item icons.
//
// The real in-game sprites live at maplestory.io:
//   https://maplestory.io/api/GMS/270/item/{id}/icon  → a 40×40 RGBA PNG.
//
// Item ids are not part of `ItemSchema` — a capture only ever gives us a name —
// so an icon is resolved in three steps:
//
//   1. an explicit `iconUrl` (or `icon`) carried on the item payload;
//   2. an item id on the payload (`itemId` / `id`);
//   3. a name lookup in the item catalogue — but that happens on the SERVER, in
//      `icons.server.ts`, which stamps an `iconUrl` onto each item so step 1
//      succeeds here. The catalogue is 1.15 MB of JSON and has no business in a
//      browser bundle, so this module must never import it.
//
// Callers must still handle a broken image — an id can be right and the sprite
// still 404. See `ItemIcon.svelte`.

/** maplestory.io icon endpoint. GMS, version 270. */
export const ICON_REGION = 'GMS';
export const ICON_VERSION = '270';

/** The icon URL for a numeric maplestory.io item id. */
export function iconUrlForItemId(id: number | string): string {
	return `https://maplestory.io/api/${ICON_REGION}/${ICON_VERSION}/item/${id}/icon`;
}

/**
 * The icon URL for an equipped item, or `null` when we have nothing to show.
 *
 * `item` is deliberately typed loosely: `ItemSchema` is a strict object with no
 * icon field, so any `iconUrl` arrives as an extra key on the payload.
 */
export function resolveIconUrl(item: unknown): string | null {
	if (!item || typeof item !== 'object') return null;
	const rec = item as Record<string, unknown>;

	const explicit = rec.iconUrl ?? rec.icon;
	if (typeof explicit === 'string' && explicit.length > 0) return explicit;

	const id = rec.itemId ?? rec.id;
	if (typeof id === 'number' || (typeof id === 'string' && /^\d+$/.test(id))) {
		return iconUrlForItemId(id);
	}

	// No name lookup here — see the header. An item that reaches the client
	// without an `iconUrl` was not resolvable server-side, and falls back to text.
	return null;
}
