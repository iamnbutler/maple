# Maple — design (stage 1 + stretch)

Date: 2026-09-06. Status: decided by Claude under the user's standing instruction ("You make all
the decisions"). Open questions that genuinely need the user are parked in §11; everything else is
settled and being built against.

## 1. What this is

A personal (1–5 users) MapleStory GMS gear/progression tracker with:

1. a JSON character document that an **external agent** maintains through a REST API
   (there is no GMS character API; screenshots read by an agent are the only import path);
2. a **calc engine** with sourced formulas: boss damage index, displayed range, Combat Power,
   IED composition, force/level multipliers;
3. a ranked **"what to work on next"** list where every candidate upgrade is expressed as an
   **absolute % boss-damage gain** (and gain per meso/day where a cost is known);
4. a SvelteKit UI that visualises the character, the ranking, and history;
5. stretch: a **boss board** rating each boss/difficulty on three axes: solo, party, carried.

Research backing every decision lives in `docs/research/` (`formulas.md`, `existing-tools.md`,
`bosses.md`, `kms-tools.md`). Do not re-derive game math from memory; cite those files.

## 2. Decisions that shape everything

| Decision | Choice | Why |
|---|---|---|
| Source of truth for totals | **Stat window numbers** (Character Info UI + hover tooltips), not bottom-up from gear | Class passives/buffs contribute FD/IED/BD/CD ranges that cannot be reconstructed from equipment (formulas.md §4.0). Everything unknowable cancels in a ratio. |
| Role of the gear model | Provides **deltas** for candidate upgrades, tracking/history, and a consistency check against the stat window | Star force / flame / potential tables tell us exactly what changes when a slot is upgraded. |
| Gain metric | `gain = D(after)/D(before) − 1` where `D` is the boss damage index at a chosen target (PDR, level, force) | formulas.md §3.1. Closed-form "1% IED = N stat" tables are wrong away from the current state. |
| Combat Power | Computed and shown as a **checksum** next to the displayed value, never used to rank | CP omits IED, crit rate, level, force (formulas.md §2.6). |
| Persistence | JSON files under `data/` with append-only snapshots | Tiny user count; agent-friendly; diffable. No DB. |
| LLM in the app | **None.** The app publishes a schema + an extraction guide; the external agent does the parsing | Matches "driven from external agent"; keeps the app dependency-free. Revisit if Nate wants an in-app key. |
| Stack | SvelteKit 2 / Svelte 5 runes / TS / zod 4 / vitest / adapter-node, plain scoped CSS | Already scaffolded. |
| Region assumptions | GMS 2026 **Heroic only**: 30★ star force, potential level breakpoint 151, Heroic cube prices 12M/22M, Heroic crystal values | `formulas.md` §4A. Regular servers are out of scope — no server-type field exists. |

## 3. Domain model (zod schemas in `src/lib/schema/`)

All numbers are numbers (not strings). Percent fields are whole percents (`40` = 40%).
Unknown/absent values are omitted, never `0`, so the calc can tell "not captured" from "zero".

