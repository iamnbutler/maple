import { mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';

import { charactersDir } from '$lib/store';

import { GET as getDocs } from './docs/+server';
import { GET as getSchema } from './schema/+server';
import { GET as getSlots } from './ref/slots/+server';
import { GET as getClasses } from './ref/classes/+server';
import { GET as listCharacters, POST as createCharacter } from './characters/+server';
import {
	DELETE as deleteCharacter,
	GET as getCharacter,
	PATCH as patchCharacter,
	PUT as putCharacter
} from './characters/[id]/+server';
import { DELETE as deleteItem, PUT as putItem } from './characters/[id]/equipment/[slot]/+server';
import { PUT as putStatWindow } from './characters/[id]/stat-window/+server';
import { GET as listHistory } from './characters/[id]/history/+server';
import { GET as getSnapshot } from './characters/[id]/history/[ts]/+server';

/* eslint-disable @typescript-eslint/no-explicit-any */
type Handler = (event: any) => Response | Promise<Response>;

interface CallInit {
	params?: Record<string, string>;
	body?: unknown;
	method?: string;
	path?: string;
}

async function call(
	handler: Handler,
	{ params = {}, body, method = 'GET', path = '/api' }: CallInit = {}
): Promise<{ status: number; json: any; text: string }> {
	const url = new URL(path, 'http://localhost:5173');
	const request = new Request(url, {
		method: body === undefined ? method : method === 'GET' ? 'POST' : method,
		...(body === undefined
			? {}
			: {
					headers: { 'content-type': 'application/json' },
					body: typeof body === 'string' ? body : JSON.stringify(body)
				})
	});

	const response = await handler({ params, request, url });
	const text = await response.text();
	let parsed: any = null;
	try {
		parsed = JSON.parse(text);
	} catch {
		parsed = null;
	}
	return { status: response.status, json: parsed, text };
}

const create = {
	name: 'NateTheGreat',
	classId: 'shadower',
	level: 287,
	world: 'Kronos'
};

const id = 'natethegreat';

let root: string;

beforeAll(async () => {
	root = await mkdtemp(join(tmpdir(), 'maple-api-'));
	process.env.MAPLE_DATA_DIR = root;
});

afterAll(async () => {
	delete process.env.MAPLE_DATA_DIR;
	await rm(root, { recursive: true, force: true });
});

beforeEach(async () => {
	await rm(charactersDir(), { recursive: true, force: true });
});

async function seed(): Promise<void> {
	const created = await call(createCharacter, { method: 'POST', body: create });
	expect(created.status).toBe(201);
}

describe('GET /api/docs', () => {
	it('serves the agent guide as markdown', async () => {
		const response = await getDocs({} as any);
		expect(response.headers.get('content-type')).toContain('text/markdown');
		expect(await response.text()).toContain('# Maple — agent guide');
	});
});

describe('GET /api/schema', () => {
	it('returns every JSON Schema', async () => {
		const { status, json } = await call(getSchema, { path: '/api/schema' });
		expect(status).toBe(200);
		expect(Object.keys(json)).toEqual(expect.arrayContaining(['Character', 'Item', 'StatWindow']));
	});

	it('returns one schema by name', async () => {
		const { json } = await call(getSchema, { path: '/api/schema?name=Item' });
		expect(json.properties.starforce).toBeDefined();
	});

	it('404s an unknown schema name', async () => {
		const { status, json } = await call(getSchema, { path: '/api/schema?name=Nope' });
		expect(status).toBe(404);
		expect(json.error).toContain('No schema');
	});
});

describe('GET /api/ref/*', () => {
	it('lists slots with category and starForceable', async () => {
		const { json } = await call(getSlots);
		expect(json.slots).toHaveLength(29);
		expect(json.slots[0]).toEqual({ id: 'weapon', category: 'weapon', starForceable: true });
		expect(json.slots.find((s: any) => s.id === 'badge').starForceable).toBe(false);
	});

	it('stubs classes as an empty list', async () => {
		const { status, json } = await call(getClasses);
		expect(status).toBe(200);
		expect(json).toEqual([]);
	});
});

describe('/api/characters', () => {
	it('creates a character with a slugged id', async () => {
		const { status, json } = await call(createCharacter, { method: 'POST', body: create });
		expect(status).toBe(201);
		expect(json.character.id).toBe(id);
		expect(json.warnings).toEqual([]);
	});

	it('409s a duplicate id', async () => {
		await seed();
		const { status, json } = await call(createCharacter, { method: 'POST', body: create });
		expect(status).toBe(409);
		expect(json.error).toContain('already exists');
	});

	it('400s an invalid payload with issue paths', async () => {
		const { status, json } = await call(createCharacter, {
			method: 'POST',
			body: { name: 'N', classId: 'shadower', world: 'Kronos' }
		});
		expect(status).toBe(400);
		expect(json.issues[0].path).toBe('level');
	});

	it('400s a malformed JSON body', async () => {
		const { status, json } = await call(createCharacter, { method: 'POST', body: '{oops' });
		expect(status).toBe(400);
		expect(json.error).toContain('Malformed JSON');
	});

	it('lists characters', async () => {
		await seed();
		const { json } = await call(listCharacters);
		expect(json.characters.map((c: any) => c.id)).toEqual([id]);
	});
});

describe('/api/characters/[id]', () => {
	it('reads a character', async () => {
		await seed();
		const { status, json } = await call(getCharacter, { params: { id } });
		expect(status).toBe(200);
		expect(json.name).toBe('NateTheGreat');
	});

	it('404s a missing character', async () => {
		const { status, json } = await call(getCharacter, { params: { id: 'ghost' } });
		expect(status).toBe(404);
		expect(json.error).toContain('No character');
	});

	it('replaces a document, defaulting the id from the path', async () => {
		await seed();
		const { status, json } = await call(putCharacter, {
			params: { id },
			method: 'PUT',
			body: { ...create, level: 288 }
		});
		expect(status).toBe(200);
		expect(json.character.level).toBe(288);
		expect(json.character.id).toBe(id);
	});

	it('merge-patches a document', async () => {
		await seed();
		const { json } = await call(patchCharacter, {
			params: { id },
			method: 'PATCH',
			body: { level: 289, notes: 'hi' }
		});
		expect(json.character.level).toBe(289);
		expect(json.character.notes).toBe('hi');
	});

	it('deletes a document', async () => {
		await seed();
		const { status, json } = await call(deleteCharacter, { params: { id }, method: 'DELETE' });
		expect(status).toBe(200);
		expect(json.deleted).toBe(id);

		const after = await call(getCharacter, { params: { id } });
		expect(after.status).toBe(404);
	});
});

describe('/api/characters/[id]/equipment/[slot]', () => {
	const hat = {
		name: 'Royal Von Leon Warrior Hat',
		itemLevel: 150,
		starforce: 22,
		total: { str: 265 },
		potential: { grade: 'legendary', lines: ['STR: +12%', 'STR: +9%', 'Boss Damage: +30%'] }
	};

	it('upserts an item, filling slot and category from the path', async () => {
		await seed();
		const { status, json } = await call(putItem, {
			params: { id, slot: 'hat' },
			method: 'PUT',
			body: hat
		});

		expect(status).toBe(200);
		expect(json.character.equipment.hat.slot).toBe('hat');
		expect(json.character.equipment.hat.category).toBe('armor');
		expect(json.warnings).toEqual([]);
	});

	it('returns warnings for a missing star count and item level', async () => {
		await seed();
		const { json } = await call(putItem, {
			params: { id, slot: 'weapon' },
			method: 'PUT',
			body: { name: 'Genesis Dagger' }
		});

		expect(json.warnings.some((w: string) => w.includes('starforce is missing'))).toBe(true);
		expect(json.warnings.some((w: string) => w.includes('itemLevel is missing'))).toBe(true);
	});

	it('warns when the breakdown does not add up', async () => {
		await seed();
		const { json } = await call(putItem, {
			params: { id, slot: 'hat' },
			method: 'PUT',
			body: { ...hat, base: { str: 100 }, flame: { str: 45 } }
		});

		expect(json.warnings.some((w: string) => w.includes('total.str is 265'))).toBe(true);
	});

	it('400s an unknown slot', async () => {
		await seed();
		const { status, json } = await call(putItem, {
			params: { id, slot: 'pendant9' },
			method: 'PUT',
			body: hat
		});
		expect(status).toBe(400);
		expect(json.error).toContain('Unknown slot');
	});

	it('400s when the body slot contradicts the path', async () => {
		await seed();
		const { status } = await call(putItem, {
			params: { id, slot: 'hat' },
			method: 'PUT',
			body: { ...hat, slot: 'cape' }
		});
		expect(status).toBe(400);
	});

	it('400s an unknown item key', async () => {
		await seed();
		const { status, json } = await call(putItem, {
			params: { id, slot: 'hat' },
			method: 'PUT',
			body: { ...hat, stars: 22 }
		});
		expect(status).toBe(400);
		expect(json.issues[0].message).toContain('stars');
	});

	it('removes an item and 404s when the slot is empty', async () => {
		await seed();
		await call(putItem, { params: { id, slot: 'hat' }, method: 'PUT', body: hat });

		const removed = await call(deleteItem, { params: { id, slot: 'hat' }, method: 'DELETE' });
		expect(removed.status).toBe(200);
		expect(removed.json.character.equipment.hat).toBeUndefined();

		const again = await call(deleteItem, { params: { id, slot: 'hat' }, method: 'DELETE' });
		expect(again.status).toBe(404);
	});
});

describe('PUT /api/characters/[id]/stat-window', () => {
	const statWindow = {
		str: { base: 12345, percent: 285, flat: 1830 },
		dex: { base: 1830 },
		int: { base: 4 },
		luk: { base: 4 },
		attack: { base: 1720, percent: 47 },
		bossDamagePercent: 315,
		displayed: { combatPower: 236118 }
	};

	it('replaces the stat window and stamps capturedAt', async () => {
		await seed();
		const { status, json } = await call(putStatWindow, {
			params: { id },
			method: 'PUT',
			body: statWindow
		});

		expect(status).toBe(200);
		expect(json.character.statWindow.bossDamagePercent).toBe(315);
		expect(json.character.statWindow.capturedAt).toMatch(/Z$/);
	});

	it('400s a stat window that is missing a stat triple', async () => {
		await seed();
		const { luk: _luk, ...missing } = statWindow;
		const { status, json } = await call(putStatWindow, {
			params: { id },
			method: 'PUT',
			body: missing
		});
		expect(status).toBe(400);
		expect(json.issues.map((i: any) => i.path)).toContain('luk');
	});
});

describe('/api/characters/[id]/history', () => {
	it('lists a snapshot per write and reads one back', async () => {
		await seed();
		await call(patchCharacter, { params: { id }, method: 'PATCH', body: { level: 288 } });

		const listed = await call(listHistory, { params: { id } });
		expect(listed.json.snapshots).toHaveLength(2);

		const ts = listed.json.snapshots[1].ts;
		const snapshot = await call(getSnapshot, { params: { id, ts } });
		expect(snapshot.status).toBe(200);
		expect(snapshot.json.character.level).toBe(288);
		expect(snapshot.json.at).toBe(ts);
	});

	it('404s an unknown snapshot', async () => {
		await seed();
		const { status } = await call(getSnapshot, {
			params: { id, ts: '2020-01-01T00:00:00.000Z' }
		});
		expect(status).toBe(404);
	});

	it('404s history for an unknown character', async () => {
		const { status } = await call(listHistory, { params: { id: 'ghost' } });
		expect(status).toBe(404);
	});
});
