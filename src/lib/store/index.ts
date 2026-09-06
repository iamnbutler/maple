// JSON-file persistence for runtime character data.
//
// Reads and writes land in the repo-root `data/` directory. Server-only: this
// module must never be imported from a `.svelte` component.

import { resolve } from 'node:path';

/** Absolute path to the on-disk JSON store. */
export const DATA_DIR = resolve('data');
