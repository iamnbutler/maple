import { z } from 'zod';

/**
 * Shape of a tracked character. Fields are added as the tracker grows; the
 * schema is intentionally empty (but permissive-free) for now.
 */
export const CharacterSchema = z.object({});

export type Character = z.infer<typeof CharacterSchema>;
