// Read-only snapshots: `data/characters/<id>/history/<ISO>.json`.

import { readdir, readFile } from 'node:fs/promises';

import type { Character } from '$lib/schema';
import { exists } from './characters';
import { NotFoundError, ValidationError } from './errors';
import { historyDir, historyFile } from './paths';

/**
 * One point-in-time copy of a character document. `summary` is reserved for the
 * computed damage index / CP snapshot that lands with the calc engine.
 */
export interface Snapshot {
	at: string;
	character: Character;
	summary?: unknown;
}

/** Snapshot ids are the ISO timestamp of the write. */
export const SNAPSHOT_TS_PATTERN = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/;

export interface SnapshotRef {
	ts: string;
	at: string;
}

function assertValidTs(ts: string): void {
	if (!SNAPSHOT_TS_PATTERN.test(ts)) {
		throw new ValidationError(`Invalid snapshot timestamp "${ts}"`, [
			{ path: 'ts', message: 'must be an ISO-8601 UTC timestamp with milliseconds' }
		]);
	}
}

/** Snapshot references for a character, oldest first. */
export async function list(id: string): Promise<SnapshotRef[]> {
	if (!(await exists(id))) throw new NotFoundError(`No character "${id}"`);

	let entries: string[];
	try {
		entries = await readdir(historyDir(id));
	} catch (error) {
		if ((error as NodeJS.ErrnoException).code === 'ENOENT') return [];
		throw error;
	}

	return entries
		.filter((name) => name.endsWith('.json'))
		.map((name) => name.slice(0, -'.json'.length))
		.filter((ts) => SNAPSHOT_TS_PATTERN.test(ts))
		.sort()
		.map((ts) => ({ ts, at: ts }));
}

/** One snapshot. Throws {@link NotFoundError} when the character or snapshot is absent. */
export async function get(id: string, ts: string): Promise<Snapshot> {
	if (!(await exists(id))) throw new NotFoundError(`No character "${id}"`);
	assertValidTs(ts);

	try {
		return JSON.parse(await readFile(historyFile(id, ts), 'utf8')) as Snapshot;
	} catch (error) {
		if ((error as NodeJS.ErrnoException).code === 'ENOENT') {
			throw new NotFoundError(`No snapshot "${ts}" for character "${id}"`);
		}
		throw error;
	}
}