```ts
Character {
  id: string            // slug, e.g. "nate-shadower"
  name: string          // IGN
  world: string         // e.g. "Kronos"
  classId: string       // from src/lib/data/classes.ts (e.g. "shadower")
  level: number
  statWindow?: StatWindow
  equipment: Partial<Record<Slot, Item>>
  symbols?: { arcane?: Record<ArcaneRegion, number>, sacred?: Record<SacredRegion, number>, grandis?: Record<string, number> }
  hyperStats?: Partial<Record<HyperStatKey, number>>   // level 0-15
  legion?: { level?: number, notes?: string }
  innerAbility?: string[]                             // raw lines
  links?: string[]                                    // raw names (optional, informational)
  notes?: string
  createdAt: string; updatedAt: string                 // ISO
}

StatTriple { base: number; percent: number; flat: number }
// total = floor(base * (1 + percent/100)) + flat   — the GMS hover-tooltip split
// base = "% applied" flat (AP + gear + flames + scrolls + stars), flat = "% not applied" (hyper, symbols, legion, IA)

StatWindow {
  capturedAt: string
  str, dex, int, luk: StatTriple            // all four, always
  hp?: StatTriple                            // Demon Avenger
  attack: StatTriple; magicAttack: StatTriple
  damagePercent, bossDamagePercent, finalDamagePercent, ignoreDefensePercent: number
  normalEnemyDamagePercent?, criticalRatePercent, criticalDamagePercent: number
  arcaneForce?, sacredForce?: number
  iedSources?: number[]                      // optional: individually known IED sources outside gear (skills etc.)
  displayed?: { rangeMax?: number; rangeMin?: number; combatPower?: number }   // for checksums only
}

Slot = "weapon"|"secondary"|"emblem"|"hat"|"top"|"bottom"|"overall"|"shoes"|"gloves"|"cape"|"shoulder"
     |"belt"|"pendant1"|"pendant2"|"ring1"|"ring2"|"ring3"|"ring4"|"earrings"|"face"|"eye"|"pocket"
     |"badge"|"medal"|"heart"|"android"|"totem1"|"totem2"|"totem3"

Item {
  name: string
  slot: Slot
  category: "weapon"|"secondary"|"emblem"|"armor"|"accessory"|"heart"|"badge"|"pocket"|"medal"|"android"|"totem"
  itemLevel?: number          // base level (needed for SF/flame/potential tables); inferred from catalogue when absent
  setName?: string
  starforce?: number          // ALWAYS user-confirmed; agent must not read from sprites
  superior?: boolean          // Tyrant
  total?: StatBlock           // big leading numbers in the tooltip
  base?, flame?, scroll?, star?: StatBlock   // parenthesised breakdown when readable (GMS classic merges scroll+star; put merged value in `scroll` and leave `star` absent)
  potential?: { grade: Grade; lines: [string, string, string] }        // raw tooltip strings; parsed server-side
  bonusPotential?: { grade: Grade; lines: [string, string, string] }
  soul?: { name?: string; option?: string }
  exceptional?: StatBlock
  scrollUpgrades?: number; remainingUpgrades?: number; hammers?: number
  source?: { kind: "screenshot"|"manual"|"api"; note?: string; at: string }
  notes?: string
}
Grade = "rare"|"epic"|"unique"|"legendary"
StatBlock { str?, dex?, int?, luk?, maxHp?, maxMp?, att?, matt?, def?, speed?, jump?,
            allStatPct?, bossDmgPct?, iedPct?, dmgPct?, maxHpPct?, maxMpPct? }   // all optional numbers
```

Potential lines are stored raw and parsed by `src/lib/calc/potential-parse.ts` into
`{ kind, stat?, value, raw }` with kinds: `stat_pct | stat_flat | all_stat_pct | att | att_pct |
matt | matt_pct | boss | ied | dmg | crit_rate | crit_dmg | hp_pct | cooldown | drop | meso | other`.
Parsing is deterministic and tested; unknown lines become `other` (never dropped).

Snapshots: every write to a character appends `data/characters/<id>/history/<ISO>.json`
holding the full document plus the computed summary at that time (damage index at 300/380, CP,
level). History is read-only.

## 4. Calc engine (`src/lib/calc/`) — pure TS, no SvelteKit imports, fully unit-tested

Input type `CalcInput` is independent of the document schema; `adapter.ts` builds it from a
`Character`. That lets calc and schema evolve separately.

Modules:

- `stats.ts` — `applyTriple` with the game's floor; primary/secondary mapping per class
  (incl. Xenon 3-way, Demon Avenger HP formula, Shadower/DB/Cadena dual secondary);
  `statMultiplier(input)`.
- `ied.ts` — `compose(sources[])`, `add(total, x)`, `remove(total, x)`, `marginal(total, x)`,
  `defenseMultiplier(pdr, ied)`.
- `force.ts` — Arcane ratio step table, Sacred linear rule (−1%/pt short, +1% per 2 over, cap +25%),
  level-difference table. (formulas.md §1.11–1.12; bosses.md §4.)
- `damage.ts` — `damageIndex(input, target)` = statMult × floor(att×(1+att%)) × (1+dmg+boss)
  × (1+fd) × critEV × defMult × levelMult × forceMult. Weapon constant, mastery, elemental,
  skill% are omitted (they cancel) unless `absolute: true` is requested, in which case they are
  included to reproduce a displayed range. `displayedRange(input)` reproduces the stat window
  upper/lower range exactly (formulas.md §1.13).
