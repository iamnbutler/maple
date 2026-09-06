// Static reference data re-exports live here.
//
// Every table in this directory is transcribed from `docs/research/formulas.md`
// (and `docs/research/bosses.md` for the boss tables) and carries an inline
// citation: research section plus the original source URL. Values that no public
// source documents are exported behind an `UNVERIFIED_*` name and require an
// explicit opt-in to use. See README.md for the module → source table.
//
// WORLD SCOPE: Heroic (Reboot) only.

// Namespaced access, e.g. `data.starforce.maxStars(...)`.
export * as gearProgression from './gear-progression';
export * as starforce from './starforce';
export * as flames from './flames';
export * as potential from './potential';
export * as symbols from './symbols';
export * as hyperstats from './hyperstats';
export * as classes from './classes';
export * as weaponConstants from './weapon-constants';
export * as bosses from './bosses';
// GMS v270 item catalogue + upgrade-capability rules (`data.items.capabilities(item)`).
export * as items from './items';
export * as potentialLines from './potential-lines';
export * as classSkills from './class-skills';
// Progression systems whose output the stat window already contains; these exist
// to generate upgrade CANDIDATES and to attribute the residual, never to be
// summed into a CalcInput. See docs/plans/2026-09-06-progression-systems.md §1.
export * as legion from './legion';
export * as links from './links';

// Flat re-exports of the gear-system tables.
export * from './starforce';
export * from './flames';
export * from './potential';
export * from './symbols';
export * from './hyperstats';
