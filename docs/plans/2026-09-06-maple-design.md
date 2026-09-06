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

| Decision                   | Choice                                                                                                                      | Why                                                                                                                                                           |
| -------------------------- | --------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Source of truth for totals | **Stat window numbers** (Character Info UI + hover tooltips), not bottom-up from gear                                       | Class passives/buffs contribute FD/IED/BD/CD ranges that cannot be reconstructed from equipment (formulas.md §4.0). Everything unknowable cancels in a ratio. |
| Role of the gear model     | Provides **deltas** for candidate upgrades, tracking/history, and a consistency check against the stat window               | Star force / flame / potential tables tell us exactly what changes when a slot is upgraded.                                                                   |
| Gain metric                | `gain = D(after)/D(before) − 1` where `D` is the boss damage index at a chosen target (PDR, level, force)                   | formulas.md §3.1. Closed-form "1% IED = N stat" tables are wrong away from the current state.                                                                 |
| Combat Power               | Computed and shown as a **checksum** next to the displayed value, never used to rank                                        | CP omits IED, crit rate, level, force (formulas.md §2.6).                                                                                                     |
| Persistence                | JSON files under `data/` with append-only snapshots                                                                         | Tiny user count; agent-friendly; diffable. No DB.                                                                                                             |
| LLM in the app             | **None.** The app publishes a schema + an extraction guide; the external agent does the parsing                             | Matches "driven from external agent"; keeps the app dependency-free. Revisit if Nate wants an in-app key.                                                     |
| Stack                      | SvelteKit 2 / Svelte 5 runes / TS / zod 4 / vitest / adapter-node, plain scoped CSS                                         | Already scaffolded.                                                                                                                                           |
| Region assumptions         | GMS 2026 **Heroic only**: 30★ star force, potential level breakpoint 151, Heroic cube prices 12M/22M, Heroic crystal values | `formulas.md` §4A. Regular servers are out of scope — no server-type field exists.                                                                            |

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

| kind                     | Generated from                                                                 | Delta source                                                       | Cost                                                                                           |
| ------------------------ | ------------------------------------------------------------------------------ | ------------------------------------------------------------------ | ---------------------------------------------------------------------------------------------- |
| `starforce`              | current stars → +1, and → next breakpoint (17, 18, 19, 20, 21, 22, 23, 25, 30) | SF stat/att per star by item level (`formulas.md` §4A); 30★ system | expected meso via `masonym` cost formula + GMS v269 rates, Enhancement Mode 1, safeguard 15–17 |
| `flame`                  | current flame block → a target tier per stat (e.g. T5/T6/T7 main, att)         | flame formulas by item level                                       | flames in days/mesos: unknown → `confidence: low`, cost omitted                                |
| `potential`              | current grade/lines → next grade, or "3 useful lines" at same grade            | potential line tables by category & level bracket                  | Heroic cube price × expected cubes (rough; `low` confidence)                                   |
| `bonusPotential`         | same                                                                           | bonus pot tables                                                   | same                                                                                           |
| `symbol`                 | each arcane/sacred region level → +1 (and max)                                 | symbol stat tables                                                 | days at the daily quest rate                                                                   |
| `hyperStat`              | reallocation suggestions: +1 level in each damage hyper                        | hyper tables                                                       | hyper points                                                                                   |
| `stat-line` (diagnostic) | +1 ATT, +1% boss, +1% FD, +1% crit dmg, +10 main, +1 IED line 30/35/40         | direct                                                             | none — "worth" table                                                                           |

Ranking output: `gainPct`, `gainPerBillionMeso` (when mesos known), `gainPerDay` (when days known),
grouped by slot with the best-of-slot highlighted.

## 6. Storage (`src/lib/store/`)

- `characters.ts`: `list()`, `get(id)`, `put(id, doc)` (validate → atomic write via temp+rename
  → append snapshot), `patch(id, mergePatch)` (RFC 7396), `remove(id)`.
- `history.ts`: `list(id)`, `get(id, ts)`.
- Files: `data/characters/<id>.json`, `data/characters/<id>/history/<ts>.json`. `data/` is gitignored.

## 7. API (`src/routes/api/`) — JSON, no auth (optional `MAPLE_TOKEN` env → bearer check)

