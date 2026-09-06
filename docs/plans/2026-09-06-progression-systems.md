# Progression systems: V Matrix, HEXA, Link Skills, Legion board + Artifact

Status: in progress · Started 2026-09-06 · Branch `worktree-progression-systems`

Extends `docs/plans/2026-09-06-maple-design.md`. Read that first — this plan
assumes its §2 (stat window is the source of truth), §3 (units) and §4
(`Analysis` contract).

---

## 1. Why model these at all

The design's §2 rule is that **the stat window is the source of truth** and the
adapter never sums equipment. That rule is right, and it stays. So what is the
point of modelling four systems whose output is _already inside_ the captured
stat window?

Two things, and only these two:

1. **Candidate generation.** `candidates.ts` today can only propose gear actions
   plus symbols and hyper stats. For a Lv272 character with 55 unspent V points,
   Common Nodes at 06/30, two HEXA Stat cores and an unfinished Legion board,
   the _best_ next action is very unlikely to be a star force click. A ranking
   engine that cannot see these systems ranks the wrong things — which is
   exactly the bug `7ae2a67` fixed for gear, one layer up.

2. **Shrinking the residual.** `GearResidual` currently lumps class passives,
   links, legion and buffs into one opaque number and the calibration section
   says so in as many words. Links and the Legion board are fully reconstructible
   from a roster, and HEXA Stat is reconstructible from the panel. Every point we
   can attribute is a point the user can be told about instead of shrugged at.

**Non-goal:** these modules must never be summed into `CalcInput`. The adapter
keeps reading the window. Anything here that produces a number produces either a
`Delta` (a proposed change) or an attribution (an explanation of a number the
window already contains). Both are additive to the existing pipeline; neither
changes an existing total.

---

## 2. What is already researched vs. what is not

| System                                     | Research                         | Where                                                |
| ------------------------------------------ | -------------------------------- | ---------------------------------------------------- |
| Legion board (grid, ranks, member effects) | ✅ complete                      | `formulas.md` §4B §2                                 |
| Link skills                                | ✅ complete                      | `formulas.md` §4B §4 PART B                          |
| Legion Artifact                            | ⚠️ caps only, no per-level table | `formulas.md` §4B §2 §8.2 → new `legion-artifact.md` |
| V Matrix                                   | ❌ none                          | → new `vmatrix.md`                                   |
| HEXA Matrix                                | ❌ none                          | → new `hexa.md`                                      |

Three research passes are running to close those gaps. The two systems with
complete research get built first so the work is not blocked on them.

---

## 3. Ground truth

Every table must reproduce the real capture in
`docs/capture/2026-09-06-lutoren.md` (Ren, Lv272, Kronos, Heroic). The numbers
that act as fixtures:

- **Legion** — Legendary III, total level 9083, 38/38 members, artifact level 39.
  Grid: IED +40%, Boss +40%, Normal +40%, Damage +20%, Crit Rate +12%, LUK +25,
  HP +1500, MP +250, ATT +1, MATT +1.
  → Note IED/Boss/Normal are all at the 40-square cap, Crit Damage is _absent_
  from the grid list, and "Damage +20.00%" is Crit Damage misread or a real
  Damage area — **resolve this when building the module** (§5.2 of the research
  lists Critical Damage +0.50%/square → +20% at 40 squares, which matches
  exactly; the capture's "Damage +20.00%" is almost certainly **Critical
  Damage +20%**). Crit Rate +12% = 12 squares of the 40-square Crit Rate area.
- **Artifact** — 9 effect lines, Lv10 ×6 and Lv9 ×3, at artifact level 39.
- **HEXA Stat** — applied Crit Damage 3.50%, ATT 90, STR 1400, being exactly the
  sum of two cores' lines. A core's level is the sum of its three lines (6+8+6=20,
  2+10+8=20).
- **V Matrix** — 55 unspent V points; 4 job nodes 30/30; 6 boost nodes 60/60;
  18 common nodes from 06/30 to 30/30 plus one locked.

---

## 4. Module design

Each system gets one data module under `src/lib/data/`, following the
`hyperstats.ts` house pattern exactly: sourced tables as `const`, pure functions
over them, every value carrying its research citation, `UNVERIFIED_` prefix for
anything unsourced.

### 4.1 `src/lib/data/legion.ts`

```
LEGION_RANKS: readonly LegionRankSpec[]      // 25 rows: name, legionLevel, members, board, outerPerArea
legionRankAt(legionLevel)                    // -> LegionRankSpec
CHARACTER_RANKS                              // B/A/S/SS/SSS thresholds, squares, Zero overrides
characterRank(level, isZero?)                // -> 'B'|'A'|'S'|'SS'|'SSS'
INNER_AREAS / OUTER_AREAS                    // perSquare value + area size
boardStatValue(areaKey, squares, legionLevel)// capped by board size
LEGION_MEMBER_EFFECTS: Record<classId, ...>  // keyed by src/lib/data/classes.ts ids
memberEffect(classId, rank)                  // -> { stat, value }
```

