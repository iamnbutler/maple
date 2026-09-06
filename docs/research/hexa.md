# HEXA Matrix (6th Job) — research notes

**Compiled:** 2026-09-06
**Scope:** GMS (Global MapleStory), **Heroic / Reboot world**, GMS ~v270 (v271 imminent).
**Purpose:** source-of-truth for a TypeScript data module (`src/lib/data/hexa.ts`) driving a
"what should I level next" optimizer.

House rules used here (same as `docs/research/formulas.md`): every table is followed by its
source URL; anything not sourced is marked **UNVERIFIED**; disagreements between sources are
marked **CONFLICT** and resolved explicitly.

---

## Table of contents

- [0. Version context — GMS vs KMS, dated](#0-version-context--gms-vs-kms-dated)
- [1. Node taxonomy](#1-node-taxonomy)
  - [1.1 The six node families](#11-the-six-node-families)
  - [1.2 How many of each a class has](#12-how-many-of-each-a-class-has)
  - [1.3 Unlock conditions and gates](#13-unlock-conditions-and-gates)
- [2. Sol Erda / Sol Erda Fragment cost tables](#2-sol-erda--sol-erda-fragment-cost-tables)
  - [2.1 The underlying data (four base curves + two multipliers)](#21-the-underlying-data-four-base-curves--two-multipliers)
  - [2.2 Origin (Skill 1)](#22-origin-skill-1)
  - [2.3 Ascent (Skill 2)](#23-ascent-skill-2)
  - [2.4 Skill 3 — KMS only as of 2026-09](#24-skill-3--kms-only-as-of-2026-09)
  - [2.5 Mastery nodes](#25-mastery-nodes)
  - [2.6 Enhancement / Boost nodes](#26-enhancement--boost-nodes)
  - [2.7 Common: Sol Janus / Sol Hecate](#27-common-sol-janus--sol-hecate)
  - [2.8 Common: 3rd common core (5th-job common boost)](#28-common-3rd-common-core-5th-job-common-boost)
  - [2.9 Totals and whole-character cost](#29-totals-and-whole-character-cost)
- [3. Effect per level](#3-effect-per-level)
  - [3.1 Enhancement / Boost cores — the exact Final Damage curve](#31-enhancement--boost-cores--the-exact-final-damage-curve)
  - [3.2 Origin skill](#32-origin-skill)
  - [3.3 Ascent skill](#33-ascent-skill)
  - [3.4 Mastery cores](#34-mastery-cores)
  - [3.5 Common cores](#35-common-cores)
- [4. HEXA Stat — the full model](#4-hexa-stat--the-full-model)
  - [4.1 Cores, unlock order, costs](#41-cores-unlock-order-costs)
  - [4.2 The level budget: main + additional + additional = node level](#42-the-level-budget-main--additional--additional--node-level)
  - [4.3 The stat pool](#43-the-stat-pool)
  - [4.4 Value per level — closed form](#44-value-per-level--closed-form)
  - [4.5 Value per level — full tables](#45-value-per-level--full-tables)
  - [4.6 The "Enhancement Rate" mechanic](#46-the-enhancement-rate-mechanic)
  - [4.7 Fragment cost per enhancement + expected totals](#47-fragment-cost-per-enhancement--expected-totals)
  - [4.8 Reset and "Change Stats" (re-roll)](#48-reset-and-change-stats-re-roll)
- [5. Sol Erda / Fragment income and Erda Conversion](#5-sol-erda--fragment-income-and-erda-conversion)
  - [5.1 The two currencies and their caps](#51-the-two-currencies-and-their-caps)
  - [5.2 Erda Conversion — it is NOT an EXP conversion](#52-erda-conversion--it-is-not-an-exp-conversion)
  - [5.3 Weekly quest — Erda's Request](#53-weekly-quest--erdas-request)
  - [5.4 Epic Dungeons — GMS Heroic](#54-epic-dungeons--gms-heroic)
  - [5.5 Boss Sol Erda Energy](#55-boss-sol-erda-energy-per-player-per-clear)
  - [5.6 Grinding income](#56-grinding-income-western-grandis--sacred-power-fields)
  - [5.7 Other sources — and non-sources](#57-other-sources--and-non-sources)
  - [5.8 Realistic weekly totals](#58-realistic-weekly-totals--gms-heroic-endgame)
  - [5.9 2025-2026 income changes, dated](#59-2025-2026-income-changes-dated)
- [6. Per-class specifics — the five priority classes](#6-per-class-specifics--the-five-priority-classes)
  - [6.1 Ren](#61-ren) · [6.2 Hero](#62-hero) · [6.3 Wind Archer](#63-wind-archer) · [6.4 Battle Mage](#64-battle-mage) · [6.5 Night Walker](#65-night-walker)
- [7. Does this reproduce the captured Ren data?](#7-does-this-reproduce-the-captured-ren-data)
- [8. Gaps / verify in-game](#8-gaps--verify-in-game)
- [9. Implementation notes](#9-implementation-notes)

---

## 0. Version context — GMS vs KMS, dated

HEXA is a moving target. Everything below is pinned to **GMS 2026-09-06**. KMS is roughly
**6-8 months ahead**, so several KMS systems are documented here but flagged as not-yet-GMS.

| Update | KMS date | GMS date | What it added |
|---|---|---|---|
| New Age: 6th Job | 2023-07-17 (ver. 1.2.379) | v227 (2023-12) | HEXA Matrix, Origin skill, 1 Mastery core, 4 Enhancement cores, HEXA Stat I |
| Dreamer | 2023-12-22 (ver. 1.2.385) | v234 | **Sol Janus** (1st common core) |
| — (2nd Mastery core) | 2024 | — | Mastery core 2 |
| Milestone / Chaser / Dark Ride | — | — | **HEXA Stat II** |
| NEXT: 3rd & 4th Mastery cores | 2024-12-19 (ver. 1.2.398) | — | Mastery cores 3 and 4; **Sol Erda conversion** (Sol Erda → Faint Sol Erda Energy / HEXA Booster) |
| NEXT: Destiny Weapon & Star Force | 2025-03-20 (ver. 1.2.401) | — | **HEXA Stat III** (Lv270, needs Stat II at 20; 15 Sol Erda + 350 frags; 35M meso reset) |
| Assemble: Ascent Skills | 2025-07-17 (ver. 1.2.405) | **v269** | **Ascent skill** (2nd skill node) for every class |
| CROWN: Sol Hecate | 2026-01-17 (ver. 1.2.411) | **v270 "Ride the Lightning"** (2026-07/08) | **Sol Hecate** (2nd common core), bossing-oriented |
| Maple Attack: 3rd Common Core | 2026-04-16 (ver. 1.2.414) | **v271 (2026-09-09)** — 3 days *after* the capture | **3rd common core** — "…VI" upgrades to 5th-job *common-branch* skills |
| Overdrive: Sol Erda cap raise, Epic Dungeon revamp | 2026-06-18 | **not in GMS** | Sol Erda cap 20 → 25 / 30 by level; Epic Dungeons → 5 stages; Monster Park Hands |
| Overdrive: 3rd HEXA Skill Core | 2026-07-31 (ver. 1.2.417) | **not in GMS** | **Skill node 3** (class-specific, cheaper than Origin/Ascent) |

Sources:
<https://orangemushroom.net/2023/07/17/kms-ver-1-2-379-maplestory-new-age-6th-job/> ·
<https://orangemushroom.net/2024/12/19/kms-ver-1-2-398-maplestory-next-3rd-4th-mastery-cores/> ·
<https://orangemushroom.net/2025/03/20/kms-ver-1-2-401-maplestory-next-destiny-weapon-star-force-reorganization/> ·
<https://orangemushroom.net/2025/07/17/kms-ver-1-2-405-maplestory-assemble-ascent-skills/> ·
<https://orangemushroom.net/2026/01/17/kms-ver-1-2-411-maplestory-crown-sol-hecate-astra-subweapon-radiant-malefic-star/> ·
<https://orangemushroom.net/2026/04/16/kms-ver-1-2-414-maple-attack-3rd-common-core/> ·
<https://orangemushroom.net/2026/07/31/kms-ver-1-2-417-maplestory-overdrive-3rd-hexa-skill-core/> ·
<https://maplestorywiki.net/w/HEXA_Matrix> (page revision 2026-08-26) ·
<https://gamemarket.gg/news/maplestory-global/maplestory-v-271-update-preview-guide-hexa-common-nodes-night-troupe-and-two-seasonal-events>

> **Bottom line for the calculator:** a GMS character on **2026-09-06** has
> **12 HEXA skill nodes**: Origin, Ascent, 4 Mastery, 4 Enhancement, Sol Janus, Sol Hecate.
> The 3rd common core arrives with v271; the 3rd class skill core is KMS-only.
> All **3 HEXA Stat cores** exist in GMS.

---

## 1. Node taxonomy

### 1.1 The six node families

| Family | Wiki name | Also called | Max level | What it is |
|---|---|---|---|---|
| Skill 1 | Skill Node → **Origin** | Origin Core | 30 | Class-specific ultimate. Full-screen, invulnerable during cast, applies **Absolute Bind** (own bind cooldown). 360 s CD. |
| Skill 2 | Skill Node → **Ascent** | Ascent Core | 30 | Class-specific boss-killer. **3 free uses per boss fight, no cooldown**; 240 s CD outside boss fights. Auto-targets highest-max-HP boss. |
| Skill 3 | Skill Node → 3rd node | — | 30 | KMS only (2026-07). Cheaper than Origin/Ascent; "addresses each class's weakness". |
| Mastery | **Mastery Node** | Mastery Core | 30 | Passive upgrade that **replaces** an existing 1st-4th job skill. Hyper Skills and V-Matrix Boost Nodes on the original carry over. |
| Enhancement | **Boost Node** | Enhancement Core | 30 | Passive **Final Damage** boost to one of the four class-specific **5th job (V) skills**. |
| Common | **Common Node** | Common Core | 30 | Shared across classes. #1 Sol Janus, #2 Sol Hecate, #3 an upgrade to 5th-job *common-branch* skills (Mastery-like). |

Source: <https://maplestorywiki.net/w/HEXA_Matrix>

### 1.2 How many of each a class has

| Family | Count per class (GMS 2026-09) |
|---|---|
| Origin | 1 |
| Ascent | 1 |
| Skill 3 | 0 in GMS (1 in KMS) |
| Mastery | **4** |
| Enhancement / Boost | **4** |
| Common | **2** in GMS (Sol Janus, Sol Hecate); 3 after v271 |
| **Total skill nodes** | **12** (GMS today) → **13** (after v271) |
| HEXA Stat cores | **3** |

Sources: <https://maplestorywiki.net/w/HEXA_Matrix> ·
<https://orangemushroom.net/2024/12/19/kms-ver-1-2-398-maplestory-next-3rd-4th-mastery-cores/>
(3rd and 4th mastery cores added together, completing the set of 4)

> Note: a "Mastery core" is a *node*, not a *skill*. One mastery node can upgrade several
> skills at once (Ren's mastery core 3 upgrades four skills). Model the node, not the skill.

### 1.3 Unlock conditions and gates

| Node | Gate |
|---|---|
| HEXA Matrix itself | 6th Job Advancement — **character level 260** |
| Origin | **Granted free at level 1** on 6th job advancement. Only costs 5 Sol Erda + 100 fragments if you reset it via Explorer Open Advancement. |
| Ascent | Costs 5 Sol Erda + 100 fragments to activate. Character-level gate **UNVERIFIED** (GMS v269). |
| Mastery node | The 1st-4th job skill(s) it upgrades must be at **max level**. An SP reset deactivates the node; it keeps its level and reactivates when the skill is maxed again. Per-skill minimum levels vary (e.g. Lv30+, Lv20+, Lv1+) — see §6. |
| Enhancement / Boost node | The class-specific 5th job skill it boosts must be **Level 25 excluding slot-enhancement levels**. Unequipping the V node deactivates the boost node (level retained). |
| Common node | **UNVERIFIED** gate; presumably available at 6th job. |
| HEXA Stat I | Character level **260**, 5 Sol Erda + 10 fragments |
| HEXA Stat II | Character level **265**, Stat I at level 20, 10 Sol Erda + 200 fragments |
| HEXA Stat III | Character level **270**, Stat II at level 20, 15 Sol Erda + 350 fragments |

Sources: <https://maplestorywiki.net/w/HEXA_Matrix> ·
<https://orangemushroom.net/2025/03/20/kms-ver-1-2-401-maplestory-next-destiny-weapon-star-force-reorganization/>

---

## 2. Sol Erda / Sol Erda Fragment cost tables

This is the load-bearing table for the whole calculator.

### 2.1 The underlying data (four base curves + two multipliers)

MapleStory Wiki stores the real per-level arrays in a Lua module. Fetched verbatim from
<https://maplestorywiki.net/index.php?title=Module:SolErdaCostTable/costData&action=raw>:

```lua
['commonA']  = { solErdaCost = {7,2,2,2,3,3,3,5,5,14,5,5,6,6,6,6,6,6,7,17,7,7,7,7,7,9,9,9,10,20},
                 fragmentCost = {125,38,44,50,57,63,69,75,82,300,110,124,138,152,165,179,193,207,220,525,
                                 234,248,262,275,289,303,317,330,344,750} }
['commonB']  = { solErdaCost = {4,1,1,1,2,2,2,3,3,9,3,3,3,3,4,4,4,4,4,14,4,5,5,5,5,5,5,5,6,18},
                 fragmentCost = {90,25,30,35,40,45,50,55,60,180,73,81,90,98,107,115,124,132,141,315,
                                 151,160,170,179,189,198,208,217,227,450} }
['general']  = { solErdaCost = {5,1,1,1,2,2,2,3,3,10,3,3,4,4,4,4,4,4,5,15,5,5,5,5,5,6,6,6,7,20},
                 fragmentCost = {100,30,35,40,45,50,55,60,65,200,80,90,100,110,120,130,140,150,160,350,
                                 170,180,190,200,210,220,230,240,250,500} }
['generalB'] = { solErdaCost = {7,1,1,1,1,2,2,2,2,8,2,2,3,3,3,3,3,3,3,12,4,4,4,4,4,4,5,5,5,14},
                 fragmentCost = {140,21,26,30,34,38,43,47,51,142,62,69,77,83,91,98,105,112,120,252,
                                 128,136,145,152,161,168,177,184,193,357} }
```

Index `i` = **cost to reach level `i`** (index 1 = the activation cost).
The wiki module (<https://maplestorywiki.net/index.php?title=Module:SolErdaCostTable&action=raw>)
maps node types onto these arrays:

| Node type | Base array | Multiplier | Note |
|---|---|---|---|
| Origin (Skill 1) | `general` | ×1 | `skipFirst` — level 1 is free (granted at 6th job) |
| Ascent (Skill 2) | `general` | ×1 | pays the level-1 activation cost |
| Skill 3 | `generalB` | ×1 | KMS only |
| Mastery | `general` | **×0.5**, `ceil` per cell | |
| Enhancement / Boost | `general` | **×0.75**, `ceil` per cell | |
| Common #1/#2 (Sol Janus, Sol Hecate) | `commonA` | ×1 | |
| Common #3 (5th-job common boost) | `commonB` | ×1 | |

**Independent corroboration:**
- `generalB` row-for-row matches Orange Mushroom's KMS ver. 1.2.417 patch note
  (Lv1 = 7 Erda / 140 frags, Lv10 = 8 / 142, Lv20 = 12 / 252, Lv30 = 14 / 357).
  <https://orangemushroom.net/2026/07/31/kms-ver-1-2-417-maplestory-overdrive-3rd-hexa-skill-core/>
- The derived totals match Whackybeanz's 6th Job calculator exactly:
  Origin 150/4,500 · Enhance 123/3,383 · Mastery 83/2,252 · Common 208/6,268.
  <https://whackybeanz.as.r.appspot.com/calc/6th-job>
- The `general` Lv1 activation cost of **5 Sol Erda / 100 fragments** matches the
  HEXA Matrix page's stated Open-Advancement Origin re-unlock cost.

> **Structure worth exploiting in code:** for the `general` family, fragment cost at level
> `L` (excluding milestones) is a clean arithmetic ramp — 30,35,40,45,50,55,60,65 for 2-9;
> 80,90,…,160 for 11-19; 170,180,…,250 for 21-29 — with **milestone spikes at 10, 20, 30**
> (200 / 350 / 500 fragments, 10 / 15 / 20 Sol Erda). Same shape in every family.

### 2.2 Origin (Skill 1)

`general`, level 1 free.

| Lv | Sol Erda | Fragments | Cum. Erda | Cum. Frag |
|---|---|---|---|---|
| 1 | 0 | 0 | 0 | 0 |
| 2 | 1 | 30 | 1 | 30 |
| 3 | 1 | 35 | 2 | 65 |
| 4 | 1 | 40 | 3 | 105 |
| 5 | 2 | 45 | 5 | 150 |
| 6 | 2 | 50 | 7 | 200 |
| 7 | 2 | 55 | 9 | 255 |
| 8 | 3 | 60 | 12 | 315 |
| 9 | 3 | 65 | 15 | 380 |
| **10** | **10** | **200** | 25 | 580 |
| 11 | 3 | 80 | 28 | 660 |
| 12 | 3 | 90 | 31 | 750 |
| 13 | 4 | 100 | 35 | 850 |
| 14 | 4 | 110 | 39 | 960 |
| 15 | 4 | 120 | 43 | 1,080 |
| 16 | 4 | 130 | 47 | 1,210 |
| 17 | 4 | 140 | 51 | 1,350 |
| 18 | 4 | 150 | 55 | 1,500 |
| 19 | 5 | 160 | 60 | 1,660 |
| **20** | **15** | **350** | 75 | 2,010 |
| 21 | 5 | 170 | 80 | 2,180 |
| 22 | 5 | 180 | 85 | 2,360 |
| 23 | 5 | 190 | 90 | 2,550 |
| 24 | 5 | 200 | 95 | 2,750 |
| 25 | 5 | 210 | 100 | 2,960 |
| 26 | 6 | 220 | 106 | 3,180 |
| 27 | 6 | 230 | 112 | 3,410 |
| 28 | 6 | 240 | 118 | 3,650 |
| 29 | 7 | 250 | 125 | 3,900 |
| **30** | **20** | **500** | **145** | **4,400** |

Source: <https://maplestorywiki.net/w/HEXA_Matrix> §Leveling Cost → Origin Skills (Skill 1),
generated from `Module:SolErdaCostTable/costData` `general` with `skipFirst`.

### 2.3 Ascent (Skill 2)

`general`, pays the level-1 activation.

| Lv | Sol Erda | Fragments | Cum. Erda | Cum. Frag |
|---|---|---|---|---|
| **1 (activate)** | **5** | **100** | 5 | 100 |
| 2 | 1 | 30 | 6 | 130 |
| 3 | 1 | 35 | 7 | 165 |
| 4 | 1 | 40 | 8 | 205 |
| 5 | 2 | 45 | 10 | 250 |
| 6 | 2 | 50 | 12 | 300 |
| 7 | 2 | 55 | 14 | 355 |
| 8 | 3 | 60 | 17 | 415 |
| 9 | 3 | 65 | 20 | 480 |
| **10** | **10** | **200** | 30 | 680 |
| 11 | 3 | 80 | 33 | 760 |
| 12 | 3 | 90 | 36 | 850 |
| 13 | 4 | 100 | 40 | 950 |
| 14 | 4 | 110 | 44 | 1,060 |
| 15 | 4 | 120 | 48 | 1,180 |
| 16 | 4 | 130 | 52 | 1,310 |
| 17 | 4 | 140 | 56 | 1,450 |
| 18 | 4 | 150 | 60 | 1,600 |
| 19 | 5 | 160 | 65 | 1,760 |
| **20** | **15** | **350** | 80 | 2,110 |
| 21 | 5 | 170 | 85 | 2,280 |
| 22 | 5 | 180 | 90 | 2,460 |
| 23 | 5 | 190 | 95 | 2,650 |
| 24 | 5 | 200 | 100 | 2,850 |
| 25 | 5 | 210 | 105 | 3,060 |
| 26 | 6 | 220 | 111 | 3,280 |
| 27 | 6 | 230 | 117 | 3,510 |
| 28 | 6 | 240 | 123 | 3,750 |
| 29 | 7 | 250 | 130 | 4,000 |
| **30** | **20** | **500** | **150** | **4,500** |

Source: <https://maplestorywiki.net/w/HEXA_Matrix> §Leveling Cost → Ascent Skills (Skill 2).
Totals cross-checked against <https://whackybeanz.as.r.appspot.com/calc/6th-job> (150 / 4,500).

### 2.4 Skill 3 — KMS only as of 2026-09

`generalB`. **Not present in GMS on 2026-09-06.** Included so the module can be extended.

| Lv | Sol Erda | Fragments | Cum. Erda | Cum. Frag |
|---|---|---|---|---|
| **1** | **7** | **140** | 7 | 140 |
| 2 | 1 | 21 | 8 | 161 |
| 3 | 1 | 26 | 9 | 187 |
| 4 | 1 | 30 | 10 | 217 |
| 5 | 1 | 34 | 11 | 251 |
| 6 | 2 | 38 | 13 | 289 |
| 7 | 2 | 43 | 15 | 332 |
| 8 | 2 | 47 | 17 | 379 |
| 9 | 2 | 51 | 19 | 430 |
| **10** | **8** | **142** | 27 | 572 |
| 11 | 2 | 62 | 29 | 634 |
| 12 | 2 | 69 | 31 | 703 |
| 13 | 3 | 77 | 34 | 780 |
| 14 | 3 | 83 | 37 | 863 |
| 15 | 3 | 91 | 40 | 954 |
| 16 | 3 | 98 | 43 | 1,052 |
| 17 | 3 | 105 | 46 | 1,157 |
| 18 | 3 | 112 | 49 | 1,269 |
| 19 | 3 | 120 | 52 | 1,389 |
| **20** | **12** | **252** | 64 | 1,641 |
| 21 | 4 | 128 | 68 | 1,769 |
| 22 | 4 | 136 | 72 | 1,905 |
| 23 | 4 | 145 | 76 | 2,050 |
| 24 | 4 | 152 | 80 | 2,202 |
| 25 | 4 | 161 | 84 | 2,363 |
| 26 | 4 | 168 | 88 | 2,531 |
| 27 | 5 | 177 | 93 | 2,708 |
| 28 | 5 | 184 | 98 | 2,892 |
| 29 | 5 | 193 | 103 | 3,085 |
| **30** | **14** | **357** | **117** | **3,442** |

Sources: <https://maplestorywiki.net/w/HEXA_Matrix> §Skill 3 ·
<https://orangemushroom.net/2026/07/31/kms-ver-1-2-417-maplestory-overdrive-3rd-hexa-skill-core/>
(independently confirms Lv1 7/140, Lv10 8/142, Lv20 12/252, Lv30 14/357).

### 2.5 Mastery nodes

`general` × **0.5**, `ceil` applied per cell (so this is *not* exactly half the Origin total).

| Lv | Sol Erda | Fragments | Cum. Erda | Cum. Frag |
|---|---|---|---|---|
| **1** | **3** | **50** | 3 | 50 |
| 2 | 1 | 15 | 4 | 65 |
| 3 | 1 | 18 | 5 | 83 |
| 4 | 1 | 20 | 6 | 103 |
| 5 | 1 | 23 | 7 | 126 |
| 6 | 1 | 25 | 8 | 151 |
| 7 | 1 | 28 | 9 | 179 |
| 8 | 2 | 30 | 11 | 209 |
| 9 | 2 | 33 | 13 | 242 |
| **10** | **5** | **100** | 18 | 342 |
| 11 | 2 | 40 | 20 | 382 |
| 12 | 2 | 45 | 22 | 427 |
| 13 | 2 | 50 | 24 | 477 |
| 14 | 2 | 55 | 26 | 532 |
| 15 | 2 | 60 | 28 | 592 |
| 16 | 2 | 65 | 30 | 657 |
| 17 | 2 | 70 | 32 | 727 |
| 18 | 2 | 75 | 34 | 802 |
| 19 | 3 | 80 | 37 | 882 |
| **20** | **8** | **175** | 45 | 1,057 |
| 21 | 3 | 85 | 48 | 1,142 |
| 22 | 3 | 90 | 51 | 1,232 |
| 23 | 3 | 95 | 54 | 1,327 |
| 24 | 3 | 100 | 57 | 1,427 |
| 25 | 3 | 105 | 60 | 1,532 |
| 26 | 3 | 110 | 63 | 1,642 |
| 27 | 3 | 115 | 66 | 1,757 |
| 28 | 3 | 120 | 69 | 1,877 |
| 29 | 4 | 125 | 73 | 2,002 |
| **30** | **10** | **250** | **83** | **2,252** |

Source: <https://maplestorywiki.net/w/HEXA_Matrix> §Leveling Cost → Mastery Nodes.
Total cross-checked against <https://whackybeanz.as.r.appspot.com/calc/6th-job> (83 / 2,252).

### 2.6 Enhancement / Boost nodes

`general` × **0.75**, `ceil` per cell.

| Lv | Sol Erda | Fragments | Cum. Erda | Cum. Frag |
|---|---|---|---|---|
| **1** | **4** | **75** | 4 | 75 |
| 2 | 1 | 23 | 5 | 98 |
| 3 | 1 | 27 | 6 | 125 |
| 4 | 1 | 30 | 7 | 155 |
| 5 | 2 | 34 | 9 | 189 |
| 6 | 2 | 38 | 11 | 227 |
| 7 | 2 | 42 | 13 | 269 |
| 8 | 3 | 45 | 16 | 314 |
| 9 | 3 | 49 | 19 | 363 |
| **10** | **8** | **150** | 27 | 513 |
| 11 | 3 | 60 | 30 | 573 |
| 12 | 3 | 68 | 33 | 641 |
| 13 | 3 | 75 | 36 | 716 |
| 14 | 3 | 83 | 39 | 799 |
| 15 | 3 | 90 | 42 | 889 |
| 16 | 3 | 98 | 45 | 987 |
| 17 | 3 | 105 | 48 | 1,092 |
| 18 | 3 | 113 | 51 | 1,205 |
| 19 | 4 | 120 | 55 | 1,325 |
| **20** | **12** | **263** | 67 | 1,588 |
| 21 | 4 | 128 | 71 | 1,716 |
| 22 | 4 | 135 | 75 | 1,851 |
| 23 | 4 | 143 | 79 | 1,994 |
| 24 | 4 | 150 | 83 | 2,144 |
| 25 | 4 | 158 | 87 | 2,302 |
| 26 | 5 | 165 | 92 | 2,467 |
| 27 | 5 | 173 | 97 | 2,640 |
| 28 | 5 | 180 | 102 | 2,820 |
| 29 | 6 | 188 | 108 | 3,008 |
| **30** | **15** | **375** | **123** | **3,383** |

Source: <https://maplestorywiki.net/w/HEXA_Matrix> §Leveling Cost → Boost Nodes.
Total cross-checked against <https://whackybeanz.as.r.appspot.com/calc/6th-job> (123 / 3,383).

### 2.7 Common: Sol Janus / Sol Hecate

`commonA`. **The most expensive node family in the game.**

| Lv | Sol Erda | Fragments | Cum. Erda | Cum. Frag |
|---|---|---|---|---|
| **1** | **7** | **125** | 7 | 125 |
| 2 | 2 | 38 | 9 | 163 |
| 3 | 2 | 44 | 11 | 207 |
| 4 | 2 | 50 | 13 | 257 |
| 5 | 3 | 57 | 16 | 314 |
| 6 | 3 | 63 | 19 | 377 |
| 7 | 3 | 69 | 22 | 446 |
| 8 | 5 | 75 | 27 | 521 |
| 9 | 5 | 82 | 32 | 603 |
| **10** | **14** | **300** | 46 | 903 |
| 11 | 5 | 110 | 51 | 1,013 |
| 12 | 5 | 124 | 56 | 1,137 |
| 13 | 6 | 138 | 62 | 1,275 |
| 14 | 6 | 152 | 68 | 1,427 |
| 15 | 6 | 165 | 74 | 1,592 |
| 16 | 6 | 179 | 80 | 1,771 |
| 17 | 6 | 193 | 86 | 1,964 |
| 18 | 6 | 207 | 92 | 2,171 |
| 19 | 7 | 220 | 99 | 2,391 |
| **20** | **17** | **525** | 116 | 2,916 |
| 21 | 7 | 234 | 123 | 3,150 |
| 22 | 7 | 248 | 130 | 3,398 |
| 23 | 7 | 262 | 137 | 3,660 |
| 24 | 7 | 275 | 144 | 3,935 |
| 25 | 7 | 289 | 151 | 4,224 |
| 26 | 9 | 303 | 160 | 4,527 |
| 27 | 9 | 317 | 169 | 4,844 |
| 28 | 9 | 330 | 178 | 5,174 |
| 29 | 10 | 344 | 188 | 5,518 |
| **30** | **20** | **750** | **208** | **6,268** |

Source: <https://maplestorywiki.net/w/HEXA_Matrix> §Leveling Cost → Common Nodes →
Sol Janus and Sol Hecate. Total cross-checked against
<https://whackybeanz.as.r.appspot.com/calc/6th-job> (208 / 6,268).

### 2.8 Common: 3rd common core (5th-job common boost)

`commonB`. Arrives in GMS with **v271**.

| Lv | Sol Erda | Fragments | Cum. Erda | Cum. Frag |
|---|---|---|---|---|
| **1** | **4** | **90** | 4 | 90 |
| 2 | 1 | 25 | 5 | 115 |
| 3 | 1 | 30 | 6 | 145 |
| 4 | 1 | 35 | 7 | 180 |
| 5 | 2 | 40 | 9 | 220 |
| 6 | 2 | 45 | 11 | 265 |
| 7 | 2 | 50 | 13 | 315 |
| 8 | 3 | 55 | 16 | 370 |
| 9 | 3 | 60 | 19 | 430 |
| **10** | **9** | **180** | 28 | 610 |
| 11 | 3 | 73 | 31 | 683 |
| 12 | 3 | 81 | 34 | 764 |
| 13 | 3 | 90 | 37 | 854 |
| 14 | 3 | 98 | 40 | 952 |
| 15 | 4 | 107 | 44 | 1,059 |
| 16 | 4 | 115 | 48 | 1,174 |
| 17 | 4 | 124 | 52 | 1,298 |
| 18 | 4 | 132 | 56 | 1,430 |
| 19 | 4 | 141 | 60 | 1,571 |
| **20** | **14** | **315** | 74 | 1,886 |
| 21 | 4 | 151 | 78 | 2,037 |
| 22 | 5 | 160 | 83 | 2,197 |
| 23 | 5 | 170 | 88 | 2,367 |
| 24 | 5 | 179 | 93 | 2,546 |
| 25 | 5 | 189 | 98 | 2,735 |
| 26 | 5 | 198 | 103 | 2,933 |
| 27 | 5 | 208 | 108 | 3,141 |
| 28 | 5 | 217 | 113 | 3,358 |
| 29 | 6 | 227 | 119 | 3,585 |
| **30** | **18** | **450** | **137** | **4,035** |

Sources: <https://maplestorywiki.net/w/HEXA_Matrix> §Leveling Cost → 5th Job Common Node
Boosts · <https://orangemushroom.net/2026/04/16/kms-ver-1-2-414-maple-attack-3rd-common-core/>
("the 3rd common core costs less Sol Erda / Sol Erda Fragments than the other two common
cores" — consistent with `commonB` < `commonA`).

### 2.9 Totals and whole-character cost

Per-node totals to level 30:

| Node type | Sol Erda | Fragments | Erda to Lv10 | Erda to Lv20 | Frag to Lv10 | Frag to Lv20 |
|---|---|---|---|---|---|---|
| Origin (free Lv1) | 145 | 4,400 | 25 | 75 | 580 | 2,010 |
| Ascent | 150 | 4,500 | 30 | 80 | 680 | 2,110 |
| Skill 3 (KMS) | 117 | 3,442 | 27 | 64 | 572 | 1,641 |
| Mastery (each) | 83 | 2,252 | 18 | 45 | 342 | 1,057 |
| Enhancement (each) | 123 | 3,383 | 27 | 67 | 513 | 1,588 |
| Common A (each) | 208 | 6,268 | 46 | 116 | 903 | 2,916 |
| Common B | 137 | 4,035 | 28 | 74 | 610 | 1,886 |

**Whole-character totals** (derived — arithmetic on the tables above, not separately sourced):

| Configuration | Sol Erda | Fragments |
|---|---|---|
| GMS today (Origin + Ascent + 4 Mastery + 4 Enh + 2 CommonA) all to **Lv30** | **1,527** | **35,432** |
| …all to **Lv20** | 587 | 14,335 |
| …all to **Lv10** | 315 | 6,806 |
| Bossing-only subset (Sol Janus excluded) to **Lv30** | 1,319 | 29,164 |
| After v271 (add 1 CommonB to Lv30) | 1,664 | 39,467 |

Arithmetic: 145 + 150 + 4×83 + 4×123 + 2×208 = 1,527 Sol Erda;
4,400 + 4,500 + 4×2,252 + 4×3,383 + 2×6,268 = 35,432 fragments.

> **Sanity anchor:** at 1,000 Sol Erda Energy per Sol Erda, a fully maxed GMS HEXA skill
> matrix costs **1,527,000 Sol Erda Energy**. See §5 for how many weeks that is.

---

## 3. Effect per level

### 3.1 Enhancement / Boost cores — the exact Final Damage curve

Every standard boost node on all five priority classes uses one identical formula. The wiki
stores it as a `{{#expr:}}` in the skill's raw wikitext:

```
Final Damage % = 10 + x + 5*log10(x) + 5*log20(x) + 10*log30(x)
```

where `logN(x)` is the wiki's own helper, defined in
<https://maplestorywiki.net/w/Module:SkillBox> as `floor(log10(x) / log10(N))`. For
`x` in 1..30 that helper is just a step indicator, so the real formula is:

```
FD%(level) = 10 + level + 5·[level ≥ 10] + 5·[level ≥ 20] + 10·[level ≥ 30]
```

| Lv | FD% | Lv | FD% | Lv | FD% |
|---|---|---|---|---|---|
| 1 | **11** | 11 | 26 | 21 | 41 |
| 2 | 12 | 12 | 27 | 22 | 42 |
| 3 | 13 | 13 | 28 | 23 | 43 |
| 4 | 14 | 14 | 29 | 24 | 44 |
| 5 | 15 | 15 | 30 | 25 | 45 |
| 6 | 16 | 16 | 31 | 26 | 46 |
| 7 | 17 | 17 | 32 | 27 | 47 |
| 8 | 18 | 18 | 33 | 28 | 48 |
| 9 | 19 | 19 | 34 | 29 | 49 |
| **10** | **25** | **20** | **40** | **30** | **60** |

Source: raw wikitext of the class skill pages, e.g.
<https://maplestorywiki.net/w/Hero/Skills> (Burning Soul Blade Boost, Instinctual Combo
Boost, Worldreaver Boost, Sword Illusion Boost) and the equivalents on
<https://maplestorywiki.net/w/Ren/Skills>, <https://maplestorywiki.net/w/Wind_Archer/Skills>,
<https://maplestorywiki.net/w/Battle_Mage/Skills>,
<https://maplestorywiki.net/w/Night_Walker/Skills>.
The "11% FD at level 1" figure is independently confirmed by
<https://orangemushroom.net/2023/07/17/kms-ver-1-2-379-maplestory-new-age-6th-job/>
(enhancement cores were buffed from 2% to 11% FD at level 1 before release), and the
"~60% at level 30" figure by <https://maplestorywiki.net/w/HEXA_Matrix>.

**Marginal value per level** — this is what the optimizer sorts on:

| From → To | ΔFD (pp) | Cost (Erda / Frag) | Fragments per pp |
|---|---|---|---|
| 9 → 10 | **+6** | 8 / 150 | 25 |
| 19 → 20 | **+6** | 12 / 263 | 44 |
| 29 → 30 | **+11** | 15 / 375 | **34** |
| 20 → 21 | +1 | 4 / 128 | 128 |
| 28 → 29 | +1 | 6 / 188 | 188 |

> **Stacking.** The boost node's FD applies **only to the single 5th-job skill it names** and
> behaves as a Final Damage multiplier — i.e. `× (1 + FD/100)` on that skill's line, stacking
> **multiplicatively** with other Final Damage sources and **not** additively with %Damage /
> %Boss Damage. **UNVERIFIED** whether it multiplies with or adds to the underlying V-skill's
> own Final Damage term; treat as multiplicative until tested.
>
> **The milestone shape dominates strategy.** Any greedy "best next level" optimizer that
> looks only one level ahead will badly mis-rank nodes sitting at 9, 19 or 29 — the module
> must expose a **cost-to-next-milestone** helper.

### 3.2 Origin skill

Two things scale with Origin level:

1. **Its own damage lines** — linear in level, per class. See §6 for exact formulas.
2. **Milestone bonuses**, identical on all classes:

| Level | Bonus gained | Cumulative |
|---|---|---|
| 10 | Ignore Enemy DEF +20% | IED +20% |
| 20 | Boss Damage +20% | IED +20%, Boss +20% |
| 30 | Ignore Enemy DEF +30% **and** Boss Damage +30% | **IED +50%, Boss +50%** |

Sources: <https://maplestorywiki.net/w/HEXA_Matrix> ·
<https://orangemushroom.net/2023/07/17/kms-ver-1-2-379-maplestory-new-age-6th-job/> ·
per-class skill pages (raw wikitext).

> **UNVERIFIED — important:** these IED / Boss Damage milestones are almost certainly
> **local to the Origin skill's own damage**, not character-wide buffs, because they appear
> inside the Origin skill's own description block. Do **not** feed them into the global IED
> stack until verified in-game.

Origin is on a **360 s cooldown**, so its DPM contribution = (sum of all its lines × hits)
÷ 6 minutes. It is invulnerable-during-cast and applies Absolute Bind (separate bind CD),
which is worth modelling as burst-window utility rather than sustained DPM.

### 3.3 Ascent skill

| Component | Value |
|---|---|
| Base (all classes) | Ignore Enemy DEF +60%, Boss Damage +40%, **Critical Rate 100%** |
| Lv10 | IED +10%, Boss Damage +10% |
| Lv20 | IED +10%, Boss Damage +10% |
| Lv30 | IED +20% |
| **Cumulative at Lv30** | **IED +100%, Boss Damage +60%, Crit Rate 100%** |
| MP cost | 1,000 (varies; Ren splits it into 200/300/500 per technique) |
| Uses | **3 per boss fight, no cooldown**; 240 s CD outside boss fights |

Sources: <https://orangemushroom.net/2025/07/17/kms-ver-1-2-405-maplestory-assemble-ascent-skills/> ·
<https://maplestorywiki.net/w/HEXA_Matrix> · per-class skill pages.

**Ascent damage bypasses most of your multiplier stack.** Per the HEXA Matrix page it is
**not** increased by:
- Hats, Rings
- Passive skill effects that trigger conditionally
- Active skill effects
- Monster elemental properties
- Monster patterns/debuffs (Lotus P1 shield, Gloom tentacle shield)
- Stat-boost consumables with duration < 30 minutes

and it does **not** trigger Final Attack-type on-hit effects. It also ignores Weapon/Magic
Cancel and Damage Reflect and always targets the highest-max-HP boss.

> For a DPM model this means Ascent must be computed on a **stripped-down** multiplier stack.
> It is the single biggest source of error if you naively apply your full buff stack to it.

### 3.4 Mastery cores

**Mastery cores scale purely linearly. There are no level 10/20/30 milestone steps on any of
the five priority classes.** Every mastery-core damage line is of the form `a + b·x` where
`x` is the node level.

Verified by inspecting the raw wikitext of all five class skill pages — the boost cores use
the `log10/log20/log30` step formula, the mastery cores never do. See §6 for the exact
`a + b·x` coefficients per class.

Mastery cores also carry **flat, level-independent riders** on several classes (e.g. Hero's
HEXA Puncture damage-taken amp, Battle Mage's HEXA Finishing Blow Crit +26% / IED +22%).
Those are node-*activation* effects, not per-level scaling — they arrive whole at level 1.

> **Modelling consequence:** mastery-core value per fragment is **flat across all 30 levels**,
> while boost-core and Origin/Ascent value per fragment is spiky. A well-behaved optimizer
> will therefore recommend "mastery to 30" as filler between milestone pushes.

### 3.5 Common cores

**Sol Janus** (common #1) — a *grinding* core. Cannot be used on boss maps at all.

| Level | EXP Obtained |
|---|---|
| 1 | +10% |
| 9 | +26% |
| **10** | **+37%** |
| 19 | +55% |
| **20** | **+67%** |
| 29 | +85% |
| **30** | **+100%** |

Both Sol Janus forms (Dawn / Twilight) also give **Normal Monster Damage +30%** at Lv30.

Source: <https://maplestorywiki.net/w/Sol_Janus> (via search index — the page itself
returned 403 to direct fetch, so the intermediate levels are **UNVERIFIED**; only the
anchors 1/9/10/19/20/29/30 above are quoted).

> **For a Heroic bossing calculator, Sol Janus contributes ZERO boss DPM.** It is 208 Sol
> Erda and 6,268 fragments of pure grinding throughput. The optimizer should either exclude
> it or model it as an *income* multiplier (more EXP → more grinding hours are worth it →
> more fragments), never as damage. Note that the Hoyoung Directory community HEXA tracker
> explicitly excludes Sol Janus from its damage panel for exactly this reason
> (<https://www.hoyoung.directory/basics/hexa-matrix>).

**Sol Hecate** (common #2) — the *bossing* common core. A summon that reacts to your own
actions and prioritises the boss with the highest max HP.
**UNVERIFIED: per-level damage table not sourced.**
Sources: <https://orangemushroom.net/2026/01/17/kms-ver-1-2-411-maplestory-crown-sol-hecate-astra-subweapon-radiant-malefic-star/> ·
<https://gamemarket.gg/news/maplestory-global/maplestory-sol-hecate-abyssal-expedition-s5-preview-coming-aug-5>
(GMS release 2026-08-05). A cosmetic "Sol Hecate Skin" system exists (1 billion mesos per
skin in KMS) — no stat effect.

**Common core #3** (v271) — class-specific "…VI" upgrades to **5th-job common-branch**
skills (Blitz Shield VI, Arcana Override VI, Evolve VI, Ultimate Dark Sight VI, Pirate Flag
VI, Cygnus Phalanx VI, Freud's Blessing VI, Call Mastema VI, …). Master level 30. Structurally
a Mastery core for the common branch.
**UNVERIFIED: per-level effect tables not sourced; GMS names not yet published.**
Source: <https://orangemushroom.net/2026/04/16/kms-ver-1-2-414-maple-attack-3rd-common-core/>

---

## 4. HEXA Stat — the full model

### 4.1 Cores, unlock order, costs

Three Stat cores exist. Each must reach level 20 before the next unlocks.

| Stat core | Min char. level | Unlock cost | Reset cost (mesos) |
|---|---|---|---|
| I | 260 | 5 Sol Erda, 10 Sol Erda Fragments | 10,000,000 |
| II | 265 | 10 Sol Erda, 200 Sol Erda Fragments | 20,000,000 |
| III | 270 | 15 Sol Erda, 350 Sol Erda Fragments | 35,000,000 |

Sources: <https://maplestorywiki.net/w/HEXA_Matrix> ·
<https://orangemushroom.net/2025/03/20/kms-ver-1-2-401-maplestory-next-destiny-weapon-star-force-reorganization/>
(Stat III: "level 270 or higher … level 20 Stat Core II … 15 Sol Erda and 350 Sol Erda
Fragments … 35m mesos to reset").

Cross-check: <https://whackybeanz.as.r.appspot.com/calc/6th-job> lists Stat core unlock at
5 Sol Erda / 10 fragments, matching core I.

**Cross-core constraints:**
- A node may not carry the same stat twice (3 *different* stats per node).
- **No two nodes may share the same Main stat.**
- A given stat may appear as an **Additional** stat at most **twice** across all nodes.

Source: <https://maplestorywiki.net/w/HEXA_Matrix>

### 4.2 The level budget: main + additional + additional = node level

**CONFIRMED.** A node's displayed level is the **sum of its three line levels**, and it caps
at 20. Each individual line caps at 10.

Two independent confirmations:
1. The Korean community HEXA Stat planner hard-codes it:
   `const mainStatValue = 20 - additionalStatValue1 - additionalStatValue2;`
   — <https://memoday.github.io/hexaStat_Simulator/js/statCore.js>
2. The wiki: "Stat nodes start at level 0 and can be leveled up to a maximum of 20 times, to
   level 20 … When a Stat node is leveled up, it will increase the stat bonus for one of the
   3 stats by 1 level. … Individual stat boosts can be enhanced to a maximum of level 10."
   — <https://maplestorywiki.net/w/HEXA_Matrix>

So a node at 20/20 has exactly 20 line-levels distributed over 3 lines, each ≤ 10.
Reachable distributions are all `(m, a₁, a₂)` with `m + a₁ + a₂ = 20`, `0 ≤ each ≤ 10`.

### 4.3 The stat pool

Six stats, **the same pool for Main and Additional** — there is no separate "main-only"
or "additional-only" list. You pick any 3 distinct stats; the first is the Main.

| Stat | Unit |
|---|---|
| Main Stat (STR / DEX / INT / LUK) | flat |
| Attack Power / Magic Attack | flat |
| Damage | % |
| Damage to Boss Monsters | % |
| Ignore Enemy Defense | % |
| Critical Damage | % |

Source: <https://maplestorywiki.net/w/HEXA_Matrix>

Class exceptions on the "Main Stat" line:
- **Xenon** gets All Stats instead, at **0.48×** the normal figure (100 → 48).
- **Demon Avenger** gets Max HP instead, at **21×** the normal figure (100 → 2,100).

### 4.4 Value per level — closed form

This is the cleanest way to encode the whole thing. Both curves are `base × multiplier[level]`:

```
MAIN_MULT       = [1, 2, 3, 4,  6,  8, 10, 13, 16, 20]   // index = level-1
ADDITIONAL_MULT = [1, 2, 3, 4,  5,  6,  7,  8,  9, 10]

BASE = { criticalDamage: 0.35, bossDamage: 1, ignoreDefense: 1,
         damage: 0.75, attack: 5, mainStat: 100 }
```

Equivalently, as the community planner writes it:

```js
// main line
if (level <= 4)      v = base * level;
else if (level <= 7) v = base * level + (level - 4) * base;                 // base*(2*level - 4)
else if (level <= 9) v = base * level + (level-4)*base + (level-7)*base;    // base*(3*level - 11)
else /* 10 */        v = base * level * 2;                                  // base*20
// additional line
v = base * level;
```

Source: <https://memoday.github.io/hexaStat_Simulator/js/statCore.js> (`calMainStatValue`,
`calAdditionalStatValue`, `multiplier`). This reproduces the full wiki table cell-for-cell.

The same six bases are visible in <https://adamoptim.github.io/hexastatCalculator/>
(5 att, 0.35% crit damage, 100 final stat, 1% boss, 1% IED, 0.75% damage).

### 4.5 Value per level — full tables

**Main line** (cumulative value at that level):

| Lv | Crit Dmg | Boss Dmg | IED | Damage | ATT/MATT | Main Stat |
|---|---|---|---|---|---|---|
| 1 | 0.35% | 1% | 1% | 0.75% | 5 | 100 |
| 2 | 0.70% | 2% | 2% | 1.50% | 10 | 200 |
| 3 | 1.05% | 3% | 3% | 2.25% | 15 | 300 |
| 4 | 1.40% | 4% | 4% | 3.00% | 20 | 400 |
| 5 | 2.10% | 6% | 6% | 4.50% | 30 | 600 |
| 6 | 2.80% | 8% | 8% | 6.00% | 40 | 800 |
| 7 | 3.50% | 10% | 10% | 7.50% | 50 | 1,000 |
| 8 | 4.55% | 13% | 13% | 9.75% | 65 | 1,300 |
| 9 | 5.60% | 16% | 16% | 12.00% | 80 | 1,600 |
| **10** | **7.00%** | **20%** | **20%** | **15.00%** | **100** | **2,000** |

**Additional line** (cumulative value at that level):

| Lv | Crit Dmg | Boss Dmg | IED | Damage | ATT/MATT | Main Stat |
|---|---|---|---|---|---|---|
| 1 | 0.35% | 1% | 1% | 0.75% | 5 | 100 |
| 2 | 0.70% | 2% | 2% | 1.50% | 10 | 200 |
| 3 | 1.05% | 3% | 3% | 2.25% | 15 | 300 |
| 4 | 1.40% | 4% | 4% | 3.00% | 20 | 400 |
| 5 | 1.75% | 5% | 5% | 3.75% | 25 | 500 |
| 6 | 2.10% | 6% | 6% | 4.50% | 30 | 600 |
| 7 | 2.45% | 7% | 7% | 5.25% | 35 | 700 |
| 8 | 2.80% | 8% | 8% | 6.00% | 40 | 800 |
| 9 | 3.15% | 9% | 9% | 6.75% | 45 | 900 |
| **10** | **3.50%** | **10%** | **10%** | **7.50%** | **50** | **1,000** |

Source: <https://maplestorywiki.net/w/HEXA_Matrix> §HEXA Stats, stat bonus table
(transcribed cell-for-cell from the raw wikitext).

Xenon / Demon Avenger Main-Stat line (from the same wiki table):

| Lv | Main (normal) | Xenon All Stat | Demon Avenger Max HP | Add'l (normal) | Xenon | DA |
|---|---|---|---|---|---|---|
| 1 | 100 | 48 | 2,100 | 100 | 48 | 2,100 |
| 5 | 600 | 288 | 12,600 | 500 | 240 | 10,500 |
| 10 | 2,000 | 960 | 42,000 | 1,000 | 480 | 21,000 |

> **Key structural fact:** main and additional lines are **identical for levels 1-4**. The
> main line only pulls ahead from level 5. And because a node has 20 levels to spend over
> three lines, a *balanced* node (7/7/6, say) is worth much less than a *main-heavy* one —
> but the main line is exactly the one you cannot steer (see §4.6).

**Stacking:** contributions from different nodes **add linearly** — no diminishing returns
across nodes. (Verified directly against the captured Ren data in §7.) Each stat then enters
the global damage formula exactly the way that stat normally does: Crit Damage adds to the
crit-damage term, IED goes through `1 − Π(1 − IEDᵢ)`, ATT is a flat attack add subject to
%ATT, Main Stat is a **flat stat add** (**UNVERIFIED** whether it is affected by %STR /
%All Stat — treat as ordinary flat stat until tested).

### 4.6 The "Enhancement Rate" mechanic

**It is not a gauge.** Each enhancement is a **single instant roll** that always succeeds in
raising *some* line by 1 — the randomness is only in *which* line.

The number displayed next to each line as "Enhancement Rate %" is that line's **probability
of being the one that levels on your next enhancement**. The whole distribution is a
function of the **Main line's current level** only:

| Main line's current level | Main's chance | Fragment cost of the next enhancement |
|---|---|---|
| 0 | 35% | 10 |
| 1 | 35% | 10 |
| 2 | 35% | 10 |
| 3 | 20% | 20 |
| 4 | 20% | 20 |
| 5 | 20% | 20 |
| 6 | 20% | 20 |
| 7 | 15% | 30 |
| 8 | 10% | 40 |
| 9 | 5% | 50 |
| 10 (capped) | **0%** | 50 |

Sources: <https://maplestorywiki.net/w/HEXA_Matrix> (levels 0-9) ·
<https://memoday.github.io/hexaStat_Simulator/js/hexa-simulator.js> (`enhance()` — reproduces
levels 0-9 exactly **and** supplies the level-10 row: `mainStatProb = 0; solErdaPieceNeeded = 50`).

The remaining probability is split between the two Additional lines:

```
if      (add1 == 10) { add1 = 0;                      add2 = 100 - mainChance; }
else if (add2 == 10) { add2 = 0;                      add1 = 100 - mainChance; }
else                 { add1 = add2 = (100 - mainChance) / 2; }
```

Source: <https://memoday.github.io/hexaStat_Simulator/js/hexa-simulator.js>, matching the
wiki prose: "If a primary stat is already at level 10, or if a primary stat is not randomly
selected … each of the two secondary stats will have an equal chance … If one of the two
secondary stats is already at the maximum enhancement level of 10, the other secondary stat
is guaranteed to be selected."

**UNVERIFIED edge case:** if *both* Additional lines are at 10 the node is already at 20/20
(0 + 10 + 10), so the case never fires in practice.

> **CONFLICT — one-off KMS buff, not a permanent rule.** Orange Mushroom's ver. 1.2.401 post
> lists "When your main stat is level 5 or higher, the main stat enhancement rate is increased
> by 20%" as an **April 6 2025 Sunday Maple** (one-day event) benefit, *not* a table change.
> The captured Ren data (main Lv6 showing exactly 20.00%) confirms the base table is
> unmodified in GMS on 2026-09-06.
> <https://orangemushroom.net/2025/03/20/kms-ver-1-2-401-maplestory-next-destiny-weapon-star-force-reorganization/>

> **CONFLICT — fragment cost at main level 8.** MapleStory Wiki and the Korean simulator both
> say **40**. Whackybeanz's calculator and an Inven forum summary say **30**.
> **Resolution: use 40** — two independent primary-ish sources (wiki table + simulator source
> code) beat one calculator page and one forum paraphrase, and Whackybeanz's table is offset
> by one row throughout (it indexes "the level you are reaching", the wiki indexes "the level
> you are at"), which is a plausible source of the slip.
> <https://whackybeanz.as.r.appspot.com/calc/6th-job> · <https://www.inven.co.kr/board/maple/2304/35116>

### 4.7 Fragment cost per enhancement + expected totals

Because the cost of *every* enhancement is set by the **Main line's** level, and the Main
line is the one you cannot control, the total cost of a 0 → 20 node is a **random variable**.

**Derived** (exact DP over states `(main, add1, add2, enhancements remaining)` using the
table in §4.6 — computed for this document, not quoted from a source):

| Quantity | Value |
|---|---|
| E[fragments, node 0 → 20] | **≈ 323** |
| E[fragments, first 5 enhancements] | ≈ 52 |
| E[fragments, first 10] | ≈ 125 |
| E[fragments, first 15] | ≈ 218 |
| Absolute minimum possible (main never levels) | 200 |
| Practical worst case (main levels at every opportunity) | 730 |
| E[Main line level after 20 enhancements] | **≈ 5.24** |

Distribution of the Main line's level after a full 0 → 20 run:

| Main lv | 0 | 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8 | 9 | 10 |
|---|---|---|---|---|---|---|---|---|---|---|---|
| P | 0.02% | 0.20% | 1.00% | 11.0% | 21.5% | 25.0% | 20.2% | 13.9% | 5.8% | 1.3% | 0.12% |

P(Main ≥ 7) ≈ **21.1%**.

**Corroboration of the derivation:** a Korean community guide states "on average about **350**
fragments is enough for a 20-star node" and "without resetting, the expected main stat level
is around **4-5**, and the chance of getting 7 or higher is **under 20%**"
(<https://maple.begchi.com/헥사떡작-하는법-순위-효율-조각>). My DP gives 323 fragments,
E[main] = 5.24 and P(≥7) = 21.1% — close enough to treat the model as correct, with the small
gap explained by the community figure carrying a safety margin.

Full HEXA Stat build-out cost (unlocks + expected leveling, all three cores to 20):

| | Sol Erda | Fragments (expected) |
|---|---|---|
| Unlocks (5 + 10 + 15) | **30** | 560 |
| Leveling 3 × ~323 | 0 | ~969 |
| **Total** | **30** | **~1,529** |

Cheap compared with the skill matrix (§2.9: 1,527 Sol Erda / 35,432 fragments) — but only if
you accept whatever main level the RNG gives you. Chasing a Main-line 7+ on all three cores
multiplies the fragment bill several times over.

### 4.8 Reset and "Change Stats" (re-roll)

Two distinct operations:

| Operation | What it does | Requirement | Cost |
|---|---|---|---|
| **Reset enhancement** | Node level → 0, all three lines → 0. Stats kept. | Node must be at **level 10 or higher** | Node I 10M · Node II 20M · Node III 35M mesos |
| **Change / reselect stats** | Swap which 3 stats are on the node | any time | **100,000,000 mesos** per node |
| **Save node** | A node at level 20 can be *saved*; you then start enhancing a fresh node in that slot, and can re-apply the saved node at any time to overwrite the current one | node at level 20 | **UNVERIFIED** (no cost stated) |

Sources: <https://maplestorywiki.net/w/HEXA_Matrix> ·
<https://memoday.github.io/hexaStat_Simulator/js/hexa-simulator.js>
(`reset()` gates on `remainingEnhance <= 10`, i.e. node level ≥ 10, and charges 10,000,000).

> The **reset → re-roll for a better main line** loop is the real endgame HEXA Stat game.
> Each cycle costs the reset mesos plus the fragments to climb back. Because reset requires
> level ≥ 10, the cheapest reroll cycle costs about **125 fragments + 10-35M mesos** per
> attempt (the 125 figure is from my DP). The *optimal* reroll policy has not been sourced —
> **UNVERIFIED** as a strategy claim.

---

## 5. Sol Erda / Fragment income and Erda Conversion

### 5.1 The two currencies and their caps

| | Cap | Notes |
|---|---|---|
| **Sol Erda Energy** | — | Auto-converts to 1 **Sol Erda** per **1,000** energy |
| **Sol Erda** | **20** in GMS | *"Excess Sol Erda energy over the held limit will not be kept."* Energy earned at the cap is **destroyed**. |
| **Sol Erda Fragment** | **none** | Stack size 9,999. **Untradable variant only in Heroic.** |

Sources: <https://maplestorywiki.net/w/Sol_Erda> · <https://maplestorywiki.net/w/Sol_Erda_Fragment> ·
<https://maplestorywiki.net/w/HEXA_Matrix>

> **This is the single most important modelling constraint in the whole system.** A character
> sitting at 20/20 Sol Erda earns **zero** from bosses and grinding. The captured Ren is at
> **01/20**, i.e. actively spending — good. But any "days to afford X" projection must clamp
> income at the cap, not integrate it freely.

> **KMS-only (not in GMS 2026-09):** the Overdrive update (KMS 2026-06-18) raised the cap to
> **20 / 25 / 30** by character level (260-274 / 275-289 / 290+).
> <https://orangemushroom.net/2026/06/14/2026-maplestory-summer-showcase-overdrive/>

Asymmetric tradability in Heroic: **Sol Erda from the weekly quest is "Transferable Within
World"**, but **fragments are untradable**. So fragments are strictly per-character; Sol Erda
is not.

### 5.2 Erda Conversion — **it is NOT an EXP conversion**

**CORRECTION to a common assumption.** "Sol Erda Conversion" converts **Sol Erda you already
hold** into one of two consumables. There is no EXP → Sol Erda Energy system anywhere in
MapleStory.

| Input | Output | Effective value |
|---|---|---|
| 1 Sol Erda | 30 × **Faint Sol Erda Energy** (10 energy each) | **300 energy — a 70% loss** (1 Sol Erda = 1,000 energy) |
| 1 Sol Erda | 1 × **HEXA Booster** | spawns "Scattered Sol Erda" monsters at 10× EXP — 19 waves × 10 mobs |

- Accessed from a button in the **HEXA Matrix** UI (SHINE classes use the Erda Link UI and get
  a **SHINE Booster** instead).
- Both outputs are **Transferable Within World** and **expire at 23:59 the day after
  conversion**. They can only be placed in storage.
- **No daily cap is documented** in any patch note — **UNVERIFIED** (absence of evidence).

Sources: <https://maplestorywiki.net/w/Sol_Erda> · <https://maplestorywiki.net/w/HEXA_Booster> ·
<https://orangemushroom.net/2024/12/19/kms-ver-1-2-398-maplestory-next-3rd-4th-mastery-cores/>

Introduced: **KMS 2024-12-19** (ver. 1.2.398, NEXT) · **GMS 2025-06-11** (Stargazer).
<https://www.mmorpg.com/news/maplestorys-big-stargazer-update-brings-a-new-job-and-area-2000135211>

> **Why it exists, and how a calculator should use it:** it is the *only* way to move Sol Erda
> between characters, and it costs 70%. Model it as an escape valve for a capped character
> (better to take 300 energy on a mule than to destroy 1,000), never as an income source.

### 5.3 Weekly quest — [Weekly Quest] Erda's Request

| | GMS | All other regions |
|---|---|---|
| Sol Erda | **9** (= 9,000 Sol Erda Energy) | 3 |
| Sol Erda Fragments | **90** | 90 |
| Kill requirement | **5,000** Sacred Power field enemies | 3,000 |

**Once per week per Maple ID (account-wide, one character only.)** NPC: *The Erda Flow*.
Requires Lv260+ and 6th Job. Was formerly a daily (3,000 kills/day); consolidated into a
weekly.

Sources: <https://maplestorywiki.net/w/(Weekly_Quest)_Erda's_Request> ·
<https://www.maplesea.com/updates/view/v240_Patch_Notes/> ·
<https://forums.maplestory.nexon.net/discussion/35609/weekly-erda-much-needed-improvement-urgent>
(GMS player thread quoting "9 Sol Erda and 90 Sol Erda Fragments", Nov 2025).

> The GMS **5,000**-kill figure is **single-sourced** (maplestorywiki only). The 3,000 figure
> for other regions is confirmed by MapleSEA patch notes.

### 5.4 Epic Dungeons — GMS Heroic

| Dungeon | Char. Lv | Sol Erda (base) | @5× | @9× | Fragments (Heroic, **flat**) | MP for 5× / 9× |
|---|---|---|---|---|---|---|
| High Mountain | 260+ | 1 | 5 | 9 | **40** | 7,500 / 30,000 |
| Angler Company | 270+ | 1 (+1 Dense Energy) | 5 | 9 | **55** | 10,000 / 40,000 |
| Nightmare Paradise | 280+ | 2 | 10 | 18 | **70** | 12,500 / 50,000 |

- **1 clear/week/character, 3 clears/week/account**, shared across all three dungeons, resets
  Thursday.
- You choose **EXP Bonus *or* Sol Erda Bonus**, not both.
- Sol Erda from Epic Dungeons is **Untradable, 30-day duration**.
- **In Heroic the fragment reward is flat and does NOT scale with the Maple Point bonus** —
  only the Interactive-world *tradable* line has bonus tiers. Sol Erda does scale.

Sources: <https://maplestorywiki.net/w/Epic_Dungeon:_High_Mountain> ·
<https://maplestorywiki.net/w/Epic_Dungeon:_Angler_Company> ·
<https://maplestorywiki.net/w/Epic_Dungeon:_Nightmare_Paradise> (raw wikitext, GMS tab).

### 5.5 Boss Sol Erda Energy (per player, per clear)

| Energy | Bosses |
|---|---|
| 50 | Hard Damien, Hard Lotus, Hard Lucid, Hard Will |
| 70 | Normal Verus Hilla, Chaos Guardian Angel Slime |
| 100 | Chaos Gloom |
| 120 | Hard Darknell, Hard Verus Hilla, Normal Malitia *(CMS/TMS)* |
| 150 | Normal Chosen Seren |
| 200 | Easy Kalos, Easy First Adversary, Easy Kaling |
| 220 | Hard Chosen Seren, Easy Bellona |
| 250 | Normal Kalos |
| 280 | Normal First Adversary, Extreme Lotus |
| 290 | Normal Malefic Star |
| 300 | Hard Black Mage, Normal Kaling |
| 350 | Normal Bellona |
| 400 | Normal Limbo, Chaos Kalos |
| 450 | Normal Baldrix, Hard First Adversary, Normal Jupiter |
| 500 | Hard Kaling |
| 560 | Extreme Chosen Seren |
| 600 | Extreme Black Mage, Hard Limbo, Hard Malefic Star |
| 620 | Hard Bellona |
| 650 | Hard Baldrix |
| 700 | Extreme Kalos |
| 750 | Extreme First Adversary, Hard Jupiter |
| 800 | Extreme Kaling |
| 1,000 | Extreme Malitia *(CMS/TMS)* |

Source: <https://maplestorywiki.net/w/HEXA_Matrix> §List of Sol Erda from Bosses
(page revision 2026-08-26). Bellona and Malitia are **not in GMS v270**.

Energy arrives as drop items — **Faint = 10, Normal = 200, Dense = 500** — the table above is
the per-boss total. Source: <https://maplestorywiki.net/w/Sol_Erda>

**Derived** weekly boss total for one fully-geared GMS Heroic character (arithmetic on the
table above, not a cited measurement): H.Lotus 50 + H.Damien 50 + H.Lucid 50 + H.Will 50 +
H.VHilla 120 + H.Darknell 120 + C.Gloom 100 + C.Slime 70 + H.Seren 220 + C.Kalos 400 +
H.Kaling 500 + H.Limbo 600 + H.Malefic Star 600 + H.Baldrix 650 + H.First Adversary 450 +
H.Jupiter 750 ≈ **4,780 energy ≈ 4.8 Sol Erda/week**.

### 5.6 Grinding income (Western Grandis / Sacred Power fields)

Drops require 6th Job and are invisible to characters that have not advanced. Maps: Cernium,
Burning Cernium, Hotel Arcus, Odium, Shangri-La, Arteria, Carcion, Tallahart, Geardock.
**No daily cap.** Source: <https://maplestorywiki.net/w/HEXA_Matrix>

**Sol Erda Fragment base drop rate: 0.0425% per mob** (~1 per 2,353) — a KMS community
measurement across 9 datasets, largest 131,857 mobs / 111 fragments.
<https://www.inven.co.kr/board/maple/2304/47273> · <https://www.inven.co.kr/board/maple/2304/47274>

**How your drop-rate stat applies** — official KMS table, 2026-04-09:

| Item | Fraction of your drop-rate stat that applies |
|---|---|
| **Sol Erda Energy / Faint Sol Erda Energy / Sol Erda Fragment** | **50%** |
| Core Gemstone, Authentic/Arcane/Grand Authentic Symbol Voucher | 50% |
| Untradeable Arcane Symbol Voucher, event/quest items | 10% |
| Boss drop rewards | 100% |

Source: <https://orangemushroom.net/2026/04/10/maple-now-april-9-2026-3rd-common-core-probability-related-fixes/>

So `effective = 0.0425% × (1 + 0.5 × dropRate)`. At **+300% drop rate** that is 0.106%/mob →
at ~4,800 mobs/hr, **≈ 5 fragments/hour**; at ~8,000 mobs/hr, **≈ 8.5/hour**. Korean player
reports bracket this (13 fragments in 1.5 h ≈ 8.7/hr; 40 over a 260→265 grind at 14-15k
mobs/hr; one report of 0 in an hour with full drop gear).

> **UNVERIFIED — Sol Erda *Energy* per hour.** No credible measurement found. The one figure
> in circulation (Vortex Gaming: 3 Faint per 2,000 mobs; fragments get 40% of drop rate,
> energy 2×) is **contradicted by the official April 2026 table**, which puts both at 50%.
> Treat that page as low confidence. Another widely-syndicated page (gg-pass.com) should be
> **discarded outright** — it cites nothing and invents a "20 fragments → 1 Sol Erda"
> exchange, a "+600 energy Grandis daily" and a "9 Sol Erda cap", none of which exist.

### 5.7 Other sources — and non-sources

| Source | GMS Heroic |
|---|---|
| Sol Erda Booster (Cash Shop) | 4 fragments/day + 20 per 6 claims, 30-day cycle, 1 per world. **Existence/price in GMS 2026 UNVERIFIED.** <https://support-maplestory.nexon.com/hc/en-us/articles/23806552739220-What-is-Sol-Erda-Booster> |
| MVP monthly reward | Changed in KMS CROWN (Dec 2025) from monthly Sol Erda to **weekly Sol Erda Energy scaled by MVP tier**. **Tier amounts NOT FOUND.** |
| **Daily quest for fragments** | **Does not exist.** The "Sol Erda Daily Improvements" thread that surfaces in search is a *player suggestion* (Nov 2024), not a patch note. |
| **Monster Park / Mu Lung Dojo** | **Not fragment sources** in GMS v270. Monster Park gives Commemorative Coins. (Monster Park Hands, which does give Sol Erda + fragments, is KMS Overdrive only.) |

### 5.8 Realistic weekly totals — GMS Heroic endgame

F2P, account-level, one bossing main plus Epic Dungeon mules:

| | Per week |
|---|---|
| **Sol Erda** | 9 (weekly quest) + 4 (3 Epic Dungeon clears, base) + ~4.8 (boss energy on the main) ≈ **17-18** |
| **Fragments** | 90 (weekly quest) + 165 (3 Epic Dungeons) + grinding ≈ **255 + ~5-9 per hour grinded** |

Maxing all three Epic Dungeon Sol Erda bonuses (120,000 Maple Points ≈ real money) takes the
dungeon component from 4 → **36**, i.e. ~50 Sol Erda/week — but the **cap of 20** makes that
unusable unless you spend it immediately.

**Derived** (arithmetic on the tables above; no community spreadsheet or measured GMS Heroic
dataset was findable):

| Target | Sol Erda needed | Fragments needed | Weeks (Sol Erda-limited, ~17/wk) |
|---|---|---|---|
| Every GMS node to Lv10 | 315 | 6,806 | ~19 |
| Every GMS node to Lv20 | 587 | 14,335 | ~35 |
| Every GMS node to Lv30 | 1,527 | 35,432 | **~90** |
| All 3 HEXA Stat cores to 20 (expected) | 30 | ~1,529 | ~2 |

> **Sol Erda is the binding constraint, not fragments.** At ~17 Sol Erda and ~255+ fragments
> per week from repeatables alone, the fragment:Sol Erda income ratio is roughly **15:1**,
> while the maxed-matrix cost ratio is **35,432 : 1,527 ≈ 23:1**. Grinding closes that gap
> (grinding yields fragments and energy, but energy is capped and fragments are not), which is
> why the community consensus is "grind for fragments, and never let Sol Erda sit at 20."

### 5.9 2025-2026 income changes, dated

| Date | Region | Change |
|---|---|---|
| 2024-12-19 | KMS | Sol Erda Conversion added (ver. 1.2.398). Epic Dungeons limited to 2 characters/week/Maple ID. |
| 2025-06-11 | **GMS** | Sol Erda Conversion arrives (Stargazer). |
| 2025-09-24 | KMS | **Epic Dungeon: Nightmare Paradise** added (ver. 1.2.407) — largest Sol Erda/fragment payout. |
| 2025-12 | KMS (CROWN) | MVP monthly Sol Erda → **weekly Sol Erda Energy** scaled by tier. |
| **2026-04-09** | KMS | Modulo-bias drop fix + **permanent 24% base item drop rate stat**; official table pins Sol Erda Energy / Faint Energy / Fragments at **50%** drop-rate application. |
| 2026-06-18 | KMS (Overdrive) | Sol Erda cap 20 → 25 (Lv275) / 30 (Lv290). Epic Dungeons → 5 stages, Selazar Coins replaced with 15 fragments, Quick/Express Pass −50%. Monster Park Hands yields Sol Erda + fragments. **None of this is in GMS.** |
| 2026-07/08 | **GMS** | v270 "Ride the Lightning" (= KMS CROWN). **No Sol Erda income change identified.** |
| **2026-09-09** | **GMS** | v271 — HEXA Common Nodes. No Sol Erda change announced in the preview. |

Sources: <https://orangemushroom.net/2024/12/19/kms-ver-1-2-398-maplestory-next-3rd-4th-mastery-cores/> ·
<https://orangemushroom.net/2025/09/24/kms-ver-1-2-407-epic-dungeon-nightmare-paradise/> ·
<https://orangemushroom.net/2026/04/10/maple-now-april-9-2026-3rd-common-core-probability-related-fixes/> ·
<https://orangemushroom.net/2026/06/14/2026-maplestory-summer-showcase-overdrive/> ·
<https://maplestorywiki.net/w/MapleStory:_Overdrive> · <https://maplestorywiki.net/w/MapleStory:_Crown> ·
<https://www.nexon.com/maplestory/news/update/42415/v-270-ride-the-lightning-patch-notes> ·
<https://www.nexon.com/maplestory/news/update/44705/v271-update-preview>

> **⚠️ OPEN — worth resolving before pricing anything in hours.** It is unclear whether GMS has
> received the **2026-04-09 modulo-bias fix and the permanent +24% base drop rate stat**. The
> wiki places it in KMS Post-CROWN and notes Post-CROWN QoL shipped with CROWN *"in all servers
> other than KoreaMS and GlobalMS"*, implying GMS gets it separately — likely v271. At 50%
> application, a flat +24% drop rate is **+12% to all fragment and energy grinding income**.
> Nexon's patch-note pages are JavaScript-rendered and returned no text to any fetch tool, so
> this could not be confirmed from the source.

---

## 6. Per-class specifics — the five priority classes

All per-class figures below come from the **raw wikitext** of each class's skill page
(`https://maplestorywiki.net/index.php?title=<Class>/Skills&action=raw`), which stores the
game's exact `a + b·x` formulas where `x` is the node level:
<https://maplestorywiki.net/w/Ren/Skills> ·
<https://maplestorywiki.net/w/Hero/Skills> ·
<https://maplestorywiki.net/w/Wind_Archer/Skills> ·
<https://maplestorywiki.net/w/Battle_Mage/Skills> ·
<https://maplestorywiki.net/w/Night_Walker/Skills>

**All five classes have both Origin and Ascent live in GMS** (Ascent arrived in GMS v269).
None of the five has a 3rd class skill core. **No KMS-only class HEXA node** was found for
any of them.

> **UNVERIFIED across all five classes:** nobody publishes an "Origin = X% of DPM" figure.
> Derive it from the damage lines below plus the 360 s cooldown, cross-checked against
> `docs/research/dpm-anchors.md`.

### 6.1 Ren

**Origin — Rising Azure Dragon: Divided Heavens** (skill id 161141500), MP 1500, CD 360 s

| Component | Formula | L1 | L10 | L20 | L30 |
|---|---|---|---|---|---|
| 58 shockwaves, 15 enemies, 12 hits | `750 + 25x` | 775% | 1000% | 1250% | 1500% |
| 27 world-cleaving strikes, 15 hits | `1050 + 35x` | 1085% | 1400% | 1750% | 2100% |

**Ascent — Rising Azure Dragon: Heartbound Verse** (161141506) — **unique 3-part sequence**,
not a single burst. Re-press within 30 s to fire the next technique; MP is per-technique
(200 / 300 / 500), not a flat 1,000.

| Technique | Formula | L1 | L10 | L20 | L30 |
|---|---|---|---|---|---|
| Falling Flower (7 hits, 30 s sword wind) | `435 + 88x` | 523% | 1315% | 2195% | 3075% |
| Climbing Serpent (10 hits, 15 divine waves) | `770 + 156x` | 926% | 2330% | 3890% | 5450% |
| Soaring Dragon (15 hits, 25 sword strikes) | `528 + 105x` | 633% | 1578% | 2628% | 3678% |

**Mastery cores (4 nodes; several bundle multiple skills):**

| Core | Skills upgraded | Formula | L30 |
|---|---|---|---|
| 1 | HEXA Plum Blossom Sword: Storm (req Storm Lv30+) | `202 + 3x` ×5, 8 enemies | 292% |
| 2 | HEXA Imugi Spirit Sword: Spirit Strike (req SS III Lv30+)<br>HEXA Second Imugi Spirit Sword: Serpent's Fang (Lv20+) | `820 + 13x` ×4, 35% proc<br>`235 + 4x` ×2, 62% proc [Final Attack] | 1210%<br>355% |
| 3 | HEXA Wish Unending<br>HEXA Final Imugi: Burrowing Earth<br>HEXA Final Imugi: Ravenous Spirit<br>HEXA Final Imugi: Years Uncounted | `840 + 18x` ×5, **+20% IED flat**<br>`850 + 10x` ×5 then `900 + 15x` ×7<br>`1350 + 30x` ×9<br>`400 + 7x` ×7 + burn `265 + 5x` ×3/5 s | 1380%<br>1150 / 1350%<br>2250%<br>610% / 415% |
| 4 | HEXA Second Plum Blossom: Raining Blossoms<br>HEXA Third Plum Blossom: Riotous Heart<br>HEXA Third Plum Blossom: Hearts United | `120 + 2x` ×3, Normal Enemy Dmg +`120 + 5x`%<br>`660 + 12x` ×4, 6 enemies<br>`246 + 4x` ×7, CD 30 s | 180% / +270%<br>1020%<br>366% |

**Enhancement cores** (all standard `10 + x + …` FD curve, no side effects):
Thousand Blossom Boost (500004205) · Soul Immeasurable Boost (500004206) ·
Dancing Annihilation Boost (500004207) · Blade of the Unbound Heart Boost (500004208).

**Quirks — and a correction to a common misconception:** Ren has **no Fox/Crane forms**
(that is a different class). Ren is a Rabbit Anima. Ren's real stance mechanic is the
**Unity** skill (1st job, MP 120, 1 s CD), which toggles *Third Plum Blossom Sword: Riotous
Heart* ↔ *Hearts United* — and the toggle propagates to their HEXA versions. Switching resets
the stored sphere count, and HEXA Riotous Heart cannot be used while HEXA Hearts United is on
cooldown. Ren also runs two weapon lines (Plum Blossom Sword vs. Imugi Spirit Sword); Imugi
Spirit Sword: Spirit Strike procs only off Dancing Annihilation and *founding* Plum Blossom
techniques. A Final Imugi rotation (Burrowing Earth → Ravenous Spirit → Years Uncounted →
Blade of the Unbound Heart) is driven by *Wish Unending* (15 s per technique, 20 s CD).

### 6.2 Hero

**Origin — Spirit Calibur** (1141500), MP 1200, CD 360 s, `[Swordsmanship]`-tagged.

| Component | Formula | L1 | L10 | L20 | L30 |
|---|---|---|---|---|---|
| 33 slashes, 15 enemies, 14 hits | `232 + 8x` | 240% | 312% | 392% | 472% |
| Final blow, 15 hits, 48 eruptions | `230 + 8x` | 238% | 310% | 390% | 470% |

**Ascent — Ultrasonic Slash** (1141502), MP 1000. 24 slashes, `1255 + 249x`% × 15 hits,
15 enemies → L1 1504% · L10 3745% · L20 6235% · **L30 8725%**.

**Mastery cores:**

| Core | Skills upgraded | Formula | L30 |
|---|---|---|---|
| 1 | HEXA Raging Blow (req Raging Blow Lv30+) | `350 + 6x` ×4; Enhanced (full combo) `421 + 10x` ×4 | 530% / 721% |
| 2 | HEXA Rising Rage (Lv1+) | `191 + 5x` ×8, CD 10 s; **passive: HEXA Raging Blow Dmg +`37 + 4x`% additive** | 341% / +157% |
| 3 | HEXA Beam Blade (Lv20+)<br>Rending Edge (new passive) | `328 + 6x` ×5; Normal Enemy Dmg +`200 + 3x`pp; Final Blade `522 + 8x` ×5<br>Sword Scar `121 + 4x` ×3, 1 per 5 direct hits, max 5 (10 in Instinctual Combo) | 508% / +290pp / 762%<br>241% |
| 4 | HEXA Cry Valhalla (Lv1+)<br>HEXA Puncture (Lv30+)<br>HEXA Final Attack (req Adv. Final Attack Lv30+) | `224 + 6x` ×5; buff ATT +50, Crit +30%, 30 s, CD 120<br>`430 + 7x` ×4 + DoT `176 + 3x`/2 s for 60 s<br>61% chance, `186 + 3x` ×3 | 404%<br>640% / 266%<br>276% |

**Enhancement cores** (all standard FD curve): Burning Soul Blade Boost (500004000) ·
Instinctual Combo Boost (500004001) · Worldreaver Boost (500004002) ·
Sword Illusion Boost (500004003).

**Quirks:** Rending Edge counts *Cry Valhalla, Tear in Space and Spirit Calibur* as 1 attack
per 2 landings (they would otherwise flood the scar counter) and doubles the scar cap to 10
during Instinctual Combo. **HEXA Puncture applies a damage-taken amp**: afflicted enemies take
**+26% damage from your attacks, +11% more when a party member attacks** — a multiplier on
your whole kit, not a damage line, and it is **level-independent** (arrives at node level 1).
The Rising Rage → Raging Blow additive cross-core (+157% at L30) couples those two nodes for
optimisation.

### 6.3 Wind Archer

**Origin — Mistral Spring** (13141500), MP 1200, CD 360 s. Leaves a **persistent Wind Spring
for 20 s** after the burst — not pure burst damage.

| Component | Formula | L1 | L10 | L20 | L30 |
|---|---|---|---|---|---|
| 13 Wind Blades, 15 enemies, 10 hits | `830 + 28x` | 858% | 1110% | 1390% | 1670% |
| Spirit Arrows (13), 5 hits | `660 + 22x` | 682% | 880% | 1100% | 1320% |
| Excited Spirit Arrows (5), 6 hits | `720 + 24x` | 744% | 960% | 1200% | 1440% |
| Strong Spirit Arrows (3), 7 hits | `645 + 21x` | 666% | 855% | 1065% | 1275% |

**Ascent — Elemental Tempest** (13141506), MP 1000. Tempest whirls 11×,
`1157 + 229x`% × 12 hits (L30 8027%); then Irena's bow fires 11×, `1184 + 234x`% × 15 hits
(L30 8204%).

**Mastery cores:**

| Core | Skills upgraded | Formula | L30 |
|---|---|---|---|
| 1 | HEXA Song of Heaven (Lv30+) | `555 + 18x`, 4 enemies | 1095% |
| 2 | HEXA Trifling Wind (req Trifling Wind III Lv30+) | `330 + 3x` (50% chance, max 5 souls); enhanced `435 + 8x` (20%) | 420% / 675% |
| 3 | HEXA Storm Bringer (Lv15+)<br>HEXA Fairy Spiral (Lv30+)<br>HEXA Monsoon (Lv1+) | `698 + 8x`, 45% chance, 200 s, **also increases Buff Duration**<br>`415 + 7x` ×5<br>`465 + 8x` ×12 + DoT `216 + 4x`/s for 30 s, 3 s invuln, CD 120 | 938%<br>625%<br>705% / 336% |
| 4 | HEXA Storm Whim (Lv1+)<br>Anemoi (new summon, GMS v260) | `590 + 10x`, 30% Strong Arrow chance, 30 s, CD 120<br>Appearance `923 + 27x` ×15; then `949 + 31x` ×10 at intervals, CD 60 | 890%<br>1733% / 1879% |

**Enhancement cores:** Howling Gale Boost (500004068) · Merciless Winds Boost (500004069) ·
**Gale Barrier Boost (500004070)** · Vortex Sphere Boost (500004071).

> **Quirk — Gale Barrier Boost is NOT pure FD.** It also extends the barrier's duration:
> `30 + ceil(x/3)` seconds → L1 31 s, L10 34 s, L20 37 s, L30 40 s. Model the duration
> extension separately from the FD term.

Also: HEXA Trifling Wind is **toggleable on/off**, always includes the highest-max-HP boss in
range, and is unaffected by attack reflection.

### 6.4 Battle Mage

**Origin — Crimson Pact** (32141500), MP 1500, CD 360 s

| Component | Formula | L1 | L10 | L20 | L30 |
|---|---|---|---|---|---|
| Dark spirit true power, 48 slashes, 11 hits | `902 + 29x` | 931% | 1192% | 1482% | 1772% |
| True appearance, 22 slashes, 14 hits | `1423 + 48x` | 1471% | 1903% | 2383% | 2863% |

**All attacks of Crimson Pact trigger Dark Shock's Dark Brand** and ignore attack reflection —
a real DPM consideration: the Origin feeds the Brand/Pentacle engine rather than being a
detached burst.

**Ascent — Duskbound Aura** (32141502), MP 1000. Aura pulses 14×, `900 + 180x`% × 14 hits
(L30 6300%); tenebrous explosion 11×, `1135 + 227x`% × 15 hits (L30 7945%).

**Mastery cores:**

| Core | Skills upgraded | Formula | L30 |
|---|---|---|---|
| 1 | HEXA Condemnation (req Grim Contract III Lv1+) | `510 + 14x` ×12; enhanced at 4 souls `815 + 22x` ×14 | 930% / 1475% |
| 2 | HEXA Finishing Blow (Lv30+)<br>HEXA Sweeping Staff (Lv1+) | `366 + 10x` ×6, Stun 92%/5 s, **Crit +26%, IED +22%**, passive Ambassador Scythe Dmg +50pp<br>`360 + 11x` ×5 + 4 explosions `315 + 8x` ×5, CD 13 s | 666%<br>690% / 555% |
| 3 | HEXA Dark Shock (Lv20+) | Teleport streak `170 + x` ×4, Normal Enemy Dmg +`110 + 2x`pp; Brand trigger `480 + 2x` ×4; Dark Pentacle `600 + 10x` ×6 per 15 triggers; Brand/Pentacle Boss Dmg +20%; Brand consumed after 30 attacks | 200% / +170pp / 540% / 900% |
| 4 | HEXA Dark Genesis (Lv30+) | `590 + 10x` ×8, 15 enemies, CD 30 s; Death Whip `160 + 3x` ×10 every 30 s; **passive [Final Attack] 80% chance `280 + 5x` Lightning; HEXA Dark Shock Dark Brand Dmg +`x`% additive** | 890% / 250% / 430% / +30% |

**Enhancement cores** (all standard FD curve): Aura Scythe Boost (500004112, labelled "Boosts
Ambassador Scythe") · Altar of Annihilation Boost (500004113) · Grim Harvest Boost (500004114) ·
Abyssal Lightning Boost (500004115).

**Aura interactions.** Battle Mage auras are mutually exclusive (Dark / Weakening / Hasty /
Draining / Blue) — casting one cancels the other. **Aura Scythe** (the V skill boosted by
500004112) *combines all auras*: while active you cannot use aura-type skills, party Battle
Mages are also locked out (except Weakening Aura), and your previous aura auto-reactivates
when it ends. Duration `19 + floor(x/5)` s, MP 100/s, CD 60 s; grants all aura effects plus
+`2x` Magic ATT; and it converts your Blow skills into Ambassador Scythe strikes
(300% ×12, +50% Crit, +50% IED).

> **HEXA Finishing Blow's +50pp Ambassador Scythe passive only pays out during Aura Scythe
> uptime** — a mastery core whose value is gated by a V-skill window. Weakening Aura's DEF
> debuff lingers 60 s after deactivation, so it survives an Aura Scythe window.

### 6.5 Night Walker

**Origin — Silence** (14141500), MP 1200, CD 360 s. Like Wind Archer's, this has a
**30-second lingering phase**, not pure burst.

| Component | Formula | L1 | L10 | L20 | L30 |
|---|---|---|---|---|---|
| 34 slashes, 15 enemies, 12 hits | `465 + 16x` | 481% | 625% | 785% | 945% |
| Shadow Throwing Stars, 12 hits | `450 + 15x` | 465% | 600% | 750% | 900% |

For 30 s after cast, hits morph the Shadow Bat into **3 huge Shadow Throwing Stars** that home
on the highest-max-HP boss, bounce up to 5 times, and **trigger Dark Elemental, Shadow Bat and
Ravenous Bat effects on every attack**. Star recreation CD 3 s. Unaffected by attack reflection.

**Ascent — Stygian Command** (14141503), MP 1000. Dark mantle 11×, `920 + 182x`% × 14 hits
(L30 6380%); darkness dominates 14×, `820 + 162x`% × 15 hits (L30 5680%).

**Mastery cores:**

| Core | Skills upgraded | Formula | L30 |
|---|---|---|---|
| 1 | HEXA Quintuple Star (Lv30+)<br>HEXA Quintuple Star [Jet Black Throwing Stars] | `276 + 4x` ×4 + `1104 + 16x` ×1, 3 enemies; Jet Black every 6 s<br>`276 + 4x` ×4 + Jet Black final `210 + 5x` ×7 to 8 enemies | 396% / 1584%<br>360% |
| 2 | HEXA Shadow Bat (req Ravenous Bat Lv20+, Bat Affinity III Lv30+)<br>HEXA Ravenous Bat (same reqs) | `900 + 10x`, 50% chance, bounces 3, max 2 bats, Normal Enemy Dmg +85%<br>`743 + 9x` ×2, **100% chance**, max 5 bats | 1200%<br>1013% |
| 3 | HEXA Dark Omen (Lv30+) | `400 + 14x` ×6 every 0.3 s for 7 s; **[Shadow Bat active] weakened pack** `325 + 7x` ×2 every 1.5 s for **60 s**; CD 60 | 820% / 535% |
| 4 | HEXA Dominion (Lv1+)<br>Abyssal Darkness (req Adaptive Darkness III Lv10+) | `1070 + 31x` ×10, invuln during cast, **FD +20%, Crit Rate +100% while active**, CD 120<br>Abyssal Strike `187 + 8x` ×6 per 12 Throwing Star hits (excl. Rapid Throw) on a Marked target | 2000%<br>427% |

**Enhancement cores — TWO of the four are non-standard:**

| Core | id | Formula |
|---|---|---|
| Shadow Spear Boost | 500004072 | Standard FD curve |
| **Greater Dark Servant / Shadow Slide Boost** | 500004073 | **`Greater Dark Servant Final Damage: 75 + x%`** (REPLACES, not adds) + Shadow Slide duration → `45 + ceil(x/3)` s |
| **Shadow Bite Boost** | 500004074 | Standard FD curve **+ cooldown reduced to `15 − ceil(x/6)` s** |
| Rapid Throw Boost | 500004075 | Standard FD curve |

> **The Greater Dark Servant node is the biggest modelling trap in the five classes.** Per
> <https://maplestorywiki.net/w/Greater_Dark_Servant>, the base V skill's shadow already deals
> "an additional `45 + x`% of Final Damage" per Throwing Star attack — **75% at V level 30**.
> The HEXA boost **overwrites that ratio** to `75 + x`%: L1 76% · L10 85% · L20 95% ·
> **L30 105%**. So the real gain from L1 → L30 is only **+29 pp** on the servant's damage
> ratio, *not* the +49 pp the standard curve would imply. Shadow Slide duration L1 46 s →
> L30 55 s. Shadow Bite CD: L1 14 s → L10 13 s → L20 11 s → L30 10 s.

**Throwing-star mechanics.** Bats gate on throwing-star hits (1 bat per 3 hits, 60 s
duration). HEXA Shadow Bat and HEXA Ravenous Bat are **mutually exclusive toggles** — breadth
(Shadow Bat: 50% proc, 3 bounces, +85% Normal Enemy Damage, max 2) vs. single target
(Ravenous Bat: 100% proc, 2 hits, max 5, boss-priority). HEXA Dark Omen behaves completely
differently by mode: a 7 s burst pack, or a 60 s weakened pack when Shadow Bat is active.
HEXA Dominion raises the bat cap by 3 and grants max Mark of Darkness stacks if you use a
Throwing Star skill within 20 s. Abyssal Darkness scales with Mark of Darkness stacks (max 5)
and explicitly **excludes Rapid Throw** from its 12-hit counter.

### 6.6 GMS availability of the newest nodes (all live as of 2026-09-06)

| Skill | Class | Introduced in GMS |
|---|---|---|
| Rising Azure Dragon: Heartbound Verse (Ascent) | Ren | v269 |
| HEXA Wish Unending | Ren | v269 |
| Ultrasonic Slash (Ascent) | Hero | v269 |
| Rending Edge | Hero | v267 |
| Elemental Tempest (Ascent) | Wind Archer | v269 |
| HEXA Storm Whim | Wind Archer | v267 |
| Anemoi | Wind Archer | v260 |
| Duskbound Aura (Ascent) | Battle Mage | v269 |
| Stygian Command (Ascent) | Night Walker | v269 |
| Abyssal Darkness | Night Walker | v268 |
| HEXA Dominion | Night Walker | v268 |

Source: the version tabs on each class's `maplestorywiki.net` skill page.

---

## 7. Does this reproduce the captured Ren data?

Captured from a live GMS Ren, **Lv272, 2026-09-06**.

### 7.1 Stat node I — displayed 20/20

| Line | Observed | Table says | ✓ |
|---|---|---|---|
| MAIN — Attack Power **+40**, LEVEL **6** | 40 | Main ATT Lv6 = 5 × 8 = **40** | ✓ |
| …Enhancement Rate | 20.00% | Main level 6 → **20%** | ✓ |
| ADD'L — Critical Damage **+2.80%**, LEVEL **8** | 2.80% | Add'l CD Lv8 = 0.35 × 8 = **2.80%** | ✓ |
| …Enhancement Rate | 40.00% | (100 − 20) / 2 = **40%** | ✓ |
| ADD'L — STR **+600**, LEVEL **6** | 600 | Add'l Main Stat Lv6 = 100 × 6 = **600** | ✓ |
| …Enhancement Rate | 40.00% | (100 − 20) / 2 = **40%** | ✓ |
| Node level | 20/20 | 6 + 8 + 6 = **20** | ✓ |

### 7.2 Stat node II — lines

| Line | Observed | Table says | ✓ |
|---|---|---|---|
| MAIN — Critical Damage **+0.70%**, LEVEL **2** | 0.70% | Main CD Lv2 = 0.35 × 2 = **0.70%** | ✓ |
| …Enhancement Rate | 35.00% | Main level 2 → **35%** | ✓ |
| ADD'L — Attack Power **+50**, LEVEL **10** | 50 | Add'l ATT Lv10 = 5 × 10 = **50** | ✓ |
| …Enhancement Rate | **0.00%** | line is at the cap of 10 → **0%** | ✓ |
| ADD'L — STR **+800**, LEVEL **8** | 800 | Add'l Main Stat Lv8 = 100 × 8 = **800** | ✓ |
| …Enhancement Rate | **65.00%** | other add'l capped → this one takes **100 − 35 = 65%** | ✓ |

The 0.00% / 65.00% pair is the strongest single confirmation in this document: it can only be
produced by the exact "one additional line at cap → the other is guaranteed the whole non-main
remainder" rule, with the main chance read off main level 2.

### 7.3 Cross-node totals

| Applied stat | Observed | Node I + Node II |
|---|---|---|
| Critical Damage | **3.50%** | 2.80 + 0.70 = 3.50 ✓ |
| Attack Power | **90** | 40 + 50 = 90 ✓ |
| STR | **1,400** | 600 + 800 = 1,400 ✓ |

**Node contributions are strictly linear/additive.** Confirmed.

### 7.4 Cross-node constraint check

- Node I main = **Attack Power**; Node II main = **Critical Damage** → no duplicate mains ✓
- **STR** appears as Additional **twice** (nodes I and II) → exactly at the "max 2 additional"
  cap ✓
- Critical Damage: main once + additional once. Attack Power: main once + additional once. ✓

Every documented constraint in §4.1 is satisfied by the observed build.

### 7.5 Materials and caps

| Observed | Confirms |
|---|---|
| "Sol Erda **01/20**" | Sol Erda cap = **20** ✓ (<https://maplestorywiki.net/w/HEXA_Matrix>) |
| "Sol Erda Fragment **1129**" (no denominator) | Fragments are **uncapped** ✓ |

### 7.6 HEXA Skill panel

Observed: Origin at **09**; eleven further nodes at 02, 09, 07, 01, 02, 09, 00, 01, 00, 00, 01;
"several locked".

**12 nodes total**, exactly matching the GMS 2026-09 roster in §1.2:
Origin + Ascent + 4 Mastery + 4 Enhancement + Sol Janus + Sol Hecate = **12** ✓
The "locked" entries are the **3rd common core** (GMS v271, not live on 2026-09-06) and the
**3rd class skill core** (KMS only). ✓

Note three nodes sit at **09** — one level below the level-10 milestone. That is exactly the
pattern §3.1 says an optimizer must surface: `9 → 10` on an enhancement core buys **+6 pp FD**
for 150 fragments (25 frags/pp), the second-cheapest damage in the whole system.

### 7.7 ⚠️ THE ONE THING THAT DOES NOT RECONCILE

**Stat node II is reported as displaying `06/20`, but its three lines are Lv2 + Lv10 + Lv8 = 20.**

Under the sum rule (§4.2) — confirmed by both the wiki text and the Korean planner's source
code — that node must display **20/20**. Its own enhancement rates *prove* the lines are
really 2/10/8: an Additional line cannot read 0.00% unless it is at the cap of 10, and 65.00%
is only producible as `100 − 35` with the *other* additional line capped.

Possible explanations, in descending order of likelihood:

1. **Transcription slip** in the capture — the node is actually at 20/20 and "06" belongs to a
   different UI element.
2. **The "saved node" mechanic** (§4.8). A level-20 node can be saved while you begin
   enhancing a fresh node in the same slot. If slot II is *applying* a saved 20/20 node while a
   new one sits at 06/20, both readings could be on screen at once — the applied stats from the
   saved node, the "06/20" counter from the in-progress one.
3. A GMS-only UI change not reflected in any source I could reach.

**Everything else in the capture — all six line values, all six enhancement rates, all three
applied-stat totals, the cross-node constraints, the node count and the Sol Erda cap —
reproduces exactly.** I am therefore confident the *model* is right and the `06/20` reading is
a display or capture artefact. Flagged in §8 as verification item #1.

---

## 8. Gaps / verify in-game

Ordered by how much they matter to the calculator.

| # | Gap | Why it matters | How to close it |
|---|---|---|---|
| 1 | **Stat node II showing `06/20` with 20 line-levels** (§7.7) | If the sum rule is wrong, the whole HEXA Stat cost model is wrong | Re-screenshot the HEXA Stat panel; check whether a *saved node* exists on slot II |
| 2 | **Sol Hecate per-level effect table** | 208 Sol Erda / 6,268 fragments of bossing damage with no known curve — currently un-priceable | Read the in-game skill description at several levels; or KMS skill data |
| 3 | **Common core #3 per-level effects** (v271) | Same, 137 Erda / 4,035 frags | Wait for GMS v271 patch notes (late Sept 2026) |
| 4 | **Is boost-node FD multiplicative with the V skill's own FD, or additive?** (§3.1) | Changes boost-core ranking against everything else | In-game damage-range test at two boost levels |
| 5 | **Are Origin's Lv10/20/30 IED+50 / Boss+50 milestones skill-local or character-wide?** (§3.2) | If character-wide it is a top-3 upgrade in the game; if skill-local it is worth roughly 1/6 of that | Check the character stat window with Origin at 9 vs 10 |
| 6 | **Is HEXA Stat "Main Stat" affected by %STR / %All Stat?** (§4.5) | Changes the STR line's value by 2-3× on a geared character | Compare the stat window before/after a node level with known %STR |
| 7 | **Fragment cost at main level 8 — 40 or 30?** (§4.6 CONFLICT) | ~5% of a node's expected cost | Level a node with main at 8 and watch the counter |
| 8 | **Sol Janus intermediate levels (2-8, 11-18, 21-28)** | Only matters if you model grinding throughput | Read the in-game skill at intermediate levels |
| 9 | **Ascent character-level unlock gate** | Affects the "when can I start" projection | Check the node tooltip below Lv265 |
| 10 | **"Save node" cost** (§4.8) | Affects reroll economics | Try it in-game |
| 11 | **Origin skill's share of total DPM per class** | The biggest single input to "Origin or an enhancement core?" | Not published anywhere reachable. Derive from the §6 damage lines + 360 s CD, cross-checked against `docs/research/dpm-anchors.md` |
| 12 | **Optimal HEXA Stat reroll policy** | Real fragment spend can be 2-4× the naive 323 | Simulate against the §4.6 model once #1 and #7 are settled |
| 13 | **Does GMS have the 2026-04-09 modulo fix + permanent +24% base drop rate?** (§5.9) | +12% to all grinding fragment/energy income | Read the GMS v271 patch notes when published |
| 14 | **Sol Erda *Energy* per hour while grinding** (§5.6) | Turns "hours grinded" into Sol Erda; currently only the fragment rate is measured | Measure it, or find a KMS dataset. The one circulating figure is contradicted by the official drop-rate table |
| 15 | **MVP tier → weekly Sol Erda Energy amounts** (KMS CROWN) | Only matters for paying accounts | KMS patch note / in-game |
| 16 | **Any daily cap on Erda Conversion** (§5.2) | Bounds the mule-transfer escape valve | Try converting repeatedly |
| 17 | **GMS 5,000-kill weekly requirement** (§5.3) | Single-sourced (maplestorywiki only) | Read the quest in-game |
| 18 | **Sol Erda Booster cash item — still in GMS 2026? price?** (§5.7) | 4 fragments/day is small but free-standing | Cash Shop |

Sources that were **unreachable** during this research and should be retried:
- `namu.wiki` / `en.namu.wiki` — HTTP 403 to both WebFetch and curl. Namu's
  `HEXA 매트릭스` and `HEXA 매트릭스/공용 코어` pages are the most likely place to find the
  Sol Hecate and common-core-3 per-level tables.
- `grandislibrary.com` — class skill pages returned 404.
- `maplestorywiki.net/w/Sol_Janus` — 403 to direct fetch (the data above came from the search
  index, so its intermediate levels are unverified).
- `nexon.com/maplestory/news/update/...` — GMS patch-note pages are JavaScript-rendered and
  return title-only text to every fetch tool tried (patchbot.io mirrors likewise). This is why
  gap #13 is open.
- `reddit.com` — not fetchable from this environment, so no community measurement of GMS
  Heroic grinding income could be checked.

---

## 9. Implementation notes

What `src/lib/data/hexa.ts` should export. Deliberately mirrors the shape of
`src/lib/data/hyperstats.ts`.

### Node types and costs

```ts
export type HexaNodeType =
  | 'origin' | 'ascent' | 'skill3'
  | 'mastery' | 'enhancement'
  | 'commonA'   // Sol Janus, Sol Hecate
  | 'commonB';  // 3rd common core (v271)

export interface HexaCost { solErda: number; fragments: number; }

/** Raw per-level arrays straight from Module:SolErdaCostTable/costData. */
export const HEXA_BASE_COST: Record<'general' | 'generalB' | 'commonA' | 'commonB',
  { solErda: readonly number[]; fragments: readonly number[] }>;

/** Cost to go from level `from` to level `to` on one node. */
export function hexaCost(type: HexaNodeType, from: number, to: number): HexaCost;

/** Cumulative cost 0 → level. */
export function hexaCumulativeCost(type: HexaNodeType, level: number): HexaCost;

export const HEXA_NODE_MAX_LEVEL = 30;
export const HEXA_TOTAL_TO_MAX: Record<HexaNodeType, HexaCost>;
export const HEXA_NODE_AVAILABLE_IN_GMS: Record<HexaNodeType, boolean>; // skill3: false
```

- `origin` must special-case level 1 as free (`skipFirst`).
- `mastery` = `general` × 0.5 and `enhancement` = `general` × 0.75, with **`Math.ceil` applied
  per cell**, not to the total. Precompute the arrays; do not multiply at call time.

### Milestone helper — the optimizer needs this

```ts
/** Next level ≥ current that carries a milestone bonus (10, 20, 30), or null. */
export function nextHexaMilestone(level: number): 10 | 20 | 30 | null;

/** Cost of pushing a node from `level` to its next milestone. */
export function hexaCostToNextMilestone(
  type: HexaNodeType, level: number
): { targetLevel: number; cost: HexaCost } | null;
```

Without this, a greedy per-level optimizer mis-ranks every node parked at 9, 19 or 29 — which
is exactly where the captured Ren character has three of its nodes.

### Effects

```ts
/** Boost/enhancement core Final Damage %. 10 + lvl + 5·[≥10] + 5·[≥20] + 10·[≥30]. */
export function hexaEnhancementFinalDamage(level: number): number;
export const HEXA_ENHANCEMENT_FD: readonly number[]; // index 0 = level 0 → 0

/** Origin milestone bonuses, cumulative. LIKELY SKILL-LOCAL — see gap #5. */
export const HEXA_ORIGIN_MILESTONES: { level: 10 | 20 | 30; ied: number; boss: number }[];

/** Ascent: base IED 60 / boss 40 / crit 100, plus milestones → 100 / 60 / 100 at Lv30. */
export const HEXA_ASCENT_BASE: { ied: 60; boss: 40; critRate: 100 };
export const HEXA_ASCENT_MILESTONES: { level: 10 | 20 | 30; ied: number; boss: number }[];

/**
 * Ascent damage must be computed on a STRIPPED multiplier stack: no hats, no rings,
 * no conditional passives, no active skill effects, no elemental properties,
 * no <30min consumables — and it triggers no Final Attack effects.
 */
export const ASCENT_EXCLUDED_MULTIPLIERS: readonly string[];

/** Mastery cores and class skill damage lines are LINEAR (a + b·level), NO milestones. */
export interface HexaDamageLine {
  skill: string; base: number; perLevel: number; hits: number; maxTargets?: number;
}
export const HEXA_CLASS_NODES: Record<ClassKey, {
  origin: { name: string; cooldown: 360; lines: HexaDamageLine[] };
  ascent: { name: string; lines: HexaDamageLine[] };
  mastery: { name: string; lines: HexaDamageLine[]; flatRiders?: Record<string, number> }[];
  enhancement: { name: string; boosts: string; curve: 'standard' | 'custom' }[];
}>;
```

Encode the three **non-standard enhancement cores** explicitly rather than as exceptions in
prose: Wind Archer's Gale Barrier Boost (duration `30 + ceil(x/3)`), Night Walker's Greater
Dark Servant Boost (**replaces** the servant's FD ratio with `75 + x`%) and Shadow Bite Boost
(cooldown `15 − ceil(x/6)`).

### HEXA Stat

```ts
export type HexaStatKey =
  | 'mainStat' | 'attack' | 'damage' | 'bossDamage' | 'ignoreDefense' | 'criticalDamage';

export const HEXA_STAT_BASE: Record<HexaStatKey, number>;
// { criticalDamage: 0.35, bossDamage: 1, ignoreDefense: 1, damage: 0.75, attack: 5, mainStat: 100 }

export const HEXA_STAT_MAIN_MULT = [1, 2, 3, 4, 6, 8, 10, 13, 16, 20] as const; // index = level-1
export const HEXA_STAT_ADDITIONAL_MULT = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10] as const;

export function hexaStatValue(
  key: HexaStatKey, level: number, line: 'main' | 'additional'
): number;

/** Xenon → All Stat ×0.48; Demon Avenger → Max HP ×21. Applies to the mainStat line only. */
export const HEXA_STAT_MAINSTAT_OVERRIDES: Record<'xenon' | 'demonAvenger', number>;

export const HEXA_STAT_NODE_MAX_LEVEL = 20;   // = sum of the three line levels
export const HEXA_STAT_LINE_MAX_LEVEL = 10;

export const HEXA_STAT_CORES = [
  { index: 1, minCharLevel: 260, unlock: { solErda: 5,  fragments: 10  }, resetMesos: 10_000_000 },
  { index: 2, minCharLevel: 265, unlock: { solErda: 10, fragments: 200 }, resetMesos: 20_000_000 },
  { index: 3, minCharLevel: 270, unlock: { solErda: 15, fragments: 350 }, resetMesos: 35_000_000 },
] as const;
export const HEXA_STAT_CHANGE_STATS_MESOS = 100_000_000;
export const HEXA_STAT_RESET_MIN_NODE_LEVEL = 10;

/** Indexed by the MAIN line's current level (0-10). */
export const HEXA_STAT_MAIN_CHANCE  = [35, 35, 35, 20, 20, 20, 20, 15, 10, 5, 0] as const;
export const HEXA_STAT_ENHANCE_COST = [10, 10, 10, 20, 20, 20, 20, 30, 40, 50, 50] as const;

/** Full roll distribution given the three current line levels. */
export function hexaStatRollChances(
  main: number, add1: number, add2: number
): { main: number; add1: number; add2: number };

/** Exact DP: expected fragments to take a node from (m, a1, a2) to node level 20. */
export function hexaStatExpectedFragments(main: number, add1: number, add2: number): number;
// hexaStatExpectedFragments(0, 0, 0) ≈ 323
```

### Income model

```ts
export const SOL_ERDA_ENERGY_PER_SOL_ERDA = 1000;
export const SOL_ERDA_CAP_GMS = 20;               // KMS Overdrive raises this; GMS has not
export const SOL_ERDA_FRAGMENT_CAP = null;        // uncapped

/** Erda Conversion: 1 Sol Erda → 30 Faint Sol Erda Energy (10 each) = 300 energy. */
export const ERDA_CONVERSION_ENERGY_RETURNED = 300;   // a 70% loss
export const ERDA_CONVERSION_LOSS_RATIO = 0.7;

export const WEEKLY_ERDA_REQUEST = { solErda: 9, fragments: 90, killsRequired: 5000 } as const;

export const EPIC_DUNGEONS = [
  { key: 'highMountain',      minLevel: 260, solErdaBase: 1, fragments: 40, mp5x: 7_500,  mp9x: 30_000 },
  { key: 'anglerCompany',     minLevel: 270, solErdaBase: 1, fragments: 55, mp5x: 10_000, mp9x: 40_000 },
  { key: 'nightmareParadise', minLevel: 280, solErdaBase: 2, fragments: 70, mp5x: 12_500, mp9x: 50_000 },
] as const;
export const EPIC_DUNGEON_CLEARS_PER_WEEK_PER_ACCOUNT = 3;

/** Per-player Sol Erda ENERGY per boss clear — see §5.5. Feeds off bosses.ts keys. */
export const BOSS_SOL_ERDA_ENERGY: Record<BossKey, number>;

/** Grinding: effective = 0.000425 * (1 + 0.5 * dropRateStat). See §5.6. */
export const FRAGMENT_BASE_DROP_RATE = 0.000425;
export const SOL_ERDA_DROP_RATE_APPLICATION = 0.5;
export function fragmentsPerHour(mobsPerHour: number, dropRatePercent: number): number;
```

**The income model must clamp at the cap.** A "days to afford" projection that integrates
boss + grinding energy without clamping to `SOL_ERDA_CAP_GMS` will overstate income for any
character not actively spending. Energy earned at the cap is destroyed, not banked.

### Constraint validator

The UI will need:

```ts
/**
 * No two nodes share a Main stat; a stat may be ADDITIONAL on at most 2 nodes;
 * no stat appears twice on one node.
 */
export function validateHexaStatBuild(nodes: HexaStatNode[]): string[];
```

### Test fixtures

Encode the captured Ren character (§7) as the spec fixture — it exercises the main table, the
additional table, the roll-chance rule including both the capped-line (0%) and guaranteed-line
(65%) branches, cross-node summation, and the constraint validator:

```ts
export const REN_2026_09_06_FIXTURE = {
  charLevel: 272,
  solErda: 1, solErdaCap: 20, fragments: 1129,
  statNodes: [
    { main: { stat: 'attack',         level: 6,  value: 40,   rate: 20 },
      add: [{ stat: 'criticalDamage', level: 8,  value: 2.8,  rate: 40 },
            { stat: 'mainStat',       level: 6,  value: 600,  rate: 40 }] },
    { main: { stat: 'criticalDamage', level: 2,  value: 0.7,  rate: 35 },
      add: [{ stat: 'attack',         level: 10, value: 50,   rate: 0  },
            { stat: 'mainStat',       level: 8,  value: 800,  rate: 65 }] },
  ],
  applied: { criticalDamage: 3.5, attack: 90, mainStat: 1400 },
} as const;
```

Also assert the cost tables against these anchors (all independently sourced in §2):

| Assertion | Value |
|---|---|
| `hexaCumulativeCost('origin', 30)` | 145 Sol Erda / 4,400 fragments |
| `hexaCumulativeCost('ascent', 30)` | 150 / 4,500 |
| `hexaCumulativeCost('mastery', 30)` | 83 / 2,252 |
| `hexaCumulativeCost('enhancement', 30)` | 123 / 3,383 |
| `hexaCumulativeCost('commonA', 30)` | 208 / 6,268 |
| `hexaCumulativeCost('commonB', 30)` | 137 / 4,035 |
| `hexaCumulativeCost('skill3', 30)` | 117 / 3,442 |
| `hexaCost('enhancement', 9, 10)` | 8 / 150 |
| `hexaEnhancementFinalDamage(1 / 10 / 20 / 30)` | 11 / 25 / 40 / 60 |
