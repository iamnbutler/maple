// Character documents: `data/characters/<id>.json`.
//
// Every write validates, lands atomically (temp file + rename) and appends an
// immutable snapshot under `data/characters/<id>/history/<ISO>.json`.

import { mkdir, readdir, readFile, rename, rm, writeFile } from 'node:fs/promises';
import { randomUUID } from 'node:crypto';
import { dirname, join } from 'node:path';

import {
	CHARACTER_ID_PATTERN,
	CharacterInputSchema,
	CharacterSchema,
	type Character
} from '$lib/schema';
import { NotFoundError, ValidationError } from './errors';
import type { Snapshot } from './history';
import { applyMergePatch } from './merge-patch';
import { characterFile, charactersDir, historyDir, historyFile } from './paths';

/** Throw unless `id` is a usable slug. */
export function assertValidId(id: string): void {
	if (!CHARACTER_ID_PATTERN.test(id)) {
		throw new ValidationError(`Invalid character id "${id}"`, [
			{ path: 'id', message: 'must match ^[a-z0-9][a-z0-9-]{1,40}$' }
		]);
	}
}

function nowIso(): string {
	return new Date().toISOString();
}

async function writeJsonAtomic(file: string, value: unknown): Promise<void> {
	await mkdir(dirname(file), { recursive: true });
	const temp = join(dirname(file), `.${randomUUID()}.tmp`);
	try {
		await writeFile(temp, `${JSON.stringify(value, null, '\t')}\n`, 'utf8');
		await rename(temp, file);
	} catch (error) {
		await rm(temp, { force: true });
		throw error;
	}
}

async function readJson(file: string): Promise<unknown | undefined> {
	try {
		return JSON.parse(await readFile(file, 'utf8')) as unknown;
	} catch (error) {
		if ((error as NodeJS.ErrnoException).code === 'ENOENT') return undefined;
		throw error;
	}
}

/** Parse a stored or incoming document, turning zod failures into ValidationError. */
function parseCharacter(value: unknown): Character {
	const parsed = CharacterSchema.safeParse(value);
	if (!parsed.success) throw ValidationError.fromZod(parsed.error, 'Invalid character document');
	return parsed.data;
}

/** All characters, sorted by id. */
export async function list(): Promise<Character[]> {
	let entries: string[];
	try {
		entries = await readdir(charactersDir());
	} catch (error) {
		if ((error as NodeJS.ErrnoException).code === 'ENOENT') return [];
		throw error;
	}

	const ids = entries
		.filter((name) => name.endsWith('.json') && !name.startsWith('.'))
		.map((name) => name.slice(0, -'.json'.length))
		.filter((id) => CHARACTER_ID_PATTERN.test(id))
		.sort();

	const documents = await Promise.all(ids.map((id) => getOrNull(id)));
	return documents.filter((doc): doc is Character => doc !== null);
}

/** A character, or `null` when it does not exist. */
export async function getOrNull(id: string): Promise<Character | null> {
	assertValidId(id);
	const raw = await readJson(characterFile(id));
	if (raw === undefined) return null;
	return parseCharacter(raw);
}

/** A character. Throws {@link NotFoundError} when it does not exist. */
export async function get(id: string): Promise<Character> {
	const character = await getOrNull(id);
	if (!character) throw new NotFoundError(`No character "${id}"`);
	return character;
}

/** Whether a character document exists. */
export async function exists(id: string): Promise<boolean> {
	assertValidId(id);
	return (await readJson(characterFile(id))) !== undefined;
}

/**
 * Validate and write a full document, then append a history snapshot.
 *
 * `createdAt` is preserved from the existing document (or the payload, or now);
 * `updatedAt` is always set to the moment of the write.
 */
export async function put(id: string, input: unknown): Promise<Character> {
	assertValidId(id);

	const parsed = CharacterInputSchema.safeParse(input);
	if (!parsed.success) throw ValidationError.fromZod(parsed.error, 'Invalid character document');

	if (parsed.data.id !== id) {
		throw new ValidationError(`Body id "${parsed.data.id}" does not match path id "${id}"`, [
			{ path: 'id', message: `must be "${id}"` }
		]);
	}

	const existing = await getOrNull(id);
	const at = nowIso();
	const character = parseCharacter({
		...parsed.data,
		id,
		createdAt: existing?.createdAt ?? parsed.data.createdAt ?? at,
		updatedAt: at
	});

	await writeJsonAtomic(characterFile(id), character);
	await appendSnapshot(id, character, at);

	return character;
}

/** Apply an RFC 7396 merge patch to an existing document. */
export async function patch(id: string, mergePatch: unknown): Promise<Character> {
	const existing = await get(id);

	if (typeof mergePatch !== 'object' || mergePatch === null || Array.isArray(mergePatch)) {
		throw new ValidationError('A merge patch must be a JSON object');
	}

	const merged = applyMergePatch(existing, mergePatch) as Record<string, unknown>;
	if (merged.id !== undefined && merged.id !== id) {
		throw new ValidationError('A merge patch may not change the character id', [
			{ path: 'id', message: `must stay "${id}"` }
		]);
	}
	merged.id = id;

	return put(id, merged);
}

/** Delete a character and its history. Throws {@link NotFoundError} when absent. */
export async function remove(id: string): Promise<void> {
	assertValidId(id);
	if (!(await exists(id))) throw new NotFoundError(`No character "${id}"`);

	await rm(characterFile(id), { force: true });
	await rm(join(charactersDir(), id), { recursive: true, force: true });
}

/**
 * Append an immutable snapshot. Filenames are the ISO timestamp of the write;
 * on a collision (two writes inside the same millisecond) the timestamp is
 * nudged forward until it is free.
 */
async function appendSnapshot(id: string, character: Character, at: string): Promise<string> {
	await mkdir(historyDir(id), { recursive: true });

	let ts = at;
	for (let attempt = 0; attempt < 1000; attempt += 1) {
		const file = historyFile(id, ts);
		const snapshot: Snapshot = { at: ts, character };
		try {
			// `wx` fails if the snapshot already exists, keeping history append-only.
			await writeFile(file, `${JSON.stringify(snapshot, null, '\t')}\n`, {
				encoding: 'utf8',
				flag: 'wx'
			});
			return ts;
		} catch (error) {
			if ((error as NodeJS.ErrnoException).code !== 'EEXIST') throw error;
			ts = new Date(new Date(ts).getTime() + 1).toISOString();
		}
	}

	throw new Error(`Could not find a free snapshot slot for "${id}"`);
}