Rules the module must encode, because they are the ones calculators get wrong:

- Member-effect STR/DEX/INT/LUK is **final** stat (`Delta.mainFinal`), grid
  STR/DEX/INT/LUK is **base** stat (`Delta.mainFlat`). Different channels.
- One effect per job, higher rank wins.
- SSS caps at level 250; levels 251-300 add nothing to the piece.
- Ranks grant members/board/coin cap only — never a direct stat.
- Overdrive (points model) is KMS-only as of 2026-09-06; keep the grid, leave a
  seam.

### 4.2 `src/lib/data/legion-artifact.ts`

Blocked on research. Shape: per-effect level→value table, artifact-point costs,
artifact level→points, per-stat caps (already sourced).

### 4.3 `src/lib/data/links.ts`

```
LINK_SKILLS: Record<linkId, LinkSkillSpec>
  { id, name, faction?, contributorClassIds, maxLevel,
    transferred: (level) => LinkContribution,
    self?: (level) => LinkContribution,
    condition: 'always' | 'conditional', uptimeNote? }
linkLevelFromRoster(linkId, roster)  // faction stacking: unique classes only
```

The hard part is **conditional links**. Angelic Buster's +60% Damage for 10s on
a 60s cooldown is not +60% Damage. Kanna's +20% needs 40 attack-skill uses.
Model these as `condition: 'conditional'` with an explicit `uptime` field and
default them to a documented assumption, never silently to 1.0. A conditional
link's candidate gets `confidence: 'estimated'` at best.

Also: **self versions differ from transferred versions** and Ren specifically
gets `Grounded Body` self +5% Damage that a Ren mule does not give. The module
must take "am I this class" into account.

### 4.4 `src/lib/data/vmatrix.ts` / `src/lib/data/hexa.ts`

Blocked on research. Expected shape mirrors `hyperstats.ts`: cost curve, effect
per level, caps, unlock gates.

---

## 5. Schema changes

`CharacterSchema` gains structured versions of two fields that exist today as
freeform text, plus three new ones. **All optional** — a character captured
without them must keep validating.

```ts
legion?: {
  level?: number
  members?: { classId: string; level: number }[]   // roster; rank derived
  board?: Partial<Record<LegionAreaKey, number>>   // squares filled per area
  artifact?: { level?: number; effects?: Partial<Record<ArtifactEffectKey, number>> }
  notes?: string
}
links?: { id: string; level: number }[]            // was string[]
vMatrix?: { points?: number; nodes?: { id: string; level: number }[] }
hexa?: {
  solErda?: number; solErdaFragments?: number
  skills?: { id: string; type: HexaNodeType; level: number }[]
  stat?: { main: HexaStatLine; additional: [HexaStatLine, HexaStatLine] }[]
}
```

`links` changing from `string[]` to an object array is a **breaking schema
change**. Only two characters exist and neither sets `links`, so accept a
`string[]` on input and coerce it (level = max) rather than versioning the file
format.

---

## 6. Analysis changes

New `UpgradeKind`s: `'link' | 'legion-board' | 'legion-member' | 'legion-artifact' | 'v-matrix' | 'hexa-skill' | 'hexa-stat'`.

New `UpgradeCost` fields, since none of these cost mesos:
`solErda`, `solErdaFragments`, `nodeShards`, `artifactPoints`, `legionSquares`,
`muleLevel` (i.e. "level a mule to 210").

The `Feasibility` enum needs a fourth member or a reinterpretation: levelling a
mule to 210 for a link is neither `routine` nor a `ceiling` — it is real, large,
and off-character. Proposal: reuse `grind` and lean on `cost.note`.

Candidate generators mirror `generateHyperStats`: one function per system, all
pure table lookups over the character document.

---

## 7. Order of work

1. ✅ Research dispatched for V Matrix, HEXA, Legion Artifact.
2. `legion.ts` + tests (research complete).
3. `links.ts` + tests (research complete).
4. Schema extensions + migration of the `links` field.
5. `legion-artifact.ts`, `vmatrix.ts`, `hexa.ts` as research lands.
6. Candidate generators + `analysis/types.ts` contract changes.
7. Attribution pass: subtract what we can now explain from `GearResidual`.
8. Capture Ren's real values into `data/characters/lutoren.json`.

---

## 8. Open questions

- **Grid "Damage +20.00%" vs "Critical Damage +20%"** in the Ren capture. The
  research says the outer board has no plain Damage area, and Critical Damage
  at 40 squares is exactly +20%. Reading the screenshot again, the line above it
  is "Normal Enemy Damage.." truncated — so the list is
  `… Normal Enemy Damage +40% / Critical Damage +20.00% / Critical Rate +12%`.
  Treating it as Critical Damage. Flagged here in case it is wrong.
- **Is the V Matrix "Common Nodes" tab the same thing as the announced v271
  "HEXA common nodes"?** They may be one feature with two UIs. Research will say.
- **Uptime model for conditional links and boost nodes.** There is no principled
  answer without a rotation model, which this project does not have. Defaulting
  to a stated assumption and marking confidence `estimated`.
