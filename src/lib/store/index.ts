// JSON-file persistence for runtime character data.
//
// Reads and writes land in the repo-root `data/` directory, or in
// `$MAPLE_DATA_DIR` when that is set (tests point it at a temp dir).
// Server-only: this module must never be imported from a `.svelte` component.

import { dataDir } from './paths';

/** Absolute path to the on-disk JSON store, resolved at import time. */
export const DATA_DIR = dataDir();

export { charactersDir, characterFile, dataDir, historyDir, historyFile } from './paths';
export { NotFoundError, ValidationError, type ValidationIssue } from './errors';
export { applyMergePatch, type Json } from './merge-patch';
export * as characters from './characters';
export * as history from './history';
export { type Snapshot } from './history';
