# MapleStory (GMS) Data Tables — Part B

Research compiled 2026-09-06 for a gear-progression calculator.
Scope: Hyper Stats, Legion/Maple Union, Symbols, Inner Ability + Link Skills, Equipment Set Effects.

**Reading conventions used throughout this document**

- Every table is followed by the source URL it came from. Where two independent sources
  were cross-checked, both are listed.
- `**UNVERIFIED**` marks a number that could not be confirmed from a primary/reliable source.
- `**CONFLICT**` marks a place where sources disagree; both values are given.
- **Section numbering:** each of the five topic sections was researched independently and keeps
  its own internal numbering (so §2 has its own "1., 2., 3.…", §3 uses "A., B., C.…", §5 has its
  own "1., 2., 3.…"). Use the table of contents rather than bare numbers when cross-referencing.
- KMS = Korea, GMS = Global. GMS lags KMS by roughly 3-6 months on system updates, so a
  KMS-sourced table is marked as such and should be treated as "the direction GMS is heading"
  unless a GMS source confirms it has already landed.

---

## Contents

- [0. Version context — what changed in 2025-2026](#0-version-context--what-changed-in-2025-2026)
- [1. Hyper Stats](#1-hyper-stats)
  - [1.1 System summary](#11-system-summary)
  - [1.2 Hyper stat point COST curve (per stat)](#12-hyper-stat-point-cost-curve-per-stat)
  - [1.3 Hyper stat POINTS AVAILABLE by character level](#13-hyper-stat-points-available-by-character-level)
  - [1.4 Effect per level — every hyper stat](#14-effect-per-level--every-hyper-stat)
  - [1.5 Quick reference — maxed totals](#15-quick-reference--maxed-totals)
  - [1.6 Things that are NOT hyper stats (common errors to avoid)](#16-things-that-are-not-hyper-stats-common-errors-to-avoid)
- [2. Legion / Maple Union](#2-legion--maple-union)
  - [0. Naming — regional terminology map](#0-naming--regional-terminology-map)
  - [1. Character Ranks and Grid Area per Rank](#1-character-ranks-and-grid-area-per-rank)
  - [2. Board Size, Total Squares, and How Size Unlocks](#2-board-size-total-squares-and-how-size-unlocks)
  - [3. Legion Ranks — thresholds and what each grants](#3-legion-ranks--thresholds-and-what-each-grants)
  - [4. Legion Member Effects — full class table (GMS 2026)](#4-legion-member-effects--full-class-table-gms-2026)
  - [5. Board / Grid Stat Values](#5-board--grid-stat-values)
  - [6. Legion Raid Power and Legion Coin income](#6-legion-raid-power-and-legion-coin-income)
  - [7. The Overdrive Legion Rework (KMS live July 2026 · GMS expected Nov/Dec 2026)](#7-the-overdrive-legion-rework-kms-live-july-2026--gms-expected-novdec-2026)
  - [8. Adjacent Legion subsystems (relevant to a progression calculator)](#8-adjacent-legion-subsystems-relevant-to-a-progression-calculator)
  - [9. 2025–2026 change log for Legion (chronological)](#9-20252026-change-log-for-legion-chronological)
  - [10. Gaps / things to verify in-game or later](#10-gaps--things-to-verify-in-game-or-later)
  - [11. Source index](#11-source-index)
- [3. Symbols (Arcane, Sacred/Authentic, Grand Sacred)](#3-symbols-arcane-sacredauthentic-grand-sacred)
  - [A. ARCANE SYMBOLS](#a-arcane-symbols)
  - [B. SACRED SYMBOLS (= Authentic Symbols)](#b-sacred-symbols--authentic-symbols)
  - [C. NEWER SYMBOL TYPES (2025–2026)](#c-newer-symbol-types-20252026)
  - [D. FORCE MECHANICS — the exact published rules](#d-force-mechanics--the-exact-published-rules)
  - [E. GMS-SPECIFIC STATE AS OF 2026-09-06 (read this before coding)](#e-gms-specific-state-as-of-2026-09-06-read-this-before-coding)
  - [F. CONSOLIDATED FORMULA SHEET (implementation-ready)](#f-consolidated-formula-sheet-implementation-ready)
  - [G. DISAGREEMENTS, GAPS AND UNVERIFIED ITEMS](#g-disagreements-gaps-and-unverified-items)
- [4. Inner Ability and Link Skills](#4-inner-ability-and-link-skills)
  - [PART A — INNER ABILITY ("Ability")](#part-a--inner-ability-ability)
  - [PART B — LINK SKILLS](#part-b--link-skills)
  - [PART C — DATA-QUALITY NOTES FOR THE CALCULATOR](#part-c--data-quality-notes-for-the-calculator)
- [5. Equipment Set Effects](#5-equipment-set-effects)
  - [Source quality notes (read first)](#source-quality-notes-read-first)
  - [1. Root Abyss Set (Chaos Root Abyss / "CRA")](#1-root-abyss-set-chaos-root-abyss--cra)
  - [2. AbsoLab Set](#2-absolab-set)
  - [3. Arcane Umbra Set](#3-arcane-umbra-set)
  - [4. Eternal Set (Eternal armor + Genesis/Destiny weapon)](#4-eternal-set-eternal-armor--genesisdestiny-weapon)
  - [5. Genesis Weapon and Destiny Weapon](#5-genesis-weapon-and-destiny-weapon)
  - [6. Pitched Boss Set](#6-pitched-boss-set)
  - [7. Dawn Boss Set](#7-dawn-boss-set)
  - [8. Brilliant Boss Set ("Radiant" / KMS 광휘의 보스 세트)](#8-brilliant-boss-set-radiant--kms-광휘의-보스-세트)
  - [9. Boss Accessory Set (generic)](#9-boss-accessory-set-generic)
  - [10. Gollux Sets](#10-gollux-sets)
  - [11. Meister / "Ardentmill" accessory set](#11-meister--ardentmill-accessory-set)
  - [12. Blackgate Set (and "Whitegate")](#12-blackgate-set-and-whitegate)
  - [13. Other accessory / misc sets with damage-relevant effects](#13-other-accessory--misc-sets-with-damage-relevant-effects)
  - [14. Android / Pet sets](#14-android--pet-sets)
  - [15. Newly added 2025–2026 content — findings](#15-newly-added-20252026-content--findings)
  - [16. Open gaps and unresolved items](#16-open-gaps-and-unresolved-items)
- [Appendix A — Cross-cutting 2025-2026 patch detail (KMS CROWN)](#appendix-a--cross-cutting-2025-2026-patch-detail-kms-crown)
  - [A.1 CROWN link skill master-level table (KMS, ver. 1.2.410, 2025-12-28)](#a1-crown-link-skill-master-level-table-kms-ver-12410-2025-12-28)
  - [A.2 CROWN Sacred Symbol level-11 bonus table (KMS, 2025-12-18)](#a2-crown-sacred-symbol-level-11-bonus-table-kms-2025-12-18)
  - [A.3 Brilliant ("Radiant") Boss accessory set — announcement figures](#a3-brilliant-radiant-boss-accessory-set--announcement-figures)
  - [A.4 Other CROWN changes that touch this document](#a4-other-crown-changes-that-touch-this-document)
- [Appendix B — Independent Korean-source cross-check (namu.wiki)](#appendix-b--independent-korean-source-cross-check-namuwiki)
  - [B.1 Confirmations](#b1-confirmations)
  - [B.2 Facts only namu carries (KMS figures — treat as UNVERIFIED for GMS)](#b2-facts-only-namu-carries-kms-figures--treat-as-unverified-for-gms)
  - [B.3 Where namu is a better source than the English wikis](#b3-where-namu-is-a-better-source-than-the-english-wikis)
- [Appendix C — Consolidated confidence assessment](#appendix-c--consolidated-confidence-assessment)
  - [Known gaps carried forward](#known-gaps-carried-forward)

---

## 0. Version context — what changed in 2025-2026

This matters for every section below, because several long-stable tables were rewritten
in the **CROWN** update (KMS Dec 2025 / Jan-Feb 2026).

| Update | Date (KMS) | Changes relevant to this document |
|---|---|---|
| NEXT: Union Champion | 2025-01-16 | Legion/Union Champion system |
| NEXT: Destiny Weapon & Star Force Reorganization | 2025-03-20 | Star Force rework, Destiny weapon tier above Genesis |
| Assemble: Len | 2025-06-20 | New class Len (Lynn) |
| **CROWN** showcase | 2025-12-14 | Announced everything below |
| **CROWN** pt.1 (ver. 1.2.410) | 2025-12-18 / patch post 2025-12-28 | **Link Skill master-level expansion (level 3 links)**; **Authentic/Sacred Symbol Lv11 bonus effects**; Maple Union rank-up cost removed (auto rank-up); **Hyper Stat preset change cost removed**; Ability "Change Circulator"; V Matrix rework; Kinesis remaster (DF/TP/PP hyper stat renamed to DF/TF) |
| CROWN pt.2 | 2026-01-15 | New boss **Radiant Malefic Star** (Lv280) → **Brilliant Boss accessory** set; **Astra secondary weapon** (Genesis→Destiny gap filler) |
| CROWN pt.3 | 2026-02-12 | New boss **Jupiter** (Lv295); new area **Geardrock/Geardrak** (Lv295) → **Grand Authentic/Sacred Symbol: Geardrock**; Destiny Weapon 2nd Growth; Guild Castle |
| Symbol pouch patch | 2026-03-19 | Symbol Voucher Bag (40 slots) added |

Sources: <https://orangemushroom.net/2025/12/14/2025-maplestory-winter-showcase-crown/>,
<https://orangemushroom.net/2025/12/28/kms-ver-1-2-410-maplestory-crown-kinesis-remaster/>,
<https://orangemushroom.net/2025/01/16/kms-ver-1-2-399-maplestory-next-union-champion/>,
<https://orangemushroom.net/2025/03/20/kms-ver-1-2-401-maplestory-next-destiny-weapon-star-force-reorganization/>,
<https://namu.wiki/w/어센틱포스> (rev. 2026-09-05)

---

## 1. Hyper Stats

### 1.1 System summary

- Unlocked at **character level 140**.
- 17 distinct hyper stats. **16 of them cap at level 15; "Maximum DF/TF" caps at level 10.**
- **The last 5 levels of every stat, and the Arcane Force stat entirely, require 5th Job Advancement.**
  (Arcane Force additionally requires having obtained an Arcane Symbol from the quest.)
- Reset cost: **10,000,000 mesos.**
- **3 presets** are available. Switching between presets used to cost 2,000,000 mesos;
  **the preset change cost was removed in the CROWN update (KMS, Dec 2025)**.
- There is **no Sacred Force / Authentic Force hyper stat** as of 2026-09. Sacred Force can
  only be raised by Sacred Symbols. (Arcane Force, by contrast, can be raised by hyper stat,
  guild skill and event buffs.)

Sources: <https://strategywiki.org/wiki/MapleStory/Hyper_Stats> ·
<https://orangemushroom.net/2025/12/28/kms-ver-1-2-410-maplestory-crown-kinesis-remaster/> ·
<https://namu.wiki/w/어센틱포스>

### 1.2 Hyper stat point COST curve (per stat)

This is the single most important table for an optimizer: cost is per-stat and strongly convex.

| Target level | Cost from previous level | Cumulative cost from 0 |
|---|---|---|
| 1 | 1 | 1 |
| 2 | 2 | 3 |
| 3 | 4 | 7 |
| 4 | 8 | 15 |
| 5 | 10 | 25 |
| 6 | 15 | 40 |
| 7 | 20 | 60 |
| 8 | 25 | 85 |
| 9 | 30 | 115 |
| 10 | 35 | 150 |
| 11 | 50 | 200 |
| 12 | 65 | 265 |
| 13 | 80 | 345 |
| 14 | 95 | 440 |
| 15 | 110 | 550 |

Source: <https://strategywiki.org/wiki/MapleStory/Hyper_Stats>
Independently corroborated by the KMS hyper stat simulator's source
(`usedPoint` switch in <https://mystrange01.github.io/hyperCalc/main.js>) and by
<https://codingace.net/statistics/hyper_stat_maplestory.html> (embedded `resultRows`
JSON: level 8 → cost 85, level 10 → 150, level 11 → 200, level 13 → 345).

> **CONFLICT / correction.** Several SEO calculator pages and AI-generated summaries claim
> "levels 1-10 cost 1,2,3…10 and levels 11-15 cost 15,20,25,30,35, total 180". **That is
> wrong.** Three independent primary-ish sources (StrategyWiki, the KMS simulator source,
> codingace's embedded data) all agree on the table above, total **550**. Use 550.

The same cost curve applies to *every* hyper stat, including the level-10-capped DF/TF one
(so DF/TF maxes at a cost of 150).

### 1.3 Hyper stat POINTS AVAILABLE by character level

You first receive 3 points on reaching level 140. The award per level-up increases by 1
every 10 character levels.

**Closed-form per bracket** (points awarded *on* that level-up):

| Character level | Points per level | Cumulative total formula |
|---|---|---|
| 140-149 | 3 | 3 × Level − 417 |
| 150-159 | 4 | 4 × Level − 566 |
| 160-169 | 5 | 5 × Level − 725 |
| 170-179 | 6 | 6 × Level − 894 |
| 180-189 | 7 | 7 × Level − 1,073 |
| 190-199 | 8 | 8 × Level − 1,262 |
| 200-209 | 9 | 9 × Level − 1,461 |
| 210-219 | 10 | 10 × Level − 1,670 |
| 220-229 | 11 | 11 × Level − 1,889 |
| 230-239 | 12 | 12 × Level − 2,118 |
| 240-249 | 13 | 13 × Level − 2,357 |
| 250-259 | 14 | 14 × Level − 2,606 |
| 260-269 | 15 | 15 × Level − 2,865 |
| 270-279 | 16 | 16 × Level − 3,134 |
| 280-289 | 17 | 17 × Level − 3,413 |
| 290-299 | 18 | 18 × Level − 3,702 |
| 300 | 19 (one-off) | **1,699** |

**Checkpoint values** (cumulative points owned at that level):

| Level | Total | Level | Total | Level | Total |
|---|---|---|---|---|---|
| 140 | 3 | 200 | 339 | 260 | 1,035 |
| 150 | 34 | 210 | 430 | 270 | 1,186 |
| 160 | 75 | 220 | 531 | 280 | 1,347 |
| 170 | 126 | 230 | 642 | 290 | 1,518 |
| 180 | 187 | 240 | 763 | 299 | 1,680 |
| 190 | 258 | 250 | 894 | **300** | **1,699** |

Source: <https://strategywiki.org/wiki/MapleStory/Hyper_Stats> (full 140→300 row-by-row table).
Corroborated for 140-290 by <https://mystrange01.github.io/hyperCalc/main.js>.

> Note: the hyperCalc source has an off-by-one bug at exactly level 300 (returns 1,518).
> StrategyWiki's row-by-row table gives **1,699** at level 300, which is consistent with the
> 18-per-level bracket ending at 1,680 on level 299 plus a final 19-point award.
> Level 300 award of 19 is **only sourced from StrategyWiki** — treat as lightly UNVERIFIED.

For calculator sizing: at level 300 you have **1,699 points**, and maxing a single stat to
15 costs 550. So you can afford roughly **three maxed stats plus change** (1,650), which is
why the standard endgame allocation is Boss Damage 15 / IED 15 / Damage 15 and then spread.

### 1.4 Effect per level — every hyper stat

All 17 stats. "Total" is the cumulative effect at that level (not per-level delta).

#### Main stats: STR / DEX / INT / LUK (four separate hyper stats)

Flat **+30 per level**, linear. **Not affected by %STR / %All Stat** — it is added as final stat.

| Lv | 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8 | 9 | 10 | 11 | 12 | 13 | 14 | 15 |
|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|
| Total | 30 | 60 | 90 | 120 | 150 | 180 | 210 | 240 | 270 | 300 | 330 | 360 | 390 | 420 | **450** |

#### Max HP % and Max MP % (two separate hyper stats)

Flat **+2% per level**, linear.

| Lv | 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8 | 9 | 10 | 11 | 12 | 13 | 14 | 15 |
|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|
| Total % | 2 | 4 | 6 | 8 | 10 | 12 | 14 | 16 | 18 | 20 | 22 | 24 | 26 | 28 | **30** |

#### Maximum DF / TF (Demon Force / Time Force) — **CAPS AT LEVEL 10**

Flat **+10 per level**. Only useful for Demon Slayer, Kanna (Kanna's Mana is coded as DF),
Kinesis, Zero.
Formerly named "Maximum DF/TF/PP"; **renamed to "DF/TF Increase" in the CROWN Kinesis
remaster (KMS 2025-12-28)** when Kinesis's Psychic Points were removed.

| Lv | 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8 | 9 | 10 |
|---|---|---|---|---|---|---|---|---|---|---|
| Total | 10 | 20 | 30 | 40 | 50 | 60 | 70 | 80 | 90 | **100** |

#### Critical Rate — **tiered**: +1%/lv for 1-5, +2%/lv for 6-15

| Lv | 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8 | 9 | 10 | 11 | 12 | 13 | 14 | 15 |
|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|
| Total % | 1 | 2 | 3 | 4 | 5 | 7 | 9 | 11 | 13 | 15 | 17 | 19 | 21 | 23 | **25** |

#### Critical Damage — flat +1%/level

| Lv | 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8 | 9 | 10 | 11 | 12 | 13 | 14 | 15 |
|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|
| Total % | 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8 | 9 | 10 | 11 | 12 | 13 | 14 | **15** |

#### Ignore Enemy DEF (IED) — flat +3%/level (nominal)

| Lv | 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8 | 9 | 10 | 11 | 12 | 13 | 14 | 15 |
|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|
| Total % | 3 | 6 | 9 | 12 | 15 | 18 | 21 | 24 | 27 | 30 | 33 | 36 | 39 | 42 | **45** |

**Important for a calculator:** IED is multiplicative-stacking, so the *effective* marginal
value of each hyper stat level rises. StrategyWiki publishes the effective marginal gain
(i.e. the relative reduction in remaining enemy DEF) assuming this is your only IED source:

| Lv | 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8 |
|---|---|---|---|---|---|---|---|---|
| Effective marginal | 3.0000% | 3.0927% | 3.1914% | 3.2967% | 3.4090% | 3.5294% | 3.6585% | 3.7974% |

| Lv | 9 | 10 | 11 | 12 | 13 | 14 | 15 |
|---|---|---|---|---|---|---|---|
| Effective marginal | 3.9473% | 4.1095% | 4.2857% | 4.4776% | 4.6875% | 4.9180% | 5.1724% |

(IED stacking formula: `1 − Π(1 − IEDᵢ)`. The hyper stat contributes a flat 3 percentage
points of *nominal* IED per level; the table above is StrategyWiki's derived marginal.)

#### Damage % (applies to all monsters) — flat +3%/level

| Lv | 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8 | 9 | 10 | 11 | 12 | 13 | 14 | 15 |
|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|
| Total % | 3 | 6 | 9 | 12 | 15 | 18 | 21 | 24 | 27 | 30 | 33 | 36 | 39 | 42 | **45** |

#### Damage to Boss Monsters — **tiered**: +3%/lv for 1-5, +4%/lv for 6-15

| Lv | 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8 | 9 | 10 | 11 | 12 | 13 | 14 | 15 |
|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|
| Total % | 3 | 6 | 9 | 12 | 15 | 19 | 23 | 27 | 31 | 35 | 39 | 43 | 47 | 51 | **55** |

#### Damage to Normal Monsters — identical curve to Boss Damage

| Lv | 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8 | 9 | 10 | 11 | 12 | 13 | 14 | 15 |
|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|
| Total % | 3 | 6 | 9 | 12 | 15 | 19 | 23 | 27 | 31 | 35 | 39 | 43 | 47 | 51 | **55** |

#### Abnormal Status Resistance — **tiered**: +1/lv for 1-5, +2/lv for 6-15 (flat points, not %)

| Lv | 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8 | 9 | 10 | 11 | 12 | 13 | 14 | 15 |
|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|
| Total | 1 | 2 | 3 | 4 | 5 | 7 | 9 | 11 | 13 | 15 | 17 | 19 | 21 | 23 | **25** |

#### Weapon and Magic ATT — flat +3/level. **Is affected by %ATT increases.**

| Lv | 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8 | 9 | 10 | 11 | 12 | 13 | 14 | 15 |
|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|
| Total | 3 | 6 | 9 | 12 | 15 | 18 | 21 | 24 | 27 | 30 | 33 | 36 | 39 | 42 | **45** |

#### Bonus EXP — **tiered**: +0.5%/lv for 1-10, +1%/lv for 11-15

| Lv | 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8 | 9 | 10 | 11 | 12 | 13 | 14 | 15 |
|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|
| Total % | 0.5 | 1 | 1.5 | 2 | 2.5 | 3 | 3.5 | 4 | 4.5 | 5 | 6 | 7 | 8 | 9 | **10** |

#### Arcane Force — **tiered**: +5/lv for 1-10, +10/lv for 11-15. Requires 5th job + an Arcane Symbol.

| Lv | 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8 | 9 | 10 | 11 | 12 | 13 | 14 | 15 |
|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|
| Total | 5 | 10 | 15 | 20 | 25 | 30 | 35 | 40 | 45 | 50 | 60 | 70 | 80 | 90 | **100** |

**Source for all of §1.4:** <https://strategywiki.org/wiki/MapleStory/Hyper_Stats>
(per-stat level-by-level tables).
**Independently corroborated** by the KMS simulator's `increasedStat` formulas in
<https://mystrange01.github.io/hyperCalc/main.js>, which encode exactly the same curves:
`i∈[0,3] → v*30` (main stats); `i∈[4,5] → v*2` (HP/MP %); `i=6 → v*10` capped at 10 (DF/TF);
`i=7 → v≤5 ? v : (v−5)*2+5` (crit rate); `i=8 → v` (crit damage); `i=9,10,14 → v*3`
(IED, damage, ATT); `i∈[11,12] → v≤5 ? v*3 : (v−5)*4+15` (boss/normal damage);
`i=13 → v≤5 ? v : (v−5)*2+5` (status resistance);
`i=15 → v≤10 ? v*0.5 : (v−10)+5` (EXP); `i=16 → v≤10 ? v*5 : (v−10)*10+50` (Arcane Force).

### 1.5 Quick reference — maxed totals

| Hyper stat | Max level | Value at max | Cost at max |
|---|---|---|---|
| STR / DEX / INT / LUK (each) | 15 | +450 final stat | 550 |
| Max HP % / Max MP % (each) | 15 | +30% | 550 |
| Max DF/TF | **10** | +100 | 150 |
| Critical Rate | 15 | +25% | 550 |
| Critical Damage | 15 | +15% | 550 |
| Ignore Enemy DEF | 15 | +45% | 550 |
| Damage | 15 | +45% | 550 |
| Damage to Boss Monsters | 15 | +55% | 550 |
| Damage to Normal Monsters | 15 | +55% | 550 |
| Abnormal Status Resistance | 15 | +25 | 550 |
| Weapon & Magic ATT | 15 | +45 | 550 |
| Bonus EXP | 15 | +10% | 550 |
| Arcane Force | 15 | +100 | 550 |

### 1.6 Things that are NOT hyper stats (common errors to avoid)

- **Knockback Resistance / Stance** — <https://gameslikefinder.com/article/maplestory-hyper-stats-guide/>
  lists a "Knockback Resistance +2%/lv, max 20%" hyper stat. **This does not appear in
  StrategyWiki's 17-stat list, nor in the KMS simulator's 17-input list.** Older
  pre-rework MapleStory did have a Stance hyper stat; it was removed.
  **Treat "Knockback Resistance hyper stat" as UNVERIFIED / most likely stale.**
- **Speed, Jump, Elemental Resistance, All Stat, Damage Absorption** — these existed in the
  *original* (pre-2016) hyper stat list. <https://ayumilove.net/maplestory-hyper-stats-guide/>
  still shows this old list (max level 10, "Demon Force +10/lv", Stance, Speed, Jump,
  Elemental Resistance). **That page is stale — do not use it.**
- **Sacred / Authentic Force** — no hyper stat exists for it (see §3).

---

## 2. Legion / Maple Union

> Researched independently; every table below carries its own source URL.

**Compiled:** 2026-09-06
**Target service:** GMS (Global MapleStory), current live version as of Sept 2026 (post-**v.269 Ride the Lightning**, June 17 2026 / **v.270**, July 22 2026)

> **READ THIS FIRST — the system is mid-transition.**
> GMS today still runs the **classic Tetris/grid Legion board**. KMS replaced the grid entirely with a **point-allocation system** in the **Overdrive** update (KMS v.1.2.416, 2026-07-04). GMS is scheduled to receive the same revamp in **late November / December 2026**. A calculator built now should model the **grid**, but be structured so the **points** model can be swapped in. Section 7 documents the new system.
> Sources: [maplestorywiki.net/w/Legion_System](https://maplestorywiki.net/w/Legion_System) · [maplestorywiki.net/w/MapleStory:_Overdrive](https://maplestorywiki.net/w/MapleStory:_Overdrive) · [orangemushroom.net KMS v.1.2.416](https://orangemushroom.net/2026/07/04/kms-ver-1-2-416-maplestory-overdrive-ruler-of-covenants-lethe/) · [mmoexp GMS Aug–Nov 2026 roadmap](https://www.mmoexp.com/News/maplestory-gms-update-roadmap-august-november-2026-events-qol-new-class-endgame-overhauls.html)

---

### 0. Naming — regional terminology map

The same system has three names in the wild. A calculator should normalize.

| GMS term | KMS/MSEA/StrategyWiki term | Notes |
|---|---|---|
| Legion System | Maple Union / 메이플 유니온 | Same system |
| Synergy Grid / Legion Board | Union Board | The Tetris grid |
| Legion Level | Union Level / 누적 레벨 (cumulative level) | Sum of top 42 characters' levels |
| Legion Rank | Union Rank / 유니온 등급 | 25 tiers |
| Legion Member / Attacker | 공격대원 (raid member) | Character placed on the board |
| Legion Coin | Union Coin / 유니온 코인 | |
| Nameless / Renowned / Heroic / Legendary / Supreme Legion | Novice / Veteran / Master / Grand Master / Supreme Union | **Direct 1:1 mapping, same thresholds** |

GMS tier names sourced from [maplestorywiki.net/w/Legion_System](https://maplestorywiki.net/w/Legion_System) (which uses GMS localization); KMS names from [maplestory.nexon.com official union guide](https://maplestory.nexon.com/Guide/N23GameInformation/Articles/407) and [strategywiki.org/wiki/MapleStory/Maple_Union](https://strategywiki.org/wiki/MapleStory/Maple_Union).

---

### 1. Character Ranks and Grid Area per Rank

#### 1.1 Rank thresholds

| Rank | Level (all classes except Zero) | Level (Zero) | Grid squares occupied | Legion Points (Overdrive) |
|---|---|---|---|---|
| **B** | 60–99 | 130–159 | **1** | 1 |
| **A** | 100–139 | 160–179 | **2** | 2 |
| **S** | 140–199 | 180–199 | **3** | 3 |
| **SS** | 200–249 | 200–249 | **4** | 4 |
| **SSS** | 250+ | 250+ | **5** | 5 |

Sources: [maplestorywiki.net/w/Legion_System](https://maplestorywiki.net/w/Legion_System) · [strategywiki.org/wiki/MapleStory/Maple_Union](https://strategywiki.org/wiki/MapleStory/Maple_Union) · [maplestory.nexon.com union guide](https://maplestory.nexon.com/Guide/N23GameInformation/Articles/407) ("캐릭터가 60/100/140/200/250레벨을 달성할 때 마다 캐릭터카드는 B/A/S/SS/SSS 등급으로 상승 (제로의 경우 130/160/180/200/250레벨)")

There are **no ranks above SSS**. SSS caps at level 250 and does not improve further (levels 251–300 add nothing to the piece, only to Legion Level and Raid Power).

#### 1.2 Piece shapes by rank and class branch

Pieces may be rotated and mirrored. Pieces must interconnect, and the placed mass must touch one of the **4 centre squares**. Pieces may overlap, but **overlapping layers count as 1 square** for stat purposes.
Source: [strategywiki.org/wiki/MapleStory/Maple_Union](https://strategywiki.org/wiki/MapleStory/Maple_Union); geometry cross-verified against the open-source solver [github.com/Xenogents/LegionSolver — src/pieces.js](https://github.com/Xenogents/LegionSolver/blob/master/src/pieces.js).

```
                B(1)   A(2)     S(3)       SS(4)        SSS(5)
Warrior          X     XX       XX         XX           XXX
                                X          XX            XX

Magician         X     XX       XXX        XXX           .X.
                                            .X.          XXX
                                                         .X.

Bowman           X     XX       XXX        XXXX          XXXXX

Thief            X     XX       XXX        XXX           ..X
(not Xenon)                                 ..X          XXX
                                                         ..X

Pirate           X     XX       XX         .X            .X
(not Xenon)                     X.         XX            .X
                                           X.            XX
                                                         X.

Xenon            X     XX       XXX        XXX           X..
                                            .X.          XXX
                                                         .X.
```

Practical consequence for a calculator: **Bowman SSS (1×5 straight) is the most flexible for reaching outer areas**; Magician SSS (plus/cross) is the least efficient at travelling outward. This is why board solvers exist.

#### 1.3 Event / bonus blocks (do not consume attacker slots)

A player may place **up to 2 unique Event Exclusive Legion Blocks**, and they **do not consume attacker slots**.
Source: [maplestorywiki.net/w/Legion_System](https://maplestorywiki.net/w/Legion_System)

| Block | Region | Rank(s) | Effect |
|---|---|---|---|
| Lab Server Legion Block | TMS, **GMS** | B–SSS | ATT & MATT +5/10/15/20/25 |
| Enhanced Lab Server Legion Block | TMS, **GMS** | B–SSS | ATT & MATT +7/14/21/28/35 |
| Abyssal Expedition Legion Block | JMS, CMS, **GMS**, MSEA, TMS | SSS (5 sq) | ATT & MATT **+35** |
| Abyssal Expedition Legion Block (CMS Minar/El Nath variant) | CMS | SS (4 sq) | ATT & MATT +16 |
| Ride or Die Legion Block (S1 / S2 / S3+) | **GMS only** | SSS (5 sq) | ATT & MATT **+35** |
| MapleStory M Legion Block | **KMS only** | always SS (4 sq) | ATT & MATT +20 |

Note: the KMS official guide now states the MapleStory M block ranks B/A/S/SS/SSS at MSM levels **30/50/70/120/250** giving **ATT/MATT +5/10/15/20/25**, which **disagrees** with the wiki's "always SS, +20". Both cited: [maplestory.nexon.com guide](https://maplestory.nexon.com/Guide/N23GameInformation/Articles/407) vs [maplestorywiki.net/w/Legion_System](https://maplestorywiki.net/w/Legion_System). KMS-only, so irrelevant to a GMS calculator.

Ride or Die block acquisition: "For Season 1, this is obtainable by defeating 3 Ride or Die Event bosses per week for at least 10 weeks... For Seasons 2 and later, this is obtainable by participating for 6 weeks throughout the event." — [maplestorywiki.net/w/Legion_System](https://maplestorywiki.net/w/Legion_System)

---

### 2. Board Size, Total Squares, and How Size Unlocks

The board is **centred**: larger boards expand outward around the same 4 centre squares. The **Inner Grid is 12×10 = 120 squares** and is granted in full immediately on founding a Legion. The **Outer Grid** unlocks by Legion Rank.

| Board size (W×H) | Total squares | Inner squares | Outer squares | **Outer squares per stat area** | Rank required | Legion Level required |
|---|---|---|---|---|---|---|
| 12 × 10 | 120 | 120 | 0 | **0** | Nameless Legion I | 500 |
| 14 × 12 | 168 | 120 | 48 | **6** | Nameless Legion IV | 2,000 |
| 16 × 14 | 224 | 120 | 104 | **13** | Renowned Legion I | 3,000 |
| 18 × 16 | 288 | 120 | 168 | **21** | Renowned Legion III | 4,000 |
| 20 × 18 | 360 | 120 | 240 | **30** | Renowned Legion V | 5,000 |
| **22 × 20** | **440** | 120 | 320 | **40 (cap)** | **Heroic Legion II** | **6,000** |

Sources: [maplestorywiki.net/w/Legion_System](https://maplestorywiki.net/w/Legion_System) (Synergy Grid Size table, gives the per-stat outer counts 0/6/13/21/30/40) · [strategywiki.org/wiki/MapleStory/Maple_Union](https://strategywiki.org/wiki/MapleStory/Maple_Union) (board size vs rank).

**Arithmetic check (self-consistent):** the board has 16 stat regions — 8 inner @ 15 squares and 8 outer @ 40 squares. 8×15 + 8×40 = 120 + 320 = **440 = 22×20**. The solver source confirms the geometry: a 20-row × 22-column array with 16 `legionGroups`, the first 8 summing to 40 cells each and the last 8 to 15 cells each — [github.com/Xenogents/LegionSolver — src/board.js `setLegionGroups()`](https://github.com/Xenogents/LegionSolver/blob/master/src/board.js).

**Board size stops growing at Legion Level 6,000.** Everything past 6,000 buys more *attackers* (i.e. more squares of coverage), not more board.

#### 2.1 Maximum achievable coverage — the real constraint

The board has 440 squares but **you can never cover all of them**:

| Source of squares | Max count | Squares each | Total |
|---|---|---|---|
| Legion attackers at Supreme Legion V | 45 | 5 (all SSS) | **225** |
| Event Legion Blocks (GMS: e.g. Ride or Die + Abyssal Expedition) | 2 | 5 (SSS) | **10** |
| **GMS theoretical maximum coverage** | | | **235 / 440** |

(KMS additionally has the MapleStory M block, +4 → 239.)

Derived from the 45-member cap ([maplestorywiki.net/w/Legion_System](https://maplestorywiki.net/w/Legion_System)), the SSS = 5 squares rule, and the "up to 2 event blocks, no attacker slot cost" rule (same source). **This is a derived figure, not a directly quoted one** — treat as computed, not cited.

**Connectivity tax:** pieces must chain back to the centre, so reaching outer regions costs squares spent traversing the inner grid. A commonly cited community figure: **132 squares total are needed to max Boss Damage, Critical Damage and IED simultaneously** (120 outer + ~12 inner path squares) — [forums.maplestory.nexon.net/discussion/18849](https://forums.maplestory.nexon.net/discussion/18849). Treat this as a community estimate; exact minimum depends on piece shapes available.

---

### 3. Legion Ranks — thresholds and what each grants

**There are 25 ranks: 5 tiers × 5 sub-ranks.**

Legion Level = **sum of the levels of the highest-level 42 eligible characters in that world**.

| GMS Rank | KMS/MSEA Rank | Legion Level required | Legion Members (attackers) | Board size unlocked | Outer cap/stat |
|---|---|---|---|---|---|
| Nameless Legion I | Novice Union 1 | 500 | 9 | 12×10 | 0 |
| Nameless Legion II | Novice Union 2 | 1,000 | 10 | — | 0 |
| Nameless Legion III | Novice Union 3 | 1,500 | 11 | — | 0 |
| Nameless Legion IV | Novice Union 4 | 2,000 | 12 | 14×12 | 6 |
| Nameless Legion V | Novice Union 5 | 2,500 | 13 | — | 6 |
| Renowned Legion I | Veteran Union 1 | 3,000 | 18 | 16×14 | 13 |
| Renowned Legion II | Veteran Union 2 | 3,500 | 19 | — | 13 |
| Renowned Legion III | Veteran Union 3 | 4,000 | 20 | 18×16 | 21 |
| Renowned Legion IV | Veteran Union 4 | 4,500 | 21 | — | 21 |
| Renowned Legion V | Veteran Union 5 | 5,000 | 22 | 20×18 | 30 |
| Heroic Legion I | Master Union 1 | 5,500 | 27 | — | 30 |
| **Heroic Legion II** | Master Union 2 | **6,000** | 28 | **22×20 (max)** | **40 (max)** |
| Heroic Legion III | Master Union 3 | 6,500 | 29 | — | 40 |
| Heroic Legion IV | Master Union 4 | 7,000 | 30 | — | 40 |
| Heroic Legion V | Master Union 5 | 7,500 | 31 | — | 40 |
| Legendary Legion I | Grand Master Union 1 | 8,000 | 36 | — | 40 |
| Legendary Legion II | Grand Master Union 2 | 8,500 | 37 | — | 40 |
| Legendary Legion III | Grand Master Union 3 | 9,000 | 38 | — | 40 |
| Legendary Legion IV | Grand Master Union 4 | 9,500 | 39 | — | 40 |
| Legendary Legion V | Grand Master Union 5 | 10,000 | 40 | — | 40 |
| Supreme Legion I | Supreme Union 1 | 10,500 | 41 | — | 40 |
| Supreme Legion II | Supreme Union 2 | 11,000 | 42 | — | 40 |
| Supreme Legion III | Supreme Union 3 | 11,500 | 43 | — | 40 |
| Supreme Legion IV | Supreme Union 4 | 12,000 | 44 | — | 40 |
| **Supreme Legion V** | Supreme Union 5 | **12,500** | **45 (cap)** | — | 40 |

Sources: [maplestorywiki.net/w/Legion_System](https://maplestorywiki.net/w/Legion_System) (GMS names + Lv req + member count) · [maplestory.nexon.com official union guide](https://maplestory.nexon.com/Guide/N23GameInformation/Articles/407) (KMS table: 슈프림 12500→45 … 노비스 500→9, identical) · [strategywiki.org/wiki/MapleStory/Maple_Union](https://strategywiki.org/wiki/MapleStory/Maple_Union).

#### 3.1 IMPORTANT: Legion Ranks do NOT grant direct stat bonuses

This is a common misconception. A Legion Rank grants exactly three things:

1. **More attackers** (9 → 45)
2. **Larger board** (up to Heroic II / 6,000)
3. **Higher unclaimed Legion Coin cap**

All stats come from (a) member effects and (b) board area covered. There is no per-rank "+X% damage".

#### 3.2 Rank-up cost — CHANGED, sources disagree

- **Current (post-Crown / GMS "Ride The Lightning", Dec 2025 KMS / June 2026 GMS):** rank-ups are **FREE**. "Previously, Legion rank upgrades required a certain number of Legion Coins per rank. In the Crown Update, this requirement was removed." — [maplestorywiki.net/w/Legion_System](https://maplestorywiki.net/w/Legion_System). Corroborated by [maplestorywiki.net/w/MapleStory:_Crown](https://maplestorywiki.net/w/MapleStory:_Crown): "Legion System improvements, where the rank can be raised at no cost when the corresponding legion level for the rank is reached, including increases via World Leaped characters."
- **Legacy (pre-Crown) coin costs**, still listed on StrategyWiki and therefore **stale** — [strategywiki.org/wiki/MapleStory/Maple_Union](https://strategywiki.org/wiki/MapleStory/Maple_Union): cumulative 120 / 260 / 410 / 570 / 740 / 1,170 / 1,620 / 2,090 / 2,580 / 3,090 / 4,020 / 4,980 / 5,980 / 7,010 / 8,070 / 10,270 / 12,570 / 14,920 / 17,320 / 20,320 / 23,720 / 27,620 / 32,020 / **37,020 total to Supreme 5**.

**⚠ DISAGREEMENT FLAGGED.** Model rank-ups as free for GMS 2026; keep the coin table only for historical/legacy worlds.

#### 3.3 Which characters count toward Legion Level

Excluded from the level sum ([strategywiki.org/wiki/MapleStory/Maple_Union](https://strategywiki.org/wiki/MapleStory/Maple_Union)):
- Non-Zero characters level 59 or below
- Zero characters level 129 or below
- **Duplicate Zeros** — only the highest-level Zero counts toward the sum (duplicates level 130+ can still be *used* as attackers). Confirmed by KMS official guide: "제로 캐릭터를 여러 개 보유하고 있을 경우 최고 레벨 1개만 누적레벨에 합산"
- Permanent beginners (Beginner / Noblesse / Citizen / Legend) — cannot be attackers, don't count
- Any character outside the top 42 eligible by level (**they can still be placed as attackers**, they just don't add to the sum). Confirmed: "보유 캐릭터가 42개 이상인 경우 높은 레벨 순으로 42개의 캐릭터만 누적 레벨에 포함" — [maplestory.nexon.com](https://maplestory.nexon.com/Guide/N23GameInformation/Articles/407)

**Founding requirements:** a Level 200+ character with 5th Job Advancement, **OR** total level 500+ across the world with all contributing characters at Level 60+ / 2nd Job. — [maplestorywiki.net/w/Legion_System](https://maplestorywiki.net/w/Legion_System). StrategyWiki words it as 500 level sum with ≥3 characters, or 200 if a 5th-job character exists — [strategywiki.org](https://strategywiki.org/wiki/MapleStory/Maple_Union). *(Minor wording disagreement; functionally the same gate.)*

#### 3.4 Legion Level cap

- **Character level cap is 300** — raised from 275 in the *Neo: Darkness Ascending* update ([mmos.com](https://mmos.com/news/maplestory-launches-neo-darkness-ascending-part-one-update-increases-max-lvl-to-300)); still 300 in 2026 ([en.namu.wiki MapleStory/Level](https://en.namu.wiki/w/%EB%A9%94%EC%9D%B4%ED%94%8C%EC%8A%A4%ED%86%A0%EB%A6%AC/%EB%A0%88%EB%B2%A8)).
- **Therefore max theoretical Legion Level = 42 × 300 = 12,600.** (Derived.)
- **Rank caps out at 12,500**, so the last 100 levels buy nothing but Raid Power. StrategyWiki notes the exact minimum roster for Supreme Union 5: "26 Level 298 characters + 16 Level 297 characters (with up to 1 Zero)" — [strategywiki.org](https://strategywiki.org/wiki/MapleStory/Maple_Union).
- **8,000 Legion** is the widely-used practical target: it is Legendary Legion I (36 members) and is the hard gate for the **Legion Champion** system.
- **10,000 Legion** grants a permanent cosmetic: Dragon Lord Mount + King of Legion Chair, once per world — [maplestorywiki.net/w/Legion_System](https://maplestorywiki.net/w/Legion_System).

---

### 4. Legion Member Effects — full class table (GMS 2026)

Rules a calculator must implement:
- **Each job's effect applies only ONCE.** Placing two Bishops gives one Bishop effect (the higher rank). — [strategywiki.org](https://strategywiki.org/wiki/MapleStory/Maple_Union); KMS: "동일 직업이 2개 이상 공격대에 등록되어 있을 경우 1개의 공격대원 효과만 적용" — [maplestory.nexon.com](https://maplestory.nexon.com/Guide/N23GameInformation/Articles/407)
- Different jobs granting the **same** stat **do stack** (e.g. Hero + Paladin + Kaiser all give Final STR).
- **STR/DEX/INT/LUK from member effects are FINAL stat** — *not* multiplied by % stat bonuses. "The stat bonuses (STR, DEX, INT, and LUK) are final stat bonuses and are therefore not affected by % stat bonuses." — [maplestorywiki.net/w/Legion_System](https://maplestorywiki.net/w/Legion_System). (Contrast with the **board/grid** stats in §5, which *are* affected by % stat.)
- Effects apply **account-wide within that world**, to every character, but **only while that character is placed on the board** (this changes in Overdrive — see §7).

#### 4.1 Explorers

| Job | Class | Effect | B | A | S | SS | SSS |
|---|---|---|---|---|---|---|---|
| Hero | Warrior | Final STR | +10 | +20 | +40 | +80 | +100 |
| Paladin | Warrior | Final STR | +10 | +20 | +40 | +80 | +100 |
| Dark Knight | Warrior | Max HP % | +2% | +3% | +4% | +5% | +6% |
| Arch Mage (Fire, Poison) | Magician | Max MP % | +2% | +3% | +4% | +5% | +6% |
| Arch Mage (Ice, Lightning) | Magician | Final INT | +10 | +20 | +40 | +80 | +100 |
| Bishop | Magician | Final INT | +10 | +20 | +40 | +80 | +100 |
| Bow Master | Bowman | Final DEX | +10 | +20 | +40 | +80 | +100 |
| Marksman | Bowman | **Critical Rate** | +1% | +2% | +3% | +4% | +5% |
| Pathfinder | Bowman | Final DEX | +10 | +20 | +40 | +80 | +100 |
| Night Lord | Thief | **Critical Rate** | +1% | +2% | +3% | +4% | +5% |
| Shadower | Thief | Final LUK | +10 | +20 | +40 | +80 | +100 |
| Dual Blade | Thief | Final LUK | +10 | +20 | +40 | +80 | +100 |
| Buccaneer | Pirate | Final STR | +10 | +20 | +40 | +80 | +100 |
| Corsair | Pirate | Summon Duration | +4% | +6% | +8% | +10% | +12% |
| Cannoneer | Pirate | Final STR | +10 | +20 | +40 | +80 | +100 |

#### 4.2 Cygnus Knights

| Job | Class | Effect | B | A | S | SS | SSS |
|---|---|---|---|---|---|---|---|
| Dawn Warrior | Warrior | **Flat** Max HP | +250 | +500 | +1,000 | +2,000 | +2,500 |
| Mihile | Warrior | **Flat** Max HP | +250 | +500 | +1,000 | +2,000 | +2,500 |
| Blaze Wizard | Magician | Final INT | +10 | +20 | +40 | +80 | +100 |
| Wind Archer | Bowman | Final DEX | +10 | +20 | +40 | +80 | +100 |
| Night Walker | Thief | Final LUK | +10 | +20 | +40 | +80 | +100 |
| Thunder Breaker | Pirate | Final STR | +10 | +20 | +40 | +80 | +100 |

#### 4.3 Heroes

| Job | Class | Effect | B | A | S | SS | SSS |
|---|---|---|---|---|---|---|---|
| Aran | Warrior | 70% chance to recover % Max HP on attack | 2% | 4% | 6% | 8% | 10% |
| Evan | Magician | 70% chance to recover % Max MP on attack | 2% | 4% | 6% | 8% | 10% |
| Luminous | Magician | Final INT | +10 | +20 | +40 | +80 | +100 |
| Mercedes | Bowman | **Skill Cooldown reduction** | −2% | −3% | −4% | −5% | −6% |
| Phantom | Thief | Mesos Obtained | +1% | +2% | +3% | +4% | +5% |
| Shade (Eunwol) | Pirate | **Critical Damage** | +1% | +2% | +3% | **+5%** | +6% |

Mercedes footnote: cooldown reduction "Takes priority over equipment potential, and cooldown cannot be lower than 1 second. Does not apply to certain skills." — [maplestorywiki.net/w/Legion_System](https://maplestorywiki.net/w/Legion_System). StrategyWiki adds it is "applied before Potential cooldown reductions… additive with Cooldown Cutter Hypers."

#### 4.4 Resistance / Demon

| Job | Class | Effect | B | A | S | SS | SSS |
|---|---|---|---|---|---|---|---|
| Blaster | Warrior | **Ignored Enemy Defense** | +1% | +2% | +3% | **+5%** | +6% |
| Battle Mage | Magician | Final INT | +10 | +20 | +40 | +80 | +100 |
| Wild Hunter | Bowman | 20% chance on attack to deal +X% damage | 4% | 8% | 12% | 16% | 20% |
| Mechanic | Pirate | **Buff Duration** | +5% | +10% | +15% | +20% | +25% |
| Xenon | Thief/Pirate hybrid | Final STR **and** DEX **and** LUK | +5 | +10 | +20 | +40 | +50 |
| Demon Slayer | Warrior | Abnormal Status Resistance | +1 | +2 | +3 | +4 | +5 |
| Demon Avenger | Warrior | **Boss Damage** | +1% | +2% | +3% | **+5%** | +6% |

#### 4.5 Nova

| Job | Class | Effect | B | A | S | SS | SSS |
|---|---|---|---|---|---|---|---|
| Kaiser | Warrior | Final STR | +10 | +20 | +40 | +80 | +100 |
| Kain | Bowman | Final DEX | +10 | +20 | +40 | +80 | +100 |
| Cadena | Thief | Final LUK | +10 | +20 | +40 | +80 | +100 |
| Angelic Buster | Pirate | Final DEX | +10 | +20 | +40 | +80 | +100 |

#### 4.6 Transcendent / Friends World / Flora / Anima / Sengoku / Jianghu / Shine

| Job | Faction | Class | Effect | B | A | S | SS | SSS |
|---|---|---|---|---|---|---|---|---|
| Zero | Transcendent | Warrior | **EXP Obtained** | +4% | +6% | +8% | +10% | +12% |
| Kinesis | Friends World | Magician | Final INT | +10 | +20 | +40 | +80 | +100 |
| Adele | Flora | Warrior | Final STR | +10 | +20 | +40 | +80 | +100 |
| Illium | Flora | Magician | Final INT | +10 | +20 | +40 | +80 | +100 |
| Khali | Flora | Thief | Final LUK | +10 | +20 | +40 | +80 | +100 |
| Ark | Flora | Pirate | Final STR | +10 | +20 | +40 | +80 | +100 |
| Lara | Anima | Magician | Final INT | +10 | +20 | +40 | +80 | +100 |
| Hoyoung | Anima | Thief | Final LUK | +10 | +20 | +40 | +80 | +100 |
| **Ren** | Anima | Warrior | Movement Speed (& Max Move Speed) | +2% | +4% | +6% | +8% | +10% |
| Hayato | Sengoku | Warrior | **Critical Damage** | +1% | +2% | +3% | **+5%** | +6% |
| Kanna | Sengoku | Magician | **Boss Damage** | +1% | +2% | +3% | **+5%** | +6% |
| **Lynn** | Jianghu | Magician | **Ignored Enemy Defense** | +1% | +2% | +3% | **+5%** | +6% |
| **Mo Xuan** | Jianghu | Pirate | **Critical Damage** | +1% | +2% | +3% | **+5%** | +6% |
| **Sia Astelle** | Shine | Magician | **Abnormal Status Damage** | +1% | +2% | +3% | **+5%** | +6% |
| **Erel Light** | Shine | Warrior | **Boss Damage** | +1% | +2% | +3% | **+5%** | +6% |

#### 4.7 KMS-only (NOT in GMS as of Sept 2026)

| Job | Faction | Class | Effect | B | A | S | SS | SSS |
|---|---|---|---|---|---|---|---|---|
| **Lethe** | Demon | Magician | **All Stats** | +10 | +20 | +30 | +40 | +50 |
| | | | **and Max HP** | +500 | +1,000 | +1,500 | +2,000 | +2,500 |

Lethe released in KMS with Overdrive (v.1.2.416, 2026-07-04). Region availability confirmed **KMS: Available; JMS/CMS/GMS/MSEA/TMS: Unavailable** — [maplestorywiki.net/w/Lethe](https://maplestorywiki.net/w/Lethe).

#### 4.8 Sources & availability verification for §4

- Master table: [maplestorywiki.net/w/Legion_System](https://maplestorywiki.net/w/Legion_System) (Legion Member Effects section, per-faction)
- Cross-check: [strategywiki.org/wiki/MapleStory/Maple_Union](https://strategywiki.org/wiki/MapleStory/Maple_Union) (Bonus Stats table) — agrees on every shared row
- KMS official: [maplestory.nexon.com/Guide/N23GameInformation/Articles/407](https://maplestory.nexon.com/Guide/N23GameInformation/Articles/407) — agrees on every shared row
- Erel Light confirmed by **official GMS patch notes**, v.269 Ride the Lightning: "Legion Bonus — Boss Damage (+1% / +2% / +3% / +5% / +6%)" — [nexon.com/maplestory/news/update/41138](https://www.nexon.com/maplestory/news/update/41138/updated-6-16-v-269-ride-the-lightning-patch-notes)
- Sia Astelle confirmed by two sources: [maplestorywiki.net/w/Sia_Astelle](https://maplestorywiki.net/w/Sia_Astelle) ("Legion member effect: Abnormal Status Damage: +1/2/3/5/6%") and [grandislibrary.com/shine/sia-astelle](https://www.grandislibrary.com/shine/sia-astelle)
- Region availability verified per-class on maplestorywiki: **Mo Xuan** — KMS ✗, JMS ✗, CMS ✓, **GMS ✓**, MSEA ✓, TMS ✓ ([Mo_Xuan](https://maplestorywiki.net/w/Mo_Xuan)); **Lynn** — KMS ✗, all others ✓ incl. **GMS** ([Lynn](https://maplestorywiki.net/w/Lynn)); **Sia Astelle** — **GMS only** ([Sia_Astelle](https://maplestorywiki.net/w/Sia_Astelle)); **Erel Light** — **GMS only** ([Erel_Light](https://maplestorywiki.net/w/Erel_Light)); **Ren** — all servers ([Ren](https://maplestorywiki.net/w/Ren))

**⚠ DISAGREEMENT FLAGGED:** [strategywiki.org](https://strategywiki.org/wiki/MapleStory/Maple_Union) lists Mo Xuan as "only in CMS and TMS" and Lynn as "not in MSEA". Both are contradicted by maplestorywiki's per-class availability tables (above), which are more granular and more recently maintained. **Trust maplestorywiki: Mo Xuan and Lynn are both in GMS.**

#### 4.9 Retired classes — do NOT include

| Job | Status |
|---|---|
| **Beast Tamer** | Removed. Converted to **Lynn** in GMS on **May 1, 2024 (GMS v250)**. "Beast Tamer and Lynn have the same Link Skill and Legion effect" (i.e. IED). — [maplestorywiki.net/w/Beast_Tamer](https://maplestorywiki.net/w/Beast_Tamer), [maplestorywiki.net/w/Lynn](https://maplestorywiki.net/w/Lynn) |
| **Jett** | Removed. GMS/JMS ex-owners got "Trace of Jett", granting the Legion effect + maxed Link for 30 days. — [maplestorywiki.net/w/Jett](https://maplestorywiki.net/w/Jett) |
| **Zen** | TMS-only legacy class, long removed. |

**⚠ Older guides are stale here.** [ayumilove.net/maplestory-maple-union-guide/](https://ayumilove.net/maplestory-maple-union-guide/) still lists Beast Tamer, Jett and Zen and omits Lynn, Mo Xuan, Ren, Sia Astelle, Erel Light. Do not use it as a class source.

#### 4.10 Class count vs. slot count

Counting GMS-available jobs with Legion effects: 15 Explorer + 6 Cygnus + 6 Heroes + 7 Resistance/Demon + 4 Nova + Zero + Kinesis + 4 Flora + 3 Anima + 2 Sengoku + 2 Jianghu + 2 Shine = **53 unique jobs**. Max attacker slots = **45**. *(Derived count.)*

**Consequence:** even at Supreme Legion V you cannot place every job. A calculator should let the user select which 45 job effects to take, and should treat the 2 event blocks as free extra squares + free ATT/MATT.

---

### 5. Board / Grid Stat Values

#### 5.1 Inner Grid (12×10 = 120 squares; 8 areas × 15 squares)

Positions of these 8 areas **can be rearranged** by the player.
**These stats ARE affected by % stat bonuses** (unlike member effects) — "These stat bonuses are not final stat bonuses, meaning that they are affected by % stat bonuses." — [maplestorywiki.net/w/Legion_System](https://maplestorywiki.net/w/Legion_System)

| Inner stat | Per square | Squares in area | **Max from area** |
|---|---|---|---|
| STR | +5 | 15 | **+75** |
| DEX | +5 | 15 | **+75** |
| INT | +5 | 15 | **+75** |
| LUK | +5 | 15 | **+75** |
| Max HP | +250 | 15 | **+3,750** |
| Max MP | +250 | 15 | **+3,750** |
| Weapon Attack (ATT) | +1 | 15 | **+15** |
| Magic Attack (MATT) | +1 | 15 | **+15** |

#### 5.2 Outer Grid (320 squares at full board; 8 areas × 40 squares)

Positions **cannot** be rearranged. Listed starting from top-left, clockwise ([strategywiki.org](https://strategywiki.org/wiki/MapleStory/Maple_Union)).

| # | Outer stat | Per square | Squares in area (max board) | **Max from area** |
|---|---|---|---|---|
| 1 | Abnormal Status Resistance | +1 | 40 | **+40** |
| 2 | Monster EXP | +0.25% | 40 | **+10%** |
| 3 | **Critical Rate** | +1% | 40 | **+40%** |
| 4 | **Boss Damage** | +1% | 40 | **+40%** |
| 5 | Damage Against Normal Monsters | +1% | 40 | **+40%** |
| 6 | Buff Duration | +1% | 40 | **+40%** |
| 7 | **Ignored Enemy Defense** | +1% | 40 | **+40%** |
| 8 | **Critical Damage** | +0.50% | 40 | **+20%** |

Sources: [maplestorywiki.net/w/Legion_System](https://maplestorywiki.net/w/Legion_System) and [strategywiki.org/wiki/MapleStory/Maple_Union](https://strategywiki.org/wiki/MapleStory/Maple_Union) — identical values in both.

**⚠ DISAGREEMENT FLAGGED:** [ayumilove.net](https://ayumilove.net/maplestory-maple-union-guide/) lists **"Stance +1%/square"** as one of the outer areas and does not list "Damage Against Normal Monsters". Both wikis list Normal Monster Damage and no Stance. **Treat AyumiLove as outdated; there is no Stance area on the current board.** AyumiLove also lists Status Resistance as "+1%" — it is a flat +1, not a percentage.

#### 5.3 Grid stat totals achievable at various fill levels

Per-square values are linear, so totals are simply `squares_in_area × per_square_value`, capped by the area size available at your board size.

**Outer-area cap by board size** (the per-area ceiling — you can never exceed this even with spare squares):

| Legion Level | Rank | Board | Crit Rate max | Boss Dmg max | IED max | Normal Mob Dmg max | Buff Dur max | Crit Dmg max | EXP max | Status Res max |
|---|---|---|---|---|---|---|---|---|---|---|
| 500–1,999 | Nameless I–III | 12×10 | 0% | 0% | 0% | 0% | 0% | 0% | 0% | 0 |
| 2,000–2,999 | Nameless IV–V | 14×12 | 6% | 6% | 6% | 6% | 6% | 3.0% | 1.5% | 6 |
| 3,000–3,999 | Renowned I–II | 16×14 | 13% | 13% | 13% | 13% | 13% | 6.5% | 3.25% | 13 |
| 4,000–4,999 | Renowned III–IV | 18×16 | 21% | 21% | 21% | 21% | 21% | 10.5% | 5.25% | 21 |
| 5,000–5,999 | Renowned V / Heroic I | 20×18 | 30% | 30% | 30% | 30% | 30% | 15.0% | 7.5% | 30 |
| **6,000+** | Heroic II and up | **22×20** | **40%** | **40%** | **40%** | **40%** | **40%** | **20.0%** | **10.0%** | **40** |

*(Derived by multiplying the per-square values in §5.2 by the outer-squares-per-area figures in §2, both of which are directly cited.)* A Korean community write-up corroborates the mid-tier checkpoints: "베테랑 3단계 수준만 되어도 점령 효과로 크리티컬 데미지를 최대 10.5%까지 확보가 가능하며, 마스터 2단계까지 가면 크리티컬 데미지를 최대 20%까지" — i.e. Renowned III (Veteran 3) → Crit Dmg 10.5%, Heroic II (Master 2) → Crit Dmg 20%. Matches the table exactly. Source: [namu.wiki 메이플 유니온](https://namu.wiki/w/%EB%A9%94%EC%9D%B4%ED%94%8C%20%EC%9C%A0%EB%8B%88%EC%98%A8) (via search snippet; direct fetch 403s).

**Board-coverage budget by rank** (how many squares you actually have to spend). *Derived* = `members × squares_per_piece`, + 10 for the two GMS event blocks (SSS).

| Rank | Members | All members SS (×4) | All members SSS (×5) | +2 event blocks (SSS) |
|---|---|---|---|---|
| Nameless V (2,500) | 13 | 52 | 65 | 75 |
| Renowned I (3,000) | 18 | 72 | 90 | 100 |
| Renowned V (5,000) | 22 | 88 | 110 | 120 |
| Heroic II (6,000) | 28 | 112 | 140 | 150 |
| Heroic V (7,500) | 31 | 124 | 155 | 165 |
| **Legendary I (8,000)** | **36** | **144** | **180** | **190** |
| Legendary V (10,000) | 40 | 160 | 200 | 210 |
| Supreme III (11,500) | 43 | 172 | 215 | 225 |
| **Supreme V (12,500)** | **45** | **180** | **225** | **235** |

StrategyWiki gives one anchor point in the same form: "assuming you have reached Grand Master Union 1 with at least 36 Level 200 characters, you will have 36 attackers, each attacker taking 4 grids, so total you will have 144 grids of stats." — [strategywiki.org](https://strategywiki.org/wiki/MapleStory/Maple_Union). Matches the Legendary I / SS row above.

**Reference endgame allocation (derived, GMS Supreme V, 235 squares):**
- Max Boss Damage (40) + Crit Damage (40) + IED (40) = 120 outer squares, plus ~12 squares of inner path = **~132 squares**
- Leaves **~103 squares** for the 120-square inner grid (STR/ATT/HP etc.)
- OR swap one outer for Crit Rate (40%) if under-capped on crit.

*Caveats:* this ignores piece-shape packing losses, which are real — that is exactly why board solvers exist. Use [xenogents.github.io/LegionSolver](https://xenogents.github.io/LegionSolver/) (source: [github.com/Xenogents/LegionSolver](https://github.com/Xenogents/LegionSolver)) or [github.com/aviv943/LegionSolver2](https://github.com/aviv943/LegionSolver2) / [github.com/arixpsy/MS-Legion-Solver](https://github.com/arixpsy/MS-Legion-Solver) for exact packing.

#### 5.4 Board presets

Presets 1–2 are free and permanent. Presets 3–5 need a **Union Preset Ticket** from the coin shop (**150 coins**, 30 days per use, stackable to 180 days of expiry). Applying a preset *overwrites* the board with the stored layout rather than swapping, so toggling between two layouts needs two presets. — [strategywiki.org](https://strategywiki.org/wiki/MapleStory/Maple_Union)
*(In Overdrive this becomes 10 named presets — see §7.)*

---

### 6. Legion Raid Power and Legion Coin income

#### 6.1 Raid Power (Union Power) per attacker

`Union Power = LevelPower + CombatPowerContribution + 312,500`
— [strategywiki.org/wiki/MapleStory/Maple_Union](https://strategywiki.org/wiki/MapleStory/Maple_Union)

**Level Power** (note the deliberate dip at 100–139 — StrategyWiki flags it as intentional but unexplained):

| Attacker level | Level Power |
|---|---|
| 60–99 | 0.50 × Level³ |
| 100–139 | 0.40 × Level³ |
| 140–179 | 0.70 × Level³ |
| 180–199 | 0.80 × Level³ |
| 200–209 | 1.00 × Level³ |
| 210–219 | 1.10 × Level³ |
| 220–229 | 1.15 × Level³ |
| 230–239 | 1.20 × Level³ |
| 240–249 | 1.25 × Level³ |
| 250–259 | 1.30 × Level³ |
| 260–269 | 1.35 × Level³ |
| 270–279 | 1.40 × Level³ |
| 280–289 | 1.45 × Level³ |
| 290–299 | 1.50 × Level³ |
| 300+ | 1.55 × Level³ |

**Combat Power contribution** = `k × 750 × √(CombatPower + 30,000)`, where k is:

| Combat Power | k | Combat Power | k |
|---|---|---|---|
| 0–499,999 | 2.00 | 100,000,000–124,999,999 | 2.45 |
| 500,000–999,999 | 2.05 | 125,000,000–149,999,999 | 2.50 |
| 1,000,000–4,999,999 | 2.10 | 150,000,000–174,999,999 | 2.55 |
| 5,000,000–9,999,999 | 2.15 | 175,000,000–199,999,999 | 2.60 |
| 10,000,000–19,999,999 | 2.20 | 200,000,000–249,999,999 | 2.65 |
| 20,000,000–39,999,999 | 2.25 | 250,000,000–299,999,999 | 2.70 |
| 40,000,000–59,999,999 | 2.30 | 300,000,000–349,999,999 | 2.75 |
| 60,000,000–79,999,999 | 2.35 | 350,000,000–399,999,999 | 2.80 |
| 80,000,000–99,999,999 | 2.40 | 400,000,000–499,999,999 | 2.85 |
| | | 500,000,000+ | 2.90 |

Combat Power is **snapshotted at logout** and frozen until that character logs back in. — [strategywiki.org](https://strategywiki.org/wiki/MapleStory/Maple_Union)

#### 6.2 Legion Coin income rates

| Source | Rate |
|---|---|
| Damage-based accrual | **1 coin per 100,000,000,000 (100 billion) damage** dealt to the raid dragon |
| Equivalent passive rate | **1 coin per 1,251,251.26 Raid Power per 24h**, i.e. **1,000,000 Raid Power ≈ 0.7992 coins/day** |
| Rounding | Rounded down; partial damage resets at 12:00 AM |
| Daily quest | **2 quests: 10 + 20 coins** (kill monsters in the raid battlefield) |
| Weekly quest (Dame Appropriation) | **200 coins** for defeating 100 Dragon Whelps (any kind, excl. Golden Wyvern) + 20 Golden Wyverns |

Sources: [strategywiki.org/wiki/MapleStory/Maple_Union](https://strategywiki.org/wiki/MapleStory/Maple_Union) (damage rate, 1,251,251.26 figure, 10+20 daily quests) · [maplestorywiki.net/w/Legion_System](https://maplestorywiki.net/w/Legion_System) ("Currently, every 1 million Raid Power generates 0.7992 Coins after 24 hours"; weekly 200-coin quest).

**⚠ MINOR DISAGREEMENT:** StrategyWiki describes the coin quests as *daily* (10 + 20); maplestorywiki describes a *weekly* 200-coin quest. Both may be simultaneously true (separate quests), and the reset cadence changed: the **Assemble** update "unified weekly content reset on Thursdays, including… Legion coin shop" — [maplestorywiki.net/w/MapleStory:_Assemble](https://maplestorywiki.net/w/MapleStory:_Assemble). Verify in-game. Marked **PARTIALLY UNVERIFIED**.

#### 6.3 Unclaimed coin cap by tier

| Tier | Cap |
|---|---|
| Nameless Legion (Novice) | 200 |
| Renowned Legion (Veteran) | 300 |
| Heroic Legion (Master) | 500 |
| Legendary Legion (Grand Master) | 900 |
| **Supreme Legion** | **1,300** |

Coins accrue only up to the cap; excess is **forfeited**, with one in-game notification per login. Claim by pressing "Claim Coins", or by entering and exiting the Legion Raid map and speaking to the exit NPC. Coins are shared across the whole account **within that world**.
Sources: [maplestorywiki.net/w/Legion_System](https://maplestorywiki.net/w/Legion_System) · [strategywiki.org](https://strategywiki.org/wiki/MapleStory/Maple_Union) · [maplestory.nexon.com](https://maplestory.nexon.com/Guide/N23GameInformation/Articles/407) (등급별 누적 가능 코인수: 슈프림 1300 / 그랜드마스터 900 / 마스터 500 / 베테랑 300 / 노비스 200 — all three agree).

#### 6.4 Legion Coin Shop (weekly limits; reset Monday 12 AM per StrategyWiki, moved to Thursday by Assemble)

Progression-relevant items only:

| Item | Cost | Limit |
|---|---|---|
| Union's Strength Stage 1 / 2 / 3 (ATT & MATT +30 for 10/20/30 min) | 10 / 20 / 30 | 20 each |
| Union's EXP Stage 1 / 2 / 3 (2× EXP for 10/20/30 min) | 30 / 50 / 70 | 20 each |
| Union's Luck Stage 1 / 2 / 3 (Drop Rate +50%) | 30 / 50 / 70 | 20 each |
| Union's Wealth Stage 1 / 2 / 3 (Meso Drop +50%) | 30 / 50 / 70 | 20 each |
| Clean Slate Scroll 10% | 60 | 3 |
| Epic Potential Scroll 100% | 300 | 2 |
| Additional Potential Scroll 100% | 200 | 2 |
| Carved Golden Stamp | 40 | 3 |
| Karma Master Craftsman's Cube / Karma Yellow Cube | 100 | 30 per world |
| Crimson Resurrection Flame | 100 | 3 |
| Karma Crimson / Rainbow / Black Resurrection Flame | 50 / 150 / 250 | 20 / 20 / 40 per world |
| Basic / Intermediate / Advanced Union Meso Box | 30 / 50 / 70 | 50 / 30 / 20 |
| Basic / Intermediate / Advanced Union Growth Potion (49% EXP + 2× buff; Lv 100–129 / 130–159 / 160–179) | 75 / 110 / 150 | 5 each |
| Union Preset (unlocks 1 preset slot, 30 days) | 150 | 3 |
| Arcane Symbol Catalyst (non-Reboot) | 300 | 3 |
| Authentic Symbol Catalyst (non-Reboot) | 500 | 3 |

Source: [strategywiki.org/wiki/MapleStory/Maple_Union](https://strategywiki.org/wiki/MapleStory/Maple_Union)

**⚠ 2026 GMS CHANGE:** "Legion Shop 2x EXP coupons will be replaced with stronger **3x variants**" as part of the OVERDRIVE 2026 roadmap — [gamemarket.gg Ride the Lightning guide](https://gamemarket.gg/news/maplestory-global/ride-the-lightning-maplestory-overdrive-summer-2026-update-guide). **UNVERIFIED against official patch notes** — treat the 2× values above as possibly superseded.

---

### 7. The Overdrive Legion Rework (KMS live July 2026 · GMS expected Nov/Dec 2026)

This is the single biggest 2025/2026 change and will invalidate the board model.

#### 7.1 What changes

| Old (current GMS) | New (Overdrive) |
|---|---|
| Tetris grid, pieces placed by shape | **Grid removed entirely.** Points allocated to stats freely |
| Member effect applies **only if placed** on the board | **Every character at Rank B or higher grants its effect, regardless of raid composition** |
| Legion Raid battle map you can enter and attack | **Raid battle map removed**; Raid Combat Power auto-calculated from your highest-Combat-Power characters |
| 5 presets (3 paid, 30-day) | **10 presets**, with naming |
| Legion Champion: 4 slots | **5th slot** unlocked (requires all Champions at Rank S+) |

Sources: [maplestorywiki.net/w/MapleStory:_Overdrive](https://maplestorywiki.net/w/MapleStory:_Overdrive) — "Legion Board changed to Legion Points, where players can distribute various Legion Stats based on the Character Rank"; "Removal of Legion Raid battle map, while Legion Raid Job effect changed to Legion Stat effect"; "Raid member effects now apply to any character with Character Rank B or higher"; "Legion Stat presets increased to 10, with new naming feature". Also [orangemushroom.net KMS v.1.2.416](https://orangemushroom.net/2026/07/04/kms-ver-1-2-416-maplestory-overdrive-ruler-of-covenants-lethe/) and [orangemushroom.net Summer 2026 Showcase](https://orangemushroom.net/2026/06/14/2026-maplestory-summer-showcase-overdrive/) ("Previously, you would only receive the attacker effects of characters placed on the board, but now you will receive all of their effects by default").

#### 7.2 Legion Points earned

Identical mapping to the old piece sizes:

| Character Rank | Level (Zero) | Legion / Union Points |
|---|---|---|
| B | 60 (130) | 1 |
| A | 100 (160) | 2 |
| S | 140 (180) | 3 |
| SS | 200 | 4 |
| SSS | 250 | 5 |

Source: [maplestory.nexon.com official guide](https://maplestory.nexon.com/Guide/N23GameInformation/Articles/407) · [maplestorywiki.net/w/Legion_System](https://maplestorywiki.net/w/Legion_System) · [orangemushroom.net v.1.2.416](https://orangemushroom.net/2026/07/04/kms-ver-1-2-416-maplestory-overdrive-ruler-of-covenants-lethe/)

**Max points = 45 members × 5 = 225** — exactly equal to the old max board coverage from attackers. *(Derived; strongly implies a 1 point = 1 square conversion.)*

#### 7.3 Union Stats: Base vs Expanded

**Base Stats** — available immediately, **max level 15 each**: STR, DEX, INT, LUK, Attack Power, Magic Attack, Max HP, Max MP.
**Expanded Stats** — unlock as Legion Level grows, **max level 40 each**: Critical Damage, Boss Damage, Ignored Enemy Defense, Critical Rate, Buff Duration, Normal Monster Damage, EXP Obtained, Abnormal Status Resistance.

Source (verbatim, KMS official): "기본 스탯은 유니온 시스템 오픈 시 즉시 획득할 수 있는 기본 버프 효과로 최대 15레벨까지 성장 가능… 확장 스탯은 유니온 성장에 따라 추가로 오픈되며 최대 40레벨까지 성장 가능" — [maplestory.nexon.com/Guide/N23GameInformation/Articles/407](https://maplestory.nexon.com/Guide/N23GameInformation/Articles/407)

**Expanded stat max level by Legion Level (NEW gating — differs from the old board!):**

| Legion Level | Union Rank | Expanded stat max level |
|---|---|---|
| < 2,000 | — | **0** |
| 2,000 | Novice 4 / Nameless IV | **5** |
| 3,000 | Veteran 1 / Renowned I | **10** |
| 4,000 | Veteran 3 / Renowned III | **20** |
| 5,000 | Veteran 5 / Renowned V | **30** |
| 6,000 | Master 2 / Heroic II | **40** |

Source: [maplestory.nexon.com](https://maplestory.nexon.com/Guide/N23GameInformation/Articles/407) (유니온 레벨별 확장 스탯 최대 레벨 table).

**⚠ Note the change:** old board outer caps were 0 / 6 / 13 / 21 / 30 / 40 at the same Legion Levels; the new point caps are **0 / 5 / 10 / 20 / 30 / 40**. Slightly stingier at 3,000–4,000.

#### 7.4 Per-point stat values — **UNVERIFIED (high-confidence inference)**

I could not find an official or wiki table of the per-level values in the new system (namu.wiki, the likely source, 403s on direct fetch). However:

- Base stat max level = **15** = old inner-area squares (15)
- Expanded stat max level = **40** = old outer-area squares (40)
- Max points (225) = old max attacker coverage (225)
- A Korean community source describes the endgame result as identical to the old board: "유니온 8000을 달성하면 크뎀 20%, 보공 40%, 방무 40%, 기타 스탯 및 공/마, 벞지, 크확 증가 효과를 받을 수 있습니다" (at Union 8,000: Crit Dmg 20%, Boss Dmg 40%, IED 40%) — [namu.wiki 메이플 유니온](https://namu.wiki/w/%EB%A9%94%EC%9D%B4%ED%94%8C%20%EC%9C%A0%EB%8B%88%EC%98%A8) (via search snippet). Crit Dmg 20% at level 40 ⇒ **0.5%/level**; Boss/IED 40% at level 40 ⇒ **1%/level**. Identical to §5.2.

**Conclusion (mark as inferred in the calculator):** per-point values are almost certainly unchanged from the per-square values in §5.1 and §5.2 — STR/DEX/INT/LUK +5, HP/MP +250, ATT/MATT +1 per base level; Crit Rate/Boss/Normal/Buff/IED +1%, Crit Dmg +0.5%, EXP +0.25%, Status Res +1 per expanded level. **Re-verify when GMS ships the update.**

#### 7.5 Practical impact for a gear-progression calculator

1. **The 235-square ceiling disappears as a *shape* problem** — it becomes a clean 225-point budget. No packing losses. Boards that lost squares to piece geometry will effectively gain stats.
2. **All member effects become free.** Under the current grid you must choose 45 of 53 jobs; after Overdrive every job you have at Rank B+ contributes. This is a meaningful, one-time account-wide damage bump. Model it.
3. **Legion Raid manual attacking disappears** as a coin source.

---

### 8. Adjacent Legion subsystems (relevant to a progression calculator)

#### 8.1 Legion Champion (live in GMS)

Requires **a Level 260+ character and Legion Level 8,000+**. Up to 4 Champion slots (5 in KMS post-Overdrive, 6 designed). Removing a Champion costs **1 billion mesos** and resets that character's ranks. Cannot register two characters of the same job.

**Champion Insignia — permanent, stacks across Champions, applies to all registered Champions:**

| Champion Rank | How to reach it | Insignia stat granted |
|---|---|---|
| C | Automatic on registration | — |
| B | Solo **Hard Lotus** in Champion mode, ≤20 min | All Stats **+20**, Max HP/MP **+1,000** |
| A | Solo **Hard Verus Hilla**, ≤20 min | ATT / MATT **+10** |
| S | Solo **Hard Black Mage**, ≤45 min | **Boss Damage +5%** |
| SS | Solo **Hard Chosen Seren**, ≤20 min | **Critical Damage +3%** |
| SSS | Solo **Normal Kalos the Guardian**, ≤20 min | **Ignored Enemy Defense +5%** |

Slot unlocks: 3rd = all 2 Champions at A+; 4th = all 3 at A+; 5th = all 4 at S+; 6th = all 5 at SS+.
**Overdrive change:** all time limits standardized to 20 minutes, with a 30% final damage reduction buff applied (25% for Black Mage).

**Champion's Renown** (30-min skill, castable only by Champions, fueled by Champion Coins from monthly Champion Raid: Draco Isle; 4,000 coins to max everything; unused coins reset on the 1st of each month):

| Stat | Lv1 | Lv2 | Lv3 | Lv4 | Lv5 | Cost (cumulative per level) |
|---|---|---|---|---|---|---|
| All Stats / Max HP | +10/+500 | +20/+1,000 | +30/+1,500 | +40/+2,000 | +50/+2,500 | 50/125/200/300/500 |
| ATT / MATT | +5 | +10 | +15 | +20 | +25 | 50/125/200/300/500 |
| Boss Damage | +2% | +4% | +6% | +8% | +10% | 50/125/200/300/500 |
| Ignored Enemy Defense | +2% | +4% | +6% | +8% | +10% | 50/125/200/300/500 |
| Critical Damage | +0.50% | +1.00% | +1.50% | +2.00% | +2.50% | 50/125/200/300/500 |
| Additional EXP | +5% | +10% | +15% | +20% | +25% | 150/375/600/900/1,500 |

Source: [maplestorywiki.net/w/Legion_Champion](https://maplestorywiki.net/w/Legion_Champion). Available in all six services incl. GMS. Introduced in the NEXT / Stargazer update — [maplestorywiki.net/w/MapleStory:_NEXT](https://maplestorywiki.net/w/MapleStory:_NEXT) ("New Legion Champion system, requiring a Level 260+ character and 8,000+ total Legion Level to unlock").

#### 8.2 Legion Artifact (live in GMS)

Replaces Monster Life; introduced in the Dreamer / GO WEST! update. **3 Crystals by default, +1 at Artifact Level 10 and every 10 levels after, to a maximum of 9 Crystals at Artifact Level 60.** Each Crystal grants **3 lines of stats** and can be leveled to **Level 5** with Artifact AP. Max Artifact Level 60 requires **1,342,550 total Artifact EXP** and yields **20,000 max Artifact Points**.

**Per-stat caps across the whole Artifact system:**

| Stat | Cap | Stat | Cap |
|---|---|---|---|
| All Stats | +150 | Critical Rate | +20% |
| Max HP / MP | +7,500 | Critical Damage | +4% |
| ATT / MATT | +30 | +1 multi-target hit & EXP | +12% |
| Damage | +15% | Status Resistance | +12 |
| Boss Damage | +15% | Summon Duration | +20% |
| Ignored Enemy Defense | +20% | Final Attack Skill Damage | +30% |
| Buff Duration | +20% | Mesos Obtained | +12% |
| Cooldown Skip Chance | +7.5% | Item Drop Rate | +12% |

Source: [maplestorywiki.net/w/Legion_Artifact](https://maplestorywiki.net/w/Legion_Artifact)

---

### 9. 2025–2026 change log for Legion (chronological)

| Update | Service / date | Legion change |
|---|---|---|
| **NEXT** (GMS: **Stargazer**) | GMS ~June 2025 | **Legion Champion** system added (Lv 260+ char, 8,000+ Legion Level). Legion attacker placement mode improvements; filter added to separate attackers by job branch. — [maplestorywiki.net/w/MapleStory:_NEXT](https://maplestorywiki.net/w/MapleStory:_NEXT) |
| **NEXT / Stargazer** | GMS June 11 2025 | **Sia Astelle** released (GMS-exclusive Shine Magician), Legion effect Abnormal Status Damage +1/2/3/5/6% — [maplestorywiki.net/w/Sia_Astelle](https://maplestorywiki.net/w/Sia_Astelle) |
| **Assemble** | 2025 | Weekly reset unified to Thursdays, **including the Legion coin shop**. Additional Event Legion Block obtainable from event rewards. — [maplestorywiki.net/w/MapleStory:_Assemble](https://maplestorywiki.net/w/MapleStory:_Assemble) |
| **Crown** (GMS: **Ride The Lightning**) | KMS Dec 2025 / **GMS v.269, June 17 2026** | **Legion rank-ups are now FREE** — no coin cost, auto-promotes on reaching the Legion Level, including levels gained via World Leap. — [maplestorywiki.net/w/MapleStory:_Crown](https://maplestorywiki.net/w/MapleStory:_Crown) |
| **Ride The Lightning** | **GMS v.269, June 17 2026** | **Erel Light** released (GMS-exclusive Shine Warrior), Legion Bonus Boss Damage +1/2/3/5/6% — [official patch notes](https://www.nexon.com/maplestory/news/update/41138/updated-6-16-v-269-ride-the-lightning-patch-notes) |
| **Overdrive** | **KMS v.1.2.416, July 4 2026** | **Full Legion rework**: grid → points; raid map removed; all B+ characters grant effects; 10 named presets; Champion 5th slot. **Lethe** added (KMS only). — [orangemushroom.net](https://orangemushroom.net/2026/07/04/kms-ver-1-2-416-maplestory-overdrive-ruler-of-covenants-lethe/) · [maplestorywiki.net/w/MapleStory:_Overdrive](https://maplestorywiki.net/w/MapleStory:_Overdrive) |
| **Overdrive (GMS)** | **expected late Nov / Dec 2026** | "A full Legion board revamp replaces the clunky Tetris-style layout with a clean V Matrix-inspired interface for simpler stat management." — [mmoexp GMS roadmap](https://www.mmoexp.com/News/maplestory-gms-update-roadmap-august-november-2026-events-qol-new-class-endgame-overhauls.html). **Not yet in GMS as of 2026-09-06. UNVERIFIED against an official Nexon roadmap post** — mmoexp is a third-party aggregator. |
| **Legion Ranking removal** | earlier | The weekly "Ruler of the Legion" coin ranking (top 100 → Legion Rank Mount, 7-day) was **removed**. Replaced with a permanent reward at **10,000 Legion Level**: Dragon Lord Mount + King of Legion Chair. — [maplestorywiki.net/w/Legion_System](https://maplestorywiki.net/w/Legion_System) |

**No new Legion Ranks beyond Supreme V and no raised member cap beyond 45** were found in any 2025–2026 source. Supreme Legion ranks (and the 41–45 member counts) were added back in **Patch 253** per a search-result summary of [maplestorywiki.net/w/Legion_System](https://maplestorywiki.net/w/Legion_System) — I could not locate that exact sentence in the current page text, so treat the patch number as **UNVERIFIED**; the ranks themselves are firmly confirmed.

---

### 10. Gaps / things to verify in-game or later

| # | Gap | Status |
|---|---|---|
| 1 | **Per-point stat values in the Overdrive points system** | **UNVERIFIED** — strongly inferred as identical to per-square values (§7.4). No official numeric table found. |
| 2 | **Exact GMS date/version for the Legion revamp** | Third-party roadmap only ("late Nov/Dec 2026"). No official Nexon post located. |
| 3 | **Legion coin quest cadence** (daily 10+20 vs weekly 200) | Sources disagree; reset day moved to Thursday. Verify in-game. |
| 4 | **3× EXP coupons replacing 2× in the Legion shop** | Reported by a third-party guide; not confirmed in official patch notes. |
| 5 | **Legion Coin Shop 2026 pricing/limits** | StrategyWiki table may be stale (it still lists the removed rank-up coin costs). |
| 6 | **Exact minimum square count for a given outer-stat combination** | Depends on piece-shape packing; use a solver rather than a closed-form number. The "132 squares" figure is a forum estimate. |
| 7 | **MapleStory M block ranks** | KMS official and maplestorywiki disagree (see §1.3). KMS-only; irrelevant to GMS. |
| 8 | **Whether "Abnormal Status Damage" (Sia Astelle) is a distinct multiplier** from Boss/Normal damage | Not investigated. Rare stat; likely only applies to enemies afflicted with a status. |

---

### 11. Source index

**Primary (used for numeric tables):**
- [maplestorywiki.net/w/Legion_System](https://maplestorywiki.net/w/Legion_System) — most complete, GMS terminology, current through Overdrive
- [maplestory.nexon.com/Guide/N23GameInformation/Articles/407](https://maplestory.nexon.com/Guide/N23GameInformation/Articles/407) — **KMS official union guide**, already updated for Overdrive
- [strategywiki.org/wiki/MapleStory/Maple_Union](https://strategywiki.org/wiki/MapleStory/Maple_Union) — best for formulas (Raid Power, coin rates) and coin shop; **stale on rank-up costs and class availability**
- [nexon.com/maplestory/news/update/41138](https://www.nexon.com/maplestory/news/update/41138/updated-6-16-v-269-ride-the-lightning-patch-notes) — official GMS v.269 patch notes
- [maplestorywiki.net/w/Legion_Champion](https://maplestorywiki.net/w/Legion_Champion) · [maplestorywiki.net/w/Legion_Artifact](https://maplestorywiki.net/w/Legion_Artifact)
- [maplestorywiki.net/w/MapleStory:_Overdrive](https://maplestorywiki.net/w/MapleStory:_Overdrive) · [maplestorywiki.net/w/MapleStory:_Crown](https://maplestorywiki.net/w/MapleStory:_Crown) · [maplestorywiki.net/w/MapleStory:_NEXT](https://maplestorywiki.net/w/MapleStory:_NEXT) · [maplestorywiki.net/w/MapleStory:_Assemble](https://maplestorywiki.net/w/MapleStory:_Assemble)
- [orangemushroom.net — KMS v.1.2.416 Overdrive](https://orangemushroom.net/2026/07/04/kms-ver-1-2-416-maplestory-overdrive-ruler-of-covenants-lethe/) · [orangemushroom.net — 2026 Summer Showcase](https://orangemushroom.net/2026/06/14/2026-maplestory-summer-showcase-overdrive/)
- [github.com/Xenogents/LegionSolver](https://github.com/Xenogents/LegionSolver) — board geometry and piece shapes, machine-readable

**Class availability verification:**
[Mo_Xuan](https://maplestorywiki.net/w/Mo_Xuan) · [Lynn](https://maplestorywiki.net/w/Lynn) · [Sia_Astelle](https://maplestorywiki.net/w/Sia_Astelle) · [Erel_Light](https://maplestorywiki.net/w/Erel_Light) · [Lethe](https://maplestorywiki.net/w/Lethe) · [Ren](https://maplestorywiki.net/w/Ren) · [Beast_Tamer](https://maplestorywiki.net/w/Beast_Tamer) · [Jett](https://maplestorywiki.net/w/Jett) · [grandislibrary.com/shine/sia-astelle](https://www.grandislibrary.com/shine/sia-astelle)

**Secondary / corroborating (lower confidence):**
- [namu.wiki 메이플 유니온](https://namu.wiki/w/%EB%A9%94%EC%9D%B4%ED%94%8C%20%EC%9C%A0%EB%8B%88%EC%98%A8) — accessible only via search snippets (403 on direct fetch)
- [mmoexp GMS Aug–Nov 2026 roadmap](https://www.mmoexp.com/News/maplestory-gms-update-roadmap-august-november-2026-events-qol-new-class-endgame-overhauls.html) · [gamemarket.gg Ride the Lightning guide](https://gamemarket.gg/news/maplestory-global/ride-the-lightning-maplestory-overdrive-summer-2026-update-guide) — third-party aggregators
- [forums.maplestory.nexon.net/discussion/18849](https://forums.maplestory.nexon.net/discussion/18849) — community "132 squares" figure
- [mmos.com — level cap 300](https://mmos.com/news/maplestory-launches-neo-darkness-ascending-part-one-update-increases-max-lvl-to-300)

**Known-stale — do not use for class data:**
- [ayumilove.net/maplestory-maple-union-guide/](https://ayumilove.net/maplestory-maple-union-guide/) — lists removed classes (Beast Tamer, Jett, Zen), missing 2024–2026 classes, lists a non-existent "Stance" outer area
- [ascally.com/maplestory-legion-link-guide/](https://ascally.com/maplestory-legion-link-guide/) — dated Sept 30, 2020

---


## 3. Symbols (Arcane, Sacred/Authentic, Grand Sacred)

> Researched independently. Section D (Force mechanics) was additionally cross-checked by me against the Korean namu.wiki articles — see Appendix B.

**Research date:** 2026-09-06. **Primary target:** GMS (Global MapleStory), current live version (post *Ride The Lightning* Part 2 — Geardock/Jupiter live; the *Post-Ride The Lightning* / Frieren update lands **2026-09-09**, i.e. 3 days after this document, and changes symbol acquisition rates — see §E).

**Source-reliability note.** Every number below carries an inline source URL. The two backbone sources are:

- **MapleStory Wiki (maplestorywiki.net)** — item pages carry the in-game item tooltips and the exact per-level cost tables, and are actively maintained for 2026 content (Geardock, Grand Sacred Symbols). Note: this site 403s generic fetchers; content was retrieved via its MediaWiki API (`/api.php?action=parse&prop=wikitext`).
- **StrategyWiki `MapleStory/Arcane River` and `MapleStory/Grandis`** — carries the published *formulas* (the force damage-adjustment rules), maintained by a MapleSEA player.
- **KPRobin's Arcane/Authentic Force spreadsheet** (MapleSEA, updated through Geardock/Tallahart) — the per-map/per-boss force requirement + tier-breakpoint table. https://kprobin.blogspot.com/2019/01/arcane-force-extra-damage-and-monster.html → sheet https://docs.google.com/spreadsheets/d/1sJSM7iZDP9e4GRfhGvhfpnGWYVwh2AaeywUIhi4F4Ec/

Where two sources disagree, both are cited and the disagreement is flagged (§G).

---

#### 0. Naming and taxonomy

| Server | Tier 1 (Arcane River) | Tier 2 (Western Grandis) | Tier 3 (Western Grandis, Lv290+) |
|---|---|---|---|
| GMS | Arcane Symbol / **Arcane Power** (a.k.a. Arcane Force) | **Sacred Symbol** / **Sacred Power** | **Grand Sacred Symbol** |
| MSEA | Arcane Symbol | **Authentic Symbol** | Grand Authentic Symbol |
| KMS | 아케인심볼 | **어센틱심볼** (Authentic Symbol) | 그랜드 어센틱심볼 |
| JMS | — | オーセンティックシンボル | グランドオーセンティックシンボル |
| CMS | — | 原初徽章 ("Primordial Badge") | 豪华原初徽章 |
| TMS | — | 真實符文 | 豪華真實符文 |

Source (naming table): https://maplestorywiki.net/w/Sacred_Symbol and https://maplestorywiki.net/w/Grand_Sacred_Symbol and https://maplestorywiki.net/w/Sacred_Symbol:_Cernium

**Critical modelling point:** Sacred Symbols and Grand Sacred Symbols feed the **same single stat pool** ("Sacred Power / Authentic Force"). There is no separate "Grand" force. Arcane Power is a *separate*, independent stat with *different* mechanics (§D).

The in-game tooltip glyphs are ✦ for ARC (Arcane) and ⬢ for SAC/AUT (Sacred/Authentic) — used consistently on the wiki's boss pages, e.g. https://maplestorywiki.net/w/Hilla/Monster_(Reborn)

---

### A. ARCANE SYMBOLS

#### A.1 Regions and the six symbols

| Symbol | Region unlock level | Initial quest | Daily quest | Weekly Special Content |
|---|---|---|---|---|
| Arcane Symbol: Vanishing Journey | 200 | [Vanishing Journey] Arcane Symbol: Vanishing Journey | Vanishing Journey Research | Erda Spectrum |
| Arcane Symbol: Chu Chu Island | 210 | [Chu Chu] Goodbye, Chu Chu Island | Chu Chu's Finest Cuisine | Hungry Muto |
| Arcane Symbol: Lachelein | 220 | [Lachelein] Nightmare Clocktower 4F | A Night's Peace in Lachelein | Midnight Chaser |
| Arcane Symbol: Arcana | 225 | [Arcana] The Harmony of the Forest | Peace in Arcana | Spirit Savior |
| Arcane Symbol: Morass | 230 | [Morass] Her Purpose | Save the Morass | Ranheim Defense |
| Arcane Symbol: Esfera | 235 | [Esfera] Mirrors in Mirrors | Esfera Research Orders | Esfera Guardian |

Sources: https://maplestorywiki.net/w/Arcane_Symbol (symbol/quest table); entry levels from https://strategywiki.org/wiki/MapleStory/Arcane_River

Regions **without** their own symbol (they drop/reward the adjacent region's symbol): Reverse City (→ VJ), Yum Yum Island (→ Chu Chu), Sellas/Celestars, Tenebris (Moonbridge, Labyrinth of Suffering, Limina) — these require Arcane Force but grant no new symbol. Source: https://strategywiki.org/wiki/MapleStory/Arcane_River

There is also a **non-levelable starter "Arcane Symbol"** from `[5th Job] A Greater Power`: **Arcane Power +40, Main Stat +300** (DA: +6,300 HP; Xenon: +144 all). It is deleted from the inventory once you complete `[Vanishing Journey] Arcane Symbol: Vanishing Journey`. Source: https://maplestorywiki.net/w/Arcane_Symbol_(Equipment)

#### A.2 Stat per level — identical for all six regions

**All six Arcane Symbols share the exact same stat table.** Verified individually on all six wiki pages (VJ, Chu Chu, Lachelein, Arcana, Morass, Esfera) — the "Extra Stats / Effects" blocks are byte-identical.

| | Level 1 | Per additional level | Level 20 (cumulative) |
|---|---|---|---|
| **Arcane Power (AF)** | **+30** | **+10** | **+220** |
| **Main Stat** (all jobs except Xenon/DA) | **+300** | **+100** | **+2,200** |
| **HP** (Demon Avenger only) | **+6,300** | **+2,100** | **+46,200** |
| **STR / DEX / LUK** (Xenon only, each) | **+144** | **+48** | **+1,056** |

Sources (all six, identical): https://maplestorywiki.net/w/Arcane_Symbol:_Vanishing_Journey · https://maplestorywiki.net/w/Arcane_Symbol:_Chu_Chu_Island · https://maplestorywiki.net/w/Arcane_Symbol:_Lachelein · https://maplestorywiki.net/w/Arcane_Symbol:_Arcana · https://maplestorywiki.net/w/Arcane_Symbol:_Morass · https://maplestorywiki.net/w/Arcane_Symbol:_Esfera

**Closed form (per symbol, level L, 1 ≤ L ≤ 20):**
```
ArcaneForce(L)  = 20 + 10*L          # = 30 at L1, 220 at L20
MainStat(L)     = 200 + 100*L        # normal jobs
DA_HP(L)        = 4200 + 2100*L
Xenon_each(L)   = 96 + 48*L          # STR, DEX and LUK each
```
StrategyWiki states the same thing as a rate: *"100 Final Primary Stat per 10 Arcane Force from Arcane Symbols; Xenon: 48 STR/DEX/LUK per 10 AF; Demon Avenger: 2,100 Final HP per 10 AF"* — plus the flat "+20 AF per unique Arcane Symbol equipped" base. Source: https://strategywiki.org/wiki/MapleStory/Arcane_River

**Level cap is 20.** Confirmed by the cost tables ending at `Level 19→20` and by "Cumulative Stats at Max Level: Arcane Power +220". No 2025/2026 patch raised it — the KMS *Crown* (2026-02), *23rd Anniversary* (2026-03) and *Overdrive* (2026-06) update pages list symbol **acquisition** changes but **no cap change**. Sources: https://maplestorywiki.net/w/MapleStory:_Crown · https://maplestorywiki.net/w/MapleStory:_Crown/Post-Update · https://maplestorywiki.net/w/MapleStory:_Overdrive
*(Historical: the cap was 15 at 5th-job release — see the Lucid page footnote "At 5th job release, the maximum level of Arcane Symbols was 15, so 3 maxed symbols would mean 360 ARC" https://maplestorywiki.net/w/Lucid/Monster)*

##### Per-level cumulative reference (any Arcane region)

| Symbol Lv | AF (this symbol) | Cum. AF if all 6 at this level | Main stat (this symbol) | Cum. main stat, all 6 |
|---|---|---|---|---|
| 1 | 30 | 180 | 300 | 1,800 |
| 2 | 40 | 240 | 400 | 2,400 |
| 3 | 50 | 300 | 500 | 3,000 |
| 4 | 60 | 360 | 600 | 3,600 |
| 5 | 70 | 420 | 700 | 4,200 |
| 6 | 80 | 480 | 800 | 4,800 |
| 7 | 90 | 540 | 900 | 5,400 |
| 8 | 100 | 600 | 1,000 | 6,000 |
| 9 | 110 | 660 | 1,100 | 6,600 |
| 10 | 120 | 720 | 1,200 | 7,200 |
| 11 | 130 | 780 | 1,300 | 7,800 |
| 12 | 140 | 840 | 1,400 | 8,400 |
| 13 | 150 | 900 | 1,500 | 9,000 |
| 14 | 160 | 960 | 1,600 | 9,600 |
| 15 | 170 | 1,020 | 1,700 | 10,200 |
| 16 | 180 | 1,080 | 1,800 | 10,800 |
| 17 | 190 | 1,140 | 1,900 | 11,400 |
| 18 | 200 | 1,200 | 2,000 | 12,000 |
| 19 | 210 | 1,260 | 2,100 | 12,600 |
| 20 | 220 | **1,320** | 2,200 | **13,200** |

(Derived from the formulas above. The 1,320 AF / 13,200 main-stat max from symbols is independently confirmed at https://grandislibrary.com/content/stat-terms — *"a maximum of 1320 AF and 13.2k Main Stat for most classes"*.)

#### A.3 Symbol count required per level — identical for all six regions

**Formula: `symbols to go from Level L to L+1 = L² + 11`**
Source: https://maplestorywiki.net/w/Arcane_Symbol:_Vanishing_Journey (and identical on all five other pages); also https://strategywiki.org/wiki/MapleStory/Arcane_River

| Level up | Symbols | Cumulative symbols |
|---|---|---|
| 1→2 | 12 | 12 |
| 2→3 | 15 | 27 |
| 3→4 | 20 | 47 |
| 4→5 | 27 | 74 |
| 5→6 | 36 | 110 |
| 6→7 | 47 | 157 |
| 7→8 | 60 | 217 |
| 8→9 | 75 | 292 |
| 9→10 | 92 | 384 |
| 10→11 | 111 | 495 |
| 11→12 | 132 | 627 |
| 12→13 | 155 | 782 |
| 13→14 | 180 | 962 |
| 14→15 | 207 | 1,169 |
| 15→16 | 236 | 1,405 |
| 16→17 | 267 | 1,672 |
| 17→18 | 300 | 1,972 |
| 18→19 | 335 | 2,307 |
| 19→20 | 372 | **2,679** |

**2,679 symbols to take one Arcane Symbol from 1 → 20.** ×6 regions = **16,074 symbols** for full 1,320 AF.

There is no "EXP" in the abstract sense — symbols *are* the currency. Excess symbols carry over ("growth" is stored as `n/needed`), and you may over-feed: *"You can use a lower growth symbol to combine with a higher growth symbol at no additional cost… the excess is carried over."* Source: https://strategywiki.org/wiki/MapleStory/Arcane_River

#### A.4 Meso cost per level — **differs per region**

**Formula: `meso = 10,000 × floor( (L² + 11) × (B + 0.1 × L) )`** where L is the *current* level and B is the region base:

| Region | B | Total mesos, Lv1→20 |
|---|---|---|
| Vanishing Journey | 8 | 252,470,000 |
| Chu Chu Island | 10 | 306,050,000 |
| Lachelein | 12 | 359,630,000 |
| Arcana | 14 | 413,210,000 |
| Morass | 16 | 466,790,000 |
| Esfera | 18 | 520,370,000 |
| **All six** | | **2,318,520,000 (~2.32 B)** |

Sources for each B: https://maplestorywiki.net/w/Arcane_Symbol:_Vanishing_Journey (8) · .../Arcane_Symbol:_Chu_Chu_Island (10) · .../Arcane_Symbol:_Lachelein (12) · .../Arcane_Symbol:_Arcana (14) · .../Arcane_Symbol:_Morass (16) · .../Arcane_Symbol:_Esfera (18). Cross-confirmed at https://strategywiki.org/wiki/MapleStory/Arcane_River

> **Implementation warning:** `0.1 * L` in IEEE754 double arithmetic produces off-by-10,000 errors at several levels (e.g. VJ 2→3 computes 1,220,000 instead of the correct 1,230,000). Use integer math: `10_000 * ((L*L + 11) * (10*B + L)) // 10`. The table below was generated with integer math and matches the wiki tables exactly at every row for VJ, Esfera, Cernium, Carcion, Tallahart, and Geardock (spot-verified).

##### Meso cost per level-up (all six regions)

| Level up | Symbols | Vanishing Journey | Chu Chu Island | Lachelein | Arcana | Morass | Esfera |
|---|---|---|---|---|---|---|---|
| 1→2 | 12 | 970,000 | 1,210,000 | 1,450,000 | 1,690,000 | 1,930,000 | 2,170,000 |
| 2→3 | 15 | 1,230,000 | 1,530,000 | 1,830,000 | 2,130,000 | 2,430,000 | 2,730,000 |
| 3→4 | 20 | 1,660,000 | 2,060,000 | 2,460,000 | 2,860,000 | 3,260,000 | 3,660,000 |
| 4→5 | 27 | 2,260,000 | 2,800,000 | 3,340,000 | 3,880,000 | 4,420,000 | 4,960,000 |
| 5→6 | 36 | 3,060,000 | 3,780,000 | 4,500,000 | 5,220,000 | 5,940,000 | 6,660,000 |
| 6→7 | 47 | 4,040,000 | 4,980,000 | 5,920,000 | 6,860,000 | 7,800,000 | 8,740,000 |
| 7→8 | 60 | 5,220,000 | 6,420,000 | 7,620,000 | 8,820,000 | 10,020,000 | 11,220,000 |
| 8→9 | 75 | 6,600,000 | 8,100,000 | 9,600,000 | 11,100,000 | 12,600,000 | 14,100,000 |
| 9→10 | 92 | 8,180,000 | 10,020,000 | 11,860,000 | 13,700,000 | 15,540,000 | 17,380,000 |
| 10→11 | 111 | 9,990,000 | 12,210,000 | 14,430,000 | 16,650,000 | 18,870,000 | 21,090,000 |
| 11→12 | 132 | 12,010,000 | 14,650,000 | 17,290,000 | 19,930,000 | 22,570,000 | 25,210,000 |
| 12→13 | 155 | 14,260,000 | 17,360,000 | 20,460,000 | 23,560,000 | 26,660,000 | 29,760,000 |
| 13→14 | 180 | 16,740,000 | 20,340,000 | 23,940,000 | 27,540,000 | 31,140,000 | 34,740,000 |
| 14→15 | 207 | 19,450,000 | 23,590,000 | 27,730,000 | 31,870,000 | 36,010,000 | 40,150,000 |
| 15→16 | 236 | 22,420,000 | 27,140,000 | 31,860,000 | 36,580,000 | 41,300,000 | 46,020,000 |
| 16→17 | 267 | 25,630,000 | 30,970,000 | 36,310,000 | 41,650,000 | 46,990,000 | 52,330,000 |
| 17→18 | 300 | 29,100,000 | 35,100,000 | 41,100,000 | 47,100,000 | 53,100,000 | 59,100,000 |
| 18→19 | 335 | 32,830,000 | 39,530,000 | 46,230,000 | 52,930,000 | 59,630,000 | 66,330,000 |
| 19→20 | 372 | 36,820,000 | 44,260,000 | 51,700,000 | 59,140,000 | 66,580,000 | 74,020,000 |
| **Total** | **2,679** | **252,470,000** | **306,050,000** | **359,630,000** | **413,210,000** | **466,790,000** | **520,370,000** |

VJ column verified row-for-row against https://maplestorywiki.net/w/Arcane_Symbol:_Vanishing_Journey ; Esfera endpoints (1→2 = 2,170,000; 19→20 = 74,020,000) verified against https://maplestorywiki.net/w/Arcane_Symbol:_Esfera

##### Cumulative meso (to reach level N)

| Reach Lv | Cum. symbols | VJ | Chu Chu | Lachelein | Arcana | Morass | Esfera |
|---|---|---|---|---|---|---|---|
| 2 | 12 | 970,000 | 1,210,000 | 1,450,000 | 1,690,000 | 1,930,000 | 2,170,000 |
| 5 | 74 | 6,120,000 | 7,600,000 | 9,080,000 | 10,560,000 | 12,040,000 | 13,520,000 |
| 10 | 384 | 33,220,000 | 40,900,000 | 48,580,000 | 56,260,000 | 63,940,000 | 71,620,000 |
| 15 | 1,169 | 105,670,000 | 129,050,000 | 152,430,000 | 175,810,000 | 199,190,000 | 222,570,000 |
| 18 | 1,972 | 182,820,000 | 222,260,000 | 261,700,000 | 301,140,000 | 340,580,000 | 380,020,000 |
| 20 | 2,679 | 252,470,000 | 306,050,000 | 359,630,000 | 413,210,000 | 466,790,000 | 520,370,000 |

(Full 19-row cumulative table is trivially reproducible from the per-level table.)

##### Mentor / Mentorship System discount — **NOT in GMS**
The wiki cost tables carry a third column "Cumulative Cost (With Mentor System Activated)" which is **0 mesos through Level 15** (costs resume at 15→16). This is the **Mentorship System**, released in **ChinaMS and TaiwanMS** in the *Milestone/Chaser* update and in **MapleSEA** in the *Post-Crown* update. It is explicitly **not** in KMS or GMS.
Sources: https://maplestorywiki.net/w/MapleStory:_Milestone (*"New System: Mentorship System (ChinaMS and TaiwanMS only) — Arcane Symbols cost nothing to level up until Level 15"*) and https://maplestorywiki.net/w/MapleStory:_Crown/Post-Update (MSEA section). **Do not apply this to a GMS calculator** unless you add a server toggle.

#### A.5 Arcane Symbol acquisition rates

##### Daily quests (once per day per character; EXP once per day *per world*)

**GMS values as of 2026-09-06** (the wiki explicitly annotates "Non-GMS" values, which are already doubled by the KMS 23rd-Anniversary QoL pass — GMS receives these on **2026-09-09**):

| Region | Daily quest | Kill requirement | GMS coupons/day | Non-GMS (and GMS from 2026-09-09) | Daily EXP |
|---|---|---|---|---|---|
| Vanishing Journey | Vanishing Journey Research | 500 (→300 after Chu Chu clear, →100 after further areas) | **10**, **20** after `[Reverse City] Surviving in the Reversed City` | 20 / **40** | 732,132,258 |
| Chu Chu Island | Chu Chu's Finest Cuisine | 500 → 300 → 100 | **10**, **20** after `[Yum Yum] The Traveler and the Follower` | 20 / **40** | 2,141,658,246 |
| Lachelein | A Night's Peace in Lachelein | 500 → 300 → 100 | **20** | **40** | 3,189,098,250 |
| Arcana | Peace in Arcana | 500 → 300 → 100 | **20** | **40** | 3,305,187,639 |
| Morass | Save the Morass | 500 → 300 → 100 | **20** | **40** | 4,398,266,165 |
| Esfera | Esfera Research Orders | 500 → 300 → 100 | **20** | **40** | 4,530,843,954 |

Sources: https://maplestorywiki.net/w/(Daily_Quest)_Vanishing_Journey_Research · .../(Daily_Quest)_Chu_Chu's_Finest_Cuisine · .../(Daily_Quest)_A_Night's_Peace_in_Lachelein · .../(Daily_Quest)_Peace_in_Arcana · .../(Daily_Quest)_Save_the_Morass · .../(Daily_Quest)_Esfera_Research_Orders (each page literally reads e.g. `Coupon x 20 (40 in Non-GMS)`). Kill-count reduction chain also at https://strategywiki.org/wiki/MapleStory/Grandis and https://strategywiki.org/wiki/MapleStory/Arcane_River

##### Weekly Special Content (3 clears per week per character; EXP capped at 3×/week per world)

| Content | Region symbol | Recommended ARC | GMS now | After Post-RTL (GMS 2026-09-09) | After Overdrive/Fall-2026 | Weekly EXP each |
|---|---|---|---|---|---|---|
| Erda Spectrum | Vanishing Journey | 60 (90 for 1.5×) | **40 / clear × 3** | 80 / clear × 3 | **240, 1 clear/week** | 187,726,220 |
| Hungry Muto | Chu Chu Island | 100 | **40 × 3** | 80 × 3 | 240 × 1 | 549,143,140 |
| Midnight Chaser | Lachelein | 240 | **40 × 3** | 80 × 3 | 240 × 1 | 817,717,500 |
| Spirit Savior | Arcana | — | **40 × 3** | 80 × 3 | 240 × 1 | 847,484,010 |
| Ranheim Defense | Morass | 520 | **40 × 3** | 80 × 3 | 240 × 1 | 1,127,760,555 |
| Esfera Guardian | Esfera | 640 | **40 × 3** | 80 × 3 | 240 × 1 | 1,161,754,860 |

Sources: https://maplestorywiki.net/w/Erda_Spectrum · https://maplestorywiki.net/w/Hungry_Muto · https://maplestorywiki.net/w/Midnight_Chaser · https://maplestorywiki.net/w/Spirit_Savior · https://maplestorywiki.net/w/Ranheim_Defense · https://maplestorywiki.net/w/Esfera_Guardian — each page's "Upcoming Changes" section reads verbatim: *"Beginning in the Crown Update (all servers other than KoreaMS and GlobalMS), or in the 23rd Anniversary / Post-Ride The Lightning Update (KoreaMS and GlobalMS), you will receive 80 symbols per completion… Beginning in the Overdrive Update, you will receive 240 symbols after completion as the clear limit has been reduced to once per week."* Overdrive changes also at https://maplestorywiki.net/w/MapleStory:_Overdrive

> ⚠️ **Conflict:** StrategyWiki still says *"15 Arcane Symbol exchange coupons"* per weekly clear (https://strategywiki.org/wiki/MapleStory/Arcane_River). That is a **stale MapleSEA-era figure**; the current value is 40 (three independent maplestorywiki pages agree). Use 40.

##### Other sources
- **Monster drops** — every Arcane River mob can drop its region's symbol coupon. Drop rate is *"about 1 in 20,000+ monsters at 1× drop rate for specific area symbols, and even lower for selectors"*. Selector coupons are tradable in non-Reboot, untradable in Reboot. Source: https://strategywiki.org/wiki/MapleStory/Arcane_River
- **Arcane Symbol Selector Coupon** — from events/boxes; can only be redeemed for a region you have already unlocked via quest. Source: https://maplestorywiki.net/w/Arcane_Symbol:_Vanishing_Journey
- **Symbol Express Pass ("Quick Pass")** — pay Maple Points to auto-complete the daily/weekly. Default **1,000 MP** for a daily, **−400 MP** per 200-kill reduction (applies up to twice → 200 MP at 100 kills); **2,000 MP per weekly entry**. MVP Red / VIP Royal+ get one free use per week for all areas. Becomes a flat 200 MP (daily) / 2,000 MP (weekly) in Overdrive. Source: https://maplestorywiki.net/w/Symbol_Express_Pass

##### Time-to-max (GMS current rates, one region, perfect play)
- Per week per region: 20/day × 7 + 40 × 3 = **260 symbols/week** → 2,679 / 260 = **10.3 weeks ≈ 72 days** per symbol (VJ before the Reverse City quest: 190/week → 14.1 weeks).
- After 2026-09-09 (GMS): 40/day × 7 + 80 × 3 = **520/week** → **5.15 weeks ≈ 36 days**.
- After Overdrive/Fall-2026: 40/day × 7 + 240 × 1 = **520/week** (unchanged in total, fewer runs).
- All six symbols run in parallel, so full 1,320 AF ≈ the single-region figure, gated by area unlock order.

#### A.6 Transferring Arcane Symbols (Arcane Catalyst)
- **Arcane Catalyst**: 300 Union Coins from the Union Coin Shop, max 3/character/week, **not available in Reboot/Heroic worlds**.
- Destabilises a Level 2+ symbol → *Unstable Arcane Symbol*: level resets to 1, **total symbol EXP reduced to 80% of original (rounded up)**, tradable within the account.
- Recipient must have unlocked that region's symbol via quest and must not already own that symbol. On stabilisation the Final Stat boost is re-typed to the new job (i.e. Xenon/DA conversions happen automatically). Mesos must be re-paid to re-level.
- StrategyWiki publishes the full "growth before → level after" conversion table.
Source: https://strategywiki.org/wiki/MapleStory/Arcane_River ; catalyst existence also referenced at https://maplestorywiki.net/w/Arcane_Symbol:_Vanishing_Journey

---

### B. SACRED SYMBOLS (= Authentic Symbols)

#### B.1 Regions

| Symbol | Region | Region unlock lv | Initial quest | Daily quest | Max-level boss bonus |
|---|---|---|---|---|---|
| Sacred Symbol: Cernium | Cernium (+ Burning/Fallen Cernium) | 260 | [Cernium] A Divine Power | Cernium Research | +20% dmg vs **Chosen Seren** |
| Sacred Symbol: Arcus | Hotel Arcus (+ Karote) | 265 | [Hotel Arcus] 'Til We Meet Again | Clean Up Around Hotel Arcus | +20% dmg vs **Kalos the Guardian** |
| Sacred Symbol: Odium | Odium | 270 | [Odium] Hundun Laid to Rest | Odium Area Expedition | +20% dmg vs **First Adversary** |
| Sacred Symbol: Shangri-La | Shangri-La | 275 | [Shangri-La] One Who Arrived in Paradise | Shangri-La Contamination Purification | +20% dmg vs **Kaling** |
| Sacred Symbol: Arteria | Arteria (+ Dark Sea) | 280 | [Arteria] The Battle's Aftermath | Defeat the Arteria Remnants | +20% dmg vs **Malefic Star** |
| Sacred Symbol: Carcion | Carcion | 285 | [Carcion] A Message from Across the Continent | Carcion Recovery Support | +20% dmg vs **Limbo** |

Sources: https://maplestorywiki.net/w/Sacred_Symbol (symbol/quest table) · region unlock levels https://maplestorywiki.net/w/Western_Grandis · per-symbol boss bonuses on each item page (https://maplestorywiki.net/w/Sacred_Symbol:_Cernium etc.)

Item `Required Level` on all Sacred Symbols is **200** (they are equippable at 200 if transferred), but the content that grants them starts at 260. Source: https://maplestorywiki.net/w/Sacred_Symbol:_Cernium

**Carcion is the last region with a normal Sacred Symbol.** Source: https://maplestorywiki.net/w/Western_Grandis

#### B.2 Level cap and stats

**Cap is Level 11** (not 10, not raised in 2025/2026). Cost tables end at `Level 10→11` and "Cumulative Stats at Max Level: Sacred Power / Authentic Force: +110".

| | Level 1 | Per additional level | Level 11 (cumulative) |
|---|---|---|---|
| **Sacred Power / Authentic Force** | **+10** | **+10** | **+110** |
| **Main Stat** | **+500** | **+200** | **+2,500** |
| **HP** (Demon Avenger) | **+10,500** | **+4,200** | **+52,500** |
| **STR/DEX/LUK** (Xenon, each) | **+240** | **+96** | **+1,200** |
| **EXP Obtained** | — | — | **+10% at max level only** |
| **Damage vs region boss** | — | — | **+20% at max level only** |

Sources: identical blocks on https://maplestorywiki.net/w/Sacred_Symbol:_Cernium · .../Sacred_Symbol:_Arcus · .../Sacred_Symbol:_Odium · .../Sacred_Symbol:_Shangri-La · .../Sacred_Symbol:_Arteria · .../Sacred_Symbol:_Carcion

**The +10% EXP and +20% boss damage are a 2026 addition** — the *Crown / Ride The Lightning* update: *"Sacred Symbol and Grand Sacred Symbol improvements — All Sacred Symbols give up to +10% EXP when maxed; All Sacred and Grand Sacred Symbols +20% damage against the corresponding region's boss when maxed."* Source: https://maplestorywiki.net/w/MapleStory:_Crown

**Closed form (level L, 1 ≤ L ≤ 11):**
```
SacredForce(L) = 10*L                # 10 at L1, 110 at L11
MainStat(L)    = 300 + 200*L         # 500 at L1, 2500 at L11
DA_HP(L)       = 6300 + 4200*L
Xenon_each(L)  = 144 + 96*L
```
StrategyWiki phrases it as: *"All Jobs (except Xenon and Demon Avenger): 200 Final Primary Stat per 10 Authentic Force + 300 Final Primary Stat per unique Authentic Symbol equipped; Xenon: 96 …+144; Demon Avenger: 4,200 Final HP per 10 AuF + 6,300."* Source: https://strategywiki.org/wiki/MapleStory/Grandis

##### Cumulative reference

| Sym Lv | SF (this symbol) | Cum. SF, all 6 sacred | Cum. SF, 6 sacred + 2 grand | Main stat (this) | Cum. main stat, all 6 |
|---|---|---|---|---|---|
| 1 | 10 | 60 | 80 | 500 | 3,000 |
| 2 | 20 | 120 | 160 | 700 | 4,200 |
| 3 | 30 | 180 | 240 | 900 | 5,400 |
| 4 | 40 | 240 | 320 | 1,100 | 6,600 |
| 5 | 50 | 300 | 400 | 1,300 | 7,800 |
| 6 | 60 | 360 | 480 | 1,500 | 9,000 |
| 7 | 70 | 420 | 560 | 1,700 | 10,200 |
| 8 | 80 | 480 | 640 | 1,900 | 11,400 |
| 9 | 90 | 540 | 720 | 2,100 | 12,600 |
| 10 | 100 | 600 | 800 | 2,300 | 13,800 |
| 11 | 110 | **660** | **880** | 2,500 | **15,000** |

#### B.3 Symbol counts and meso cost

**Symbols to go from Level L to L+1: `9L² + 20L`** — identical for all Sacred **and** Grand Sacred Symbols.
**Meso: `100,000 × floor( (9L² + 20L) × (B − 0.6 × L) )`**, region base B:

| Symbol | B | Total mesos Lv1→11 |
|---|---|---|
| Cernium | 13.2 | 3,930,100,000 |
| Arcus | 15.0 | 4,751,600,000 |
| Odium | 16.8 | 5,573,300,000 |
| Shangri-La | 18.6 | 6,395,000,000 |
| Arteria | 20.4 | 7,216,900,000 |
| Carcion | 22.2 | 8,038,600,000 |
| **All six sacred** | | **35,905,500,000 (~35.9 B)** |
| Grand: Tallahart | 39.8 | 16,072,800,000 |
| Grand: Geardock | 48.8 | 20,181,300,000 |
| **Grand total, 8 symbols** | | **72,159,600,000 (~72.2 B)** |

Sources: https://maplestorywiki.net/w/Sacred_Symbol:_Cernium (13.2) · .../Sacred_Symbol:_Arcus (15) · .../Sacred_Symbol:_Odium (16.8) · .../Sacred_Symbol:_Shangri-La (18.6) · .../Sacred_Symbol:_Arteria (20.4) · .../Sacred_Symbol:_Carcion (22.2) · https://maplestorywiki.net/w/Grand_Sacred_Symbol:_Tallahart (39.8) · https://maplestorywiki.net/w/Grand_Sacred_Symbol:_Geardock (48.8). Formula also at https://strategywiki.org/wiki/MapleStory/Grandis

> Again use integer arithmetic: `100_000 * ((9*L*L + 20*L) * (10*B − 6*L)) // 10`. Float math mis-computes Cernium 5→6 and 10→11 by 100,000.

##### Per-level cost table (all eight Sacred-family symbols)

| Level up | Symbols | Cum. symbols | Cernium | Arcus | Odium | Shangri-La | Arteria | Carcion | **Tallahart (G)** | **Geardock (G)** |
|---|---|---|---|---|---|---|---|---|---|---|
| 1→2 | 29 | 29 | 36,500,000 | 41,700,000 | 46,900,000 | 52,200,000 | 57,400,000 | 62,600,000 | 113,600,000 | 139,700,000 |
| 2→3 | 76 | 105 | 91,200,000 | 104,800,000 | 118,500,000 | 132,200,000 | 145,900,000 | 159,600,000 | 293,300,000 | 361,700,000 |
| 3→4 | 141 | 246 | 160,700,000 | 186,100,000 | 211,500,000 | 236,800,000 | 262,200,000 | 287,600,000 | 535,800,000 | 662,700,000 |
| 4→5 | 224 | 470 | 241,900,000 | 282,200,000 | 322,500,000 | 362,800,000 | 403,200,000 | 443,500,000 | 837,700,000 | 1,039,300,000 |
| 5→6 | 325 | 795 | 331,500,000 | 390,000,000 | 448,500,000 | 507,000,000 | 565,500,000 | 624,000,000 | 1,196,000,000 | 1,488,500,000 |
| 6→7 | 444 | 1,239 | 426,200,000 | 506,100,000 | 586,000,000 | 666,000,000 | 745,900,000 | 825,800,000 | 1,607,200,000 | 2,006,800,000 |
| 7→8 | 581 | 1,820 | 522,900,000 | 627,400,000 | 732,000,000 | 836,600,000 | 941,200,000 | 1,045,800,000 | 2,068,300,000 | 2,591,200,000 |
| 8→9 | 736 | 2,556 | 618,200,000 | 750,700,000 | 883,200,000 | 1,015,600,000 | 1,148,100,000 | 1,280,600,000 | 2,576,000,000 | 3,238,400,000 |
| 9→10 | 909 | 3,465 | 709,000,000 | 872,600,000 | 1,036,200,000 | 1,199,800,000 | 1,363,500,000 | 1,527,100,000 | 3,126,900,000 | 3,945,000,000 |
| 10→11 | 1,100 | **4,565** | 792,000,000 | 990,000,000 | 1,188,000,000 | 1,386,000,000 | 1,584,000,000 | 1,782,000,000 | 3,718,000,000 | 4,708,000,000 |
| **Total** | **4,565** | | **3,930,100,000** | **4,751,600,000** | **5,573,300,000** | **6,395,000,000** | **7,216,900,000** | **8,038,600,000** | **16,072,800,000** | **20,181,300,000** |

Verified row-for-row against the published Cernium, Carcion, Tallahart and Geardock tables on maplestorywiki.

##### Cumulative meso to reach level N

| Reach Lv | Cum. symbols | Cernium | Arcus | Odium | Shangri-La | Arteria | Carcion | Tallahart | Geardock |
|---|---|---|---|---|---|---|---|---|---|
| 2 | 29 | 36,500,000 | 41,700,000 | 46,900,000 | 52,200,000 | 57,400,000 | 62,600,000 | 113,600,000 | 139,700,000 |
| 3 | 105 | 127,700,000 | 146,500,000 | 165,400,000 | 184,400,000 | 203,300,000 | 222,200,000 | 406,900,000 | 501,400,000 |
| 4 | 246 | 288,400,000 | 332,600,000 | 376,900,000 | 421,200,000 | 465,500,000 | 509,800,000 | 942,700,000 | 1,164,100,000 |
| 5 | 470 | 530,300,000 | 614,800,000 | 699,400,000 | 784,000,000 | 868,700,000 | 953,300,000 | 1,780,400,000 | 2,203,400,000 |
| 6 | 795 | 861,800,000 | 1,004,800,000 | 1,147,900,000 | 1,291,000,000 | 1,434,200,000 | 1,577,300,000 | 2,976,400,000 | 3,691,900,000 |
| 7 | 1,239 | 1,288,000,000 | 1,510,900,000 | 1,733,900,000 | 1,957,000,000 | 2,180,100,000 | 2,403,100,000 | 4,583,600,000 | 5,698,700,000 |
| 8 | 1,820 | 1,810,900,000 | 2,138,300,000 | 2,465,900,000 | 2,793,600,000 | 3,121,300,000 | 3,448,900,000 | 6,651,900,000 | 8,289,900,000 |
| 9 | 2,556 | 2,429,100,000 | 2,889,000,000 | 3,349,100,000 | 3,809,200,000 | 4,269,400,000 | 4,729,500,000 | 9,227,900,000 | 11,528,300,000 |
| 10 | 3,465 | 3,138,100,000 | 3,761,600,000 | 4,385,300,000 | 5,009,000,000 | 5,632,900,000 | 6,256,600,000 | 12,354,800,000 | 15,473,300,000 |
| 11 | 4,565 | 3,930,100,000 | 4,751,600,000 | 5,573,300,000 | 6,395,000,000 | 7,216,900,000 | 8,038,600,000 | 16,072,800,000 | 20,181,300,000 |

#### B.4 Sacred Symbol acquisition

**There is no weekly Special Content for Sacred Symbols.** Dailies + rare mob drops + events only.

| Region | Daily quest | Kill req | **GMS coupons/day** | Non-GMS (GMS from 2026-09-09) | Daily EXP |
|---|---|---|---|---|---|
| Cernium | Cernium Research | 500 → 300 → 100 | **20** | **30** | 16,455,682,080 |
| Hotel Arcus | Clean Up Around Hotel Arcus | 500 → 300 → 100 | **10** | **15** | 19,372,782,409 |
| Odium | Odium Area Expedition | 500 → 300 → 100 | **10** | **15** | 23,246,151,120 |
| Shangri-La | Shangri-La Contamination Purification | 500 → 300 → 100 | **10** | **15** | 32,127,015,480 |
| Arteria | Defeat the Arteria Remnants | 500 → 300 → 100 | **10** | **15** | 38,593,455,264 |
| Carcion | Carcion Recovery Support | 500 → 300 → 100 | **10** | **15** | 45,635,222,880 |

Sources: https://maplestorywiki.net/w/(Daily_Quest)_Cernium_Research · .../(Daily_Quest)_Clean_Up_Around_Hotel_Arcus · .../(Daily_Quest)_Odium_Area_Expedition · .../(Daily_Quest)_Shangri-La_Contamination_Purification · .../(Daily_Quest)_Defeat_the_Arteria_Remnants · .../(Daily_Quest)_Carcion_Recovery_Support. Cernium's 20/day and the others' 10/day are independently confirmed at https://strategywiki.org/wiki/MapleStory/Grandis (*"A Daily Quest can be performed to receive 20 Authentic Symbol: Cernium Coupons everyday… 10 Authentic Symbol: Hotel Arcs Coupons…"*). The Post-Crown *"50% more rewards in Sacred Symbol daily quests"* is at https://maplestorywiki.net/w/MapleStory:_Crown/Post-Update

**Mob drops:** every Western Grandis mob can drop its region's coupon at a very low rate. In Interactive/non-Reboot worlds these are fully tradable; in Heroic/Reboot they are *tradable within the same world* (unusual — Arcane coupons are not). Source: https://maplestorywiki.net/w/Sacred_Symbol:_Cernium

**Time-to-max (GMS, dailies only):**
- Cernium: 4,565 / 20 = **229 days**
- Every other Sacred region: 4,565 / 10 = **457 days (~15 months)**
- After 2026-09-09 (GMS at Non-GMS rates): Cernium **153 days**, others **305 days**.

**No Sacred/Authentic Force hyper stat exists** — the Hyper Stat list has 18 categories and only includes "Arcane Force/Power". Source: https://maplestorywiki.net/w/Hyper_Stats. Nor is there a guild skill for it. Sacred Force therefore comes **only** from symbols (plus temporary event totems, e.g. GMS *Arthur's Equipment Rental* event *"New totems providing additional Sacred and Arcane Power stats"* — https://maplestorywiki.net/w/MapleStory:_Crown).

---

### C. NEWER SYMBOL TYPES (2025–2026)

#### C.1 Grand Sacred Symbols (Grand Authentic Symbols) — the new type

Introduced with **Tallahart** (GMS *v.257 Tallahart: Grave of the Gods*) and expanded with **Geardock** (KMS ver. 1.2.412, 2026-02-14; GMS *Ride The Lightning Part 2*).

| Symbol | Region | Region unlock | Initial quest | Daily quest | Boss |
|---|---|---|---|---|---|
| Grand Sacred Symbol: Tallahart | Tallahart (Grave of the Gods) | **290** | [Tallahart] The Battle to Come | Investigate the Tallahart Ancient God's Power | **Baldrix** |
| Grand Sacred Symbol: Geardock | Geardock | **295** | [Geardock] In the Aftermath | Cleaning Up Kronos | **Jupiter** |

Sources: https://maplestorywiki.net/w/Grand_Sacred_Symbol · https://maplestorywiki.net/w/Western_Grandis · https://orangemushroom.net/2026/02/14/kms-ver-1-2-412-maplestory-crown-geardrak-jupiter-guild-castle/

**Requires Level 290+ to obtain.** Item `Required Level` is 200. Source: https://maplestorywiki.net/w/Grand_Sacred_Symbol

##### C.2 Grand Sacred Symbol stats — **no main stat at all**

This is the key structural difference: Grand Sacred Symbols give **utility percentages instead of main stat**.

| | Level 1 | Per additional level | Level 11 (cumulative) |
|---|---|---|---|
| **Sacred Power / Authentic Force** | **+10** | **+10** | **+110** |
| **EXP Obtained** | **+10%** | **+4%** | **+50%** |
| **Mesos Obtained** | **+5%** | **+1%** | **+15%** |
| **Item Drop Rate** | **+5%** | **+1%** | **+15%** |
| **Main stat / HP** | **none** | **none** | **none** |
| **Max Level Bonus** | — | — | **+20% damage vs Baldrix (Tallahart) / Jupiter (Geardock)** |

Sources: https://maplestorywiki.net/w/Grand_Sacred_Symbol:_Tallahart · https://maplestorywiki.net/w/Grand_Sacred_Symbol:_Geardock · corroborated by KMS patch notes: *"The Grand Authentic Symbol: Geardrak gives 10% additional experience, 5% meso acquisition rate, and 5% item drop rate at level 1. When it reaches level 11, it will give 50% additional experience, 15% meso acquisition rate, and 15% item drop rate, as well as +20% damage when attacking Jupiter."* https://orangemushroom.net/2026/02/14/kms-ver-1-2-412-maplestory-crown-geardrak-jupiter-guild-castle/

```
GrandSacredForce(L) = 10*L                 # identical to Sacred
EXP%(L)             = 6 + 4*L              # 10% at L1, 50% at L11
Meso%(L)            = 4 + 1*L              # 5% at L1, 15% at L11
Drop%(L)            = 4 + 1*L              # 5% at L1, 15% at L11
```
Two maxed Grand symbols therefore give **+100% EXP, +30% meso, +30% drop, +220 Sacred Force** and **zero** main stat.

##### C.3 Grand Sacred acquisition

| Region | Daily quest | GMS coupons/day | Non-GMS / GMS from 2026-09-09 | Daily EXP |
|---|---|---|---|---|
| Tallahart | Investigate the Tallahart Ancient God's Power | **10** | **15** | 89,730,912,960 |
| Geardock | Cleaning Up Kronos | **10** | **15** | 105,641,078,400 |

Sources: https://maplestorywiki.net/w/(Daily_Quest)_Investigate_the_Tallahart_Ancient_God's_Power · https://maplestorywiki.net/w/(Daily_Quest)_Cleaning_Up_Kronos · KMS: *"When you complete the daily quest, you will receive experience (once per day per world) and 10 Grand Authentic Symbol: Geardrak Vouchers."* https://orangemushroom.net/2026/02/14/kms-ver-1-2-412-maplestory-crown-geardrak-jupiter-guild-castle/

Same 4,565-symbol total → **457 days each** at GMS 10/day. Also droppable from Tallahart/Geardock mobs (tradable in Interactive; tradable-within-world in Heroic), and obtainable via Selective Authentic Symbol Vouchers from events (e.g. Platinum Apples in KMS). Sources: https://maplestorywiki.net/w/Grand_Sacred_Symbol:_Tallahart · https://orangemushroom.net/2026/02/14/kms-ver-1-2-412-maplestory-crown-geardrak-jupiter-guild-castle/

##### C.4 "Tenebris symbols" — **do not exist**
Tenebris (Moonbridge, Labyrinth of Suffering, Limina) and Sellas/Celestars *require* Arcane Force but grant **no symbol of their own**; you use Esfera symbols and hyper/guild AF to reach their requirements. Source: https://strategywiki.org/wiki/MapleStory/Arcane_River and the AF requirement table in §D.3. An `Arcane Symbol: Tenebris` page does not exist on the wiki.

##### C.5 2025–2026 changes summary (symbol-relevant)

| Update | Server/date | Symbol-relevant change |
|---|---|---|
| Tallahart | GMS v.257 (2025) | First Grand Sacred Symbol |
| **Crown / Ride The Lightning** | KMS 1.2.410–412 (Jan–Feb 2026); GMS 2026 | Geardock + 2nd Grand Sacred Symbol; **all Sacred Symbols gain +10% EXP at max**; **all Sacred + Grand Sacred gain +20% damage vs their region boss at max**; field reorganisation of VJ→Esfera, Tenebris, Cernium, Hotel Arcus |
| **23rd Anniversary / Post-Ride The Lightning** | KMS 2026-03-23; **GMS 2026-09-09** | **Arcane daily + weekly rewards doubled**; **Sacred daily rewards +50%**; new auto-add-to-equipped-symbol feature |
| **Mentorship System** | CMS/TMS (Milestone), MSEA (Post-Crown) — **not GMS/KMS** | Arcane Symbols cost **0 meso** to level up to 15 |
| **Overdrive** | KMS 2026-06; GMS "Fall 2026" (Sept 17 / Oct / Nov 19) | Symbol daily kill requirement flattened to **100/area**; Arcane weekly content → **1 clear/week for 240 symbols**; Express Pass flat 200 MP daily / 2,000 MP weekly |

Sources: https://maplestorywiki.net/w/MapleStory:_Crown · https://maplestorywiki.net/w/MapleStory:_Crown/Post-Update · https://maplestorywiki.net/w/MapleStory:_Overdrive · https://maplestorywiki.net/w/MapleStory:_Milestone · https://orangemushroom.net/2026/03/23/kms-ver-1-2-413-maplestorys-23rd-anniversary-maple-attack/

**No symbol level cap increase has occurred or is announced** as of 2026-09-06 (Arcane 20, Sacred/Grand Sacred 11).

---

### D. FORCE MECHANICS — the exact published rules

> **These two systems are mathematically different. Arcane Force is a RATIO system. Sacred/Authentic Force is an ABSOLUTE-DIFFERENCE system.** This is the single most important modelling fact in this document.

#### D.1 Arcane Force — ratio-based, 9 tiers

Let `r = floor( 100 × YourARC / RequiredARC )` (percent of requirement, rounded down).

| `r` (AF requirement met, %) | **Final damage you deal** | **Monster damage you take** |
|---|---|---|
| 0 – 9 % | **10 %** | 280 % (2.8×) |
| 10 – 29 % | **30 %** | 240 % (2.4×) |
| 30 – 49 % | **60 %** | 180 % (1.8×) |
| 50 – 69 % | **70 %** | 160 % (1.6×) |
| 70 – 99 % | **80 %** | 140 % (1.4×) |
| **100 – 109 %** | **100 %** | 100 % (1×) |
| 110 – 129 % | **110 %** | 80 % (0.8×) |
| 130 – 149 % | **130 %** | 40 % (0.4×) |
| **≥ 150 %** | **150 %** | **0 % (monster deals 1 damage)** |

**Primary source (verbatim table):** https://strategywiki.org/wiki/MapleStory/Arcane_River — *"Based on your Arcane Force and required Arcane Force, your final damage is adjusted to between 10% to 150% of the original damage and monster damage will hit between 0% to 280% of its original damage (not applied to %HP attacks)."*
**Independent confirmation (per-map breakpoint columns):** KPRobin sheet, tab *"Arcane Force (New Age)"* — column headers are exactly `10% / 280%`, `30% / 240%`, `60% / 180%`, `70% / 160%`, `80% / 140%`, `100% / 100%`, `110% / 80%`, `130% / 40%`, `150% / 0%`, and every map row lists the raw AF value at which each tier begins (e.g. for a 100-AF map: 0, 10, 30, 50, 70, 100, 110, 130, 150). https://docs.google.com/spreadsheets/d/1sJSM7iZDP9e4GRfhGvhfpnGWYVwh2AaeywUIhi4F4Ec/ (linked from https://kprobin.blogspot.com/2019/01/arcane-force-extra-damage-and-monster.html)

**Important caveats:**
1. The **monster-damage multiplier is NOT applied on boss maps**, and is not applied to %HP attacks or anti-AFK mobs. Sources: KPRobin notes (*"Monster damage reduction is not applied in boss maps"*); each boss wiki page repeats *"Monster Damage does not affected by Arcane Force from Boss Monsters"* in the KPRobin sheet notes.
2. **History:** before the *Adventure* update (kMS 1.2.311) the over-cap bonus was 3 tiers (100 % / 110 % / 150 %); it is now 4 tiers (100 / 110 / 130 / 150). Source: KPRobin notes, *"'Adventure' labeled are latest extra damage and monster damage from server kMS 1.2.311 which 'extra benefit' changed from 3 stages 100%/110%/150% to 4 stages 100%/110%/130%/150%."*
3. **ARC only exists in increments of 5** (symbols give 10, hyper stat gives 5), and boss pages round the tier thresholds **up to the next multiple of 5**. Example (Verus Hilla Normal, req 820): 820×1.1 = 902 → published threshold **905**; 820×1.3 = 1,066 → published **1,070**; 820×1.5 = **1,230**. Source: https://maplestorywiki.net/w/Hilla/Monster_(Reborn)

##### Arcane Force sources and maximum
| Source | Amount |
|---|---|
| Arcane Symbols | +20 per unique symbol equipped, **+10 per symbol level** → 30 at Lv1, 220 at Lv20 → **1,320** at 6×Lv20 |
| **Hyper Stat "Arcane Force/Power"** | Lv1–10: **+5/level** (→50); Lv11–15: **+10/level** → **max +100 at Lv15**. Requires 5th job; only applies once you have an Arcane Symbol. |
| **Guild Skill "Special Power"** (Guild Lv5+) | **+30 Arcane Power** (flat, max level 1) — both Interactive and Heroic. Requires `A Greater Power` completed. |
| Event titles / buffs / Genesis Pass | variable, temporary |
| **Practical maximum** | **1,450** (1,320 + 100 + 30), excluding event stats |

Sources: hyper stat table https://maplestorywiki.net/w/Hyper_Stats ; guild skill https://maplestorywiki.net/w/Guild_Skills ; *"Maximum: 1450 (Excluded event stat such as Title or Event Buff)"* KPRobin sheet notes; also https://strategywiki.org/wiki/MapleStory/Arcane_River (*"Hyper Stats: +5~+100, Guild Skill: +15~+30"* — the guild figure is now a flat +30).

> ⚠️ StrategyWiki adds: *"arcane force not from arcane symbols is only applied to the penalties/advantages in arcane river maps and nothing else that uses arcane force"* — i.e. hyper-stat/guild AF does not feed anything that reads "Arcane Force from symbols" (such as the symbol→main-stat conversion). The Black Mage page similarly notes *"you can only bypass 1320 using the ARC Hyper Stat or the Guild Skill."* Sources: https://strategywiki.org/wiki/MapleStory/Arcane_River · https://maplestorywiki.net/w/Black_Mage/Monster

#### D.2 Sacred / Authentic Force — absolute-difference, linear

Let `d = YourSAC − RequiredSAC`.

**Published formula (StrategyWiki, https://strategywiki.org/wiki/MapleStory/Grandis):**
- *"For every **1** Authentic Force **below** required, you deal **1 %p lesser** final damage. (Max reduction of **95 %**)"*
- *"For every **2** Authentic Force **above** required, you deal **1 %p more** final damage, rounded down. (Max increase of **25 %**)"*
- *"Normal damage taken is increased to **1.5×** for having **1–50** Authentic Force below required, and increases to **2×** if it is even lower. Normal damage taken **cannot be reduced** further once the force requirement is met."*
- Overall range: *"final damage is adjusted to between **5 % and 125 %**… monster damage will hit between **100 % and 200 %**."*

```
if d >= 0:  dmgMult = 1.00 + min(floor(d / 2), 25) / 100      # cap 1.25 at d >= +50
else:       dmgMult = max(1.00 + d/100, 0.05)                 # floor 0.05 at d <= -95
takenMult = 1.0  if d >= 0 else (1.5 if d >= -50 else 2.0)
```

**Tier table (as published):**

| `d` = Your SAC − Required | Final damage dealt | Monster damage taken |
|---|---|---|
| ≤ −95 | **5 %** | 2× |
| −90 | 10 % | 2× |
| −80 | 20 % | 2× |
| −70 | 30 % | 2× |
| −60 | 40 % | 2× |
| −50 | 50 % | 1.5× |
| −40 | 60 % | 1.5× |
| −30 | 70 % | 1.5× |
| −20 | 80 % | 1.5× |
| −10 | 90 % | 1.5× |
| **0** | **100 %** | **1×** |
| +10 | 105 % | 1× |
| +20 | 110 % | 1× |
| +30 | 115 % | 1× |
| +40 | 120 % | 1× |
| **≥ +50** | **125 %** | 1× |

Sources: https://strategywiki.org/wiki/MapleStory/Grandis (full table, verbatim) — **independently confirmed** by the KPRobin sheet tab *"Authentic Force (New Age)"*, whose column headers read exactly `5%/200%, 10%/200%, 20%/200%, 30%/200%, 40%/200%, 50%/150%, 60%/150%, 70%/150%, 80%/150%, 90%/150%, 100%/100%, 105%/100%, 110%/100%, 115%/100%, 120%/100%, 125%/100%` with row labels `-95 below, -90, -80, -70, -60, -50, -40, -30, -20, -10, 0, 10, 20, 30, 40, 50 above`. https://docs.google.com/spreadsheets/d/1sJSM7iZDP9e4GRfhGvhfpnGWYVwh2AaeywUIhi4F4Ec/

**Third confirmation, in-game wording** (repeated verbatim on every Grandis boss page):
> *"You will deal **−10 % final damage for every 10 SAC / AUT below** the required amount; if you have **100 or more SAC / AUT below** the required amount, you will only deal a total of **5 %** final damage. Similarly, you will deal **+5 % final damage for every 10 SAC / AUT above** the required amount, **up to +25 % (50 above)**."*
Sources: https://maplestorywiki.net/w/Baldrix/Monster · https://maplestorywiki.net/w/Jupiter/Monster · https://maplestorywiki.net/w/Kaling/Monster · https://maplestorywiki.net/w/Limbo/Monster · https://maplestorywiki.net/w/Kalos/Monster · https://maplestorywiki.net/w/Seren/Monster · https://maplestorywiki.net/w/First_Adversary · https://maplestorywiki.net/w/Malefic_Star

##### Sacred Force sources and maximum
| Source | Amount |
|---|---|
| 6 Sacred Symbols @ Lv11 | 6 × 110 = **660** |
| 2 Grand Sacred Symbols @ Lv11 | 2 × 110 = **220** |
| Hyper Stat | **none exists** (https://maplestorywiki.net/w/Hyper_Stats) |
| Guild Skill | **none exists** (https://maplestorywiki.net/w/Guild_Skills) |
| Event totems / buffs | variable, temporary (e.g. GMS Arthur's Equipment Rental totems — https://maplestorywiki.net/w/MapleStory:_Crown) |
| **Practical maximum** | **880** |

> ⚠️ The KPRobin sheet note says *"Maximum: 770"* — that is **stale** (it predates Geardock's Grand Symbol). With both Grand symbols the ceiling is 880, which is exactly what the Geardock content demands (Gob's Workshop 810; +50 for max bonus = 860). Treat 880 as current.

##### D.2b Why the difference matters for a calculator
- Arcane Force: **being 10 AF short of a 1,320 requirement is harmless** (1,310/1,320 = 99 % → 80 % tier — actually a large cliff!). Careful: the tiers are coarse. 99 % of requirement = **80 % damage**. There is a hard cliff at exactly 100 %.
- Sacred Force: **being 10 SAC short costs exactly 10 % final damage** — smooth, linear, no cliff.
- Arcane over-cap: +50 % damage at 150 % of requirement (a *huge* multiplier, but usually unreachable at end-game: Black Mage needs 1,980 ARC for the 150 % tier vs a 1,450 ceiling).
- Sacred over-cap: only +25 % at +50 SAC — cheap and routinely achievable.

#### D.3 Arcane Force requirements — maps and bosses

All values below from the KPRobin sheet tab *"Arcane Force (New Age)"* (https://docs.google.com/spreadsheets/d/1sJSM7iZDP9e4GRfhGvhfpnGWYVwh2AaeywUIhi4F4Ec/), cross-checked against https://strategywiki.org/wiki/MapleStory/Arcane_River and the individual boss pages on maplestorywiki.net. `1.5×` = AF needed for the maximum 150 % tier (= `ceil(req × 1.5)` to the nearest 5).

##### Fields

| Region | Map | Req ARC | 110 % at | 130 % at | 150 % at |
|---|---|---|---|---|---|
| Vanishing Journey | Oblivion Lake | 30 | 35 | 40 | 45 |
| | Flame Zone of Extinction | 40 | 45 | 55 | 60 |
| | Cave of Rest | 60 | 70 | 80 | 90 |
| | Hidden Map | 80 | 90 | 105 | 120 |
| | Erda Spectrum (PQ) | 60 | 70 | 80 | 90 |
| Reverse City | Underground Railway / T-boy's Train | 40 | 45 | 55 | 60 |
| | Underground & Ground Train / M Tower | 60 | 70 | 80 | 90 |
| | Hidden Map | 100 | 110 | 130 | 150 |
| Chu Chu Island | Rainbow Garden / Slurp Forest | 100 | 110 | 130 | 150 |
| | Err Valley | 130 | 145 | 170 | 195 |
| | Mt. Sky Whale | 160 | 180 | 210 | 240 |
| | Hungry Muto (PQ) | 100 | 110 | 130 | 150 |
| Yum Yum Island | Mushbud Forest | 130 | 145 | 170 | 195 |
| | Illiyard Field / Fungus Forest | 160 | 180 | 210 | 240 |
| | Hidden Map | 190 | 210 | 250 | 285 |
| Lachelein | Back Alley | 190 | 210 | 250 | 285 |
| | Night Market / Ballroom | 210 | 235 | 275 | 315 |
| | Clock Tower | 240 | 265 | 315 | 360 |
| | Midnight Chaser (PQ) | 240 | 265 | 315 | 360 |
| Arcana | Forest Entrance | 280 | 310 | 365 | 420 |
| | Deep Forest | 320 | 355 | 420 | 480 |
| | Cave | 360 | 400 | 470 | 540 |
| Morass | Path to Coral Forest | 400 | 440 | 520 | 600 |
| | Nameless Cat / Brothers Zone | 440 | 485 | 575 | 660 |
| | Shadows Dance / Laboratory | 480 | 530 | 625 | 720 |
| | "Trueffet, That Day" | 520 | 575 | 680 | 780 |
| | Ranheim Defense (PQ) | 520 | 575 | 680 | 780 |
| Esfera | Where Life Begins | 560 | 620 | 730 | 840 |
| | Mirror-tinged Sea | 600 | 660 | 780 | 900 |
| | Mirrored Light Shrine | 640 | 705 | 835 | 960 |
| | Esfera Guardian (PQ) | 640 | 705 | 835 | 960 |
| Sellas / Celestars | Where the Light Last Touched | 600 | 660 | 780 | 900 |
| | Endlessly Plunging Abyss | 640 | 705 | 835 | 960 |
| | Where the Star was Engulfed | 670 | 740 | 875 | 1,005 |
| Moonbridge | Border of Ideas | 670 | 740 | 875 | 1,005 |
| | Mysterious Fog | 700 | 770 | 910 | 1,050 |
| | Waves of Void | 730 | 805 | 950 | 1,095 |
| Labyrinth of Suffering | Labyrinth of Suffering | 760 | 840 | 990 | 1,140 |
| | Central Area | 790 | 870 | 1,030 | 1,185 |
| | Deepest Area | 820 | 905 | 1,070 | 1,230 |
| Limina | The World's Tear | 850 | 935 | 1,105 | 1,275 |
| | Where the World Ends | 880 | 970 | 1,145 | 1,320 |
| | Hidden Map | **1,000** | 1,100 | 1,300 | 1,500 |
| Guild Castle | B2 Area 1 / Area 2 / Area 3 | 450 / 600 / 750 | 495/660/825 | 585/780/975 | 675/900/1,125 |
| Monster Park | (per Arcane region) | 30 / 100 / 190 / 280 / 400 / 560 / 600 / 670 / 760 / 850 | — | — | — |

##### Arcane River bosses

| Boss | Mode | Req ARC | +10 % from | +30 % from | +50 % from |
|---|---|---|---|---|---|
| **Lucid** | Story | 250 | 275 | 325 | 375 |
| | Easy / Normal / Hard | **360** | 396 | 468 | 540 |
| **Will** | Easy | **560** | 616 | 728 | 840 |
| | Normal / Hard | **760** | 836 | 988 | 1,140 |
| **Gloom** | Story / Normal / Chaos | **730** | 803 | 949 | 1,095 |
| **Verus Hilla** | Normal | **820** | 905 | 1,070 | 1,230 |
| | Hard | **900** | 990 | 1,170 | 1,350 |
| **Darknell** | Story / Normal / Hard | **850** | 935 | 1,105 | 1,275 |
| **Black Mage** | Story | **880** *(see §G)* | — | — | — |
| | Hard / Extreme | **1,320** | 1,452 | 1,716 | **1,980** (unreachable) |

Sources: https://maplestorywiki.net/w/Lucid/Monster · https://maplestorywiki.net/w/Will/Monster · https://maplestorywiki.net/w/Giant_Monster_Gloom · https://maplestorywiki.net/w/Hilla/Monster_(Reborn) · https://maplestorywiki.net/w/Guard_Captain_Darknell/Monster · https://maplestorywiki.net/w/Black_Mage/Monster

#### D.4 Sacred / Authentic Force requirements — maps and bosses

From the KPRobin sheet tab *"Authentic Force (New Age)"*, cross-checked against each region page on maplestorywiki.net. `Max bonus at` = requirement + 50.

##### Fields

| Region | Map | Req SAC | Max bonus (125 %) at |
|---|---|---|---|
| Cernium | Rocky Beach / West Castle Wall / East Castle Wall / Royal Library | **30** | 80 |
| Fallen (Burning) Cernium | Battle-ravaged W/E Castle Wall, Burning Royal Library | **50** | 100 |
| Hotel Arcus | Outlaws' Wasteland, Romantic Drive-in Theater | **70** | 120 |
| | Train With No Destination | **100** | 150 |
| Karote (Unstoppable Tower) | Lostspace (Story Mode) | **70** | 120 |
| Odium | Path to the Castle Gate | **130** | 180 |
| | Occupied Alley | **160** | 210 |
| | Sunny Laboratory | **180** | 230 |
| | Laboratory Behind the Locked Door | **200** | 250 |
| Shangri-La | Cherry Blossom Spring | **230** | 280 |
| | Orchid Green Summer | **260** | 310 |
| | Chrysanthemum Autumn | **280** | 330 |
| | Bamboo's Resting Winter | **300** | 350 |
| Arteria | Queen's Road | **330** | 380 |
| | Lower Level Corridor | **360** | 410 |
| | Upper Level Corridor | **400** | 450 |
| Dark/Black Sea | Temple of Delusions (Story) | **330** | 380 |
| Carcion | Coast | **430** | 480 |
| | Forest | **460** | 510 |
| | Cave & Ruins | **500** | 550 |
| **Tallahart** | Land of Ashes and Silence (Silent Ashlands) | **630** | 680 |
| | Battlefield of Destiny (Fate-Fields) | **660** | 710 |
| | Path of Night / Path of Illusion (Phantasmal Night Sanctum) | **700** | 750 |
| **Geardock** | Basement Area | **740** | 790 |
| | Robot Storage (Robot Depot) | **770** | 820 |
| | Gob's Workshop | **810** | 860 |
| Guild Castle | B3 Area 1 / Area 2 / Area 3 / Deepest | 70 / 230 / 430 / 430 | 120/280/480/480 |
| Monster Park | Cernium / Arcus / Odium / Shangri-La / Arteria / Carcion / Tallahart | 30 / 70 / 130 / 230 / 330 / 430 / 630 | +50 each |
| Epic Dungeon: High Mountain | Hunting Field / Boss & Tainus | 30 / 50 | 80 / 100 |
| Epic Dungeon: Angler Company | All stages | **130** | 180 |
| Epic Dungeon: Nightmare Paradise | All stages | **330** | 380 |

Tallahart/Geardock field values independently confirmed at https://maplestorywiki.net/w/Tallahart and https://maplestorywiki.net/w/Geardock. Cernium/Arcus/Odium/Shangri-La/Arteria/Carcion values confirmed at https://maplestorywiki.net/w/Cernium , /Hotel_Arcus , /Odium , /Shangri-La , /Arteria , /Carcion (each page states the per-section requirement in prose, plus the pre-*New Age* historical values).

##### Western Grandis bosses

| Boss | Mode | Req SAC | Max bonus (125 %) at |
|---|---|---|---|
| **Chosen Seren** | Normal / Hard / Extreme — **Phase 1** | **150** | 200 |
| | Normal / Hard / Extreme — **Phase 2** | **200** | 250 |
| **Kalos the Guardian** | Story | **70** | 120 |
| | Easy (P1/P2) | **200** | 250 |
| | Normal P1 | **250** | 300 |
| | Normal P2 | **300** | 350 |
| | Chaos (P1/P2) | **330** | 380 |
| | Extreme (P1/P2) | **440** | 490 |
| **The First Adversary** | Story | **100** | 150 |
| | Easy | **220** | 270 |
| | Normal | **320** | 370 |
| | Hard | **340** | 390 |
| | Extreme | **460** | 510 |
| **Kaling** | Story / Easy | **230** | 280 |
| | Normal | **330** | 380 |
| | Hard | **350** | 400 |
| | Extreme | **480** | 530 |
| **Malefic Star** | Story / Normal | **400** | 450 |
| | Hard | **550** | 600 |
| **Limbo** | Story | **400** | 450 |
| | Normal / Hard | **500** | 550 |
| **Baldrix** | Story | **500** | 550 |
| | Normal / Hard | **700** | 750 |
| **Jupiter** | Story | **610** | 660 |
| | Normal / Hard | **810** | **860** |

Sources: https://maplestorywiki.net/w/Seren/Monster · https://maplestorywiki.net/w/Kalos/Monster · https://maplestorywiki.net/w/First_Adversary · https://maplestorywiki.net/w/Kaling/Monster · https://maplestorywiki.net/w/Malefic_Star · https://maplestorywiki.net/w/Limbo/Monster · https://maplestorywiki.net/w/Baldrix/Monster · https://maplestorywiki.net/w/Jupiter/Monster — all cross-checked against the KPRobin sheet (which lacks Baldrix; Baldrix values come from the wiki only).

> Note the design intent quoted on the Kaling page: *"Unlike earlier-introduced Grandis bosses (Seren and Kalos), which required high amount of Sacred Power (200 and 300 respectively) in order to deal normal damage as a mean to reduce power creep, Kaling was released with 330 SAC…"* https://maplestorywiki.net/w/Kaling/Monster

---

### E. GMS-SPECIFIC STATE AS OF 2026-09-06 (read this before coding)

1. **GMS is 3 days away from the symbol-rate buff.** Every maplestorywiki daily-quest page currently reads `x N (M in Non-GMS)`. Build the calculator with a **server/patch toggle**, defaulting to whichever you need:
   - *GMS pre-2026-09-09*: Arcane daily 20 (VJ/ChuChu 10 pre-side-area), Arcane weekly 40×3, Sacred daily 10 (Cernium 20), Grand daily 10.
   - *GMS post-2026-09-09 / KMS / other regions*: Arcane daily 40 (20 pre-side-area), Arcane weekly 80×3, Sacred daily 15 (Cernium 30), Grand daily 15.
   - *Post-Overdrive (GMS "Fall 2026", Sept 17 / Oct / Nov 19 2026)*: Arcane weekly becomes 240 × **1** clear/week; daily kill requirement flattened to 100/area.
2. **The Mentor/Mentorship free-leveling column on the wiki does NOT apply to GMS.** Never zero out meso costs for a GMS calc.
3. **Geardock and its Grand Sacred Symbol ARE live in GMS** (Ride The Lightning Part 2). Source: https://maplestorywiki.net/w/MapleStory:_Crown (GMS section, *"2nd: Kinesis Redux, Geardock, and Jupiter"*).
4. Only GMS uses "Sacred"; if you localise, map to "Authentic" for MSEA/KMS/JMS/TMS.

---

### F. CONSOLIDATED FORMULA SHEET (implementation-ready)

```python
# ---------- ARCANE ----------
ARC_MAX_LEVEL = 20
ARC_MESO_BASE = {  # B in 10,000 * floor((L^2+11) * (B + 0.1*L))
    "vanishing_journey": 8,  "chu_chu_island": 10, "lachelein": 12,
    "arcana": 14,            "morass": 16,         "esfera": 18,
}
def arc_symbols_to_next(L):       return L*L + 11                       # L = current level, 1..19
def arc_meso_to_next(L, region):  b10 = 10*ARC_MESO_BASE[region]
                                  return 10_000 * ((arc_symbols_to_next(L) * (b10 + L)) // 10)
def arc_force(L):                 return 20 + 10*L                      # 30..220
def arc_main_stat(L):             return 200 + 100*L                    # 300..2200
def arc_da_hp(L):                 return 4_200 + 2_100*L
def arc_xenon_each(L):            return 96 + 48*L

ARC_TIERS = [  # (min % of requirement, dmg_dealt_mult, dmg_taken_mult)
    (150, 1.50, 0.00), (130, 1.30, 0.40), (110, 1.10, 0.80), (100, 1.00, 1.00),
    ( 70, 0.80, 1.40), ( 50, 0.70, 1.60), ( 30, 0.60, 1.80), ( 10, 0.30, 2.40),
    (  0, 0.10, 2.80),
]
def arc_multipliers(your_arc, required_arc):
    pct = (your_arc * 100) // required_arc
    for lo, dealt, taken in ARC_TIERS:
        if pct >= lo: return dealt, taken     # `taken` is ignored on boss maps

# ---------- SACRED / AUTHENTIC (incl. GRAND) ----------
SAC_MAX_LEVEL = 11
SAC_MESO_BASE = {
    "cernium": 13.2, "arcus": 15.0, "odium": 16.8, "shangri_la": 18.6,
    "arteria": 20.4, "carcion": 22.2,
    "grand_tallahart": 39.8, "grand_geardock": 48.8,
}
def sac_symbols_to_next(L):       return 9*L*L + 20*L                   # L = 1..10
def sac_meso_to_next(L, region):  b10 = round(10*SAC_MESO_BASE[region])
                                  return 100_000 * ((sac_symbols_to_next(L) * (b10 - 6*L)) // 10)
def sac_force(L):                 return 10*L                           # 10..110 (same for Grand)
def sac_main_stat(L):             return 300 + 200*L                    # 500..2500 (NOT for Grand)
def sac_da_hp(L):                 return 6_300 + 4_200*L
def sac_xenon_each(L):            return 144 + 96*L
def grand_exp_pct(L):             return 6 + 4*L                        # 10..50
def grand_meso_pct(L):            return 4 + L                          # 5..15
def grand_drop_pct(L):            return 4 + L                          # 5..15

def sac_multipliers(your_sac, required_sac):
    d = your_sac - required_sac
    if d >= 0: dealt = 1.00 + min(d // 2, 25) / 100.0                   # cap 1.25 at +50
    else:      dealt = max(1.00 + d / 100.0, 0.05)                      # floor 0.05 at -95
    taken = 1.0 if d >= 0 else (1.5 if d >= -50 else 2.0)               # ignored on boss maps
    return dealt, taken
```

Totals to hard-code:
- Arcane: 2,679 symbols/region to Lv20; 16,074 for all six; 2,318,520,000 mesos total; **1,320 AF**, **13,200 main stat**.
- Sacred: 4,565 symbols/region to Lv11; 27,390 for six; 35,905,500,000 mesos; **660 SAC**, **15,000 main stat**, **+60 % EXP**, **+120 % boss damage spread across 6 bosses**.
- Grand Sacred: 4,565 each; 9,130 for two; 36,254,100,000 mesos; **+220 SAC**, **+100 % EXP**, **+30 % meso**, **+30 % drop**.
- Ceilings: **ARC 1,450** (1,320 + 100 hyper + 30 guild); **SAC 880** (symbols only).

---

### G. DISAGREEMENTS, GAPS AND UNVERIFIED ITEMS

| # | Item | Status |
|---|---|---|
| 1 | **Black Mage Story Mode Arcane Force** | **CONFLICT.** maplestorywiki says **880** (https://maplestorywiki.net/w/Black_Mage/Monster); the KPRobin sheet says **800**. Both are current-looking sources. Treat as **UNVERIFIED**; 880 is more likely (the wiki tracks GMS tooltips), but confirm in game. |
| 2 | **Arcane weekly Special Content reward = 40** | StrategyWiki says **15**; six maplestorywiki content pages all say **40**. StrategyWiki is stale/MSEA-era. Use **40**. |
| 3 | **KPRobin "Maximum Authentic Force: 770"** | **Stale.** Predates Geardock. Correct current ceiling is **880**. |
| 4 | **Guild Skill "Special Power" AF value** | maplestorywiki lists a flat **+30** (max level 1). StrategyWiki says "+15~+30" (multi-level). The single-level +30 is the current form; the range is historical. |
| 5 | **Exact behaviour of the SAC "5 %" floor between −90 and −95** | The published tables list rows at −90 (10 %) and "−95 or less" (5 %). Since SAC only moves in increments of 10, `d = −95` is not reachable in practice; the linear formula `1 %p per 1 SAC` covers it. Non-issue for a calculator, but the exact clamp point is technically **UNVERIFIED**. |
| 6 | **Whether Arcane Force from hyper stat / guild counts toward the symbol→stat conversion** | StrategyWiki says non-symbol AF *"is only applied to the penalties/advantages in arcane river maps"*. Consistent with the tooltips (main stat is a symbol-level property, not an AF-derived one), so the answer is clearly *no*, but there is no single authoritative primary statement. |
| 7 | **Baldrix requirement absent from the KPRobin sheet** | Only maplestorywiki (Story 500, Normal/Hard 700) documents it. Single-source. |
| 8 | **Whether GMS's 2026-09-09 update definitely ships the symbol-rate buff** | The wiki plans it under *Post-Ride The Lightning* and the daily-quest pages pre-annotate the Non-GMS numbers, but as of 2026-09-06 it has not shipped in GMS. Verify after 2026-09-09. |
| 9 | **Nexon official GMS patch notes** | Could not be retrieved directly — `nexon.com/maplestory/news/*` is a client-rendered SPA that returns an empty shell to fetchers, and the WebSearch budget was exhausted. Every GMS-specific claim above rests on maplestorywiki's GMS/regional annotations rather than a first-party Nexon page. |
| 10 | **Per-class specials beyond Xenon / Demon Avenger** | None found. Kanna, Kinesis, Zero, Adele, Khali etc. all use the plain "Main Stat" line — the tooltips only carve out Demon Avenger (HP) and Xenon (STR/DEX/LUK). Verified across all 6 Arcane, all 6 Sacred and both Grand Sacred item pages. |
| 11 | **Symbol growth/"EXP" carry-over exact rounding on Arcane Catalyst** | StrategyWiki publishes the full conversion table ("total symbol EXP reduces to 80 % of original, rounded up") but no primary source; single-source. |

---

#### Appendix: complete source list

- https://maplestorywiki.net/w/Arcane_Symbol
- https://maplestorywiki.net/w/Arcane_Symbol_(Equipment)
- https://maplestorywiki.net/w/Arcane_Symbol:_Vanishing_Journey
- https://maplestorywiki.net/w/Arcane_Symbol:_Chu_Chu_Island
- https://maplestorywiki.net/w/Arcane_Symbol:_Lachelein
- https://maplestorywiki.net/w/Arcane_Symbol:_Arcana
- https://maplestorywiki.net/w/Arcane_Symbol:_Morass
- https://maplestorywiki.net/w/Arcane_Symbol:_Esfera
- https://maplestorywiki.net/w/Sacred_Symbol
- https://maplestorywiki.net/w/Sacred_Symbol:_Cernium
- https://maplestorywiki.net/w/Sacred_Symbol:_Arcus
- https://maplestorywiki.net/w/Sacred_Symbol:_Odium
- https://maplestorywiki.net/w/Sacred_Symbol:_Shangri-La
- https://maplestorywiki.net/w/Sacred_Symbol:_Arteria
- https://maplestorywiki.net/w/Sacred_Symbol:_Carcion
- https://maplestorywiki.net/w/Grand_Sacred_Symbol
- https://maplestorywiki.net/w/Grand_Sacred_Symbol:_Tallahart
- https://maplestorywiki.net/w/Grand_Sacred_Symbol:_Geardock
- https://maplestorywiki.net/w/Arcane_River
- https://maplestorywiki.net/w/Western_Grandis
- https://maplestorywiki.net/w/Cernium · /Hotel_Arcus · /Odium · /Shangri-La · /Arteria · /Carcion · /Tallahart · /Geardock
- https://maplestorywiki.net/w/Erda_Spectrum · /Hungry_Muto · /Midnight_Chaser · /Spirit_Savior · /Ranheim_Defense · /Esfera_Guardian
- https://maplestorywiki.net/w/Symbol_Express_Pass
- https://maplestorywiki.net/w/Hyper_Stats
- https://maplestorywiki.net/w/Guild_Skills
- Daily quest pages: https://maplestorywiki.net/w/(Daily_Quest)_Vanishing_Journey_Research and the 12 sibling pages named in §A.5/§B.4/§C.3
- Boss pages: https://maplestorywiki.net/w/Lucid/Monster · /Will/Monster · /Giant_Monster_Gloom · /Hilla/Monster_(Reborn) · /Guard_Captain_Darknell/Monster · /Black_Mage/Monster · /Seren/Monster · /Kalos/Monster · /First_Adversary · /Kaling/Monster · /Malefic_Star · /Limbo/Monster · /Baldrix/Monster · /Jupiter/Monster
- Update pages: https://maplestorywiki.net/w/MapleStory:_Crown · /MapleStory:_Crown/Post-Update · /MapleStory:_Overdrive · /MapleStory:_Milestone
- https://strategywiki.org/wiki/MapleStory/Arcane_River
- https://strategywiki.org/wiki/MapleStory/Grandis
- https://kprobin.blogspot.com/2019/01/arcane-force-extra-damage-and-monster.html → https://docs.google.com/spreadsheets/d/1sJSM7iZDP9e4GRfhGvhfpnGWYVwh2AaeywUIhi4F4Ec/
- https://orangemushroom.net/2026/02/14/kms-ver-1-2-412-maplestory-crown-geardrak-jupiter-guild-castle/
- https://orangemushroom.net/2026/03/23/kms-ver-1-2-413-maplestorys-23rd-anniversary-maple-attack/
- https://grandislibrary.com/content/stat-terms
- Third-party calculators for cross-checking: https://whackybeanz.com/calc/symbols · https://maplesymbols.com/

---


## 4. Inner Ability and Link Skills

> Researched independently, primarily against Nexon Korea's own published probability-disclosure pages and per-skill MapleStory Wiki pages (GMS v270).

**Research date:** 2026-09-06
**Game version context:** GMS is on **v270** (the MapleStory Wiki tags current skill data as "GMS v270"; Grandis Library's Link Skill page footer says "GMS Ver. 269"). KMS is on ver. 1.2.416+ (*Overdrive*, July 2026).
Sources: [maplestorywiki.net/w/Guiding_Stars](https://maplestorywiki.net/w/Guiding_Stars) (shows "GMS v270"), [grandislibrary.com/content/link-skills](https://grandislibrary.com/content/link-skills) (footer "GMS Ver. 269").

**Method note:** every number below carries an inline source URL. Where two reputable sources disagree, both are cited and the disagreement is flagged. Anything I could not confirm against a primary/authoritative source is marked **UNVERIFIED**.

---

### PART A — INNER ABILITY ("Ability")

#### A1. Basics

| Fact | Value | Source |
|---|---|---|
| In-game name | "Ability" (wiki also uses Inner Ability / Inner Potential) | [MSW Inner Ability](https://maplestorywiki.net/w/Inner_Ability) |
| Unlocked at | Character level 50 (auto-unlocks the panel); quest "The Eye Opener / Awakening Abilities" from Maple Administrator | [MSW](https://maplestorywiki.net/w/Inner_Ability), [StrategyWiki](https://strategywiki.org/wiki/MapleStory/Inner_Ability) |
| Number of lines | 3 | [MSW](https://maplestorywiki.net/w/Inner_Ability) |
| Presets | 3 presets, switchable; all start at the default stat set | [MSW](https://maplestorywiki.net/w/Inner_Ability) |
| Starting state (new characters) | **Epic**, total All Stats +25 | [MSW](https://maplestorywiki.net/w/Inner_Ability) |
| Starting state (older characters) | **Rare**, total All Stats +9 (default lines were Final All Stat +1 / +3 / +5) | [MSW](https://maplestorywiki.net/w/Inner_Ability), [StrategyWiki](https://strategywiki.org/wiki/MapleStory/Inner_Ability) |
| Duplicate lines | You can never roll two lines with the exact same stat, even at different ranks | [MSW](https://maplestorywiki.net/w/Inner_Ability) |
| Total distinct lines | 45 total (31 available at Rare, 34 at Epic, 40 at Unique, 43 at Legendary) | [StrategyWiki](https://strategywiki.org/wiki/MapleStory/Inner_Ability) — *last edited May 2023, but the official KMS line list has not changed; see A7* |

##### Tiers
Rare → Epic → Unique → Legendary. Resets **cannot lower** your rank. Rare and Epic lines **cannot be locked**; locking any line also locks the overall rank (and therefore prevents a rank-up that reset). ([MSW](https://maplestorywiki.net/w/Inner_Ability))

#### A2. Honor EXP costs and rank-up probability

**Reset cost + rank-up chance (Honor EXP reset, no locks):**

| Current rank | Honor EXP (no lock) | Honor EXP (rank + 1 line locked) | Honor EXP (rank + 2 lines locked) | Chance to rank up |
|---|---|---|---|---|
| Rare | 100 | n/a (cannot lock) | n/a | **100.00%** (Rare→Epic) |
| Epic | 200 | n/a (cannot lock) | n/a | **2.00%** (Epic→Unique) |
| Unique | 1,500 | 3,000 | 5,500 | **1.00%** (Unique→Legendary) |
| Legendary | 8,000 | 11,000 | 16,000 | — (max) |

Sources: costs + rates [MSW Inner Ability](https://maplestorywiki.net/w/Inner_Ability); rates confirmed against the **official KMS probability disclosure page** [maplestory.nexon.com/Guide/OtherProbability/ability/reputevalue](https://maplestory.nexon.com/Guide/OtherProbability/ability/reputevalue) (레어→에픽 100.00% / 에픽→유니크 2.00% / 유니크→레전드리 1.00%). That page's own changelog states it was last synced to the **2026/6/18 KMS update** (reflected 2026-07-10), so these are current numbers.

> ⚠️ **Source disagreement:** [StrategyWiki](https://strategywiki.org/wiki/MapleStory/Inner_Ability) lists Rare→Epic as **5%**, Epic→Unique 2%, Unique→Legendary 1%. StrategyWiki's page was last edited **14 May 2023** and predates the change that made Rare→Epic guaranteed. Use **100%** for Rare→Epic.

**Event discount:** Ability reset costs are halved during certain events (e.g. the recurring "50% discount on Ability reset costs" Sunday Maple benefit). ([Orange Mushroom, KMS 1.2.410](https://orangemushroom.net/2025/12/28/kms-ver-1-2-410-maplestory-crown-kinesis-remaster/))

**Honor EXP cap:** 9,999,999. Above 9,000,000 you can no longer *consume* Honor medals (but drops/level-ups still credit up to the cap). ([StrategyWiki](https://strategywiki.org/wiki/MapleStory/Inner_Ability))

**Main Honor EXP sources** ([StrategyWiki](https://strategywiki.org/wiki/MapleStory/Inner_Ability)):
- Medal of Honor drop (monsters ±20 levels, character Lv.50+): **10** Honor each
- Boss Medal of Honor (most raid bosses): **150** each
- Large Boss Medal of Honor (chance from Normal Lotus/Damien and above): **5,000**
- Event Medal of Honor (events / Dojo / Ursus): usually **10,000**
- The Seed Medal of Honor (Tower of Oz clear): **100**
- Level up: **700** Honor per level starting at Lv.49, +100 more every 10 levels (Zero only from Lv.100)
- Fairy Bros' Daily Gift days 9 and 23: **10,000** each
- Bounty Hunter pouches: Basic **500** / Intermediate **1,000** / Advanced **2,000** (chance)
- Blockbusters (Black Heaven, Heroes of Maple), Monster Park on Thu/Sat

#### A3. Circulators

| Circulator | Effect | Usable on | Where | Source |
|---|---|---|---|---|
| **Chaos Circulator** | Rerolls the *numeric values* of all 3 lines; keeps rank and stat types | Unique & Legendary only | Events / event shops | [MSW Circulator](https://maplestorywiki.net/w/Circulator) |
| **Black Circulator** | Same as Chaos, but you may **decline** the result (all-3 or nothing) | Unique & Legendary only | Events / event shops | [MSW Circulator](https://maplestorywiki.net/w/Circulator) |
| **Unique Circulator** | Force-sets Ability to **Unique**, rerolls all 3 lines | Rare & Epic only | Golden Apple (low chance), events; tradable | [MSW Circulator](https://maplestorywiki.net/w/Circulator) |
| **Legendary Circulator** | Force-sets Ability to **Legendary**, rerolls all 3 lines | Rare / Epic / Unique | Events / event shops (e.g. 2,000 coins, limit 3) | [MSW Circulator](https://maplestorywiki.net/w/Circulator), [OM Crown](https://orangemushroom.net/2025/12/28/kms-ver-1-2-410-maplestory-crown-kinesis-remaster/) |
| **Miracle Circulator** | Reroll with better rank-up odds; **always rolls the maximum value** for each line's rank. Cannot lock lines. Can decline the result (all-3 or nothing); if the rank went up you must accept to keep it. | Epic or higher | Cash Shop: **1,900 NX/RP** (Interactive) or **19,000,000 mesos** (Heroic/Reboot) | [MSW Circulator](https://maplestorywiki.net/w/Circulator) |
| **Hyper Circulator / Hyper Miracle Circulator** | Miracle + a chance the **2nd line matches the overall rank** (incl. a 1% chance of a 2nd Legendary line) | Epic or higher | **TMS and MapleSEA only**, Cash Shop ~6,000 Cash, periodic | [MSW Circulator](https://maplestorywiki.net/w/Circulator), [MSW Inner Ability](https://maplestorywiki.net/w/Inner_Ability) |
| **Change Circulator** | Converts one specific Legendary-rank line into a different specific line (see A6) | **Legendary only** | KMS *Crown* (Dec 2025) Kinesis-remaster compensation item only — **not a general item** | [OM Crown](https://orangemushroom.net/2025/12/28/kms-ver-1-2-410-maplestory-crown-kinesis-remaster/) |

**Miracle Circulator rank-up rates (official KMS):** Epic→Unique **30.00%**, Unique→Legendary **10.00%**. ([maplestory.nexon.com/.../miraclecirculator](https://maplestory.nexon.com/Guide/OtherProbability/ability/miraclecirculator))

#### A4. Which line gets which rank (first line vs 2nd/3rd line)

This is the single most important mechanic for a calculator: **only the 1st line can be your Ability's full rank.** Lines 2 and 3 are capped one rank below.

**Official KMS table** ([reputevalue](https://maplestory.nexon.com/Guide/OtherProbability/ability/reputevalue)), identical on [MSW](https://maplestorywiki.net/w/Inner_Ability):

| Line | Ability = Epic | Ability = Unique | Ability = Legendary |
|---|---|---|---|
| **1st line** | Epic 100% | Unique 100% | **Legendary 100%** |
| **2nd line** | Rare 100% | Rare 70% / Epic 30% | Epic 85% / Unique 15% |
| **3rd line** | Rare 100% | Rare 70% / Epic 30% | Epic 85% / Unique 15% |

The same table applies to Miracle Circulator rolls ([miraclecirculator](https://maplestory.nexon.com/Guide/OtherProbability/ability/miraclecirculator)).

**Hyper Circulator (TMS/MSEA) 2nd/3rd line ranks** ([MSW](https://maplestorywiki.net/w/Inner_Ability), sourced to the TMS official site):

| Line | Ability = Epic | Ability = Unique | Ability = Legendary |
|---|---|---|---|
| 1st | Epic 100% | Unique 100% | Legendary 100% |
| 2nd | Rare 70% / Epic 30% | Epic 85% / Unique 15% | Epic 79% / Unique 20% / **Legendary 1%** |
| 3rd | Rare 100% | Rare 70% / Epic 30% | Epic 85% / Unique 15% |

> ⚠️ **Source disagreement:** [StrategyWiki](https://strategywiki.org/wiki/MapleStory/Inner_Ability) gives 2nd/3rd-line ranks at Legendary as **Rare 50% / Epic 40% / Unique 10%**, and at Unique as Rare 70% / Epic 30%. StrategyWiki was last edited 2023-05-14; the current official KMS page says **Epic 85% / Unique 15%**. Trust the official page.

**Legacy characters:** for characters whose Ability was rolled before the Unlimited/Unleashed/Season 2 update, a *theoretical* 2nd/3rd line can hold the top rank (it just displays first because display order is by descending rank). Locking such a line and resetting keeps it treated as a 2nd/3rd line — meaning those accounts can hold **more than one Legendary line**. ([StrategyWiki](https://strategywiki.org/wiki/MapleStory/Inner_Ability))

##### First-line-only vs. second/third-line-only (derived, and important)

Because lines 2 and 3 max out at **Unique** when your Ability is Legendary, **every Legendary-exclusive line is first-line-only in practice**:

**Legendary-exclusive ⇒ 1st line only:**
- Attack Speed +1
- Passive Skill Level +1
- Number of enemies hit by multi-target skills +1
- Attack Power +1 per X levels
- Magic Attack +1 per X levels

**Unique-and-above lines** (can appear on line 1 at Unique/Legendary, and on lines 2/3 **only when your Ability is Legendary**, at Unique values):
- Boss Damage %
- Max HP % / Max MP %
- Final damage + % of DEF ("DEF to damage conversion")
- % chance to skip cooldowns
- DEF % (Chaos/Black Circulator only)

**Effectively 2nd/3rd-line-only at Legendary:** Jump and Movement Speed — they have **no Legendary value** at all, so at Legendary rank they cannot be the 1st line but can still show up on lines 2/3 (which roll Epic/Unique).

Everything else (stats, All Stat, HP/MP flat, ATT/MATT, Crit Rate, Buff Duration, Drop, Meso, normal/abnormal-monster damage, AP-conversion lines, flat DEF) exists at multiple ranks and can appear on any line.

Source for tier availability of each line: the official KMS type-probability table ([reputevalue](https://maplestory.nexon.com/Guide/OtherProbability/ability/reputevalue)), mirrored at [MSW](https://maplestorywiki.net/w/Inner_Ability).

#### A5. THE FULL LINE LIST — value ranges per tier

All values below are from the **official KMS probability disclosure** table 「어빌리티 옵션 수치 설정 확률」 ([reputevalue](https://maplestory.nexon.com/Guide/OtherProbability/ability/reputevalue)), cross-checked against [MSW Inner Ability](https://maplestorywiki.net/w/Inner_Ability). `—` = not obtainable at that rank.

##### A5.1 Value tables (with per-value roll chance on an Honor reset)

**Single stat (STR / DEX / INT / LUK) and dual-stat lines.** Dual-stat lines are written `A (B)` = +A to the first stat, +B to the second. The 12 dual-stat lines are STR,DEX / STR,INT / STR,LUK / DEX,INT / DEX,LUK / INT,LUK / DEX,STR / INT,STR / LUK,STR / INT,DEX / LUK,DEX / LUK,INT.

| Chance | Rare | Epic | Unique | Legendary |
|---|---|---|---|---|
| 20% | 5 (3) | 15 (8) | 25 (13) | 35 (18) |
| 20% | 6 (3) | 16 (8) | 26 (13) | 36 (18) |
| 20% | 7 (4) | 17 (9) | 27 (14) | 37 (19) |
| 15% | 8 (4) | 18 (9) | 28 (14) | 38 (19) |
| 15% | 9 (5) | 19 (10) | 29 (15) | 39 (20) |
| 10% | **10 (5)** | **20 (10)** | **30 (15)** | **40 (20)** |

**All Stats (flat)** — note this is a *flat* All Stat bonus, not a % line:

| Chance | Rare | Epic | Unique | Legendary |
|---|---|---|---|---|
| 20% | 5 | 15 | 25 | 35 |
| 20% | 6 | 16 | 26 | 36 |
| 20% | 7 | 17 | 27 | 37 |
| 15% | 8 | 18 | 28 | 38 |
| 15% | 9 | 19 | 29 | 39 |
| 10% | **10** | **20** | **30** | **40** |

**Max HP / Max MP (flat)**

| Chance | Rare | Epic | Unique | Legendary |
|---|---|---|---|---|
| 20% | 75 | 225 | 375 | 525 |
| 20% | 90 | 240 | 390 | 540 |
| 20% | 105 | 255 | 405 | 555 |
| 15% | 120 | 270 | 420 | 570 |
| 15% | 135 | 285 | 435 | 585 |
| 10% | **150** | **300** | **450** | **600** |

**Attack Power / Magic Attack (flat)** — *Note: [MSW](https://maplestorywiki.net/w/Inner_Ability) labels the second of these rows "Damage"; the official KMS page shows 공격력 증가 (Attack) and **마력 증가 (Magic Attack)**. MSW's "Damage" row is a mistranslation of Magic Attack.*

| Chance | Rare | Epic | Unique | Legendary |
|---|---|---|---|---|
| 20% | — | 6 | 15 | 27 |
| 20% | — | 6 | 18 | 27 |
| 20% | — | 9 | 18 | 27 |
| 15% | — | 9 | 18 | 30 |
| 15% | — | 9 | 21 | 30 |
| 10% | — | **12** | **21** | **30** |

**Critical Rate %**

| Chance | Rare | Epic | Unique | Legendary |
|---|---|---|---|---|
| 20% | — | 5 | 15 | 25 |
| 20% | — | 6 | 16 | 26 |
| 20% | — | 7 | 17 | 27 |
| 15% | — | 8 | 18 | 28 |
| 15% | — | 9 | 19 | 29 |
| 10% | — | **10** | **20** | **30** |

**Boss Damage % / Max HP % / Max MP % / DEF %** (DEF % appears only via Chaos or Black Circulator, per [MSW](https://maplestorywiki.net/w/Inner_Ability))

| Chance | Rare | Epic | Unique | Legendary |
|---|---|---|---|---|
| 20% | — | — | 5 | 15 |
| 20% | — | — | 6 | 16 |
| 20% | — | — | 7 | 17 |
| 15% | — | — | 8 | 18 |
| 15% | — | — | 9 | 19 |
| 10% | — | — | **10** | **20** |

**% chance to skip cooldowns** (identical spread)

| Chance | Rare | Epic | Unique | Legendary |
|---|---|---|---|---|
| 20% | — | — | 5 | 15 |
| 20% | — | — | 6 | 16 |
| 20% | — | — | 7 | 17 |
| 15% | — | — | 8 | 18 |
| 15% | — | — | 9 | 19 |
| 10% | — | — | **10** | **20** |

**Buff skill duration %**

| Chance | Rare | Epic | Unique | Legendary |
|---|---|---|---|---|
| 20% | 7 | 19 | 32 | 44 |
| 20% | 8 | 20 | 33 | 45 |
| 20% | 9 | 22 | 34 | 47 |
| 15% | 10 | 23 | 35 | 48 |
| 15% | 12 | 24 | 37 | 49 |
| 10% | **13** | **25** | **38** | **50** |

**Item Drop Rate % / Meso Obtained %**

| Chance | Rare | Epic | Unique | Legendary |
|---|---|---|---|---|
| 20% | 3 | 8 | 13 | 18 |
| 20% | 3 | 8 | 13 | 18 |
| 20% | 4 | 9 | 14 | 19 |
| 15% | 4 | 9 | 14 | 19 |
| 15% | 5 | 10 | 15 | 20 |
| 10% | **5** | **10** | **15** | **20** |

**Damage to normal monsters % / Damage to abnormal-status monsters % / "% of AP invested in X added to Y"**

| Chance | Rare | Epic | Unique | Legendary |
|---|---|---|---|---|
| 20% | 2 | 4 | 7 | 9 |
| 20% | 2 | 4 | 7 | 9 |
| 20% | 2 | 5 | 7 | 10 |
| 15% | 2 | 5 | 7 | 10 |
| 15% | 3 | 5 | 8 | 10 |
| 10% | **3** | **5** | **8** | **10** |

*(The four AP-conversion lines are: % of AP invested in STR added to DEX; DEX→STR; INT→LUK; LUK→DEX.)*

**Final damage + % of DEF ("방어력의 % 만큼 데미지 고정값 증가")**

| Chance | Rare | Epic | Unique | Legendary |
|---|---|---|---|---|
| 20% | — | — | 13 | 38 |
| 20% | — | — | 15 | 40 |
| 20% | — | — | 18 | 43 |
| 15% | — | — | 20 | 45 |
| 15% | — | — | 23 | 48 |
| 10% | — | — | **25** | **50** |

Mechanic: adds a *flat* damage number equal to `DEF × rate`, e.g. 5,000 DEF × 25% = +1,250 raw damage per line. Essentially worthless at endgame. ([StrategyWiki](https://strategywiki.org/wiki/MapleStory/Inner_Ability))

**DEF increase (flat)** — only appears via Chaos/Black Circulator

| Chance | Rare | Epic | Unique | Legendary |
|---|---|---|---|---|
| 20% | 50 | 150 | 250 | 350 |
| 20% | 60 | 160 | 260 | 360 |
| 20% | 70 | 170 | 270 | 370 |
| 15% | 80 | 180 | 280 | 380 |
| 15% | 90 | 190 | 290 | 390 |
| 10% | **100** | **200** | **300** | **400** |

**Jump / Movement Speed**

| Chance | Rare | Epic | Unique | Legendary |
|---|---|---|---|---|
| 20% | 4 | 10 | 18 | — |
| 20% | 4 | 12 | 18 | — |
| 20% | 6 | 12 | 18 | — |
| 15% | 6 | 12 | 20 | — |
| 15% | 6 | 14 | 20 | — |
| 10% | **8** | **14** | **20** | — |

**Attack Power +1 per X levels** (Legendary only — *lower X is better*)

| Chance | X (levels) |
|---|---|
| 20% | 16 |
| 40% | 14 |
| 30% | 12 |
| 10% | **10** |

**Magic Attack +1 per X levels** (Legendary only) — identical distribution: 16 (20%), 14 (40%), 12 (30%), **10 (10%)**.

At level 300 with X=10 that is +30 ATT/MATT; at X=16 it is +18. Note MSW's table and the raw official table both list six 20/20/20/15/15/10 rows collapsing to `16, 14, 14, 12, 12, 10`, which is why the aggregate is 16:20% / 14:40% / 12:30% / 10:10%.

**Attack Speed +1 / Passive Skill Level +1 / Multi-target enemy count +1** — Legendary only, value is always **1** (100%).

##### A5.2 Legendary-tier maximum per line (quick reference for a calculator)

| Line | Legendary max | 2nd/3rd-line max (Unique) |
|---|---|---|
| Attack Speed +1 stage | **1** | not obtainable |
| Passive Skill Level +1 | **1** | not obtainable |
| Multi-target enemy count +1 | **1** | not obtainable |
| Attack Power +1 per X levels | **every 10 levels** | not obtainable |
| Magic Attack +1 per X levels | **every 10 levels** | not obtainable |
| Boss Damage % | **20%** | 10% |
| Buff Duration % | **50%** | 38% |
| Critical Rate % | **30%** | 20% |
| Attack Power (flat) | **30** | 21 |
| Magic Attack (flat) | **30** | 21 |
| Single main stat (STR/DEX/INT/LUK) | **40** | 30 |
| Dual stat (A/B) | **40 / 20** | 30 / 15 |
| All Stats (flat) | **40** | 30 |
| Max HP % / Max MP % | **20%** | 10% |
| Max HP / Max MP (flat) | **600** | 450 |
| % chance to skip cooldown | **20%** | 10% |
| Item Drop Rate % | **20%** | 15% |
| Meso Obtained % | **20%** | 15% |
| Damage to normal monsters % | **10%** | 8% |
| Damage to abnormal-status monsters % | **10%** | 8% |
| AP-conversion (X% of AP in A → B) | **10%** | 8% |
| Final damage + % of DEF | **50%** | 25% |
| DEF (flat, circulator-only) | **400** | 300 |
| DEF % (circulator-only) | **20%** | 10% |
| Jump / Movement Speed | not obtainable | 20 |

Source for the entire table: [official KMS ability probability page](https://maplestory.nexon.com/Guide/OtherProbability/ability/reputevalue) and [MSW Inner Ability](https://maplestorywiki.net/w/Inner_Ability).

##### A5.3 Line-type roll probabilities (Honor reset, 1st line)

From the official KMS type table ([reputevalue](https://maplestory.nexon.com/Guide/OtherProbability/ability/reputevalue)); MSW mirrors these exactly.

| Line type | Rare | Epic | Unique | Legendary |
|---|---|---|---|---|
| STR / DEX / INT / LUK (each) | 3.8927% | 4.1705% | 4.2254% | 4.1628% |
| Max HP / Max MP (each) | 3.7197% | 2.7804% | 2.3474% | 1.8501% |
| Attack Power | — | 1.8536% | 1.4085% | 2.3127% |
| Magic Attack | — | 1.8536% | 1.4085% | 2.3127% |
| Critical Rate % | — | 0.9268% | 0.4695% | **0.4625%** |
| All Stats | 3.4602% | 2.7804% | 1.8779% | 1.8501% |
| **Attack Speed +1** | — | — | — | **0.4625%** |
| AP-conversion lines (each of 4) | 2.5952% | 2.7804% | 2.8169% | 2.3127% |
| Attack +1 per N levels | — | — | — | 2.3127% |
| Magic Attack +1 per N levels | — | — | — | 2.3127% |
| Max HP % / Max MP % (each) | — | — | 1.8779% | 1.8501% |
| **Boss Damage %** | — | — | 0.9390% | **2.3127%** |
| Damage to normal monsters % | 3.02768% | 2.7804% | 1.8779% | 1.8501% |
| Damage to abnormal-status monsters % | 3.02768% | 2.7804% | 1.8779% | 1.8501% |
| Final damage + % of DEF | — | — | 1.8779% | 1.8501% |
| % chance to skip cooldown | — | — | 1.8779% | 1.8501% |
| **Passive Skill Level +1** | — | — | — | **0.7401%** |
| Multi-target enemy count +1 | — | — | — | 0.7401% |
| **Buff skill duration %** | 3.4602% | 1.3902% | 0.9390% | **0.9251%** |
| Item Drop Rate % | 3.4602% | 2.7804% | 1.8779% | 1.8501% |
| Meso Obtained % | 3.4602% | 2.7804% | 1.8779% | 1.8501% |
| Each of the 12 dual-stat lines | 3.8927% | 3.8925% | 3.7559% | 3.2377% |

**Miracle Circulator type probabilities differ slightly** — notably **Boss Damage % at Unique jumps from 0.9390% → 2.2624%**, Critical Rate at Epic 0.9268% → 1.8034%, ATT/MATT at Epic 1.8536% → 2.7051%. Full table: [miraclecirculator](https://maplestory.nexon.com/Guide/OtherProbability/ability/miraclecirculator).

**Miracle Circulator value guarantee:** 100% chance of the maximum value for the rolled rank (e.g. Legendary Boss Damage always 20%, Legendary Buff Duration always 50%, Legendary ATT always 30). ([miraclecirculator](https://maplestory.nexon.com/Guide/OtherProbability/ability/miraclecirculator))

##### A5.4 Lines that DO NOT exist in Inner Ability

The prompt asked about several stats that are **not** Inner Ability lines. Confirmed absent from the complete official KMS line list ([reputevalue](https://maplestory.nexon.com/Guide/OtherProbability/ability/reputevalue)):

- **Abnormal Status Resistance** — not an Ability line (it's a Cygnus link skill / Hyper Stat / potential stat)
- **Chance to ignore damage** — not an Ability line (this is an equipment Potential line)
- **Chance to gain HP/MP on attack or when hit** — not an Ability line (equipment Potential)
- **Flat cooldown reduction (−N seconds) and Cooldown Reduction %** — not an Ability line. The only cooldown line is the *% chance to skip cooldown entirely* (Unique 5–10%, Legendary 15–20%).
- **Generic "Damage %"** — does not exist. There is only Boss Damage %, Damage to normal monsters %, and Damage to abnormal-status monsters %.
- **Passive skill +1 level** *does* exist (Legendary only, value 1).

> **UNVERIFIED / likely incorrect third-party claims.** Several SEO content sites publish an "inner ability expansion" line list including *Cooldown Reduction % max 8% / flat −5 sec*, *"10% HP Healing every second (Legendary exclusive)"*, *Party Final Damage +2% per party member up to 10%*, and *Solo Final Damage +10%*. Examples: [gameslikefinder.com](https://gameslikefinder.com/article/maplestory-best-inner-ability/), [daycalculators.com](https://daycalculators.com/maplestory-inner-ability-calculator/), [digitaltq.com](https://www.digitaltq.com/maplestory-inner-ability-guide). **None of these lines appear on the official KMS probability page as of the 2026-06-18 sync, nor on [MSW](https://maplestorywiki.net/w/Inner_Ability) (edited 2026-01-17).** The Party/Solo Final Damage idea traces back to a **player suggestion thread**, not a patch note: [forums.maplestory.nexon.net/discussion/35102/inner-ability-expansion](https://forums.maplestory.nexon.net/discussion/35102/inner-ability-expansion) (Feb 2025). **Treat all of these as non-existent unless you can find them in an official patch note.**

#### A6. 2025–2026 changes to Inner Ability

| Date / patch | Change | Source |
|---|---|---|
| **KMS ver. 1.2.410 — *Crown* (Dec 2025)** | **Change Circulator** introduced (as a Kinesis-remaster compensation item, 1 per Kinesis character created before 2025-12-18, claimable 2025-12-18 → 2026-01-14). Converts one specific Legendary-rank line into another. Requires Legendary rank; the new line keeps the same "level" tier as the old one; you must already possess the line being converted. | [OM Crown](https://orangemushroom.net/2025/12/28/kms-ver-1-2-410-maplestory-crown-kinesis-remaster/) |
| **KMS 1.2.410** | *"Link Skills, Hyper Stats, and Ability can now be changed in Epic Dungeon boss stages."* | [MSW MapleStory: Crown](https://maplestorywiki.net/w/MapleStory:_Crown) |
| **KMS ver. 1.2.416 — *Overdrive* (June/July 2026)** | **Ability Auto Reset system** added to the Reset Ability UI. Register up to **6 target stats**; auto-reset stops when any stat matches or exceeds a target, or when Honor runs out. **Legendary tier only**, **Honor only** (not circulators). Stoppable with ESC / SPACE / ENTER / Cancel button. | [OM Overdrive](https://orangemushroom.net/2026/07/04/kms-ver-1-2-416-maplestory-overdrive-ruler-of-covenants-lethe/), [MSW MapleStory: Overdrive](https://maplestorywiki.net/w/MapleStory:_Overdrive) |
| **KMS 1.2.416** | **"When resetting Ability with Honor, you can no longer receive the same stats as what you previously had."** (Anti-duplicate protection across consecutive rolls — materially improves expected rolls-to-target.) | [OM Overdrive](https://orangemushroom.net/2026/07/04/kms-ver-1-2-416-maplestory-overdrive-ruler-of-covenants-lethe/) |
| **Official KMS probability page** | Last synced to the **2026-06-18** update on 2026-07-10 — i.e. no new line types or value changes were introduced through mid-2026. | [reputevalue](https://maplestory.nexon.com/Guide/OtherProbability/ability/reputevalue) |

**Change Circulator conversion table** ([OM Crown](https://orangemushroom.net/2025/12/28/kms-ver-1-2-410-maplestory-crown-kinesis-remaster/)):

| Stat before | Rank | Value before | → Stat after | Value after |
|---|---|---|---|---|
| Passive Skill Levels +1 | Legendary | — | Boss Damage | 20% |
| Boss Damage | Unique | 5% | Magic Attack / Buff Duration / Critical Rate | 15 / 32% / 15% |
| Boss Damage | Unique | 6% | Magic Attack / Buff Duration / Critical Rate | 18 / 33% / 16% |
| Boss Damage | Unique | 7% | Magic Attack / Buff Duration / Critical Rate | 18 / 34% / 17% |
| Boss Damage | Unique | 8% | Magic Attack / Buff Duration / Critical Rate | 18 / 35% / 18% |
| Boss Damage | Unique | 9% | Magic Attack / Buff Duration / Critical Rate | 21 / 37% / 19% |
| Boss Damage | Unique | 10% | Magic Attack / Buff Duration / Critical Rate | 21 / 38% / 20% |

**"Guaranteed Legendary"** — there is no general guaranteed-Legendary mechanic. The **Legendary Circulator** (event item) force-sets Legendary. Honor resets remain 1% Unique→Legendary; Miracle Circulator 10%.

**GMS status of the 2026 Ability changes:** GMS has not yet received *Overdrive* as of Sept 2026 (GMS's most recent major update is Erel Light / *Ride The Lightning*), so the **Ability Auto Reset and the no-duplicate-on-reset rule are KMS-only for now — UNVERIFIED for GMS.** ([MSW Updates](https://maplestorywiki.net/w/MapleStory_Wiki:Updates))

#### A7. Recommended-line summary (for calculator weighting)

Consensus "top" Legendary 1st lines for a bossing character, per [StrategyWiki ratings](https://strategywiki.org/wiki/MapleStory/Inner_Ability) and [MSW](https://maplestorywiki.net/w/Inner_Ability) probabilities:
1. **Attack Speed +1** (0.4625% at Legendary) — hard cap-breaking for most classes
2. **Boss Damage 20%** (2.3127% at Legendary; 2.2624% at Unique via Miracle Circulator)
3. **Buff Duration 50%** (0.9251%) — for classes with long buffs
4. **Passive Skill Level +1** (0.7401%)
5. **Critical Rate 30%** (0.4625%) — only if you need crit rate
6. **ATT/MATT +1 per 10 levels** (2.3127%) — 30 ATT at Lv.300

Common 2nd/3rd (Unique-capped) lines: Boss Damage 10%, ATT/MATT 21, Crit Rate 20%, Buff Duration 38%, Meso/Drop 15%.

---

### PART B — LINK SKILLS

#### B1. System rules

| Rule | Detail | Source |
|---|---|---|
| Where | Beginner/Novice skill tab → **Link Manager** | [Grandis Library](https://grandislibrary.com/content/link-skills) |
| Transfer unlock | Character must be **Lv. 70** and have completed 1st Job Advancement | [MSW Link Skill](https://maplestorywiki.net/w/Link_Skill) |
| **Max link skills equipped** | **12 link skills from other characters** (13 total counting the character's own) | [MSW Link Skill](https://maplestorywiki.net/w/Link_Skill), [Grandis Library](https://grandislibrary.com/content/link-skills) |
| Presets | **3 presets** of 12 link skills each | [Grandis Library](https://grandislibrary.com/content/link-skills) |
| Sharing limit | **No limit** on how many characters a single link can be shared to (since the NEXT/Stargazer revamp) | [Grandis Library](https://grandislibrary.com/content/link-skills), [MSW](https://maplestorywiki.net/w/Link_Skill) |
| Duplicates | A receiving character cannot hold two copies of the same link skill (e.g. two Kaisers) | [MSW](https://maplestorywiki.net/w/Link_Skill) |
| Same world / same account | Required | [MSW](https://maplestorywiki.net/w/Link_Skill) |
| Boss maps | Transferring, removing and preset-switching are blocked inside boss maps (added in NEXT/Stargazer). *Later relaxed for Epic Dungeon boss stages in Crown.* | [MSW Link Skill](https://maplestorywiki.net/w/Link_Skill), [MSW Crown](https://maplestorywiki.net/w/MapleStory:_Crown) |

##### Level progression

| Level | Requirement | Source |
|---|---|---|
| Lv. 1 | Granted on character creation; shareable at Lv. 70 | [MSW](https://maplestorywiki.net/w/Link_Skill) |
| Lv. 2 | Character reaches **Lv. 120** | [MSW](https://maplestorywiki.net/w/Link_Skill) |
| **Lv. 3 — GMS** | Character reaches **Lv. 210**. Per-character, no item needed. | [MSW](https://maplestorywiki.net/w/Link_Skill), [MSW Crown (GMS notes)](https://maplestorywiki.net/w/MapleStory:_Crown) |
| **Lv. 3 — KMS/other** | Character reaches **Lv. 285**, then uses a **Proof of a Brilliant Hero / Proof of a Radiant Hero** item on **one** link skill of choice (one item per character; from the Carcion story questline) | [MSW](https://maplestorywiki.net/w/Link_Skill), [OM Crown](https://orangemushroom.net/2025/12/28/kms-ver-1-2-410-maplestory-crown-kinesis-remaster/) |
| Zero | *Rhinne's Blessing* levels via story quests — Lv. 5 on finishing the story at Lv. 178; Lv. 6 follows the normal Lv.3 rule | [MSW](https://maplestorywiki.net/w/Link_Skill) |

##### Faction stacking

Explorers (per job branch), Cygnus Knights and Resistance share one link skill per faction; each **unique** class in the faction contributes its levels. Levelling two of the same class does nothing beyond the first.

| Faction / branch | Member classes | Max Level | Source |
|---|---|---|---|
| Explorer Warrior | Hero, Paladin, Dark Knight | **9** (3 × Lv.3) | [Invincible Belief](https://maplestorywiki.net/w/Invincible_Belief) |
| Explorer Magician | Bishop, Arch Mage (F/P), Arch Mage (I/L) | **9** | [Empirical Knowledge](https://maplestorywiki.net/w/Empirical_Knowledge) |
| Explorer Bowman | Bow Master, Marksman, **Pathfinder** | **9** | [Adventurer's Curiosity](https://maplestorywiki.net/w/Adventurer%27s_Curiosity) |
| Explorer Thief | Night Lord, Shadower, **Dual Blade** | **9** | [Thief's Cunning](https://maplestorywiki.net/w/Thief%27s_Cunning) |
| Explorer Pirate | Buccaneer, Corsair, **Cannoneer** | **9** | [Pirate Blessing](https://maplestorywiki.net/w/Pirate_Blessing) |
| Cygnus Knights | Dawn Warrior, Blaze Wizard, Wind Archer, Night Walker, Thunder Breaker | **15** (5 × Lv.3) | [Cygnus Blessing](https://maplestorywiki.net/w/Cygnus_Blessing) |
| Resistance | Battle Mage, Wild Hunter, Mechanic, Blaster | **12** (4 × Lv.3) | [Spirit of Freedom](https://maplestorywiki.net/w/Spirit_of_Freedom) |
| Shine | Sia Astelle, Erel Light | **6** (2 × Lv.3) | [Guiding Stars](https://maplestorywiki.net/w/Guiding_Stars) |
| Zero (special) | — | **6** | [Rhinne's Blessing](https://maplestorywiki.net/w/Rhinne%27s_Blessing) |
| All other classes | — | **3** | [MSW Link Skill](https://maplestorywiki.net/w/Link_Skill) |

*Note: Mihile, Demon Slayer, Demon Avenger and Xenon are NOT part of the Cygnus / Resistance stacks — each has its own separate 3-level link skill.* ([Grandis Library](https://grandislibrary.com/content/link-skills), [MSW](https://maplestorywiki.net/w/Link_Skill))

> ⚠️ **Outdated numbers still circulating:** older guides state Explorer max 6, Resistance max 8, Cygnus max 10 (i.e. 2 levels per class). That was true before Lv.3 links became available to every class. Current caps are 9 / 12 / 15.

##### "Self version" (own-character) link skills — 2025/2026 addition

Since the *Crown* / GMS *Every Little Thing Every Precious Thing* wave, many link skills give the **owning character** a stronger version, usually a flat `[Passive Effect: Damage +N%]` that transferred copies do NOT get. ([MSW Crown](https://maplestorywiki.net/w/MapleStory:_Crown): *"Certain Link Skills with no or low utility also provide additional damage passive to that character only"*; per-skill numbers on each MSW skill page, tagged GMS v270.) This matters for a calculator: **a character playing e.g. Shade gets Close Call +5% damage that a Shade-mule link does not provide.**

#### B2. Full link skill table (transferred / mule version)

All values are the **transferred** (link) version at each level. Sources are the individual MapleStory Wiki skill pages (tagged with the GMS version they were captured from), cross-checked against [Grandis Library](https://grandislibrary.com/content/link-skills) and [OM Crown](https://orangemushroom.net/2025/12/28/kms-ver-1-2-410-maplestory-crown-kinesis-remaster/).

##### B2.1 Damage-affecting link skills (the ones that matter for a DPM calculator)

| Class / faction | Link skill (GMS) | Max Lv | Lv1 | Lv2 | Lv3 | Max-level value | Source |
|---|---|---|---|---|---|---|---|
| **Explorer Magician** | Empirical Knowledge | 9 | 15% proc, +1% dmg & +1% IED per stack (3 stacks, 10s) | 17% / 1% / 1% | 19% / 2% / 2% | Lv9: **31% proc, +5% Damage and +5% Ignore DEF per stack, 3 stacks = +15%/+15%** | [Empirical Knowledge](https://maplestorywiki.net/w/Empirical_Knowledge) (GMS v264) |
| **Explorer Bowman** | Adventurer's Curiosity | 9 | Crit Rate +3% | +4% | +6% | Lv9: **Critical Rate +15%** (+50% Monster Collection rate) | [Adventurer's Curiosity](https://maplestorywiki.net/w/Adventurer%27s_Curiosity) (v270) |
| **Explorer Thief** | Thief's Cunning | 9 | +3% Damage for 10s on debuffing an enemy (CD 20s) | +6% | +9% | Lv9: **Damage +27%** (10s, CD 20s) | [Thief's Cunning](https://maplestorywiki.net/w/Thief%27s_Cunning) (v264) |
| **Explorer Pirate** | Pirate Blessing | 9 | +20 all stats, +350 HP/MP, −5% dmg taken | +30 / +525 / −7% | +40 / +700 / −9% | Lv9: **+100 STR/DEX/INT/LUK, +1750 Max HP/MP, Damage Taken −21%** (Lv4–8: 50/60/70/80/90 stats) | [Pirate Blessing](https://maplestorywiki.net/w/Pirate_Blessing) (v270) |
| **Cygnus Knights** | Cygnus Blessing | 15 | ATT & MATT +7, Status Res +1, Elem Res +1% | +9 / +3 / 3% | +11 / +4 / 4% | Lv15: **ATT and MATT +35, Abnormal Status Resistance +22, All Elemental Resistance +22%** | [Cygnus Blessing](https://maplestorywiki.net/w/Cygnus_Blessing) (v264 / KMS 1.2.349) |
| **Luminous** | Light Wash (KMS: *Permeate*) | 3 | Ignore DEF +10% | +15% | **+20%** | +20% IED | [Light Wash](https://maplestorywiki.net/w/Light_Wash) (v270) |
| **Phantom** | Phantom Instinct (KMS: *Deadly Instinct*) | 3 | Crit Rate +10% | +15% | **+20%** | +20% Crit Rate | [Phantom Instinct](https://maplestorywiki.net/w/Phantom_Instinct) (v270) |
| **Xenon** | Hybrid Logic | 3 | All Stats +5% | +10% | **+15%** | +15% All Stats | [Hybrid Logic](https://maplestorywiki.net/w/Hybrid_Logic) (v264) |
| **Demon Slayer** | Fury Unleashed (KMS: *Demon's Fury*) | 3 | Boss Damage +10% | +15% | **+20%** | +20% Boss Damage | [Fury Unleashed](https://maplestorywiki.net/w/Fury_Unleashed) |
| **Demon Avenger** | Wild Rage | 3 | Damage +5% | +10% | **+15%** | +15% Damage | [Wild Rage](https://maplestorywiki.net/w/Wild_Rage) (v245) |
| **Kaiser** | Iron Will | 3 | Max HP +10% | +15% | **+20%** | +20% Max HP | [Iron Will](https://maplestorywiki.net/w/Iron_Will) (v260) |
| **Kain** | Time to Prepare (KMS: *Prior Preparation*) | 3 | 5 stacks → Damage +9% / 20s, CD 40s | +17% | **+25%** | +25% Damage (conditional) | [Time to Prepare](https://maplestorywiki.net/w/Time_to_Prepare) (v264) |
| **Cadena** | Unfair Advantage (KMS: *Intensive Assault*) | 3 | +3% vs lower-level, +3% vs abnormal-status | +6% / +6% | **+9% / +9%** | +9% / +9% | [Unfair Advantage](https://maplestorywiki.net/w/Unfair_Advantage) (v264) |
| **Angelic Buster** | Terms and Conditions (KMS: *Soul Contract*) | 3 | Damage +30% for 10s, CD 90s | +45%, CD 60s | **+60%, CD 60s** | +60% Damage 10s / 60s CD | [Terms and Conditions](https://maplestorywiki.net/w/Terms_and_Conditions) (v260) |
| **Zero** | Rhinne's Blessing | 6 | −3% dmg taken, +2% IED | −6% / +4% | −9% / +6% | Lv6: **Damage Taken −20%, Ignore DEF +15%** (Lv4 −12%/+8%, Lv5 −15%/+10%) | [Rhinne's Blessing](https://maplestorywiki.net/w/Rhinne%27s_Blessing) (v270) |
| **Kinesis** | Judgment | 3 | Crit Damage +2% | +4% | **+6%** | +6% Critical Damage | [Judgment (Kinesis)](https://maplestorywiki.net/w/Judgment_(Kinesis)) (v270) |
| **Adele** | Noble Fire (KMS: *Noblesse*) | 3 | Boss Dmg +2%, +1% dmg per party member (max 4%) | +4% / +2% (max 8%) | **+6% / +3% (max 12%)** | +6% Boss Damage, +12% Damage in a full party (solo counts as party of 1 → +3%) | [Noble Fire](https://maplestorywiki.net/w/Noble_Fire) (v264) |
| **Illium** | Tide of Battle | 3 | 4 stacks, 10s, +2% dmg/stack | +3%/stack | **+4%/stack** | +16% Damage at 4 stacks (**link version duration 10s**; Illium's own version is 25s) | [Tide of Battle](https://maplestorywiki.net/w/Tide_of_Battle) (v268) |
| **Khali** | Innate Gift | 3 | Damage +3%, recover 1% HP/MP per sec 5s (CD 30s) | +5% / 2% | **+7% / 3%** | +7% Damage | [Innate Gift](https://maplestorywiki.net/w/Innate_Gift) (v264) |
| **Ark** | Solus | 3 | +1% base, +1%/stack, max 5 stacks (5s) | +1% base, +2%/stack | **+1% base, +3%/stack** | +16% Damage at 5 stacks | [Solus](https://maplestorywiki.net/w/Solus) (v245) |
| **Lara** | Nature's Friend | 3 | Damage +3%; +7% normal-monster damage buff | +5% / +11% | **+7% / +15%** | +7% Damage (always-on) | [Nature's Friend](https://maplestorywiki.net/w/Nature%27s_Friend) (v264) |
| **Hoyoung** | Bravado | 3 | IED +5%, +9% dmg vs 100% HP enemies | +10% / +14% | **+15% / +19%** | +15% Ignore DEF, +19% dmg vs full-HP | [Bravado](https://maplestorywiki.net/w/Bravado) (v270) |
| **Hayato** | Moonlit Blade Learnings | 3 | If Crit Rate ≥100% and Crit Dmg ≥50%: Crit Dmg +3% | +5% | **+7%** | +7% Critical Damage (conditional) | [Moonlit Blade Learnings](https://maplestorywiki.net/w/Moonlit_Blade_Learnings) (v266) |
| **Kanna** | Elementalism | 3 | After 40 attack-skill uses: Damage +10% for 12s | +15% | **+20%** | +20% Damage (conditional) | [Elementalism](https://maplestorywiki.net/w/Elementalism) (v266) |
| **Lynn** | **Focus Spirit** (Lynn's own skill is *Spirit Guide Blessing*) | 3 | Boss Dmg +4%, Crit Rate +4%, Max HP +3%, Max MP +3% | 7/7/4/4 | **11 / 10 / 5 / 5** | **Boss Damage +11%, Crit Rate +10%, Max HP +5%, Max MP +5%** | [Spirit Guide Blessing](https://maplestorywiki.net/w/Spirit_Guide_Blessing) (v270) |
| **Mo Xuan** | Qi Cultivation | 3 | Boss Dmg +2%; +1%/hit vs boss, 6 stacks (1 per 2s, 5s dur) | +4% / +2% | **+6% / +3%** | +6% Boss Damage, +18% at 6 stacks | [Qi Cultivation](https://maplestorywiki.net/w/Qi_Cultivation) (v270) |
| **Sia Astelle + Erel Light (Shine)** | Guiding Stars | 6 | Buff Duration +4%, Crit Dmg +1% | +7% / +2% | +10% / +3% | Lv6: **Buff Duration +19%, Critical Damage +6%** (Lv4 13%/4%, Lv5 16%/5%) | [Guiding Stars](https://maplestorywiki.net/w/Guiding_Stars) (v270) |
| **Ren** | Grounded Body | 3 | Damage taken −2% (incl. %HP attacks) | −4% | **−6%** | −6% damage taken | [Grounded Body](https://maplestorywiki.net/w/Grounded_Body) (v270) |
| **Lethe** *(KMS only as of Sept 2026)* | **Covenant** | 3 | Damage +4% while a summon is out | +8% | **+12%** | +12% Damage | [OM Overdrive KMS 1.2.416](https://orangemushroom.net/2026/07/04/kms-ver-1-2-416-maplestory-overdrive-ruler-of-covenants-lethe/) |

##### B2.2 Utility / non-damage link skills

| Class / faction | Link skill | Max Lv | Lv1 | Lv2 | Lv3 | Max-level value | Source |
|---|---|---|---|---|---|---|---|
| **Explorer Warrior** | Invincible Belief | 9 | At ≤15% HP restore 20% Max HP/sec for 3s, CD 310s | 23%, CD 290s | 26%, CD 270s | Lv9: **restore 44% Max HP/sec for 3s, CD 150s** (Lv4–8: 29/32/35/38/41%, CD 250/230/210/190/170s) | [Invincible Belief](https://maplestorywiki.net/w/Invincible_Belief) (v270) |
| **Resistance** | Spirit of Freedom | 12 | 1s invincibility after reviving | 2s | 3s | Lv12: **12 seconds of invincibility after reviving** (1s per level) | [Spirit of Freedom](https://maplestorywiki.net/w/Spirit_of_Freedom) (v270) |
| **Mihile** | Knight's Watch (KMS: *Guardian of Light*) | 3 | Status Resistance +100 for 10s, CD 120s | 15s | **20s** | Status Resistance +100 for 20s / 120s CD | [Knight's Watch](https://maplestorywiki.net/w/Knight%27s_Watch) (v270) |
| **Aran** | Combo Kill Blessing (KMS: *Combo Kill Advantage*) | 3 | Combo Kill Marble EXP +400% | +650% | **+900%** | +900% Combo Kill Marble EXP | [Combo Kill Blessing](https://maplestorywiki.net/w/Combo_Kill_Blessing) (v270) |
| **Evan** | Rune Persistence | 3 | Liberated Rune Power duration +30% | +50% | **+70%** | +70% rune duration | [Rune Persistence](https://maplestorywiki.net/w/Rune_Persistence) (v270) |
| **Mercedes** | Elven Blessing | 3 | Return to Elluel (CD 1800s); **EXP +10%** | +15% | **+20%** | **+20% EXP** permanently | [Elven Blessing](https://maplestorywiki.net/w/Elven_Blessing) (v270) |
| **Shade (Eunwol)** | Close Call | 3 | 5% chance to survive a fatal hit | 10% | **15%** | 15% survival chance | [Close Call](https://maplestorywiki.net/w/Close_Call) (v270) |

##### B2.3 Self-only ("own character") bonuses added in the 2025 Link Skill Expansion

These apply **only to the character whose class it is**, never to a linked mule. Source: individual MSW pages (GMS v270) unless noted; KMS wording from [OM Crown](https://orangemushroom.net/2025/12/28/kms-ver-1-2-410-maplestory-crown-kinesis-remaster/).

| Class | Self-only bonus at max level | Source |
|---|---|---|
| Explorer Warrior (Invincible Belief) | Lv7 **+2%**, Lv8 **+4%**, Lv9 **+6% Damage** | [MSW](https://maplestorywiki.net/w/Invincible_Belief) |
| Explorer Magician (Empirical Knowledge) | **+6% Damage** at master | [OM Crown](https://orangemushroom.net/2025/12/28/kms-ver-1-2-410-maplestory-crown-kinesis-remaster/) |
| Explorer Bowman (Adventurer's Curiosity) | Lv7 +2%, Lv8 +4%, **Lv9 +6% Damage** | [MSW](https://maplestorywiki.net/w/Adventurer%27s_Curiosity) |
| Explorer Pirate (Pirate Blessing) | Lv7–9 stats become **+90 / +110 / +130** all stats (vs +80/+90/+100 transferred); also equipment STR↔DEX swap toggle | [MSW](https://maplestorywiki.net/w/Pirate_Blessing) |
| Cygnus Knights (Cygnus Blessing) | **ATT & MATT +55** instead of +35 | [OM Crown](https://orangemushroom.net/2025/12/28/kms-ver-1-2-410-maplestory-crown-kinesis-remaster/) |
| Mihile (Knight's Watch) | Completely different self version: 30s barrier, blocks 9 hits, **Damage +25%**, %HP attacks −30%, CD 120s; plus **[Passive Effect: Damage +3%]** | [MSW](https://maplestorywiki.net/w/Knight%27s_Watch) |
| Aran (Combo Kill Blessing) | **+5% Damage** | [MSW](https://maplestorywiki.net/w/Combo_Kill_Blessing) |
| Evan (Rune Persistence) | **+5% Damage** | [MSW](https://maplestorywiki.net/w/Rune_Persistence) |
| Mercedes (Elven Blessing) | **+5% Damage**; self cooldown 600s instead of 1800s | [MSW](https://maplestorywiki.net/w/Elven_Blessing) |
| Phantom (Phantom Instinct) | **+5% Damage** | [MSW](https://maplestorywiki.net/w/Phantom_Instinct) |
| Shade (Close Call) | **+5% Damage** | [MSW](https://maplestorywiki.net/w/Close_Call) |
| Luminous (Light Wash) | **+4% Damage** | [MSW](https://maplestorywiki.net/w/Light_Wash) |
| Resistance (Spirit of Freedom) | Lv9 +2%, Lv10 +3%, Lv11 +4%, **Lv12 +5% Damage** | [MSW](https://maplestorywiki.net/w/Spirit_of_Freedom) |
| Demon Slayer (Fury Unleashed) | Absorbs **+10 additional Force** with Demon Lash | [MSW](https://maplestorywiki.net/w/Fury_Unleashed) |
| Kaiser (Iron Will) | Self: Max HP **+15%** and **+4% Damage per Morph Gauge stage** (transferred gives +20% HP only) | [MSW](https://maplestorywiki.net/w/Iron_Will) |
| Angelic Buster (Terms and Conditions) | Self **Damage +120%** for 10s (transferred is halved to +60%) | [MSW](https://maplestorywiki.net/w/Terms_and_Conditions) |
| Zero (Rhinne's Blessing) | Lv6 adds **+4% Damage** | [MSW](https://maplestorywiki.net/w/Rhinne%27s_Blessing) |
| Illium (Tide of Battle) | Self stack duration **25s** vs 10s transferred | [MSW](https://maplestorywiki.net/w/Tide_of_Battle) |
| Khali (Innate Gift) | Self **Damage +10%** vs +7% | [OM Crown](https://orangemushroom.net/2025/12/28/kms-ver-1-2-410-maplestory-crown-kinesis-remaster/) |
| Lara (Nature's Friend) | Self **Damage +10%** vs +7% | [OM Crown](https://orangemushroom.net/2025/12/28/kms-ver-1-2-410-maplestory-crown-kinesis-remaster/) |
| Hoyoung (Bravado) | Self **+4% Damage** | [MSW](https://maplestorywiki.net/w/Bravado) |
| Ren (Grounded Body) | Self **+5% Damage** | [MSW](https://maplestorywiki.net/w/Grounded_Body) |
| Cadena (Unfair Advantage) | KMS lists a self version with the same 9%/9% (no extra damage passive listed) | [OM Crown](https://orangemushroom.net/2025/12/28/kms-ver-1-2-410-maplestory-crown-kinesis-remaster/) |

#### B3. Removed / renamed / new classes

##### Removed (no link skill any more)
| Class | Status | Source |
|---|---|---|
| **Beast Tamer** | Removed. Character creation disabled in the New Age update; existing characters **converted to Lynn** on 2024-05-01 in GMS (v250). Its old link skill *Focus Spirit* name now belongs to **Lynn's transferred link skill**. | [MSW Beast Tamer](https://maplestorywiki.net/w/Beast_Tamer), [MSW Spirit Guide Blessing](https://maplestorywiki.net/w/Spirit_Guide_Blessing) |
| **Jett** | Removed. Creation disabled GMS v240 (2023-04-27); un-converted Jetts turned into Explorer Beginners in Feb 2024. **"Core Aura" no longer exists.** | [MSW Jett](https://maplestorywiki.net/w/Jett) |
| **Saitama** (One-Punch Man collab, KMS Nov 2025) | Special Worlds only — cannot receive or grant link skills. | [MSW Saitama](https://maplestorywiki.net/w/Saitama) |

##### Renamed / restructured link skills (old name → current GMS name)
| Old / commonly-cited name | Current GMS name | Notes |
|---|---|---|
| Luminous *Permeate* | **Light Wash** | Same effect. KMS still calls it Permeate. |
| Ark *Unfathomable Sorrow* | **Solus** | Reworked into a combat-state stacking damage buff |
| Adele *Noble Blessing* | **Noble Fire** | KMS: *Noblesse* |
| Cadena *Mark of Phantom Thief* | **Unfair Advantage** | KMS: *Intensive Assault* |
| Khali *Hex: Fortitude* | **Innate Gift** | |
| Hoyoung *Wretched Fiends* | **Bravado** | |
| Lara *Dragon Vein Absorption* | **Nature's Friend** | |
| Kain *"Sharp Eyes"* (incorrect) | **Time to Prepare** | KMS: *Prior Preparation* |
| Hayato *Keen Edge* (All Stats +35, ATT/MATT +20) | **Moonlit Blade Learnings** (conditional +7% Crit Damage) | Changed in the Hayato/Kanna revamp; GMS wiki shows the new version at **v266**. [Grandis Library still shows the old *Keen Edge*](https://grandislibrary.com/content/link-skills) — **flagged disagreement; MSW v266 is newer.** |
| Kanna *Elementalism* (flat +15% Damage) | **Elementalism** (40-attack condition → +20% Damage for 12s) | Same revamp; GL shows the pre-revamp flat version. |
| Sia Astelle *Tree of Stars* (ML3, Buff Duration +10% / Crit Dmg +3%) | **Guiding Stars** (ML6, faction-shared with Erel Light) | Merged into the Shine faction skill when Erel Light released. [Tree of Stars](https://maplestorywiki.net/w/Tree_of_Stars), [Guiding Stars](https://maplestorywiki.net/w/Guiding_Stars) |
| Explorers: five per-class blessings | **Invincible Belief / Empirical Knowledge / Adventurer's Curiosity / Thief's Cunning / Pirate Blessing** | One per job branch, stacking to Lv.9 |
| Resistance / Blaster *Afterimage Shock* | **Spirit of Freedom** (Blaster now folded into the shared Resistance link) | [Spirit of Freedom](https://maplestorywiki.net/w/Spirit_of_Freedom) |
| Pathfinder (separate link) | folded into **Adventurer's Curiosity** (Explorer Bowman) | [Adventurer's Curiosity](https://maplestorywiki.net/w/Adventurer%27s_Curiosity) |
| Demon Slayer *"Devotion / Devil's Bane"* | **Fury Unleashed** — Boss Damage. | ⚠️ **The commonly-cited attribution is backwards.** Current data: **Demon Slayer = Fury Unleashed (Boss Damage 10/15/20%)**, **Demon Avenger = Wild Rage (Damage 5/10/15%)**. Confirmed by [MSW Fury Unleashed](https://maplestorywiki.net/w/Fury_Unleashed) ("*When used in conjunction with **Demon Lash**, absorbs additional Fury*" — a Demon Slayer skill), [MSW Wild Rage](https://maplestorywiki.net/w/Wild_Rage) ("Class: Demon Avenger"), [OM Crown](https://orangemushroom.net/2025/12/28/kms-ver-1-2-410-maplestory-crown-kinesis-remaster/) (KMS *Demon's Fury*: "20% boss damage, self absorbs an additional 10 Force"), and [Grandis Library](https://grandislibrary.com/content/link-skills) (lists Demon Slayer under %Boss Damage, Demon Avenger under %Damage). |

##### New classes 2024–2026 and their link skills
| Class | Faction | Released | Link skill | Max level | Source |
|---|---|---|---|---|---|
| **Lynn** | Jianghu | TMS Mar 2024 / GMS 2024 | **Focus Spirit** (own skill: *Spirit Guide Blessing*) — Boss Dmg 11%, Crit Rate 10%, Max HP/MP 5% at Lv3 | 3 | [MSW](https://maplestorywiki.net/w/Spirit_Guide_Blessing) |
| **Mo Xuan** | Jianghu | CMS 2024 remaster / MSEA & GMS later | **Qi Cultivation** — Boss Dmg +6% + up to +18% stacking | 3 | [MSW](https://maplestorywiki.net/w/Qi_Cultivation) |
| **Ren** | Anima | KMS Jun 2025 (*Assemble*) | **Grounded Body** — damage taken −6% | 3 | [MSW](https://maplestorywiki.net/w/Grounded_Body) |
| **Sia Astelle** | Shine | GMS Jun 2025 (*Stargazer*, v260) | **Guiding Stars** (was *Tree of Stars*) | 6 (Shine stack) | [MSW](https://maplestorywiki.net/w/Guiding_Stars) |
| **Erel Light** | Shine | GMS Jun 2026 (*Ride The Lightning*) | **Guiding Stars** (stacks with Sia Astelle) | 6 | [MSW Erel Light](https://maplestorywiki.net/w/Erel_Light), [MSW Guiding Stars](https://maplestorywiki.net/w/Guiding_Stars) |
| **Lethe** | **Demon** (new faction; separate from Demon Slayer/Avenger, who remain Resistance) | KMS Jun–Jul 2026 (*Overdrive* 1.2.416). **Not yet in GMS** — projected Nov 2026. | **Covenant** — Damage +4/8/12% while a summon is active | 3 | [OM Overdrive](https://orangemushroom.net/2026/07/04/kms-ver-1-2-416-maplestory-overdrive-ruler-of-covenants-lethe/), [MSW Lethe](https://maplestorywiki.net/w/Lethe) |

#### B4. Recent patch changes to Link Skills

| Patch | Change | Source |
|---|---|---|
| **KMS *NEXT* (Dec 2024) / GMS v260 *Stargazer* (2025)** | **Link Skill Revamp**: removal of the daily transfer limit and transfer/change fees; a link can be transferred to **multiple characters at the same time**; UI overhaul (removal of the "Currently Applied Link Skills" page, application via Preset settings); new view of link skills you don't own yet; descriptions now show which jobs are needed to level each skill. Transfers, removals and presets **blocked in boss maps**. | [MSW MapleStory: NEXT](https://maplestorywiki.net/w/MapleStory:_NEXT), [MSW Link Skill](https://maplestorywiki.net/w/Link_Skill) citing [official Stargazer patch notes §Link Skill Revamp](https://www.nexon.com/maplestory/news/update/27513/updated-6-12-v-260-stargazer-patch-notes) |
| **GMS *Every Little Thing Every Precious Thing*** (= KMS *Assemble*, GMS Fall 2025) | GMS-exclusive QoL: **"Expansion of Level 3 Link Skills to all jobs."** In GMS this unlocks at **Lv. 210** per contributing character — no item, no Lv.285 requirement. | [MSW MapleStory: Assemble](https://maplestorywiki.net/w/MapleStory:_Assemble), [MSW MapleStory: Crown](https://maplestorywiki.net/w/MapleStory:_Crown) |
| **KMS *Crown* / GMS *Ride The Lightning* (Dec 2025 KMS)** | **"Link Skill Expansion"**: link skill master levels raised; **Proof of a Radiant Hero** item (Lv.285+, once per character, from the Carcion story questline) upgrades one chosen link skill to Lv.3; and **"certain Link Skills with no or low utility also provide an additional damage passive to that character only"** (the self-versions in B2.3). GMS name of the quest item is **Proof of a Shining Hero**. | [OM Crown](https://orangemushroom.net/2025/12/28/kms-ver-1-2-410-maplestory-crown-kinesis-remaster/), [MSW MapleStory: Crown](https://maplestorywiki.net/w/MapleStory:_Crown), [MSW Proof of a Shining Hero/Story](https://maplestorywiki.net/w/Proof_of_a_Shining_Hero/Story) |
| **KMS *Crown*** | Link Skills, Hyper Stats and Ability can now be changed **inside Epic Dungeon boss stages**. | [MSW MapleStory: Crown](https://maplestorywiki.net/w/MapleStory:_Crown) |
| **KMS *Crown*** | *"Link Skills' passive effects will no longer affect Ascent skills' damage."* (plus a fix so link skills can no longer be acquired below Lv.70) | [OM Crown](https://orangemushroom.net/2025/12/28/kms-ver-1-2-410-maplestory-crown-kinesis-remaster/) |
| **KMS *Overdrive* (Jul 2026)** | A **Link Skill button** was added to the bottom of the Skill UI. No mechanical changes. | [OM Overdrive](https://orangemushroom.net/2026/07/04/kms-ver-1-2-416-maplestory-overdrive-ruler-of-covenants-lethe/) |

**Link skill slot count: no change.** Every current source still says **12** (13 including your own). No slot expansion has been announced. ([MSW Link Skill](https://maplestorywiki.net/w/Link_Skill), edited 2026-09-05; [Grandis Library](https://grandislibrary.com/content/link-skills), GMS v269)

---

### PART C — DATA-QUALITY NOTES FOR THE CALCULATOR

1. **Prefer individual MapleStory Wiki skill pages over the Link Skill overview page.** The overview page ([maplestorywiki.net/w/Link_Skill](https://maplestorywiki.net/w/Link_Skill)) contains stale rows. Concrete examples found:
   - *Rhinne's Blessing Lv.6*: overview says −18% dmg taken / +12% IED; the [skill page (v270)](https://maplestorywiki.net/w/Rhinne%27s_Blessing) says **−20% / +15%**, matching [KMS Crown](https://orangemushroom.net/2025/12/28/kms-ver-1-2-410-maplestory-crown-kinesis-remaster/).
   - *Invincible Belief cooldowns*: overview says 410 s → 90 s across Lv.1–9; the [skill page (v270)](https://maplestorywiki.net/w/Invincible_Belief) says **310 s → 150 s**, matching KMS Crown's "150 seconds" at master.
   - *Cygnus Blessing Lv.1 status resistance*: overview says +2, the [skill page](https://maplestorywiki.net/w/Cygnus_Blessing) says **+1**.
   - Overview lists Lynn's link as "Focus Spirit" with a "Focus Spirit" heading only; the actual class skill is [Spirit Guide Blessing](https://maplestorywiki.net/w/Spirit_Guide_Blessing) and the transferred version is named *Focus Spirit*.
2. **Grandis Library is one to two revamps behind on some classes** (Hayato *Keen Edge*, Kanna flat +15%, Illium 15 s duration, Ren −4%, Sia Astelle *Tree of Stars*). It is still the best source for the *rules* (slot count, presets, stacking) and for build guidance.
3. **StrategyWiki's Inner Ability page is from May 2023.** Its per-line value tables still match the current official KMS values, but its **rank-up rates and 2nd/3rd-line rank distribution are outdated**. Use the [official KMS page](https://maplestory.nexon.com/Guide/OtherProbability/ability/reputevalue) for probabilities.
4. **The official KMS probability pages are the ground truth for Inner Ability** and are still being maintained (synced to the 2026-06-18 update on 2026-07-10). They are also the source MSW cites.

#### Open gaps / still UNVERIFIED

- **GMS-specific probability disclosure.** All Ability probabilities above come from the KMS official page (which MSW and StrategyWiki both use for GMS). I could not fetch a GMS-hosted probability disclosure — the Nexon America news/probability pages are JavaScript-rendered and returned only a page shell to every fetch method available here.
- **Whether GMS has the KMS *Overdrive* Ability changes** (Auto Reset, no-duplicate-on-consecutive-reset). GMS has not received Overdrive as of 2026-09-06.
- **Lethe in GMS** — link skill values are from the KMS patch notes only; GMS localisation names/values unconfirmed.
- **Exact GMS behaviour of "Proof of a Shining Hero"**, given GMS already grants Lv.3 links at Lv.210 without an item. The quest exists in GMS ([MSW](https://maplestorywiki.net/w/Proof_of_a_Shining_Hero/Story)) but its GMS reward function is undocumented on the wiki.
- **The exact GMS patch text of the v260 Stargazer "Link Skill Revamp" section** — the anchor URL is confirmed via MSW's citation but the Nexon page could not be scraped.
- **Whether any self-version damage passives exist for Cygnus Knights / Explorer Magician in GMS specifically** — those MSW pages are still tagged v264 rather than v270, so the KMS Crown values (+55 ATT self, +6% damage self) are cited from Orange Mushroom rather than a GMS-tagged source.
- **Mo Xuan and Lynn GMS availability/values** were taken from GMS v270-tagged wiki pages, but I could not independently confirm GMS release dates for Mo Xuan.

---


## 5. Equipment Set Effects

> Researched independently; per-piece-count tables with cumulative columns.

**Compiled:** 2026-09-06
**Target game version:** GMS v.269 "Ride the Lightning" (current GMS version per Grandis Library's version banner — <https://grandislibrary.com/resources>)

### Source quality notes (read first)

| Source | URL | Assessment |
|---|---|---|
| MapleStory Wiki (maplestorywiki.net) | <https://maplestorywiki.net/> | **Primary source used throughout.** Community wiki, actively maintained; pages cited here reference GMS v263–v269 skill icons and a GMS 265 (17 Dec 2025) update entry, so it is current for 2025–2026. Explicitly flags GMS vs KMS vs MSEA differences. Note: it serves HTTP 403 to some fetchers; content here was retrieved with a normal browser user-agent. |
| DigitalTQ Set Effects | <https://www.digitaltq.com/maplestory-set-effects> | Secondary cross-check. Agrees with maplestorywiki on CRA, AbsoLab, Arcane Umbra, Eternal (2–5 set), Superior Gollux, Boss Accessory, Pitched Boss 10-set. |
| AyumiLove Equipment Set | <https://ayumilove.net/maplestory-equipment-set/> | **STALE** — page content dates to GMS v178 era. Confirms Gollux + Root Abyss, but its AbsoLab and Arcane Umbra tables are pre-revamp and **should not be used**. Flagged inline below. |
| Grandis Library Progression Guide | <https://grandislibrary.com/content/progression-guide> | Used for set *membership* and drop sources; does not list numeric set effects. |
| MapleStorySEA Wiki | <https://www.maplesea.com/wiki/Equipment/SetItem> | Used only for the "Lucky Item" mechanic. MSEA, not GMS — treat as indicative. |
| NamuWiki (ko) | en.namu.wiki | **Could not be retrieved** (Cloudflare block). Would have been the best KMS cross-check. |
| Fandom MapleWiki | maplestory.fandom.com | **Could not be retrieved** (Cloudflare/JS block). |
| maplestory.wiki item DB | <https://maplestory.wiki/> | JavaScript-only SPA; not machine-readable without a browser. |

**Global mechanical note — IED is multiplicative.** MapleStory Wiki footnotes on the AbsoLab, Arcane Umbra, Pitched Boss and Masteria's Legacy pages state: *"Ignored Enemy Defense is multiplicative, not additive."* That is why e.g. AbsoLab's 4-set 10% + 7-set 10% is shown cumulatively as **19%** (`1 − 0.9×0.9`), not 20%. Source: <https://maplestorywiki.net/w/Equipment_Set/AbsoLab_Set_(Warrior)> (ref [1]) and <https://maplestorywiki.net/w/Pitched_Boss_Set> (ref [1]).

**Global mechanical note — "Lucky Item" / wildcard set pieces.** Chaos Root Abyss hats, Genesis weapons and Scarlet-tier items carry the tooltip line letting them count toward *any* set effect, provided the target set has that equipment type. Up to 3 set effects can be stacked using lucky items. Worked example given by Nexon (MSEA wiki): CRA Helm (lucky) + 3 CRA pieces + 4 AbsoLab pieces ⇒ **4-set CRA AND 5-set AbsoLab simultaneously**. Source: <https://www.maplesea.com/wiki/Equipment/SetItem>. **Caveat:** this is the MSEA wiki, not a GMS page; the behavior is believed identical in GMS but I could **not** verify it against a GMS-official page. Mark as **PARTIALLY UNVERIFIED for GMS**. (Note: maplestorywiki's "AbsoLab/Arcane Umbra/Root Abyss Lucky Item Scroll" items are a *different, unrelated* thing — they add Zero's Lapis/Lazuli weapons to those sets: <https://maplestorywiki.net/w/AbsoLab_Lucky_Item_Scroll>.)

---

### 1. Root Abyss Set (Chaos Root Abyss / "CRA")

**Level 150.** Members: Royal *(class)* Hat, Eagle Eye *(class)* Top, Trixter *(class)* Bottom, Fafnir *(class)* Weapon — **4 pieces max**, so 2/3/4-set only. Obtained from Root Abyss bosses (Crimson Queen → Piece of Anguish ×5 → Royal Hat; Von Bon → Piece of Time ×5 → Eagle Eye Top; Pierre → Piece of Mockery ×5 → Trixter Bottom; Vellum → Piece of Destruction ×15 → Fafnir Weapon).
Source: <https://maplestorywiki.net/w/Root_Abyss_Set>

#### Set effect table (Warrior variant shown; see per-class note)

| Pieces | Effect at this tier | Cumulative |
|---|---|---|
| 2 | STR +20, DEX +20, Max HP +1,000, Max MP +1,000 | STR +20, DEX +20, HP +1,000, MP +1,000 |
| 3 | Max HP +10%, Max MP +10%, Weapon ATT +50 | + HP/MP +10%, WATT +50 |
| 4 | **Boss Damage +30%** | + Boss Damage +30% |

Source: <https://maplestorywiki.net/w/Equipment_Set/Root_Abyss_Set_(Warrior)>

**Per-class variance in the 2-set and 3-set:** the 2-set gives *primary + secondary stat* +20 each, and the 3-set gives WATT or MATT depending on class. Magician confirmed:

| Pieces | Magician effect |
|---|---|
| 2 | INT +20, LUK +20, Max HP +1,000, Max MP +1,000 |
| 3 | Max HP +10%, Max MP +10%, **Magic ATT +50** |
| 4 | Boss Damage +30% |

Source: <https://maplestorywiki.net/w/Equipment_Set/Root_Abyss_Set_(Magician)>

**⚠ SOURCE DISAGREEMENT.** The maplestorywiki *summary* page states the 3-set as "All Stats: +9, Weapon Attack / Magic Attack: +50" and omits the HP/MP%; the *class detail* pages and DigitalTQ both give "Max HP/MP +10%, ATT +50". The class detail pages are almost certainly correct and the summary page line is a stale/typo'd entry.
Summary page: <https://maplestorywiki.net/w/Root_Abyss_Set> · Class page: <https://maplestorywiki.net/w/Equipment_Set/Root_Abyss_Set_(Warrior)> · Cross-check: <https://www.digitaltq.com/maplestory-set-effects>

#### CRA base item stats (Warrior example)

| Item | Slot | Base stats |
|---|---|---|
| Royal Warrior Helm | Hat | STR +40, DEX +40, HP +360, MP +360, WATT +2, DEF +390, **IED +10%** |
| Eagle Eye Warrior Armor | Top | STR +30, DEX +30, WATT +2, DEF +210, **IED +5%** |
| Trixter Warrior Pants | Bottom | STR +30, DEX +30, WATT +2, DEF +210, **IED +5%** |
| Fafnir weapon (e.g. Fafnir Mercy, Bladecaster) | Weapon | STR +40, DEX +40, WATT +171, **Boss +30%, IED +10%** |

Source: <https://maplestorywiki.net/w/Equipment_Set/Root_Abyss_Set_(Warrior)>

#### Naming corrections to the brief
- **"Royal Von Leon" is NOT part of the CRA set.** The Royal Von Leon Set is a separate **Level 130** 6-piece set from Von Leon (4-set: All Stats +6, Boss +10%; 5-set: All Stats +9, ATT +10; 6-set: primary+secondary stat +10, All Stats +15, Max HP/MP +15%, ATT +20, Boss +10%). Source: <https://maplestorywiki.net/w/Royal_Von_Leon_Set>
- **"Aeonian Rise" is NOT a CRA item.** It is (a) the Black Mage boss phase and (b) the equipment skill granted by the liberated Genesis Weapon. Source: <https://maplestorywiki.net/w/Aeonian_Rise_(Skill)>
- The CRA hat names are class-specific: Royal Warrior Helm / Royal Dunwitch Hat (mage) / Royal Ranger Beret (bowman) / Royal Assassin Hood (thief) / Royal Wanderer Hat (pirate). Sources: the five `Equipment_Set/Root_Abyss_Set_(<class>)` pages on maplestorywiki.net.

---

### 2. AbsoLab Set

**Level 160.** 7 pieces: Hat, Overall (suit), Shoes, Gloves, Cape, Shoulder, Weapon. From Lotus / Damien, plus Scrapyard (AbsoLab Coins → shoes/gloves/cape/weapon) and Dark World Tree (Stigma Coins → hat/overall/shoulder/weapon).

| Pieces | Effect at this tier | Cumulative |
|---|---|---|
| 2 | Max HP +1,500, Max MP +1,500, WATT +20, MATT +20, **Boss Dmg +10%** | HP/MP +1,500, ATT +20, Boss +10% |
| 3 | All Stats +30, WATT +20, MATT +20, **Boss Dmg +10%** | AS +30, HP/MP +1,500, ATT +40, Boss +20% |
| 4 | WATT +25, MATT +25, DEF +200, **IED +10%** | AS +30, HP/MP +1,500, ATT +65, DEF +200, Boss +20%, IED +10% |
| 5 | WATT +30, MATT +30, **Boss Dmg +10%** | AS +30, HP/MP +1,500, ATT +95, DEF +200, Boss +30%, IED +10% |
| 6 | Max HP +20%, Max MP +20%, WATT +20, MATT +20 | AS +30, HP/MP +1,500 & +20%, ATT +115, DEF +200, Boss +30%, IED +10% |
| 7 | WATT +20, MATT +20, **IED +10%** | AS +30, HP/MP +1,500 & +20%, ATT +135, DEF +200, Boss +30%, **IED +19%** (multiplicative) |

Source: <https://maplestorywiki.net/w/Equipment_Set/AbsoLab_Set_(Warrior)>
Cross-check (identical): <https://www.digitaltq.com/maplestory-set-effects>
**⚠ Do not use AyumiLove's AbsoLab table** (<https://ayumilove.net/maplestory-equipment-set/>) — it lists a 6-tier pre-revamp version ("2 Set: All Stat +30; 3 Set: ATT +30, IED 10%; …") that no longer matches the game.

#### AbsoLab base item stats (Warrior example)

| Item | Slot | Base stats |
|---|---|---|
| AbsoLab Knight Helm | Hat | STR/DEX +45, WATT +3, DEF +400, **IED +10%** |
| AbsoLab Knight Suit | Overall | STR/DEX +65, WATT +5, DEF +300 |
| AbsoLab Knight Shoes | Shoes | STR/DEX +20, WATT +5, DEF +150, Spd +10, Jmp +7 |
| AbsoLab Knight Gloves | Gloves | STR/DEX +20, WATT +5, DEF +150 |
| AbsoLab Knight Cape | Cape | All Stats +15, WATT/MATT +2, DEF +250 |
| AbsoLab Knight Shoulder | Shoulder | All Stats +14, WATT/MATT +10, DEF +100 |
| AbsoLab weapon (e.g. AbsoLab Bladecaster) | Weapon | STR/DEX +60, WATT +205, **Boss +30%, IED +10%** |

Source: <https://maplestorywiki.net/w/Equipment_Set/AbsoLab_Set_(Warrior)>

---

### 3. Arcane Umbra Set

**Level 200.** 7 pieces: Hat, Overall (suit), Shoes, Gloves, Cape, Shoulder, Weapon. From Lucid / Will / Verus Hilla / Darknell / Gloom (Arcane Umbra Armor/Weapon Box), and Esfera / Moonbridge coin shops.

| Pieces | Effect at this tier | Cumulative |
|---|---|---|
| 2 | WATT +30, MATT +30, **Boss Dmg +10%** | ATT +30, Boss +10% |
| 3 | WATT +30, MATT +30, DEF +400, **IED +10%** | ATT +60, DEF +400, Boss +10%, IED +10% |
| 4 | All Stats +50, WATT +35, MATT +35, **Boss Dmg +10%** | AS +50, ATT +95, DEF +400, Boss +20%, IED +10% |
| 5 | Max HP +2,000, Max MP +2,000, WATT +40, MATT +40, **Boss Dmg +10%** | AS +50, HP/MP +2,000, ATT +135, Boss +30%, IED +10% |
| 6 | Max HP +30%, Max MP +30%, WATT +30, MATT +30 | AS +50, HP/MP +2,000 & +30%, ATT +165, DEF +400, Boss +30%, IED +10% |
| 7 | WATT +30, MATT +30, **IED +10%** | AS +50, HP/MP +2,000 & +30%, ATT +195, DEF +400, Boss +30%, **IED +19%** |

Source: <https://maplestorywiki.net/w/Equipment_Set/Arcane_Umbra_Set_(Warrior)>
Cross-check (identical): <https://www.digitaltq.com/maplestory-set-effects>

> Minor note: the wiki's own 5-set cumulative row prints "Defense: +200" where +400 is expected from the 3-set; this looks like a copy/paste artifact on the wiki (the 6-set and 7-set cumulative rows both correctly show DEF +400). Treat DEF +400 as correct from 3-set onward. **Flagged as a wiki typo, low confidence on the +200 figure.**

#### Arcane Umbra base item stats (Warrior example)

| Item | Slot | Base stats |
|---|---|---|
| Arcane Umbra Knight Hat | Hat | STR/DEX +65, WATT +7, DEF +600, **IED +15%** |
| Arcane Umbra Knight Suit | Overall | STR/DEX +85, WATT +9, DEF +500, **IED +10%** |
| Arcane Umbra Knight Shoes | Shoes | STR/DEX +40, WATT +9, DEF +250, Spd +10, Jmp +7 |
| Arcane Umbra Knight Gloves | Gloves | STR/DEX +40, WATT +9, DEF +250 |
| Arcane Umbra Knight Cape | Cape | All Stats +35, WATT/MATT +6, DEF +450 |
| Arcane Umbra Knight Shoulder | Shoulder | All Stats +35, WATT/MATT +20, DEF +300 |

Source: <https://maplestorywiki.net/w/Equipment_Set/Arcane_Umbra_Set_(Warrior)>

---

### 4. Eternal Set (Eternal armor + Genesis/Destiny weapon)

**Level 250 armor, 8-piece set:** Hat, Top, Bottom, Shoes, Gloves, Cape, Shoulder, **Genesis / Destiny Weapon**. (Note: Eternal uses *separate Top and Bottom*, unlike AbsoLab/Arcane which use an Overall — this is why Eternal reaches 8.)

| Pieces | Effect at this tier | Cumulative |
|---|---|---|
| 2 | Max HP +2,500, Max MP +2,500, WATT +40, MATT +40, **Boss Dmg +10%** | HP/MP +2,500, ATT +40, Boss +10% |
| 3 | All Stats +50, WATT +40, MATT +40, DEF +600, **Boss Dmg +10%** | AS +50, HP/MP +2,500, ATT +80, DEF +600, Boss +20% |
| 4 | Max HP +15%, Max MP +15%, WATT +40, MATT +40, **Boss Dmg +10%** | AS +50, HP/MP +2,500 & +15%, ATT +120, DEF +600, Boss +30% |
| 5 | WATT +40, MATT +40, **IED +20%** | AS +50, ATT +160, DEF +600, Boss +30%, IED +20% |
| 6 | WATT +40, MATT +40, **Boss Dmg +15%** | AS +50, ATT +200, DEF +600, Boss +45%, IED +20% |
| 7 | All Stats +50, Max HP +2,500, Max MP +2,500, WATT +40, MATT +40, **Boss Dmg +15%** | **AS +100**, HP/MP +5,000 & +15%, ATT +240, DEF +600, Boss +60%, IED +20% |
| 8 | WATT +40, MATT +40, **Boss Dmg +15%** | **AS +100, HP/MP +5,000 & +15%, ATT +280, DEF +600, Boss +75%, IED +20%** |

Source: <https://maplestorywiki.net/w/Equipment_Set/Eternal_Set_(Warrior)>
Set-summary cross-check (same numbers, 2–8): <https://maplestorywiki.net/w/Eternal_Set>
DigitalTQ only documents 2–5 set (its values match) — <https://www.digitaltq.com/maplestory-set-effects>

#### Eternal armor sources (current, includes 2025–2026 bosses)

Hat / Top / Bottom / Shoulder — 10 pieces exchanged, or Armor Box:
- Normal/Chaos/Extreme **Kalos the Guardian** → Kalos's Residual Determination; Divine Eternal Armor Box (Chaos/Extreme)
- Normal/Hard/Extreme **First Adversary** → Echo of Ancient Resolve; Ancient Eternal Armor Box (Hard/Extreme)
- **Kaling** → Ferocious Beast Entanglement Ring; Ferocious Beast Eternal Armor Box (Hard/Extreme)
- **Malefic Star** → Blissful Fantasy Shard; Eternal Armor of Radiance Box (Hard)

Shoes / Gloves / Cape:
- **Limbo** → Distorted Ambition; Eternal Armor of Desire Box (Hard)
- **Baldrix** → Trace of Eternal Loyalty; Eternal Armor of Oaths Box (Hard)
- **Jupiter** → Lingering Twisted Desire; Eternal Twisted Armor Box (Hard)
- **Malicia** → Eternal Armor of Malice Box (Extreme) — **JMS/CMS/TMS only, not GMS**

Source: <https://maplestorywiki.net/w/Eternal_Set>

#### Eternal base item stats (Warrior example)

| Item | Slot | Base stats |
|---|---|---|
| Eternal Knight Helm | Hat | STR/DEX +80, WATT +10, DEF +750, **IED +15%** |
| Eternal Knight Armor | Top | STR/DEX +50, WATT +6, DEF +325, **IED +5%** |
| Eternal Knight Pants | Bottom | STR/DEX +50, WATT +6, DEF +325, **IED +5%** |
| Eternal Knight Shoes | Shoes | STR/DEX +55, WATT +12, DEF +325, Spd +10, Jmp +7 |
| Eternal Knight Gloves | Gloves | STR/DEX +55, WATT +12, DEF +325 |
| Eternal Knight Cape | Cape | All Stats +50, WATT/MATT +9, DEF +600 |
| Eternal Knight Shoulder | Shoulder | All Stats +51, WATT/MATT +28, DEF +450 |

Source: <https://maplestorywiki.net/w/Equipment_Set/Eternal_Set_(Warrior)>

---

### 5. Genesis Weapon and Destiny Weapon

**There is no separate "Genesis weapon set".** Both the Genesis Weapon (Lv 200) and the Destiny Weapon (Lv 250) are the *weapon slot of the Eternal Set*, and both are Lucky Items that can slot into other sets.
Sources: <https://maplestorywiki.net/w/Genesis_Weapon> · <https://maplestorywiki.net/w/Destiny_Weapon>

#### Weapon base stats (Warrior examples)

| Weapon | Lv | Stats |
|---|---|---|
| Genesis Bladecaster (Adele) | 200 | STR/DEX +150, WATT +340, **Boss +30%, IED +20%** |
| Genesis Two-handed Sword | 200 | STR/DEX +150, WATT +340, Boss +30%, IED +20% |
| Genesis Saber (1H Sword) | 200 | STR/DEX +150, WATT +326, Boss +30%, IED +20% |
| Genesis Polearm | 200 | STR/DEX +150, WATT +304, Boss +30%, IED +20% |
| Genesis Desperado (DA) | 200 | STR +150, Max HP +2,800, WATT +340, Boss +30%, IED +20% |
| Destiny Bladecaster | 250 | STR/DEX +190, WATT +373, **Boss +30%, IED +20%** |
| Destiny Saber (1H Sword) | 250 | STR/DEX +190, WATT +358, Boss +30%, IED +20% |

Source: <https://maplestorywiki.net/w/Equipment_Set/Eternal_Set_(Warrior)>
**Note / UNVERIFIED:** the wiki renders the Destiny "Stage 1" and "Stage 2" weapon stat tables with *identical* numbers. Stage 2's upgrade is described in prose as being to the *skill* and star-force cap, not to the base line — but I could not independently confirm whether Stage 2 raises base WATT. **Treat "Stage 2 base stats = Stage 1 base stats" as unverified.**

#### Weapon-granted equipment skills (damage-relevant, not set effects)

| Skill | Granted by | Effect |
|---|---|---|
| **Tanadian Ruin** | Genesis 1st Awakening | Permanently **+10% Final Damage** (toggle) |
| **Aeonian Rise** | Genesis 2nd Awakening (liberation) | 10 s invincibility; on early end, 1500% ×7 hits on 12 enemies; 120 s CD |
| **Decisive Willpower** (Stage 1) | Destiny 1st Transcendence (renamed Tanadian Ruin) | Permanently **+10% Final Damage** |
| **Decisive Willpower** (Stage 2) | Destiny 2nd Transcendence | Permanently **+10% Final Damage, +15% Boss Damage, +15% IED** |
| **Undying Determination** | Destiny (renamed Aeonian Rise) | Stage 1: same as Aeonian Rise. Stage 2: also usable while using other skills |
| **Legacy of First Transcendence** | Destiny 2nd Transcendence | **+10% Attack Power (or Magic ATT) for 60 s**, 120 s CD |

Sources: <https://maplestorywiki.net/w/Tanadian_Ruin_(Skill)> · <https://maplestorywiki.net/w/Aeonian_Rise_(Skill)> · <https://maplestorywiki.net/w/Decisive_Willpower> · <https://maplestorywiki.net/w/Undying_Determination> · <https://maplestorywiki.net/w/Legacy_of_First_Transcendence> · <https://maplestorywiki.net/w/Destiny_Weapon>

**Liberated Genesis Weapon comes at:** Star Force 22★ (not enhanceable), 15% scrolls applied (non-Heroic), Unique Potential, Epic Bonus Potential (non-Heroic). **Destiny Stage 1:** 22★ not enhanceable, potentials carried over and upgraded to Lv250 values. **Destiny Stage 2:** 22★ **enhanceable to 25★**.
Sources: <https://maplestorywiki.net/w/Genesis_Weapon> · <https://maplestorywiki.net/w/Destiny_Weapon>

---

### 6. Pitched Boss Set

**Maximum 10 counted pieces** (10 distinct equip slots; the multiple Cursed Spellbook colours, Mitra's Rage job variants, and the two Android Hearts are alternatives within one slot each).

| Pieces | Effect at this tier | Cumulative |
|---|---|---|
| 2 | All Stats +10, Max HP +250, WATT +10, MATT +10, **Boss +10%** | AS +10, HP +250, ATT +10, Boss +10% |
| 3 | All Stats +10, Max HP +250, WATT +10, MATT +10, DEF +250, **IED +10%** | AS +20, HP +500, ATT +20, DEF +250, Boss +10%, IED +10% |
| 4 | All Stats +15, Max HP +375, WATT +15, MATT +15, **Crit Damage +5%** | AS +35, HP +875, ATT +35, Boss +10%, IED +10%, CritDmg +5% |
| 5 | All Stats +15, Max HP +375, WATT +15, MATT +15, **Boss +10%** | AS +50, HP +1,250, ATT +50, Boss +20%, IED +10%, CritDmg +5% |
| 6 | All Stats +15, Max HP +375, WATT +15, MATT +15, **IED +10%** | AS +65, HP +1,625, ATT +65, Boss +20%, **IED +19%**, CritDmg +5% |
| 7 | All Stats +15, Max HP +375, WATT +15, MATT +15, **Crit Damage +5%** | AS +80, HP +2,000, ATT +80, Boss +20%, IED +19%, **CritDmg +10%** |
| 8 | All Stats +15, Max HP +375, WATT +15, MATT +15, **Boss +10%** | AS +95, HP +2,375, ATT +95, Boss +30%, IED +19%, CritDmg +10% |
| 9 | All Stats +15, Max HP +375, WATT +15, MATT +15, **Crit Damage +5%** | AS +110, HP +2,750, ATT +110, Boss +30%, IED +19%, **CritDmg +15%** |
| 10 | All Stats +20, Max HP +500, WATT +20, MATT +20, **Boss +10%** | **AS +130, HP +3,250, ATT +130, DEF +250, Boss +40%, IED +19%, CritDmg +15%** |

Source: <https://maplestorywiki.net/w/Pitched_Boss_Set>
Cross-check on the 10-set total (identical): <https://www.digitaltq.com/maplestory-set-effects>
MSEA calls this the "Boss of Darkness Set" (same page, Server Naming Difference table).

#### Members (current list) with slot, level, and drop source

| Item | Slot | Lv | Base stats | Dropped by |
|---|---|---|---|---|
| **Black Heart** | Android Heart | 120 | All Stats +50 (10 base + 40 class bonus), Max HP +100, WATT **or** MATT +77; fixed Potential **Boss +30%, IED +30%**. *Time-limited 20 days, cannot be extended.* | Hard Lotus (via Damaged Black Heart → Sensitive Squaroid) |
| **Berserked** | Face Accessory | 160 | All Stats +10, WATT/MATT +10, DEF +200 | Lose Control Heaven Core [Hard/Extreme] = Lotus |
| **Magic Eyepatch** | Eye Accessory | 160 | All Stats +15, WATT/MATT +3, DEF +300 | Restrained Sword of Destruction [Hard] = Damien |
| **Source of Suffering** | Pendant | 160 | All Stats +10, Max HP +5%, WATT/MATT +3, DEF +200 | Verus Hilla Treasure Chest [Hard] |
| **Cursed Spellbook** (Red/Blue/Green/Yellow) | Pocket Item | 160 | +20 to one main stat, +10 to the other three, HP/MP +100, WATT/MATT +10 | Hard Will |
| **Commanding Force Earring** | Earrings | 200 | All Stats +7, HP/MP +500, WATT/MATT +5, DEF +100 | Darknell Treasure Chest [Hard] |
| **Endless Terror** | Ring | 200 | All Stats +5, HP/MP +250, WATT/MATT +4 | Gloom Core [Chaos] |
| **Dreamy Belt** | Belt | 200 | All Stats +50, HP/MP +150, WATT/MATT +6, DEF +150 | Final Music Box [Hard] = Lucid |
| **Genesis Badge** | Badge | 200 | All Stats +15, WATT/MATT +10, Move Spd +10, Jump +10 | Genesis Crux [Hard/Extreme] = Black Mage |
| **Mitra's Rage: Warrior / Magician / Bowman / Thief / Pirate** | Emblem | 200 | Warrior: STR/DEX +40, Max HP +700, WATT/MATT +5. Others: two relevant stats +40, WATT/MATT +5 | Mitra's Rage Selection Box (Kaling) |
| **Total Control** | Android Heart | 200 | All Stats +25, Max HP +1,250, WATT/MATT +15, **IED +30%** | Lose Control Heaven Core [Extreme] = Extreme Kaling |

Sources: <https://maplestorywiki.net/w/Pitched_Boss_Set> (member table) · per-item drop sources from <https://maplestorywiki.net/w/Black_Heart>, <https://maplestorywiki.net/w/Berserked>, <https://maplestorywiki.net/w/Magic_Eyepatch>, <https://maplestorywiki.net/w/Source_of_Suffering>, <https://maplestorywiki.net/w/Commanding_Force_Earring>, <https://maplestorywiki.net/w/Endless_Terror>, <https://maplestorywiki.net/w/Dreamy_Belt>, <https://maplestorywiki.net/w/Genesis_Badge>, <https://maplestorywiki.net/w/Total_Control>, <https://maplestorywiki.net/w/Mitra%27s_Rage:_Warrior> · cross-check on membership: <https://grandislibrary.com/content/progression-guide>

#### ⚠ Corrections to the brief's assumed member list
- **Daybreak Pendant and Estella Earrings are NOT Pitched Boss items** — they are **Dawn Boss Set** items (see §7).
- **Whisper of the Source is NOT a Pitched Boss item** — it is the *first* item of the **Brilliant Boss Set** (see §8). Source: <https://maplestorywiki.net/w/Whisper_of_the_Source>
- **"Grindstone of Life" is not equipment at all.** It is a consumable used to upgrade untradable Level 4 Special Skill Rings to Level 5 (Ring of Restraint, Continuous Ring, and GMS-only rings such as Weapon Jump S/I/L/D, Risk Taker, Totalling, Critical Damage). Dropped by Kalos/World Heart/Crooked Scale/Peace Blooms Again in **Interactive/non-Reboot worlds only**. Source: <https://maplestorywiki.net/w/Grindstone_of_Life>

#### Exceptional Enhancement (applies to Pitched + Brilliant)

Exceptional Hammers can be applied **1×** to Pitched Boss Set pieces and **3×** to Brilliant Boss Set pieces. 0→1 is 100% free; 1→2 is 50% (1 hammer, 2.5B mesos) or 100% (2 hammers, 5B); 2→3 is 25% (1 hammer, 5B) or 50% (2 hammers, 10B). Extraction costs 10B mesos.

| Hammer | Usable on | Dropped by |
|---|---|---|
| Exceptional Hammer (Belt) | Dreamy Belt | Extreme Black Mage |
| Exceptional Hammer (Face Acc) | Berserked, **Original Sin of Pride** | Extreme Chosen Seren |
| Exceptional Hammer (Eye Acc) | Magic Eyepatch | Extreme Kalos |
| Exceptional Hammer (Earrings) | Commanding Force Earring | Extreme Kaling |
| Exceptional Hammer (Medal) | **Immortal Legacy** | Extreme First Adversary |

Added GMS 243 (19 Jul 2023); extraction added GMS 255 (20 Nov 2024); Medal hammer added **GMS 265 (17 Dec 2025)**.
Source: <https://maplestorywiki.net/w/Exceptional_Enhancement>

---

### 7. Dawn Boss Set

**4 pieces max.**

| Pieces | Effect at this tier | Cumulative |
|---|---|---|
| 2 | All Stats +10, Max HP +250, WATT +10, MATT +10, **Boss +10%** | AS +10, HP +250, ATT +10, Boss +10% |
| 3 | All Stats +10, Max HP +250, WATT +10, MATT +10 | AS +20, HP +500, ATT +20, Boss +10% |
| 4 | All Stats +10, Max HP +250, WATT +10, MATT +10, DEF +100, **IED +10%** | **AS +30, HP +750, ATT +30, DEF +100, Boss +10%, IED +10%** |

Source: <https://maplestorywiki.net/w/Equipment_Set/Dawn_Boss_Set>

| Item | Slot | Lv | Base stats | Source |
|---|---|---|---|---|
| Daybreak Pendant | Pendant | 140 | All Stats +8, Max HP +5%, WATT/MATT +2, DEF +100 | Verus Hilla / Chosen Seren |
| Twilight Mark | Face Accessory | 140 | All Stats +5, WATT/MATT +5, DEF +100 | Lucid / Will |
| Estella Earrings | Earrings | 160 | All Stats +7, HP/MP +300, WATT/MATT +2, DEF +100 | Gloom / Darknell |
| **Dawn** Guardian Angel Ring | Ring | 160 | All Stats +5, HP/MP +200, WATT/MATT +2 | Guardian Angel Slime — requires a **Conversion Scroll** from Chief Slime to convert a normal Guardian Angel Ring (which is a *Boss Accessory Set* item) into the Dawn version |

Sources: <https://maplestorywiki.net/w/Equipment_Set/Dawn_Boss_Set> (stats) · <https://grandislibrary.com/content/progression-guide> (boss sources + conversion-scroll mechanic)

---

### 8. Brilliant Boss Set ("Radiant" / KMS 광휘의 보스 세트)

Successor tier to the Pitched Boss Set. All members are **Level 250**, from Hard-mode Level 260+ Grandis bosses.

| Pieces | Effect at this tier | Cumulative |
|---|---|---|
| 2 | All Stats +20, Max HP +500, WATT +20, MATT +20, **Boss +15%** | AS +20, HP +500, ATT +20, Boss +15% |
| 3 | All Stats +20, Max HP +500, WATT +20, MATT +20, **IED +15%** | AS +40, HP +1,000, ATT +40, Boss +15%, IED +15% |
| 4 | All Stats +20, Max HP +500, WATT +20, MATT +20, **Crit Damage +5%** | AS +60, HP +1,500, ATT +60, Boss +15%, IED +15%, CritDmg +5% |
| 5 | All Stats +20, Max HP +500, WATT +20, MATT +20, **Boss +15%** | **AS +80, HP +2,000, ATT +80, Boss +30%, IED +15%, CritDmg +5%** |
| 6 **(KMS only)** | All Stats +20, Max HP +500, WATT +20, MATT +20, **Crit Damage +7.5%** | AS +100, HP +2,500, ATT +100, Boss +30%, IED +15%, CritDmg +12.5% |

Source: <https://maplestorywiki.net/w/Brilliant_Boss_Set> (the wiki explicitly footnotes the 6-set tier and the eye accessory as **KMS only**)
MSEA name: "Boss of Brilliant Set" (same page).

#### Members

| Item | Slot | Lv | Base stats | Dropped by | Region |
|---|---|---|---|---|---|
| **Whisper of the Source** | Ring | 250 | All Stats +10, HP/MP +500, WATT/MATT +5 | **Hard Limbo** | GMS ✓ (1st added) |
| **Oath of Death** | Pendant | 250 | All Stats +15, Max HP +5%, WATT/MATT +5, DEF +300 | **Hard Baldrix** (Concentrated Magical Essence) | GMS ✓ (2nd) |
| **Immortal Legacy** | Medal | 250 | All Stats +10, HP/MP +500, WATT/MATT +10 | **Hard / Extreme First Adversary** (World Heart) | GMS ✓ (3rd) |
| **Blissful Nightmare** | Ring | 250 | All Stats +10, HP/MP +500, WATT/MATT +5 | **Hard Malefic Star** (Crooked Scale) | GMS ✓ (4th) |
| **Original Sin of Pride** | Face Accessory | 250 | All Stats +15, WATT/MATT +15, DEF +300 | **Hard Jupiter** (Alchemical Remnant) | GMS ✓ (5th) |
| 굶주리는 핏빛 원혼 (*Starving Blood-Red Wraith*) | Eye Accessory | 250 | All Stats +20, WATT/MATT +5, DEF +450 | — | **KMS only** |

Sources: <https://maplestorywiki.net/w/Brilliant_Boss_Set> · <https://maplestorywiki.net/w/Whisper_of_the_Source> · <https://maplestorywiki.net/w/Oath_of_Death> · <https://maplestorywiki.net/w/Immortal_Legacy> · <https://maplestorywiki.net/w/Blissful_Nightmare> · <https://maplestorywiki.net/w/Original_Sin_of_Pride>

**Note on two rings:** Whisper of the Source and Blissful Nightmare are both rings and both count, since a character has 4 ring slots — so **5-set is achievable in GMS**.

---

### 9. Boss Accessory Set (generic)

Counts at **3 / 5 / 7 / 9** pieces only.

| Pieces | Effect at this tier | Cumulative |
|---|---|---|
| 3 | All Stats +10, Max HP +5%, Max MP +5%, WATT +5, MATT +5, DEF +60 | AS +10, HP/MP +5%, ATT +5, DEF +60 |
| 5 | All Stats +10, Max HP +5%, Max MP +5%, WATT +5, MATT +5, DEF +60 | AS +20, HP/MP +10%, ATT +10, DEF +120 |
| 7 | All Stats +10, WATT +10, MATT +10, DEF +80, **IED +10%** | AS +30, HP/MP +10%, ATT +20, DEF +200, IED +10% |
| 9 | All Stats +15, WATT +10, MATT +10, DEF +100, **Boss Damage +10%** | **AS +45, HP/MP +10%, ATT +30, DEF +300, Boss +10%, IED +10%** |

Source: <https://maplestorywiki.net/w/Equipment_Set/Boss_Accessory_Set>
Cross-check (identical): <https://www.digitaltq.com/maplestory-set-effects>

#### Members

| Item | Slot | Lv | Base stats | Boss |
|---|---|---|---|---|
| Condensed Power Crystal | Face | 110 | AS +5, ATT +5, DEF +100 | Zakum |
| Aquatic Letter Eye Accessory | Eye | 100 | AS +6, ATT +1, DEF +100 | Zakum |
| Black Bean Mark | Eye | 135 | AS +7, ATT +1, DEF +120 | Pink Bean |
| Papulatus Mark | Eye | 145 | AS +8, ATT +1, DEF +150 | Chaos Papulatus |
| Dea Sidus Earring | Earrings | 130 | AS +5, ATT +2, DEF +50 | — |
| Will o' the Wisps | Earrings | 130 | AS +7, HP/MP +100, ATT +2, DEF +100 | Horntail |
| Silver Blossom Ring | Ring | 110 | AS +5, ATT +2 | Horntail |
| Noble Ifia's Ring | Ring | 120 | AS +5, HP/MP +200, ATT +2 | Ifia (NPC) |
| Guardian Angel Ring | Ring | 160 | AS +5, HP/MP +200, ATT +2 | Guardian Angel Slime |
| Horntail Necklace | Pendant | 120 | AS +7, DEF +108 | Easy/Normal Horntail |
| Chaos Horntail Necklace | Pendant | 120 | AS +10, HP/MP +10%, ATT +2, DEF +140 | Chaos Horntail |
| Mechanator Pendant | Pendant | 120 | AS +10, HP/MP +250, ATT +1, DEF +100 | Arkarium |
| Dominator Pendant | Pendant | 140 | AS +20, HP/MP +10%, ATT +3, DEF +100 | Arkarium |
| Golden Clover Belt | Belt | 140 | AS +15, HP/MP +150, ATT +1, DEF +150 | Pink Bean |
| Enraged Zakum Belt | Belt | 150 | AS +18, HP/MP +150, ATT +1, DEF +150 | Chaos Zakum |
| Royal Black Metal Shoulder | Shoulder | 120 | AS +10, ATT +6, DEF +100 | Magnus |
| Stone of Eternal Life | Pocket | — | AS +3, ATT +3 | Hilla |
| Pink Holy Cup | Pocket | 140 | AS +5, HP/MP +50, ATT +5 | Pink Bean |
| Crystal Ventus Badge | Badge | 130 | AS +10, ATT +5, Spd/Jmp +10 | Magnus |

Sources: <https://maplestorywiki.net/w/Equipment_Set/Boss_Accessory_Set> (stats) · <https://grandislibrary.com/content/progression-guide> (boss attribution)

---

### 10. Gollux Sets

All four tiers are **4 pieces**: Earrings, Ring, Engraved Pendant, Engraved Belt. Purchased from Lucia with Gollux Coins/Pennies; Belt + Earrings also drop directly from Gollux.

#### Superior Gollux Set (Lv 150) — Hell Gollux

| Pieces | Effect | Cumulative |
|---|---|---|
| 2 | All Stats +20, Max HP +1,500, Max MP +1,500 | AS +20, HP/MP +1,500 |
| 3 | Max HP +13%, Max MP +13%, WATT +35, MATT +35 | + HP/MP +13%, ATT +35 |
| 4 | **Boss Damage +30%, IED +30%** | **AS +20, HP/MP +1,500 & +13%, ATT +35, Boss +30%, IED +30%** |

Source: <https://maplestorywiki.net/w/Equipment_Set/Superior_Gollux_Set>
Cross-checks (identical): <https://www.digitaltq.com/maplestory-set-effects> · <https://ayumilove.net/maplestory-equipment-set/>

Items: Superior Gollux Earrings (AS +15, HP/MP +150, ATT +10, DEF +100) · Superior Gollux Ring (AS +10, HP/MP +250, ATT +8, DEF +150, Spd +10) · Superior Engraved Gollux Pendant (AS +28, HP/MP +300, ATT +5, DEF +100) · Superior Engraved Gollux Belt (AS +60, HP/MP +200, **ATT +35**, DEF +100).

#### Reinforced Gollux Set (Lv 140) — Hard/Hell Gollux

| Pieces | Effect | Cumulative |
|---|---|---|
| 2 | All Stats +15, Max HP +1,200, Max MP +1,200 | AS +15, HP/MP +1,200 |
| 3 | Max HP +10%, Max MP +10%, WATT +30, MATT +30 | + HP/MP +10%, ATT +30 |
| 4 | **Boss Damage +30%, IED +15%** | **AS +15, HP/MP +1,200 & +10%, ATT +30, Boss +30%, IED +15%** |

Source: <https://maplestorywiki.net/w/Equipment_Set/Reinforced_Gollux_Set> · cross-check <https://ayumilove.net/maplestory-equipment-set/>

Items: Earrings (AS +12, HP/MP +150, ATT +6, DEF +100) · Ring (AS +8, HP/MP +200, ATT +5, DEF +150, Spd +10) · Pendant (AS +23, HP/MP +300, ATT +3, DEF +100) · Belt (AS +30, HP/MP +200, ATT +20, DEF +100).

#### Solid Gollux Set (Lv 130)

| Pieces | Effect | Cumulative |
|---|---|---|
| 2 | All Stats +12, Max HP +800, Max MP +800 | AS +12, HP/MP +800 |
| 3 | Max HP +8%, Max MP +8%, WATT +20, MATT +20 | + HP/MP +8%, ATT +20 |
| 4 | **IED +15%**; 5% chance to apply Level 2 Freeze when attacking | **AS +12, HP/MP +800 & +8%, ATT +20, IED +15%, 5% Lv2 Freeze** |

Source: <https://maplestorywiki.net/w/Equipment_Set/Solid_Gollux_Set> · cross-check <https://ayumilove.net/maplestory-equipment-set/>
Items: Earrings (AS +10, HP/MP +100, ATT +5, DEF +100) · Ring (AS +6, HP/MP +100, ATT +4, DEF +100) · Pendant (AS +19, HP/MP +250, ATT +3, DEF +100) · Belt (AS +10, HP/MP +200, ATT +10, DEF +100).

#### Cracked Gollux Set (Lv 120)

| Pieces | Effect | Cumulative |
|---|---|---|
| 2 | All Stats +10, Max HP +500, Max MP +500 | AS +10, HP/MP +500 |
| 3 | Max HP +5%, Max MP +5%, WATT +12, MATT +12 | + HP/MP +5%, ATT +12 |
| 4 | **IED +15%**; 5% chance to apply Level 2 Freeze when attacking | **AS +10, HP/MP +500 & +5%, ATT +12, IED +15%, 5% Lv2 Freeze** |

Source: <https://maplestorywiki.net/w/Equipment_Set/Cracked_Gollux_Set> · cross-check <https://ayumilove.net/maplestory-equipment-set/>
Items: Earrings (AS +9, HP/MP +80, ATT +4, DEF +100) · Ring (AS +4, HP/MP +50, ATT +2, DEF +50) · Pendant (AS +15, HP/MP +200, ATT +3, DEF +100) · Belt (AS +8, HP/MP +200, DEF +100).

---

### 11. Meister / "Ardentmill" accessory set

There is **no set literally named "Meister Set" or "Masterwork Set"** in the current wiki. The Meister crafted accessories belong to the **Ardentmill Set**. A wiki search for "Masterwork" returns only *Masterwork Charges* / *Evolving Masterwork Charges* (not accessories) — so the brief's "Masterwork sets" is **UNVERIFIED / likely nonexistent**.

| Pieces | Effect | Cumulative |
|---|---|---|
| 2 | Max HP +10%, Max MP +10% | HP/MP +10% |
| 3 | WATT +40, MATT +40 | + ATT +40 |
| 4 | **Boss Damage +20%** | **HP/MP +10%, ATT +40, Boss +20%** |

Source: <https://maplestorywiki.net/w/Ardentmill_Set>

| Item | Slot | Lv | Base stats |
|---|---|---|---|
| Meister Earring | Earrings | 140 | All Stats +5, HP/MP +500, WATT/MATT +4, DEF +70. Max Star Force **30**. Boss Reward item (extra Bonus Stats). |
| Meister Ring | Ring | 140 | All Stats +5, HP/MP +200, WATT/MATT +1, DEF +150. Max Star Force **30**. Only one may be equipped at a time. |
| Meister Shoulder | Shoulder | 140 | All Stats +13, WATT/MATT +9, DEF +150. Max Star Force **30**. |
| Meister weapons (e.g. Meister Thanatos, Lv 145) | Weapon | 145 | class-specific | 

Sources: <https://maplestorywiki.net/w/Ardentmill_Set> · <https://maplestorywiki.net/w/Meister_Ring> · <https://maplestorywiki.net/w/Meister_Earring> · <https://maplestorywiki.net/w/Meister_Shoulder>

There is **no Meister Pendant** in the Ardentmill Set (the brief listed one). The 4th slot is filled by a Meister *weapon*.

Practical note (secondary source, not authoritative): the Meister shoulder conflicts with other shoulder BiS choices, which is why the 3-set is usually the practical stopping point; the Meister Ring is a common BiS because at Lv140 it can reach full star force. Source: <https://www.digitaltq.com/maplestory-accessory-crafting-guide-meister-ring>

Related sibling sets on the same page family (no damage relevance beyond stats): *Immortal Ardentmill Hero Set*, *Eternal Ardentmill Hero Set* — see <https://maplestorywiki.net/w/Equipment_Set>.

---

### 12. Blackgate Set (and "Whitegate")

**Blackgate Set** — Level 120, 10 pieces: Cap, Mask, Armor (overall), Boots, Gloves, Cape, Shoulder, Belt, Necklace, Ring.

| Pieces | Effect | Cumulative |
|---|---|---|
| 3 | All Stats +10, WATT +5, MATT +5 | AS +10, ATT +5 |
| 6 | All Stats +10, Max HP +2%, Max MP +2%, WATT +5, MATT +5, DEF +50 | AS +20, HP/MP +2%, ATT +10, DEF +50 |
| 10 | All Stats +20, Max HP +8%, Max MP +8%, WATT +15, MATT +15, DEF +200, **IED +30%**, 5% chance Level 2 Freeze | **AS +40, HP/MP +10%, ATT +25, DEF +250, IED +30%, 5% Lv2 Freeze** |

Source: <https://maplestorywiki.net/w/Blackgate_Set>

**"Whitegate Set" does not exist** — a MediaWiki full-text search of maplestorywiki.net for "Whitegate" returns **zero results** (`https://maplestorywiki.net/api.php?action=query&list=search&srsearch=Whitegate`). **UNVERIFIED / believed nonexistent.**

**Ryude's Sword** is a standalone Lv 120 two-handed sword with a special effect (70% chance to add one extra attack line on skill use, not applicable to all skills) — it is **not** part of a "gate" set. Sources: <https://maplestorywiki.net/w/Ryude's_Sword> · <https://maplestory.net/discover/item/1402224/ryude-s-sword>

**Silver Blossom Ring** is a **Boss Accessory Set** member (§9), not a "gate" set item. Source: <https://maplestorywiki.net/w/Equipment_Set/Boss_Accessory_Set>

---

### 13. Other accessory / misc sets with damage-relevant effects

#### Masteria's Legacy (Lv 180)

| Pieces | Effect | Cumulative |
|---|---|---|
| 4 | All Stats +35, HP/MP +1,000, WATT/MATT +35, **IED +5%, Boss +5%** | AS +35, HP/MP +1,000, ATT +35, IED +5%, Boss +5% |
| 5 | All Stats +5, HP/MP +5%, WATT/MATT +5, **IED +5%, Boss +5%, Crit Rate +5%** | AS +40, HP/MP +1,000 & +5%, ATT +40, **IED +9.75%**, Boss +10%, Crit Rate +5% |
| 6 | All Stats +10, WATT/MATT +10, **IED +15%, Boss +20%, Crit Rate +5%** | **AS +50, HP/MP +1,000 & +5%, ATT +50, IED +23.2875%, Boss +30%, Crit Rate +10%** |

Source: <https://maplestorywiki.net/w/Masteria%27s_Legacy> (note the explicit multiplicative-IED footnote here: 9.75% and 23.2875%)
Members include Numenal's Willpower (Earrings, AS +1, HP/MP +150, ATT +5, DEF +100), Glona's Heart (Ring, AS +7, HP/MP +150, ATT +5, DEF +100), Legacy of Light (Pendant, AS +20, DEF +100), and others.

#### Sweetwater Set

| Pieces | Effect | Cumulative |
|---|---|---|
| 2 | All Stats +25, WATT/MATT +20 | AS +25, ATT +20 |
| 3 | All Stats +75, WATT/MATT +35 | AS +100, ATT +55 |
| 4 | All Stats +95, WATT/MATT +48 | AS +195, ATT +103 |
| 5 | DEF +100 | AS +195, ATT +103, DEF +100 |
| 6 | Max HP +20%, Max MP +20%, DEF +200, **Boss Damage +30%** | **AS +195, HP/MP +20%, ATT +103, DEF +300, Boss +30%** |

Source: <https://maplestorywiki.net/w/Sweetwater_Set>

#### Kritias Set (Lv 150, 3 pieces: Inverse Jewel Earring, Inverse Metal Shoulder, Inverse Codex)

| Pieces | Effect |
|---|---|
| 3 | WATT +20, MATT +20, **Boss Damage +20%** |

Source: <https://maplestorywiki.net/w/Kritias_Set>

#### Sengoku Treasure Set (Lv 140, 3 pieces: Kanna's Treasure ring, Ayame's Treasure belt, Hayato's Treasure shoulder)

| Pieces | Effect | Cumulative |
|---|---|---|
| 2 | All Stats +2, WATT/MATT +3, DEF +20, **Damage +3%** | AS +2, ATT +3, DEF +20, Dmg +3% |
| 3 | All Stats +8, WATT/MATT +12, DEF +80, **Damage +6%** | **AS +10, ATT +15, DEF +100, Damage +9%** |

Source: <https://maplestorywiki.net/w/Sengoku_Treasure_Set>
(Note: this is *Damage %*, not Boss Damage %.)

#### Golden Flower Accessory Set (Lv 120)

| Pieces | Effect | Cumulative |
|---|---|---|
| 3 | All Stats +8, WATT/MATT +3, DEF +50 | AS +8, ATT +3, DEF +50 |
| 6 | All Stats +8, HP/MP +5%, WATT/MATT +5, DEF +50 | AS +16, HP/MP +10%, ATT +10, DEF +100 |
| 9 | All Stats +15, WATT/MATT +7, DEF +100, **Boss Damage +10%** | **AS +31, HP/MP +10%, ATT +17, DEF +200, Boss +10%** |

Source: <https://maplestorywiki.net/w/Golden_Flower_Accessory_Set>

#### Frozen Set

| Pieces | Effect | Cumulative |
|---|---|---|
| 3 | All Stats +7, WATT/MATT +6 | AS +7, ATT +6 |
| 4 | Max HP +20%, Max MP +20%, ATT/MATT +14, **Damage +9%** | AS +7, HP/MP +20%, ATT +20, Damage +9% |
| 5 | All Stats +8, ATT/MATT +20, **IED +30%** | **AS +15, HP/MP +20%, ATT +40, Damage +9%, IED +30%** |

Source: <https://maplestorywiki.net/w/Frozen_Set>

#### Antique Totem Set

| Pieces | Effect |
|---|---|
| 3 | WATT +15, MATT +15 |

Source: <https://maplestorywiki.net/w/Antique_Totem_Set>

#### Mystic Set (Lv 115)

| Pieces | Effect | Cumulative |
|---|---|---|
| 3 | All Stats +7, WATT/MATT +6 | AS +7, ATT +6 |
| 4 | All Stats +7, WATT/MATT +6 | AS +14, ATT +12 |
| 5 | All Stats +7, WATT/MATT +6 | AS +21, ATT +18 |

Source: <https://maplestorywiki.net/w/Mystic_Set>

---

### 14. Android / Pet sets

**Android Set** — this is a *cosmetic android parts* set (Lv-low), not the Pitched android hearts. Its effects are trivial and it is listed under "No Longer Obtainable / Event Only": 2-set All Stats +2, Speed +10; 4-set All Stats +4, WATT +5, MATT +10, Speed +15; 5-set All Stats +5, WATT +10, MATT +15, Speed +20.
Source: <https://maplestorywiki.net/w/Android_Set> · category listing: <https://maplestorywiki.net/w/Equipment_Set>

**Android Hearts that matter for damage** are the two Pitched Boss Set members (§6): Black Heart and Total Control.

**Pet sets:** a wiki search for "Pet Equipment Set" returns **zero results**. There is no damage-relevant pet equipment set effect in the current wiki data. **UNVERIFIED / believed nonexistent.**

---

### 15. Newly added 2025–2026 content — findings

I enumerated every page in `Category:Equipment Sets` on maplestorywiki.net sorted by most-recently-touched (`api.php?action=query&list=categorymembers&cmtitle=Category:Equipment%20Sets&cmsort=timestamp&cmdir=desc`). **There is no new endgame armor or accessory set tier beyond those documented above.** Specifically:

- **No "Eternel Set" separate tier.** "Eternel" (에테르넬) is simply the Korean romanization of **Eternal**; NamuWiki's "에테르넬 세트" page is the Eternal Set. Source: <https://maplestorywiki.net/w/Eternal_Set>
- **No Tallahart / Limbo / Baldrix / Jupiter *armor* set.** Those bosses feed the **existing Eternal Set** (shoes/gloves/cape branch) and the **Brilliant Boss Set** accessories. Sources: <https://maplestorywiki.net/w/Eternal_Set> · <https://maplestorywiki.net/w/Brilliant_Boss_Set>
- **The Brilliant Boss Set is the newest set** and is still being expanded one boss at a time: Whisper of the Source (Limbo) → Oath of Death (Baldrix) → Immortal Legacy (First Adversary) → Blissful Nightmare (Malefic Star) → Original Sin of Pride (Jupiter). A 6th KMS-only eye accessory exists.
- **Exceptional Hammer (Medal)** was added in **GMS 265, 17 Dec 2025** ("Every Little Thing Every Precious Thing Part 2"), enabling Exceptional Enhancement on Immortal Legacy. Source: <https://maplestorywiki.net/w/Exceptional_Enhancement>
- **Destiny Weapon 2nd stage of Transcendence** was added in the **Crown / Ride The Lightning** update (= current GMS v269) and is the newest damage-relevant weapon upgrade: +15% Boss Damage and +15% IED on Decisive Willpower, plus the Legacy of First Transcendence buff (+10% ATT / MATT for 60 s), plus 25★ enhanceability. Source: <https://maplestorywiki.net/w/Destiny_Weapon>
- **Star Force cap of 30** now appears on accessory pages (e.g. Meister Ring/Earring/Shoulder: "Max Star Force Enhancements: 30"). Source: <https://maplestorywiki.net/w/Meister_Ring>
- Recently-touched pages that are *not* endgame relevant: Pinnacle Set, Emperor's Memories Set, Mystic Set, Red Beryl Set, Frost Fiend Set, Challenger Sets — all low-level / legacy content.

---

### 16. Open gaps and unresolved items

| Item | Status |
|---|---|
| NamuWiki (KMS) and Fandom MapleWiki cross-checks | **Blocked** by Cloudflare — could not retrieve. All numbers rest primarily on maplestorywiki.net, with DigitalTQ/AyumiLove as partial corroboration. |
| Official Nexon GMS patch-note confirmation of any set table | **Not obtained.** No first-party Nexon page was successfully parsed for numeric set effects. |
| "Lucky Item" wildcard mechanic in GMS | Documented only from the **MSEA** wiki. Mechanic is believed identical in GMS but is **PARTIALLY UNVERIFIED for GMS**. |
| Destiny Weapon Stage 2 base weapon stats | Wiki shows Stage 1 and Stage 2 tables with identical numbers. **UNVERIFIED** whether Stage 2 raises base WATT. |
| Arcane Umbra 5-set cumulative DEF | Wiki prints +200 where +400 is implied. **Suspected wiki typo.** |
| Root Abyss 3-set on the summary page ("All Stats +9") | **Contradicts** the class detail pages and DigitalTQ ("Max HP/MP +10%, ATT +50"). Class pages preferred. |
| Per-class Root Abyss / AbsoLab / Arcane / Eternal variants for Demon Avenger, Xenon, Zero | Only Warrior and Magician variants were captured. Xenon (3 main stats), Demon Avenger (HP-based), and Zero (Lapis/Lazuli, requires Lucky Item Scroll) will differ. **Not captured — follow up on the five per-class pages.** |
| "Masterwork" accessory set, "Whitegate" set, "Meister Pendant", pet set effects | **No wiki evidence they exist.** Treat as nonexistent unless a first-party source is found. |
| Full Ifia's Treasure Set, Party Quest Set, Masteria Explorer Set, Chaos Pink Bean I / Black Bean, Guild Castle Brooch, Seven Days, Tinkerer's, Cook's, Goddess/Minerva, Immortal/Eternal Hero | Not captured — all are low-level or negligible for a damage calculator. Index: <https://maplestorywiki.net/w/Equipment_Set> |

---

## Appendix A — Cross-cutting 2025-2026 patch detail (KMS CROWN)

Compiled directly from Orange Mushroom's translations of the KMS patch notes. This is the
single largest recent change to the systems in this document, and several of the tables above
were rewritten by it.

### A.1 CROWN link skill master-level table (KMS, ver. 1.2.410, 2025-12-28)

The KMS patch note publishes both columns: what a *mule* gives you when transferred, and what
the *owning character* gets. Where only one value is shown, the two are identical.
This is the definitive statement of the "self-only damage passive" mechanic that §4 describes.

| Link Skill | When transferred (mule → you) | For yourself (owner) |
|---|---|---|
| Invincible Belief | Below 15% HP, recover 44% max HP/sec for 3s. CD 150s. | same + **[Passive: 6% damage]** |
| Empirical Knowledge | 31% chance to reveal a weakspot, 10s, stacks 3×. 5% damage and 5% DEF ignore per stack. | same |
| Adventurer Curious | 50% Monster Collection rate, 15% crit rate | 50% MC rate, 15% crit rate, **6% damage** |
| Thief Cunning | On status-effected enemy, 27% damage for 10s. CD 20s. | same |
| Pirate Bless | 100 STR/DEX/INT/LUK, Max HP 1750, Max MP 1750, 21% damage reduction | **130** STR/DEX/INT/LUK, Max HP 1750, Max MP 1750, 21% damage reduction |
| Cygnus Bless | 35 ATT & MATT, 22 status resistance, 22% elemental resistance | **55** ATT & MATT, 22 status resistance, 22% elemental resistance |
| Guardian of Light | 20s, +100 status resistance. CD 120s. | 30s shield, blocks damage up to 9 times, **+25% damage**; %HP attacks reduced 30%. CD 120s. **[Passive: 3% damage]** |
| Combo Kill Advantage | Combo Kill Orb EXP +900% | +900% and **5% damage** |
| Rune Persistence | Liberated Rune's Power duration +70% | +70% and **5% damage** |
| Elf's Blessing | Return to Elluel, CD 1800s. [Passive: 20% EXP] | same, [Passive: 20% EXP, **5% damage**] |
| Deadly Instinct | 20% crit rate | 20% crit rate, **5% damage** |
| Close Call | 15% chance to survive a fatal hit | same + **[Passive: 5% damage]** |
| Permeate | 20% DEF ignore | 20% DEF ignore, **4% damage** |
| Spirit of Freedom | On revive, 12s invincibility (cancelled on map change) | same + **[Passive: 5% damage]** |
| Demon's Fury | 20% boss damage | 20% boss damage, absorb an additional 10 Force |
| Wild Rage | 15% damage | same |
| Hybrid Logic | 15% all stats | same |
| Iron Will | 20% HP | 15% HP, **5% damage per Morph Gauge stage** |
| Prior Preparation | Defeat 8 enemies or hit a boss 5× = 1 preparation; at 5 preparations, +25% damage for 20s. CD 40s. | same |
| Intensive Assault | +9% damage vs lower-level monsters; +9% damage vs status-effected enemies | same |
| Soul Contract | +60% damage for 10s. CD 60s. | **+120%** damage for 10s. CD 60s. |
| Rhinne's Blessing | 20% damage taken reduction, 15% DEF ignore | same + **4% damage** |
| Judgement | 6% critical damage | same |
| Noblesse | 6% boss damage; 3% damage per party member in map (incl. self), up to 12%. Solo counts as a party of 1. | same |
| Tide of Battle | On moving a distance, activates 10s, up to 4 stacks, 4% damage per stack | activates **25s**, up to 4 stacks, 4% damage per stack |
| Innate Gift | **7% damage**; on attack, 100% chance to recover 3% max HP/MP per sec for 5s. CD 30s. | **10% damage**; same recovery |
| Solus | In combat 5s → activates 5s, up to 5 stacks. 1% damage and 3% damage per stack. | same |
| Grounded Body | 6% reduced damage taken (incl. %HP attacks) | same + **5% damage** |
| Nature's Friend | **7% damage**; defeat 20 normal monsters → Nature's Help 30s, +15% normal monster damage. CD 30s. | **10% damage**; same |
| Bravado | 15% DEF ignore; +19% damage vs monsters at 100% HP | 15% DEF ignore, **4% damage**; +19% damage vs monsters at 100% HP |

Source: <https://orangemushroom.net/2025/12/28/kms-ver-1-2-410-maplestory-crown-kinesis-remaster/>
(section "Link Skill Expansion", reproduced verbatim).

> **Server caveat.** This is the **KMS** table, reached via the *Proof of a Radiant Hero* item
> (level 285 + Carcion story quests, once per character, usable on one link skill).
> **GMS reaches level 3 differently — simply by having the contributing character at level 210** —
> per <https://maplestorywiki.net/w/Link_Skills>. So GMS characters get level 3 on *every* link
> naturally, whereas KMS players must spend the item on one. The *values* in §4's GMS tables are
> the ones to use for a GMS calculator; this KMS table is useful for confirming the shape of the
> self-only passives and for anticipating changes.

### A.2 CROWN Sacred Symbol level-11 bonus table (KMS, 2025-12-18)

| Symbol at level 11 | Additional effect |
|---|---|
| Sacred Symbol: Cernium | +20% damage vs **Chosen Seren**; +10% EXP |
| Sacred Symbol: Arcs (Arcus) | +20% damage vs **Watcher Kalos**; +10% EXP |
| Sacred Symbol: Odium | +20% damage vs **First Adversary**; +10% EXP |
| Sacred Symbol: Shangri-La | +20% damage vs **Kaling**; +10% EXP |
| Sacred Symbol: Arteria | +10% EXP **only** (no boss listed) |
| Sacred Symbol: Carcion | +20% damage vs **Limbo**; +10% EXP |
| Grand Sacred Symbol: Tallahart | +20% damage vs **Baldrix** (no EXP bonus) |

Source: <https://orangemushroom.net/2025/12/28/kms-ver-1-2-410-maplestory-crown-kinesis-remaster/>
(section "Authentic Symbol Effect Reorganization", reproduced verbatim).

Note the two asymmetries a calculator must encode: **Arteria's symbol grants no boss-damage
bonus** in this table, and **Grand Sacred symbols grant the boss bonus but not the +10% EXP**
(they already carry large EXP bonuses of their own).
Geardrock's Grand Sacred Symbol postdates this patch (Feb 2026); by the same pattern it should
give +20% vs Jupiter — **UNVERIFIED** from this source.

### A.3 Brilliant ("Radiant") Boss accessory set — announcement figures

| Piece count | Effect |
|---|---|
| 4 | +20 all stats, +500 HP/MP, +20 ATT/MATT, **+5% critical damage** |
| 5 | +20 all stats, +500 HP/MP, +20 ATT/MATT, **+15% boss damage** |

New members announced: **Entrancing Nightmare** (ring, drops from Radiant Malefic Star, Lv280)
and **Original Sin of Pride** (face accessory, drops from Jupiter, Lv295).

Source: <https://orangemushroom.net/2025/12/14/2025-maplestory-winter-showcase-crown/>

Cross-check §5's Brilliant Boss Set table against these; the showcase figures are the
announcement, §5's are from the wiki and should be preferred where they differ.

### A.4 Other CROWN changes that touch this document

- **Maple Union rank-up cost removed.** "Union ranks will now increase without any additional
  costs or actions when you reach the matching Union levels." If the level increases via World
  Leap, the rank applies on next login to that world. This invalidates every published
  "Legion rank-up coin cost" table (see §2's note on the stale 37,020-coin figure).
- **Hyper Stat preset change cost removed** (was 2,000,000 mesos).
- **Ability "Change Circulator"** — a new item that converts existing Legendary Ability lines to
  different stat types without rerolling, issued when a class's remaster changes which lines are
  useful (introduced with the Kinesis remaster).
- **"DF/TP/PP Increase" hyper stat renamed to "DF/TF Increase"** (Kinesis's Psychic Points removed).
- **Astra secondary weapon** — a new tier between Genesis and Destiny secondaries; converts an
  existing secondary (becomes untradeable) using Traces of Battle + Erion Fragments; 3 upgrade
  stages with star caps 15 → 20 → 30; potential carries over.
- **Grand Sacred Symbol: Geardrock** at max level gives **+50% EXP and +15% drop/meso rate**.

Sources: <https://orangemushroom.net/2025/12/14/2025-maplestory-winter-showcase-crown/> ·
<https://orangemushroom.net/2025/12/28/kms-ver-1-2-410-maplestory-crown-kinesis-remaster/>

---

## Appendix B — Independent Korean-source cross-check (namu.wiki)

I verified §3's force mechanics and symbol baselines against the Korean namu.wiki articles,
which are maintained separately from every English source used above. **Everything matched.**
This appendix records the confirmation and the few facts namu carries that the English sources
do not.

### B.1 Confirmations

| Fact | §3 value | namu.wiki value | Match |
|---|---|---|---|
| Arcane Force tiers | 10/30/60/70/80/100/110/130/150% dealt; 280/240/180/160/140/100/80/40/0% taken | identical, same ratio bands | ✅ |
| Sacred Force tiers | 5→125% dealt in the published 16-row table; taken 200/150/100% | identical row-for-row | ✅ |
| Arcane Symbol Lv1 | 30 AF + 300 main stat | "1레벨 강화당 아케인포스 10과 주스탯 100" + totals implying 30/300 | ✅ |
| Sacred Symbol Lv1 | 10 SF + 500 main stat | "1레벨 기준으로 어센틱포스 10과 주스탯 500" | ✅ |
| Arcane max total force | 1,320 (6 × 220) | "모든 심볼을 20레벨까지 올려서 1320의 아케인포스" | ✅ |
| Sacred max regional force | 660 | "최대 어센틱포스량은 660" | ✅ |
| Xenon Arcane scaling | +48 STR/DEX/LUK per level | "제논의 아케인심볼은 STR, DEX, LUK이 각각 48만큼 증가" | ✅ |
| Demon Avenger Arcane scaling | +2,100 Max HP per level | "데몬어벤져의 아케인심볼은 최대 HP가 2100만큼 증가" | ✅ |
| Sacred Force damage taken never < 100% | yes | "받는 피해량도 아케인포스와 달리 100% 이하로 떨어지지 않는다" | ✅ |

Sources: <https://namu.wiki/w/아케인포스> · <https://namu.wiki/w/어센틱포스> (rev. 2026-09-05)

### B.2 Facts only namu carries (KMS figures — treat as UNVERIFIED for GMS)

**Symbol growth-requirement formulas** (the "성장치" curve behind the symbol counts in §3):

- Sacred, Cernium → Carcion:
  `required growth × 1.8 × { (regionConst + 6) − (level − 1) ÷ 3 }`
  regionConst: Cernium 1, Arcus 2, Odium 3, Shangri-La 4, Arteria 5, Carcion 6
- Grand Sacred:
  `required growth × 1.8 × { (5 × regionConst + 17) − (3 × level − 1) ÷ 9 }`
  regionConst: Tallahart 1, Geardrock 2

**Meso cost shape (Sacred):** Cernium level 1 costs 1,260,000 mesos per symbol; the per-symbol
cost *decreases* by 60,000 per symbol level and *increases* by 180,000 per region step.
Grand Sacred: Tallahart level 1 ≈ 3,917,241 per symbol; −60,000 per level, **+900,000** per
region step. (§3 derives the same curve from a different direction with
`100,000 × floor((9L² + 20L) × (B − 0.6L))` — the two should be reconciled if exact mesos matter.)

**Totals:** ~35.9-36.0 billion mesos to max Cernium→Carcion; ~72.1 billion to max
Cernium→Geardrock. Arcane: 2,318,490,000 to max all six (314,490,000 to reach level 10 on all six).

**Time to max on dailies alone:** Arcane ~36 days (520/week). Sacred: Cernium 115 days,
Arcus and every later region 229 days.

**Daily symbol income (KMS, after the 23rd-anniversary 1.5× increase):** Cernium 30/day;
Arcus, Odium, Shangri-La, Arteria, Carcion 15/day each; Tallahart 15/day; Geardrock 15/day.
> ⚠️ §3 flags that **GMS's own symbol-rate increase ships 2026-09-09**, three days after this
> research was compiled. A GMS calculator needs a patch-date toggle here. These KMS numbers are
> not directly usable for GMS.

**Catalysts:** Arcane Catalyst 300 union coins, loses 20% of accumulated growth, resets to Lv1.
Authentic/Sacred Catalyst 500 union coins, loses **40%**, resets to Lv1, 3/week per world
(resets Thursday 00:00), usable only on level ≥2 symbols, and **cannot be used on Grand Sacred
symbols**. Symbol Quick Pass: 200 Maple Points per daily quest, 2,000 for Arcane weekly content.

**Symbol Voucher Bag** (40 slots) added 2026-03-19; only one may be active in the inventory.

### B.3 Where namu is a better source than the English wikis

namu's Sacred Force article carries **field-by-field requirements for Geardrock** (740/770/810)
and the Jupiter boss requirements (610 story, 810 normal/hard) that were still thin on English
sources when this was compiled, and it explicitly works through the force-cap arithmetic:
to reach the +50 cap on Tallahart's *easiest* map you need all six regional symbols at level 11
(660) **plus** Grand Sacred: Tallahart at level 2; the 660 and 700 maps need Tallahart symbol
levels 5 and 9; Geardrock's 810 map needs everything maxed plus Geardrock symbol level 4.

---

## Appendix C — Consolidated confidence assessment

| Section | Confidence | Basis |
|---|---|---|
| §1 Hyper Stats — cost curve | **High** | Three independent sources agree (StrategyWiki, KMS simulator source code, codingace embedded data). A widely-repeated "180 total" figure is refuted. |
| §1 Hyper Stats — effect tables | **High** | StrategyWiki per-level tables match the KMS simulator's formulas exactly, stat for stat. |
| §1 Hyper Stats — points by level | **High** (level 300 value: Medium) | StrategyWiki row-by-row; corroborated 140-290 by the simulator, which has an off-by-one at exactly level 300. |
| §2 Legion — ranks, board geometry | **High** | Cross-verified three ways including an open-source solver's array geometry. |
| §2 Legion — per-class effects | **High** | All 53 GMS jobs; Erel Light confirmed from official GMS v.269 patch notes. |
| §2 Legion — Overdrive per-point values | **Low / UNVERIFIED** | Inferred, not published. GMS has not received the rework. |
| §3 Symbols — stat/cost formulas | **High** | Derived formulas verified row-for-row against the wiki, and independently against namu.wiki (Appendix B). |
| §3 Force mechanics | **High** | Triple-sourced (StrategyWiki, KPRobin sheet, in-game boss-page wording) plus a fourth independent Korean source. |
| §3 Symbol income rates | **Medium** | GMS rates change 2026-09-09; KMS and GMS figures differ. |
| §4 Inner Ability | **High** | Nexon Korea's own probability-disclosure page, synced to the 2026-06-18 patch. Several commonly-cited lines shown not to exist. |
| §4 Link Skills | **High** | Per-skill wiki pages (GMS v270) rather than the stale overview page; CROWN table independently confirmed in Appendix A.1. |
| §5 Set Effects | **Medium-High** | Rests largely on maplestorywiki.net (verifiably current) with DigitalTQ corroboration; no first-party Nexon numeric confirmation. Several specific items flagged inline. |

### Known gaps carried forward

1. **Legion Overdrive rework** — KMS-live, GMS expected late 2026. Per-point stat values unverified.
2. **GMS symbol acquisition rates** change on 2026-09-09; the rates in §3 straddle that date.
3. **Sacred Symbol scaling for Xenon / Demon Avenger / Zero** was not confirmed (the Arcane
   equivalents were).
4. **Set effects**: the "Lucky Item" wildcard rule rests on a single MSEA source; Destiny Stage 2
   base weapon stats, a suspected Arcane Umbra DEF typo, a CRA 3-set contradiction between two
   wiki pages, and per-class set variants all remain open.
5. **Black Mage Story-mode Arcane Force requirement**: sources give 880 vs 800.
6. **No first-party Nexon America numeric confirmation** anywhere in this document — Nexon's
   GMS pages are JavaScript-only single-page apps and could not be scraped. The Korean Nexon
   probability-disclosure pages (§4) were the one first-party source obtained.
7. **Level 300 hyper stat total (1,699)** rests on StrategyWiki alone.
