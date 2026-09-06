// Where everything lives on disk. Resolved per call so tests can repoint
// `MAPLE_DATA_DIR` after the module has been imported.

import { join, resolve } from 'node:path';

/** Absolute path to the on-disk JSON store (`$MAPLE_DATA_DIR`, else repo-root `data/`). */
export function dataDir(): string {
	const configured = process.env.MAPLE_DATA_DIR;
	return resolve(configured && configured.length > 0 ? configured : 'data');
}

/** `<data>/characters` — one `<id>.json` plus one `<id>/history/` per character. */
export function charactersDir(): string {
	return join(dataDir(), 'characters');
}

/** `<data>/characters/<id>.json` */
export function characterFile(id: string): string {
	return join(charactersDir(), `${id}.json`);
}

/** `<data>/characters/<id>/history` */
export function historyDir(id: string): string {
	return join(charactersDir(), id, 'history');
}

/** `<data>/characters/<id>/history/<ISO>.json` */
export function historyFile(id: string, ts: string): string {
	return join(historyDir(id), `${ts}.json`);
}
