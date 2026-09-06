// JSON-file persistence for runtime character data.
//
// Reads and writes land in the repo-root `data/` directory, or in
// `$MAPLE_DATA_DIR` when that is set (tests point it at a temp dir).
// Server-only: this module must never be imported from a `.svelte` component.

import { join, resolve } from 'node:path';

/**
 * Absolute path to the on-disk JSON store, resolved on every call so tests can
 * repoint `MAPLE_DATA_DIR` after import.
 */
export function dataDir(): string {
	const configured = process.env.MAPLE_DATA_DIR;
	return resolve(configured && configured.length > 0 ? configured : 'data');
}

/** Absolute path to the on-disk JSON store, resolved at import time. */
export const DATA_DIR = dataDir();

/** `<data>/characters` — one `<id>.json` plus one `<id>/history/` per character. */
export function charactersDir(): string {
	return join(dataDir(), 'characters');
}

export { NotFoundError, ValidationError, type ValidationIssue } from './errors';
export { applyMergePatch, type Json } from './merge-patch';
export * as characters from './characters';
export * as history from './history';
export { type Snapshot } from './history';
