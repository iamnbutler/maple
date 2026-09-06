import { mkdtemp, readdir, readFile, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';

import * as characters from './characters';
import { NotFoundError, ValidationError } from './errors';
import * as history from './history';
import { characterFile, charactersDir, dataDir, historyDir } from './paths';

let root: string;

const base = {
	id: 'nate-shadower',
	name: 'NateTheGreat',
	world: 'Kronos',
	classId: 'shadower',
	level: 287
};

beforeAll(async () => {
	root = await mkdtemp(join(tmpdir(), 'maple-store-'));
	process.env.MAPLE_DATA_DIR = root;
});

afterAll(async () => {
	delete process.env.MAPLE_DATA_DIR;
	await rm(root, { recursive: true, force: true });
});

beforeEach(async () => {
	await rm(charactersDir(), { recursive: true, force: true });
});

describe('data directory resolution', () => {
	it('honours MAPLE_DATA_DIR', () => {
		expect(dataDir()).toBe(root);
	});
});

describe('put / get', () => {
	it('writes a document, stamps timestamps and reads it back', async () => {
		const saved = await characters.put(base.id, base);

		expect(saved.createdAt).toMatch(/Z$/);
		expect(saved.updatedAt).toBe(saved.createdAt);
		expect(saved.equipment).toEqual({});
		expect(await characters.get(base.id)).toEqual(saved);
	});

	it('lands on disk as pretty JSON at data/characters/<id>.json', async () => {
		await characters.put(base.id, base);
		const raw = await readFile(characterFile(base.id), 'utf8');

		expect(raw.startsWith('{\n\t')).toBe(true);
		expect(JSON.parse(raw).id).toBe(base.id);
	});

	it('preserves createdAt and bumps updatedAt on rewrite', async () => {
		const first = await characters.put(base.id, base);
		const second = await characters.put(base.id, { ...base, level: 288 });

		expect(second.createdAt).toBe(first.createdAt);
		expect(second.updatedAt >= first.updatedAt).toBe(true);
		expect(second.level).toBe(288);
	});

	it('rejects an id that does not match the slug pattern', async () => {
		await expect(characters.put('Nate', base)).rejects.toBeInstanceOf(ValidationError);
	});

	it('rejects a body whose id disagrees with the path', async () => {
		await expect(characters.put('other-id', base)).rejects.toBeInstanceOf(ValidationError);
	});

	it('rejects an unknown key with issue paths', async () => {
		const error = await characters.put(base.id, { ...base, lvl: 287 }).catch((e) => e);
		expect(error).toBeInstanceOf(ValidationError);
		expect((error as ValidationError).issues.length).toBeGreaterThan(0);
	});

	it('throws NotFoundError for a missing character', async () => {
		await expect(characters.get('ghost')).rejects.toBeInstanceOf(NotFoundError);
		expect(await characters.getOrNull('ghost')).toBeNull();
	});

	it('leaves no temp files behind', async () => {
		await characters.put(base.id, base);
		const entries = await readdir(charactersDir());
		expect(entries.filter((name) => name.endsWith('.tmp'))).toEqual([]);
	});
});

describe('snapshots', () => {
	it('appends one snapshot per write', async () => {
		await characters.put(base.id, base);
		await characters.put(base.id, { ...base, level: 288 });

		const snapshots = await history.list(base.id);
		expect(snapshots).toHaveLength(2);

		const files = await readdir(historyDir(base.id));
		expect(files.every((name) => name.endsWith('.json'))).toBe(true);
	});

	it('stores { at, character } and leaves summary for later', async () => {
		const saved = await characters.put(base.id, base);
		const [ref] = await history.list(base.id);
		const snapshot = await history.get(base.id, ref.ts);

		expect(snapshot.at).toBe(ref.ts);
		expect(snapshot.character).toEqual(saved);
		expect(snapshot.summary).toBeUndefined();
	});

	it('never overwrites a snapshot taken in the same millisecond', async () => {
		await Promise.all([
			characters.put(base.id, base),
			characters.put(base.id, { ...base, level: 288 }),
			characters.put(base.id, { ...base, level: 289 })
		]);
		expect(await history.list(base.id)).toHaveLength(3);
	});

	it('404s for an unknown character or snapshot', async () => {
		await expect(history.list('ghost')).rejects.toBeInstanceOf(NotFoundError);
		await characters.put(base.id, base);
		await expect(history.get(base.id, '2020-01-01T00:00:00.000Z')).rejects.toBeInstanceOf(
			NotFoundError
		);
	});

	it('rejects a snapshot id that is not an ISO timestamp', async () => {
		await characters.put(base.id, base);
		await expect(history.get(base.id, '../../../etc/passwd')).rejects.toBeInstanceOf(
			ValidationError
		);
	});
});

describe('patch', () => {
	it('merges, deletes with null and bumps updatedAt', async () => {
		await characters.put(base.id, {
			...base,
			equipment: {
				hat: { name: 'Hat', slot: 'hat', category: 'armor' },
				cape: { name: 'Cape', slot: 'cape', category: 'armor' }
			},
			notes: 'delete me'
		});

		const patched = await characters.patch(base.id, {
			level: 288,
			notes: null,
			equipment: { hat: { starforce: 22 }, cape: null }
		});

		expect(patched.level).toBe(288);
		expect(patched.notes).toBeUndefined();
		expect(patched.equipment.cape).toBeUndefined();
		expect(patched.equipment.hat?.starforce).toBe(22);
		expect(patched.equipment.hat?.name).toBe('Hat');
	});

	it('refuses to change the id', async () => {
		await characters.put(base.id, base);
		await expect(characters.patch(base.id, { id: 'someone-else' })).rejects.toBeInstanceOf(
			ValidationError
		);
	});

	it('404s on a missing character', async () => {
		await expect(characters.patch('ghost', { level: 2 })).rejects.toBeInstanceOf(NotFoundError);
	});
});

describe('list / remove', () => {
	it('lists every stored character by id', async () => {
		await characters.put('b-char', { ...base, id: 'b-char' });
		await characters.put('a-char', { ...base, id: 'a-char' });

		expect((await characters.list()).map((c) => c.id)).toEqual(['a-char', 'b-char']);
	});

	it('returns an empty list when nothing has been stored', async () => {
		expect(await characters.list()).toEqual([]);
	});

	it('removes the document and its history', async () => {
		await characters.put(base.id, base);
		await characters.remove(base.id);

		expect(await characters.getOrNull(base.id)).toBeNull();
		await expect(characters.remove(base.id)).rejects.toBeInstanceOf(NotFoundError);
	});
});