- `combat-power.ts` — verified formula (formulas.md §2.3; python-fiddle example must reproduce
  236,118). Bow normalisation needs weapon base ATT + star ATT; if not available, compute the
  un-normalised value and label it `approx`.
- `gain.ts` — `Delta` type and `applyDelta(input, delta)`, `measureGain(input, delta, target)`
  → `{ before, after, gainPct }`. IED deltas are composed, never added. Batches of deltas are
  evaluated jointly.
- `gear.ts` — sums equipment `total` blocks and parsed potentials into flat/% contributions,
  produces the **residual** vs the stat window (what the class/legion/etc. contribute), and
  emits validation warnings (`total ≠ base+flame+scroll+star`, missing itemLevel, etc.).
- `candidates.ts` — generates upgrade candidates per slot/system (see §5).
- `rank.ts` — scores candidates with `measureGain`, attaches cost, sorts.
- `analysis.ts` — the one function the API calls: `analyze(character, options) → Analysis`.

Targets (`Target { pdr: number; level: number; arcaneReq?: number; sacredReq?: number; id?: string }`)
default to two presets: `arcane` (300%, lv 255) and `grandis` (380%, lv 285), plus any boss from
the boss table.

## 5. Candidate upgrades (stage 1 scope)

Each candidate = `{ id, kind, label, slot?, delta, cost?: { mesos?: number; days?: number; note } , confidence }`.

| kind | Generated from | Delta source | Cost |
|---|---|---|---|
| `starforce` | current stars → +1, and → next breakpoint (17, 18, 19, 20, 21, 22, 23, 25, 30) | SF stat/att per star by item level (`formulas.md` §4A); 30★ system | expected meso via `masonym` cost formula + GMS v269 rates, Enhancement Mode 1, safeguard 15–17 |
| `flame` | current flame block → a target tier per stat (e.g. T5/T6/T7 main, att) | flame formulas by item level | flames in days/mesos: unknown → `confidence: low`, cost omitted |
| `potential` | current grade/lines → next grade, or "3 useful lines" at same grade | potential line tables by category & level bracket | Heroic cube price × expected cubes (rough; `low` confidence) |
| `bonusPotential` | same | bonus pot tables | same |
| `symbol` | each arcane/sacred region level → +1 (and max) | symbol stat tables | days at the daily quest rate |
| `hyperStat` | reallocation suggestions: +1 level in each damage hyper | hyper tables | hyper points |
| `stat-line` (diagnostic) | +1 ATT, +1% boss, +1% FD, +1% crit dmg, +10 main, +1 IED line 30/35/40 | direct | none — "worth" table |

Ranking output: `gainPct`, `gainPerBillionMeso` (when mesos known), `gainPerDay` (when days known),
grouped by slot with the best-of-slot highlighted.

## 6. Storage (`src/lib/store/`)

- `characters.ts`: `list()`, `get(id)`, `put(id, doc)` (validate → atomic write via temp+rename
  → append snapshot), `patch(id, mergePatch)` (RFC 7396), `remove(id)`.
- `history.ts`: `list(id)`, `get(id, ts)`.
- Files: `data/characters/<id>.json`, `data/characters/<id>/history/<ts>.json`. `data/` is gitignored.

## 7. API (`src/routes/api/`) — JSON, no auth (optional `MAPLE_TOKEN` env → bearer check)

| Method & path | Purpose |
|---|---|
| `GET /api/docs` | Markdown guide for agents: schema, workflow, screenshot extraction instructions, validation identities |
| `GET /api/schema` | JSON Schema (zod `toJSONSchema`) for Character/Item/StatWindow |
| `GET /api/ref/classes` · `/api/ref/bosses` · `/api/ref/slots` · `/api/ref/potential-lines` | Reference data |
| `GET /api/characters` · `POST /api/characters` | List / create (`{ id?, name, classId, level, world }`) |
| `GET /api/characters/:id` · `PUT` · `PATCH` · `DELETE` | Full doc; replace; merge-patch; delete |
| `PUT /api/characters/:id/equipment/:slot` · `DELETE` | Upsert / remove one item (returns validation warnings) |
| `PUT /api/characters/:id/stat-window` | Replace stat window |
| `GET /api/characters/:id/analysis?target=grandis|arcane|<bossId>` | Full analysis (stats, indexes, checksums, residual, ranked upgrades, boss board when available) |
| `POST /api/analyze` | Stateless: `{ character, target? }` → analysis |
| `POST /api/characters/:id/what-if` | `{ deltas: Delta[] , target? }` → joint gain |
| `GET /api/characters/:id/history` · `/history/:ts` | Snapshots |

