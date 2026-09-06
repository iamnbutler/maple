# V Matrix / 5th Job Node System — GMS research (as of 2026-09-06)

Scope: **GMS, Heroic (Reboot) world.** Priority classes: Ren, Hero, Wind Archer, Battle Mage,
Night Walker. Written to be transcribable into a TypeScript data module in the style of
`src/lib/data/hyperstats.ts`.

> **READ THIS FIRST.** The V Matrix was **completely reworked** and the rework is **already live
> in GMS** (v269, 2026-06-17). Node slots, Matrix Points, random node drops, boost-node "trios",
> Node Shards, node crafting and node disassembly **no longer exist**. Almost every V Matrix guide
> you can find on the open web — including Grandis Library's prose, the "Perfect Boost Nodes for
> Every Class" articles, and `docs/research/formulas.md` line 249 — describes the _old_ system.
> Section 0 and section 8 explain exactly what changed.

---

## Table of contents

- [0. Version context — what changed 2025–2026](#0-version-context--what-changed-20252026)
- [1. Node taxonomy](#1-node-taxonomy)
- [2. Boost Node math](#2-boost-node-math)
- [3. Job Nodes (Skill Nodes / V skills)](#3-job-nodes-skill-nodes--v-skills)
- [4. Common Nodes](#4-common-nodes)
- [5. V Points and the node economy](#5-v-points-and-the-node-economy)
- [6. Special Nodes](#6-special-nodes)
- [7. Per-class specifics](#7-per-class-specifics)
- [8. What the OLD system was (for migration / stale-source detection)](#8-what-the-old-system-was-for-migration--stale-source-detection)
- [9. Gaps / things to verify in-game](#9-gaps--things-to-verify-in-game)
- [10. Implementation notes](#10-implementation-notes)

---

## 0. Version context — what changed 2025–2026

| Update                           | Server  | Date                                 | V Matrix relevance                                             |
| -------------------------------- | ------- | ------------------------------------ | -------------------------------------------------------------- |
| 2025 Winter Showcase — **CROWN** | KMS     | 2025-12-14                           | Announced the V Matrix rework                                  |
| **CROWN pt.1, ver. 1.2.410**     | KMS     | 2025-12-18 (notes posted 2025-12-28) | **V Matrix Reorganization ships in KMS**                       |
| CROWN pt.2, ver. 1.2.411         | KMS     | 2026-01-17                           | V Matrix tooltip bugfixes only                                 |
| Maple Attack, ver. 1.2.414       | KMS     | 2026-04-16                           | **HEXA** 3rd Common Core (6th job — _not_ V Matrix)            |
| **v.269 "Ride the Lightning"**   | **GMS** | **2026-06-17**                       | **V Matrix rework lands in GMS**                               |
| v.270 "Ride the Lightning" pt.2  | GMS     | 2026-07-22                           | Jupiter, Geardock, Astra, Kinesis remaster. No V Matrix change |
| v.271 (preview 2026-09-02)       | GMS     | not live as of 2026-09-06            | **HEXA** Common Nodes — 6th job, _not_ V Matrix                |

Sources:
<https://orangemushroom.net/2025/12/14/2025-maplestory-winter-showcase-crown/> ·
<https://orangemushroom.net/2025/12/28/kms-ver-1-2-410-maplestory-crown-kinesis-remaster/> ·
<https://maplestorywiki.net/w/V_Matrix> (Update History section, page last edited 2026-08-11) ·
<https://www.nexon.com/maplestory/news/update/41138/v-269-ride-the-lightning-patch-notes>

The MapleStory Wiki update-history entry, verbatim:

> **update GMS 269 June 17 2026 (Ride the Lightning):** The V Matrix received an overhaul.
> Nodestones now grant V Points to upgrade Nodes. Each job receives a fixed amount of Nodes to upgrade.

And from the KMS CROWN notes, verbatim:

> The V Matrix system has been reorganized so that you can acquire V Points through Core Gemstones
> and use them to enhance your V Cores. … V Cores have been reclassified as Job Cores, Enhancement
> Cores, Common Cores, and Special Cores.
>
> **The slot enhancement and slot expansion based on character level features have been removed.**

Node crafting, Node Shards (KMS: V Core Fragments) and disassembly were discontinued at the same
time. See §8 for the one-time migration conversion table.

### KMS ↔ GMS terminology map

| KMS (Korean) | KMS (English, Orange Mushroom) | GMS                                                 |
| ------------ | ------------------------------ | --------------------------------------------------- |
| 코어 젬스톤  | Core Gemstone                  | **Nodestone**                                       |
| 코어         | Core                           | **Node**                                            |
| 직업 코어    | Job Core                       | **Job Node** (also called "Skill Node" / "V skill") |
| 강화 코어    | Enhancement Core               | **Boost Node**                                      |
| 공용 코어    | Common Core                    | **Common Node**                                     |
| 특수 코어    | Special Core                   | **Special Node**                                    |
| V 코어 조각  | V Core Fragment                | Node Shard _(removed)_                              |

Sources: <https://maplestory.nexon.com/Guide/N23GameInformation/Articles/404> (official KMS guide,
"코어 활성화 이전, 먼저 V 포인트를 사용해 코어 활성화 필요") ·
<https://maplestorywiki.net/w/Nodestone> ("Nodestones, also known as Core Gemstones in non-GMS servers")

> **No GMS/KMS mechanical divergence found** as of 2026-09. Both use the same 9,999 V Point cap, the
> same 10,000,000 meso reset, the same 14-V-Point Special Node unlock, and the same cost curves.
> The only GMS-only item spotted is the **Samsara Nodestone** (2 V Points), which does not appear in
> the KMS table.

---

## 1. Node taxonomy

Four categories. Unlocked at the **5th Job Advancement** (character level 200, quest chain
_Call of the Erdas → Blessings of the Goddess → Record of Power → [5th Job] A Greater Power_).

| Node type        | Count per character                                 | Level range        | Starting level                | Levelling currency | Gates                                                     |
| ---------------- | --------------------------------------------------- | ------------------ | ----------------------------- | ------------------ | --------------------------------------------------------- |
| **Job Node**     | **4** (fixed, granted)                              | 1 – **30**         | 1 (free)                      | V Points           | must be **Lv25** to unlock the matching HEXA Boost Node   |
| **Boost Node**   | **6** (fixed, granted)                              | 0 – **60**         | 0                             | V Points           | must be **Lv40** to unlock the matching HEXA Mastery Node |
| **Common Node**  | ~19 for most classes (class-dependent)              | 0 – **30**         | 0 (must be unlocked for 7 VP) | V Points           | —                                                         |
| **Special Node** | 1 equipped at a time, chosen from a fixed catalogue | n/a (time-limited) | n/a                           | V Points           | —                                                         |

Verbatim from <https://maplestorywiki.net/w/V_Matrix>:

> **Job Nodes**: These are specific skills for each job. … Each player will receive 4 job nodes.
> Their maximum Level is 30, and they must be Level 25 to unlock their corresponding HEXA Boost Nodes.
>
> **Boost Nodes**: These enhance the final damage of 1st, 2nd, 3rd, 4th, and Hyper Skills that deal
> damage. Boost Nodes also grant additional boosts at Level 20 and Level 40. … Each player will
> receive 6 boost nodes, with each one enhancing between 1 and 4 individual skills. Their maximum
> Level is 60, and they must be Level 40 to unlock their corresponding HEXA Mastery Nodes.
>
> **Common Nodes**: These are skill nodes that are shared between all jobs, as well as jobs within
> the same class type, faction, and other categories. Their maximum Level is 30.
>
> **Special Nodes**: These grant a special buff when assigned to its special slot and after
> achieving certain conditions … Only one Special Node can be active at any time.

Corroborated by the KMS CROWN notes ("Common Core: When activated, you can acquire skills common to
multiple jobs. They can be enhanced up to level 30") and by the official KMS guide page
<https://maplestory.nexon.com/Guide/N23GameInformation/Articles/404>, which lists exactly the same
four categories.

### There are no node slots

Slots and Matrix Points were **removed** in the rework. Every node in a character's roster is
permanently visible and can be levelled; nodes never compete for slots, only for V Points. Nothing
in the V Matrix is gated by character level past 200.

> **On "Common Nodes are new".** They are not — common nodes have existed since GMS v179
> (2016-12-14: _"Common nodes (Rope Lift, Blink, Erda Nova, Will of Erda, Decent skills) were
> introduced"_). What is new is the **Common Nodes tab** in the reworked UI, where they are all
> visible and levelled directly with V Points instead of being random Nodestone drops that competed
> for slots.

> **V Matrix Common Nodes ≠ HEXA Common Nodes.** The GMS v271 preview announcement about
> "HEXA common nodes" refers to a **6th job** system paid for with **Sol Erda / Sol Erda Fragments**,
> not V Points. KMS lineage: 1st common core = Sol Janus, 2nd = Sol Hecate (CROWN, Dec 2025),
> 3rd = ver. 1.2.414 (2026-04-16, HEXA upgrades of the 5th-job branch/faction common skills, e.g.
> "Blitz Shield VI", "Lotus Flower VI"). Do not model these in the V Matrix module.
> Source: <https://orangemushroom.net/2026/04/16/kms-ver-1-2-414-maple-attack-3rd-common-core/>

---

## 2. Boost Node math

### 2.1 The headline number

A Boost Node raises the **effective skill level** of the skills it boosts. Each such level grants a
**Final Damage** increase whose size is **per-skill**, not a global constant.

For a normal 4th-job / Hyper attacking skill the coefficient is **2% Final Damage per level**, so a
maxed (Lv60) Boost Node gives:

```
output * (1 + 0.02 * 60) = output * 2.20
```

This confirms the figure already in `docs/research/formulas.md` line 249 — **but only for 2%-tier
skills.** See §2.2, which is the correction.

Corroboration (two independent sources):

- namu.wiki _V 매트릭스_: "강화 코어의 만렙은 60이며 대부분 주력 스킬의 계수는 **60레벨이 0레벨의 2.20배**로 고정되어 있습니다"
  ("the boost core's max level is 60, and for most main skills the coefficient is fixed such that
  level 60 is 2.20× level 0") — <https://namu.wiki/w/V%20매트릭스>
- Korean community summary: "강화코어 만렙 60에서 **레벨당 2%씩** 데미지가 증가하여 60레벨에 **120% 데미지가 증가**합니다"
- <https://maplestorywiki.net/w/V_Matrix>

### 2.2 **The FD-per-level coefficient varies by the boosted skill's job tier**

This is the single most important correction in this document. Each `<Class>/Skills` page on
MapleStory Wiki carries a table headed _"Final Damage Increase per level | Skill | Level 20 Effect |
Level 40 Effect"_. Reading it across all five priority classes gives a broadly consistent pattern:

| Job tier of the boosted skill | FD per Boost Node level | Total FD at Lv60 | Multiplier at Lv60 |
| ----------------------------- | ----------------------- | ---------------- | ------------------ |
| **1st job**                   | **7%**                  | +420%            | ×5.20              |
| **2nd job**                   | **5%**                  | +300%            | ×4.00              |
| **3rd job**                   | **3%**                  | +180%            | ×2.80              |
| **4th job / Hyper**           | **2%**                  | +120%            | **×2.20**          |

Source: the per-class V Enhancements tables, e.g.
<https://maplestorywiki.net/w/Hero/Skills>, <https://maplestorywiki.net/w/Ren/Skills>,
<https://maplestorywiki.net/w/Wind_Archer/Skills>, <https://maplestorywiki.net/w/Battle_Mage/Skills>,
<https://maplestorywiki.net/w/Night_Walker/Skills> (all "V Enhancements" sections; pages last edited
Aug 2026, i.e. post-v269).

Worked examples straight from the wiki tables (raw values, no interpretation):

| Class                               | Skill                                                    | Job tier | FD/level |
| ----------------------------------- | -------------------------------------------------------- | -------- | -------- |
| Night Walker                        | Lucky Seven Boost                                        | 1st      | **7%**   |
| Night Walker                        | Soundless Rush Boost                                     | 1st      | **7%**   |
| Battle Mage                         | Triple Blow Boost                                        | 1st      | **7%**   |
| Wind Archer                         | Breeze Arrow Boost                                       | 1st      | **7%**   |
| Ren                                 | Plum Blossom Sword: Slice Boost                          | 1st      | **7%**   |
| Ren                                 | Plum Blossom Sword: Strike Boost                         | 2nd      | **5%**   |
| Battle Mage                         | Quad Blow Boost                                          | 2nd      | **5%**   |
| Wind Archer                         | Gust Shot Boost / Spiraling Vortex Boost                 | 2nd      | **5%**   |
| Night Walker                        | Triple Throw Boost                                       | 2nd      | **5%**   |
| Hero                                | Flash Blade Boost                                        | 2nd      | **5%**   |
| Battle Mage                         | Quintuple Blow Boost                                     | 3rd      | **3%**   |
| Wind Archer                         | Pinpoint Pierce Boost                                    | 3rd      | **3%**   |
| Night Walker                        | Quad Star Boost / Shadow Spark Boost                     | 3rd      | **3%**   |
| Hero                                | Intrepid Slash / Leap Attack / Rush Boost                | 3rd      | **3%**   |
| Ren                                 | Plum Blossom Sword: Slash Boost / Raining Blossoms Boost | 3rd      | **3%**   |
| everything else in all five classes | 4th / Hyper                                              | **2%**   |

> **UNVERIFIED (rule vs. coincidence) — and there are confirmed exceptions.** The 7 / 5 / 3 / 2 tier
> mapping is inferred from five classes' tables plus the known job tier of each named skill. I found
> **no source that states the rule explicitly**, and several lower-tier skills are priced at 2%
> anyway (Ren's Spirit Strike, Wind Archer's Trifling Wind, Battle Mage's Condemnation / Dark Chain /
> Battle Burst / Dark Shock, Night Walker's Shadow Bat). The wiki's **per-skill** value is
> authoritative; the tier rule is my generalisation. **Encode the per-skill values, not the rule.**

> **CONFLICT — Hero.** Hero's table has no 7% row at all. Hero's lowest-tier boosted skill is
> Flash Blade at 5%. Either Hero's 1st-job attack has no boost node, or Flash Blade is Hero's 1st
> job skill and Hero breaks the tier rule. **Verify in-game.**

Practically: the 2% figure is the one that matters for the calculator, because for all five
priority classes **every skill in the bossing rotation is priced at 2%**. The 7% / 5% / 3% skills
are all levelling/mobility skills that community priority lists rate as OTHER (§7).

### 2.3 Level 20 and Level 40 milestone effects

On top of the per-level FD, each Boost Node grants a milestone effect at Lv20 and Lv40. These apply
**only while the specific boosted skill is being used**, and they stack additively with the
corresponding Hyper Passive and HEXA Matrix enhancements.

| Milestone    | Effect                                                                            | Notes                                                                                            |
| ------------ | --------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------ |
| **Level 20** | one of: **Max Targets +1**, **Critical Rate +5%**, **Normal Monster Damage +10%** | which one is fixed per skill                                                                     |
| **Level 40** | **Ignored Enemy Defense +20%**                                                    | **universal — every single row in all five classes' tables reads `Ignored Enemy Defense: +20%`** |

Sources: <https://maplestorywiki.net/w/V_Matrix> ("Most Boost Nodes give either Mob Count +1,
+5% Critical Rate, or +10% Damage against normal monsters at Level 20, and +20% Ignored Enemy
Defense at Level 40") and the per-class V Enhancements tables above, which give the exact assignment
per skill (transcribed in §7).

**IED note for the calculator.** The +20% IED at Lv40 is _per boosted skill_, not a global stat.
It stacks multiplicatively on the complement like all other IED (see `formulas.md` §1.8):
`1 - [(1 - totalIED) * (1 - 0.20)]`. Because every skill grants it, in practice any character with
all bossing boost nodes at Lv40+ has a flat +20% IED source active during their rotation.

### 2.4 How boost-node FD composes with other FD

Boost Node FD is ordinary **Final Damage** and multiplies with every other FD source
(`formulas.md` §1.6):

```
newFD = (1 + oldFD) * (1 + boostNodeFD) - 1
```

Because it is skill-scoped, a DPM model must apply it **per skill in the rotation**, not once
globally. A skill not covered by any boost node gets no multiplier.

---

## 3. Job Nodes (Skill Nodes / V skills)

- **4 per class**, granted automatically at 5th Job Advancement (the _Record of Power_ quest gives
  "all 4 of their main Skill Nodes based on their job, and 5 regular Nodestone").
- Start at **level 1**, max **level 30**.
- Scaling is **linear in node level** for every job node I checked — damage %, duration, and passive
  effects are all `base + k*x` or `base + floor(x/n)` forms. Nothing is stepped except the
  `floor()`-based fields.
- **Lv25 is the HEXA gate** for the matching HEXA Boost Node, and this correspondence is 1:1 by
  index (job node N ↔ HEXA Boost node N). This is why community sites flag job nodes 1–4 as PRIMARY.

Example, verbatim from <https://maplestorywiki.net/w/Night_Walker/Skills> — _Shadow Bite_, Master
Level 30, a job node whose **passive is pure Final Damage**:

| Node level | Damage    | Boss damage | Passive                |
| ---------- | --------- | ----------- | ---------------------- |
| 1          | 468% × 14 | 1281%       | **Final Damage: +10%** |
| 30         | 990% × 14 | 2673%       | **Final Damage: +20%** |

i.e. `damage% = 450 + 18x`, `bossDamage% = 1233 + 48x`, `passiveFD% = 10 + floor(x/3)`.

Per-class job node lists and scaling formulas are in §7.

> The V Matrix page's node lists show a handful of classes with **5** entries under "Job Nodes"
> (Zero, Illium, Evan) or with slash-separated names. Night Walker is the case relevant here — see
> §7.5. Treat "4 job nodes" as the rule with per-class exceptions.

---

## 4. Common Nodes

### 4.1 Structure — why the count is ~19

Common nodes are tiered by class taxonomy. A character sees only the ones matching its
class / branch / sub-branch / faction:

| Tier                                                  | Count  | Example                                                        |
| ----------------------------------------------------- | ------ | -------------------------------------------------------------- |
| All Classes                                           | 13     | Rope Lift, Blink, Erda Shower, the Decent skills               |
| All Classes, item-gated                               | 2      | True Arachnid Reflection, Solar Crest                          |
| Branch (Warrior / Magician / Bowman / Thief / Pirate) | 2      | Weapon Aura, Impenetrable Skin                                 |
| Sub-branch (e.g. Explorer Warrior)                    | 0 or 1 | Blitz Shield                                                   |
| Faction                                               | 1 or 2 | Grandis Goddess's Blessing; Phalanx Charge + Cygnus's Blessing |

For the five priority classes this arithmetic gives:

| Class                             | 13 all | +2 gated | branch                         | sub-branch   | faction                                                | **total** |
| --------------------------------- | ------ | -------- | ------------------------------ | ------------ | ------------------------------------------------------ | --------- |
| **Ren** (Anima Warrior)           | 13     | 2        | Weapon Aura, Impenetrable Skin | —            | Grandis Goddess's Blessing, Lotus Flower               | **19**    |
| **Hero** (Explorer Warrior)       | 13     | 2        | Weapon Aura, Impenetrable Skin | Blitz Shield | Maple World Goddess's Blessing                         | **19**    |
| **Wind Archer** (Cygnus Bowman)   | 13     | 2        | Guided Arrow, Vicious Shot     | —            | Phalanx Charge, Empress/Transcendent Cygnus's Blessing | **19**    |
| **Battle Mage** (Resistance Mage) | 13     | 2        | Mana Overload, Ethereal Form   | —            | Maple World Goddess's Blessing, Resistance Infantry    | **19**    |
| **Night Walker** (Cygnus Thief)   | 13     | 2        | Venom Burst, Last Resort       | —            | Phalanx Charge, Empress/Transcendent Cygnus's Blessing | **19**    |

19 for all five, which matches the screenshot's ~19-node Common Nodes tab for Ren.
Full taxonomy source: <https://maplestorywiki.net/w/V_Matrix> (the "Common and Job Nodes" tabber).

### 4.2 All-Classes common nodes — values at Lv1 and Lv30

Every one of these is **max level 30**. Values are taken from the level tables on each skill's own
wiki page; the "GMS vNNN" stamp in each page's infobox is given so you can judge staleness.

| Node                                   | Wiki stamp | Lv1                                                                       | Lv30                                                                     | Damage-relevant?   |
| -------------------------------------- | ---------- | ------------------------------------------------------------------------- | ------------------------------------------------------------------------ | ------------------ |
| **Rope Lift**                          | v264       | passive **All Stats +1**                                                  | passive **All Stats +30**                                                | yes — stat         |
| **Blink**                              | v270       | passive **ATT & Magic ATT +1**                                            | passive **ATT & Magic ATT +30**                                          | yes — stat         |
| **Decent Sharp Eyes**                  | v264       | Crit Rate +10%, Crit Dmg +8%, 183 s / 180 s CD; passive All Stats +1      | Crit Rate +10%, Crit Dmg +8%, 270 s / 180 s CD; passive **All Stats +6** | yes — crit         |
| **Decent Advanced Blessing**           | v264       | ATT +20, MATT +20, DEF +425, MaxHP +475, MaxMP +475; passive All Stats +1 | **identical active values**; passive **All Stats +6**                    | yes — ATT          |
| **Decent Speed Infusion**              | v264       | Attack Speed +1 level; passive All Stats +1                               | Attack Speed +1 level; passive **All Stats +6**                          | yes — attack speed |
| **Decent Hyper Body**                  | v264       | MaxHP/MP +40%, 183 s; passive All Stats +1                                | MaxHP/MP +40%, 270 s; passive **All Stats +6**                           | survivability      |
| **Decent Combat Orders**               | v264       | All Skills +1, 183 s; passive Status Resist +1                            | All Skills +1, 270 s; passive **Status Resist +6**                       | indirect           |
| **Decent Mystic Door**                 | v264       | portal 32 s; passive All Stats +1                                         | portal 90 s; passive **All Stats +6**                                    | stat only          |
| **Decent Holy Fountain**               | v264       | 31 s, 5% HP × 5 uses, 89 s CD; passive All Stats +1                       | 60 s, 35% HP × 20 uses, 60 s CD; passive **All Stats +6**                | stat only          |
| **Decent Holy Symbol**                 | v264       | EXP +20%, Drop +14%, 183 s                                                | **EXP +35%, Drop +24%**, 270 s                                           | farming            |
| **Erda Nova**                          | v263       | 156% × 5, bind 10 s, CD 216 s                                             | **330% × 5**, bind 10 s, **CD 100 s**                                    | yes — bind uptime  |
| **Erda Shower**                        | v263       | 465% × 6, 15 mobs, CD 40 s                                                | **900% × 6**¹                                                            | yes — attack       |
| **Will of Erda**                       | v256       | CD 475 s                                                                  | **CD 330 s**                                                             | i-frame            |
| **True Arachnid Reflection** _(gated)_ | v261       | 468% × 15 + summon                                                        | **990% × 15**, spider legs **385% × 8**                                  | yes — attack       |
| **Solar Crest** _(gated)_              | v261       | Mitra's Fire 780% × 12, Emblem 208% × 6                                   | **1650% × 12**, Emblem **440% × 6** (single-target **605%**)             | yes — attack       |

¹ Erda Shower's damage is `450 + 15x`% per hit. Lv25 = 825%, Lv30 = 900%.
Sources: one page per node under `https://maplestorywiki.net/w/<Node_Name>` — e.g.
<https://maplestorywiki.net/w/Erda_Shower>, <https://maplestorywiki.net/w/Rope_Lift>,
<https://maplestorywiki.net/w/Blink>, <https://maplestorywiki.net/w/Decent_Sharp_Eyes>,
<https://maplestorywiki.net/w/Decent_Holy_Symbol>, <https://maplestorywiki.net/w/Erda_Nova>,
<https://maplestorywiki.net/w/True_Arachnid_Reflection>, <https://maplestorywiki.net/w/Solar_Crest>.

**Two distinct passive-scaling shapes.** This matters for the data module:

| Shape           | Formula                                                          | Nodes using it                                                                                          |
| --------------- | ---------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------- |
| Linear          | `value = x`                                                      | Rope Lift (All Stats), Blink (ATT & MATT), Impenetrable Skin (STR +x, MaxHP +50x), Last Resort (ATT +x) |
| Stepped every 5 | `value = ceil(x / 5)`, i.e. 1/1/1/1/1, 2/2/2/2/2, … 6 at Lv26–30 | all six **Decent** skills' passives                                                                     |

Verified level-by-level from the wiki tables (Decent Hyper Body: +1 at Lv1–5, +2 at Lv6–10, +3 at
Lv11–15, +4 at Lv16–20, +5 at Lv21–25, +6 at Lv26–30).

> **Flag: Decent Advanced Blessing's active values do not scale.** Lv1 and Lv30 both read
> ATT +20 / MATT +20 / DEF +425 / MaxHP +475 / MaxMP +475. Only its passive All Stat scales.
> This looks like it could be a wiki template artefact — **verify in-game before encoding.**

### 4.3 Branch common nodes (2 per branch)

| Branch                     | Node                    | Lv1                                                                         | Lv30                                                      | Damage-relevant? |
| -------------------------- | ----------------------- | --------------------------------------------------------------------------- | --------------------------------------------------------- | ---------------- |
| **Warrior** (Hero, Ren)    | **Weapon Aura**         | **FD +1%**, IED 10%, 72 s, CD 120 s; Aura Wave 520% × 6                     | **FD +6%**, **IED 16%**, 130 s; Aura Wave 1100% × 6       | major            |
| Warrior                    | **Impenetrable Skin**   | Status Resist +51, 15 s; passive STR +1, MaxHP +50                          | Status Resist +80, 18 s; passive **STR +30, MaxHP +1500** | yes — stat       |
| **Magician** (Battle Mage) | **Mana Overload**       | **FD +5%** for 2% MaxMP, toggle, CD 59 s                                    | **FD +8%**, CD 30 s                                       | major            |
| Magician                   | **Ethereal Form**       | 3 s invuln, CD 75 s                                                         | 3 s invuln, **CD 60 s**                                   | survivability    |
| **Bowman** (Wind Archer)   | **Guided Arrow**        | 416% single target, **Normal Mob Dmg +20%**                                 | **880%**, Normal Mob Dmg +20%                             | yes              |
| Bowman                     | **Vicious Shot**        | crit rate may exceed 100%; **Crit Dmg += 21% of Crit Rate**, 30 s, CD 120 s | **Crit Dmg += 50% of Crit Rate**                          | major            |
| **Thief** (Night Walker)   | **Venom Burst**         | poison 390% × 2, 30 s                                                       | **825% × 2**                                              | yes              |
| Thief                      | **Last Resort**         | **FD +7% / +18%** (2 stages), 30 s, CD 75 s; passive ATT +1                 | **FD +10% / +24%**, CD 60 s; passive **ATT +30**          | major            |
| Pirate                     | Loaded Dice / Overdrive | —                                                                           | _(not fetched — no priority class)_                       | —                |

Sources: <https://maplestorywiki.net/w/Weapon_Aura> (v267), <https://maplestorywiki.net/w/Impenetrable_Skin>
(v267), <https://maplestorywiki.net/w/Mana_Overload> (v267), <https://maplestorywiki.net/w/Ethereal_Form>
(v267), <https://maplestorywiki.net/w/Guided_Arrow> (v267), <https://maplestorywiki.net/w/Vicious_Shot>
(v263), <https://maplestorywiki.net/w/Venom_Burst> (v267), <https://maplestorywiki.net/w/Last_Resort> (v267).

**Vicious Shot is unusually strong** and worth calling out: at Lv30 it converts 50% of your Critical
Rate into Critical Damage for 30 s on a 120 s cooldown, and lets Critical Rate exceed 100%. A Wind
Archer sitting at, say, 130% nominal crit rate gains +65% Crit Damage during the window. The
calculator must model this as a **buff-window** effect, not a permanent stat.

### 4.4 Sub-branch and faction common nodes

| Node                               | Applies to                                                                   | Lv1                                                                                                                                                     | Lv30                                                               | Damage-relevant? |
| ---------------------------------- | ---------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------ | ---------------- |
| **Blitz Shield**                   | Explorer Warrior (Hero)                                                      | shield 15% MaxHP, detonate 520% × 5, CD 15 s                                                                                                            | shield 21% MaxHP, detonate **1100% × 5**                           | minor            |
| **Maple World Goddess's Blessing** | Hero, Battle Mage (+ all Explorers, HoM, Resistance non-Demon, Jianghu, Sia) | Maple Warrior bonus **+110%**, **Damage +5%**, 60 s, CD 120 s                                                                                           | Maple Warrior bonus **+400%**, **Damage +20%**                     | major            |
| **Phalanx Charge**                 | Cygnus (Wind Archer, Night Walker)                                           | 702% up to 82 hits over 15 s, CD 60 s                                                                                                                   | **1485% up to 140 hits**                                           | yes              |
| **Empress Cygnus's Blessing**      | Cygnus, pre-quest                                                            | **Damage +22%**, 45 s, CD 120 s                                                                                                                         | **Damage +61%**                                                    | major            |
| **Transcendent Cygnus's Blessing** | Cygnus, after `[Moonbridge] Cygnus Awakens` — **replaces** the above         | **Damage +33%**, Damage Taken −5%, 45 s                                                                                                                 | **Damage +72%**, Damage Taken −5%                                  | major            |
| **Resistance Infantry**            | Battle Mage (+ Wild Hunter, Mechanic, Xenon, Blaster)                        | squad 335% × 9, 12 mobs, 15 s, CD 60 s                                                                                                                  | **683% × 9**                                                       | yes              |
| **Grandis Goddess's Blessing**     | Ren (+ all Nova / Flora / Anima)                                             | **Anima: Damage +11%**; _Ren-specific:_ Final Plum Blossom Swords, Final Imugi Spirit Swords, Rising Azure Dragon **Final Damage +15%**; 40 s, CD 120 s | **Anima: Damage +40%**; Ren FD bonus stays **+15%** at every level | major            |
| **Lotus Flower**                   | Ren (+ Lara, Hoyoung)                                                        | revive summon, 1655 s duration, CD 400 s                                                                                                                | 1800 s duration, CD −1400 s on revive                              | survivability    |

Sources: <https://maplestorywiki.net/w/Blitz_Shield> (v263),
<https://maplestorywiki.net/w/Maple_World_Goddess%27s_Blessing> (v255),
<https://maplestorywiki.net/w/Phalanx_Charge> (v267),
<https://maplestorywiki.net/w/Empress_Cygnus%27s_Blessing> (v267),
<https://maplestorywiki.net/w/Transcendent_Cygnus%27s_Blessing> (v267),
<https://maplestorywiki.net/w/Resistance_Infantry> (v267),
<https://maplestorywiki.net/w/Grandis_Goddess%27s_Blessing> (v268),
<https://maplestorywiki.net/w/Lotus_Flower> (v267).

> **Note on Grandis Goddess's Blessing.** The `%Damage` value is **per faction sub-group**, not
> shared: at Lv1 the Nova line reads "Damage: +6%" while the Anima line reads "Damage: +11%"; at
> Lv30 Nova is +35% and Anima is **+40%**. Use the **Anima** column for Ren. The Ren-specific
> "Final Damage +15%" on Final Plum Blossom / Final Imugi / Rising Azure Dragon is **flat at every
> node level** — it does not scale with the node.

### 4.5 Common node damage summary for the five classes

The damage-relevant common nodes a calculator must model, per class:

| Class            | %Damage buff                                                       | Final Damage                                                                       | Crit                                                               | Flat ATT / stat                                                                                                                                     |
| ---------------- | ------------------------------------------------------------------ | ---------------------------------------------------------------------------------- | ------------------------------------------------------------------ | --------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Ren**          | Grandis Goddess's Blessing **+40%**                                | Grandis Goddess's Blessing **+15% FD** (Ren skills, flat) · Weapon Aura **+6% FD** | Decent Sharp Eyes +10% rate / +8% dmg                              | Blink **ATT +30** · Rope Lift **All Stats +30** · Impenetrable Skin **STR +30** · Decent Advanced Blessing ATT +20 · Decent Sharp Eyes All Stats +6 |
| **Hero**         | Maple World Goddess's Blessing **+20%** (+ Maple Warrior bonus ×4) | Weapon Aura **+6% FD**, IED 16%                                                    | Decent Sharp Eyes                                                  | same core four                                                                                                                                      |
| **Wind Archer**  | Transcendent Cygnus's Blessing **+72%**                            | —                                                                                  | **Vicious Shot: Crit Dmg += 50% of Crit Rate** · Decent Sharp Eyes | Blink, Rope Lift, Decent AB                                                                                                                         |
| **Battle Mage**  | Maple World Goddess's Blessing **+20%**                            | Mana Overload **+8% FD**                                                           | Decent Sharp Eyes                                                  | Blink, Rope Lift, Decent AB                                                                                                                         |
| **Night Walker** | Transcendent Cygnus's Blessing **+72%**                            | Last Resort **+10% / +24% FD**                                                     | Decent Sharp Eyes                                                  | **Last Resort ATT +30** · Blink ATT +30 · Rope Lift All Stats +30                                                                                   |

---

## 5. V Points and the node economy

### 5.1 V Points are **not** granted by character level

**There is no "V points by level" table.** V Points come _only_ from consuming Nodestones. This is
the biggest structural change from the old system, where node slots and Matrix Points were both
level-gated. Post-rework, character level past 200 gives you nothing in the V Matrix.

### 5.2 Nodestone → V Point conversion

| Item (GMS)             | V Points | Notes                                                  |
| ---------------------- | -------- | ------------------------------------------------------ |
| Nodestone              | **1**    |                                                        |
| Amazing Nodestone      | **2**    |                                                        |
| Samsara Nodestone      | **2**    | GMS-only listing                                       |
| Experience Nodestone   | **3**    |                                                        |
| Mirror World Nodestone | **5**    | first use instead unlocks **True Arachnid Reflection** |
| Mitra's Nodestone      | **15**   | first use instead unlocks **Solar Crest**              |

- V Point cap: **9,999**.
- Reset all V Point allocation: **10,000,000 mesos**. Points are recycled, not destroyed.
- Reverse conversion: **2 V Points → 1 Nodestone** (transferable within world, time-limited).
  This and Special Node unlocks/extensions are the only ways to _destroy_ V Points.
- Nodestones require **Lv200+ and 5th Job Advancement** to use; cannot be used at the 9,999 cap.

Sources: <https://maplestorywiki.net/w/V_Matrix> · <https://maplestorywiki.net/w/Nodestone>

**Heroic (Reboot) specifics:** _"When picked up from monsters, Nodestones are tradeable in
Interactive / Non-Reboot Worlds and tradable within the same world in Heroic / Non-Reboot Worlds."_
Drop sources are Arcane River and **Western Grandis / Lv260+ Grandis** field monsters, plus the
Vanishing Journey weekly `[Weekly Quest] Diligent Research Reward`, plus events (event copies are
untradable). Source: <https://maplestorywiki.net/w/Nodestone>.

> **UNVERIFIED — drop rates.** I found no sourced Nodestone drop rate per monster or per hour for
> Heroic world. The wiki's "Dropped by" list is prefixed _"KMS, MSEA, and GMS Interactive /
> Non-Reboot Worlds only"_, which implies a different (possibly narrower) drop table in GMS Heroic
> that I could not locate. **This is the biggest remaining gap for a time-to-progress model.**

### 5.3 Cost curves — exact, from the wiki's own data module

These come from `Module:VMatrixCostTable/costData`, the Lua table that generates the wiki's cost
tables — i.e. the same numbers, straight from source:

```lua
return {
    ['skillCore'] = {
        ['vPointCost'] = {7,4,4,4,4,4,4,4,4,4,6,6,6,6,6,6,6,6,6,6,9,9,9,9,9,9,9,9,9,9}
    },
    ['enforceCore'] = {
        ['vPointCost'] = {1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,
                          1,1,1,1,1,1,1,1,1,1,2,2,2,2,2,2,2,2,2,2,2,2,2,2,2,2,2,2,2,2}
    }
}
```

Source: <https://maplestorywiki.net/index.php?title=Module:VMatrixCostTable/costData&action=raw>

Rendered:

**Job Nodes / Common Nodes / True Arachnid Reflection / Solar Crest** (30 levels)

| Level range | Cost per level | Cumulative at top of range |
| ----------- | -------------- | -------------------------- |
| 0 → 1       | **7**          | 7                          |
| 1 → 10      | **4**          | 43                         |
| 10 → 20     | **6**          | 103                        |
| 20 → 30     | **9**          | **193**                    |

**Boost Nodes** (60 levels)

| Level range | Cost per level | Cumulative at top of range |
| ----------- | -------------- | -------------------------- |
| 0 → 40      | **1**          | 40                         |
| 40 → 60     | **2**          | **80**                     |

**Totals to max, and starting level after a reset:**

| Node type                             | Level after reset                      | Total V Points to max |
| ------------------------------------- | -------------------------------------- | --------------------- |
| Job Node                              | **1** (the 7-point unlock is pre-paid) | **186**               |
| Boost Node                            | 0                                      | **80**                |
| Common Node                           | 0                                      | **193**               |
| True Arachnid Reflection, Solar Crest | **1**                                  | **186**               |

Source: <https://maplestorywiki.net/w/V_Matrix> (§V Points). Independently corroborated by the
Korean community write-up at <https://www.inven.co.kr/board/maple/5974/5993140>, which gives
"Open: 7 points / Lv1–9: 4 each / Lv10–19: 6 each / Lv20–29: 9 each / **total 193**" and
"Boost Cores: 1 point through Lv39, 2 points Lv40–59, **total 80**".

### 5.4 Budget for a fully-maxed character

| Bucket                                       | Count | Each | Subtotal                     |
| -------------------------------------------- | ----- | ---- | ---------------------------- |
| Job Nodes                                    | 4     | 186  | **744**                      |
| Boost Nodes                                  | 6     | 80   | **480**                      |
| True Arachnid Reflection + Solar Crest       | 2     | 186  | **372**                      |
| Common Nodes (all-classes, non-gated)        | 13    | 193  | **2,509**                    |
| Common Nodes (branch + sub-branch + faction) | 3–4   | 193  | **579 – 772**                |
| **Total**                                    |       |      | **≈ 4,684 – 4,877 V Points** |

Because plain Nodestone = 1 V Point, that is also roughly the Nodestone count.

**Key optimizer insight:** Common Nodes are by far the largest sink (~3,100–3,300 of ~4,800 points,
i.e. ~65%) yet contribute far less damage per point than Boost Nodes. Boost Nodes are the cheapest
damage in the entire system: **1 V Point buys 2% Final Damage** on a 4th-job skill for the first 40
levels, and 2 V Points buys 2% thereafter.

Suggested marginal-value ordering (matches the community consensus in §7):

1. Boost nodes 1–4 → **Lv40** (40 VP each = 160 VP; unlocks the HEXA Mastery gate and the +20% IED)
2. Job nodes → **Lv25** (141 VP each = 564 VP; unlocks the HEXA Boost gate)
3. Boost nodes 1–4 → **Lv60** (40 more VP each)
4. Job nodes 25 → 30; then common nodes by damage value; boost nodes 5–6 last

### 5.5 What no longer exists

- **Node Shards / "Node Fragments"** — removed. Converted one-time at 17.62 shards → 1 V Point.
- **Node crafting** (70 shards for a boost node, 500 for a custom trio, 35 for a Nodestone) — removed.
- **Node disassembly** — removed.
- **Node feeding / node EXP** — removed; levelling is a flat V Point purchase, fully deterministic,
  zero RNG.
- **Node slots and slot enhancement** — removed.
- **Matrix Points** — removed.

> **UNVERIFIED items from the brief.** I found **no source at all** for "Powerful Nodestone",
> "Perfect Node Stone" or "Selective Node Stone" in GMS, KMS patch notes, or the current/archived
> wiki. These may be MSEA-only, event-only, or misremembered names. Do not encode them.

---

## 6. Special Nodes

Special Nodes are **conditional combat buffs**, not levelled nodes. One equipped at a time,
time-limited, purchased with V Points. The `09.14.26` on the node in the screenshot is its
**expiry date** — that is exactly how the system reads.

| Mechanic                       | Value                                                                       |
| ------------------------------ | --------------------------------------------------------------------------- |
| Unlock an expired Special Node | **14 V Points** → **168 hours (7 days)**                                    |
| Extend                         | **1.6 V Points per day, rounded up**, up to **48 V Points** for **30 days** |
| Simultaneously active          | **1**                                                                       |
| Reset behaviour                | Special Nodes are **not** refunded by the 10M meso V Point reset            |

Source: <https://maplestorywiki.net/w/V_Matrix>

> **CONFLICT — extension cost.** MapleStory Wiki says _"up to 48 V Points (1.6 Points per day,
> rounded up), to extend the Node for up to 30 days."_ The Korean Inven write-up
> <https://www.inven.co.kr/board/maple/5974/5993140> says extension is **27 points for 30 days**.
> The 48-point figure is internally consistent with the stated 1.6/day rate (1.6 × 30 = 48), so I
> lean toward 48, but **verify in-game.**

### 6.1 Catalogue — damage-relevant Special Nodes

| Node                     | Effect                                                                    |
| ------------------------ | ------------------------------------------------------------------------- |
| **Boss Slayer I**        | 0.1% chance on attack → **Boss Damage +50%** for 10 s / once per 30 s     |
| **Boss Slayer II**       | on skill use → **Boss Damage +50%** for 10 s / once per 120 s             |
| **Boss Slayer III**      | on defeating 30 enemies → **Boss Damage +50%** for 10 s / once per 10 s   |
| **Defense Smash I**      | attack same monster 800× → **IED +100%** for 10 s / once per 60 s         |
| **Defense Smash II**     | on skill use → **IED +100%** for 10 s / once per 120 s                    |
| **Quick Reload**         | on skill use → **IED +100%** for 10 s / once per 60 s                     |
| **Lethal Strike I**      | every 1000th attack → **Crit Rate +100%** for 10 s / once per 60 s        |
| **Just One I**           | attack same monster 800× → **Crit Rate +100%** for 10 s / once per 60 s   |
| **Fatal Strike I**       | on attack → **Damage +100%** for 4 s, every 30 s                          |
| **Counterattack I**      | every 20th hit → **Damage +100%** for 2 s / once per 30 s                 |
| **Frenzied Strength I**  | defeat 120 enemies → **Damage +20%** for 10 s / once per 60 s             |
| **Grit I**               | every 100th hit → all skill cooldowns **−25%** / once per 30 s            |
| **Relentless Attack**    | Combo Kills multiple of 50 → all skill cooldowns **−20%** / once per 75 s |
| **Comeback**             | on death → skill cooldowns **−30%** / once per 60 s                       |
| **Character Building I** | every 100th hit → **EXP +50%** for 20 s / once per 30 s                   |
| **Rune-EXP I**           | on rune activation → **EXP +50%** for 20 s / once per 30 s                |
| **Withstand**            | every 100th hit → invincibility 10 s / once per 30 s                      |
| **Auto Recovery**        | on skill use → full HP restore, every 30 s                                |

Most counted effects note: _"Count is reset when the player fails to land enough attacks within
30 seconds."_

**Event-only ("Mapae Nodestone") Special Nodes** — 7 days each, **cannot be extended**, trigger 30 s
after equipping:

| Node                | Effect                                                   |
| ------------------- | -------------------------------------------------------- |
| Inspector Power I   | every 30 s on attack → **Boss Damage +40%** for 20 s     |
| Inspector Power II  | every 30 s on attack → **Ignored Defense +40%** for 20 s |
| Inspector Power III | every 60 s on attack → all skill cooldowns **−20%**      |
| Luck Power          | every 30 s on attack → **Item Drop Rate +20%** for 20 s  |
| Wealth Power        | every 30 s on attack → **Mesos Obtained +20%** for 20 s  |
| EXP Power           | every 30 s on attack → **EXP +50%** for 20 s             |

Source: <https://maplestorywiki.net/w/V_Matrix> (Special Nodes tabber)

**Do Special Nodes matter for damage?** Yes, but they are hard to model. The best bossing choice is
**Defense Smash II** or **Quick Reload** (`IED +100%` for 10 s on a 120 s / 60 s cycle — since IED
stacks on the complement, +100% IED means _full_ defense ignore for the window) or a **Boss Slayer**
variant. For a DPM model they should be represented as a low-uptime conditional multiplier, e.g.
`10s / 60s = 16.7% uptime` for Quick Reload, and probably exposed as a user toggle rather than
baked in.

> **UNVERIFIED.** The CROWN notes say 7 old Special Cores were deleted (Comeback I, Auto Recovery I,
> Lucky Recovery I, Rune-Frenzied, Consecutive Strike I, Lethal Strike II, Rune-Blessed) and that
> "Auto Recovery II" → "Auto Recovery" and "Comeback II" → "Comeback". The wiki list above appears
> post-rework (it has the renamed forms and none of the deleted ones) but I could not confirm the
> list is exhaustive for GMS v270.

---

## 7. Per-class specifics

**Trios no longer exist.** Every character gets the same 6 fixed Boost Nodes covering 1–4 skills
each and the same 4 Job Nodes. There is no acquisition decision left — only a **levelling order**
decision.

Two sources agree on the groupings for four of five classes:

1. MapleStory Wiki `<Class>/Skills` → "V Enhancements" section (last edited Aug 2026, post-v269)
2. Grandis Library class pages → "Skills Boosted by Each Nodes", with a PRIMARY / SECONDARY / OTHER
   priority classification credited to each class's Class Doc / Discord.

Grandis Library's legend, verbatim: _PRIMARY = "Boost Nodes that unlock a 6th Job HEXA Mastery and
are skills that are frequently used"; SECONDARY = "don't unlock a HEXA Mastery but are still used";
OTHER = "do not need to be upgraded or has least priority."_

**Structural rule (verified across all five classes):** boost node index N ↔ HEXA Mastery node
index N (gate: Lv40); job node index N ↔ HEXA Boost node index N (gate: Lv25).

### 7.1 Ren — Anima **Warrior**

STR primary / DEX secondary, Sword + Imugi Gem. KMS release 2025-06 (Assemble, ver. 1.2.404);
**GMS release v.264 "Every Little Thing Every Precious Thing", 2025-11-12.** Ren has a normal
V Matrix. Common node categories: All / Warrior / Grandis / Anima.
Source: <https://maplestorywiki.net/w/Ren>, <https://maplestorywiki.net/w/Ren/Skills>

**Job Nodes** (all Master Level 30; `x` = node level):

| #   | Skill                                                | Scaling                                                                                                                         |
| --- | ---------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------- |
| 1   | Final Plum Blossom Sword: Thousand Blossom Flurry    | 30 s buff, CD 120 s. Blossom Strike `130+5x`% × 3, 12 mobs. Plum Blossoms `230+9x`% × 3 (20 / 40 / 65 at 30 / 70 / 125 strikes) |
| 2   | Soul Immeasurable                                    | 20 s buff, CD 120 s. Divine Strike `270+11x`% × 2. Divine Serpent (at 90 strikes) 9 slashes, `900+35x`% × 12, 15 mobs           |
| 3   | Final Plum Blossom Sword: Dancing Annihilation       | key-down max 5 s, `480+19x`% × 6, 15 mobs, −50% damage taken while held, CD 120 s                                               |
| 4   | Final Imugi Spirit Sword: Blade of the Unbound Heart | `540+22x`% × 10 + 12 spirit swords `690+27x`% × 3, **+20% IED**, CD 1 s                                                         |

**Boost Nodes:**

| #   | Skills (job tier)                                                                                            | FD/level     | Lv20 effect             | Priority |
| --- | ------------------------------------------------------------------------------------------------------------ | ------------ | ----------------------- | -------- |
| 1   | Plum Blossom Sword: Storm (4th)                                                                              | 2%           | Max Targets +1          | PRIMARY  |
| 2   | Imugi Spirit Sword: Spirit Strike (2nd)¹ · Second Imugi Spirit Sword: Serpent's Fang (4th)                   | 2% / 2%      | — / Normal Mob Dmg +10% | PRIMARY  |
| 3   | Final Imugi Spirit Sword: Burrowing Earth / Ravenous Spirit / Years Uncounted (**one combined boost**)       | 2%           | Max Targets +1          | PRIMARY  |
| 4   | Second Plum Blossom Sword: Raining Blossoms (3rd) · Third: Riotous Heart (4th) · Fourth: Unbowed Blade (4th) | 3% / 2% / 2% | Normal Mob Dmg +10%     | PRIMARY  |
| 5   | Plum Blossom Sword: Slash (3rd)                                                                              | 3%           | Max Targets +1          | OTHER    |
| 6   | Plum Blossom Sword: Slice (1st) · Plum Blossom Sword: Strike (2nd)                                           | **7% / 5%**  | Max Targets +1          | OTHER    |

¹ The wiki table lists Spirit Strike Boost at **2%**, not the 5% the 2nd-job tier rule would predict.
**CONFLICT with the tier rule in §2.2 — the wiki's per-skill value (2%) is the one to encode.**

Quirks: node 3 is a single boost covering three different Final Imugi Spirit Sword techniques
spanning 3rd job / 4th job / Hyper. The Riotous Heart Boost in node 4 also boosts **Hearts United**
(wiki footnote). Class Discord: <https://discord.gg/52rC3geGqC>

### 7.2 Hero — Explorer Warrior

Source: <https://maplestorywiki.net/w/Hero/Skills>

**Job Nodes** (Master Level 30):

| #   | Skill              | Scaling                                                                                                                             |
| --- | ------------------ | ----------------------------------------------------------------------------------------------------------------------------------- |
| 1   | Burning Soul Blade | Mobile: dur `15+floor(x/6)` s, `200+9x`% × 12. Stationary: dur `105+floor(x/2)` s, `102+5x`% × 6. **+50% crit rate.** CD 120 s      |
| 2   | Worldreaver        | `400+16x`% × 14, 15 mobs, i-frame, CD 25 s                                                                                          |
| 3   | Instinctual Combo  | 20 s, CD 120 s. Each Combo Orb gives `3+floor(x/3)`% **FD / Boss Damage / ATT**. Tear in Space `190+7x`% × 6; Soul Trace `390+16x`% |
| 4   | Sword Illusion     | `125+5x`% × 4 × 12 slashes, then 5 explosions × 5 at `250+10x`%, CD 30 s                                                            |

**Boost Nodes** — wiki grouping (see conflict note):

| #   | Skills (job tier)                                  | FD/level         | Lv20 effect                                                       | Priority  |
| --- | -------------------------------------------------- | ---------------- | ----------------------------------------------------------------- | --------- |
| 1   | Raging Blow (4th)                                  | 2%               | Max Targets +1                                                    | PRIMARY   |
| 2   | Rising Rage (Hyper)                                | 2%               | Max Targets +1                                                    | PRIMARY   |
| 3   | Beam Blade (4th)                                   | 2%               | Max Targets +1                                                    | PRIMARY   |
| 4   | Cry Valhalla · Puncture · Final Attack             | 2% / 2% / 2%     | Crit +5% (Cry Valhalla, Final Attack) / Max Targets +1 (Puncture) | PRIMARY   |
| 5   | Leap Attack (3rd) · Rush (3rd) · Flash Blade (2nd) | 3% / 3% / **5%** | Max Targets +1                                                    | SECONDARY |
| 6   | Brandish (2nd) · Intrepid Slash (3rd)              | 2% / 3%          | Max Targets +1                                                    | OTHER     |

> **CONFLICT — node 2 vs node 4.** MapleStory Wiki puts **Rising Rage** alone in node 2 and
> **Cry Valhalla** in node 4. Grandis Library reverses them (Cry Valhalla alone in node 2, Rising
> Rage in node 4). The _union_ of skills is identical, so total damage is unaffected — only which
> HEXA Mastery each unlocks. **The wiki is more likely right**, because Hero's HEXA Masteries are
> MN1 HEXA Raging Blow, MN2 **HEXA Rising Rage**, MN3 HEXA Beam Blade + Rending Edge, MN4 **HEXA Cry
> Valhalla + HEXA Puncture + HEXA Final Attack**, which matches the wiki index-for-index. No third
> source found. **Verify in-game.**

> **UNVERIFIED — Hero has no 7% boost node.** Hero's cheapest tier is Flash Blade at 5%. Either
> Hero's 1st-job attack has no boost node, or the tier mapping differs for Explorer Warriors.

Class Discord: <https://discord.gg/dsdSz9CGJE> · guide site <https://buffhero.win/>

### 7.3 Wind Archer (KMS: Wind Breaker / 윈드브레이커) — Cygnus Bowman

Source: <https://maplestorywiki.net/w/Wind_Archer/Skills>

**Job Nodes** (Master Level 30):

| #   | Skill           | Scaling                                                                                                                            |
| --- | --------------- | ---------------------------------------------------------------------------------------------------------------------------------- |
| 1   | Howling Gale    | 10 s gust. 1 wind energy: `280+12x`% × 3, 10 mobs. 2 energy: `785+31x`% × 3, 15 mobs. 3 energy: `785+31x`% + `375+19x`%, two gusts |
| 2   | Merciless Winds | 10 seeking arrows, `415+17x`% × 5 each (−15% FD per extra arrow on the same target); DoT `500+20x`%/s for 9 s. CD 10 s             |
| 3   | Gale Barrier    | 30 s barrier, 300 Elemental. Passive: 3 whirlwinds `425+17x`% × 5 every 2 s. CD 60 s                                               |
| 4   | Vortex Sphere   | `450+17x`% × 8, 10 mobs, up to 15 collisions/enemy. CD 30 s                                                                        |

**Boost Nodes** (wiki and Grandis Library agree exactly):

| #   | Skills (job tier)                                             | FD/level         | Lv20 effect                          | Priority |
| --- | ------------------------------------------------------------- | ---------------- | ------------------------------------ | -------- |
| 1   | Song of Heaven (4th)                                          | 2%               | Max Targets +1                       | PRIMARY  |
| 2   | Trifling Wind (2nd)¹                                          | 2%               | Crit Rate +5%                        | PRIMARY  |
| 3   | Fairy Spiral (4th) · Storm Bringer (4th) · Monsoon (Hyper)    | 2% / 2% / 2%     | Max Targets +1 / Crit +5% / Crit +5% | PRIMARY  |
| 4   | Storm Whim (Hyper)                                            | 2%               | Crit Rate +5%                        | PRIMARY  |
| 5   | Pinpoint Pierce (3rd) · Sentient Arrow (3rd)                  | 3% / 2%          | Crit +5% / Max Targets +1            | OTHER    |
| 6   | Gust Shot (2nd) · Spiraling Vortex (2nd) · Breeze Arrow (1st) | **5% / 5% / 7%** | Max Targets +1                       | OTHER    |

¹ wiki lists Trifling Wind Boost at 2%, another exception to the tier rule.

Quirk: Wind Archer has **no SECONDARY tier** — nodes 5 and 6 are dead weight for bossing.
HEXA Masteries: MN1 Song of Heaven, MN2 Trifling Wind, MN3 Storm Bringer + Fairy Spiral + Monsoon,
MN4 Storm Whim + **Anemoi**.
Class Discord: <https://discord.gg/4pbZMeThgP> · guide doc:
<https://docs.google.com/document/d/1oqZegwzp5pzOArQ_NKYpoYZTxkV_8kq_3W_EQ8SzSDc>

### 7.4 Battle Mage — Resistance Mage

Source: <https://maplestorywiki.net/w/Battle_Mage/Skills>

**Job Nodes** (Master Level 30):

| #   | Skill                 | Scaling                                                                                                                          |
| --- | --------------------- | -------------------------------------------------------------------------------------------------------------------------------- |
| 1   | Aura Scythe           | dur `19+floor(x/5)` s, **+`2x` Magic ATT**, grants all auras; enhances Blow skills (300% × 12, **+50% crit, +50% IED**). CD 60 s |
| 2   | Altar of Annihilation | 40 s altar, 16 curses, `450+18x`% × 6, max 19 releases; applies Dark Brand                                                       |
| 3   | Grim Harvest          | 30 s summon, attacks every 4 s, `850+34x`% × 12, 12 mobs; duration extends on kills / boss hits. CD 60 s                         |
| 4   | Abyssal Lightning     | 30 s, Netherworld Lightning `750+30x`% × 6, **+100% crit, +20% IED**, 0.48 s ICD. CD 120 s                                       |

**Boost Nodes** (wiki and Grandis Library agree exactly):

| #   | Skills (job tier)                                          | FD/level         | Lv20 effect    | Priority  |
| --- | ---------------------------------------------------------- | ---------------- | -------------- | --------- |
| 1   | Condemnation (1st)¹                                        | 2%               | Crit Rate +5%  | PRIMARY   |
| 2   | Finishing Blow (4th) · Sweeping Staff (Hyper)              | 2% / 2%          | Max Targets +1 | PRIMARY   |
| 3   | Dark Shock (3rd)¹                                          | 2%               | Max Targets +1 | PRIMARY   |
| 4   | Dark Genesis (4th)                                         | 2%               | Crit Rate +5%  | PRIMARY   |
| 5   | Dark Chain (2nd)¹ · Battle Burst (3rd)¹                    | 2% / 2%          | Max Targets +1 | SECONDARY |
| 6   | Triple Blow (1st) · Quad Blow (2nd) · Quintuple Blow (3rd) | **7% / 5% / 3%** | Max Targets +1 | OTHER     |

¹ wiki lists these at 2% despite lower job tiers — more tier-rule exceptions. Battle Mage's
Condemnation is a heavily reworked 1st-job skill that remains in the endgame rotation, which is
presumably why it is priced at the 4th-job rate.

Quirk: **Finishing Blow Boost also boosts Aura Scythe's "Ambassador Scythe" enhancement** (wiki
footnote) — so node 2 indirectly buffs job node 1's attack. Battle Mage has the fewest boostable
skills of the five (10). HEXA Masteries: MN1 Condemnation, MN2 Finishing Blow + Sweeping Staff,
MN3 Dark Shock, MN4 Dark Genesis.
Class Discord: <https://discord.gg/HsTgS8svrf> · guide doc:
<https://docs.google.com/document/d/1GSP16fN2SZC0f7StnHpyzxk_90NjTL337LkwbC_9yfM>

### 7.5 Night Walker — Cygnus Thief

Source: <https://maplestorywiki.net/w/Night_Walker/Skills>

**Job Nodes.** The V Matrix page lists 4 (Shadow Spear, Greater Dark Servant, Shadow Bite,
Rapid Throw). The class Skills page lists **five** V skills — the extra is **Shadow Slide**
(Master Level **25**, not 30). Resolved: the HEXA Enhancement node is named _"Greater Dark
Servant/Shadow Slide Boost"_ and boosts both, so **Shadow Slide is bundled with the Greater Dark
Servant job node** rather than being a fifth node. This is a real class quirk worth modelling.

| #   | Skill                                 | Scaling                                                                                                                                                            |
| --- | ------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| 1   | Shadow Spear                          | 30 s. Spears `372+14x`% × 2 on each dark-attribute skill; every 6th forms a giant spear `828+34x`% × 6; up to 75 hits/enemy; **+25% normal mob dmg**. CD 60 s      |
| 2   | Greater Dark Servant (+ Shadow Slide) | Shadow adds `45+x`% of Final Damage per throwing-star hit, 20 s, CD 120 s. Shadow Slide: dur `30+floor(x/2)` s, 3 swaps, CD 60 s                                   |
| 3   | Shadow Bite                           | `450+18x`% × 14, 15 mobs; boss `1233+48x`%; **passive Final Damage +`10+floor(x/3)`%** (Lv1 = +10%, Lv30 = **+20%**). CD 15 s                                      |
| 4   | Rapid Throw                           | `378+16x`% × 5 stars for ~1.2–2.4 s, finisher `900+36x`% × 13; under Shadow Spear, consecutive-throw damage **+`150+5x`%** (additive); −50% damage taken. CD 120 s |

**Boost Nodes** (wiki and Grandis Library agree exactly):

| #   | Skills (job tier)                                         | FD/level         | Lv20 effect                   | Priority |
| --- | --------------------------------------------------------- | ---------------- | ----------------------------- | -------- |
| 1   | Quintuple Star (4th)                                      | 2%               | Crit Rate +5%                 | PRIMARY  |
| 2   | Shadow Bat (1st)¹ · Ravenous Bat (4th)                    | 2% / 2%          | Crit Rate +5%                 | PRIMARY  |
| 3   | Dark Omen (4th) · Shadow Stitch (4th)                     | 2% / 2%          | Max Targets +1 / Crit +5%     | PRIMARY  |
| 4   | Dominion (Hyper)                                          | 2%               | Crit Rate +5%                 | PRIMARY  |
| 5   | Lucky Seven (1st) · Soundless Rush (1st)                  | **7% / 7%**      | Crit Rate +5%                 | OTHER    |
| 6   | Triple Throw (2nd) · Shadow Spark (3rd) · Quad Star (3rd) | **5% / 3% / 3%** | Max Targets +1 (Shadow Spark) | OTHER    |

¹ Shadow Bat is a **1st job** skill but is priced at 2%/level and sits in a PRIMARY node — it is the
bat-proc engine, so node 2 is core. Another tier-rule exception.

HEXA Masteries: MN1 HEXA Quintuple Star (+ Jet Black Throwing Stars), MN2 HEXA Shadow Bat +
HEXA Ravenous Bat, MN3 HEXA Dark Omen, MN4 HEXA Dominion + **Abyssal Darkness**.
Class Discord: <https://discord.gg/FR55ADj>

### 7.6 Cross-class levelling-order summary

| Class        | Nodes 1–4 | Node 5    | Node 6 |
| ------------ | --------- | --------- | ------ |
| Ren          | PRIMARY   | OTHER     | OTHER  |
| Hero         | PRIMARY   | SECONDARY | OTHER  |
| Wind Archer  | PRIMARY   | OTHER     | OTHER  |
| Battle Mage  | PRIMARY   | SECONDARY | OTHER  |
| Night Walker | PRIMARY   | OTHER     | OTHER  |

---

## 8. What the OLD system was (for migration / stale-source detection)

Useful for two reasons: (a) recognising a stale source instantly, (b) if the calculator ever needs
to interpret a pre-June-2026 screenshot.

|                      | Before (pre-v269)                                                                                                                 | After (v269+)                                             |
| -------------------- | --------------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------- |
| Acquisition          | open a Nodestone → **1 random Node** for your class                                                                               | open a Nodestone → **V Points**; zero RNG                 |
| Node slots           | 12 at Lv200 → 30 at Lv260; nodes competed for slots                                                                               | **removed**                                               |
| Matrix Points        | 1/level 200–220, 2/level 221–260 (100 total), spent to push a node 25 → 30                                                        | **removed**                                               |
| Boost node structure | random **trio** of 3 skills; "perfect trio" hunting; two nodes sharing a top skill combined for Lv50; +10 from Matrix Points → 60 | **6 fixed nodes**, 1–4 skills each, one node reaches Lv60 |
| Boost node max rank  | **25** per node                                                                                                                   | **60** per node                                           |
| Job nodes            | random drops, 4 per job, max 25 (+5 slot)                                                                                         | 4 fixed, max 30                                           |
| Enhancement          | feed identical nodes in for EXP                                                                                                   | flat V Point purchase                                     |
| Crafting             | Node Shards → craft node (70) / trio (500) / Nodestone (35)                                                                       | **removed**                                               |
| Disassembly          | node → shards                                                                                                                     | **removed**                                               |

**One-time migration conversion** (KMS CROWN notes; GMS v269 notes use identical wording):

| Old asset                                         | Converted to                                                          |
| ------------------------------------------------- | --------------------------------------------------------------------- |
| Equipped Job/Skill Node                           | mapped to a new level (old Lv25 → new Lv30, Lv20 → 24, Lv10 → 11)     |
| Unequipped Job/Skill Node                         | V Points by disassembly value (Lv25 = 125, Lv1 = 2)                   |
| Equipped Boost Node                               | V Points by the Nodestones needed to enhance it (Lv25 = 111, Lv1 = 2) |
| Boost Nodes totalling ≥ **444** converted points  | **all Boost Nodes transferred at max level**, surplus points kept     |
| Unequipped Boost Node                             | V Points by disassembly (Lv25 = 63, Lv1 = 1)                          |
| Node Shards / V Core Fragments                    | **1 V Point per 17.62 shards**, rounded up                            |
| Expired Special Cores, Condensed Experience Cores | 3 V Points each                                                       |

**Stale-source detector.** If a page says any of: "max rank 25", "each Boost Node enhances 3
skills", "perfect trio", "Matrix Points", "node slots", "500 Node Shards", or "Nodestones give you a
random node" — it is describing the pre-June-2026 system. This includes:

- Grandis Library's prose (their per-class node _groupings_ are updated and correct; their
  _explanatory text_ about trios and rank 25 is not)
- `docs/research/formulas.md` line 249's surrounding context
- every "Perfect Boost Nodes for Every Class" SEO article
- maplesea.com/wiki, digitaltq.com, ascally.com, maplehub.io/vmatrix

---

## 9. Gaps / things to verify in-game

Ordered by how much they'd change a damage number.

1. **Nodestone drop rates in GMS Heroic.** No sourced rate anywhere. The wiki's drop list is
   explicitly prefixed _"KMS, MSEA, and GMS Interactive / Non-Reboot Worlds only"_, implying a
   different Heroic table I could not find. Blocks any time-to-max model. **Highest-value gap.**
2. **Whether every Boost Node's Lv40 effect really is +20% IED.** Every row in all five classes'
   wiki tables says so, which is either true or a copy-paste artefact in the wiki template. Check
   two different skills in-game.
3. **Hero: Rising Rage vs Cry Valhalla — which sits alone in boost node 2.** Wiki and Grandis
   Library disagree (§7.2). Doesn't change total damage; does change HEXA gating.
4. **Hero's missing 7% tier.** Confirm whether Hero's 1st-job attack has a boost node at all.
5. **The 7 / 5 / 3 / 2 FD-per-level tier rule.** Inferred, never stated. Several confirmed
   exceptions already (Ren Spirit Strike, WA Trifling Wind, BaM Condemnation / Dark Chain /
   Battle Burst / Dark Shock, NW Shadow Bat — all lower-tier skills priced at 2%). **Encode
   per-skill values, never the rule.**
6. **Decent Advanced Blessing's non-scaling active values.** Lv1 == Lv30 in the wiki table. Suspect.
7. **Special Node extension cost: 48 V Points or 27?** Wiki vs Inven conflict (§6).
8. **The exact all-classes common node count (13 here).** Derived by counting the wiki's tabber; the
   arithmetic lands on 19 for all five priority classes, which matches the screenshot, but a direct
   in-game count would confirm.
9. **Common node values may be one patch stale.** Individual skill pages are stamped GMS v264–v270
   in their infoboxes; the hub V Matrix page is current (v269 entry present, edited 2026-08-11).
10. **Whether the V Point reset refunds Job Node levels.** GMS wiki says job nodes return to Lv1;
    the KMS official guide says reset excludes "Job and Special cores". Possible server difference,
    possible translation artefact.
11. **Whether v271 (not live at time of writing) touches the V Matrix.** The preview only mentions
    **HEXA** common nodes. Re-check after it ships.
12. **Job node level tables** in §7 were transcribed as `base + k*x` formulas from wiki level tables;
    I spot-verified Night Walker Shadow Bite end-to-end. The rest are single-sourced.
13. **Official Nexon patch-note text is unreachable.** nexon.com, patchbot.io and the Steam mirror
    are all JavaScript-rendered and return no body to any scraper. Everything attributed to GMS v269
    here comes from MapleStory Wiki's cited update history plus KMS notes, which agree. If a literal
    Nexon quote is ever needed, it requires a JS-capable browser.

---

## 10. Implementation notes

A `src/lib/data/vmatrix.ts` module should export the following. Everything below is fully sourced
above except where marked.

### Node type constants

```
NODE_MAX_LEVEL: { job: 30, boost: 60, common: 30 }
NODE_COUNT:     { job: 4, boost: 6 }          // common count is class-derived
```

### Cost curves (per-level arrays, from Module:VMatrixCostTable/costData)

```
SKILL_CORE_COST_PER_LEVEL: number[30]   // [7, 4x9, 6x10, 9x10]  -> cumulative 193
BOOST_CORE_COST_PER_LEVEL: number[60]   // [1x40, 2x20]          -> cumulative 80
```

Plus derived cumulative arrays and helpers:

- `vPointsToLevel(type, from, to): number`
- `TOTAL_TO_MAX = { jobNode: 186, boostNode: 80, commonNode: 193 }`
- `LEVEL_AFTER_RESET = { jobNode: 1, boostNode: 0, commonNode: 0 }`

### V Point sources

```
NODESTONE_V_POINTS: Record<NodestoneKey, number>
  nodestone: 1, amazing: 2, samsara: 2, experience: 3, mirrorWorld: 5, mitra: 15
V_POINT_CAP = 9_999
V_POINT_RESET_COST_MESOS = 10_000_000
V_POINTS_PER_CRAFTED_NODESTONE = 2
```

### Boost nodes — per-skill, **not** a global constant

This is the structural point. Model a boost node as a list of boosted skills, each carrying its own
FD coefficient and Lv20 effect:

```ts
interface BoostedSkill {
	skill: string;
	jobTier: 1 | 2 | 3 | 4 | 'hyper';
	fdPerLevel: number; // 0.07 | 0.05 | 0.03 | 0.02 — PER SKILL
	level20Effect: 'maxTargets+1' | 'critRate+5' | 'normalMobDamage+10';
	// level40Effect is universally 'ied+20' — see gap #2
}
interface BoostNode {
	index: 1 | 2 | 3 | 4 | 5 | 6;
	skills: BoostedSkill[]; // 1–4 entries
	priority: 'PRIMARY' | 'SECONDARY' | 'OTHER';
	hexaMasteryGate: 40; // level required to unlock HEXA Mastery N
}
```

Effect functions:

- `boostNodeFinalDamage(skill, level) = skill.fdPerLevel * level` (linear, uncapped below 60)
- `boostNodeLevel20Active(level) = level >= 20`
- `boostNodeIed(level) = level >= 40 ? 0.20 : 0` — **multiplicative on the complement**, per skill
- FD composes multiplicatively with all other FD: `(1 + otherFD) * (1 + boostFD) - 1`

### Job nodes

```ts
interface JobNode {
	index: 1 | 2 | 3 | 4;
	skill: string;
	maxLevel: 30;
	hexaBoostGate: 25;
	// per-level scaling as base + k*level, or explicit 30-entry tables
}
```

Job node passives that are _stats_ (e.g. Night Walker Shadow Bite `FD = 0.10 + floor(x/3)/100`)
must feed the stat aggregator, not just the skill's own damage line.

### Common nodes

```ts
interface CommonNode {
	key: string;
	tier: 'allClasses' | 'branch' | 'subBranch' | 'faction';
	gatedBy?: 'mirrorWorldNodestone' | 'mitrasNodestone';
	maxLevel: 30;
	costCurve: 'skillCore'; // 193 total; gated ones behave like job nodes (186)
	effects: CommonNodeEffect[];
}
```

Two passive scaling shapes must both exist:

- `linear(x) => x` — Rope Lift (all stats), Blink (ATT & MATT), Impenetrable Skin (STR, MaxHP×50),
  Last Resort (ATT)
- `stepped5(x) => Math.ceil(x / 5)` — every **Decent** skill's passive

Effect kinds needed: `allStat`, `att`, `matt`, `str`, `maxHp`, `critRate`, `critDamage`,
`critDamageFromCritRate` (Vicious Shot), `finalDamage`, `damagePercent`, `ied`, `attackSpeed`,
`normalMobDamage`, `exp`, `dropRate`, plus `attackSkill` entries for Erda Shower / Erda Nova /
True Arachnid Reflection / Solar Crest / Phalanx Charge / Resistance Infantry / Guided Arrow /
Venom Burst / Blitz Shield.

Buff-window effects need `duration` and `cooldown` so a DPM model can compute uptime — Vicious Shot
(30 s / 120 s), Last Resort (30 s / 60 s), Weapon Aura (130 s / 120 s ≈ permanent at Lv30),
Transcendent Cygnus's Blessing (45 s / 120 s), Maple World Goddess's Blessing (60 s / 120 s),
Grandis Goddess's Blessing (40 s / 120 s), Decent Sharp Eyes (270 s / 180 s ≈ permanent),
Mana Overload (toggle, permanent).

**Class → common node roster** must be a lookup keyed on `(branch, subBranch, faction)`, not
hard-coded per class:

```
Ren         -> allClasses + gated + warrior + grandis + anima
Hero        -> allClasses + gated + warrior + explorerWarrior + mapleWorld
WindArcher  -> allClasses + gated + bowman + cygnus
BattleMage  -> allClasses + gated + magician + mapleWorld + resistance
NightWalker -> allClasses + gated + thief + cygnus
```

with `Transcendent Cygnus's Blessing` **replacing** `Empress Cygnus's Blessing` once the
`[Moonbridge] Cygnus Awakens` quest is done (model as a boolean on the character, default true for
an endgame Heroic character).

### Special nodes

```ts
interface SpecialNode {
	key: string;
	trigger: 'onSkillUse' | 'onNthHit' | 'onKillCount' | 'onAttackChance' | 'onRune' | 'onDeath';
	triggerValue?: number; // e.g. 800 hits, 30 kills, 0.1% chance
	effect: { stat: string; value: number };
	buffDuration: number; // seconds
	internalCooldown: number; // seconds
}
SPECIAL_NODE_UNLOCK_V_POINTS = 14; // 168 hours
SPECIAL_NODE_EXTEND_V_POINTS_PER_DAY = 1.6; // ceil; max 48 for 30 days — see CONFLICT §6
```

Expose Special Nodes as an explicit user toggle with an uptime field
(`buffDuration / internalCooldown`) rather than baking them into a DPM baseline — their triggers are
too rotation-dependent to model honestly.

### Things NOT to export

Node slots, Matrix Points, Node Shards, node crafting costs, node disassembly yields, node EXP
formulas, boost node "trios", any per-character-level V Point table. **None of these exist any more.**