| Method & path                                                                              | Purpose                                                                                                |
| ------------------------------------------------------------------------------------------ | ------------------------------------------------------------------------------------------------------ |
| `GET /api/docs`                                                                            | Markdown guide for agents: schema, workflow, screenshot extraction instructions, validation identities |
| `GET /api/schema`                                                                          | JSON Schema (zod `toJSONSchema`) for Character/Item/StatWindow                                         |
| `GET /api/ref/classes` · `/api/ref/bosses` · `/api/ref/slots` · `/api/ref/potential-lines` | Reference data                                                                                         |
| `GET /api/characters` · `POST /api/characters`                                             | List / create (`{ id?, name, classId, level, world }`)                                                 |
| `GET /api/characters/:id` · `PUT` · `PATCH` · `DELETE`                                     | Full doc; replace; merge-patch; delete                                                                 |
| `PUT /api/characters/:id/equipment/:slot` · `DELETE`                                       | Upsert / remove one item (returns validation warnings)                                                 |
| `PUT /api/characters/:id/stat-window`                                                      | Replace stat window                                                                                    |
| `GET /api/characters/:id/analysis?target=grandis                                           | arcane                                                                                                 | <bossId>` | Full analysis (stats, indexes, checksums, residual, ranked upgrades, boss board when available) |
| `POST /api/analyze`                                                                        | Stateless: `{ character, target? }` → analysis                                                         |
| `POST /api/characters/:id/what-if`                                                         | `{ deltas: Delta[] , target? }` → joint gain                                                           |
| `GET /api/characters/:id/history` · `/history/:ts`                                         | Snapshots                                                                                              |

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
   **Hero is two-handed only** — weapon constant 1.44, no 1H/2H switching. Xenon and Demon Avenger
   keep their stat-multiplier branches (they're in the formula) but get no bespoke coverage.
3. **In-app LLM calls are allowed** ("do it if helpful — I have keys"). Still not needed for stage 1:
   the external agent owns screenshot parsing. Revisit for a convenience "paste a screenshot here"
   route once the API is proven.
4. **Boss board anchors on the KMS 8.8-challenge class DPM charts**, scaled by the damage index.
   Personal Battle Analysis numbers as an anchor source are a stretch goal, not stage 1.
5. **Local only.** `npm run dev` on this machine; no tunnel, no remote hosting. Auth stays optional
   (`MAPLE_TOKEN`) and off by default.

## 12. Remaining open questions

None blocking. Things I'll decide as they come up and flag if they turn out to matter:

- ~~Whether the Ren weapon constant in the research is current.~~ **Settled 2026-09-06 by
  measurement, not by sourcing.** The weapon constant does not cancel in the displayed-range
  formula, so it can be solved against a real capture: Lutoren's in-game max range of 14,736,287
  is reproduced by 1.30 to −0.002%, while 1.25 and 1.34 are off by 3.8% and 3.1%. This is the
  general technique for any unsourced class constant — capture the stat window and solve.
- Ren's mastery (90%) is still unproven: mastery only moves the range's LOWER bound and no
  capture records `rangeMin`. Capture it to settle. It cancels in every upgrade comparison, so
  nothing in the ranking depends on it.
- Class DPM anchor values: done for the fitted classes via the KMS Practice Arena records
  (`docs/research/dpm-anchors.md`), and the boss board labels them `speculative` on purpose.

## 13. Known limitations worth remembering

- **Combat Power reads high (31.4M computed vs 19.5M displayed on Lutoren).** Not a bug in the
  formula: CP excludes skill-sourced stat, and a captured stat window is buffed, so the innate
  contributions cannot be subtracted without per-class skill data. It is deliberately an upper
  bound and is never used to rank. The _range_ checksum (0.002%) is the one that validates inputs.
- **Cube gains are upper estimates.** The lines a goal does not name are random in reality but are
  modelled as keeping your current best. Every such row says so.
- **Hat cooldown lines score zero** because the damage index models one hit with no rotation.

## 14. Progression paths (supersedes the `starforce` and `set` rows of §5)

Added 2026-09-06 after Nate rejected the previous model outright. Two critiques, one root cause.

**The critiques.** (a) The tool offered three-lining a pair of throwaway earrings that will always be
replaced by Superior Gollux. (b) It offered `14★ → 30★` on the weapon at 2,275 trillion mesos —
"30 star is a thing of myth", and "no one would ever star absolab to 22 stars, arcanes come too fast."

**The wrong fix, which we started and abandoned.** Mark gear transient vs terminal and suppress or
discount investment in the transient. Nate: _"Supressing is wrong - any progress tracker needs to
lead you through the progression. You CANT get arcanes without gearing up your CRA/fafnir gear +
absos - you won't have the range to kill the bosses."_ Investment in stepping-stone gear is
**required**, not wasted. Suppressing it tells the user not to build the exact gear that unlocks the
next tier. A tracker that does this is worse than useless — it stalls you permanently.

**The root cause.** The model has no concept of a _path_. It sees a bag of equipped items and asks
"what is the highest-gain change to this bag?", with the theoretical game cap as the only ceiling.
Real progression is a sequence of stages per slot, each with a **stopping point** — the investment
level at which you stop and move to the next stage — and each gated on **boss access**, which is
gated on range, which is what the previous stage bought you. Nate: _"This is a core concept to maple
and progression as a whole, without this we literally can never have accurate data."_

### 14.1 Model

Data (`src/lib/data/gear-progression.ts`, agent-owned) expresses per slot an ordered list of stages,
not a boolean flag. A boolean cannot express any of the below and was the shape our first brief
wrongly asked for.

- **Stage** = the item tier occupying a slot (CRA → AbsoLab → Arcane → Eternal, and the parallel
  accessory lines). Stages are ordered; some slots have exactly one path, some have real branches.
  Branches must record the condition that selects them (funding, boss access, class, event
  availability), never an unqualified menu.
- **Stopping point** = per stage, the prescribed star / potential tier / flame level at which
  investment stops. This is the core datum. It is a community-consensus number with a source, not
  a derivation — the reason to stop at N★ on AbsoLab is that Arcane arrives before N+1★ pays back,
  which is an empirical claim about drop pace, not something our damage engine can compute.
- **Gate** = which boss drops the stage's gear, and the range/stat needed to kill it. This is what
  makes a path a path rather than a list. `bosses.json` has HP, PDR and an advisory `cpGate` but
  **no drop table** — the boss→gear link is a genuine gap the research must fill.

### 14.2 What this changes in `candidates.ts`

1. **Star targets come from the stage, not from `STAR_BREAKPOINTS`.** Today `max` is the theoretical
   cap (`caps.maxStarforce ?? starforce.maxStars(...)`) and the breakpoint list is a flat global
   `[17…30]` applied to every item regardless of tier. The theoretical cap stays as a hard filter;
   the _offered_ targets are capped at the stage's stopping point. 30★ leaves the default surface.
2. **Over-cap targets are explained, never silently dropped.** A suppressed target must say why —
   "AbsoLab stops at N★ on this path because Arcane arrives first" — so the user can disagree with
   the prescription. Silent omission is indistinguishable from a bug, and this tool has already
   shipped one ranking bug that looked exactly like an opinion.
3. **A new `acquisition` candidate kind.** ✅ SHIPPED — `src/lib/analysis/acquisition.ts`.
   Every other generator only _improves an equipped item_. The path requires the tool to say "your
   next step is to obtain X", which no other kind can express. `set` is the closest and it is too
   vague to act on — it says "equip 2 more pieces" without naming the piece or where it drops.
   `acquisition` names the item, the boss, and the gate. See §14.5 for the two rules it rests on.
4. **Ranking must not compare across stages naively.** A stepping stone's value is not its own damage
   delta — it is that it unlocks the gate. Pricing it purely on damage-per-meso reproduces critique
   (a) in a new form. Open question, deliberately not resolved here: whether gate-unlocking value is
   modelled as a bonus term or whether path order simply overrides ranking within a slot.

### 14.3 Out of scope, permanently

**Pitched Boss gear never appears as a ranked upgrade.** Nate: _"don't you dare start putting pitched
in the list of upgrades, it can take 1-2 years to even see one drop."_ It may be documented as a
terminal endpoint that exists, marked out of scope, ideally with drop rates justifying the exclusion.

### 14.4 Status

Shipped. `src/lib/data/gear-progression.ts` carries the paths, stopping points and gates, sourced
from the four progression guides Nate supplied (`docs/research/gear-progression.md`). Items 1 and 2
of §14.2 landed with it; item 3 landed as §14.5; item 4 is still open. **No stage boundary, stopping
point, or gate threshold may be invented to unblock this** — the project's hardest standing rule is
"don't guess at things - do research", and every number in §14 is exactly the kind of number that
would be tempting to guess.

## 14.5 Acquisition candidates (implements §14.2 item 3)

Added 2026-09-06. Nate: _"we are missing actually obtaining new gear in the upgrade paths — in our
Ren's example, getting absolab shoulder, sup gollux earring, ring, pendant, etc. We may need to
frame it as obtain + n star force or n potential or whatever so the score doesn't go down. The big
thing is we have to consider set bonuses gained and lost."_

### 14.5.1 Obtain PLUS invest, never obtain alone

A freshly farmed AbsoLab shoulder is 0★ with no potential and no flame. Against a 12★ Royal Black
Metal Shoulder that is a straight **downgrade**, so a bare-swap candidate scores negative — and
`rank.ts` drops everything at or below zero. The single most important action on the whole
progression path would vanish from the board without a word.

So the unit of advice is the piece **taken to that stage's prescribed stopping point**: N★, the
planned potential grade, the planned flame band, all read from `gear-progression.ts`. The row is a
real bounded action with a real price. The interim dip is reported in the candidate's `notes`, not
hidden.

This also means acquisition is the one generator whose gain and cost are both **bundles**. The cost
note itemises what is inside — star force from N★, the cube chain, the flames — and says plainly
that the piece itself has no meso price because it is a boss drop or a coin grind.

### 14.5.2 Set effects move in both directions

Replacing a Dominator Pendant with a Superior Gollux Pendant does not just add a Gollux piece — it
**removes** a Boss Accessory piece, and if that drops the count under a threshold the character
loses the whole effect. `setProgress` could never express this: it only ever counts up.

`sets.setChangesForSwap` computes both ends from the equipped counts and `sets.setChangesToDelta`
folds them into the candidate's `Delta`. A lost IED source goes to `iedRemove`, never to a negative
`iedAdd` — IED composes rather than sums, so losing a 30% source means dividing it back out.

Two honest limits, both stated on the affected rows:

- Candidates are scored **independently** (`rank.ts`), so the Superior Gollux 4-set — the single
  largest accessory jump on the path, +30% Boss Damage and +30% IED — never shows its payoff on the
  row that buys the first Gollux piece. Those rows carry a note pointing at what-if.
- Sets flagged `partial` in `sets.json` came only from the item manifest, which omits boss damage
  and IED, so those rows **understate** themselves.

### 14.5.3 Transfer Hammer decides the cost, and reproduces the guides

Rules from the MapleSEA official wiki (<https://www.maplesea.com/wiki/Equipment/ToddsHammer>): over
level 100 the receiving item must be **1 to 10 levels above** the extracting one; star force
**decreases by 1**; potential above Epic **drops to Epic**; only the same equipment category
transfers.

Encoding that rule made the model reproduce the research on its own, without a special case:

| Swap                                    | Level gap | Hammers? | What the guides say                 |
| --------------------------------------- | --------- | -------- | ----------------------------------- |
| CRA (150) → AbsoLab (160)               | 10        | yes      | "fodder the CRA into Abso weapon"   |
| Dominator (140) → Superior Gollux (150) | 10        | yes      | "keep spare Dominator pendants"     |
| Royal Black Metal (120) → AbsoLab (160) | 40        | no       | —                                   |
| AbsoLab (160) → Arcane Umbra (200)      | 40        | no       | AbsoLab is _replaced_, not foddered |

It is also why the ladder stops stepping-stone gear at Epic: the hammer destroys anything above it.
A hammerable route starts the receiving item at `stars - 1` **and** at Epic, so it skips both the
0★ climb and the rank-up chain — which is exactly where most of the meso price lives.

⚠️ Sources disagree on the low-level exception (MapleSEA says the 1-to-20 band applies at level 99
and below; a StrategyWiki summary says 119). Every item on this ladder is level 120+, where both
readings agree, so the stricter text is used and the disagreement cannot change an answer.

### 14.5.4 What it deliberately will not do

- **Never Pitched or Brilliant** (`stage.outOfScope`), per §14.3.
- **Never fills an empty slot with a concrete stage.** The ladder is ordered by tier and nothing in
  the data says which rung a bare slot starts at — that depends on boss access. Empty slots get one
  note naming the paths instead of a guessed candidate.
- **Never compares against an uncaptured item.** A missing `total` block is UNKNOWN, not zero;
  treating it as zero would value the swap as though the character were wearing nothing.
- **Never offers an item the character already wears elsewhere.** The ladder is per slot family and
  does not know `pendant1` is already a Daybreak Pendant, so the generator walks forward past any
  stage already worn.
- **Never offers an item the class cannot equip.** The job bitmask alone is too coarse: every
  explorer-archer Princess No secondary is `reqJob: 4`, so a Wind Archer (a bowman who holds a
  Jewel) matched a Magic Arrow. Weapons and secondaries are additionally filtered by the catalogue's
  `weaponType` against `CLASS_WEAPONS`.

### 14.5.5 What it needed from the data

`catalogue.json` now carries each item's **clean base stats** (`base`, in `schema.StatBlock` shape)
and its `reqJob` bitmask, from the pinned mapledoro v270 manifest. This is the one field a captured
tooltip can never supply — a tooltip only exists for gear you already own — and without it there is
no way to value a piece you do not have. Cost: 1.2 MB → 1.43 MB.

**Known gap.** The v270 manifest has no All Stat % or Damage % field on ANY equip, while current
tooltips for several boss accessories print `All Stats: +5%`. An acquisition replacing such an item
therefore shows a spurious `allStatPct: -5` and **understates** the incoming piece. Every affected
row says so. Fixing it needs a newer dump than maplestory.io serves.

### 14.5.6 Open question, deliberately unresolved

§14.2 item 4 still stands: **ranking does not model gate-unlocking value.** A stepping stone's worth
is partly that it unlocks the next boss, and pricing it purely on damage-per-meso understates it.
Acquisitions are `feasibility: 'grind'` and reach the board through `rank.ts`'s per-kind reservation
rather than by out-competing a cube reroll on gain-per-meso. That is a placement, not a model.
