// Item icons.
//
// The real in-game sprites live at maplestory.io:
//   https://maplestory.io/api/GMS/270/item/{id}/icon  → a 40×40 RGBA PNG.
//
// Item ids are not part of `ItemSchema`, so this module never assumes one is
// available. It resolves an icon in three steps and gives up quietly:
//
//   1. an explicit `iconUrl` (or `icon`) carried on the item payload;
//   2. an item id on the payload (`itemId` / `id`), turned into a maplestory.io URL;
//   3. a lookup in the item catalogue at `src/lib/data/items/`, if that module
//      has landed — it is pulled in through `import.meta.glob`, which compiles
//      to an empty record when the directory does not exist, so the app builds
//      either way.
//
// Callers must still handle a broken image: an id can be right and the sprite
// still 404. See `ItemIcon.svelte`.

/** maplestory.io icon endpoint. GMS, version 270. */
export const ICON_REGION = 'GMS';
export const ICON_VERSION = '270';

/** The icon URL for a numeric maplestory.io item id. */
export function iconUrlForItemId(id: number | string): string {
	return `https://maplestory.io/api/${ICON_REGION}/${ICON_VERSION}/item/${id}/icon`;
}

/* -------------------------------------------------------------------------- */
/* The optional catalogue                                                      */
/* -------------------------------------------------------------------------- */

// Eager glob so the lookup stays synchronous. Matches nothing (and yields `{}`)
// until the catalogue lands, which is what keeps the build green in the meantime.
// Only the barrel and an icons module are pulled in — never the whole directory,
// which would drag in specs and every raw table.
const CATALOGUE_MODULES = import.meta.glob(
	['../data/items/index.ts', '../data/items/icons.ts'],
	{ eager: true }
) as Record<string, Record<string, unknown>>;

const merged = Object.assign({}, ...Object.values(CATALOGUE_MODULES)) as Record<string, unknown>;
const catalogue: Record<string, unknown> | null =
	Object.keys(merged).length > 0 ? merged : null;

/** Export names we will try, in order, when asking the catalogue for an icon. */
const ICON_FNS = ['iconUrlForItem', 'itemIconUrl', 'iconUrlFor', 'getIconUrl', 'iconUrl'];
/** Export names that look up a catalogue entry by item name. */
const FIND_FNS = ['findItem', 'getItem', 'lookupItem', 'itemByName', 'findByName'];
/** Export names that are a plain name → entry (or name → url) map. */
const MAPS = ['ITEMS_BY_NAME', 'ITEM_ICONS', 'ICONS_BY_NAME', 'ITEM_CATALOGUE', 'ITEMS'];

function callFn(name: string, arg: unknown): unknown {
	const fn = catalogue?.[name];
	if (typeof fn !== 'function') return undefined;
	try {
		return (fn as (a: unknown) => unknown)(arg);
	} catch {
		return undefined;
	}
}

function mapGet(container: unknown, key: string): unknown {
	if (!container) return undefined;
	if (container instanceof Map) {
		return container.get(key) ?? container.get(key.toLowerCase());
	}
	if (typeof container === 'object') {
		const rec = container as Record<string, unknown>;
		return rec[key] ?? rec[key.toLowerCase()];
	}
	return undefined;
}

/** Pull a usable URL out of whatever a catalogue handed back. */
function urlFrom(value: unknown): string | null {
	if (typeof value === 'string') {
		return value.startsWith('http') || value.startsWith('/') ? value : null;
	}
	if (typeof value === 'number') return iconUrlForItemId(value);
	if (value && typeof value === 'object') {
		const rec = value as Record<string, unknown>;
		const direct = rec.iconUrl ?? rec.icon ?? rec.url;
		if (typeof direct === 'string' && direct.length > 0) return direct;
		const id = rec.itemId ?? rec.id;
		if (typeof id === 'number' || (typeof id === 'string' && /^\d+$/.test(id))) {
			return iconUrlForItemId(id);
		}
	}
	return null;
}

function fromCatalogue(item: Record<string, unknown>, name: string): string | null {
	if (!catalogue) return null;
	for (const fn of ICON_FNS) {
		const hit = urlFrom(callFn(fn, item)) ?? urlFrom(callFn(fn, name));
		if (hit) return hit;
	}
	for (const fn of FIND_FNS) {
		const hit = urlFrom(callFn(fn, name));
		if (hit) return hit;
	}
	for (const key of MAPS) {
		const hit = urlFrom(mapGet(catalogue[key], name));
		if (hit) return hit;
	}
	return null;
}

/* -------------------------------------------------------------------------- */

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

	const name = typeof rec.name === 'string' ? rec.name : '';
	if (!name) return null;
	return fromCatalogue(rec, name);
}

/** True when the item catalogue module is present in this build. */
export const HAS_ITEM_CATALOGUE = catalogue !== null;
