# Progression systems: V Matrix, HEXA, Link Skills, Legion board + Artifact

Status: data + candidates landed · 2026-09-06 · Branch `progression-systems`

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

1. ✅ Research: `vmatrix.md`, `hexa.md`, `legion-artifact.md` written and cited.
2. ✅ `legion.ts` + 46 tests.
3. ✅ `links.ts` + 46 tests.
4. ✅ Schema: `legion`, `links`, `vMatrix`, `hexa`, with the `links` migration.
5. ✅ `legion-artifact.ts`, `vmatrix.ts`, `hexa.ts` + tests.
6. ✅ Candidate generators + `analysis/types.ts` contract changes.
7. ⬜ Attribution pass: subtract what we can now explain from `GearResidual`.
8. ⬜ Capture Ren's real values into `data/characters/lutoren.json`.

### What landed

| Module                                       | Tests | Ground truth                                                        |
| -------------------------------------------- | ----- | ------------------------------------------------------------------- |
| `src/lib/data/legion.ts`                     | 46    | Legion 9083 → Legendary III / 38 members; the whole grid-bonus list |
| `src/lib/data/links.ts`                      | 46    | faction caps; the self-vs-mule split                                |
| `src/lib/data/legion-artifact.ts`            | 40    | all nine artifact lines, summing to the exact Lv39 budget           |
| `src/lib/data/vmatrix.ts`                    | 47    | cost curves from the wiki's Lua source; five class rosters          |
| `src/lib/data/hexa.ts`                       | 44    | every stat line, every enhancement rate, both applied totals        |
| `src/lib/analysis/progression-candidates.ts` | 41    | generators run against the real captured Ren                        |

### The rule that came out of building it

**Absent is not zero, and a note is not a defence.** The first working version
defaulted uncaptured V Matrix and Legion board data to level 0, then proposed a
0 → 60 boost node worth +120% Final Damage. It ranked _first on the whole board_
and was fiction — the real Ren has all six nodes at 60/60 and no upgrade
available. Both generators now produce nothing at all when the data is missing,
and say why. A warning the user might not read cannot offset a candidate ranked
above everything real.

### Corrections made to the research while transcribing it

- `hexa.md` §2.9's whole-character total (1,527 / 35,432) does not follow from
  its own per-node table, which gives **1,535 / 43,976**. Doc corrected; the
  module derives the total rather than hardcoding it.
- `hexa.md` §7.7's unreconciled `06/20` reading is **resolved** from the
  screenshots: the HEXA Stat panel shows a saved node and the live one side by
  side with one counter under the left tile. The sum rule holds.
- `docs/capture/2026-09-06-lutoren.md` had its two HEXA Stat cores labelled the
  wrong way round, and repeated the `06/20` misread. Both corrected.
- `formulas.md` line 249's "maxed boost nodes give ×2.2" is right only for
  4th-job and Hyper skills; the coefficient is per-skill.
- `formulas.md` §4B §2 §8.2's Artifact "per-stat caps" table is really the
  level-10 column of a per-level value table, not a cap system.

---

## 8. Open questions

Resolved while building:

- ~~Grid "Damage +20.00%" vs "Critical Damage +20%"~~ — Critical Damage. The
  outer board has no plain Damage area, and 40 squares × 0.5% is exactly +20%.
- ~~Is the V Matrix "Common Nodes" tab the v271 "HEXA common nodes"?~~ — **No.**
  They are unrelated. V Matrix common nodes have existed since GMS v179 (2016)
  and cost V Points; HEXA common nodes are 6th job and cost Sol Erda.

Still open, in the order they matter:

1. **Nodestone drop rates in GMS Heroic.** Unsourced anywhere — the wiki's drop
   list is explicitly for non-Heroic worlds. Without it, no V Matrix candidate
   can be priced in days, only in V Points.
2. **Sol Hecate's per-level effect.** 208 Sol Erda and 6,268 fragments of
   bossing damage with no published curve, so it cannot be ranked at all.
3. **Uptime for conditional links and stacking buffs.** No principled answer
   without a rotation model. Cooldown-based uptimes are exact arithmetic;
   stack- and proc-based ones are stated guesses marked `estimated`.
4. **Whether link flat stat is `% applied` or `% not applied`.** The research
   settles neither. `links.ts` exports `LINK_FLAT_STAT_CHANNEL = 'unverified'`
   and the generator takes the pessimistic reading. Only Pirate Blessing is
   affected.
5. **Skill-scoped Final Damage against a global FD term.** V Matrix and HEXA
   boost nodes boost one named skill; `CalcInput` has one FD number. Every
   candidate built on that is `estimated` and says so, but the real fix is a
   rotation model.
6. **`Decent Advanced Blessing`'s active values** appear identical at Lv1 and
   Lv30 on the wiki. Possibly a template artefact — worth an in-game check.
7. **Legion Artifact crystal extension cost** — namu says 1,000 points pro-rated
   over 30 days, digitaltq observed 470 in GMS. The rounding rule is unverified,
   and crystal upkeep is a real recurring cost the tracker does not yet model.