Every write response includes `warnings: string[]`. Errors are `{ error, issues? }` with 400/404.

## 8. UI (SvelteKit routes, plain CSS, dark theme)

- `/` — character list, create form, link to `/api/docs`.
- `/c/[id]` — header (IGN, class, level, damage index @ target, CP computed vs displayed, range computed vs displayed);
  equipment grid in the in-game layout (click → item panel with tooltip-style breakdown, star force selector, raw JSON editor);
  stat panel; **Next upgrades** table (gain %, cost, per-cost, confidence, grouped by slot);
  calibration panel (residuals, warnings); boss board (stretch).
- `/c/[id]/history` — SVG line chart of damage index and CP over snapshots.

## 9. Boss board (stretch; designed now, built after stage 1)

Data (`src/lib/data/bosses.json`, from `bosses.md` §1.2/§3/§4): per boss+difficulty: level, entry
level, HP (GMS, corrected), PDR, force type/req, time limit, party max, reset, crystal value,
CMS CP gates (solo total + per-party-size floor).

Axes:
- **Carried**: entry level OK; force penalty not crippling (Arcane ≥ 70% ratio, Sacred ≥ −20);
  can deal 5% of total HP within the time limit at an estimated DPM; CP ≥ per-member floor (advisory).
- **Party (2–3 / 6)**: your share of HP (`HP / n`) clearable in the time limit at estimated DPM ×
  an uptime factor; CP floor for that party size.
- **Solo**: full HP within the time limit; comfortable / possible / minimum cut bands (×2.0 / ×1.1 /
  ×0.9 of required, mirroring MapleScouter's ladder).

DPM estimate = `classDpmAnchor × D(you, boss) / D(anchor frame, boss)`. The anchor frame is the
KMS "8.8 challenge" standard (bosses.md §5.6); class anchors are the open calibration item.
Until anchors exist the board shows the deterministic parts (gates, force, 5% HP number, CP
floors) and labels DPM-based verdicts as `uncalibrated`.

## 10. Testing

- vitest for every calc module; fixtures: CP = 236,118 example (formulas.md §2.3); IED worked
  example (+14.8% / +5.3%); force tables; level table; SF table spot checks against the wiki
  cumulative tables; potential parser cases; range reproduction against a synthetic character.
- API tests with a temp `data/` dir.
- `npm run check`, `npm test`, `npm run build` must pass before any wave is declared done.

## 11. Answered by Nate (2026-09-06)

1. **Server: Heroic only.** Regular servers are treated as nonexistent — no `serverType` field, Heroic
   cube/flame prices and crystal values throughout.
2. **Classes: Ren (priority), Hero, Wind Archer, Battle Mage, Night Walker.** The class table still
   covers everything, but these five are the ones that must be exactly right and explicitly tested.
   Hero needs its 1H/2H weapon-constant variants. Xenon and Demon Avenger keep their stat-multiplier
   branches (they're in the formula) but get no bespoke coverage.
3. **In-app LLM calls are allowed** ("do it if helpful — I have keys"). Still not needed for stage 1:
   the external agent owns screenshot parsing. Revisit for a convenience "paste a screenshot here"
   route once the API is proven.
4. **Boss board anchors on the KMS 8.8-challenge class DPM charts**, scaled by the damage index.
   Personal Battle Analysis numbers as an anchor source are a stretch goal, not stage 1.
5. **Local only.** `npm run dev` on this machine; no tunnel, no remote hosting. Auth stays optional
   (`MAPLE_TOKEN`) and off by default.

## 12. Remaining open questions

None blocking. Things I'll decide as they come up and flag if they turn out to matter:
- Whether the Ren weapon constant in the research is current (marked UNVERIFIED if the source is thin).
- Class DPM anchor values for the five priority classes — needs a pass over the 8.8-challenge charts.
