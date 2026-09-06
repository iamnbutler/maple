// RFC 7396 JSON Merge Patch.
//
// https://www.rfc-editor.org/rfc/rfc7396 — `null` deletes a member, objects
// merge recursively, everything else (including arrays) replaces wholesale.

export type Json = null | boolean | number | string | Json[] | { [key: string]: Json };

function isMergeableObject(value: unknown): value is Record<string, unknown> {
	return typeof value === 'object' && value !== null && !Array.isArray(value);
}

/**
 * Apply a JSON Merge Patch to a target document, returning a new value. The
 * inputs are never mutated.
 */
export function applyMergePatch(target: unknown, patch: unknown): unknown {
	if (!isMergeableObject(patch)) return patch;

	const result: Record<string, unknown> = isMergeableObject(target) ? { ...target } : {};

	for (const key of Object.keys(patch)) {
		const value = patch[key];
		if (value === null) {
			delete result[key];
		} else {
			result[key] = applyMergePatch(result[key], value);
		}
	}

	return result;
}
